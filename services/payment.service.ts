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
  // Post a payment against an invoice.
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

    // Delegates to repository - in mock phase this enforces idempotency
    // and amount > 0 check in memory. In Phase 6, delegates to sp_post_payment().
    return paymentRepository.postPayment(params);
  },

  // Retrieve all payments recorded against an invoice.
  listPaymentsByInvoice: async (invoiceId: string): Promise<Payment[]> => {
    return paymentRepository.listByInvoiceId(invoiceId);
  },

  checkout: async (
    reservationId: string,
    employeeId: number,
  ): Promise<void> => {
    // Phase 6: replace with withTransaction + sp_checkout()
    await paymentRepository.callCheckout(reservationId, employeeId);
  },
};
