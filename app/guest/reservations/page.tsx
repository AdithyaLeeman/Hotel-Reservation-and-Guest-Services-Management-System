'use client';

/**
 * My Reservations List Page — /guest/reservations
 *
 * Owned by: Member 3 (M3) | Task: P03-M03-T16
 * Type: MOCK-FIRST — calls GET /api/guest/reservations (currently mock data).
 *
 * Responsibilities:
 *   - Fetch all reservations for the authenticated guest on mount
 *   - Render a card per reservation showing: reference, branch, dates,
 *     duration, status badge, and booking source
 *   - Each card links forward to /guest/reservations/[id] (T17)
 *   - Show loading skeleton, empty state, and error state
 *   - "Book a Room" CTA links back to /search
 *
 * Security: guest_id is sourced server-side from the session inside
 * GET /api/guest/reservations — never passed from this component.
 *
 * TODO (P06-M03-T01): Replace dev-session stub in the API with real iron-session.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

import type { Reservation } from '@/types/domain';
import type { ReservationStatus } from '@/types/enums';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRANCHES: Record<number, string> = {
  1: 'Colombo',
  2: 'Kandy',
  3: 'Galle',
};

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_BADGE_CLASS: Record<ReservationStatus, string> = {
  Booked:     'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  CheckedIn:  'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  CheckedOut: 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
  Cancelled:  'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  Booked:     'Booked',
  CheckedIn:  'Checked In',
  CheckedOut: 'Checked Out',
  Cancelled:  'Cancelled',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format ISO date as "01 Oct 2026" — display only. */
function formatDate(iso: string): string {
  if (!iso) return '\u2014';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

/** Count nights between two ISO date strings. Returns 0 on invalid input. */
function countNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/** Format booking source for display. */
function formatSource(source: string): string {
  if (source === 'Online')    return 'Online';
  if (source === 'Reception') return 'Reception';
  if (source === 'Phone')     return 'Phone';
  return source;
}

/** Truncate a UUID for compact display: first 8 chars. */
function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

interface ApiSuccess {
  data: Reservation[];
  meta: { requestId: string };
}

interface ApiError {
  error: { code: string; message: string };
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function ReservationSkeleton() {
  return (
    <div
      className="animate-pulse bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
      aria-hidden="true"
    >
      <div className="h-2 bg-gradient-to-r from-neutral-200 to-neutral-100 dark:from-neutral-700 dark:to-neutral-600" />
      <div className="p-5 flex flex-col gap-4">
        <div className="flex justify-between">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/5" />
          <div className="h-5 bg-neutral-100 dark:bg-neutral-800 rounded-full w-20" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-3 bg-neutral-100 dark:bg-neutral-700 rounded w-4/5" />
          <div className="h-3 bg-neutral-100 dark:bg-neutral-700 rounded w-4/5" />
        </div>
        <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reservation card
// ---------------------------------------------------------------------------

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const {
    reservation_id,
    branch_id,
    check_in_date,
    check_out_date,
    reservation_status,
    booking_source,
    discount_percentage,
  } = reservation;

  const nights     = countNights(check_in_date, check_out_date);
  const branchName = BRANCHES[branch_id] ?? `Branch ${branch_id}`;
  const badgeClass = STATUS_BADGE_CLASS[reservation_status] ?? STATUS_BADGE_CLASS.Booked;
  const statusLabel = STATUS_LABEL[reservation_status] ?? reservation_status;

  return (
    <article
      id={`reservation-card-${reservation_id}`}
      aria-label={`Reservation ${shortId(reservation_id)}, ${branchName}, ${check_in_date} to ${check_out_date}`}
      className="
        group flex flex-col
        bg-white dark:bg-neutral-900
        border border-neutral-200 dark:border-neutral-700
        rounded-2xl shadow-sm
        hover:shadow-lg hover:-translate-y-0.5
        transition-all duration-300 ease-out
        overflow-hidden
      "
    >
      {/* Gradient accent bar */}
      <div
        aria-hidden="true"
        className="
          h-2 w-full
          bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500
          group-hover:from-indigo-500 group-hover:via-purple-500 group-hover:to-pink-500
          transition-all duration-500
        "
      />

      <div className="flex flex-col flex-1 p-5 gap-4">

        {/* Header: reference + status badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">
              Reference
            </p>
            <p
              id={`reservation-ref-${reservation_id}`}
              className="font-mono text-sm font-semibold text-neutral-800 dark:text-neutral-200"
              title={reservation_id}
            >
              {shortId(reservation_id)}&hellip;
            </p>
          </div>

          <span
            className={`
              inline-flex items-center gap-1.5
              px-2.5 py-1 rounded-full border
              text-xs font-medium flex-shrink-0
              ${badgeClass}
            `}
            aria-label={`Status: ${statusLabel}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
            {statusLabel}
          </span>
        </div>

        {/* Branch */}
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          {/* Location icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 flex-shrink-0 text-neutral-400"
            aria-hidden="true"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>SkyNest {branchName}</span>
        </div>

        {/* Dates grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Check-in
            </span>
            <span
              id={`reservation-checkin-${reservation_id}`}
              className="font-medium text-neutral-800 dark:text-neutral-200"
            >
              {formatDate(check_in_date)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Check-out
            </span>
            <span
              id={`reservation-checkout-${reservation_id}`}
              className="font-medium text-neutral-800 dark:text-neutral-200"
            >
              {formatDate(check_out_date)}
            </span>
          </div>
        </div>

        {/* Footer: nights + source + discount */}
        <div className="flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-3">
            {/* Calendar icon */}
            <span className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {nights} {nights === 1 ? 'night' : 'nights'}
            </span>

            <span className="text-neutral-300 dark:text-neutral-600" aria-hidden="true">&middot;</span>

            <span>{formatSource(booking_source)}</span>

            {discount_percentage && (
              <>
                <span className="text-neutral-300 dark:text-neutral-600" aria-hidden="true">&middot;</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {discount_percentage}% off
                </span>
              </>
            )}
          </div>
        </div>

        <hr className="border-neutral-100 dark:border-neutral-800" />

        {/* View details CTA */}
        <Link
          href={`/guest/reservations/${reservation_id}`}
          id={`reservation-link-${reservation_id}`}
          aria-label={`View details for reservation ${shortId(reservation_id)}`}
          className="
            block w-full text-center px-4 py-2.5 rounded-xl
            border border-blue-200 dark:border-blue-800
            text-blue-700 dark:text-blue-300
            hover:bg-blue-50 dark:hover:bg-blue-950
            text-sm font-medium
            transition-colors duration-200
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
          "
        >
          View Details &rarr;
        </Link>

      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div
      id="reservations-empty"
      className="flex flex-col items-center justify-center py-24 text-center gap-6"
    >
      <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-10 h-10 text-blue-400"
          aria-hidden="true"
        >
          <path d="M3 7v10M21 7v10M3 12h18M5 7h14a2 2 0 0 1 2 2v1H3V9a2 2 0 0 1 2-2z" />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
          No reservations yet
        </h2>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400 max-w-sm">
          You have not made any reservations. Search for available rooms across
          our SkyNest branches to get started.
        </p>
      </div>

      <Link
        href="/search"
        id="empty-book-room-btn"
        className="
          inline-flex items-center gap-2
          px-6 py-3 rounded-xl
          bg-blue-600 hover:bg-blue-700 active:bg-blue-800
          text-white text-sm font-semibold
          transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Search Rooms
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

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
      className="flex flex-col items-center justify-center py-20 text-center gap-5"
    >
      <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-8 h-8 text-red-400"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
          Could not load reservations
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
          {message}
        </p>
      </div>

      <button
        id="reservations-retry-btn"
        type="button"
        onClick={onRetry}
        className="
          inline-flex items-center gap-2
          px-5 py-2.5 rounded-xl
          border border-neutral-300 dark:border-neutral-600
          text-neutral-700 dark:text-neutral-300
          hover:bg-neutral-50 dark:hover:bg-neutral-800
          text-sm font-medium
          transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400
        "
      >
        Try Again
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

type LoadState = 'loading' | 'success' | 'error';

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  // Start as 'loading' — avoids synchronous setState in the effect on mount.
  const [loadState, setLoadState]       = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  // Incrementing retryKey re-triggers the fetch effect (only from a click handler).
  const [retryKey, setRetryKey]         = useState(0);

  /**
   * Called from the retry button (a user click handler) — setState here is fine.
   * Incrementing retryKey causes the useEffect below to re-run.
   */
  function handleRetry() {
    setLoadState('loading');
    setErrorMessage('');
    setRetryKey((k) => k + 1);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        /**
         * GET /api/guest/reservations
         * guest_id is sourced server-side from the session — not passed here.
         * Response: { data: Reservation[], meta: { requestId } }
         *
         * All setState calls are after the first `await` — never synchronous
         * within the effect body, satisfying react-hooks/set-state-in-effect.
         */
        const response = await fetch('/api/guest/reservations');
        const json     = (await response.json()) as ApiSuccess | ApiError;

        if (cancelled) return;

        if (!response.ok) {
          setErrorMessage((json as ApiError).error?.message ?? 'An unexpected error occurred.');
          setLoadState('error');
          return;
        }

        setReservations((json as ApiSuccess).data);
        setLoadState('success');
      } catch {
        if (cancelled) return;
        setErrorMessage('Could not reach the server. Please check your connection and try again.');
        setLoadState('error');
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [retryKey]); // re-runs only when handleRetry() increments retryKey

  // ── Derived state ──────────────────────────────────────────────────────

  const isLoading = loadState === 'loading';
  const isError   = loadState === 'error';
  const isSuccess = loadState === 'success';
  const hasItems  = reservations.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>

      <main
        className="
          min-h-screen
          bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50
          dark:from-neutral-950 dark:via-neutral-900 dark:to-slate-900
        "
      >
        {/* ── Hero header ─────────────────────────────────────────────── */}
        <section
          aria-labelledby="reservations-list-heading"
          className="
            relative overflow-hidden
            bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-700
            dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900
            py-12 px-4 md:px-6 lg:px-8
          "
        >
          {/* Decorative blobs */}
          <div aria-hidden="true" className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-blue-200 text-sm font-medium uppercase tracking-widest mb-2">
                SkyNest Hotels
              </p>
              <h1
                id="reservations-list-heading"
                className="text-3xl md:text-4xl font-extrabold text-white leading-tight"
              >
                My Reservations
              </h1>
              <p className="mt-2 text-blue-100 text-base">
                {isSuccess
                  ? hasItems
                    ? `${reservations.length} reservation${reservations.length !== 1 ? 's' : ''} found`
                    : 'No reservations yet'
                  : 'Your booking history'}
              </p>
            </div>

            {/* Book a Room CTA */}
            <Link
              href="/search"
              id="reservations-book-cta"
              className="
                inline-flex items-center gap-2 flex-shrink-0
                px-5 py-3 rounded-xl
                bg-white/15 hover:bg-white/25
                backdrop-blur-sm
                border border-white/30
                text-white text-sm font-semibold
                transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-700
              "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Book a Room
            </Link>
          </div>
        </section>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <section
          className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-10"
          aria-label="Reservations list"
          aria-live="polite"
          aria-busy={isLoading}
        >

          {/* Loading skeletons */}
          {isLoading && (
            <div
              id="reservations-loading"
              role="status"
              aria-label="Loading reservations"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <ReservationSkeleton key={i} />
              ))}
              <span className="sr-only">Loading your reservations&hellip;</span>
            </div>
          )}

          {/* Error state */}
          {isError && (
            <ErrorState
              message={errorMessage}
              onRetry={handleRetry}
            />
          )}

          {/* Empty state */}
          {isSuccess && !hasItems && <EmptyState />}

          {/* Reservations grid */}
          {isSuccess && hasItems && (
            <>
              {/* Results count row */}
              <div
                id="reservations-results-header"
                className="mb-6 flex items-center justify-between gap-4"
              >
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Showing {reservations.length} reservation{reservations.length !== 1 ? 's' : ''},
                  sorted newest first.
                </p>
                <Link
                  href="/search"
                  id="reservations-inline-book-cta"
                  className="
                    inline-flex items-center gap-1.5
                    text-sm font-medium text-blue-600 dark:text-blue-400
                    hover:underline underline-offset-2
                  "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Book another room
                </Link>
              </div>

              <ul
                id="reservations-grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 list-none p-0 m-0"
                aria-label={`${reservations.length} reservations`}
              >
                {reservations.map((r) => (
                  <li key={r.reservation_id}>
                    <ReservationCard reservation={r} />
                  </li>
                ))}
              </ul>
            </>
          )}

        </section>
      </main>
    </>
  );
}
