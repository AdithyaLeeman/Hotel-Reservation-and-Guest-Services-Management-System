/**
 * Page: /staff/reports/service-usage
 *
 * Service Usage Report page — displays the top-used services ranked by total
 * quantity consumed. Fetches data from GET /api/staff/reports/top-services.
 *
 * Security:
 *   - Authentication: requires a logged-in staff user (Manager/Admin).
 *   - Controlled by the API route (returns 401/403 if unauthorized).
 *
 * Mock data strategy (Phase 5 / mock-first):
 *   Data is sourced from the API which currently returns mock data.
 *   In Phase 6, the API will be wired to the real DB view `vw_top_services`.
 *
 * Owned by: Member 4 (M4) | Task: P05-M04-T01 (Mock-First)
 * Lecture alignment: L05 (views/aggregate), L07 (RBAC)
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface TopServiceRow {
  service_id:        number;
  service_name:      string;
  total_quantity:    number;
  total_revenue:     number;
  reservation_count: number;
  usage_rank:        number;
}

type PageState =
  | { stage: 'loading' }
  | { stage: 'success'; data: TopServiceRow[] }
  | { stage: 'error'; message: string };

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatCurrency(amount: number): string {
  return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function ServiceUsageReportPage() {
  const [state, setState] = useState<PageState>({ stage: 'loading' });

  useEffect(() => {
    fetch('/api/staff/reports/top-services')
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json();
          setState({ stage: 'success', data: json.data || [] });
        } else {
          const json = await res.json().catch(() => ({}));
          setState({
            stage: 'error',
            message: json?.error?.message || `Failed to load report (HTTP ${res.status}).`,
          });
        }
      })
      .catch(() => {
        setState({
          stage: 'error',
          message: 'Network error — unable to reach the server.',
        });
      });
  }, []);

  return (
    <>
      <title>Service Usage Report — SkyNest Hotels Staff Portal</title>

      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
        <main
          id="service-usage-report-main"
          className="flex-1 container-page py-8 space-y-6"
          aria-label="Service usage report"
        >
          {/* ── Page header ── */}
          <header id="report-header" className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">
                Service Usage Report
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Top consumed services ranked by quantity across all branches.
              </p>
            </div>
            <Link
              href="/staff/dashboard"
              className="btn btn-ghost text-sm hidden sm:inline-flex"
            >
              ← Dashboard
            </Link>
          </header>



          {/* ── Report Content ── */}
          <section aria-labelledby="report-content-heading">
            <h2 id="report-content-heading" className="sr-only">
              Report Data
            </h2>

            {state.stage === 'loading' && (
              <div
                className="card p-10 flex items-center justify-center gap-3 text-sm text-[var(--color-text-muted)]"
                role="status"
                aria-label="Loading report data"
              >
                <span
                  className="inline-block w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
                Loading report data…
              </div>
            )}

            {state.stage === 'error' && (
              <div className="alert alert-error text-sm" role="alert">
                {state.message}
              </div>
            )}

            {state.stage === 'success' && (
              <div className="card overflow-hidden">
                {state.data.length === 0 ? (
                  <p className="p-8 text-center text-sm text-[var(--color-text-muted)]">
                    No service usage data available.
                  </p>
                ) : (
                  <table
                    className="w-full text-sm"
                    aria-label="Top services breakdown"
                  >
                    <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-center font-semibold text-[var(--color-text-muted)] w-16">Rank</th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold text-[var(--color-text-muted)]">Service</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">Quantity Consumed</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">Total Revenue</th>
                        <th scope="col" className="px-4 py-3 text-center font-semibold text-[var(--color-text-muted)] hidden sm:table-cell">Reservations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {state.data.map((row) => (
                        <tr
                          key={row.service_id}
                          className="hover:bg-[var(--color-bg-subtle)] transition-colors"
                        >
                          <td className="px-4 py-3 text-center font-bold text-[var(--color-primary)]">
                            #{row.usage_rank}
                          </td>
                          <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                            {row.service_name}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text-muted)]">
                            {row.total_quantity}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium text-[var(--color-text)]">
                            {formatCurrency(row.total_revenue)}
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums text-[var(--color-text-muted)] hidden sm:table-cell">
                            {row.reservation_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </section>
        </main>

        <footer
          id="service-usage-report-footer"
          className="border-t border-[var(--color-border)] py-4 text-center text-xs text-[var(--color-text-subtle)]"
        >
          SkyNest Hotels — Staff Portal · Generated {new Date().toLocaleDateString('en-LK')}
        </footer>
      </div>
    </>
  );
}
