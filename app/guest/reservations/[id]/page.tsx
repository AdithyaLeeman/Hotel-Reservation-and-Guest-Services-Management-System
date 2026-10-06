'use client';

/**
 * Guest Reservation Detail Page — /guest/reservations/[id]
 *
 * Owned by: Member 3 (M3) | Task: P03-M03-T17
 * Type: MOCK-FIRST — calls GET /api/guest/reservations/[id] (currently mock data).
 *
 * Responsibilities:
 *   - Read `id` from the dynamic URL segment via useParams
 *   - Fetch full ReservationDetail from GET /api/guest/reservations/[id]
 *   - Render all detail fields: guest info, branch, dates, status, source,
 *     discount, rooms (number, type, rate per night)
 *   - Handle loading skeleton, 404/not-found, error, and success states
 *   - Provide navigation back to /guest/reservations (T16)
 *
 * Security:
 *   Ownership is enforced server-side at the DB level via fn_get_reservation_detail().
 *   The API returns 404 for both "not found" and "wrong guest" to prevent info leakage.
 *   This component sends NO guest_id — it is read from the session by the route handler.
 *
 * Entry points:
 *   - T15 (confirm page) "View Reservation" CTA → /guest/reservations/[id]
 *   - T16 (list page) "View Details →" link  → /guest/reservations/[id]
 *
 * TODO (P06-M03-T01): Replace dev-session stub in the API with real iron-session.
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import type { ReservationDetail, ReservationRoomDetail } from '@/repositories/reservation.repository';
import type { ReservationStatus } from '@/types/enums';

// ---------------------------------------------------------------------------
// Constants
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
    container: 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
    dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
    label: 'Checked In',
  },
  CheckedOut: {
    container: 'bg-[#22201e] text-[#a8a29e] border border-[#3e3933]',
    dot: 'bg-[#78716c]',
    label: 'Checked Out',
  },
  Cancelled: {
    container: 'bg-red-950/60 text-red-300 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.15)]',
    dot: 'bg-red-400 shadow-[0_0_8px_#f87171]',
    label: 'Cancelled',
  },
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

/** Format ISO timestamp as "01 Oct 2026, 10:30 AM" — display only. */
function formatDateTime(iso: string): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

/** Count nights between two ISO date strings. */
function countNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/** Format a NUMERIC(12,2) string as "LKR XX,XXX.XX" — display only. */
function formatRate(rate: string): string {
  const num = parseFloat(rate);
  if (isNaN(num)) return 'LKR \u2014';
  return 'LKR ' + num.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

interface ApiSuccess {
  data: ReservationDetail;
  meta: { requestId: string };
}

interface ApiError {
  error: { code: string; message: string };
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div
      id="reservation-detail-loading"
      role="status"
      aria-label="Loading reservation details"
      className="animate-pulse flex flex-col gap-6"
    >
      <span className="sr-only">Loading reservation details&hellip;</span>

      {/* Header skeleton */}
      <div className="bg-[#181716]/90 rounded-xs border border-[#38332c] overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#c5a880]/30 via-[#c5a880] to-[#c5a880]/30" />
        <div className="p-8 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="h-6 bg-[#2e2a24] rounded-xs w-1/3" />
            <div className="h-7 bg-[#2e2a24] rounded-full w-28" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-4 bg-[#2e2a24] rounded-xs w-4/5" />
            <div className="h-4 bg-[#2e2a24] rounded-xs w-4/5" />
            <div className="h-4 bg-[#2e2a24] rounded-xs w-3/5" />
            <div className="h-4 bg-[#2e2a24] rounded-xs w-3/5" />
          </div>
        </div>
      </div>

      {/* Rooms skeleton */}
      <div className="bg-[#181716]/90 rounded-xs border border-[#38332c] overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#c5a880]/30 via-[#c5a880] to-[#c5a880]/30" />
        <div className="p-8 flex flex-col gap-4">
          <div className="h-4 bg-[#2e2a24] rounded-xs w-1/4" />
          <div className="h-16 bg-[#121110] border border-[#2e2a24] rounded-xs" />
          <div className="h-16 bg-[#121110] border border-[#2e2a24] rounded-xs" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Not-found state
// ---------------------------------------------------------------------------

function NotFoundState() {
  return (
    <div
      id="reservation-detail-not-found"
      className="flex flex-col items-center justify-center py-24 text-center gap-6 bg-[#181716]/90 border border-[#38332c] rounded-xs p-10 max-w-xl mx-auto shadow-2xl backdrop-blur-xl"
    >
      <div className="w-16 h-16 rounded-full bg-[#c5a880]/10 border border-[#c5a880]/30 flex items-center justify-center text-[#c5a880]">
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
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="11" />
          <line x1="11" y1="14" x2="11.01" y2="14" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-serif text-white">
          Reservation Not Found
        </h2>
        <p className="mt-2 text-sm text-[#a8a29e] max-w-sm">
          This reservation reference does not exist or does not belong to your account.
        </p>
      </div>

      <Link
        href="/guest/reservations"
        id="not-found-back-btn"
        className="gold-btn px-6 py-2.5 rounded-xs text-sm uppercase tracking-wider font-semibold inline-flex items-center gap-2"
      >
        &larr; Return to Reservations
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      id="reservation-detail-error"
      role="alert"
      className="flex flex-col items-center justify-center py-20 text-center gap-6 bg-[#181716]/90 border border-red-500/30 rounded-xs p-10 max-w-xl mx-auto shadow-2xl backdrop-blur-xl"
    >
      <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400">
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
        <h2 className="text-2xl font-serif text-white">
          Could Not Load Reservation
        </h2>
        <p className="mt-2 text-sm text-[#a8a29e] max-w-sm">
          {message}
        </p>
      </div>

      <div className="flex gap-4">
        <button
          id="detail-retry-btn"
          type="button"
          onClick={onRetry}
          className="gold-btn px-6 py-2.5 rounded-xs text-sm uppercase tracking-wider font-semibold"
        >
          Try Again
        </button>
        <Link
          href="/guest/reservations"
          id="detail-error-back-btn"
          className="px-6 py-2.5 rounded-xs border border-[#38332c] hover:border-[#c5a880] text-sm text-neutral-300 hover:text-white transition-colors duration-200"
        >
          &larr; My Reservations
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail label–value row
// ---------------------------------------------------------------------------

function DetailRow({ label, value, id }: { label: string; value: React.ReactNode; id: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-medium text-[#a8a29e] uppercase tracking-[0.16em]">
        {label}
      </dt>
      <dd id={id} className="text-sm font-semibold text-neutral-100">
        {value}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rooms list
// ---------------------------------------------------------------------------

function RoomsList({ rooms }: { rooms: ReservationRoomDetail[] }) {
  if (rooms.length === 0) {
    return (
      <p className="text-sm text-[#a8a29e] italic">
        No room records found for this reservation.
      </p>
    );
  }

  return (
    <ul
      id="reservation-rooms-list"
      aria-label="Reserved rooms"
      className="flex flex-col gap-3 list-none p-0 m-0"
    >
      {rooms.map((room) => (
        <li
          key={room.room_id}
          id={`reservation-room-${room.room_id}`}
          className="
            flex items-center justify-between gap-4
            p-4 rounded-xs
            bg-[#121110]/80
            border border-[#2e2a24]
            text-sm
          "
        >
          <div className="flex items-center gap-3.5">
            {/* Bed icon */}
            <span
              aria-hidden="true"
              className="
                flex items-center justify-center
                w-10 h-10 rounded-xs flex-shrink-0
                bg-[#c5a880]/15 border border-[#c5a880]/30 text-[#c5a880]
              "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M3 7v10M21 7v10M3 12h18M5 7h14a2 2 0 0 1 2 2v1H3V9a2 2 0 0 1 2-2z" />
              </svg>
            </span>
            <div>
              <p className="font-serif text-lg font-medium text-white tracking-wide">
                Room {room.room_number}
              </p>
              <p className="text-xs text-[#a8a29e]">{room.type_name}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-sans font-semibold text-base tabular-nums text-[#e5d3b3]">
              {formatRate(room.rate_per_night)}
            </p>
            <p className="text-[11px] text-[#8c827a]">/ night (at booking)</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Success detail view
// ---------------------------------------------------------------------------

function ReservationDetailView({ detail }: { detail: ReservationDetail }) {
  const nights      = countNights(detail.check_in_date, detail.check_out_date);
  const badgeConfig = STATUS_BADGE_STYLE[detail.reservation_status] ?? STATUS_BADGE_STYLE.Booked;
  const statusLabel = badgeConfig.label;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

      {/* ── Left Column: Primary Reservation & Rooms (7 cols) ───────────── */}
      <div className="lg:col-span-7 flex flex-col gap-8">

        {/* Reservation summary card */}
        <div
          id="reservation-detail-card"
          className="
            bg-[#181716]/90 backdrop-blur-xl
            border border-[#38332c]
            rounded-xs shadow-2xl overflow-hidden
          "
        >
          {/* Luxury gold accent */}
          <div
            aria-hidden="true"
            className="h-1 w-full bg-gradient-to-r from-[#c5a880]/30 via-[#c5a880] to-[#c5a880]/30"
          />

          <div className="p-6 sm:p-8 flex flex-col gap-6">

            {/* Header: reference + status pill */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-[11px] text-[#c5a880] uppercase tracking-[0.2em] font-semibold mb-1">
                  Reservation Reference
                </p>
                <p
                  id="detail-reservation-id"
                  className="font-mono text-xl sm:text-2xl font-semibold text-neutral-100 tracking-wider break-all"
                >
                  {detail.reservation_id}
                </p>
              </div>

              <span
                id="detail-status-badge"
                className={`
                  inline-flex items-center gap-2 flex-shrink-0 self-start
                  px-3.5 py-1.5 rounded-full border
                  text-[11px] font-semibold uppercase tracking-[0.16em]
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
              <span className="font-serif text-xl tracking-wide text-white">
                SkyNest {detail.branch_location_name}
              </span>
            </div>

            {/* Dates itinerary panel — framed luxury box with clear fonts */}
            <div className="bg-[#121110]/80 border border-[#2e2a24] rounded-xs p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-[#a8a29e] uppercase tracking-[0.18em] font-medium">
                  Check-in
                </span>
                <span
                  id="detail-check-in"
                  className="font-sans text-base sm:text-lg font-semibold text-neutral-100 tracking-wide"
                >
                  {formatDate(detail.check_in_date)}
                </span>
              </div>
              <div className="flex flex-col gap-1 sm:border-l sm:border-[#2e2a24] sm:pl-4">
                <span className="text-[11px] text-[#a8a29e] uppercase tracking-[0.18em] font-medium">
                  Check-out
                </span>
                <span
                  id="detail-check-out"
                  className="font-sans text-base sm:text-lg font-semibold text-neutral-100 tracking-wide"
                >
                  {formatDate(detail.check_out_date)}
                </span>
              </div>
            </div>

            {/* Details grid */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 pt-2 border-t border-[#2e2a24]">
              <DetailRow
                label="Branch"
                id="detail-branch"
                value={`SkyNest ${detail.branch_location_name}`}
              />

              <DetailRow
                label="Booking Source"
                id="detail-source"
                value={detail.booking_source}
              />

              <DetailRow
                label="Duration"
                id="detail-duration"
                value={`${nights} ${nights === 1 ? 'night' : 'nights'}`}
              />

              <DetailRow
                label="Discount"
                id="detail-discount"
                value={
                  detail.discount_percentage
                    ? <span className="text-emerald-400 font-semibold">{detail.discount_percentage}% OFF</span>
                    : <span className="text-[#8c827a]">None</span>
                }
              />

              <DetailRow
                label="Booked On"
                id="detail-created-at"
                value={formatDateTime(detail.created_at)}
              />

              {detail.processed_by_employee_id && (
                <DetailRow
                  label="Processed by Employee"
                  id="detail-employee"
                  value={`#${detail.processed_by_employee_id}`}
                />
              )}
            </dl>
          </div>
        </div>

        {/* Reserved rooms card */}
        <div
          id="reservation-rooms-card"
          className="
            bg-[#181716]/90 backdrop-blur-xl
            border border-[#38332c]
            rounded-xs shadow-2xl overflow-hidden
          "
        >
          <div className="h-1 w-full bg-gradient-to-r from-[#c5a880]/30 via-[#c5a880] to-[#c5a880]/30" aria-hidden="true" />

          <div className="p-6 sm:p-8 flex flex-col gap-5">
            <h2 className="text-xs font-semibold text-[#c5a880] uppercase tracking-[0.2em]">
              Reserved Rooms ({detail.rooms.length} {detail.rooms.length === 1 ? 'room' : 'rooms'})
            </h2>
            <RoomsList rooms={detail.rooms} />

            <p className="text-xs text-[#8c827a] mt-1">
              Rates shown are the historical snapshot captured at booking time.
              Final billing is calculated at checkout by the hotel system.
            </p>
          </div>
        </div>

      </div>

      {/* ── Right Column: Guest Info & Billing Action (5 cols) ─────────── */}
      <div className="lg:col-span-5 flex flex-col gap-8">

        {/* Billing & Payment CTA card */}
        <div
          id="reservation-billing-card"
          className="
            bg-[#181716]/90 backdrop-blur-xl
            border border-[#38332c]
            rounded-xs shadow-2xl overflow-hidden
          "
        >
          <div className="h-1 w-full bg-gradient-to-r from-[#c5a880]/30 via-[#c5a880] to-[#c5a880]/30" aria-hidden="true" />

          <div className="p-6 sm:p-8 flex flex-col gap-5">
            <div>
              <h2 className="text-xs font-semibold text-[#c5a880] uppercase tracking-[0.2em]">
                Billing &amp; Payments
              </h2>
              <p className="text-sm text-[#a8a29e] mt-2 leading-relaxed">
                Review your itemized invoice breakdown, room charges, taxes, and settled payment history.
              </p>
            </div>

            <Link
              href={`/guest/reservations/${detail.reservation_id}/pay`}
              id="detail-pay-bill-btn"
              className="gold-btn py-3 px-6 text-sm flex items-center justify-center gap-2 rounded-xs font-semibold uppercase tracking-wider w-full shadow-lg"
            >
              <span>View Bill &amp; Settle Balance</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Guest info card */}
        <div
          id="reservation-guest-card"
          className="
            bg-[#181716]/90 backdrop-blur-xl
            border border-[#38332c]
            rounded-xs shadow-2xl overflow-hidden
          "
        >
          <div className="h-1 w-full bg-gradient-to-r from-[#c5a880]/30 via-[#c5a880] to-[#c5a880]/30" aria-hidden="true" />

          <div className="p-6 sm:p-8 flex flex-col gap-5">
            <h2 className="text-xs font-semibold text-[#c5a880] uppercase tracking-[0.2em]">
              Guest Information
            </h2>
            <dl className="flex flex-col gap-4">
              <DetailRow
                label="Full Name"
                id="detail-guest-name"
                value={detail.guest_full_name}
              />
              <DetailRow
                label="Email"
                id="detail-guest-email"
                value={
                  <a
                    href={`mailto:${detail.guest_email}`}
                    className="text-[#c5a880] hover:underline underline-offset-2"
                  >
                    {detail.guest_email}
                  </a>
                }
              />
            </dl>
          </div>
        </div>

        {/* Concierge Assistance Card */}
        <div className="bg-[#181716]/70 border border-[#2e2a24] rounded-xs p-6 flex flex-col gap-3">
          <p className="text-[11px] text-[#c5a880] uppercase tracking-[0.2em] font-semibold">
            Concierge &amp; Reception
          </p>
          <p className="text-xs text-[#a8a29e] leading-relaxed">
            Need to request room service, schedule early arrival, or make itinerary adjustments? Contact our front desk at your destination branch 24/7.
          </p>
          <div className="pt-2 text-xs text-[#8c827a]">
            Standard check-in begins at 14:00. Checkout is at 12:00 noon.
          </div>
        </div>

      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

type LoadState = 'loading' | 'success' | 'not_found' | 'error';

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id     = typeof params.id === 'string' ? params.id : '';

  const [detail,       setDetail]       = useState<ReservationDetail | null>(null);
  const [loadState,    setLoadState]    = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  // Incrementing retryKey re-triggers the fetch effect (only from handleRetry click handler)
  const [retryKey,     setRetryKey]     = useState(0);

  // Redirect if id is missing from the URL — should not happen in normal navigation
  useEffect(() => {
    if (!id) router.replace('/guest/reservations');
  }, [id, router]);

  function handleRetry() {
    setLoadState('loading');
    setErrorMessage('');
    setRetryKey((k) => k + 1);
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        /**
         * GET /api/guest/reservations/[id]
         * guest_id is sourced server-side from the session — not sent here.
         * Returns 404 for both "not found" and "wrong guest" to prevent info leakage.
         * All setState calls are after the first `await` — never synchronous within
         * the effect body, satisfying react-hooks/set-state-in-effect.
         */
        const response = await fetch(`/api/guest/reservations/${id}`);
        const json     = (await response.json()) as ApiSuccess | ApiError;

        if (cancelled) return;

        if (response.status === 404) {
          setLoadState('not_found');
          return;
        }

        if (!response.ok) {
          setErrorMessage((json as ApiError).error?.message ?? 'An unexpected error occurred.');
          setLoadState('error');
          return;
        }

        setDetail((json as ApiSuccess).data);
        setLoadState('success');
      } catch {
        if (cancelled) return;
        setErrorMessage('Could not reach the server. Please check your connection and try again.');
        setLoadState('error');
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id, retryKey]);

  // ── Derived ───────────────────────────────────────────────────────────

  const isLoading  = loadState === 'loading';
  const isNotFound = loadState === 'not_found';
  const isError    = loadState === 'error';
  const isSuccess  = loadState === 'success' && detail !== null;

  // ── Render ────────────────────────────────────────────────────────────

  const shortId = id ? id.slice(0, 8).toUpperCase() : '';

  return (
    <>

      <main
        className="
          min-h-screen relative text-neutral-100 bg-[#0d0c0b]
        "
      >
        {/* ── Ambient background with subtle blur ──────────────────────── */}
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        >
          <img
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2400&q=80"
            alt=""
            className="w-full h-full object-cover filter blur-[2px] opacity-40 brightness-[0.65] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f0e0d]/90 via-[#141312]/85 to-[#0c0b0a]/95" />
        </div>

        <div className="relative z-10">

          {/* ── Hero header ─────────────────────────────────────────────── */}
          <section
            aria-labelledby="detail-heading"
            className="
              relative overflow-hidden
              bg-black/40 backdrop-blur-md
              border-b border-[#38332b]
              py-12 px-4 sm:px-8 lg:px-12
            "
          >
            {/* Subtle gold watermark */}
            <div aria-hidden="true" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#c5a880]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative max-w-[1600px] w-full mx-auto">
              {/* Breadcrumb */}
              <nav aria-label="Breadcrumb" className="mb-4">
                <ol className="flex items-center gap-2 text-sm text-[#c5a880]/80 list-none p-0 m-0">
                  <li>
                    <Link
                      href="/search"
                      id="breadcrumb-search"
                      className="hover:text-white transition-colors duration-200"
                    >
                      Search
                    </Link>
                  </li>
                  <li aria-hidden="true" className="text-[#c5a880]/40">&rsaquo;</li>
                  <li>
                    <Link
                      href="/guest/reservations"
                      id="breadcrumb-reservations"
                      className="hover:text-white transition-colors duration-200"
                    >
                      My Reservations
                    </Link>
                  </li>
                  <li aria-hidden="true" className="text-[#c5a880]/40">&rsaquo;</li>
                  <li aria-current="page" className="text-white font-medium">
                    {shortId ? `${shortId}\u2026` : 'Detail'}
                  </li>
                </ol>
              </nav>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#c5a880] text-xs">★★★★★</span>
                <span className="text-xs uppercase tracking-[0.2em] text-[#c5a880] font-medium">SkyNest Guest Services</span>
              </div>

              <h1
                id="detail-heading"
                className="text-3xl sm:text-4xl md:text-5xl font-serif text-white leading-tight"
              >
                Reservation Detail
              </h1>
              <p className="mt-2 text-[#e2cfb4]/80 text-sm">
                {isSuccess
                  ? `SkyNest ${detail!.branch_location_name}`
                  : 'SkyNest Hotels & Resorts'}
              </p>
            </div>
          </section>

          {/* ── Content ─────────────────────────────────────────────────── */}
          <section
            className="max-w-[1600px] w-full mx-auto px-4 sm:px-8 lg:px-12 py-10"
            aria-live="polite"
            aria-busy={isLoading}
          >
            {/* Back link — always visible (except during loading to avoid clutter) */}
            {!isLoading && (
              <div className="mb-6">
                <Link
                  href="/guest/reservations"
                  id="detail-back-link"
                  className="
                    inline-flex items-center gap-2
                    text-sm text-[#c5a880] hover:text-white
                    transition-colors duration-200
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
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back to My Reservations
                </Link>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && <DetailSkeleton />}

            {/* Not found */}
            {isNotFound && <NotFoundState />}

            {/* Error */}
            {isError && (
              <ErrorState message={errorMessage} onRetry={handleRetry} />
            )}

            {/* Success */}
            {isSuccess && <ReservationDetailView detail={detail!} />}

          </section>
        </div>
      </main>
    </>
  );
}
