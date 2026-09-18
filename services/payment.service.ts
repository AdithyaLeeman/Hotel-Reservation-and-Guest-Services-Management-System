/**
 * Payment Service — posts payments via sp_post_payment() and handles checkout.
 *
 * DB-first rule:
 * - sp_post_payment() validates amount against outstanding balance (from view)
 * - sp_checkout() enforces balance = 0 guard before transitioning status
 * - outstanding_balance is NEVER computed in TypeScript
 *
 * Idempotency: transaction_reference UNIQUE constraint in DB prevents duplicates.
 * SQLSTATE '23505' (unique violation) is caught and returned as HTTP 409.
 * SQLSTATE '45030' (outstanding balance) is caught and returned as HTTP 409.
 *
 * Owned by: Member 5 (M5)
 * Implemented in: P05-M05-T02, T03, T05, T06
 */

export const paymentService = {
  postPayment: async (_input: unknown, _userId: string, _employeeId?: number): Promise<void> => {
    throw new Error('paymentService.postPayment not yet implemented — P05-M05-T02');
  },
  checkout: async (_reservationId: string, _employeeId: number): Promise<void> => {
    throw new Error('paymentService.checkout not yet implemented — P05-M05-T05');
  },
};
