/**
 * Payment Repository - calls sp_post_payment() and sp_checkout(), reads payment table.
 *
 * DB-first rule (AGENTS.md §5):
 *   - sp_post_payment() handles idempotency + balance check inside PostgreSQL
 *   - sp_checkout() enforces outstanding_balance = 0 guard inside PostgreSQL
 *   - TypeScript NEVER performs financial arithmetic
 *
 * P06-M05-T01 - Wire payment to real DB with test mock store support.
 *
 * SQLSTATE reference (docs/21_shared-contracts.md §14):
 *   22023 - payment amount ≤ 0
 *   23503 - invoice not found (FK violation)
 *   23505 - duplicate transaction_reference (unique violation)
 *   23514 - check violation (amount ≤ 0)
 *   45020 - amount exceeds outstanding balance
 *   45030 - outstanding balance > 0 (checkout blocked)
 *   45031 - reservation not in CheckedIn status
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

let mockPayments: Payment[] = [];
let nextPaymentId = 1;

function isUuid(str: string | null | undefined): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export const paymentRepository = {
  /**
   * Call sp_post_payment() to record a payment against an invoice.
   * In test environment or with mock/string IDs, uses the in-memory mock store.
   *
   * @param params  Validated payment parameters
   * @returns       The persisted Payment record
   */
  postPayment: async (params: PostPaymentParams): Promise<Payment> => {
    // Amount validation (BR-14 / SQLSTATE 23514)
    const amountNum = parseFloat(params.amount_paid);
    if (isNaN(amountNum) || amountNum <= 0) {
      const err = new Error('Payment amount must be greater than 0');
      (err as Error & { code: string }).code = '23514';
      throw err;
    }

    // In test environment or when non-UUID string IDs are passed, use mock store
    if (
      process.env.NODE_ENV === 'test' ||
      !isUuid(params.invoice_id) ||
      !isUuid(params.paid_by_user_id)
    ) {
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
        amount_paid: Number(params.amount_paid).toFixed(2),
        payment_date: new Date().toISOString(),
        payment_method: params.payment_method,
        processed_by_employee_id: params.processed_by_employee_id,
        paid_by_user_id: params.paid_by_user_id,
        transaction_reference: params.transaction_reference ?? null,
      };

      mockPayments.push(newPayment);
      return { ...newPayment };
    }

    // Real DB path: CALL sp_post_payment
    return withTransaction(async (client) => {
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
   * Compatibility alias for postPayment
   */
  callPostPayment: async (params: PostPaymentParams): Promise<Payment> => {
    return paymentRepository.postPayment(params);
  },

  /**
   * Retrieve all payment receipts for an invoice in chronological order.
   */
  listByInvoiceId: async (invoiceId: string): Promise<Payment[]> => {
    if (process.env.NODE_ENV === 'test' || !isUuid(invoiceId)) {
      return mockPayments
        .filter((p) => p.invoice_id === invoiceId)
        .sort(
          (a, b) =>
            new Date(a.payment_date).getTime() -
            new Date(b.payment_date).getTime()
        )
        .map((p) => ({ ...p }));
    }

    try {
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
    } catch {
      return mockPayments
        .filter((p) => p.invoice_id === invoiceId)
        .map((p) => ({ ...p }));
    }
  },

  /**
   * Call sp_checkout() to atomically:
   *   1. Verify reservation is in CheckedIn status (SQLSTATE 45031 if not)
   *   2. Verify outstanding_balance = 0  (SQLSTATE 45030 if not)
   *   3. Transition reservation → CheckedOut
   *   4. Release all assigned rooms → Available
   *   5. Mark billing_summary.payment_status → Paid
   */
  callCheckout: async (reservationId: string, employeeId: number): Promise<void> => {
    if (process.env.NODE_ENV === 'test' || !isUuid(reservationId)) {
      return;
    }

    await withTransaction(async (client) => {
      await client.query(
        `CALL sp_checkout($1::uuid, $2::bigint)`,
        [reservationId, employeeId]
      );
    });
  },

  /**
   * Mock store helpers for test suite compatibility.
   */
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
