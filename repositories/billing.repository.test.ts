/**
 * Billing Repository — unit tests (P06-M05-T01)
 *
 * Mocks pool.query and withTransaction so tests run fast, DB-independent.
 * Real-DB integration tests live in database/tests/test_billing_real_db.ts
 * (run manually with: npx ts-node database/tests/test_billing_real_db.ts)
 *
 * Owned by: Member 5 (M5)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock pool and withTransaction before importing the module under test ──────

vi.mock('@/lib/db/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

vi.mock('@/lib/db/transaction', () => ({
  withTransaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => {
    const mockClient = { query: vi.fn() };
    return fn(mockClient);
  }),
}));

import { pool } from '@/lib/db/pool';
import { withTransaction } from '@/lib/db/transaction';
import { billingRepository } from './billing.repository';

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_RES_ID   = 'aaaaaaaa-0000-0000-0000-000000000001';
const FAKE_INV_ID   = 'bbbbbbbb-0000-0000-0000-000000000002';
const ZERO_RES_ID   = '00000000-0000-0000-0000-000000000001';
const ZERO_INV_ID   = '00000000-0000-0000-0000-000000000002';

/** Build a realistic invoice totals row */
function makeInvoiceTotalsRow(overrides: Partial<Record<string, string>> = {}) {
  return {
    invoice_id:              FAKE_INV_ID,
    reservation_id:          FAKE_RES_ID,
    invoice_date:            '2026-10-01T00:00:00.000Z',
    tax_percentage_applied:  '8.00',
    payment_status:          'Pending',
    room_charges:            '24000.00',
    tax_amount:              '1920.00',
    service_charges:         '1000.00',
    grand_total:             '26920.00',
    total_paid:              '10000.00',
    outstanding_balance:     '16920.00',
    ...overrides,
  };
}

describe('billingRepository.callFinalizeInvoice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns invoice_id UUID from sp_finalize_invoice OUT parameter', async () => {
    // withTransaction mock calls fn(mockClient); mockClient.query is fresh
    vi.mocked(withTransaction).mockImplementationOnce(async (fn) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({
          rows: [{ p_invoice_id: FAKE_INV_ID }],
          rowCount: 1,
        }),
      };
      return fn(mockClient as never);
    });

    const result = await billingRepository.callFinalizeInvoice(FAKE_RES_ID);

    expect(result).toHaveProperty('invoice_id', FAKE_INV_ID);
  });

  it('is idempotent — calling twice returns same invoice_id', async () => {
    const makeImpl = () =>
      async (fn: (client: unknown) => Promise<unknown>) => {
        const mockClient = {
          query: vi.fn().mockResolvedValueOnce({
            rows: [{ p_invoice_id: FAKE_INV_ID }],
            rowCount: 1,
          }),
        };
        return fn(mockClient as never);
      };

    vi.mocked(withTransaction)
      .mockImplementationOnce(makeImpl())
      .mockImplementationOnce(makeImpl());

    const r1 = await billingRepository.callFinalizeInvoice(FAKE_RES_ID);
    const r2 = await billingRepository.callFinalizeInvoice(FAKE_RES_ID);

    expect(r1.invoice_id).toBe(r2.invoice_id);
  });

  it('propagates SQLSTATE 45040 for a non-existent reservation', async () => {
    const dbErr = Object.assign(new Error('Reservation not found'), { code: '45040' });

    vi.mocked(withTransaction).mockImplementationOnce(async (fn) => {
      const mockClient = { query: vi.fn().mockRejectedValueOnce(dbErr) };
      return fn(mockClient as never);
    });

    await expect(
      billingRepository.callFinalizeInvoice(ZERO_RES_ID)
    ).rejects.toMatchObject({ code: '45040' });
  });

  it('throws Error when sp_finalize_invoice returns no invoice_id', async () => {
    vi.mocked(withTransaction).mockImplementationOnce(async (fn) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [{ p_invoice_id: null }], rowCount: 1 }),
      };
      return fn(mockClient as never);
    });

    await expect(
      billingRepository.callFinalizeInvoice(FAKE_RES_ID)
    ).rejects.toThrow('sp_finalize_invoice returned no invoice_id');
  });
});

describe('billingRepository.getInvoiceTotals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns InvoiceTotals for a known reservation_id', async () => {
    const row = makeInvoiceTotalsRow();
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

    const totals = await billingRepository.getInvoiceTotals(FAKE_RES_ID);

    expect(totals).not.toBeNull();
    expect(totals!.invoice_id).toBe(FAKE_INV_ID);
    expect(totals!.reservation_id).toBe(FAKE_RES_ID);
    expect(totals!.room_charges).toBe('24000.00');
    expect(totals!.grand_total).toBe('26920.00');
    expect(totals!.outstanding_balance).toBe('16920.00');
  });

  it('returns null when no invoice exists for the reservation', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const totals = await billingRepository.getInvoiceTotals(ZERO_RES_ID);
    expect(totals).toBeNull();
  });

  it('outstanding_balance equals grand_total - total_paid (DB-computed; TS only observes)', async () => {
    const row = makeInvoiceTotalsRow({
      room_charges:        '30000.00',
      tax_amount:          '2400.00',
      service_charges:     '2000.00',
      grand_total:         '34400.00',
      total_paid:          '20000.00',
      outstanding_balance: '14400.00',
    });
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

    const totals = await billingRepository.getInvoiceTotals(FAKE_RES_ID);
    expect(totals).not.toBeNull();

    const grand   = parseFloat(totals!.grand_total);
    const paid    = parseFloat(totals!.total_paid);
    const balance = parseFloat(totals!.outstanding_balance);

    // DB computes this; we only assert the view's result is arithmetically correct
    expect(balance).toBeCloseTo(grand - paid, 2);
  });

  it('monetary fields come through as strings (pg NUMERIC → string)', async () => {
    const row = makeInvoiceTotalsRow();
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

    const totals = await billingRepository.getInvoiceTotals(FAKE_RES_ID);

    expect(typeof totals!.room_charges).toBe('string');
    expect(typeof totals!.tax_amount).toBe('string');
    expect(typeof totals!.service_charges).toBe('string');
    expect(typeof totals!.grand_total).toBe('string');
    expect(typeof totals!.total_paid).toBe('string');
    expect(typeof totals!.outstanding_balance).toBe('string');
  });
});

describe('billingRepository.getInvoiceTotalsById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns InvoiceTotals for a known invoice_id', async () => {
    const row = makeInvoiceTotalsRow();
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

    const totals = await billingRepository.getInvoiceTotalsById(FAKE_INV_ID);

    expect(totals).not.toBeNull();
    expect(totals!.invoice_id).toBe(FAKE_INV_ID);
  });

  it('returns null for an unknown invoice_id', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const totals = await billingRepository.getInvoiceTotalsById(ZERO_INV_ID);
    expect(totals).toBeNull();
  });

  it('queries vw_invoice_totals by invoice_id', async () => {
    const row = makeInvoiceTotalsRow();
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

    await billingRepository.getInvoiceTotalsById(FAKE_INV_ID);

    const callArgs = vi.mocked(pool.query).mock.calls[0];
    expect((callArgs[0] as string).toLowerCase()).toContain('vw_invoice_totals');
    expect((callArgs[0] as string).toLowerCase()).toContain('invoice_id');
  });
});
