/**
 * Payment Repository (Mock Implementation)
 * Core Rule: Outstanding balance is calculated ONLY in PostgreSQL (vw_invoice_totals), never here.
 */

import type { Payment } from '@/types/domain';

// Temporary in-memory store (Replaced with PostgreSQL Pool in Phase 6)
const mockPayments: Payment[] = [];
let nextPaymentId = 1;

export const paymentRepository = {
  /**
   * Record a new payment.
   * Phase 6: Will execute stored procedure `sp_post_payment`
   */
  postPayment: async (params: {
    invoice_id: string;
    amount_paid: string;
    payment_method: string;
    processed_by_employee_id: number | null;
    paid_by_user_id: string;
    transaction_reference: string | null;
  }): Promise<Payment> => {
    // Idempotency check: Mirrors PostgreSQL SQLSTATE 23505 (unique_violation)
    if (params.transaction_reference) {
      const duplicate = mockPayments.find(
        (p) => p.transaction_reference === params.transaction_reference
      );
      if (duplicate) {
        const err = new Error('Duplicate transaction_reference');
        (err as Error & { code: string }).code = '23505';
        throw err;
      }
    }

    const newPayment: Payment = {
      payment_id: nextPaymentId++,
      invoice_id: params.invoice_id,
      amount_paid: params.amount_paid,
      payment_date: new Date().toISOString(),
      payment_method: params.payment_method,
      processed_by_employee_id: params.processed_by_employee_id,
      paid_by_user_id: params.paid_by_user_id,
      transaction_reference: params.transaction_reference ?? null,
    };

    mockPayments.push(newPayment);
    return newPayment;
  },

  /**
   * Retrieve all payment receipts for an invoice.
   * Phase 6: Will execute `SELECT * FROM payment WHERE invoice_id = $1 ORDER BY payment_date`
   */
  listByInvoiceId: async (invoiceId: string): Promise<Payment[]> => {
    return mockPayments.filter((p) => p.invoice_id === invoiceId);
  },

  /**
   * Trigger reservation checkout.
   * Phase 6: Will execute `sp_checkout($1, $2)`
   * DB procedure reads balance from `vw_invoice_totals` and raises SQLSTATE 45030 if balance > 0.
   */
  callCheckout: async (reservationId: string, employeeId: number): Promise<void> => {
    console.log(`[MOCK] sp_checkout called: reservation=${reservationId}, employee=${employeeId}`);
  },
};