/**
 * Billing Service — unit tests (P06-M05-T01)
 *
 * Mocks the billing repository so tests remain fast and DB-independent.
 * Real-DB integration tests live in database/tests/test_billing_real_db.ts.
 *
 * Owned by: Member 5 (M5)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InvoiceTotals } from '@/types/domain';

// ── Hoisted mock fns ──────────────────────────────────────────────────────────

const { mockCallFinalize, mockGetTotals, mockGetTotalsById } = vi.hoisted(() => ({
  mockCallFinalize:    vi.fn(),
  mockGetTotals:       vi.fn(),
  mockGetTotalsById:   vi.fn(),
}));

// ── Mock billing repository ───────────────────────────────────────────────────

vi.mock('@/repositories/billing.repository', () => ({
  billingRepository: {
    callFinalizeInvoice:  mockCallFinalize,
    getInvoiceTotals:     mockGetTotals,
    getInvoiceTotalsById: mockGetTotalsById,
  },
}));

import { billingService } from './billing.service';

// ── Test data ─────────────────────────────────────────────────────────────────

const FAKE_RES_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const FAKE_INV_ID = 'bbbbbbbb-0000-0000-0000-000000000002';
const ZERO_RES_ID = '00000000-0000-0000-0000-000000000099';
const ZERO_INV_ID = '00000000-0000-0000-0000-000000000098';

const MOCK_INVOICE_TOTALS: InvoiceTotals = {
  invoice_id:          FAKE_INV_ID,
  reservation_id:      FAKE_RES_ID,
  room_charges:        '24000.00',
  tax_amount:          '1920.00',
  service_charges:     '1000.00',
  grand_total:         '26920.00',
  total_paid:          '10000.00',
  outstanding_balance: '16920.00',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('billingService.finalizeInvoice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates to billingRepository and returns invoice_id', async () => {
    mockCallFinalize.mockResolvedValueOnce({ invoice_id: FAKE_INV_ID });

    const result = await billingService.finalizeInvoice(FAKE_RES_ID);

    expect(result.invoice_id).toBe(FAKE_INV_ID);
    expect(mockCallFinalize).toHaveBeenCalledOnce();
    expect(mockCallFinalize).toHaveBeenCalledWith(FAKE_RES_ID);
  });

  it('is idempotent — two calls return same invoice_id', async () => {
    mockCallFinalize
      .mockResolvedValueOnce({ invoice_id: FAKE_INV_ID })
      .mockResolvedValueOnce({ invoice_id: FAKE_INV_ID });

    const r1 = await billingService.finalizeInvoice(FAKE_RES_ID);
    const r2 = await billingService.finalizeInvoice(FAKE_RES_ID);

    expect(r1.invoice_id).toBe(r2.invoice_id);
    expect(mockCallFinalize).toHaveBeenCalledTimes(2);
  });

  it('propagates SQLSTATE 45040 when repository throws for non-existent reservation', async () => {
    const dbErr = Object.assign(new Error('Reservation not found'), { code: '45040' });
    mockCallFinalize.mockRejectedValueOnce(dbErr);

    await expect(
      billingService.finalizeInvoice(ZERO_RES_ID)
    ).rejects.toMatchObject({ code: '45040' });
  });

  it('propagates SQLSTATE 45041 when reservation is Cancelled', async () => {
    const dbErr = Object.assign(new Error('Reservation is Cancelled'), { code: '45041' });
    mockCallFinalize.mockRejectedValueOnce(dbErr);

    await expect(
      billingService.finalizeInvoice(FAKE_RES_ID)
    ).rejects.toMatchObject({ code: '45041' });
  });

  it('propagates SQLSTATE 45042 when no active tax policy exists', async () => {
    const dbErr = Object.assign(new Error('No active tax policy'), { code: '45042' });
    mockCallFinalize.mockRejectedValueOnce(dbErr);

    await expect(
      billingService.finalizeInvoice(FAKE_RES_ID)
    ).rejects.toMatchObject({ code: '45042' });
  });
});

describe('billingService.getInvoiceTotals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns authoritative totals from vw_invoice_totals via repository', async () => {
    mockGetTotals.mockResolvedValueOnce(MOCK_INVOICE_TOTALS);

    const totals = await billingService.getInvoiceTotals(FAKE_RES_ID);

    expect(totals).not.toBeNull();
    expect(totals!.reservation_id).toBe(FAKE_RES_ID);
    expect(totals!.grand_total).toBe('26920.00');
    expect(totals!.outstanding_balance).toBe('16920.00');
    expect(mockGetTotals).toHaveBeenCalledWith(FAKE_RES_ID);
  });

  it('returns null when no invoice has been created yet', async () => {
    mockGetTotals.mockResolvedValueOnce(null);

    const totals = await billingService.getInvoiceTotals(ZERO_RES_ID);
    expect(totals).toBeNull();
  });

  it('does NOT compute outstanding_balance in TypeScript (DB-first rule)', async () => {
    mockGetTotals.mockResolvedValueOnce(MOCK_INVOICE_TOTALS);

    const totals = await billingService.getInvoiceTotals(FAKE_RES_ID);

    // The value must come from the mock (i.e. from the DB/view), not re-computed
    expect(totals!.outstanding_balance).toBe('16920.00');

    // grand_total - total_paid = 26920 - 10000 = 16920; DB value matches
    const grand   = parseFloat(totals!.grand_total);
    const paid    = parseFloat(totals!.total_paid);
    const balance = parseFloat(totals!.outstanding_balance);
    expect(balance).toBeCloseTo(grand - paid, 2);
  });
});

describe('billingService.getInvoiceTotalsById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns totals for a known invoice_id', async () => {
    mockGetTotalsById.mockResolvedValueOnce(MOCK_INVOICE_TOTALS);

    const totals = await billingService.getInvoiceTotalsById(FAKE_INV_ID);

    expect(totals).not.toBeNull();
    expect(totals!.invoice_id).toBe(FAKE_INV_ID);
    expect(mockGetTotalsById).toHaveBeenCalledWith(FAKE_INV_ID);
  });

  it('returns null for an unknown invoice_id', async () => {
    mockGetTotalsById.mockResolvedValueOnce(null);

    const totals = await billingService.getInvoiceTotalsById(ZERO_INV_ID);
    expect(totals).toBeNull();
  });

  it('all monetary fields are strings (pg NUMERIC → string, no TS arithmetic)', async () => {
    mockGetTotalsById.mockResolvedValueOnce(MOCK_INVOICE_TOTALS);

    const totals = await billingService.getInvoiceTotalsById(FAKE_INV_ID);

    expect(typeof totals!.room_charges).toBe('string');
    expect(typeof totals!.tax_amount).toBe('string');
    expect(typeof totals!.service_charges).toBe('string');
    expect(typeof totals!.grand_total).toBe('string');
    expect(typeof totals!.total_paid).toBe('string');
    expect(typeof totals!.outstanding_balance).toBe('string');
  });
});
