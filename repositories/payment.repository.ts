

import type { Payment } from '@/types/domain';


export interface PostPaymentParams {
  invoice_id: string;
  amount_paid: string; // NUMERIC(12,2) string
  payment_method: string;
  processed_by_employee_id: number | null;
  paid_by_user_id: string;
  transaction_reference?: string | null;
}


let mockPayments: Payment[] = [];
let nextPaymentId = 1;

export const paymentRepository = {

  postPayment: async (params: PostPaymentParams): Promise<Payment> => {
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

    const amountNum = parseFloat(params.amount_paid);
    if (isNaN(amountNum) || amountNum <= 0) {
      const err = new Error('Payment amount must be greater than 0');
      (err as Error & { code: string }).code = '23514'; // check_violation
      throw err;
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
    return { ...newPayment };
  },

  /**
   * Compatibility alias for postPayment
   */
  callPostPayment: async (params: PostPaymentParams): Promise<Payment> => {
    return paymentRepository.postPayment(params);
  },

  /**
   * Retrieve all payment receipts for an invoice.
   * Phase 6: SELECT * FROM payment WHERE invoice_id = $1 ORDER BY payment_date ASC
   */
  listByInvoiceId: async (invoiceId: string): Promise<Payment[]> => {
    return mockPayments
      .filter((p) => p.invoice_id === invoiceId)
      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
      .map((p) => ({ ...p }));
  },

 
  callCheckout: async (reservationId: string, employeeId: number): Promise<void> => {

    void reservationId;
    void employeeId;
  },


  _resetMockStore: (): void => {
    mockPayments = [];
    nextPaymentId = 1;
  },

  _getMockStore: (): Payment[] => {
    return mockPayments.map((p) => ({ ...p }));
  },

  _seedPayments: (payments: Payment[]): void => {
    mockPayments = payments.map((p) => ({ ...p }));
    const maxId = payments.reduce((max, p) => Math.max(max, p.payment_id), 0);
    nextPaymentId = maxId + 1;
  },
};
