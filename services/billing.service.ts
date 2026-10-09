/**
 * Billing Service - creates invoices and retrieves billing totals.
 *
 * DB-first rule (AGENTS.md §5):
 *   - sp_finalize_invoice() creates billing_summary with tax snapshot
 *   - vw_invoice_totals provides ALL authoritative totals (room charges, tax,
 *     services, outstanding_balance)
 *   - This service NEVER computes grand_total or outstanding_balance in TypeScript
 *
 * P06-M05-T01 - Wire billing to real DB
 *
 * See docs/08_business-rules-and-enforcement.md - Calculation Placement Matrix.
 *
 * Owned by: Member 5 (M5)
 */

import { billingRepository } from '@/repositories/billing.repository';
import type { InvoiceTotals } from '@/types/domain';

export const billingService = {
  /**
   * Create (or retrieve) the billing_summary invoice for a reservation.
   *
   * Delegates to billingRepository.callFinalizeInvoice() which calls
   * sp_finalize_invoice(). IDEMPOTENT - safe to call multiple times.
   *
   * @param reservationId  UUID of the reservation
   * @returns              The invoice_id UUID
   * @throws               Error with .code '45040' if reservation not found
   * @throws               Error with .code '45041' if reservation is Cancelled
   * @throws               Error with .code '45042' if no active tax policy exists
   */
  finalizeInvoice: async (reservationId: string): Promise<{ invoice_id: string }> => {
    return billingRepository.callFinalizeInvoice(reservationId);
  },

  /**
   * Retrieve all billing totals for a reservation from vw_invoice_totals.
   *
   * Returns null when no invoice has been finalized yet for this reservation.
   * outstanding_balance is authoritative from PostgreSQL - NEVER recompute in TypeScript.
   *
   * @param reservationId  UUID of the reservation
   * @returns              InvoiceTotals or null if not yet invoiced
   */
  getInvoiceTotals: async (reservationId: string): Promise<InvoiceTotals | null> => {
    return billingRepository.getInvoiceTotals(reservationId);
  },

  /**
   * Retrieve billing totals by invoice_id from vw_invoice_totals.
   *
   * Used when the caller already has the invoice_id (e.g. payment flow).
   *
   * @param invoiceId  UUID of the billing_summary record
   * @returns          InvoiceTotals or null if not found
   */
  getInvoiceTotalsById: async (invoiceId: string): Promise<InvoiceTotals | null> => {
    return billingRepository.getInvoiceTotalsById(invoiceId);
  },
};
