/**
 * Billing Repository — calls sp_finalize_invoice() and reads vw_invoice_totals.
 *
 * DB-first rule: ALL financial totals come from vw_invoice_totals.
 * This repository never computes any monetary value.
 *
 * Owned by: Member 5 (M5) | Implemented in: P04-M05-T03, T04
 */
import type { InvoiceTotals } from '@/types/domain';

export const billingRepository = {
  callFinalizeInvoice: async (_reservationId: string): Promise<{ invoice_id: string }> => {
    // TODO: CALL sp_finalize_invoice($1, p_invoice_id OUT)
    throw new Error('billingRepository.callFinalizeInvoice not implemented — P04-M05-T03');
  },

  /**
   * Read all billing totals from vw_invoice_totals.
   * outstanding_balance is authoritative — NEVER recompute in TypeScript.
   */
  getInvoiceTotals: async (_reservationId: string): Promise<InvoiceTotals | null> => {
    // TODO: SELECT * FROM vw_invoice_totals WHERE reservation_id = $1
    throw new Error('billingRepository.getInvoiceTotals not implemented — P04-M05-T04');
  },
};
