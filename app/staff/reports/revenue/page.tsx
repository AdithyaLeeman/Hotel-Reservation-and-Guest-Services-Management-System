
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface MonthlyRevenueRow {
  branch_id: number;
  branch_name: string;
  revenue_year: number;
  revenue_month: number;
  period_label: string;
  total_invoices: number;
  room_revenue: string;
  service_revenue: string;
  tax_collected: string;
  total_revenue: string;
  total_paid: string;
  total_outstanding: string;
}

interface Filters {
  branchId: string;
  year: string;
  month: string;
}

type PageState =
  | { stage: 'loading' }
  | { stage: 'success'; data: MonthlyRevenueRow[] }
  | { stage: 'error'; message: string };

/* ─── Constants ──────────────────────────────────────────────────────────── */

const BRANCH_OPTIONS = [
  { id: 1, name: 'Colombo' },
  { id: 2, name: 'Kandy' },
  { id: 3, name: 'Galle' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function fmt(val: string): string {
  const n = parseFloat(val);
  return isNaN(n)
    ? val
    : `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sumCol(rows: MonthlyRevenueRow[], key: keyof MonthlyRevenueRow): string {
  const total = rows.reduce((acc, r) => acc + parseFloat(r[key] as string || '0'), 0);
  return `LKR ${total.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ─── CSS ────────────────────────────────────────────────────────────────── */

const CSS = `
/* ── Monthly Revenue Page ─────────────────────────────────────── */
.rp-page { min-height: calc(100vh - 4rem); background: var(--color-bg); padding: 2rem 1rem 4rem; }

.rp-breadcrumb {
  max-width: 1200px; margin: 0 auto 0.75rem;
  display: flex; align-items: center; gap: 0.375rem;
  font-size: 0.8125rem; color: var(--color-text-subtle);
}
.rp-breadcrumb a { color: var(--color-text-muted); text-decoration: none; transition: color 150ms; }
.rp-breadcrumb a:hover { color: var(--color-primary); }
.rp-breadcrumb__sep { color: var(--color-border-strong); }

.rp-header {
  max-width: 1200px; margin: 0 auto 1.5rem;
  display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;
}
.rp-title { font-size: 1.75rem; font-weight: 700; color: var(--color-text); letter-spacing: -0.025em; margin: 0 0 0.25rem; }
.rp-title span { color: var(--color-primary); }
.rp-subtitle { font-size: 0.9rem; color: var(--color-text-muted); margin: 0; }

/* Filters */
.rp-filters {
  max-width: 1200px; margin: 0 auto 1.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 1.125rem 1.25rem;
  display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end;
}
.rp-filter-group { display: flex; flex-direction: column; gap: 0.375rem; min-width: 140px; }
.rp-filter-group label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.rp-filter-group select {
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-bg-subtle);
  color: var(--color-text);
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: border-color 150ms, box-shadow 150ms;
}
.rp-filter-group select:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px hsl(196 80% 30% / 0.15); }
.rp-filter-btn {
  background: var(--color-primary); color: white;
  border: none; border-radius: 0.5rem;
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem; font-weight: 600;
  cursor: pointer; align-self: flex-end;
  transition: background 150ms, transform 100ms;
}
.rp-filter-btn:hover { background: var(--color-primary-hover); transform: translateY(-1px); }
.rp-filter-btn:active { transform: translateY(0); }
.rp-clear-btn {
  background: transparent; color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem; cursor: pointer;
  align-self: flex-end;
  transition: border-color 150ms, color 150ms;
}
.rp-clear-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }

/* Table wrapper */
.rp-table-wrap {
  max-width: 1200px; margin: 0 auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}
.rp-table-header {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}
.rp-table-header h2 { font-size: 0.9375rem; font-weight: 600; color: var(--color-text); margin: 0; }
.rp-count-badge {
  font-size: 0.75rem; font-weight: 600;
  background: var(--color-primary-muted); color: var(--color-primary);
  border-radius: 9999px; padding: 0.2rem 0.625rem;
}

.rp-table-scroll { overflow-x: auto; }
.rp-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.rp-table th {
  background: var(--color-bg-subtle); color: var(--color-text-muted);
  font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
  padding: 0.75rem 1rem; text-align: left; white-space: nowrap;
  border-bottom: 1px solid var(--color-border);
}
.rp-table th.rp-col-num { text-align: right; }
.rp-table td {
  padding: 0.8125rem 1rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  vertical-align: middle;
}
.rp-table td.rp-col-num { text-align: right; font-variant-numeric: tabular-nums; }
.rp-table tbody tr:last-child td { border-bottom: none; }
.rp-table tbody tr:hover td { background: var(--color-bg-subtle); }

/* Branch + period cell */
.rp-cell-branch { font-weight: 600; color: var(--color-text); }
.rp-cell-period { font-size: 0.8125rem; color: var(--color-text-muted); margin-top: 0.125rem; }

/* Revenue coloring */
.rp-cell-revenue { font-weight: 500; color: var(--color-text); }
.rp-cell-tax { color: var(--color-warning); font-weight: 500; }
.rp-cell-total { font-weight: 700; color: var(--color-text); }
.rp-cell-paid { color: var(--color-success); font-weight: 500; }
.rp-cell-outstanding { font-weight: 700; }
.rp-cell-outstanding--zero { color: var(--color-success); }
.rp-cell-outstanding--nonzero { color: var(--color-error); }

/* Totals row */
.rp-totals-row td {
  background: var(--color-primary-muted) !important;
  border-top: 2px solid var(--color-primary);
  font-weight: 700;
  font-size: 0.875rem;
}

/* Loading skeleton */
.rp-skeleton-row td { padding: 1rem; }
.sk {
  border-radius: 0.375rem;
  background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-surface-overlay) 50%, var(--color-bg-subtle) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  display: inline-block;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Empty / error states */
.rp-empty {
  text-align: center; padding: 3rem 1rem;
  color: var(--color-text-muted); font-size: 0.9375rem;
}
.rp-empty svg { width: 2.5rem; height: 2.5rem; margin: 0 auto 0.875rem; display: block; color: var(--color-border-strong); }
.rp-error-banner {
  max-width: 1200px; margin: 0 auto 1rem;
  background: var(--color-error-bg); color: var(--color-error);
  border: 1px solid var(--color-error);
  border-radius: 0.5rem; padding: 0.875rem 1.25rem;
  font-size: 0.9rem; font-weight: 500;
}

@media (max-width: 640px) {
  .rp-filters { gap: 0.75rem; }
  .rp-filter-group { min-width: 100%; }
  .rp-filter-btn, .rp-clear-btn { width: 100%; justify-content: center; }
}
`;

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function MonthlyRevenuePage() {
  const [state, setState] = useState<PageState>({ stage: 'loading' });
  const [filters, setFilters] = useState<Filters>({ branchId: '', year: '', month: '' });
  const [applied, setApplied] = useState<Filters>({ branchId: '', year: '', month: '' });

  const fetchData = useCallback((f: Filters) => {
    setState({ stage: 'loading' });
    const params = new URLSearchParams();
    if (f.branchId) params.set('branchId', f.branchId);
    if (f.year)     params.set('year', f.year);
    if (f.month)    params.set('month', f.month);

    fetch(`/api/staff/reports/revenue?${params.toString()}`)
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

  function handleApply() {
    setApplied({ ...filters });
  }

  function handleClear() {
    const empty: Filters = { branchId: '', year: '', month: '' };
    setFilters(empty);
    setApplied(empty);
  }

  const rows = state.stage === 'success' ? state.data : [];

  return (
    <>
      <style>{CSS}</style>
      <div className="rp-page" id="revenue-report-main">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb">
          <div className="rp-breadcrumb">
            <Link href="/staff/dashboard">Dashboard</Link>
            <span className="rp-breadcrumb__sep" aria-hidden="true">›</span>
            <Link href="/staff/reports">Reports</Link>
            <span className="rp-breadcrumb__sep" aria-hidden="true">›</span>
            <span aria-current="page">Monthly Revenue</span>
          </div>
        </nav>

        {/* Header */}
        <header className="rp-header">
          <div>
            <h1 className="rp-title">Monthly <span>Revenue</span></h1>
            <p className="rp-subtitle">
              Room revenue, service charges, tax collected and outstanding balances by branch and month.
              <br />
              <em style={{ fontSize: '0.8125rem', color: 'var(--color-text-subtle)' }}>
                Source: <code>vw_monthly_revenue</code> · Mock data in Phase 5
              </em>
            </p>
          </div>
        </header>

        {/* Filters */}
        <section className="rp-filters" aria-label="Report filters">
          <div className="rp-filter-group">
            <label htmlFor="rev-filter-branch">Branch</label>
            <select
              id="rev-filter-branch"
              value={filters.branchId}
              onChange={(e) => setFilters((p) => ({ ...p, branchId: e.target.value }))}
            >
              <option value="">All Branches</option>
              {BRANCH_OPTIONS.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="rp-filter-group">
            <label htmlFor="rev-filter-year">Year</label>
            <select
              id="rev-filter-year"
              value={filters.year}
              onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value }))}
            >
              <option value="">All Years</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="rp-filter-group">
            <label htmlFor="rev-filter-month">Month</label>
            <select
              id="rev-filter-month"
              value={filters.month}
              onChange={(e) => setFilters((p) => ({ ...p, month: e.target.value }))}
            >
              <option value="">All Months</option>
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>

          <button id="rev-filter-apply-btn" className="rp-filter-btn" onClick={handleApply}>
            Apply Filters
          </button>
          <button id="rev-filter-clear-btn" className="rp-clear-btn" onClick={handleClear}>
            Clear
          </button>
        </section>

        {/* Error banner */}
        {state.stage === 'error' && (
          <div className="rp-error-banner" role="alert" aria-live="assertive">
            ⚠ {state.stage === 'error' ? state.message : ''}
          </div>
        )}

        {/* Table */}
        <div className="rp-table-wrap">
          <div className="rp-table-header">
            <h2>Revenue Breakdown</h2>
            {state.stage === 'success' && (
              <span className="rp-count-badge">{rows.length} record{rows.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="rp-table-scroll">
            <table className="rp-table" aria-label="Monthly revenue by branch">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Period</th>
                  <th className="rp-col-num">Invoices</th>
                  <th className="rp-col-num">Room Revenue</th>
                  <th className="rp-col-num">Service Revenue</th>
                  <th className="rp-col-num">Tax Collected</th>
                  <th className="rp-col-num">Grand Total</th>
                  <th className="rp-col-num">Total Paid</th>
                  <th className="rp-col-num">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {state.stage === 'loading' &&
                  [1, 2, 3].map((n) => (
                    <tr key={n} className="rp-skeleton-row">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <td key={i}>
                          <span className="sk" style={{ width: i === 0 ? '6rem' : i === 1 ? '7rem' : '5rem', height: '0.9rem', display: 'block' }} />
                        </td>
                      ))}
                    </tr>
                  ))}

                {state.stage === 'success' && rows.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <div className="rp-empty" role="status">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        No revenue records match the selected filters.
                      </div>
                    </td>
                  </tr>
                )}

                {state.stage === 'success' && rows.map((row, idx) => {
                  const outstanding = parseFloat(row.total_outstanding);
                  return (
                    <tr key={`${row.branch_id}-${row.revenue_year}-${row.revenue_month}-${idx}`}>
                      <td>
                        <div className="rp-cell-branch">{row.branch_name}</div>
                      </td>
                      <td>
                        <div className="rp-cell-period">{row.period_label}</div>
                      </td>
                      <td className="rp-col-num">{row.total_invoices}</td>
                      <td className="rp-col-num rp-cell-revenue">{fmt(row.room_revenue)}</td>
                      <td className="rp-col-num rp-cell-revenue">{fmt(row.service_revenue)}</td>
                      <td className="rp-col-num rp-cell-tax">{fmt(row.tax_collected)}</td>
                      <td className="rp-col-num rp-cell-total">{fmt(row.total_revenue)}</td>
                      <td className="rp-col-num rp-cell-paid">{fmt(row.total_paid)}</td>
                      <td className={`rp-col-num rp-cell-outstanding ${outstanding <= 0 ? 'rp-cell-outstanding--zero' : 'rp-cell-outstanding--nonzero'}`}>
                        {fmt(row.total_outstanding)}
                      </td>
                    </tr>
                  );
                })}

                {/* Totals row */}
                {state.stage === 'success' && rows.length > 0 && (
                  <tr className="rp-totals-row">
                    <td colSpan={2}>Totals ({rows.length} periods)</td>
                    <td className="rp-col-num">
                      {rows.reduce((s, r) => s + r.total_invoices, 0)}
                    </td>
                    <td className="rp-col-num">{sumCol(rows, 'room_revenue')}</td>
                    <td className="rp-col-num">{sumCol(rows, 'service_revenue')}</td>
                    <td className="rp-col-num">{sumCol(rows, 'tax_collected')}</td>
                    <td className="rp-col-num">{sumCol(rows, 'total_revenue')}</td>
                    <td className="rp-col-num">{sumCol(rows, 'total_paid')}</td>
                    <td className="rp-col-num">{sumCol(rows, 'total_outstanding')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}