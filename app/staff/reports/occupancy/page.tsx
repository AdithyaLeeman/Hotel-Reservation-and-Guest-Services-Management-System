/**
 * Page: /staff/reports/occupancy
 *
 * Room Occupancy Report Page — provides hotel management with detailed
 * room occupancy metrics, night counts, occupancy rates, and revenue across
 * all hotel branches and rooms.
 *
 * Consumes:
 *   GET /api/staff/reports/occupancy
 *   (Supported query parameters: branchId, fromDate, toDate, roomStatus)
 *
 * Security:
 *   - Access restricted to Manager and Admin staff roles (enforced by API).
 *   - Unauthenticated or unauthorized requests display friendly error alerts.
 *
 * Mock-first Strategy (Phase 5 / P05-M02-T01):
 *   Currently backed by mock data in `occupancyReportRepository`.
 *   In Phase 6 (P06-M02-T01), this connects directly to the PostgreSQL
 *   view `vw_room_occupancy`.
 *
 * Layout note:
 *   <StaffNav /> is rendered by `app/staff/layout.tsx`.
 *
 * Owned by: Member 2 (M2) — Karunarathna W.P. 240331F
 * Task: P05-M02-T01
 * Lecture alignment: L05 (views & derived reporting), L03 (aggregations), L07 (RBAC)
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

/* ─── Domain Types & Constants ────────────────────────────────────────────── */

export interface OccupancyReportRow {
  branch_id: number;
  branch_name: string;
  room_id: number;
  room_number: string;
  room_type_name: string;
  room_status: string; // 'Available' | 'Occupied' | 'Maintenance'
  period_date: string; // ISO date string (YYYY-MM-DD)
  total_nights_occupied: number;
  occupancy_rate: string; // NUMERIC(5,2) string percentage
  total_revenue: string; // NUMERIC(12,2) string
}

export const BRANCH_OPTIONS = [
  { id: 1, name: 'Colombo' },
  { id: 2, name: 'Kandy' },
  { id: 3, name: 'Galle' },
] as const;

export const STATUS_OPTIONS = ['Available', 'Occupied', 'Maintenance'] as const;

export type SortKey =
  | 'room_number'
  | 'branch_name'
  | 'room_type_name'
  | 'room_status'
  | 'period_date'
  | 'total_nights_occupied'
  | 'occupancy_rate'
  | 'total_revenue';

export type SortDirection = 'asc' | 'desc';

interface FilterState {
  branchId: string;
  roomStatus: string;
  fromDate: string;
  toDate: string;
}

type PageState =
  | { stage: 'loading' }
  | { stage: 'success'; data: OccupancyReportRow[] }
  | { stage: 'error'; message: string };

/* ─── Helpers ────────────────────────────────────────────────────────────── */

export function formatLKR(amount: number): string {
  return `LKR ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseMoney(val: string | undefined): number {
  if (!val) return 0;
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

/* ─── Status Badge Component ─────────────────────────────────────────────── */

const STATUS_BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Available: {
    bg: 'hsl(142 50% 94%)',
    text: 'hsl(142 60% 30%)',
    border: 'hsl(142 50% 85%)',
  },
  Occupied: {
    bg: 'hsl(210 80% 94%)',
    text: 'hsl(210 80% 35%)',
    border: 'hsl(210 80% 85%)',
  },
  Maintenance: {
    bg: 'hsl(38 90% 94%)',
    text: 'hsl(38 90% 35%)',
    border: 'hsl(38 90% 85%)',
  },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_BADGE_STYLES[status] || {
    bg: 'var(--color-bg-subtle)',
    text: 'var(--color-text-muted)',
    border: 'var(--color-border)',
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderColor: style.border,
      }}
      aria-label={`Status: ${status}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: style.text }}
        aria-hidden="true"
      />
      {status}
    </span>
  );
}

/* ─── Main Page Component ────────────────────────────────────────────────── */

export default function OccupancyReportPage() {
  const [filters, setFilters] = useState<FilterState>({
    branchId: '',
    roomStatus: '',
    fromDate: '',
    toDate: '',
  });

  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    branchId: '',
    roomStatus: '',
    fromDate: '',
    toDate: '',
  });

  const [sortKey, setSortKey] = useState<SortKey>('branch_name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [state, setState] = useState<PageState>({ stage: 'loading' });
  const [validationError, setValidationError] = useState<string | null>(null);
  // Bump to re-trigger the fetch effect (Refresh / Retry buttons)
  const [refreshKey, setRefreshKey] = useState(0);

  /* ─── Fetch report from API ────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Client-side date validation before hitting the network
      if (
        appliedFilters.fromDate &&
        appliedFilters.toDate &&
        appliedFilters.fromDate > appliedFilters.toDate
      ) {
        setValidationError('Start date (From Date) cannot be after End date (To Date).');
        setState({ stage: 'error', message: 'Invalid date range specified.' });
        return;
      }

      setState({ stage: 'loading' });
      setValidationError(null);

      const params = new URLSearchParams();
      if (appliedFilters.branchId) params.set('branchId', appliedFilters.branchId);
      if (appliedFilters.roomStatus) params.set('roomStatus', appliedFilters.roomStatus);
      if (appliedFilters.fromDate) params.set('fromDate', appliedFilters.fromDate);
      if (appliedFilters.toDate) params.set('toDate', appliedFilters.toDate);

      const query = params.toString();
      const url = `/api/staff/reports/occupancy${query ? `?${query}` : ''}`;

      try {
        const res = await fetch(url);
        if (cancelled) return;

        if (res.ok) {
          const json = await res.json();
          setState({ stage: 'success', data: (json as { data?: OccupancyReportRow[] }).data || [] });
        } else {
          const json = await res.json().catch(() => ({}));
          setState({
            stage: 'error',
            message:
              (json as { error?: { message?: string } })?.error?.message ??
              `Failed to load occupancy report (HTTP ${res.status}).`,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            stage: 'error',
            message: 'Network error — unable to connect to the reporting service.',
          });
        }
      }
    }

    void run();
    return () => { cancelled = true; };
  }, [appliedFilters, refreshKey]);

  /* ─── Filter handlers ──────────────────────────────────────────────────── */
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters(filters);
  };

  const handleResetFilters = () => {
    const empty = { branchId: '', roomStatus: '', fromDate: '', toDate: '' };
    setFilters(empty);
    setAppliedFilters(empty);
  };

  /* ─── Sorting handler ──────────────────────────────────────────────────── */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  /* ─── Processed and Sorted Data ────────────────────────────────────────── */
  const sortedData = useMemo(() => {
    if (state.stage !== 'success') return [];

    return [...state.data].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'room_number':
          cmp = a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
          break;
        case 'branch_name':
          cmp = a.branch_name.localeCompare(b.branch_name);
          break;
        case 'room_type_name':
          cmp = a.room_type_name.localeCompare(b.room_type_name);
          break;
        case 'room_status':
          cmp = a.room_status.localeCompare(b.room_status);
          break;
        case 'period_date':
          cmp = a.period_date.localeCompare(b.period_date);
          break;
        case 'total_nights_occupied':
          cmp = a.total_nights_occupied - b.total_nights_occupied;
          break;
        case 'occupancy_rate':
          cmp = parseFloat(a.occupancy_rate) - parseFloat(b.occupancy_rate);
          break;
        case 'total_revenue':
          cmp = parseMoney(a.total_revenue) - parseMoney(b.total_revenue);
          break;
        default:
          cmp = 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [state, sortKey, sortDir]);

  /* ─── Summary KPIs Calculation ─────────────────────────────────────────── */
  const kpiSummary = useMemo(() => {
    if (state.stage !== 'success' || state.data.length === 0) {
      return {
        totalRooms: 0,
        totalNights: 0,
        averageOccupancyRate: 0,
        totalRevenue: 0,
      };
    }

    const totalRooms = state.data.length;
    const totalNights = state.data.reduce((acc, row) => acc + row.total_nights_occupied, 0);
    const sumRate = state.data.reduce((acc, row) => acc + (parseFloat(row.occupancy_rate) || 0), 0);
    const totalRevenue = state.data.reduce((acc, row) => acc + parseMoney(row.total_revenue), 0);

    return {
      totalRooms,
      totalNights,
      averageOccupancyRate: totalRooms > 0 ? sumRate / totalRooms : 0,
      totalRevenue,
    };
  }, [state]);

  const hasActiveFilters = Boolean(
    appliedFilters.branchId ||
      appliedFilters.roomStatus ||
      appliedFilters.fromDate ||
      appliedFilters.toDate
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <main
        id="occupancy-report-main"
        className="flex-1 container-page py-8 space-y-6"
        aria-label="Room Occupancy Report"
      >
        {/* ── Breadcrumb & Navigation ── */}
        <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Link href="/staff/dashboard" className="hover:text-[var(--color-text)] transition-colors">
            Staff Portal
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[var(--color-text)] font-medium">Occupancy Report</span>
        </nav>

        {/* ── Header ── */}
        <header id="occupancy-report-header" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
              Room Occupancy Report
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Review room occupancy rates, booked room nights, and generated room revenue across branches.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="refresh-report-btn"
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="btn btn-outline btn-sm gap-2"
              disabled={state.stage === 'loading'}
              aria-label="Refresh report data"
            >
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Refresh
            </button>
            <Link
              href="/staff/dashboard"
              className="btn btn-ghost btn-sm"
              id="back-to-dashboard-btn"
            >
              ← Dashboard
            </Link>
          </div>
        </header>



        {/* ── Summary KPI Cards ── */}
        <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5 border border-[var(--color-border)]">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Rooms Monitored
            </span>
            <div className="mt-2 text-2xl font-bold text-[var(--color-text)]">
              {state.stage === 'loading' ? '—' : kpiSummary.totalRooms}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Active inventory in view
            </p>
          </div>

          <div className="card p-5 border border-[var(--color-border)]">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Nights Occupied
            </span>
            <div className="mt-2 text-2xl font-bold text-[var(--color-primary)]">
              {state.stage === 'loading' ? '—' : kpiSummary.totalNights}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Total room nights booked
            </p>
          </div>

          <div className="card p-5 border border-[var(--color-border)]">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Average Occupancy
            </span>
            <div className="mt-2 text-2xl font-bold text-[var(--color-accent)]">
              {state.stage === 'loading'
                ? '—'
                : `${kpiSummary.averageOccupancyRate.toFixed(1)}%`}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Overall capacity utilization
            </p>
          </div>

          <div className="card p-5 border border-[var(--color-border)]">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Period Room Revenue
            </span>
            <div className="mt-2 text-2xl font-bold text-[var(--color-text)]">
              {state.stage === 'loading'
                ? '—'
                : formatLKR(kpiSummary.totalRevenue)}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Authoritative currency totals
            </p>
          </div>
        </section>

        {/* ── Filter Form ── */}
        <section aria-labelledby="filter-section-title" className="card p-5 border border-[var(--color-border)] bg-[var(--color-surface)]">
          <h2 id="filter-section-title" className="text-sm font-semibold text-[var(--color-text)] mb-3">
            Filter Occupancy Records
          </h2>
          <form
            id="occupancy-filter-form"
            onSubmit={handleFilterSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
          >
            {/* Branch selector */}
            <div>
              <label htmlFor="filter-branch" className="form-label text-xs">
                Branch Location
              </label>
              <select
                id="filter-branch"
                className="form-input text-sm w-full"
                value={filters.branchId}
                onChange={(e) => setFilters((prev) => ({ ...prev, branchId: e.target.value }))}
              >
                <option value="">All Branches</option>
                {BRANCH_OPTIONS.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Room status */}
            <div>
              <label htmlFor="filter-status" className="form-label text-xs">
                Room Status
              </label>
              <select
                id="filter-status"
                className="form-input text-sm w-full"
                value={filters.roomStatus}
                onChange={(e) => setFilters((prev) => ({ ...prev, roomStatus: e.target.value }))}
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* From date */}
            <div>
              <label htmlFor="filter-from-date" className="form-label text-xs">
                From Date
              </label>
              <input
                id="filter-from-date"
                type="date"
                className="form-input text-sm w-full"
                value={filters.fromDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
              />
            </div>

            {/* To date */}
            <div>
              <label htmlFor="filter-to-date" className="form-label text-xs">
                To Date
              </label>
              <input
                id="filter-to-date"
                type="date"
                className="form-input text-sm w-full"
                value={filters.toDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-muted)]">
                {hasActiveFilters ? 'Filters applied' : 'Showing all records'}
              </span>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    id="clear-filters-btn"
                    type="button"
                    onClick={handleResetFilters}
                    className="btn btn-ghost btn-sm text-xs"
                  >
                    Reset Filters
                  </button>
                )}
                <button
                  id="apply-filters-btn"
                  type="submit"
                  className="btn btn-primary btn-sm text-xs"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </form>

          {validationError && (
            <p className="form-error text-xs mt-2" role="alert">
              {validationError}
            </p>
          )}
        </section>

        {/* ── Table & State Views ── */}
        <section aria-labelledby="occupancy-data-heading">
          <h2 id="occupancy-data-heading" className="sr-only">
            Occupancy Report Data
          </h2>

          {/* Loading State */}
          {state.stage === 'loading' && (
            <div
              id="report-loading-indicator"
              className="card p-12 flex flex-col items-center justify-center gap-3 text-sm text-[var(--color-text-muted)]"
              role="status"
              aria-label="Loading occupancy report"
            >
              <span
                className="inline-block w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              <span>Loading occupancy report records…</span>
            </div>
          )}

          {/* Error State */}
          {state.stage === 'error' && (
            <div className="alert alert-error text-sm flex items-center justify-between" role="alert">
              <div>
                <strong>Error: </strong> {state.message}
              </div>
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="btn btn-outline btn-sm bg-white"
                id="error-retry-btn"
              >
                Retry
              </button>
            </div>
          )}

          {/* Success State */}
          {state.stage === 'success' && (
            <div className="card overflow-hidden border border-[var(--color-border)]">
              {sortedData.length === 0 ? (
                <div
                  id="report-empty-state"
                  className="p-12 text-center space-y-3"
                >
                  <div className="text-4xl text-[var(--color-text-subtle)]">🏨</div>
                  <h3 className="text-base font-semibold text-[var(--color-text)]">
                    No Occupancy Records Found
                  </h3>
                  <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
                    {hasActiveFilters
                      ? 'No room occupancy records match the selected filter criteria. Try adjusting or resetting your filters.'
                      : 'There is currently no room occupancy data recorded in the system.'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="btn btn-outline btn-sm mt-2"
                      id="empty-reset-filters-btn"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table
                    id="occupancy-report-table"
                    className="w-full text-sm text-left border-collapse"
                    aria-label="Room occupancy report data"
                  >
                    <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)] uppercase tracking-wider select-none">
                      <tr>
                        <th
                          scope="col"
                          className="px-4 py-3.5 cursor-pointer hover:text-[var(--color-text)] transition-colors"
                          onClick={() => handleSort('branch_name')}
                          aria-sort={sortKey === 'branch_name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center gap-1">
                            <span>Branch</span>
                            {sortKey === 'branch_name' && (
                              <span>{sortDir === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3.5 cursor-pointer hover:text-[var(--color-text)] transition-colors"
                          onClick={() => handleSort('room_number')}
                          aria-sort={sortKey === 'room_number' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center gap-1">
                            <span>Room</span>
                            {sortKey === 'room_number' && (
                              <span>{sortDir === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3.5 cursor-pointer hover:text-[var(--color-text)] transition-colors"
                          onClick={() => handleSort('room_type_name')}
                          aria-sort={sortKey === 'room_type_name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center gap-1">
                            <span>Type</span>
                            {sortKey === 'room_type_name' && (
                              <span>{sortDir === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3.5 cursor-pointer hover:text-[var(--color-text)] transition-colors"
                          onClick={() => handleSort('room_status')}
                          aria-sort={sortKey === 'room_status' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center gap-1">
                            <span>Status</span>
                            {sortKey === 'room_status' && (
                              <span>{sortDir === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3.5 cursor-pointer hover:text-[var(--color-text)] transition-colors"
                          onClick={() => handleSort('period_date')}
                          aria-sort={sortKey === 'period_date' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center gap-1">
                            <span>Period Date</span>
                            {sortKey === 'period_date' && (
                              <span>{sortDir === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3.5 text-right cursor-pointer hover:text-[var(--color-text)] transition-colors"
                          onClick={() => handleSort('total_nights_occupied')}
                          aria-sort={sortKey === 'total_nights_occupied' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Nights Occupied</span>
                            {sortKey === 'total_nights_occupied' && (
                              <span>{sortDir === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3.5 text-right cursor-pointer hover:text-[var(--color-text)] transition-colors"
                          onClick={() => handleSort('occupancy_rate')}
                          aria-sort={sortKey === 'occupancy_rate' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Occupancy Rate</span>
                            {sortKey === 'occupancy_rate' && (
                              <span>{sortDir === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3.5 text-right cursor-pointer hover:text-[var(--color-text)] transition-colors"
                          onClick={() => handleSort('total_revenue')}
                          aria-sort={sortKey === 'total_revenue' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Total Revenue</span>
                            {sortKey === 'total_revenue' && (
                              <span>{sortDir === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {sortedData.map((row) => {
                        const rateNum = parseFloat(row.occupancy_rate) || 0;
                        return (
                          <tr
                            key={`${row.branch_id}-${row.room_id}-${row.period_date}`}
                            className="hover:bg-[var(--color-bg-subtle)] transition-colors"
                          >
                            <td className="px-4 py-3.5 font-medium text-[var(--color-text)]">
                              📍 {row.branch_name}
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-[var(--color-primary)]">
                              {row.room_number}
                            </td>
                            <td className="px-4 py-3.5 text-[var(--color-text-muted)]">
                              {row.room_type_name}
                            </td>
                            <td className="px-4 py-3.5">
                              <StatusBadge status={row.room_status} />
                            </td>
                            <td className="px-4 py-3.5 tabular-nums text-[var(--color-text-muted)]">
                              {row.period_date}
                            </td>
                            <td className="px-4 py-3.5 text-right tabular-nums font-medium text-[var(--color-text)]">
                              {row.total_nights_occupied}
                            </td>
                            <td className="px-4 py-3.5 text-right tabular-nums">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden hidden sm:block">
                                  <div
                                    className="h-full bg-[var(--color-accent)]"
                                    style={{ width: `${Math.min(100, Math.max(0, rateNum))}%` }}
                                    aria-hidden="true"
                                  />
                                </div>
                                <span className="font-medium text-[var(--color-text)]">
                                  {rateNum.toFixed(2)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-[var(--color-text)]">
                              {formatLKR(parseMoney(row.total_revenue))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-[var(--color-bg-subtle)] border-t border-[var(--color-border)] font-semibold text-xs text-[var(--color-text)]">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right uppercase tracking-wider text-[var(--color-text-muted)]">
                          Total Summary ({sortedData.length} records):
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--color-primary)]">
                          {kpiSummary.totalNights} nights
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--color-accent)]">
                          {kpiSummary.averageOccupancyRate.toFixed(2)}% avg
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text)]">
                          {formatLKR(kpiSummary.totalRevenue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer
        id="occupancy-report-footer"
        className="border-t border-[var(--color-border)] py-4 text-center text-xs text-[var(--color-text-subtle)]"
      >
        SkyNest Hotels Management System · Operational Reports · Generated {new Date().toLocaleDateString('en-LK')}
      </footer>
    </div>
  );
}
