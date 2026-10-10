/**
 * Billing Service — integration tests (P06-M05-T01)
 *
 * Tests the service layer over the real billing repository.
 * Set DATABASE_URL in .env.test.local before running.
 *
 * Run: npx vitest run services/billing.service.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { billingService } from './billing.service';
import { pool } from '@/lib/db/pool';

let testReservationId: string;
let testInvoiceId: string;

beforeAll(async () => {
  testReservationId = process.env.TEST_RESERVATION_ID ?? '';

  if (!testReservationId) {
    const result = await pool.query<{ reservation_id: string }>(
      `SELECT reservation_id
       FROM reservation
       WHERE reservation_status NOT IN ('Cancelled')
       LIMIT 1`
    );
    testReservationId = result.rows[0]?.reservation_id ?? '';
  }
});

// ── finalizeInvoice ───────────────────────────────────────────────────────────

describe('billingService.finalizeInvoice', () => {
  it('returns an invoice_id UUID', async () => {
    if (!testReservationId) {
      console.warn('Skipping: no test reservation available');
      return;
    }

    const result = await billingService.finalizeInvoice(testReservationId);

    expect(result).toHaveProperty('invoice_id');
    expect(result.invoice_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    testInvoiceId = result.invoice_id;
  });

  it('is idempotent on repeated calls', async () => {
    if (!testReservationId || !testInvoiceId) return;

    const result2 = await billingService.finalizeInvoice(testReservationId);
    expect(result2.invoice_id).toBe(testInvoiceId);
  });

  it('throws on non-existent reservation (SQLSTATE 45040)', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000099';
    await expect(billingService.finalizeInvoice(fakeId)).rejects.toMatchObject({
      code: '45040',
    });
  });
});

// ── getInvoiceTotals ──────────────────────────────────────────────────────────

describe('billingService.getInvoiceTotals', () => {
  it('returns authoritative totals from vw_invoice_totals', async () => {
    if (!testReservationId) return;

    const totals = await billingService.getInvoiceTotals(testReservationId);

    expect(totals).not.toBeNull();
    expect(totals!.reservation_id).toBe(testReservationId);

    // Monetary fields must be non-negative
    expect(parseFloat(totals!.room_charges)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(totals!.grand_total)).toBeGreaterThan(0);
    expect(parseFloat(totals!.outstanding_balance)).toBeGreaterThanOrEqual(0);
  });

  it('returns null when no invoice exists', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000098';
    const totals = await billingService.getInvoiceTotals(fakeId);
    expect(totals).toBeNull();
  });
});

// ── getInvoiceTotalsById ──────────────────────────────────────────────────────

describe('billingService.getInvoiceTotalsById', () => {
  it('returns totals for a known invoice_id', async () => {
    if (!testInvoiceId) return;

    const totals = await billingService.getInvoiceTotalsById(testInvoiceId);
    expect(totals).not.toBeNull();
    expect(totals!.invoice_id).toBe(testInvoiceId);
  });

  it('returns null for an unknown invoice_id', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000097';
    const totals = await billingService.getInvoiceTotalsById(fakeId);
    expect(totals).toBeNull();
  });
});
