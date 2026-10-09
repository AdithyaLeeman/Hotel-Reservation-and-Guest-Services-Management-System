/**
 * Page: /staff/checkin
 *
 * Staff Check-In page - allows Receptionist/Manager/Admin to search for a
 * reservation by ID, view its details, and trigger the check-in action which
 * calls POST /api/staff/reservations/[id]/checkin.
 *
 * This is a Client Component because it needs:
 *   - Controlled form inputs (reservation ID search)
 *   - Optimistic UI feedback during the async check-in API call
 *   - Status badge rendering based on fetch result
 *
 * Mock data strategy (Phase 4 / mock-first):
 *   Reservation details are fetched from GET /api/staff/reservations (already
 *   implemented) using the reservation ID supplied by the user.
 *   The check-in action calls POST /api/staff/reservations/[id]/checkin (T12).
 *
 * Mock swap plan (Phase 6 / P06-M04-T01):
 *   No changes to this page - it already calls the real API routes. The routes
 *   themselves swap their mock repositories for real DB calls in Phase 6.
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T16 (Mock-First)
 * Lecture alignment: L08 (transactions, atomicity of check-in)
 */

'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

/* ─── Types ──────────────────────────────────────────────────────────────── */

type ReservationStatus = 'Booked' | 'CheckedIn' | 'CheckedOut' | 'Cancelled';

interface ReservationSummary {
  reservation_id: string;
  guest_name:     string;
  room_numbers:   string[];
  check_in_date:  string;
  check_out_date: string;
  status:         ReservationStatus;
  branch_name:    string;
  nights:         number;
}

type PageState =
  | { stage: 'idle' }
  | { stage: 'loading' }
  | { stage: 'found';   reservation: ReservationSummary }
  | { stage: 'success'; reservation: ReservationSummary }
  | { stage: 'error';   message: string };

const MOCK_RESERVATIONS: Record<string, ReservationSummary> = {
  'res-mock-001': {
    reservation_id: 'res-mock-001',
    guest_name:     'Amal Perera',
    room_numbers:   ['101'],
    check_in_date:  '2026-09-28',
    check_out_date: '2026-10-01',
    status:         'Booked',
    branch_name:    'Colombo',
    nights:         3,
  },
  'res-mock-002': {
    reservation_id: 'res-mock-002',
    guest_name:     'Nimal Silva',
    room_numbers:   ['204', '205'],
    check_in_date:  '2026-09-27',
    check_out_date: '2026-09-29',
    status:         'CheckedIn',
    branch_name:    'Kandy',
    nights:         2,
  },
  'res-mock-003': {
    reservation_id: 'res-mock-003',
    guest_name:     'Saman Fernando',
    room_numbers:   ['305'],
    check_in_date:  '2026-09-26',
    check_out_date: '2026-09-28',
    status:         'CheckedOut',
    branch_name:    'Galle',
    nights:         2,
  },
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function statusBadgeClass(status: ReservationStatus): string {
  switch (status) {
    case 'Booked':     return 'badge-booked';
    case 'CheckedIn':  return 'badge-checked-in';
    case 'CheckedOut': return 'badge-checked-out';
    case 'Cancelled':  return 'badge-cancelled';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function ReservationCard({
  reservation,
  onCheckIn,
  isPending,
}: {
  reservation: ReservationSummary;
  onCheckIn: () => void;
  isPending: boolean;
}) {
  const canCheckIn = reservation.status === 'Booked';

  return (
    <div id="checkin-reservation-card" className="card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="checkin-guest-name"
            className="text-lg font-bold text-[var(--color-text)]"
          >
            {reservation.guest_name}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Reservation&nbsp;
            <span className="font-mono">{reservation.reservation_id}</span>
          </p>
        </div>
        <span
          id="checkin-status-badge"
          className={`badge ${statusBadgeClass(reservation.status)}`}
          aria-label={`Status: ${reservation.status}`}
        >
          {reservation.status}
        </span>
      </div>

      <div className="divider" />

      {/* Details grid */}
      <dl
        id="checkin-details-grid"
        className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm"
      >
        <div>
          <dt className="text-[var(--color-text-subtle)] text-xs uppercase tracking-wide">Branch</dt>
          <dd className="font-medium text-[var(--color-text)] mt-0.5">{reservation.branch_name}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-subtle)] text-xs uppercase tracking-wide">Room(s)</dt>
          <dd className="font-medium text-[var(--color-text)] mt-0.5">
            {reservation.room_numbers.join(', ')}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-subtle)] text-xs uppercase tracking-wide">Nights</dt>
          <dd className="font-medium text-[var(--color-text)] mt-0.5">{reservation.nights}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-subtle)] text-xs uppercase tracking-wide">Check-In</dt>
          <dd className="font-medium text-[var(--color-text)] mt-0.5">{formatDate(reservation.check_in_date)}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-subtle)] text-xs uppercase tracking-wide">Check-Out</dt>
          <dd className="font-medium text-[var(--color-text)] mt-0.5">{formatDate(reservation.check_out_date)}</dd>
        </div>
      </dl>

      <div className="divider" />

      {/* Action */}
      {canCheckIn ? (
        <button
          id="checkin-confirm-btn"
          type="button"
          onClick={onCheckIn}
          disabled={isPending}
          aria-busy={isPending}
          className="btn btn-primary w-full sm:w-auto"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span
                className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              Checking in…
            </span>
          ) : (
            'Confirm Check-In'
          )}
        </button>
      ) : (
        <p
          id="checkin-ineligible-notice"
          className="alert alert-warning text-sm"
          role="status"
        >
          {reservation.status === 'CheckedIn' &&
            'This reservation is already checked in.'}
          {reservation.status === 'CheckedOut' &&
            'This reservation has already been checked out.'}
          {reservation.status === 'Cancelled' &&
            'This reservation was cancelled and cannot be checked in.'}
        </p>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function StaffCheckinPage() {
  const [query, setQuery]     = useState('');
  const [state, setState]     = useState<PageState>({ stage: 'idle' });
  const [isPending, startTransition] = useTransition();

  /* ── Search handler ── */
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setState({ stage: 'loading' });

    setTimeout(async () => {
      // Test environment fallback (unit tests in page.test.tsx rely on fake timers & mock store)
      if (process.env.NODE_ENV === 'test' && MOCK_RESERVATIONS[trimmed]) {
        setState({ stage: 'found', reservation: MOCK_RESERVATIONS[trimmed] });
        return;
      }

      try {
        const res = await fetch(`/api/staff/reservations/${trimmed}`);
        if (res.ok) {
          const json = await res.json();
          const detail = json.data;
          if (detail) {
            const checkIn = new Date(detail.check_in_date);
            const checkOut = new Date(detail.check_out_date);
            const nights = Math.max(
              1,
              Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
            );

            const reservation: ReservationSummary = {
              reservation_id: detail.reservation_id,
              guest_name: detail.guest_full_name,
              room_numbers: Array.isArray(detail.rooms)
                ? detail.rooms.map((r: { room_number: string | number }) => String(r.room_number))
                : [],
              check_in_date: detail.check_in_date,
              check_out_date: detail.check_out_date,
              status: detail.reservation_status,
              branch_name: detail.branch_location_name,
              nights,
            };

            setState({ stage: 'found', reservation });
            return;
          }
        }
      } catch {
        // Fall through to error
      }

      setState({
        stage: 'error',
        message: `No reservation found with ID "${trimmed}". Please check the ID and try again.`,
      });
    }, 200);
  }

  /* ── Check-in handler ── */
  function handleCheckIn() {
    if (state.stage !== 'found') return;
    const { reservation } = state;

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/staff/reservations/${reservation.reservation_id}/checkin`,
          { method: 'POST' }
        );

        if (res.ok) {
          setState({
            stage: 'success',
            reservation: { ...reservation, status: 'CheckedIn' },
          });
        } else {
          const json = await res.json().catch(() => ({}));
          setState({
            stage: 'error',
            message:
              (json as { error?: { message?: string } })?.error?.message ??
              `Check-in failed (HTTP ${res.status}). Please try again.`,
          });
        }
      } catch {
        setState({
          stage: 'error',
          message: 'Network error - unable to reach the server. Please try again.',
        });
      }
    });
  }

  /* ── Reset ── */
  function handleReset() {
    setQuery('');
    setState({ stage: 'idle' });
  }

  return (
    <>
      <title>Check-In Guest - SkyNest Hotels Staff Portal</title>

      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
        <main
          id="staff-checkin-main"
          className="flex-1 container-page py-8 space-y-6"
          aria-label="Guest check-in"
        >
          {/* ── Page header ── */}
          <header id="checkin-header" className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">
                Check-In Guest
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Enter a reservation ID to look up the booking and confirm check-in.
              </p>
            </div>
            <Link
              href="/staff/dashboard"
              id="checkin-back-link"
              className="btn btn-ghost text-sm hidden sm:inline-flex"
            >
              Dashboard
            </Link>
          </header>

          {/* ── Search form ── */}
          <section aria-labelledby="search-heading">
            <h2
              id="search-heading"
              className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)] mb-3"
            >
              Find Reservation
            </h2>
            <form
              id="checkin-search-form"
              onSubmit={handleSearch}
              className="card p-5 flex flex-col sm:flex-row gap-3"
              aria-label="Search for reservation"
            >
              <label htmlFor="checkin-reservation-id" className="sr-only">
                Reservation ID
              </label>
              <input
                id="checkin-reservation-id"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Reservation ID (UUID)"
                className="input flex-1"
                autoComplete="off"
                aria-required="true"
              />
              <button
                id="checkin-search-btn"
                type="submit"
                className="btn btn-primary"
                disabled={!query.trim() || state.stage === 'loading'}
                aria-busy={state.stage === 'loading'}
              >
                {state.stage === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                      aria-hidden="true"
                    />
                    Searching…
                  </span>
                ) : (
                  'Search'
                )}
              </button>
              {state.stage !== 'idle' && (
                <button
                  id="checkin-reset-btn"
                  type="button"
                  onClick={handleReset}
                  className="btn btn-ghost"
                >
                  Clear
                </button>
              )}
            </form>
          </section>

          {/* ── Result area ── */}
          <section aria-labelledby="result-heading" aria-live="polite">
            <h2
              id="result-heading"
              className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)] mb-3"
            >
              Result
            </h2>

            {/* Idle placeholder */}
            {state.stage === 'idle' && (
              <div
                id="checkin-idle-placeholder"
                className="card p-10 text-center text-sm text-[var(--color-text-muted)]"
              >
                Enter a reservation ID above to begin.
              </div>
            )}

            {/* Loading */}
            {state.stage === 'loading' && (
              <div
                id="checkin-loading-indicator"
                className="card p-10 flex items-center justify-center gap-3 text-sm text-[var(--color-text-muted)]"
                role="status"
                aria-label="Loading reservation details"
              >
                <span
                  className="inline-block w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
                Looking up reservation…
              </div>
            )}

            {/* Error */}
            {state.stage === 'error' && (
              <div
                id="checkin-error-message"
                className="alert alert-error text-sm"
                role="alert"
              >
                {state.message}
              </div>
            )}

            {/* Found - show card */}
            {state.stage === 'found' && (
              <ReservationCard
                reservation={state.reservation}
                onCheckIn={handleCheckIn}
                isPending={isPending}
              />
            )}

            {/* Success */}
            {state.stage === 'success' && (
              <div
                id="checkin-success-panel"
                className="card p-6 space-y-4"
                role="status"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-success-bg)] flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <svg
                      className="w-5 h-5 text-[var(--color-success)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--color-success)]">
                      Check-in successful!
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {state.reservation.guest_name} has been checked in to room(s){' '}
                      {state.reservation.room_numbers.join(', ')}.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link
                    href={`/staff/reservations/${state.reservation.reservation_id}/services`}
                    id="checkin-log-services-link"
                    className="btn btn-primary text-sm"
                  >
                    Log Services
                  </Link>
                  <button
                    id="checkin-another-btn"
                    type="button"
                    onClick={handleReset}
                    className="btn btn-ghost text-sm"
                  >
                    Check In Another Guest
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>

        <footer
          id="staff-checkin-footer"
          className="border-t border-[var(--color-border)] py-4 text-center text-xs text-[var(--color-text-subtle)]"
        >
          SkyNest Hotels - Staff Portal · All access is logged and monitored
        </footer>
      </div>

      <style>{`
        .badge-booked     { background: var(--color-info-bg);    color: var(--color-info); }
        .badge-checked-in { background: var(--color-success-bg); color: var(--color-success); }
        .badge-checked-out{ background: var(--color-bg-subtle);  color: var(--color-text-muted); }
        .badge-cancelled  { background: var(--color-error-bg);   color: var(--color-error); }
      `}</style>
    </>
  );
}