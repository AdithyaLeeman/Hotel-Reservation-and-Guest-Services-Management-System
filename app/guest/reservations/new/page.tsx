'use client';

/**
 * Guest Booking Form Page — /guest/reservations/new
 *
 * Owned by: Member 3 (M3) | Task: P03-M03-T14
 * Type: MOCK-FIRST — calls POST /api/guest/reservations (currently mock data).
 *
 * Responsibilities:
 *   - Read roomId, checkIn, checkOut from URL search params (set by RoomCard CTA)
 *   - Allow the guest to review the room selection and submit the booking
 *   - Call POST /api/guest/reservations with a validated payload
 *   - On success, redirect to /guest/reservations/[id] (the detail page, T17)
 *   - Handle and display API error states (overlap 409, maintenance 422, etc.)
 *
 * Security invariant:
 *   guest_id is NEVER sent in the request body. It is sourced from the
 *   server-side session inside POST /api/guest/reservations (T11 route handler).
 *
 * Business rules:
 *   - booking_source is always 'Online' for guest-portal bookings (service layer enforces this)
 *   - Availability and overlap checks run entirely in sp_create_reservation() on the DB
 *   - Rate figures are display-only; no price computation happens in this component
 *
 * TODO (P06-M03-T01): Replace mock session stub in the API with real iron-session.
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';
import GuestNav from '@/components/GuestNav';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRANCHES: Record<number, string> = {
  1: 'Colombo',
  2: 'Kandy',
  3: 'Galle',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormErrors {
  roomId?:  string;
  checkIn?: string;
  checkOut?: string;
}

interface ApiErrorResponse {
  error: {
    code:    string;
    message: string;
    fields?: Record<string, string>;
  };
}

interface ApiSuccessResponse {
  data: { reservation_id: string };
  meta: { requestId: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count nights between two ISO date strings. Returns 0 on invalid input. */
function countNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/** Format an ISO date string as "Thu, 01 Oct 2026" — display only. */
function formatDate(iso: string): string {
  if (!iso) return '\u2014';
  const d = new Date(iso + 'T00:00:00'); // avoid UTC-offset day shift
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day:     '2-digit',
    month:   'short',
    year:    'numeric',
  });
}

/** Validate URL search params before rendering the booking form. */
function validateParams(
  roomId:  string | null,
  checkIn: string | null,
  checkOut: string | null,
): FormErrors {
  const errors: FormErrors = {};
  if (!roomId || !/^\d+$/.test(roomId)) {
    errors.roomId = 'No valid room selected. Please go back to the search page.';
  }
  if (!checkIn || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) {
    errors.checkIn = 'Missing or invalid check-in date.';
  }
  if (!checkOut || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    errors.checkOut = 'Missing or invalid check-out date.';
  }
  if (checkIn && checkOut && checkOut <= checkIn) {
    errors.checkOut = 'Check-out date must be after check-in date.';
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Right-column booking summary card (display-only). */
function SummaryCard({
  roomId,
  checkIn,
  checkOut,
  nights,
}: {
  roomId:  string;
  checkIn: string;
  checkOut: string;
  nights:  number;
}) {
  return (
    <div
      id="booking-summary-card"
      aria-label="Booking summary"
      className="
        rounded-2xl overflow-hidden
        border border-neutral-200 dark:border-neutral-700
        bg-white dark:bg-neutral-900 shadow-sm
      "
    >
      {/* Gradient accent bar */}
      <div
        aria-hidden="true"
        className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500"
      />

      <div className="p-6 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
          Booking Summary
        </h2>

        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between items-center gap-4">
            <dt className="text-neutral-500 dark:text-neutral-400">Room</dt>
            <dd
              id="summary-room-id"
              className="
                font-medium text-blue-700 dark:text-blue-300
                bg-blue-50 dark:bg-blue-950
                px-2.5 py-0.5 rounded-full text-xs
              "
            >
              #{roomId}
            </dd>
          </div>

          <div className="flex justify-between items-center gap-4">
            <dt className="text-neutral-500 dark:text-neutral-400">Check-in</dt>
            <dd id="summary-check-in" className="font-medium text-neutral-900 dark:text-white text-right">
              {formatDate(checkIn)}
            </dd>
          </div>

          <div className="flex justify-between items-center gap-4">
            <dt className="text-neutral-500 dark:text-neutral-400">Check-out</dt>
            <dd id="summary-check-out" className="font-medium text-neutral-900 dark:text-white text-right">
              {formatDate(checkOut)}
            </dd>
          </div>

          <hr className="border-neutral-100 dark:border-neutral-800" />

          <div className="flex justify-between items-center gap-4">
            <dt className="text-neutral-500 dark:text-neutral-400">Duration</dt>
            <dd id="summary-nights" className="font-semibold text-neutral-900 dark:text-white">
              {nights} {nights === 1 ? 'night' : 'nights'}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
          Final charges are calculated by the hotel system at checkout and may include applicable taxes.
        </p>
      </div>
    </div>
  );
}

/** Banner shown when URL params are missing or invalid. */
function ParamErrorBanner({ errors }: { errors: FormErrors }) {
  const messages = [errors.roomId, errors.checkIn, errors.checkOut].filter(Boolean) as string[];
  if (messages.length === 0) return null;

  return (
    <div
      id="param-error-banner"
      role="alert"
      aria-live="assertive"
      className="
        flex flex-col gap-2 p-4 rounded-xl
        bg-red-50 dark:bg-red-950
        border border-red-200 dark:border-red-800
        text-red-700 dark:text-red-300 text-sm
      "
    >
      <p className="font-medium">Invalid booking parameters</p>
      <ul className="list-disc list-inside space-y-1">
        {messages.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <Link
        href="/search"
        id="back-to-search-param-error"
        className="
          mt-1 inline-flex items-center gap-1.5
          text-sm font-medium underline underline-offset-2 hover:no-underline
        "
      >
        &larr; Back to room search
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function NewReservationPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // Read URL params (set by RoomCard reserve CTA)
  const rawRoomId   = searchParams.get('roomId');
  const rawCheckIn  = searchParams.get('checkIn');
  const rawCheckOut = searchParams.get('checkOut');
  const rawBranchId = searchParams.get('branchId');

  // Validate params directly during render (validateParams is a pure function — no side effects)
  const paramErrors = validateParams(rawRoomId, rawCheckIn, rawCheckOut);
  const paramsValid = Object.keys(paramErrors).length === 0;

  // Submission state
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted]     = useState(false);

  // Derived safe values (only used when paramsValid === true)
  const roomId   = rawRoomId   ?? '';
  const checkIn  = rawCheckIn  ?? '';
  const checkOut = rawCheckOut ?? '';
  const nights   = countNights(checkIn, checkOut);
  const branchId = rawBranchId ? parseInt(rawBranchId, 10) : null;
  const branchName = branchId !== null ? (BRANCHES[branchId] ?? null) : null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paramsValid || submitting || submitted) return;

    setSubmitError(null);
    setSubmitting(true);

    try {
      /**
       * POST /api/guest/reservations
       *
       * Payload matches CreateReservationSchema (lib/validation/reservation.schema.ts).
       * guest_id is NEVER in the body — sourced from session by the route handler.
       * booking_source 'Online' is enforced again by the service layer for guest paths.
       */
      const payload = {
        branch_id:      branchId ?? 1,          // branchId from URL; fallback for safety
        check_in_date:  checkIn,
        check_out_date: checkOut,
        room_ids:       [parseInt(roomId, 10)],
        booking_source: 'Online' as const,
        // discount_percentage omitted — guests cannot self-apply discounts
      };

      const response = await fetch('/api/guest/reservations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const json = (await response.json()) as ApiSuccessResponse | ApiErrorResponse;

      if (!response.ok) {
        const apiErr = (json as ApiErrorResponse).error;
        if (response.status === 409) {
          setSubmitError(
            apiErr?.message ??
            'This room is no longer available for the selected dates. Please choose different dates or another room.',
          );
        } else if (response.status === 422) {
          setSubmitError(
            apiErr?.message ??
            'The room cannot be reserved (it may be under maintenance or in a different branch).',
          );
        } else if (response.status === 401) {
          setSubmitError('You must be logged in to make a reservation.');
        } else {
          setSubmitError(apiErr?.message ?? 'An unexpected error occurred. Please try again.');
        }
        return;
      }

      const { reservation_id } = (json as ApiSuccessResponse).data;
      setSubmitted(true);

      // Redirect to booking confirmation page (T15 — /guest/book/confirm?id=...)
      // T15 then provides a link forward to the full detail page (T17)
      router.push(`/guest/book/confirm?id=${reservation_id}`);
    } catch {
      setSubmitError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

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
        {/* ── Hero header ────────────────────────────────────────────── */}
        <section
          aria-labelledby="book-heading"
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
                <li aria-current="page" className="text-white font-medium">
                  Confirm Booking
                </li>
              </ol>
            </nav>

            <h1
              id="book-heading"
              className="text-3xl md:text-4xl font-extrabold text-white leading-tight"
            >
              Confirm Your Booking
            </h1>
            <p className="mt-2 text-blue-100 text-base">
              {branchName
                ? `SkyNest Hotels \u00b7 ${branchName} Branch`
                : 'SkyNest Hotels'}
            </p>
          </div>
        </section>

        {/* ── Main content ───────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-10">

          {/* Invalid params — show error and stop */}
          {!paramsValid && <ParamErrorBanner errors={paramErrors} />}

          {/* Valid params — show booking form */}
          {paramsValid && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">

              {/* ── Left column: form ─────────────────────────────────── */}
              <div className="md:col-span-3 flex flex-col gap-6">

                {/* Submit error banner */}
                {submitError && (
                  <div
                    id="submit-error-banner"
                    role="alert"
                    aria-live="assertive"
                    className="
                      flex items-start gap-3 p-4 rounded-xl
                      bg-red-50 dark:bg-red-950
                      border border-red-200 dark:border-red-800
                      text-red-700 dark:text-red-300 text-sm
                    "
                  >
                    {/* Alert icon */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Booking form card */}
                <form
                  id="booking-form"
                  onSubmit={handleSubmit}
                  noValidate
                  aria-label="Room booking confirmation form"
                  className="
                    bg-white dark:bg-neutral-900
                    border border-neutral-200 dark:border-neutral-700
                    rounded-2xl shadow-sm p-6 md:p-8
                    flex flex-col gap-6
                  "
                >
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                      Booking Details
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                      Review the details below. By confirming, you agree to
                      SkyNest&apos;s reservation policy.
                    </p>
                  </div>

                  {/* Read-only detail rows */}
                  <dl className="flex flex-col gap-4 text-sm">

                    {/* Room */}
                    <div className="flex flex-col gap-1">
                      <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Room
                      </dt>
                      <dd
                        id="form-room-id"
                        className="flex items-center gap-2 text-neutral-900 dark:text-white font-medium"
                      >
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
                        Room #{roomId}
                      </dd>
                    </div>

                    {/* Dates grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Check-in
                        </dt>
                        <dd id="form-check-in" className="text-neutral-900 dark:text-white font-medium">
                          {formatDate(checkIn)}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-1">
                        <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Check-out
                        </dt>
                        <dd id="form-check-out" className="text-neutral-900 dark:text-white font-medium">
                          {formatDate(checkOut)}
                        </dd>
                      </div>
                    </div>

                    {/* Branch */}
                    {branchName && (
                      <div className="flex flex-col gap-1">
                        <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Branch
                        </dt>
                        <dd id="form-branch" className="text-neutral-900 dark:text-white font-medium">
                          SkyNest {branchName}
                        </dd>
                      </div>
                    )}

                    {/* Duration */}
                    <div className="flex flex-col gap-1">
                      <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Duration
                      </dt>
                      <dd id="form-duration" className="text-neutral-900 dark:text-white font-medium">
                        {nights} {nights === 1 ? 'night' : 'nights'}
                      </dd>
                    </div>
                  </dl>

                  <hr className="border-neutral-100 dark:border-neutral-800" />

                  {/* Pricing notice */}
                  <div
                    className="
                      flex items-start gap-3 p-3 rounded-xl
                      bg-blue-50 dark:bg-blue-950
                      border border-blue-100 dark:border-blue-900
                      text-blue-700 dark:text-blue-300 text-xs
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
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>
                      Your final bill &mdash; including nightly rate, applicable taxes, and
                      any additional services &mdash; will be generated at checkout by
                      our hotel system.
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Link
                      href="/search"
                      id="booking-cancel-btn"
                      className="
                        flex-1 text-center px-6 py-3 rounded-xl
                        border border-neutral-300 dark:border-neutral-600
                        text-neutral-700 dark:text-neutral-300
                        hover:bg-neutral-50 dark:hover:bg-neutral-800
                        text-sm font-medium transition-colors duration-200
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400
                      "
                    >
                      &larr; Back to Search
                    </Link>

                    <button
                      id="booking-confirm-btn"
                      type="submit"
                      disabled={submitting || submitted}
                      aria-busy={submitting}
                      className="
                        flex-1 inline-flex items-center justify-center gap-2
                        px-6 py-3 rounded-xl
                        bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                        disabled:opacity-60 disabled:cursor-not-allowed
                        text-white font-semibold text-sm
                        transition-colors duration-200
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                      "
                    >
                      {submitting ? (
                        <>
                          <svg
                            className="animate-spin w-4 h-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <circle
                              className="opacity-25"
                              cx="12" cy="12" r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8H4z"
                            />
                          </svg>
                          Confirming&hellip;
                        </>
                      ) : submitted ? (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-4 h-4"
                            aria-hidden="true"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Booking Confirmed!
                        </>
                      ) : (
                        <>
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
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                            <polyline points="9 16 11 18 15 14" />
                          </svg>
                          Confirm Booking
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center leading-relaxed">
                  Mock-first mode active &mdash; booking uses in-memory data.
                  Real DB wired in Phase 6 (P06-M03-T01).
                </p>
              </div>

              {/* ── Right column: summary + nav ────────────────────────── */}
              <aside className="md:col-span-2" aria-label="Booking overview">
                <SummaryCard
                  roomId={roomId}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  nights={nights}
                />

                <nav
                  aria-label="Quick links"
                  className="mt-4 flex flex-col gap-2 text-sm"
                >
                  <Link
                    href="/search"
                    id="sidebar-search-link"
                    className="
                      flex items-center gap-2 px-4 py-2.5 rounded-xl
                      text-neutral-600 dark:text-neutral-400
                      hover:bg-white dark:hover:bg-neutral-800
                      hover:text-blue-600 dark:hover:text-blue-400
                      border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700
                      transition-all duration-200
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
                    Search Other Rooms
                  </Link>

                  <Link
                    href="/guest/reservations"
                    id="sidebar-reservations-link"
                    className="
                      flex items-center gap-2 px-4 py-2.5 rounded-xl
                      text-neutral-600 dark:text-neutral-400
                      hover:bg-white dark:hover:bg-neutral-800
                      hover:text-blue-600 dark:hover:text-blue-400
                      border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700
                      transition-all duration-200
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
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    My Reservations
                  </Link>
                </nav>
              </aside>

            </div>
          )}
        </section>
      </main>
    </>
  );
}
