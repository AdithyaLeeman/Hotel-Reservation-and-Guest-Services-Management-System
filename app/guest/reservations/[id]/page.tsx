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
import GuestNav from '@/components/GuestNav';
import type { ReservationDetail, ReservationRoomDetail } from '@/repositories/reservation.repository';
import type { ReservationStatus } from '@/types/enums';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Human-readable status badge styles — mirrors T16's pattern for consistency. */
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
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-neutral-200 to-neutral-100 dark:from-neutral-700 dark:to-neutral-600" />
        <div className="p-6 flex flex-col gap-4">
          <div className="flex justify-between">
            <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
            <div className="h-6 bg-neutral-100 dark:bg-neutral-800 rounded-full w-24" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-4 bg-neutral-100 dark:bg-neutral-700 rounded w-4/5" />
            <div className="h-4 bg-neutral-100 dark:bg-neutral-700 rounded w-4/5" />
            <div className="h-4 bg-neutral-100 dark:bg-neutral-700 rounded w-3/5" />
            <div className="h-4 bg-neutral-100 dark:bg-neutral-700 rounded w-3/5" />
          </div>
        </div>
      </div>

      {/* Rooms skeleton */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-neutral-200 to-neutral-100 dark:from-neutral-700 dark:to-neutral-600" />
        <div className="p-6 flex flex-col gap-3">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4" />
          <div className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
          <div className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
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
      className="flex flex-col items-center justify-center py-24 text-center gap-5"
    >
      <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-10 h-10 text-neutral-400"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="11" />
          <line x1="11" y1="14" x2="11.01" y2="14" />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
          Reservation not found
        </h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
          This reservation does not exist or does not belong to your account.
        </p>
      </div>

      <Link
        href="/guest/reservations"
        id="not-found-back-btn"
        className="
          inline-flex items-center gap-2
          px-5 py-2.5 rounded-xl
          bg-blue-600 hover:bg-blue-700
          text-white text-sm font-semibold
          transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        "
      >
        &larr; My Reservations
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
          Could not load reservation
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
          {message}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          id="detail-retry-btn"
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
        <Link
          href="/guest/reservations"
          id="detail-error-back-btn"
          className="
            inline-flex items-center gap-2
            px-5 py-2.5 rounded-xl
            bg-blue-600 hover:bg-blue-700
            text-white text-sm font-medium
            transition-colors duration-200
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
          "
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
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
        {label}
      </dt>
      <dd id={id} className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
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
      <p className="text-sm text-neutral-400 dark:text-neutral-500 italic">
        No room records found for this reservation.
      </p>
    );
  }

  return (
    <ul
      id="reservation-rooms-list"
      aria-label="Reserved rooms"
      className="flex flex-col gap-2 list-none p-0 m-0"
    >
      {rooms.map((room) => (
        <li
          key={room.room_id}
          id={`reservation-room-${room.room_id}`}
          className="
            flex items-center justify-between gap-4
            px-4 py-3 rounded-xl
            bg-neutral-50 dark:bg-neutral-800
            border border-neutral-100 dark:border-neutral-700
            text-sm
          "
        >
          <div className="flex items-center gap-3">
            {/* Bed icon */}
            <span
              aria-hidden="true"
              className="
                flex items-center justify-center
                w-8 h-8 rounded-lg flex-shrink-0
                bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400
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
                className="w-4 h-4"
              >
                <path d="M3 7v10M21 7v10M3 12h18M5 7h14a2 2 0 0 1 2 2v1H3V9a2 2 0 0 1 2-2z" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                Room {room.room_number}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{room.type_name}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">
              {formatRate(room.rate_per_night)}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">/ night (at booking)</p>
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
  const badgeClass  = STATUS_BADGE_CLASS[detail.reservation_status] ?? STATUS_BADGE_CLASS.Booked;
  const statusLabel = STATUS_LABEL[detail.reservation_status] ?? detail.reservation_status;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Reservation summary card ───────────────────────────────────── */}
      <div
        id="reservation-detail-card"
        className="
          bg-white dark:bg-neutral-900
          border border-neutral-200 dark:border-neutral-700
          rounded-2xl shadow-sm overflow-hidden
        "
      >
        {/* Gradient accent */}
        <div
          aria-hidden="true"
          className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500"
        />

        <div className="p-6 md:p-8 flex flex-col gap-6">

          {/* Header: reference + status */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">
                Booking Reference
              </p>
              <p
                id="detail-reservation-id"
                className="font-mono text-base font-semibold text-neutral-800 dark:text-neutral-200 break-all"
              >
                {detail.reservation_id}
              </p>
            </div>

            <span
              id="detail-status-badge"
              className={`
                inline-flex items-center gap-1.5 flex-shrink-0
                px-3 py-1.5 rounded-full border text-sm font-medium
                ${badgeClass}
              `}
              aria-label={`Status: ${statusLabel}`}
            >
              <span className="w-2 h-2 rounded-full bg-current" aria-hidden="true" />
              {statusLabel}
            </span>
          </div>

          <hr className="border-neutral-100 dark:border-neutral-800" />

          {/* Details grid */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">

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
              label="Check-in"
              id="detail-check-in"
              value={formatDate(detail.check_in_date)}
            />

            <DetailRow
              label="Check-out"
              id="detail-check-out"
              value={formatDate(detail.check_out_date)}
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
                  ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{detail.discount_percentage}%</span>
                  : <span className="text-neutral-400 dark:text-neutral-500">None</span>
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

      {/* ── Guest info card ─────────────────────────────────────────────── */}
      <div
        id="reservation-guest-card"
        className="
          bg-white dark:bg-neutral-900
          border border-neutral-200 dark:border-neutral-700
          rounded-2xl shadow-sm overflow-hidden
        "
      >
        <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" aria-hidden="true" />

        <div className="p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
            Guest Information
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
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
                  className="text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
                >
                  {detail.guest_email}
                </a>
              }
            />
          </dl>
        </div>
      </div>

      {/* ── Reserved rooms card ─────────────────────────────────────────── */}
      <div
        id="reservation-rooms-card"
        className="
          bg-white dark:bg-neutral-900
          border border-neutral-200 dark:border-neutral-700
          rounded-2xl shadow-sm overflow-hidden
        "
      >
        <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" aria-hidden="true" />

        <div className="p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
            Reserved Rooms
            <span className="ml-2 text-xs font-normal text-neutral-400 dark:text-neutral-500 normal-case tracking-normal">
              ({detail.rooms.length} {detail.rooms.length === 1 ? 'room' : 'rooms'})
            </span>
          </h2>
          <RoomsList rooms={detail.rooms} />

          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            Rates shown are the historical snapshot captured at booking time.
            Final billing is calculated at checkout by the hotel system.
          </p>
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
      <GuestNav />

      <main
        className="
          min-h-screen
          bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50
          dark:from-neutral-950 dark:via-neutral-900 dark:to-slate-900
        "
      >
        {/* ── Hero header ─────────────────────────────────────────────── */}
        <section
          aria-labelledby="detail-heading"
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

          <div className="relative max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex items-center gap-2 text-sm text-blue-200 list-none p-0 m-0">
                <li>
                  <Link
                    href="/search"
                    id="breadcrumb-search"
                    className="hover:text-white transition-colors duration-200"
                  >
                    Search
                  </Link>
                </li>
                <li aria-hidden="true" className="text-blue-400">&rsaquo;</li>
                <li>
                  <Link
                    href="/guest/reservations"
                    id="breadcrumb-reservations"
                    className="hover:text-white transition-colors duration-200"
                  >
                    My Reservations
                  </Link>
                </li>
                <li aria-hidden="true" className="text-blue-400">&rsaquo;</li>
                <li aria-current="page" className="text-white font-medium">
                  {shortId ? `${shortId}\u2026` : 'Detail'}
                </li>
              </ol>
            </nav>

            <h1
              id="detail-heading"
              className="text-3xl md:text-4xl font-extrabold text-white leading-tight"
            >
              Reservation Detail
            </h1>
            <p className="mt-2 text-blue-100 text-base">
              {isSuccess
                ? `SkyNest ${detail!.branch_location_name}`
                : 'SkyNest Hotels'}
            </p>
          </div>
        </section>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <section
          className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-10"
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
                  text-sm text-neutral-500 dark:text-neutral-400
                  hover:text-blue-600 dark:hover:text-blue-400
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
      </main>
    </>
  );
}
