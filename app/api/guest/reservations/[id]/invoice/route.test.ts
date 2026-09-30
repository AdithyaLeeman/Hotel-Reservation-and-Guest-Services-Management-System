import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { paymentRepository } from '@/repositories/payment.repository';
import * as sessionModule from '@/lib/auth/session';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

function makeReq(reservationId: string): { req: NextRequest; context: { params: Promise<{ id: string }> } } {
  const req = new NextRequest(`http://localhost:3000/api/guest/reservations/${reservationId}/invoice`, {
    method: 'GET',
  });
  return { req, context: { params: Promise.resolve({ id: reservationId }) } };
}

function mockGuestSession(guestId = 'guest-mock-001', userId = 'user-mock-guest-001'): void {
  vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
    userId,
    role: 'Guest',
    guestId,
  } as any);
}

describe('GET /api/guest/reservations/[id]/invoice — P04-M05-T07', () => {
  beforeEach(() => {
    paymentRepository._resetMockStore();
    vi.clearAllMocks();
  });

  describe('Authentication and RBAC', () => {
    it('returns 401 when unauthenticated in production', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({} as any);
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'production';

      const { req, context } = makeReq('res-mock-001');
      const res = await GET(req, context);
      expect(res.status).toBe(401);

      (process.env as any).NODE_ENV = originalEnv;
    });

    it('returns 403 when session role is not Guest', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-1',
        role: 'Receptionist',
      } as any);

      const { req, context } = makeReq('res-mock-001');
      const res = await GET(req, context);
      expect(res.status).toBe(403);
    });
  });

  describe('Ownership and Not-Found', () => {
    it('returns 404 if reservation does not exist', async () => {
      mockGuestSession('guest-mock-001');

      const { req, context } = makeReq('non-existent-id');
      const res = await GET(req, context);
      expect(res.status).toBe(404);
    });

    it('returns 404 if reservation belongs to a different guest (prevents leakage)', async () => {
      // res-mock-003 belongs to guest-mock-002
      mockGuestSession('guest-mock-001');

      const { req, context } = makeReq('res-mock-003');
      const res = await GET(req, context);
      expect(res.status).toBe(404);
    });
  });

  describe('Successful Retrieval', () => {
    it('returns invoice details and payment history for owned reservation', async () => {
      mockGuestSession('guest-mock-001');

      const { req, context } = makeReq('res-mock-001');
      const res = await GET(req, context);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.invoice).toBeDefined();
      expect(json.data.invoice.reservation_id).toBe('res-mock-001');
      expect(json.data.invoice.invoice_id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(json.data.invoice.grand_total).toBe('43200.00');
      expect(json.data.invoice.outstanding_balance).toBe('43200.00');
      expect(json.data.payments).toEqual([]);
    });

    it('reflects payments recorded against the invoice', async () => {
      mockGuestSession('guest-mock-001');

      // Post a payment to the repository first
      await paymentRepository.postPayment({
        invoice_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        amount_paid: '20000.00',
        payment_method: 'Credit Card',
        processed_by_employee_id: null,
        paid_by_user_id: 'user-mock-guest-001',
        transaction_reference: 'TXN-TEST-1',
      });

      const { req, context } = makeReq('res-mock-001');
      const res = await GET(req, context);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.invoice.total_paid).toBe('20000.00');
      expect(json.data.invoice.outstanding_balance).toBe('23200.00');
      expect(json.data.invoice.payment_status).toBe('Partial');
      expect(json.data.payments.length).toBe(1);
      expect(json.data.payments[0].transaction_reference).toBe('TXN-TEST-1');
    });
  });
});
