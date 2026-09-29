/**
 * Page: /staff/reservations
 *
 * Staff Reservations List — allows Receptionist / Manager / Admin to view
 * all active (Booked + CheckedIn) reservations, filter by status / search by
 * guest name or reservation ID, and navigate to per-reservation actions.
 *
 * This is a Client Component because it needs:
 *   - Controlled filter + search inputs
 *   - useState / useEffect for fetch-on-mount + client-side filtering
 *   - Dynamic row interactions (View Details, Check In shortcuts)
 *
 * API consumed:
 *   GET /api/staff/reservations        → { data: ActiveReservationRow[] }
 *
 * Data strategy (mock-first, Phase 3):
 *   Calls the real API route which returns mock data until SP3.1 migrations
 *   are executed on the live DB and the route's USE_MOCK flag is set to false.
 *
 * Mock swap plan (Phase 6 / P06-M03-T01):
 *   No changes to this page — the API route swaps its mock in Phase 6.
 *
 * Layout note:
 *   <StaffNav /> is rendered by app/staff/layout.tsx — do NOT add it here.
 *
 * Owned by: Member 3 (M3) | Task: P03-M03-T21 (Mock-First)
 * Lecture alignment: L06 (REST), L07 (RBAC, branch scoping)
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { ActiveReservationRow } from '@/repositories/reservation.repository';
import type { ReservationStatus } from '@/types/enums';

/* ─── Constants ──────────────────────────────────────────────────────────── */

const BRANCHES = [
  { id: 1, name: 'Colombo' },
  { id: 2, name: 'Kandy' },
  { id: 3, name: 'Galle' },
] as const;

const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '',           label: 'All Statuses' },
  { value: 'Booked',    label: 'Booked' },
  { value: 'CheckedIn', label: 'Checked In' },
];

/* ─── Types ──────────────────────────────────────────────────────────────── */

type FetchState =
  | { stage: 'loading' }
  | { stage: 'error'; message: string }
  | { stage: 'success'; rows: ActiveReservationRow[] };

interface FilterState {
  branchId: string; // '' = all; numeric string = specific branch
  status:   string; // '' | 'Booked' | 'CheckedIn'
  search:   string; // free-text: guest name or reservation_id prefix
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/** Format an ISO date string as "01 Oct 2026" (en-GB, no time). */
function formatDate(iso: string): string {
  if (!iso) return '\u2014';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

/** Build the status badge CSS class string from the global badge utilities. */
function statusBadgeClass(status: ReservationStatus): string {
  switch (status) {
    case 'Booked':     return 'badge badge-booked';
    case 'CheckedIn':  return 'badge badge-checked-in';
    case 'CheckedOut': return 'badge badge-checked-out';
    case 'Cancelled':  return 'badge badge-cancelled';
    default:           return 'badge';
  }
}

/** Human-readable label for a ReservationStatus value. */
function statusLabel(status: ReservationStatus): string {
  switch (status) {
    case 'Booked':     return 'Booked';
    case 'CheckedIn':  return 'Checked In';
    case 'CheckedOut': return 'Checked Out';
    case 'Cancelled':  return 'Cancelled';
    default:           return status;
  }
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

/** Full-width spinning loading card. */
function LoadingState() {
  return (
    <div
      id="reservations-loading"
      role="status"
      aria-label="Loading reservations"
      className="card p-12 flex flex-col items-center justify-center gap-4"
    >
      <span
        className="inline-block w-8 h-8 border-[3px] border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"
        aria-hidden="true"
      />
      <p className="text-sm text-[var(--color-text-muted)]">Loading reservations\u2026</p>
    </div>
  );
}

/** Error card with retry button. */
function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      id="reservations-error"
      role="alert"
      className="card p-8 flex flex-col items-center justify-center gap-4 text-center"
    >
      <span
        aria-hidden="true"
        className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--color-error-bg)]"
      >
        <svg
          className="w-6 h-6 text-[var(--color-error)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>
      <div>
        <p className="font-semibold text-[var(--color-text)]">Failed to load reservations</p>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-sm">{message}</p>
      </div>
      <button
        id="btn-retry-fetch"
        type="button"
        onClick={onRetry}
        className="btn btn-outline btn-sm"
      >
        Try Again
      </button>
    </div>
  );
}

/** Empty state — no rows after filtering. */
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div
      id="reservations-empty"
      className="card p-12 flex flex-col items-center justify-center gap-4 text-center"
    >
      <span
        aria-hidden="true"
        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl bg-[var(--color-bg-subtle)] text-[var(--color-text-subtle)]"
      >
        &#128675;
      </span>
      <div>
        <p className="font-semibold text-[var(--color-text)]">
          {hasFilters ? 'No matching reservations' : 'No active reservations'}
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xs">
          {hasFilters
            ? 'Try adjusting your filters or clearing the search.'
            : 'Active reservations will appear here once guests book.'}
        </p>
      </div>
    </div>
  );
}

/** Single table row for a reservation. */
function ReservationRow({ row }: { row: ActiveReservationRow }) {
  const isBooked = row.reservation_status === 'Booked';
  const shortId  = row.reservation_id.slice(0, 8).toUpperCase();

  return (
    <tr
      id={`row-${row.reservation_id}`}
      className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] transition-colors duration-150"
    >
      {/* Reservation ID */}
      <td className="px-4 py-3 text-xs font-mono text-[var(--color-text-muted)] whitespace-nowrap">
        <span title={row.reservation_id}>{shortId}\u2026</span>
      </td>

      {/* Guest */}
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="font-medium text-sm text-[var(--color-text)]">{row.guest_full_name}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{row.guest_email}</p>
      </td>

      {/* Branch */}
      <td className="px-4 py-3 text-sm text-[var(--color-text)] whitespace-nowrap">
        {row.branch_location_name}
      </td>

      {/* Room(s) */}
      <td className="px-4 py-3 text-sm text-[var(--color-text)] whitespace-nowrap tabular-nums">
        {row.room_count} {row.room_count === 1 ? 'room' : 'rooms'}
      </td>

      {/* Check-In */}
      <td className="px-4 py-3 text-sm text-[var(--color-text)] whitespace-nowrap tabular-nums">
        {formatDate(row.check_in_date)}
      </td>

      {/* Check-Out */}
      <td className="px-4 py-3 text-sm text-[var(--color-text)] whitespace-nowrap tabular-nums">
        {formatDate(row.check_out_date)}
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={statusBadgeClass(row.reservation_status)}>
          {statusLabel(row.reservation_status)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Link
            id={`btn-view-${row.reservation_id}`}
            href={`/staff/reservations/${row.reservation_id}`}
            className="btn btn-outline btn-sm text-xs"
            aria-label={`View details for reservation ${row.reservation_id}`}
          >
            View Details
          </Link>
          {isBooked && (
            <Link
              id={`btn-checkin-${row.reservation_id}`}
              href="/staff/checkin"
              className="btn btn-primary btn-sm text-xs"
              aria-label={`Check in reservation ${row.reservation_id}`}
            >
              Check In
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

/** The full reservations table. */
function ReservationsTable({ rows }: { rows: ActiveReservationRow[] }) {
  const COLUMNS = [
    'Reservation ID',
    'Guest',
    'Branch',
    'Room(s)',
    'Check-In',
    'Check-Out',
    'Status',
    'Actions',
  ];

  return (
    <div
      id="reservations-table"
      className="card p-0 overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-left" aria-label="Active reservations">
          <thead>
            <tr className="bg-[var(--color-bg-subtle)]">
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ReservationRow key={row.reservation_id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function StaffReservationsPage() {
  const [fetchState, setFetchState] = useState<FetchState>({ stage: 'loading' });
  const [filters,    setFilters]    = useState<FilterState>({
    branchId: '',
    status:   '',
    search:   '',
  });
  // Incrementing retryKey re-triggers the fetch effect on demand
  const [retryKey, setRetryKey] = useState(0);

  /* ── Fetch ── */
  const fetchReservations = useCallback(async () => {
    setFetchState({ stage: 'loading' });

    try {
      // No branch_id param: the API auto-scopes Receptionists server-side.
      // Manager / Admin see all branches because the API reads the session role.
      const res  = await fetch('/api/staff/reservations');
      const json = await res.json() as { data?: ActiveReservationRow[]; error?: { message: string } };

      if (!res.ok) {
        setFetchState({
          stage:   'error',
          message: json?.error?.message ?? `Request failed (HTTP ${res.status}).`,
        });
        return;
      }

      setFetchState({ stage: 'success', rows: json.data ?? [] });
    } catch {
      setFetchState({
        stage:   'error',
        message: 'Network error \u2014 unable to reach the server. Please try again.',
      });
    }
  }, []);

  useEffect(() => {
    void fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchReservations, retryKey]);

  /* ── Retry ── */
  function handleRetry() {
    setRetryKey((k) => k + 1);
  }

  /* ── Filter helpers ── */
  function handleFilterChange(field: keyof FilterState, value: string) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  function clearFilters() {
    setFilters({ branchId: '', status: '', search: '' });
  }

  const hasActiveFilters =
    filters.branchId !== '' ||
    filters.status   !== '' ||
    filters.search.trim() !== '';

  /* ── Client-side filter / search ── */
  const filteredRows = useMemo<ActiveReservationRow[]>(() => {
    if (fetchState.stage !== 'success') return [];
    let rows = fetchState.rows;

    if (filters.branchId) {
      const id = parseInt(filters.branchId, 10);
      rows = rows.filter((r) => r.branch_id === id);
    }

    if (filters.status) {
      rows = rows.filter((r) => r.reservation_status === filters.status);
    }

    const q = filters.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.guest_full_name.toLowerCase().includes(q) ||
          r.reservation_id.toLowerCase().startsWith(q)
      );
    }

    return rows;
  }, [fetchState, filters]);

  /* ── Stats ── */
  const allRows        = fetchState.stage === 'success' ? fetchState.rows : [];
  const countBooked    = allRows.filter((r) => r.reservation_status === 'Booked').length;
  const countCheckedIn = allRows.filter((r) => r.reservation_status === 'CheckedIn').length;

  /* ── Render ── */
  return (
    <>
      <title>Reservations \u2014 SkyNest Hotels Staff Portal</title>

      <div
        className="min-h-screen flex flex-col bg-[var(--color-bg)]"
      >
        <main
          id="staff-reservations-main"
          className="flex-1 container-page py-8 space-y-6"
          aria-label="Staff reservations list"
        >

          {/* ── Page header ────────────────────────────────────────────── */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">
                Reservations
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Active bookings across all branches. Receptionists see their branch only.
              </p>
            </div>
            <Link
              href="/staff/dashboard"
              id="reservations-back-link"
              className="btn btn-ghost text-sm hidden sm:inline-flex"
            >
              \u2190 Dashboard
            </Link>
          </header>

          {/* ── Dev mock notice ──────────────────────────────────────────── */}
          {process.env.NODE_ENV !== 'production' && (
            <div
              id="reservations-mock-notice"
              role="status"
              className="rounded-lg border border-[var(--color-warning)] bg-[var(--color-warning-bg)] px-4 py-2 text-xs text-[var(--color-warning)]"
            >
              <strong>Development mode:</strong> Data comes from the mock repository.
              Real DB lookup wires in Phase 6 (P06-M03-T01).
            </div>
          )}

          {/* ── Stats strip ──────────────────────────────────────────────── */}
          {fetchState.stage === 'success' && (
            <div
              id="reservations-stats"
              className="grid grid-cols-3 gap-4"
              aria-label="Reservation statistics"
            >
              {(
                [
                  { label: 'Total Active', value: allRows.length,    id: 'stat-total'      },
                  { label: 'Booked',       value: countBooked,       id: 'stat-booked'     },
                  { label: 'Checked In',   value: countCheckedIn,    id: 'stat-checked-in' },
                ] as const
              ).map(({ label, value, id }) => (
                <div key={id} id={id} className="card p-4 text-center">
                  <p className="text-2xl font-bold tabular-nums text-[var(--color-primary)]">
                    {value}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Filter bar ───────────────────────────────────────────────── */}
          <section aria-labelledby="filters-heading">
            <h2
              id="filters-heading"
              className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)] mb-3"
            >
              Filter &amp; Search
            </h2>
            <div className="card p-4">
              <div className="flex flex-wrap items-end gap-3">

                {/* Branch selector */}
                <div className="flex flex-col gap-1 min-w-[160px]">
                  <label
                    htmlFor="filter-branch"
                    className="text-xs font-medium text-[var(--color-text-muted)]"
                  >
                    Branch
                  </label>
                  <select
                    id="filter-branch"
                    value={filters.branchId}
                    onChange={(e) => handleFilterChange('branchId', e.target.value)}
                    className="form-input text-sm py-1.5"
                  >
                    <option value="">All Branches</option>
                    {BRANCHES.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status filter */}
                <div className="flex flex-col gap-1 min-w-[150px]">
                  <label
                    htmlFor="filter-status"
                    className="text-xs font-medium text-[var(--color-text-muted)]"
                  >
                    Status
                  </label>
                  <select
                    id="filter-status"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="form-input text-sm py-1.5"
                  >
                    {STATUS_FILTER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Free-text search */}
                <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                  <label
                    htmlFor="filter-search"
                    className="text-xs font-medium text-[var(--color-text-muted)]"
                  >
                    Guest Name or Reservation ID
                  </label>
                  <input
                    id="filter-search"
                    type="search"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Search\u2026"
                    className="form-input text-sm py-1.5"
                    autoComplete="off"
                  />
                </div>

                {/* Clear filters */}
                {hasActiveFilters && (
                  <button
                    id="btn-clear-filters"
                    type="button"
                    onClick={clearFilters}
                    className="btn btn-ghost btn-sm self-end"
                  >
                    Clear filters
                  </button>
                )}

                {/* Result count */}
                {fetchState.stage === 'success' && (
                  <span
                    id="reservations-result-count"
                    className="self-end ml-auto text-xs text-[var(--color-text-subtle)]"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {filteredRows.length}{' '}
                    {filteredRows.length === 1 ? 'reservation' : 'reservations'} found
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* ── Result area ──────────────────────────────────────────────── */}
          <section
            aria-labelledby="results-heading"
            aria-live="polite"
            aria-busy={fetchState.stage === 'loading'}
          >
            <h2
              id="results-heading"
              className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)] mb-3"
            >
              Results
            </h2>

            {fetchState.stage === 'loading' && <LoadingState />}

            {fetchState.stage === 'error' && (
              <ErrorState message={fetchState.message} onRetry={handleRetry} />
            )}

            {fetchState.stage === 'success' && filteredRows.length === 0 && (
              <EmptyState hasFilters={hasActiveFilters} />
            )}

            {fetchState.stage === 'success' && filteredRows.length > 0 && (
              <ReservationsTable rows={filteredRows} />
            )}
          </section>

        </main>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer
          id="staff-reservations-footer"
          className="border-t border-[var(--color-border)] py-4 text-center text-xs text-[var(--color-text-subtle)]"
        >
          SkyNest Hotels \u2014 Staff Portal \u00b7 All access is logged and monitored
        </footer>
      </div>
    </>
  );
}
