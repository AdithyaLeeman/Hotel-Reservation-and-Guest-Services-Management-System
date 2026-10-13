import { billingRepository } from '@/repositories/billing.repository';
import type { InvoiceTotals } from '@/types/domain';

export const billingService = {
  // Create (or retrieve) the billing_summary invoice for a reservation.
  finalizeInvoice: async (reservationId: string): Promise<{ invoice_id: string }> => {
    return billingRepository.callFinalizeInvoice(reservationId);
  },

  // Retrieve all billing totals for a reservation from vw_invoice_totals.
  getInvoiceTotals: async (reservationId: string): Promise<InvoiceTotals | null> => {
    return billingRepository.getInvoiceTotals(reservationId);
  },

  // Retrieve billing totals by invoice_id from vw_invoice_totals.
  getInvoiceTotalsById: async (invoiceId: string): Promise<InvoiceTotals | null> => {
    return billingRepository.getInvoiceTotalsById(invoiceId);
  },
};
