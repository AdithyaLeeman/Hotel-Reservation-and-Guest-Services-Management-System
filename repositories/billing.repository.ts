import { pool } from '@/lib/db/pool';
import { withTransaction } from '@/lib/db/transaction';
import type { InvoiceTotals } from '@/types/domain';

export const billingRepository = {
  // Call sp_finalize_invoice() to create (or retrieve) a billing_summary row.
  callFinalizeInvoice: async (reservationId: string): Promise<{ invoice_id: string }> => {
    return withTransaction(async (client) => {
      // CALL returns OUT parameters as a single row via pg
      const result = await client.query<{ p_invoice_id: string }>(
        `CALL sp_finalize_invoice($1::uuid, NULL::uuid)`,
        [reservationId]
      );

      const invoiceId = result.rows[0]?.p_invoice_id;
      if (!invoiceId) {
        throw new Error(
          `sp_finalize_invoice returned no invoice_id for reservation ${reservationId}`
        );
      }

      return { invoice_id: invoiceId };
    });
  },

  // Read all billing totals for a reservation from vw_invoice_totals.
  getInvoiceTotals: async (reservationId: string): Promise<InvoiceTotals | null> => {
    const result = await pool.query<{
      invoice_id: string;
      reservation_id: string;
      invoice_date: string;
      tax_percentage_applied: string;
      payment_status: string;
      room_charges: string;
      tax_amount: string;
      service_charges: string;
      grand_total: string;
      total_paid: string;
      outstanding_balance: string;
    }>(
      `SELECT
         invoice_id,
         reservation_id,
         invoice_date::text          AS invoice_date,
         tax_percentage_applied::text AS tax_percentage_applied,
         payment_status,
         room_charges::text          AS room_charges,
         tax_amount::text            AS tax_amount,
         service_charges::text       AS service_charges,
         grand_total::text           AS grand_total,
         total_paid::text            AS total_paid,
         outstanding_balance::text   AS outstanding_balance
       FROM vw_invoice_totals
       WHERE reservation_id = $1::uuid`,
      [reservationId]
    );

    if (result.rowCount === 0) return null;

    const row = result.rows[0];
    return {
      invoice_id:           row.invoice_id,
      reservation_id:       row.reservation_id,
      room_charges:         row.room_charges,
      tax_amount:           row.tax_amount,
      service_charges:      row.service_charges,
      grand_total:          row.grand_total,
      total_paid:           row.total_paid,
      outstanding_balance:  row.outstanding_balance,
    };
  },

  // Read billing totals for a specific invoice_id from vw_invoice_totals.
  getInvoiceTotalsById: async (invoiceId: string): Promise<InvoiceTotals | null> => {
    const result = await pool.query<{
      invoice_id: string;
      reservation_id: string;
      room_charges: string;
      tax_amount: string;
      service_charges: string;
      grand_total: string;
      total_paid: string;
      outstanding_balance: string;
    }>(
      `SELECT
         invoice_id,
         reservation_id,
         room_charges::text         AS room_charges,
         tax_amount::text           AS tax_amount,
         service_charges::text      AS service_charges,
         grand_total::text          AS grand_total,
         total_paid::text           AS total_paid,
         outstanding_balance::text  AS outstanding_balance
       FROM vw_invoice_totals
       WHERE invoice_id = $1::uuid`,
      [invoiceId]
    );

    if (result.rowCount === 0) return null;

    const row = result.rows[0];
    return {
      invoice_id:          row.invoice_id,
      reservation_id:      row.reservation_id,
      room_charges:        row.room_charges,
      tax_amount:          row.tax_amount,
      service_charges:     row.service_charges,
      grand_total:         row.grand_total,
      total_paid:          row.total_paid,
      outstanding_balance: row.outstanding_balance,
    };
  },
};
