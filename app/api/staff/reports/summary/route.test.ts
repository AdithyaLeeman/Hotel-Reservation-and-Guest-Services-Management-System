/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';
import { reportsSummaryRepository } from '@/repositories/reports-summary.repository';
import * as sessionModule from '@/lib/auth/session';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

describe('GET /api/staff/reports/summary', () => {
  beforeEach(() => {
    reportsSummaryRepository._resetMockStore();
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('returns 401 if unauthenticated (no session in production)', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({} as any);

      const originalEnv = process.env.NODE_ENV;
      // @ts-expect-error — TS2540: process.env.NODE_ENV is readonly in strict mode
      process.env.NODE_ENV = 'production';

      const res = await GET();
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

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('INSUFFICIENT_ROLE');
      expect(json.error.message).toContain('Manager or Admin');
    });

    it('returns 403 if user has Receptionist role (reports are Manager+ only)', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-recep',
        role: 'Receptionist',
        employeeId: 10,
      } as any);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('INSUFFICIENT_ROLE');
    });
  });

  describe('RBAC — Authorized Roles & Data Return', () => {
    it('returns 200 with summary data for Manager role', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-mgr',
        role: 'Manager',
        employeeId: 2,
      } as any);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data).toBeDefined();
      expect(json.data.branch_count).toBe(3);
      expect(json.data.total_revenue).toBe('202300.00');
      expect(json.data.total_outstanding).toBe('65520.00');
      expect(json.data.avg_occupancy_rate).toBe('73.2');
      expect(json.data.services_count).toBe(6);
      expect(json.meta.requestId).toBeDefined();
    });

    it('returns 200 with summary data for Admin role', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-uuid-admin',
        role: 'Admin',
        employeeId: 1,
      } as any);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.branch_count).toBe(3);
    });
  });
});
