

import { describe, it, expect, beforeEach } from 'vitest';
import { paymentService, type PostPaymentInput } from '@/services/payment.service';
import { paymentRepository } from '@/repositories/payment.repository';

// ── Helpers ──────────────────────────────────────────────────────────────────

const INVOICE_A = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const INVOICE_B = 'b1ccde88-8b1a-5da9-cc7e-7cc0ce491b22';
const USER_GUEST = 'user-guest-001';
const USER_STAFF = 'user-staff-002';
const EMP_ID = 42;

function baseInput(overrides: Partial<PostPaymentInput> = {}): PostPaymentInput {
  return {
    invoice_id: INVOICE_A,
    amount_paid: '5000.00',
    payment_method: 'Credit Card',
    transaction_reference: null,
    ...overrides,
  };
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('Payment Service (Mock) — P05-M05-T09', () => {
  beforeEach(() => {
    paymentRepository._resetMockStore();
  });

  // ── postPayment ─────────────────────────────────────────────────────────────

  describe('postPayment', () => {
    it('returns a persisted Payment with correct fields for guest self-pay', async () => {
      const result = await paymentService.postPayment(
        baseInput({ transaction_reference: 'TXN-GUEST-001' }),
        USER_GUEST,
      );

      expect(result.payment_id).toBe(1);
      expect(result.invoice_id).toBe(INVOICE_A);
      expect(result.amount_paid).toBe('5000.00');
      expect(result.payment_method).toBe('Credit Card');
      expect(result.transaction_reference).toBe('TXN-GUEST-001');
      expect(result.paid_by_user_id).toBe(USER_GUEST);
      expect(result.processed_by_employee_id).toBeNull();
      expect(new Date(result.payment_date).getTime()).not.toBeNaN();
    });

    it('records processed_by_employee_id when staff posts payment', async () => {
      const result = await paymentService.postPayment(
        baseInput(),
        USER_STAFF,
        EMP_ID,
      );

      expect(result.paid_by_user_id).toBe(USER_STAFF);
      expect(result.processed_by_employee_id).toBe(EMP_ID);
    });

    it('defaults employeeId to null when not provided', async () => {
      const result = await paymentService.postPayment(baseInput(), USER_GUEST);
      expect(result.processed_by_employee_id).toBeNull();
    });

    it('auto-increments payment_id across multiple calls', async () => {
      const p1 = await paymentService.postPayment(baseInput(), USER_GUEST);
      const p2 = await paymentService.postPayment(
        baseInput({ amount_paid: '2000.00' }),
        USER_GUEST,
      );

      expect(p1.payment_id).toBe(1);
      expect(p2.payment_id).toBe(2);
    });

    it('allows two payments with null transaction_reference (no uniqueness enforced on null)', async () => {
      const p1 = await paymentService.postPayment(
        baseInput({ transaction_reference: null }),
        USER_GUEST,
      );
      const p2 = await paymentService.postPayment(
        baseInput({ transaction_reference: null }),
        USER_GUEST,
      );

      expect(p1.payment_id).toBe(1);
      expect(p2.payment_id).toBe(2);
    });

    it('accepts "Cash" as payment method', async () => {
      const result = await paymentService.postPayment(
        baseInput({ payment_method: 'Cash' }),
        USER_GUEST,
      );
      expect(result.payment_method).toBe('Cash');
    });

    it('accepts "Bank Transfer" as payment method', async () => {
      const result = await paymentService.postPayment(
        baseInput({ payment_method: 'Bank Transfer' }),
        USER_GUEST,
      );
      expect(result.payment_method).toBe('Bank Transfer');
    });

    // ── Idempotency ───────────────────────────────────────────────────────────

    it('throws error code 23505 on duplicate transaction_reference (mirrors SQLSTATE UNIQUE_VIOLATION)', async () => {
      await paymentService.postPayment(
        baseInput({ transaction_reference: 'TXN-DUPE-001' }),
        USER_GUEST,
      );

      await expect(
        paymentService.postPayment(
          baseInput({ transaction_reference: 'TXN-DUPE-001' }),
          USER_GUEST,
        ),
      ).rejects.toMatchObject({ code: '23505' });
    });

    it('throws 23505 for duplicate reference even across different invoices (global uniqueness)', async () => {
      await paymentService.postPayment(
        baseInput({ invoice_id: INVOICE_A, transaction_reference: 'TXN-X' }),
        USER_GUEST,
      );

      await expect(
        paymentService.postPayment(
          baseInput({ invoice_id: INVOICE_B, transaction_reference: 'TXN-X' }),
          USER_GUEST,
        ),
      ).rejects.toMatchObject({ code: '23505' });
    });

    // ── Amount validation ─────────────────────────────────────────────────────

    it('throws error code 23514 on amount = 0', async () => {
      await expect(
        paymentService.postPayment(baseInput({ amount_paid: '0' }), USER_GUEST),
      ).rejects.toMatchObject({ code: '23514' });
    });

    it('throws error code 23514 on negative amount', async () => {
      await expect(
        paymentService.postPayment(baseInput({ amount_paid: '-100.00' }), USER_GUEST),
      ).rejects.toMatchObject({ code: '23514' });
    });

    it('throws error code 23514 on non-numeric amount string', async () => {
      await expect(
        paymentService.postPayment(baseInput({ amount_paid: 'abc' }), USER_GUEST),
      ).rejects.toMatchObject({ code: '23514' });
    });
  });

  // ── listPaymentsByInvoice ───────────────────────────────────────────────────

  describe('listPaymentsByInvoice', () => {
    it('returns an empty array when no payments exist for the invoice', async () => {
      const results = await paymentService.listPaymentsByInvoice(INVOICE_A);
      expect(results).toEqual([]);
    });

    it('returns all payments for a given invoice in chronological order', async () => {
      await paymentService.postPayment(baseInput({ amount_paid: '1000.00' }), USER_GUEST);
      await paymentService.postPayment(baseInput({ amount_paid: '2000.00' }), USER_GUEST);

      const results = await paymentService.listPaymentsByInvoice(INVOICE_A);

      expect(results).toHaveLength(2);
      expect(results[0].amount_paid).toBe('1000.00');
      expect(results[1].amount_paid).toBe('2000.00');
    });

    it('does not return payments belonging to a different invoice', async () => {
      await paymentService.postPayment(baseInput({ invoice_id: INVOICE_A }), USER_GUEST);
      await paymentService.postPayment(baseInput({ invoice_id: INVOICE_B }), USER_GUEST);

      const resultsA = await paymentService.listPaymentsByInvoice(INVOICE_A);
      const resultsB = await paymentService.listPaymentsByInvoice(INVOICE_B);

      expect(resultsA).toHaveLength(1);
      expect(resultsB).toHaveLength(1);
      expect(resultsA[0].invoice_id).toBe(INVOICE_A);
      expect(resultsB[0].invoice_id).toBe(INVOICE_B);
    });

    it('returns a defensive copy — mutation does not affect the stored record', async () => {
      await paymentService.postPayment(baseInput(), USER_GUEST);
      const results = await paymentService.listPaymentsByInvoice(INVOICE_A);

      results[0].amount_paid = '9999.00'; // mutate returned copy

      const fresh = await paymentService.listPaymentsByInvoice(INVOICE_A);
      expect(fresh[0].amount_paid).toBe('5000.00'); // store must be unchanged
    });
  });

  // ── checkout ────────────────────────────────────────────────────────────────

  describe('checkout', () => {
    it('resolves without throwing in mock phase (no balance guard yet)', async () => {
      await expect(
        paymentService.checkout('reservation-uuid-001', EMP_ID),
      ).resolves.toBeUndefined();
    });

    it('resolves for any reservation ID in mock phase', async () => {
      await expect(
        paymentService.checkout('any-reservation-uuid', 1),
      ).resolves.toBeUndefined();
    });
  });
});
