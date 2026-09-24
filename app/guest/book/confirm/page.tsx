'use client';

/**
 * Booking Confirmation Page — /guest/book/confirm?id={reservation_id}
 *
 * Owned by: Member 3 (M3) | Task: P03-M03-T15
 * Type: MOCK-FIRST — no API call needed; reservation_id comes from T14's POST response.
 *
 * Responsibilities:
 *   - Read reservation_id from the URL query param `id` (set by T14 on success)
 *   - Show a success confirmation banner with the booking reference
 *   - Provide CTAs to view the full reservation detail (T17) or book another room
 *   - Show a clear error state if `id` is missing or malformed
 *
 * Intentionally lightweight:
 *   This page is a success landing, NOT a detail view. No API call is made here.
 *   Full reservation detail is shown on /guest/reservations/[id] (T17).
 *
 * Flow:
 *   /search → RoomCard → /guest/reservations/new (T14) → /guest/book/confirm (T15)
 *                                                               ↓
 *                                              /guest/reservations/[id] (T17)
 */

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import GuestNav from '@/components/GuestNav';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Shown when the `id` param is missing or invalid. */
function MissingIdBanner() {
  return (
    <div
      id="confirm-missing-id-banner"
      role="alert"
      className="
        flex flex-col items-center gap-4 py-20 text-center
      "
    >
      <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-10 h-10 text-red-400"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
          No booking reference found
        </h2>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400 max-w-sm">
          This page requires a valid booking reference. You may have arrived here
          directly — please use the search page to make a new reservation.
        </p>
      </div>

      <Link
        href="/search"
        id="missing-id-search-link"
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
// Page component
// ---------------------------------------------------------------------------

export default function BookingConfirmPage() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('id');

  // Validate: id must be present and non-empty
  const isValid = Boolean(reservationId && reservationId.trim().length > 0);

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
          aria-labelledby="confirm-heading"
          className="
            relative overflow-hidden
            bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700
            dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-900
            py-12 px-4 md:px-6 lg:px-8
          "
        >
          {/* Decorative blobs */}
          <div aria-hidden="true" className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex items-center gap-2 text-sm text-emerald-200 list-none p-0 m-0">
                <li>
                  <Link
                    href="/search"
                    id="breadcrumb-search"
                    className="hover:text-white transition-colors duration-200"
                  >
                    Search
                  </Link>
                </li>
                <li aria-hidden="true" className="text-emerald-400">&rsaquo;</li>
                <li>
                  <Link
                    href="/guest/reservations/new"
                    id="breadcrumb-book"
                    className="hover:text-white transition-colors duration-200"
                  >
                    Book Room
                  </Link>
                </li>
                <li aria-hidden="true" className="text-emerald-400">&rsaquo;</li>
                <li aria-current="page" className="text-white font-medium">
                  Confirmation
                </li>
              </ol>
            </nav>

            <div className="flex items-center gap-4">
              {/* Success icon */}
              <div
                aria-hidden="true"
                className="
                  flex-shrink-0 flex items-center justify-center
                  w-14 h-14 rounded-full
                  bg-white/20 backdrop-blur-sm
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-7 h-7 text-white"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div>
                <h1
                  id="confirm-heading"
                  className="text-3xl md:text-4xl font-extrabold text-white leading-tight"
                >
                  Booking Confirmed!
                </h1>
                <p className="mt-1 text-emerald-100 text-base">
                  SkyNest Hotels &mdash; your reservation has been created successfully.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-10">

          {/* Missing / invalid id */}
          {!isValid && <MissingIdBanner />}

          {/* Valid confirmation */}
          {isValid && (
            <div className="flex flex-col gap-6">

              {/* Booking reference card */}
              <div
                id="confirm-reference-card"
                className="
                  bg-white dark:bg-neutral-900
                  border border-neutral-200 dark:border-neutral-700
                  rounded-2xl shadow-sm overflow-hidden
                "
              >
                {/* Gradient accent bar — green to match hero */}
                <div
                  aria-hidden="true"
                  className="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                />

                <div className="p-6 md:p-8 flex flex-col gap-5">

                  {/* Success message */}
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="
                        flex-shrink-0 flex items-center justify-center
                        w-10 h-10 rounded-full
                        bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400
                      "
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <div>
                      <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                        Your reservation is confirmed
                      </h2>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                        A confirmation has been recorded in our system. You can view the full
                        details at any time from your reservations page.
                      </p>
                    </div>
                  </div>

                  <hr className="border-neutral-100 dark:border-neutral-800" />

                  {/* Booking reference */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Booking Reference
                    </p>
                    <div className="flex items-center gap-3">
                      <code
                        id="confirm-reservation-id"
                        className="
                          flex-1 px-4 py-3 rounded-xl
                          bg-neutral-50 dark:bg-neutral-800
                          border border-neutral-200 dark:border-neutral-700
                          font-mono text-sm text-neutral-800 dark:text-neutral-200
                          break-all
                        "
                        aria-label={`Booking reference: ${reservationId}`}
                      >
                        {reservationId}
                      </code>
                    </div>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      Keep this reference for your records. You may need it at check-in.
                    </p>
                  </div>

                  <hr className="border-neutral-100 dark:border-neutral-800" />

                  {/* What happens next */}
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      What happens next?
                    </p>
                    <ol className="flex flex-col gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <li className="flex items-start gap-2.5">
                        <span
                          aria-hidden="true"
                          className="
                            flex-shrink-0 flex items-center justify-center
                            w-5 h-5 rounded-full mt-0.5
                            bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300
                            text-xs font-bold
                          "
                        >
                          1
                        </span>
                        Present your booking reference at the front desk on arrival.
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span
                          aria-hidden="true"
                          className="
                            flex-shrink-0 flex items-center justify-center
                            w-5 h-5 rounded-full mt-0.5
                            bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300
                            text-xs font-bold
                          "
                        >
                          2
                        </span>
                        Staff will verify your identity and complete the check-in process.
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span
                          aria-hidden="true"
                          className="
                            flex-shrink-0 flex items-center justify-center
                            w-5 h-5 rounded-full mt-0.5
                            bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300
                            text-xs font-bold
                          "
                        >
                          3
                        </span>
                        Additional services and final billing are settled at checkout.
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* CTA buttons */}
              <div
                id="confirm-cta-row"
                className="flex flex-col sm:flex-row gap-3"
              >
                {/* Primary: view full reservation detail (T17) */}
                <Link
                  href={`/guest/reservations/${reservationId}`}
                  id="confirm-view-reservation-btn"
                  className="
                    flex-1 inline-flex items-center justify-center gap-2
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
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  View Reservation
                </Link>

                {/* Secondary: go to My Reservations list */}
                <Link
                  href="/guest/reservations"
                  id="confirm-my-reservations-btn"
                  className="
                    flex-1 inline-flex items-center justify-center gap-2
                    px-6 py-3 rounded-xl
                    border border-neutral-300 dark:border-neutral-600
                    text-neutral-700 dark:text-neutral-300
                    hover:bg-neutral-50 dark:hover:bg-neutral-800
                    text-sm font-medium
                    transition-colors duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400
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
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  My Reservations
                </Link>

                {/* Tertiary: book another room */}
                <Link
                  href="/search"
                  id="confirm-book-another-btn"
                  className="
                    flex-1 inline-flex items-center justify-center gap-2
                    px-6 py-3 rounded-xl
                    border border-neutral-300 dark:border-neutral-600
                    text-neutral-700 dark:text-neutral-300
                    hover:bg-neutral-50 dark:hover:bg-neutral-800
                    text-sm font-medium
                    transition-colors duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400
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
                  Book Another Room
                </Link>
              </div>

              {/* Mock-first note */}
              <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center leading-relaxed">
                Mock-first mode active &mdash; reservation ID shown is from in-memory data.
                Real DB wired in Phase 6 (P06-M03-T01).
              </p>

            </div>
          )}
        </section>
      </main>
    </>
  );
}
