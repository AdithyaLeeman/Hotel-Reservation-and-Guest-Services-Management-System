/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { occupancyReportRepository } from '@/repositories/occupancy-report.repository';
import * as sessionModule from '@/lib/auth/session';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

const BASE_URL = 'http://localhost:3000/api/staff/reports/occupancy';

function makeReq(searchParams = ''): NextRequest {
  const url = searchParams ? `${BASE_URL}?${searchParams}` : BASE_URL;
  return new NextRequest(url);
}

describe('GET /api/staff/reports/occupancy — P05-M02-T02', () => {
  beforeEach(() => {
    occupancyReportRepository._resetMockStore();
    vi.clearAllMocks();
  });

  // ─── Authentication ──────────────────────────────────────────────────────
  describe('Authentication', () => {
    it('returns 401 if unauthenticated (no session in production)', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({} as any);

      const originalEnv = process.env.NODE_ENV;
      // @ts-expect-error — process.env.NODE_ENV is readonly in strict mode
      process.env.NODE_ENV = 'production';

      const res = await GET(makeReq());
      const json = await res.json();

      // @ts-expect-error — restore
      process.env.NODE_ENV = originalEnv;

      expect(res.status).toBe(401);
      expect(json.error.code).toBe('NOT_AUTHENTICATED');
    });
  });

  // ─── RBAC — Rejected roles ───────────────────────────────────────────────
  describe('RBAC — Rejected Roles', () => {
    it('returns 403 for Guest role', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'guest-uuid-1',
        role: 'Guest',
      } as any);

      const res = await GET(makeReq());
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('INSUFFICIENT_ROLE');
      expect(json.error.message).toContain('Manager or Admin');
    });

    it('returns 403 for Receptionist role', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-1',
        role: 'Receptionist',
        employeeId: 3,
        branchId: 1,
      } as any);

      const res = await GET(makeReq());
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('INSUFFICIENT_ROLE');
    });
  });

  // ─── RBAC — Allowed roles ────────────────────────────────────────────────
  describe('RBAC — Allowed Roles', () => {
    it('returns 200 for Manager role', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-2',
        role: 'Manager',
        employeeId: 2,
        branchId: 1,
      } as any);

      const res = await GET(makeReq());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.meta).toHaveProperty('requestId');
      expect(json.meta).toHaveProperty('count');
    });

    it('returns 200 for Admin role', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-admin',
        role: 'Admin',
        employeeId: 1,
      } as any);

      const res = await GET(makeReq());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(json.data)).toBe(true);
    });
  });

  // ─── Unfiltered response ─────────────────────────────────────────────────
  describe('Unfiltered response', () => {
    it('returns all rows with correct shape when no filters are supplied', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-2',
        role: 'Manager',
        employeeId: 2,
      } as any);

      const res = await GET(makeReq());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.meta.count).toBe(json.data.length);

      // Shape check on first row
      const row = json.data[0];
      expect(row).toHaveProperty('branch_id');
      expect(row).toHaveProperty('branch_name');
      expect(row).toHaveProperty('room_id');
      expect(row).toHaveProperty('room_number');
      expect(row).toHaveProperty('room_type_name');
      expect(row).toHaveProperty('room_status');
      expect(row).toHaveProperty('period_date');
      expect(row).toHaveProperty('total_nights_occupied');
      expect(row).toHaveProperty('occupancy_rate');
      expect(row).toHaveProperty('total_revenue');
    });
  });

  // ─── branchId filter ─────────────────────────────────────────────────────
  describe('Filter: branchId', () => {
    it('returns only rows for the specified branch', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-2',
        role: 'Manager',
        employeeId: 2,
      } as any);

      const res = await GET(makeReq('branchId=1'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.every((r: any) => r.branch_id === 1)).toBe(true);
    });

    it('returns 400 for non-numeric branchId', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-2',
        role: 'Manager',
        employeeId: 2,
      } as any);

      const res = await GET(makeReq('branchId=abc'));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('branchId');
    });

    it('returns 400 for zero branchId', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-2',
        role: 'Manager',
        employeeId: 2,
      } as any);

      const res = await GET(makeReq('branchId=0'));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─── date filters ────────────────────────────────────────────────────────
  describe('Filter: fromDate / toDate', () => {
    it('returns 400 for invalid fromDate format', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-2',
        role: 'Manager',
        employeeId: 2,
      } as any);

      const res = await GET(makeReq('fromDate=01-12-2025'));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('fromDate');
    });

    it('returns 400 for invalid toDate format', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-2',
        role: 'Manager',
        employeeId: 2,
      } as any);

      const res = await GET(makeReq('toDate=not-a-date'));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('toDate');
    });

    it('returns 400 when fromDate is after toDate', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-2',
        role: 'Manager',
        employeeId: 2,
      } as any);

      const res = await GET(makeReq('fromDate=2025-12-31&toDate=2025-12-01'));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('fromDate');
    });

    it('returns 200 with date-filtered rows for valid date range', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-2',
        role: 'Manager',
        employeeId: 2,
      } as any);

      const res = await GET(makeReq('fromDate=2025-12-01&toDate=2025-12-31'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.every((r: any) => r.period_date >= '2025-12-01' && r.period_date <= '2025-12-31')).toBe(true);
    });
  });

  // ─── roomStatus filter ───────────────────────────────────────────────────
  describe('Filter: roomStatus', () => {
    it('returns only Occupied rooms', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-2',
        role: 'Manager',
        employeeId: 2,
      } as any);

      const res = await GET(makeReq('roomStatus=Occupied'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data.every((r: any) => r.room_status === 'Occupied')).toBe(true);
    });

    it('returns only Maintenance rooms', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-2',
        role: 'Manager',
        employeeId: 2,
      } as any);

      const res = await GET(makeReq('roomStatus=Maintenance'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.every((r: any) => r.room_status === 'Maintenance')).toBe(true);
    });

    it('returns 400 for an invalid roomStatus value', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-2',
        role: 'Manager',
        employeeId: 2,
      } as any);

      const res = await GET(makeReq('roomStatus=Dirty'));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('roomStatus');
    });
  });

  // ─── Combined filters ────────────────────────────────────────────────────
  describe('Combined filters', () => {
    it('filters by both branchId and roomStatus simultaneously', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-2',
        role: 'Manager',
        employeeId: 2,
      } as any);

      const res = await GET(makeReq('branchId=1&roomStatus=Occupied'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(
        json.data.every((r: any) => r.branch_id === 1 && r.room_status === 'Occupied')
      ).toBe(true);
    });

    it('returns empty array when no rows match combined filter', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-2',
        role: 'Manager',
        employeeId: 2,
      } as any);

      // Branch 99 does not exist in mock data
      const res = await GET(makeReq('branchId=99'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data).toEqual([]);
      expect(json.meta.count).toBe(0);
    });
  });
});
