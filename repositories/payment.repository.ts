/**
 * Payment Repository — calls sp_post_payment() and checkout procedure.
 * Owned by: Member 5 (M5) | Implemented in: P05-M05-T02, T05
 */

export const paymentRepository = {
  callPostPayment: async (_params: unknown): Promise<void> => {
    // TODO: CALL sp_post_payment($1, $2, $3, $4, $5, $6)
    throw new Error('paymentRepository.callPostPayment not implemented — P05-M05-T02');
  },
  callCheckout: async (_reservationId: string, _employeeId: number): Promise<void> => {
    // TODO: CALL sp_checkout($1, $2)
    throw new Error('paymentRepository.callCheckout not implemented — P05-M05-T05');
  },
  listByInvoiceId: async (_invoiceId: string): Promise<unknown[]> => {
    // TODO: SELECT * FROM payment WHERE invoice_id = $1 ORDER BY payment_date
    throw new Error('paymentRepository.listByInvoiceId not implemented — P05-M05-T03');
  },
};
