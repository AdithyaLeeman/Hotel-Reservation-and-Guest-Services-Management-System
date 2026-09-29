import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { billingReportRepository } from '@/repositories/billing-report.repository';
import * as sessionModule from '@/lib/auth/session';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

const BASE_URL = 'http://localhost:3000/api/staff/reports/billing';

function makeReq(searchParams = ''): NextRequest {
  const url = searchParams ? `${BASE_URL}?${searchParams}` : BASE_URL;
  return new NextRequest(url);
}

describe('GET /api/staff/reports/billing — P05-M05-T12', () => {
  beforeEach(() => {
    billingReportRepository._resetMockStore();
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('returns 401 if unauthenticated (no session in production)', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({} as any);

      const originalEnv = process.env.NODE_ENV;
      // @ts-expect-error — TS2540: process.env.NODE_ENV is readonly in strict mode
      process.env.NODE_ENV = 'production';

      const res = await GET(makeReq());
      const json = await res.json();

      // @ts-expect-error — restore original value
      process.env.NODE_ENV = originalEnv;

      expect(res.status).toBe(401);
      expect(json.error.code).toBe('NOT_AUTHENTICATED');
    });
  });

  describe('RBAC — Rejected Roles', () => {
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

  // -------------------------------------------------------------------------
  // RBAC — Allowed Roles (Manager & Admin)
  // -------------------------------------------------------------------------
  describe('RBAC — Allowed Roles', () => {
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

    it('each row contains all required vw_guest_billing_summary fields', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-uuid-1',
        role: 'Manager',
        employeeId: 10,
      } as any);

      const res = await GET(makeReq());
      const json = await res.json();

      for (const row of json.data) {
        expect(typeof row.guest_id).toBe('string');
        expect(typeof row.guest_name).toBe('string');
        expect(typeof row.email).toBe('string');
        expect(row.phone === null || typeof row.phone === 'string').toBe(true);
        expect(typeof row.reservation_id).toBe('string');
        expect(typeof row.branch_id).toBe('number');
        expect(typeof row.branch_name).toBe('string');
        expect(typeof row.check_in_date).toBe('string');
        expect(typeof row.check_out_date).toBe('string');
        expect(typeof row.reservation_status).toBe('string');
        expect(typeof row.invoice_id).toBe('string');
        expect(typeof row.invoice_date).toBe('string');
        expect(typeof row.payment_status).toBe('string');
        expect(typeof row.room_charges).toBe('string');
        expect(typeof row.service_charges).toBe('string');
        expect(typeof row.tax_amount).toBe('string');
        expect(typeof row.grand_total).toBe('string');
        expect(typeof row.total_paid).toBe('string');
        expect(typeof row.outstanding_balance).toBe('string');
      }
    });
  });

  describe('Query Filtering', () => {
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

    it('returns 400 if branchId is not a positive integer', async () => {
      const res = await GET(makeReq('branchId=invalid'));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('positive integer');
    });

    it('filters unpaidOnly=true returning only records with outstanding_balance > 0', async () => {
      const res = await GET(makeReq('unpaidOnly=true'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBeGreaterThan(0);
      for (const row of json.data) {
        expect(parseFloat(row.outstanding_balance)).toBeGreaterThan(0);
      }
    });

    it('filters by paymentStatus correctly', async () => {
      const res = await GET(makeReq('paymentStatus=Paid'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBeGreaterThan(0);
      for (const row of json.data) {
        expect(row.payment_status).toBe('Paid');
      }
    });

    it('filters by search query matching guest name', async () => {
      const res = await GET(makeReq('search=Alice'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBe(1);
      expect(json.data[0].guest_name).toBe('Alice Fernando');
    });
  });

  describe('Error handling', () => {
    it('returns 500 if repository throws an unexpected error', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-uuid-1',
        role: 'Manager',
        employeeId: 10,
      } as any);

      vi.spyOn(billingReportRepository, 'getBillingSummary').mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const res = await GET(makeReq());
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error.code).toBe('INTERNAL_ERROR');
      expect(json.error.message).not.toContain('Database connection failed');
    });
  });
});
