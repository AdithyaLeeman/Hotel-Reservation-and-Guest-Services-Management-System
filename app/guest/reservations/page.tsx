'use client';

/**
 * My Reservations List Page - /guest/reservations
 *
 * Owned by: Member 3 (M3) | Task: P03-M03-T16
 * Type: MOCK-FIRST - calls GET /api/guest/reservations (currently mock data).
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
 * GET /api/guest/reservations - never passed from this component.
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
// Status badge config - Luxury bespoke pills
// ---------------------------------------------------------------------------

interface StatusBadgeConfig {
  container: string;
  dot: string;
  label: string;
}

const STATUS_BADGE_STYLE: Record<ReservationStatus, StatusBadgeConfig> = {
  Booked: {
    container: 'bg-[#c5a880]/15 text-[#e5d3b3] border border-[#c5a880]/50 shadow-[0_0_12px_rgba(197,168,128,0.15)]',
    dot: 'bg-[#c5a880] shadow-[0_0_8px_#c5a880]',
    label: 'Booked',
  },
  CheckedIn: {
    container: 'bg-[#c5a880]/20 text-[#f5e6d3] border border-[#c5a880]/40 shadow-[0_0_12px_rgba(197,168,128,0.12)]',
    dot: 'bg-[#c5a880] shadow-[0_0_8px_#c5a880]',
    label: 'Checked In',
  },
  CheckedOut: {
    container: 'bg-[#22201e] text-[#a8a29e] border border-[#3e3933]',
    dot: 'bg-[#78716c]',
    label: 'Checked Out',
  },
  Cancelled: {
    container: 'bg-[rgba(127,29,29,0.22)] text-[#fca5a5] border border-[rgba(127,29,29,0.4)] shadow-[0_0_12px_rgba(127,29,29,0.15)]',
    dot: 'bg-[#f87171] shadow-[0_0_8px_#f87171]',
    label: 'Cancelled',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format ISO date as "01 Oct 2026" - display only. */
function formatDate(iso: string): string {
  if (!iso) return '\u2014';
  const clean = iso.includes('T') ? iso.split('T')[0] : iso;
  const d = new Date(clean + 'T00:00:00');
  if (isNaN(d.getTime())) return '\u2014';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Count nights between two ISO date strings - DISPLAY ONLY.
 *
 * Used solely for the nights badge on reservation cards (cosmetic).
 * Authoritative billing uses PostgreSQL date arithmetic in fn_calc_room_charges().
 * context/04-code-standards.md rule applies to financial calculations, not display labels.
 */
function countNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/** Format booking source for display. */
function formatSource(source: string): string {
  if (source === 'Online') return 'Online';
  if (source === 'Reception') return 'Reception';
  if (source === 'Phone') return 'Phone';
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
      className="animate-pulse bg-[#181716]/80 rounded-xs border border-[#38332c] overflow-hidden shadow-xl"
      aria-hidden="true"
    >
      <div className="h-1 bg-gradient-to-r from-[#c5a880]/20 via-[#c5a880]/40 to-[#c5a880]/20" />
      <div className="p-7 sm:p-8 flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2 w-1/2">
            <div className="h-3 bg-[#2e2a24] rounded-xs w-24" />
            <div className="h-6 bg-[#2e2a24] rounded-xs w-36" />
          </div>
          <div className="h-7 bg-[#2e2a24] rounded-full w-24" />
        </div>
        <div className="h-4 bg-[#2e2a24] rounded-xs w-48" />
        <div className="bg-[#121110]/60 border border-[#2b2723] rounded-xs p-5 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-3 bg-[#2e2a24] rounded-xs w-16" />
            <div className="h-5 bg-[#2e2a24] rounded-xs w-28" />
          </div>
          <div className="space-y-2 pl-4 border-l border-[#2e2a24]">
            <div className="h-3 bg-[#2e2a24] rounded-xs w-16" />
            <div className="h-5 bg-[#2e2a24] rounded-xs w-28" />
          </div>
        </div>
        <div className="h-11 bg-[#2e2a24] rounded-xs w-full" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reservation card
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Reservation card - Enlarged luxury card layout
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

  const nights = countNights(check_in_date, check_out_date);
  const branchName = BRANCHES[branch_id] ?? `Branch ${branch_id}`;
  const badgeConfig = STATUS_BADGE_STYLE[reservation_status] ?? STATUS_BADGE_STYLE.Booked;
  const statusLabel = badgeConfig.label;

  return (
    <article
      id={`reservation-card-${reservation_id}`}
      aria-label={`Reservation ${shortId(reservation_id)}, ${branchName}, ${check_in_date} to ${check_out_date}`}
      className="
        group flex flex-col
        bg-[#181716]/90 backdrop-blur-xl
        border border-[#38332c] hover:border-[#c5a880]/70
        rounded-xs shadow-2xl hover:shadow-[0_20px_48px_rgba(0,0,0,0.65)] hover:-translate-y-1
        transition-all duration-300 ease-out
        overflow-hidden
      "
    >
      {/* Luxury gold champagne gradient accent bar */}
      <div
        aria-hidden="true"
        className="
          h-1 w-full
          bg-gradient-to-r from-[#c5a880]/30 via-[#c5a880] to-[#c5a880]/30
          group-hover:from-[#c5a880] group-hover:via-[#f3e5ce] group-hover:to-[#c5a880]
          transition-all duration-500
        "
      />

      <div className="flex flex-col flex-1 p-6 sm:p-8 gap-6">

        {/* Header: reference + luxury status badge pill */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] text-[#c5a880] uppercase tracking-[0.2em] font-semibold mb-1">
              Reservation Reference
            </p>
            <p
              id={`reservation-ref-${reservation_id}`}
              className="font-mono text-xl sm:text-2xl font-semibold text-neutral-100 tracking-wider"
              title={reservation_id}
            >
              {shortId(reservation_id)}&hellip;
            </p>
          </div>

          {/* Luxury styled pill */}
          <span
            className={`
              inline-flex items-center gap-2
              px-3.5 py-1.5 rounded-full border
              text-[11px] font-semibold uppercase tracking-[0.16em] flex-shrink-0
              ${badgeConfig.container}
            `}
            aria-label={`Status: ${statusLabel}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeConfig.dot}`} aria-hidden="true" />
            {statusLabel}
          </span>
        </div>

        {/* Branch / Property display */}
        <div className="flex items-center gap-2.5 text-neutral-300">
          <div className="w-7 h-7 rounded-xs bg-[#c5a880]/15 border border-[#c5a880]/40 flex items-center justify-center text-[#c5a880] shrink-0">
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
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <span className="font-serif text-lg tracking-wide text-white">SkyNest {branchName}</span>
        </div>

        {/* Dates itinerary panel - framed luxury box */}
        <div className="bg-[#121110]/80 border border-[#2e2a24] rounded-xs p-5 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-[#a8a29e] uppercase tracking-[0.18em] font-medium">
              Check-in
            </span>
            <span
              id={`reservation-checkin-${reservation_id}`}
              className="font-sans text-base sm:text-lg font-semibold text-neutral-100 tracking-wide"
            >
              {formatDate(check_in_date)}
            </span>
          </div>
          <div className="flex flex-col gap-1 border-l border-[#2e2a24] pl-4">
            <span className="text-[11px] text-[#a8a29e] uppercase tracking-[0.18em] font-medium">
              Check-out
            </span>
            <span
              id={`reservation-checkout-${reservation_id}`}
              className="font-sans text-base sm:text-lg font-semibold text-neutral-100 tracking-wide"
            >
              {formatDate(check_out_date)}
            </span>
          </div>
        </div>

        {/* Footer: nights + source + discount */}
        <div className="flex items-center justify-between gap-3 text-xs text-[#a8a29e] tracking-wider uppercase">
          <div className="flex items-center gap-3">
            {/* Calendar icon */}
            <span className="flex items-center gap-1.5 text-[#c5a880] font-medium">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5 text-[#c5a880]"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {nights} {nights === 1 ? 'Night' : 'Nights'}
            </span>

            <span className="text-[#3a352e]" aria-hidden="true">&middot;</span>

            <span className="text-[#8c827a]">{formatSource(booking_source)}</span>
          </div>

          {discount_percentage && (
            <span className="text-[#c5a880] font-semibold bg-[#c5a880]/15 px-2.5 py-1 rounded-full border border-[#c5a880]/30 text-[11px] tracking-wider">
              {discount_percentage}% OFF
            </span>
          )}
        </div>

        <div className="h-px bg-[#2e2a24]" />

        {/* View details CTA button */}
        <Link
          href={`/guest/reservations/${reservation_id}`}
          id={`reservation-link-${reservation_id}`}
          aria-label={`View details for reservation ${shortId(reservation_id)}`}
          className="
            gold-btn-outline w-full py-3.5 px-6 text-xs font-semibold uppercase tracking-[0.18em] text-center
            hover:shadow-lg transition-all duration-300
          "
        >
          View Details
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
      className="flex flex-col items-center justify-center py-24 text-center gap-6 bg-[#181716]/80 border border-[#38332c] rounded-xs p-8 max-w-xl mx-auto shadow-2xl"
    >
      <div className="w-16 h-16 rounded-full bg-[#c5a880]/15 border border-[#c5a880]/40 flex items-center justify-center text-[#c5a880]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-8 h-8 text-[#c5a880]"
          aria-hidden="true"
        >
          <path d="M3 7v10M21 7v10M3 12h18M5 7h14a2 2 0 0 1 2 2v1H3V9a2 2 0 0 1 2-2z" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-serif font-normal text-white">
          No reservations yet
        </h2>
        <p className="mt-2 text-sm text-[#a8a29e] max-w-sm">
          You have not made any reservations. Search for available rooms across
          our SkyNest properties to get started.
        </p>
      </div>

      <Link
        href="/search"
        id="empty-book-room-btn"
        className="gold-btn py-3 px-7 text-xs font-semibold uppercase tracking-[0.18em] shadow-lg"
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
      className="flex flex-col items-center justify-center py-20 text-center gap-5 bg-[#181716]/80 border border-red-900/40 rounded-xs p-8 max-w-xl mx-auto shadow-2xl"
    >
      <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-8 h-8"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-serif font-normal text-white">
          Could not load reservations
        </h2>
        <p className="mt-2 text-sm text-[#a8a29e] max-w-sm">
          {message}
        </p>
      </div>

      <button
        id="reservations-retry-btn"
        type="button"
        onClick={onRetry}
        className="gold-btn-outline py-2.5 px-6 text-xs font-semibold uppercase tracking-[0.16em]"
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
  // Start as 'loading' - avoids synchronous setState in the effect on mount.
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  // Incrementing retryKey re-triggers the fetch effect (only from a click handler).
  const [retryKey, setRetryKey] = useState(0);

  /**
   * Called from the retry button (a user click handler) - setState here is fine.
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
         * guest_id is sourced server-side from the session - not passed here.
         * Response: { data: Reservation[], meta: { requestId } }
         *
         * All setState calls are after the first `await` - never synchronous
         * within the effect body, satisfying react-hooks/set-state-in-effect.
         */
        const response = await fetch('/api/guest/reservations');
        const json = (await response.json()) as ApiSuccess | ApiError;

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
  const isError = loadState === 'error';
  const isSuccess = loadState === 'success';
  const hasItems = reservations.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>

      <main
        className="
          relative min-h-screen
          bg-[#121110]
          text-[#1c1917] dark:text-[#f8f6f0]
          overflow-hidden
        "
      >
        {/* Ambient clear luxury background with subtle blur */}
        <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=2400&q=80"
            alt=""
            className="w-full h-full object-cover filter blur-[2px] opacity-100 brightness-[0.7]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#141312]/90 via-[#121110]/90 to-[#0d0c0b]" />
          <div className="absolute -top-32 left-1/3 w-[650px] h-[650px] bg-[#c5a880]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-[#c5a880]/5 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* ── Hero header ─────────────────────────────────────────────── */}
        <section
          aria-labelledby="reservations-list-heading"
          className="
            relative z-10
            bg-[#141312]/80 backdrop-blur-sm text-white
            py-16 px-4 sm:px-8 lg:px-12
            border-b border-[#2e2a24] shadow-sm
          "
        >
          <div className="relative max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3 text-[#c5a880] text-xs uppercase tracking-[0.24em] font-semibold">
                <span>★★★★★</span>
                <span className="opacity-40">·</span>
                <span>SkyNest Guest Itinerary</span>
              </div>
              <h1
                id="reservations-list-heading"
                className="font-serif text-3xl sm:text-5xl font-normal text-white leading-tight tracking-[0.02em]"
              >
                My Reservations
              </h1>
              <p className="mt-3 text-[#c5a880]/90 text-sm font-light tracking-wide max-w-xl">
                {isSuccess
                  ? hasItems
                    ? `Showing ${reservations.length} curated reservation${reservations.length !== 1 ? 's' : ''} on record`
                    : 'No active or past reservations found'
                  : 'Your complete SkyNest luxury booking history'}
              </p>
            </div>

            {/* Book a Room CTA */}
            <Link
              href="/search"
              id="reservations-book-cta"
              className="
                gold-btn py-3 px-7 text-xs font-semibold tracking-[0.18em] shadow-lg shrink-0
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
          className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-12"
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
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
            >
              {Array.from({ length: 6 }).map((_, i) => (
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
                className="mb-8 flex items-center justify-between gap-4 border-b border-[#2e2a24] pb-4"
              >
                <p className="text-xs sm:text-sm text-[#a8a29e] uppercase tracking-[0.14em]">
                  Showing <span className="text-white font-medium">{reservations.length}</span> reservation{reservations.length !== 1 ? 's' : ''}, sorted newest first
                </p>
                <Link
                  href="/search"
                  id="reservations-inline-book-cta"
                  className="
                    inline-flex items-center gap-1.5
                    text-xs uppercase tracking-[0.16em] font-semibold text-[#c5a880]
                    hover:text-white transition-colors duration-200
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
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 list-none p-0 m-0"
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
