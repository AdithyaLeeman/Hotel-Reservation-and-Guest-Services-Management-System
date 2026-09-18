/**
 * Billing Service — creates invoices and retrieves billing totals.
 *
 * DB-first rule:
 * - sp_finalize_invoice() creates billing_summary with tax snapshot
 * - vw_invoice_totals provides ALL authoritative totals (room charges, tax, services, balance)
 * - This service NEVER computes grand_total or outstanding_balance in TypeScript
 *
 * See docs/08_business-rules-and-enforcement.md — Calculation Placement Matrix.
 *
 * Owned by: Member 5 (M5)
 * Implemented in: P04-M05-T03, T04
 */

export const billingService = {
  finalizeInvoice: async (_reservationId: string): Promise<void> => {
    throw new Error('billingService.finalizeInvoice not yet implemented — P04-M05-T03');
  },
  getInvoiceTotals: async (_reservationId: string): Promise<void> => {
    throw new Error('billingService.getInvoiceTotals not yet implemented — P04-M05-T04');
  },
};
