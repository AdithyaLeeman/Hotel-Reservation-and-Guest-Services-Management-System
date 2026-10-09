/* eslint-disable @typescript-eslint/no-explicit-any */


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { paymentRepository } from '@/repositories/payment.repository';
import * as sessionModule from '@/lib/auth/session';


vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));


function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/guest/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}


function mockGuestSession(userId = 'user-mock-guest-001'): void {
  vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
    userId,
    role: 'Guest',
    guestId: 'guest-mock-001',
  } as any);
}


function mockStaffSession(): void {
  vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
    userId: 'user-mock-staff-001',
    role: 'Receptionist',
    employeeId: 1,
    branchId: 1,
  } as any);
}


const VALID_BODY = {
  invoice_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  amount: 5000,
  payment_method: 'Cash',
};

describe('POST /api/guest/payments - P05-M05-T10', () => {
  beforeEach(() => {
    paymentRepository._resetMockStore();
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('returns 401 when no session (production mode)', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({} as any);

      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'production';

      const res = await POST(makeReq(VALID_BODY));
      const json = await res.json();

      (process.env as any).NODE_ENV = originalEnv;

      expect(res.status).toBe(401);
      expect(json.error.code).toBe('NOT_AUTHENTICATED');
    });

    it('returns 403 when caller is a Staff member', async () => {
      mockStaffSession();

      const res = await POST(makeReq(VALID_BODY));
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('INSUFFICIENT_ROLE');
      expect(json.error.message).toContain('Receptionist');
    });
  });


  describe('Input validation', () => {
    it('returns 400 for malformed JSON body', async () => {
      mockGuestSession();

      const req = new NextRequest('http://localhost:3000/api/guest/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-valid-json{{{',
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when invoice_id is missing', async () => {
      mockGuestSession();

      const res = await POST(makeReq({ amount: 100, payment_method: 'Cash' }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.fields).toHaveProperty('invoice_id');
    });

    it('returns 400 when invoice_id is not a UUID', async () => {
      mockGuestSession();

      const res = await POST(makeReq({ ...VALID_BODY, invoice_id: 'not-a-uuid' }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.fields).toHaveProperty('invoice_id');
    });

    it('returns 400 when amount is zero', async () => {
      mockGuestSession();

      const res = await POST(makeReq({ ...VALID_BODY, amount: 0 }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.fields).toHaveProperty('amount');
    });

    it('returns 400 when amount is negative', async () => {
      mockGuestSession();

      const res = await POST(makeReq({ ...VALID_BODY, amount: -100 }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when payment_method is invalid', async () => {
      mockGuestSession();

      const res = await POST(makeReq({ ...VALID_BODY, payment_method: 'Bitcoin' }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.fields).toHaveProperty('payment_method');
    });
  });



  describe('Happy path', () => {
    it('returns 201 with Payment record on valid Cash payment', async () => {
      mockGuestSession();

      const res = await POST(makeReq(VALID_BODY));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.invoice_id).toBe(VALID_BODY.invoice_id);
      expect(json.data.amount_paid).toBe('5000.00');
      expect(json.data.payment_method).toBe('Cash');
      expect(json.data.paid_by_user_id).toBe('user-mock-guest-001');
      expect(json.data.processed_by_employee_id).toBeNull();
      expect(json.data.payment_id).toBeDefined();
      expect(json.meta.requestId).toBeDefined();
    });

    it('returns 201 for Credit Card payment with transaction_reference', async () => {
      mockGuestSession();

      const body = {
        ...VALID_BODY,
        payment_method: 'Credit Card',
        transaction_reference: 'TXN-CREDIT-999',
      };

      const res = await POST(makeReq(body));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.payment_method).toBe('Credit Card');
      expect(json.data.transaction_reference).toBe('TXN-CREDIT-999');
    });

    it('all supported payment methods are accepted', async () => {
      const methods = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer'];

      for (const method of methods) {
        mockGuestSession();
        const body = { ...VALID_BODY, payment_method: method };
        const res = await POST(makeReq(body));
        expect(res.status, `Expected 201 for method: ${method}`).toBe(201);
        paymentRepository._resetMockStore();
        vi.clearAllMocks();
      }
    });

    it('paid_by_user_id comes from session, not request body', async () => {
      mockGuestSession('user-real-session-id');

      
      const res = await POST(makeReq(VALID_BODY));
      const json = await res.json();

      expect(res.status).toBe(201);
      
      expect(json.data.paid_by_user_id).toBe('user-real-session-id');
    });

    it('amount is stored with 2 decimal places', async () => {
      mockGuestSession();

      const res = await POST(makeReq({ ...VALID_BODY, amount: 123.5 }));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.amount_paid).toBe('123.50');
    });
  });
 

  describe('Error cases', () => {
    it('returns 409 DUPLICATE_PAYMENT for duplicate transaction_reference', async () => {
      mockGuestSession();

      const body = {
        ...VALID_BODY,
        transaction_reference: 'TXN-UNIQUE-001',
      };

    const first = await POST(makeReq(body));
      expect(first.status).toBe(201);
      mockGuestSession();
      const second = await POST(makeReq(body));
      const json = await second.json();

      expect(second.status).toBe(409);
      expect(json.error.code).toBe('DUPLICATE_PAYMENT');
    });

    it('returns 500 on unexpected service error', async () => {
      mockGuestSession();

      const originalPost = paymentRepository.postPayment;
      paymentRepository.postPayment = vi.fn().mockRejectedValue(new Error('DB crashed'));

      const res = await POST(makeReq(VALID_BODY));
      const json = await res.json();

      paymentRepository.postPayment = originalPost;

      expect(res.status).toBe(500);
      expect(json.error.code).toBe('INTERNAL_ERROR');
      // Must not expose internal error details
      expect(json.error.message).not.toContain('DB crashed');
    });
  });
});
