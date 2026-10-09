/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { revenueReportRepository } from '@/repositories/revenue-report.repository';
import * as sessionModule from '@/lib/auth/session';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

const BASE_URL = 'http://localhost:3000/api/staff/reports/revenue';

function makeReq(searchParams = ''): NextRequest {
  const url = searchParams ? `${BASE_URL}?${searchParams}` : BASE_URL;
  return new NextRequest(url);
}

describe('GET /api/staff/reports/revenue - P05-M05-T13', () => {
  beforeEach(() => {
    revenueReportRepository._resetMockStore();
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('returns 401 if unauthenticated (no session in production)', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({} as any);

      const originalEnv = process.env.NODE_ENV;
      // @ts-expect-error - TS2540: process.env.NODE_ENV is readonly in strict mode
      process.env.NODE_ENV = 'production';

      const res = await GET(makeReq());
      const json = await res.json();

      // @ts-expect-error - restore original value
      process.env.NODE_ENV = originalEnv;

      expect(res.status).toBe(401);
      expect(json.error.code).toBe('NOT_AUTHENTICATED');
    });
  });

  describe('RBAC - Rejected Roles', () => {
    it('returns 403 if user has Guest role', async () => {
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

    it('returns 403 if user has Receptionist role (reports are Manager+ only)', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-1',
        role: 'Receptionist',
        employeeId: 5,
        branchId: 1,
      } as any);

      const res = await GET(makeReq());
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('INSUFFICIENT_ROLE');
      expect(json.error.message).toContain('Manager or Admin');
    });
  });

  describe('RBAC - Allowed Roles', () => {
    it('returns 200 with data for Manager role', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-uuid-1',
        role: 'Manager',
        employeeId: 10,
      } as any);

      const res = await GET(makeReq());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });

    it('returns 200 with data for Admin role', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'admin-uuid-1',
        role: 'Admin',
        employeeId: 1,
      } as any);

      const res = await GET(makeReq());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });
  });

  describe('Response Shape', () => {
    it('includes meta.requestId and meta.count in success response', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-uuid-1',
        role: 'Manager',
        employeeId: 10,
      } as any);

      const res = await GET(makeReq());
      const json = await res.json();

      expect(json.meta).toBeDefined();
      expect(typeof json.meta.requestId).toBe('string');
      expect(typeof json.meta.count).toBe('number');
      expect(json.meta.count).toBe(json.data.length);
    });

    it('each row contains all required vw_monthly_revenue fields', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-uuid-1',
        role: 'Manager',
        employeeId: 10,
      } as any);

      const res = await GET(makeReq());
      const json = await res.json();

      for (const row of json.data) {
        expect(typeof row.branch_id).toBe('number');
        expect(typeof row.branch_name).toBe('string');
        expect(typeof row.revenue_year).toBe('number');
        expect(typeof row.revenue_month).toBe('number');
        expect(typeof row.period_label).toBe('string');
        expect(typeof row.total_invoices).toBe('number');
        expect(typeof row.room_revenue).toBe('string');
        expect(typeof row.service_revenue).toBe('string');
        expect(typeof row.tax_collected).toBe('string');
        expect(typeof row.total_revenue).toBe('string');
        expect(typeof row.total_paid).toBe('string');
        expect(typeof row.total_outstanding).toBe('string');
      }
    });
  });

  describe('Query Filtering and Validation', () => {
    beforeEach(() => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-uuid-1',
        role: 'Manager',
        employeeId: 10,
      } as any);
    });

    it('filters by branchId correctly', async () => {
      const res = await GET(makeReq('branchId=1'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBeGreaterThan(0);
      for (const row of json.data) {
        expect(row.branch_id).toBe(1);
      }
    });

    it('filters by year correctly', async () => {
      const res = await GET(makeReq('year=2025'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBeGreaterThan(0);
      for (const row of json.data) {
        expect(row.revenue_year).toBe(2025);
      }
    });

    it('filters by month correctly', async () => {
      const res = await GET(makeReq('month=11'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBeGreaterThan(0);
      for (const row of json.data) {
        expect(row.revenue_month).toBe(11);
      }
    });

    it('combines branchId, year, and month filters', async () => {
      const res = await GET(makeReq('branchId=2&year=2025&month=12'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBe(1);
      expect(json.data[0].branch_id).toBe(2);
      expect(json.data[0].branch_name).toBe('Kandy');
      expect(json.data[0].revenue_year).toBe(2025);
      expect(json.data[0].revenue_month).toBe(12);
      expect(json.data[0].total_revenue).toBe('20280.00');
    });

    it('returns 400 if branchId is not a positive integer', async () => {
      const res = await GET(makeReq('branchId=invalid'));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('positive integer');
    });

    it('returns 400 if year is out of range or non-numeric', async () => {
      const res = await GET(makeReq('year=1850'));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('valid 4-digit year');
    });

    it('returns 400 if month is outside 1-12', async () => {
      const res = await GET(makeReq('month=13'));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('between 1 and 12');
    });
  });

  describe('Error handling', () => {
    it('returns 500 if repository throws an unexpected error', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-uuid-1',
        role: 'Manager',
        employeeId: 10,
      } as any);

      vi.spyOn(revenueReportRepository, 'getMonthlyRevenue').mockRejectedValueOnce(
        new Error('Database query timeout')
      );

      const res = await GET(makeReq());
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error.code).toBe('INTERNAL_ERROR');
      expect(json.error.message).not.toContain('Database query timeout');
    });
  });
});