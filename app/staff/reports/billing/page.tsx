
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface GuestBillingSummaryRow {
  guest_id: string;
  guest_name: string;
  email: string;
  phone: string | null;
  reservation_id: string;
  branch_id: number;
  branch_name: string;
  check_in_date: string;
  check_out_date: string;
  reservation_status: string;
  invoice_id: string;
  invoice_date: string;
  payment_status: string;
  room_charges: string;
  service_charges: string;
  tax_amount: string;
  grand_total: string;
  total_paid: string;
  outstanding_balance: string;
}

interface Filters {
  branchId: string;
  paymentStatus: string;
  search: string;
}

type PageState =
  | { stage: 'loading' }
  | { stage: 'success'; data: GuestBillingSummaryRow[] }
  | { stage: 'error'; message: string };

/* ─── Constants ──────────────────────────────────────────────────────────── */

const BRANCH_OPTIONS = [
  { id: 1, name: 'Colombo' },
  { id: 2, name: 'Kandy' },
  { id: 3, name: 'Galle' },
];

const PAYMENT_STATUS_OPTIONS = ['Unpaid', 'PartiallyPaid', 'Paid'];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function fmt(val: string): string {
  const n = parseFloat(val);
  return isNaN(n)
    ? val
    : `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-LK', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    Paid:          { cls: 'pb--paid',     label: 'Paid' },
    PartiallyPaid: { cls: 'pb--partial',  label: 'Partial' },
    Unpaid:        { cls: 'pb--unpaid',   label: 'Unpaid' },
    Pending:       { cls: 'pb--unpaid',   label: 'Pending' },
  };
  const { cls, label } = map[status] ?? { cls: 'pb--unknown', label: status };
  return <span className={`pb ${cls}`}>{label}</span>;
}

function ReservationBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Booked: 'rb--booked', CheckedIn: 'rb--checkedin',
    CheckedOut: 'rb--checkedout', Cancelled: 'rb--cancelled',
    Confirmed: 'rb--booked',
  };
  return <span className={`rb ${map[status] ?? 'rb--unknown'}`}>{status}</span>;
}

/* ─── CSS ────────────────────────────────────────────────────────────────── */

const CSS = `
/* ── Billing Summary Page ─────────────────────────────────────── */
.bs-page { min-height: calc(100vh - 4rem); background: var(--color-bg); padding: 2rem 1rem 4rem; }

.bs-breadcrumb {
  max-width: 1400px; margin: 0 auto 0.75rem;
  display: flex; align-items: center; gap: 0.375rem;
  font-size: 0.8125rem; color: var(--color-text-subtle);
}
.bs-breadcrumb a { color: var(--color-text-muted); text-decoration: none; transition: color 150ms; }
.bs-breadcrumb a:hover { color: var(--color-primary); }
.bs-breadcrumb__sep { color: var(--color-border-strong); }

.bs-header {
  max-width: 1400px; margin: 0 auto 1.5rem;
  display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;
}
.bs-title { font-size: 1.75rem; font-weight: 700; color: var(--color-text); letter-spacing: -0.025em; margin: 0 0 0.25rem; }
.bs-title span { color: var(--color-primary); }
.bs-subtitle { font-size: 0.9rem; color: var(--color-text-muted); margin: 0; }

/* Filters */
.bs-filters {
  max-width: 1400px; margin: 0 auto 1.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 1.125rem 1.25rem;
  display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end;
}
.bs-filter-group { display: flex; flex-direction: column; gap: 0.375rem; }
.bs-filter-group label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.bs-filter-group select, .bs-filter-group input {
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-bg-subtle);
  color: var(--color-text);
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  transition: border-color 150ms, box-shadow 150ms;
}
.bs-filter-group select:focus, .bs-filter-group input:focus {
  outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px hsl(196 80% 30% / 0.15);
}
.bs-filter-group input { min-width: 240px; }
.bs-filter-btn {
  background: var(--color-primary); color: white;
  border: none; border-radius: 0.5rem;
  padding: 0.5rem 1.25rem; font-size: 0.875rem; font-weight: 600;
  cursor: pointer; align-self: flex-end;
  transition: background 150ms, transform 100ms;
}
.bs-filter-btn:hover { background: var(--color-primary-hover); transform: translateY(-1px); }
.bs-clear-btn {
  background: transparent; color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem; padding: 0.5rem 1rem; font-size: 0.875rem;
  cursor: pointer; align-self: flex-end;
  transition: border-color 150ms, color 150ms;
}
.bs-clear-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }

/* Table */
.bs-table-wrap {
  max-width: 1400px; margin: 0 auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}
.bs-table-header {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;
  padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border);
}
.bs-table-header h2 { font-size: 0.9375rem; font-weight: 600; color: var(--color-text); margin: 0; }
.bs-count-badge {
  font-size: 0.75rem; font-weight: 600;
  background: var(--color-primary-muted); color: var(--color-primary);
  border-radius: 9999px; padding: 0.2rem 0.625rem;
}

.bs-table-scroll { overflow-x: auto; }
.bs-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
.bs-table th {
  background: var(--color-bg-subtle); color: var(--color-text-muted);
  font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
  padding: 0.6875rem 0.875rem; text-align: left; white-space: nowrap;
  border-bottom: 1px solid var(--color-border);
}
.bs-table th.col-r { text-align: right; }
.bs-table td {
  padding: 0.875rem 0.875rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text); vertical-align: middle;
}
.bs-table td.col-r { text-align: right; font-variant-numeric: tabular-nums; }
.bs-table tbody tr:last-child td { border-bottom: none; }
.bs-table tbody tr:hover td { background: var(--color-bg-subtle); }

/* Guest cell */
.g-name { font-weight: 600; color: var(--color-text); }
.g-email { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.125rem; }

/* Status badges */
.pb, .rb {
  display: inline-block;
  font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.04em;
  text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 9999px;
  white-space: nowrap;
}
.pb--paid      { background: var(--color-success-bg); color: var(--color-success); }
.pb--partial   { background: var(--color-warning-bg); color: var(--color-warning); }
.pb--unpaid    { background: var(--color-error-bg);   color: var(--color-error); }
.pb--unknown   { background: var(--color-bg-subtle);  color: var(--color-text-muted); }

.rb--booked     { background: var(--color-info-bg);       color: var(--color-info); }
.rb--checkedin  { background: var(--color-success-bg);    color: var(--color-success); }
.rb--checkedout { background: var(--color-bg-subtle);     color: var(--color-text-muted); }
.rb--cancelled  { background: var(--color-error-bg);      color: var(--color-error); }
.rb--unknown    { background: var(--color-bg-subtle);     color: var(--color-text-muted); }

/* Numeric cells */
.cell-amt { font-weight: 500; }
.cell-total { font-weight: 700; }
.cell-outstanding-zero    { color: var(--color-success); font-weight: 700; }
.cell-outstanding-nonzero { color: var(--color-error); font-weight: 700; }

/* Skeleton */
.bs-skeleton-row td { padding: 1rem; }
.sk2 {
  border-radius: 0.375rem; display: block;
  background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-surface-overlay) 50%, var(--color-bg-subtle) 75%);
  background-size: 200% 100%; animation: shim2 1.4s infinite;
}
@keyframes shim2 { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.bs-empty {
  text-align: center; padding: 3rem 1rem;
  color: var(--color-text-muted); font-size: 0.9375rem;
}
.bs-empty svg { width: 2.5rem; height: 2.5rem; margin: 0 auto 0.875rem; display: block; color: var(--color-border-strong); }
.bs-error-banner {
  max-width: 1400px; margin: 0 auto 1rem;
  background: var(--color-error-bg); color: var(--color-error);
  border: 1px solid var(--color-error);
  border-radius: 0.5rem; padding: 0.875rem 1.25rem;
  font-size: 0.9rem; font-weight: 500;
}

@media (max-width: 640px) {
  .bs-filters { gap: 0.75rem; }
  .bs-filter-group { width: 100%; }
  .bs-filter-group input, .bs-filter-group select { width: 100%; box-sizing: border-box; }
  .bs-filter-btn, .bs-clear-btn { width: 100%; }
}
`;

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function GuestBillingSummaryPage() {
  const [state, setState] = useState<PageState>({ stage: 'loading' });
  const [filters, setFilters] = useState<Filters>({ branchId: '', paymentStatus: '', search: '' });
  const [applied, setApplied] = useState<Filters>({ branchId: '', paymentStatus: '', search: '' });

  const fetchData = useCallback((f: Filters) => {
    setState({ stage: 'loading' });
    const params = new URLSearchParams();
    if (f.branchId)       params.set('branchId', f.branchId);
    if (f.paymentStatus)  params.set('paymentStatus', f.paymentStatus);
    if (f.search.trim())  params.set('search', f.search.trim());

    fetch(`/api/staff/reports/billing?${params.toString()}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState({ stage: 'error', message: json.error?.message ?? `Error ${res.status}` });
        } else {
          setState({ stage: 'success', data: json.data ?? [] });
        }
      })
      .catch(() => setState({ stage: 'error', message: 'Network error. Please try again.' }));
  }, []);

  useEffect(() => { fetchData(applied); }, [fetchData, applied]);

  function handleApply() { setApplied({ ...filters }); }
  function handleClear() {
    const empty: Filters = { branchId: '', paymentStatus: '', search: '' };
    setFilters(empty);
    setApplied(empty);
  }

  const rows = state.stage === 'success' ? state.data : [];

  return (
    <>
      <style>{CSS}</style>
      <div className="bs-page" id="billing-summary-report-main">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb">
          <div className="bs-breadcrumb">
            <Link href="/staff/dashboard">Dashboard</Link>
            <span className="bs-breadcrumb__sep" aria-hidden="true">›</span>
            <Link href="/staff/reports">Reports</Link>
            <span className="bs-breadcrumb__sep" aria-hidden="true">›</span>
            <span aria-current="page">Guest Billing Summary</span>
          </div>
        </nav>

        {/* Header */}
        <header className="bs-header">
          <div>
            <h1 className="bs-title">Guest <span>Billing Summary</span></h1>
            <p className="bs-subtitle">
              Individual invoice breakdown — room charges, tax, services, payments, and outstanding balances.
              <br />
              <em style={{ fontSize: '0.8125rem', color: 'var(--color-text-subtle)' }}>
                Source: <code>vw_guest_billing_summary</code> · Mock data in Phase 5
              </em>
            </p>
          </div>
        </header>

        {/* Filters */}
        <section className="bs-filters" aria-label="Report filters">
          <div className="bs-filter-group">
            <label htmlFor="billing-filter-branch">Branch</label>
            <select
              id="billing-filter-branch"
              value={filters.branchId}
              onChange={(e) => setFilters((p) => ({ ...p, branchId: e.target.value }))}
            >
              <option value="">All Branches</option>
              {BRANCH_OPTIONS.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="bs-filter-group">
            <label htmlFor="billing-filter-status">Payment Status</label>
            <select
              id="billing-filter-status"
              value={filters.paymentStatus}
              onChange={(e) => setFilters((p) => ({ ...p, paymentStatus: e.target.value }))}
            >
              <option value="">All Statuses</option>
              {PAYMENT_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === 'PartiallyPaid' ? 'Partially Paid' : s}</option>
              ))}
            </select>
          </div>

          <div className="bs-filter-group">
            <label htmlFor="billing-filter-search">Search Guest / Invoice</label>
            <input
              id="billing-filter-search"
              type="text"
              placeholder="Name, email, reservation ID…"
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleApply(); }}
            />
          </div>

          <button id="billing-filter-apply-btn" className="bs-filter-btn" onClick={handleApply}>
            Apply
          </button>
          <button id="billing-filter-clear-btn" className="bs-clear-btn" onClick={handleClear}>
            Clear
          </button>
        </section>

        {/* Error banner */}
        {state.stage === 'error' && (
          <div className="bs-error-banner" role="alert" aria-live="assertive">
            ⚠ {state.message}
          </div>
        )}

        {/* Table */}
        <div className="bs-table-wrap">
          <div className="bs-table-header">
            <h2>Billing Records</h2>
            {state.stage === 'success' && (
              <span className="bs-count-badge">{rows.length} record{rows.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="bs-table-scroll">
            <table className="bs-table" aria-label="Guest billing summary records">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Branch</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Reservation</th>
                  <th>Payment</th>
                  <th className="col-r">Room Charges</th>
                  <th className="col-r">Services</th>
                  <th className="col-r">Tax</th>
                  <th className="col-r">Grand Total</th>
                  <th className="col-r">Paid</th>
                  <th className="col-r">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {/* Loading skeletons */}
                {state.stage === 'loading' &&
                  [1, 2, 3].map((n) => (
                    <tr key={n} className="bs-skeleton-row">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <td key={i}>
                          <span className="sk2" style={{ width: i < 2 ? '7rem' : '5rem', height: '0.875rem' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                }

                {/* Empty state */}
                {state.stage === 'success' && rows.length === 0 && (
                  <tr>
                    <td colSpan={12}>
                      <div className="bs-empty" role="status">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        No billing records match the selected filters.
                      </div>
                    </td>
                  </tr>
                )}

                {/* Data rows */}
                {state.stage === 'success' && rows.map((row) => {
                  const outstanding = parseFloat(row.outstanding_balance);
                  return (
                    <tr key={`${row.reservation_id}-${row.invoice_id}`}>
                      <td>
                        <div className="g-name">{row.guest_name}</div>
                        <div className="g-email">{row.email}</div>
                      </td>
                      <td>{row.branch_name}</td>
                      <td>{fmtDate(row.check_in_date)}</td>
                      <td>{fmtDate(row.check_out_date)}</td>
                      <td><ReservationBadge status={row.reservation_status} /></td>
                      <td><PaymentBadge status={row.payment_status} /></td>
                      <td className="col-r cell-amt">{fmt(row.room_charges)}</td>
                      <td className="col-r cell-amt">{fmt(row.service_charges)}</td>
                      <td className="col-r" style={{ color: 'var(--color-warning)', fontWeight: 500 }}>{fmt(row.tax_amount)}</td>
                      <td className="col-r cell-total">{fmt(row.grand_total)}</td>
                      <td className="col-r" style={{ color: 'var(--color-success)', fontWeight: 500 }}>{fmt(row.total_paid)}</td>
                      <td className={`col-r ${outstanding <= 0 ? 'cell-outstanding-zero' : 'cell-outstanding-nonzero'}`}>
                        {fmt(row.outstanding_balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}