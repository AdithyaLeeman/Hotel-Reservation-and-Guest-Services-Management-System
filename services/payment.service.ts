/**
 * Payment Service — P05-M05-T09 (MOCK-FIRST)
 *
 * Thin orchestration layer:
 *   authenticate → validate → call repository → handle errors
 *
 * DB-first rules enforced here:
 *   - outstanding_balance is NEVER computed in TypeScript
 *   - Duplicate payment: SQLSTATE 23505 → HTTP 409
 *   - Checkout balance guard: SQLSTATE 45030 → HTTP 409 (real DB, Phase 6)
 *
 * Owned by: Member 5 (M5)
 */

import { paymentRepository } from '@/repositories/payment.repository';
import type { PostPaymentInput } from '@/lib/validation/payment.schema';
import type { Payment } from '@/types/domain';

export const paymentService = {
  /**
   * Post a payment against an invoice.
   * Validates input shape (done by route handler via Zod).
   * Idempotency: duplicate transaction_reference → throws with code '23505'.
   */
  postPayment: async (
    input: PostPaymentInput,
    paidByUserId: string,
    processedByEmployeeId: number | null = null
  ): Promise<Payment> => {
    return paymentRepository.postPayment({
      invoice_id: input.invoice_id,
      amount_paid: input.amount.toFixed(2), // convert number → NUMERIC string
      payment_method: input.payment_method,
      processed_by_employee_id: processedByEmployeeId,
      paid_by_user_id: paidByUserId,
      transaction_reference: input.transaction_reference ?? null,
    });
  },

  /**
   * Checkout a reservation.
   * REAL (Phase 6): sp_checkout() enforces balance = 0 inside PostgreSQL.
   *   If balance > 0 → SQLSTATE 45030 → route handler returns HTTP 409.
   */
  checkout: async (reservationId: string, employeeId: number): Promise<void> => {
    return paymentRepository.callCheckout(reservationId, employeeId);
  },

  /**
   * List all payments recorded for an invoice.
   */
  listPayments: async (invoiceId: string): Promise<Payment[]> => {
    return paymentRepository.listByInvoiceId(invoiceId);
  },
};
