/**
 * Billing Repository — integration tests (P06-M05-T01)
 *
 * These tests run against the real PostgreSQL database.
 * Set DATABASE_URL in .env.test.local before running.
 *
 * Run: npx vitest run repositories/billing.repository.test.ts
 *
 * Prerequisites:
 *   - Migrations applied: P04-M05-T01, T02, and all prior
 *   - Routines deployed: sp_finalize_invoice, vw_invoice_totals
 *   - At least one active row in tax_policies
 *   - A valid reservation UUID in a non-Cancelled status
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { billingRepository } from './billing.repository';
import { pool } from '@/lib/db/pool';

// ── Seed helpers ─────────────────────────────────────────────────────────────

let testReservationId: string;
let testInvoiceId: string;

beforeAll(async () => {
  // Use a known CheckedIn reservation seeded in database/seeds/
  // Replace with a real UUID from your seed data or a test fixture.
  testReservationId = process.env.TEST_RESERVATION_ID ?? '';

  if (!testReservationId) {
    // Fetch the first available non-Cancelled reservation from the DB
    const result = await pool.query<{ reservation_id: string }>(
      `SELECT reservation_id
       FROM reservation
       WHERE reservation_status NOT IN ('Cancelled')
       LIMIT 1`
    );
    testReservationId = result.rows[0]?.reservation_id ?? '';
  }
});

// ── callFinalizeInvoice ───────────────────────────────────────────────────────

describe('billingRepository.callFinalizeInvoice', () => {
  it('creates a billing_summary and returns an invoice_id UUID', async () => {
    if (!testReservationId) {
      console.warn('Skipping: no test reservation available');
      return;
    }

    const result = await billingRepository.callFinalizeInvoice(testReservationId);

    expect(result).toHaveProperty('invoice_id');
    expect(typeof result.invoice_id).toBe('string');
    expect(result.invoice_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    testInvoiceId = result.invoice_id;
  });

  it('is idempotent — returns the same invoice_id on repeat call', async () => {
    if (!testReservationId || !testInvoiceId) {
      console.warn('Skipping: no test reservation or invoice available');
      return;
    }

    const result2 = await billingRepository.callFinalizeInvoice(testReservationId);
    expect(result2.invoice_id).toBe(testInvoiceId);
  });

  it('throws SQLSTATE 45040 for a non-existent reservation', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await expect(billingRepository.callFinalizeInvoice(fakeId)).rejects.toMatchObject({
      code: '45040',
    });
  });
});

// ── getInvoiceTotals ──────────────────────────────────────────────────────────

describe('billingRepository.getInvoiceTotals', () => {
  it('returns InvoiceTotals for an invoiced reservation', async () => {
    if (!testReservationId || !testInvoiceId) {
      console.warn('Skipping: no test reservation or invoice available');
      return;
    }

    const totals = await billingRepository.getInvoiceTotals(testReservationId);

    expect(totals).not.toBeNull();
    expect(totals!.invoice_id).toBe(testInvoiceId);
    expect(totals!.reservation_id).toBe(testReservationId);

    // All authoritative monetary values must be present and non-negative
    expect(parseFloat(totals!.room_charges)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(totals!.tax_amount)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(totals!.service_charges)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(totals!.grand_total)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(totals!.total_paid)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(totals!.outstanding_balance)).toBeGreaterThanOrEqual(0);
  });

  it('returns null for a reservation with no invoice', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000001';
    const totals = await billingRepository.getInvoiceTotals(fakeId);
    expect(totals).toBeNull();
  });

  it('outstanding_balance = grand_total - total_paid (DB enforces; TS only observes)', async () => {
    if (!testReservationId) {
      console.warn('Skipping: no test reservation available');
      return;
    }

    const totals = await billingRepository.getInvoiceTotals(testReservationId);
    if (!totals) return;

    const grand    = parseFloat(totals.grand_total);
    const paid     = parseFloat(totals.total_paid);
    const balance  = parseFloat(totals.outstanding_balance);

    // The view computes this; we only assert the result is arithmetically correct
    expect(balance).toBeCloseTo(grand - paid, 2);
  });
});

// ── getInvoiceTotalsById ──────────────────────────────────────────────────────

describe('billingRepository.getInvoiceTotalsById', () => {
  it('returns InvoiceTotals for a known invoice_id', async () => {
    if (!testInvoiceId) {
      console.warn('Skipping: no test invoice available');
      return;
    }

    const totals = await billingRepository.getInvoiceTotalsById(testInvoiceId);

    expect(totals).not.toBeNull();
    expect(totals!.invoice_id).toBe(testInvoiceId);
  });

  it('returns null for an unknown invoice_id', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000002';
    const totals = await billingRepository.getInvoiceTotalsById(fakeId);
    expect(totals).toBeNull();
  });
});
