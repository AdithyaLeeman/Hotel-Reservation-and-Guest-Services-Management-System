

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { paymentRepository } from '@/repositories/payment.repository';
import { paymentService } from '@/services/payment.service';
import * as sessionModule from '@/lib/auth/session';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

// Typed helper — works correctly after vi.resetAllMocks() unlike vi.spyOn
const mockedGetSession = () => vi.mocked(sessionModule.getSession);

function makeReq(reservationId = 'res-uuid-0001'): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/staff/reservations/${reservationId}/checkout`,
    { method: 'POST' }
  );
}

function makeParams(id = 'res-uuid-0001'): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function mockReceptionistSession(branchId?: number): void {
  const session: Record<string, unknown> = {
    userId:     'user-mock-staff-001',
    role:       'Receptionist',
    employeeId: 1,
  };
  // Only include branchId if explicitly provided as a number
  if (typeof branchId === 'number') {
    session.branchId = branchId;
  }
  vi.spyOn(sessionModule, 'getSession').mockResolvedValue(session as any);
}

function mockManagerSession(): void {
  vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
    userId:     'user-mock-staff-002',
    role:       'Manager',
    employeeId: 2,
  } as any);
}

function mockAdminSession(): void {
  vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
    userId:     'user-mock-staff-003',
    role:       'Admin',
    employeeId: 3,
  } as any);
}

function mockGuestSession(): void {
  vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
    userId:  'user-mock-guest-001',
    role:    'Guest',
    guestId: 'guest-mock-001',
  } as any);
}

describe('POST /api/staff/reservations/[id]/checkout — P05-M05-T11', () => {
  beforeEach(() => {
    paymentRepository._resetMockStore();
  vi.resetAllMocks();
  // Restore: use vi.clearAllMocks() to only clear history, keeping implementations stable
  vi.clearAllMocks();

  });

  describe('Authentication', () => {
    it('returns 401 when session is empty (production mode)', async () => {
      mockedGetSession().mockResolvedValue({} as any);

      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'production';

      const res = await POST(makeReq(), makeParams());
      const json = await res.json();

      (process.env as any).NODE_ENV = originalEnv;

      expect(res.status).toBe(401);
      expect(json.error.code).toBe('NOT_AUTHENTICATED');
    });

    it('returns 401 when caller is a Guest (not a valid staff role)', async () => {
      mockGuestSession();

      const res = await POST(makeReq(), makeParams());
      const json = await res.json();

      // 'Guest' is not in STAFF_ROLES → treated as unauthenticated
      expect(res.status).toBe(401);
      expect(json.error.code).toBe('NOT_AUTHENTICATED');
    });
  });

  describe('RBAC', () => {
    it('returns 403 when Receptionist session is missing branchId', async () => {
      mockReceptionistSession(undefined);

      const res = await POST(makeReq(), makeParams());
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('BRANCH_SCOPE_VIOLATION');
    });
  });

  describe('Input validation', () => {
    it('returns 400 when reservation ID is an empty string', async () => {
      mockReceptionistSession();

      const res = await POST(makeReq(''), makeParams(''));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Happy path', () => {
    it('returns 200 with CheckedOut status for Receptionist', async () => {
      mockReceptionistSession(1); // explicitly pass branchId as a number

      const res = await POST(makeReq(), makeParams());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.reservation_id).toBe('res-uuid-0001');
      expect(json.data.status).toBe('CheckedOut');
      expect(json.meta.requestId).toBeDefined();
    });

    it('returns 200 with CheckedOut status for Manager (no branchId required)', async () => {
      mockManagerSession();

      const res = await POST(makeReq('res-uuid-0002'), makeParams('res-uuid-0002'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.reservation_id).toBe('res-uuid-0002');
      expect(json.data.status).toBe('CheckedOut');
    });

    it('returns 200 with CheckedOut status for Admin', async () => {
      mockAdminSession();

      const res = await POST(makeReq('res-uuid-0003'), makeParams('res-uuid-0003'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.status).toBe('CheckedOut');
    });

    it('response includes meta.requestId on success', async () => {
      mockReceptionistSession();

      const res = await POST(makeReq(), makeParams());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(typeof json.meta.requestId).toBe('string');
      expect(json.meta.requestId.length).toBeGreaterThan(0);
    });
  });

  describe('Conflict cases', () => {
    it('returns 409 OUTSTANDING_BALANCE when SQLSTATE 45030 is thrown', async () => {
      mockReceptionistSession();

      const balanceError = new Error('Outstanding balance');
      (balanceError as any).code = '45030';
      vi.spyOn(paymentService, 'checkout').mockRejectedValue(balanceError);

      const res = await POST(makeReq(), makeParams());
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error.code).toBe('OUTSTANDING_BALANCE');
      expect(json.error.message).toMatch(/outstanding balance/i);
    });

    it('returns 409 INVALID_STATUS_TRANSITION when SQLSTATE 45031 is thrown', async () => {
      mockReceptionistSession();

      const statusError = new Error('Not in CheckedIn status');
      (statusError as any).code = '45031';
      vi.spyOn(paymentService, 'checkout').mockRejectedValue(statusError);

      const res = await POST(makeReq(), makeParams());
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('Error cases', () => {
    it('returns 500 on unexpected service failure', async () => {
      mockReceptionistSession();

      vi.spyOn(paymentService, 'checkout').mockRejectedValue(new Error('DB crashed'));

      const res = await POST(makeReq(), makeParams());
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error.code).toBe('INTERNAL_ERROR');
      // Must not leak internal error details to the client
      expect(json.error.message).not.toContain('DB crashed');
    });
  });
});
