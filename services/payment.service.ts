/**
 * Payment Service — business logic layer for posting payments and checkout.

 * Idempotency:
 * - Duplicate transaction_reference → SQLSTATE '23505' → HTTP 409.
 *
 * Phase 6 swap:
 * - Replace paymentRepository mock calls with real pg/withTransaction calls.
 * - No signature changes required in this service.
 *
 * See docs/21_shared-contracts.md — Section 9 (transactions), Section 11
 * (billing definitions), Section 14 (SQLSTATE map).
 */

import {
  paymentRepository,
  type PostPaymentParams,
} from '@/repositories/payment.repository';
import type { Payment } from '@/types/domain';

// ── Input type for postPayment ──────────────────────────────────────────────

export interface PostPaymentInput {
  /** UUID of the billing_summary (invoice) to pay against */
  invoice_id: string;
  /** Amount to pay, as a string-encoded decimal e.g. "5000.00" */
  amount_paid: string;
  /** Payment method e.g. "Credit Card", "Cash", "Bank Transfer" */
  payment_method: string;
 
  transaction_reference?: string | null;
}

// ── Service ─────────────────────────────────────────────────────────────────

export const paymentService = {
  /**
   * Post a payment against an invoice.
   *
   * Validates input, delegates to paymentRepository.postPayment(),
   * and surfaces DB-level errors as typed throws so route handlers
   * can map them to HTTP responses.
   *
   * @param input         - Validated payment input from the route handler
   * @param paidByUserId  - user_id from the session (guest or staff)
   * @param employeeId    - employee_id if processed by staff; null for guest self-pay
   * @returns             The persisted Payment record
   * @throws              Error with .code '23505' on duplicate transaction_reference
   * @throws              Error with .code '23514' on invalid amount (≤ 0)
   */
  postPayment: async (
    input: PostPaymentInput,
    paidByUserId: string,
    employeeId: number | null = null,
  ): Promise<Payment> => {
    const params: PostPaymentParams = {
      invoice_id: input.invoice_id,
      amount_paid: input.amount_paid,
      payment_method: input.payment_method,
      processed_by_employee_id: employeeId,
      paid_by_user_id: paidByUserId,
      transaction_reference: input.transaction_reference ?? null,
    };

    // Delegates to repository — in mock phase this enforces idempotency
    // and amount > 0 check in memory. In Phase 6, delegates to sp_post_payment().
    return paymentRepository.postPayment(params);
  },

  /**
   * Retrieve all payments recorded against an invoice.
   *
   * Used by the invoice/bill display page to show payment history.
   *
   * @param invoiceId - UUID of the billing_summary
   * @returns         Payments in chronological order
   */
  listPaymentsByInvoice: async (invoiceId: string): Promise<Payment[]> => {
    return paymentRepository.listByInvoiceId(invoiceId);
  },

  /**
   * Attempt checkout for a reservation.
   *
   * In Phase 6 (real DB): delegates to sp_checkout() which:
   *   1. Reads outstanding_balance from vw_invoice_totals.
   *   2. Raises SQLSTATE '45030' if balance > 0.
   *   3. On balance = 0: sets reservation status → CheckedOut,
   *      sets all reservation rooms → Available.
   *   All steps run in ONE atomic transaction inside the procedure.
   *
   * In mock phase (now): delegates to paymentRepository.callCheckout()
   * which is a no-op (succeeds silently, no balance check).
   * Balance guard will be enforced once real DB is wired.
   *
   * @param reservationId - UUID of the reservation to check out
   * @param employeeId    - employee_id of the staff member performing checkout
   * @throws              Error with .code '45030' if outstanding balance > 0 (Phase 6)
   * @throws              Error with .code '45031' if reservation not in CheckedIn status (Phase 6)
   */
  checkout: async (
    reservationId: string,
    employeeId: number,
  ): Promise<void> => {
    // Phase 6: replace with withTransaction + sp_checkout()
    await paymentRepository.callCheckout(reservationId, employeeId);
  },
};
