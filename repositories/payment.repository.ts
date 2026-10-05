/**
 * Payment Repository — calls sp_post_payment() and sp_checkout(), reads payment table.
 *
 * DB-first rule (AGENTS.md §5):
 *   - sp_post_payment() handles idempotency + balance check inside PostgreSQL
 *   - sp_checkout() enforces outstanding_balance = 0 guard inside PostgreSQL
 *   - TypeScript NEVER performs financial arithmetic
 *
 * P06-M05-T01 — Wire payment to real DB
 *
 * SQLSTATE reference (docs/21_shared-contracts.md §14):
 *   22023 — payment amount ≤ 0
 *   23503 — invoice not found (FK violation)
 *   23505 — duplicate transaction_reference (unique violation)
 *   45020 — amount exceeds outstanding balance
 *   45030 — outstanding balance > 0 (checkout blocked)
 *   45031 — reservation not in CheckedIn status
 *
 * Lecture alignment: L05 (ACID / transactions), L08 (stored procedures), L11 (concurrency)
 */

import { pool } from '@/lib/db/pool';
import { withTransaction } from '@/lib/db/transaction';
import type { Payment } from '@/types/domain';

export interface PostPaymentParams {
  invoice_id: string;
  amount_paid: string; // NUMERIC(12,2) string
  payment_method: string;
  processed_by_employee_id: number | null;
  paid_by_user_id: string;
  transaction_reference?: string | null;
}

export const paymentRepository = {
  /**
   * Call sp_post_payment() to record a payment against an invoice.
   *
   * The procedure enforces:
   *   - amount > 0
   *   - invoice exists
   *   - amount does not exceed outstanding_balance (from vw_invoice_totals)
   *   - transaction_reference uniqueness (SQLSTATE 23505)
   *
   * Uses withTransaction so any procedure-level error rolls back cleanly.
   *
   * @param params  Validated payment parameters
   * @returns       The persisted Payment record
   */
  postPayment: async (params: PostPaymentParams): Promise<Payment> => {
    return withTransaction(async (client) => {
      // sp_post_payment returns p_payment_id as an OUT parameter
      const result = await client.query<{ p_payment_id: number }>(
        `CALL sp_post_payment(
           $1::uuid,    -- p_invoice_id
           $2::numeric, -- p_amount
           $3,          -- p_method
           $4,          -- p_transaction_reference
           $5::uuid,    -- p_paid_by_user_id
           $6::bigint,  -- p_employee_id
           NULL::bigint -- p_payment_id (OUT)
         )`,
        [
          params.invoice_id,
          params.amount_paid,
          params.payment_method,
          params.transaction_reference ?? null,
          params.paid_by_user_id,
          params.processed_by_employee_id,
        ]
      );

      const paymentId = result.rows[0]?.p_payment_id;
      if (!paymentId) {
        throw new Error('sp_post_payment returned no payment_id');
      }

      // Fetch the full payment row that was just inserted
      const row = await client.query<{
        payment_id: number;
        invoice_id: string;
        amount_paid: string;
        payment_date: string;
        payment_method: string;
        processed_by_employee_id: number | null;
        paid_by_user_id: string;
        transaction_reference: string | null;
      }>(
        `SELECT
           payment_id,
           invoice_id,
           amount_paid::text          AS amount_paid,
           payment_date::text         AS payment_date,
           payment_method,
           processed_by_employee_id,
           paid_by_user_id,
           transaction_reference
         FROM payment
         WHERE payment_id = $1`,
        [paymentId]
      );

      const payment = row.rows[0];
      return {
        payment_id:                 payment.payment_id,
        invoice_id:                 payment.invoice_id,
        amount_paid:                payment.amount_paid,
        payment_date:               payment.payment_date,
        payment_method:             payment.payment_method,
        processed_by_employee_id:   payment.processed_by_employee_id,
        paid_by_user_id:            payment.paid_by_user_id,
        transaction_reference:      payment.transaction_reference,
      };
    });
  },

  /**
   * Compatibility alias for postPayment (keeps payment.service.ts unchanged).
   */
  callPostPayment: async (params: PostPaymentParams): Promise<Payment> => {
    return paymentRepository.postPayment(params);
  },

  /**
   * Retrieve all payment receipts for an invoice in chronological order.
   *
   * SELECT * FROM payment WHERE invoice_id = $1 ORDER BY payment_date ASC
   *
   * @param invoiceId  UUID of the billing_summary
   * @returns          Payments sorted by payment_date ascending
   */
  listByInvoiceId: async (invoiceId: string): Promise<Payment[]> => {
    const result = await pool.query<{
      payment_id: number;
      invoice_id: string;
      amount_paid: string;
      payment_date: string;
      payment_method: string;
      processed_by_employee_id: number | null;
      paid_by_user_id: string;
      transaction_reference: string | null;
    }>(
      `SELECT
         payment_id,
         invoice_id,
         amount_paid::text          AS amount_paid,
         payment_date::text         AS payment_date,
         payment_method,
         processed_by_employee_id,
         paid_by_user_id,
         transaction_reference
       FROM payment
       WHERE invoice_id = $1::uuid
       ORDER BY payment_date ASC`,
      [invoiceId]
    );

    return result.rows.map((row) => ({
      payment_id:               row.payment_id,
      invoice_id:               row.invoice_id,
      amount_paid:              row.amount_paid,
      payment_date:             row.payment_date,
      payment_method:           row.payment_method,
      processed_by_employee_id: row.processed_by_employee_id,
      paid_by_user_id:          row.paid_by_user_id,
      transaction_reference:    row.transaction_reference,
    }));
  },

  /**
   * Call sp_checkout() to atomically:
   *   1. Verify reservation is in CheckedIn status (SQLSTATE 45031 if not)
   *   2. Verify outstanding_balance = 0  (SQLSTATE 45030 if not)
   *   3. Transition reservation → CheckedOut
   *   4. Release all assigned rooms → Available
   *   5. Mark billing_summary.payment_status → Paid
   *
   * All five steps run inside ONE stored-procedure transaction in PostgreSQL.
   * TypeScript MUST NOT duplicate any of these checks.
   *
   * @param reservationId  UUID of the reservation to check out
   * @param employeeId     employee_id of the staff member performing checkout
   * @throws               Error with .code '45030' if outstanding balance > 0
   * @throws               Error with .code '45031' if not in CheckedIn status
   */
  callCheckout: async (reservationId: string, employeeId: number): Promise<void> => {
    await withTransaction(async (client) => {
      await client.query(
        `CALL sp_checkout($1::uuid, $2::bigint)`,
        [reservationId, employeeId]
      );
    });
  },
};
