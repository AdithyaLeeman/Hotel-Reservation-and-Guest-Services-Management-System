'use client';

/**
 * Public Availability Search Page — /search
 *
 * Owned by: Member 2 (M2) | Task: P02-M02-T13
 * Type: 🟡 MOCK-FIRST — consumes GET /api/availability (currently mock data).
 *
 * Responsibilities:
 *   - Let guests select branch, check-in date, check-out date
 *   - Fetch available rooms from GET /api/availability
 *   - Render results using <RoomCard> components
 *   - Show loading, error, and empty states
 *
 * Business rules (AGENTS.md §5):
 *   - Availability logic runs entirely inside PostgreSQL via fn_get_available_rooms().
 *   - This component NEVER filters or computes availability in JavaScript.
 *   - Rate figures are display-only; no multiplication is performed here.
 *
 * TODO: replace API call with real backend when SP2.2 is executed (P06-M02-T01).
 */

import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import RoomCard from '@/components/RoomCard';
import type { AvailableRoom } from '@/repositories/availability.repository';
import GuestNav from '@/components/GuestNav';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchFormState {
  branchId: string;
  checkIn:  string;
  checkOut: string;
}

interface FormErrors {
  branchId?: string;
  checkIn?:  string;
  checkOut?: string;
  general?:  string;
}

interface SearchResult {
  rooms:           AvailableRoom[];
  checkIn:         string;
  checkOut:        string;
  nightsRequested: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRANCHES = [
  { id: 1, name: 'Colombo' },
  { id: 2, name: 'Kandy'   },
  { id: 3, name: 'Galle'   },
] as const;

/** Today in YYYY-MM-DD, used as the min date for date inputs */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Tomorrow in YYYY-MM-DD, used as the min check-out date */
function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Client-side validation (shape only — semantic validation is in the API)
// ---------------------------------------------------------------------------

function validateForm(form: SearchFormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.branchId) {
    errors.branchId = 'Please select a branch.';
  }
  if (!form.checkIn) {
    errors.checkIn = 'Please enter a check-in date.';
  }
  if (!form.checkOut) {
    errors.checkOut = 'Please enter a check-out date.';
  }
  if (form.checkIn && form.checkOut && form.checkOut <= form.checkIn) {
    errors.checkOut = 'Check-out must be after check-in.';
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SearchPage() {
  const today    = todayIso();
  const tomorrow = tomorrowIso();

  const [form, setForm] = useState<SearchFormState>({
    branchId: '',
    checkIn:  today,
    checkOut: tomorrow,
  });
  const [errors,    setErrors]    = useState<FormErrors>({});
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState<SearchResult | null>(null);
  const [searched,  setSearched]  = useState(false);

  // ── Field change handler ──────────────────────────────────────────────────

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
      // Clear the specific field error on change
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    },
    [],
  );

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrors({});

      const validationErrors = validateForm(form);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setLoading(true);
      setResult(null);
      setSearched(false);

      try {
        const params = new URLSearchParams({
          branchId: form.branchId,
          checkIn:  form.checkIn,
          checkOut: form.checkOut,
        });

        // TODO: replace with real API call once SP2.2 is executed (P06-M02-T01)
        const response = await fetch(`/api/availability?${params.toString()}`);
        const json = await response.json() as
          | { data: SearchResult }
          | { error: { code: string; message: string; fields?: Record<string, string> } };

        if (!response.ok) {
          if ('error' in json) {
            // Map API field errors back to form errors
            if (json.error.fields) {
              setErrors({
                branchId: json.error.fields['branchId'],
                checkIn:  json.error.fields['checkIn'],
                checkOut: json.error.fields['checkOut'],
                general:  json.error.message,
              });
            } else {
              setErrors({ general: json.error.message });
            }
          } else {
            setErrors({ general: 'An unexpected error occurred. Please try again.' });
          }
          return;
        }

        if ('data' in json) {
          setResult(json.data);
        }
      } catch {
        setErrors({ general: 'Could not reach the server. Please check your connection and try again.' });
      } finally {
        setLoading(false);
        setSearched(true);
      }
    },
    [form],
  );

  // ── Derived state ─────────────────────────────────────────────────────────

  const selectedBranch = BRANCHES.find((b) => String(b.id) === form.branchId);
  const hasResults     = result && result.rooms.length > 0;
  const nightsLabel    = result
    ? result.nightsRequested === 1
      ? '1 night'
      : `${result.nightsRequested} nights`
    : '';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Temporary nav (M1 will implement GuestNav fully in P01-M01-T13) ── */}
      <GuestNav />

      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-slate-900">

        {/* ── Hero / search form section ──────────────────────────────── */}
        <section
          aria-labelledby="search-heading"
          className="
            relative overflow-hidden
            bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-700
            dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900
            py-16 px-4 md:px-6 lg:px-8
          "
        >
          {/* Decorative background blobs */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-10 pointer-events-none"
          >
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center mb-10">
            <p className="text-blue-200 text-sm font-medium uppercase tracking-widest mb-3">
              SkyNest Hotels · Colombo · Kandy · Galle
            </p>
            <h1
              id="search-heading"
              className="text-4xl md:text-5xl font-extrabold text-white leading-tight"
            >
              Find Your Perfect Room
            </h1>
            <p className="mt-4 text-blue-100 text-lg max-w-xl mx-auto">
              Search availability across all three SkyNest branches and book instantly.
            </p>
          </div>

          {/* ── Search form card ── */}
          <div className="relative max-w-4xl mx-auto">
            <form
              id="availability-search-form"
              onSubmit={handleSubmit}
              noValidate
              aria-label="Room availability search"
              className="
                bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm
                rounded-2xl shadow-2xl p-6 md:p-8
              "
            >
              {/* General error banner */}
              {errors.general && (
                <div
                  id="search-error-banner"
                  role="alert"
                  aria-live="assertive"
                  className="
                    mb-6 flex items-start gap-3 p-4 rounded-xl
                    bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800
                    text-red-700 dark:text-red-300 text-sm
                  "
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                    className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {errors.general}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* Branch selector */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="search-branch"
                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Branch <span aria-label="required">*</span>
                  </label>
                  <select
                    id="search-branch"
                    name="branchId"
                    value={form.branchId}
                    onChange={handleChange}
                    required
                    aria-required="true"
                    aria-invalid={!!errors.branchId}
                    aria-describedby={errors.branchId ? 'search-branch-error' : undefined}
                    className="
                      w-full px-3 py-2.5 rounded-xl
                      border border-neutral-300 dark:border-neutral-600
                      bg-white dark:bg-neutral-800
                      text-neutral-900 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      aria-invalid:border-red-400 aria-invalid:ring-red-400
                      text-sm
                    "
                  >
                    <option value="" disabled>Select a branch</option>
                    {BRANCHES.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  {errors.branchId && (
                    <p id="search-branch-error" role="alert" className="text-xs text-red-600 dark:text-red-400">
                      {errors.branchId}
                    </p>
                  )}
                </div>

                {/* Check-in date */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="search-check-in"
                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Check-in <span aria-label="required">*</span>
                  </label>
                  <input
                    id="search-check-in"
                    type="date"
                    name="checkIn"
                    value={form.checkIn}
                    min={today}
                    onChange={handleChange}
                    required
                    aria-required="true"
                    aria-invalid={!!errors.checkIn}
                    aria-describedby={errors.checkIn ? 'search-check-in-error' : undefined}
                    className="
                      w-full px-3 py-2.5 rounded-xl
                      border border-neutral-300 dark:border-neutral-600
                      bg-white dark:bg-neutral-800
                      text-neutral-900 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      aria-invalid:border-red-400 aria-invalid:ring-red-400
                      text-sm
                    "
                  />
                  {errors.checkIn && (
                    <p id="search-check-in-error" role="alert" className="text-xs text-red-600 dark:text-red-400">
                      {errors.checkIn}
                    </p>
                  )}
                </div>

                {/* Check-out date */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="search-check-out"
                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Check-out <span aria-label="required">*</span>
                  </label>
                  <input
                    id="search-check-out"
                    type="date"
                    name="checkOut"
                    value={form.checkOut}
                    min={form.checkIn || tomorrow}
                    onChange={handleChange}
                    required
                    aria-required="true"
                    aria-invalid={!!errors.checkOut}
                    aria-describedby={errors.checkOut ? 'search-check-out-error' : undefined}
                    className="
                      w-full px-3 py-2.5 rounded-xl
                      border border-neutral-300 dark:border-neutral-600
                      bg-white dark:bg-neutral-800
                      text-neutral-900 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      aria-invalid:border-red-400 aria-invalid:ring-red-400
                      text-sm
                    "
                  />
                  {errors.checkOut && (
                    <p id="search-check-out-error" role="alert" className="text-xs text-red-600 dark:text-red-400">
                      {errors.checkOut}
                    </p>
                  )}
                </div>

              </div>

              {/* Submit button */}
              <div className="mt-6 flex justify-center md:justify-end">
                <button
                  id="search-submit-btn"
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="
                    inline-flex items-center gap-2
                    px-8 py-3 rounded-xl
                    bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                    disabled:opacity-60 disabled:cursor-not-allowed
                    text-white font-semibold text-sm
                    transition-colors duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                  "
                >
                  {loading ? (
                    <>
                      {/* Spinner */}
                      <svg
                        className="animate-spin w-4 h-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Searching…
                    </>
                  ) : (
                    <>
                      {/* Search icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                        className="w-4 h-4" aria-hidden="true">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      Search Rooms
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ── Results section ─────────────────────────────────────────── */}
        <section
          aria-label="Search results"
          aria-live="polite"
          className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12"
        >
          {/* Results header */}
          {searched && !loading && result && (
            <div id="results-header" className="mb-8 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                {hasResults
                  ? `${result.rooms.length} room${result.rooms.length !== 1 ? 's' : ''} available`
                  : 'No rooms available'}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {selectedBranch?.name} · {result.checkIn} → {result.checkOut} · {nightsLabel}
              </p>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div
              id="search-loading-skeleton"
              role="status"
              aria-label="Loading available rooms"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse bg-white dark:bg-neutral-800 rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="h-2 bg-gradient-to-r from-neutral-200 to-neutral-100 dark:from-neutral-700 dark:to-neutral-600" />
                  <div className="p-6 space-y-4">
                    <div className="flex gap-3">
                      <div className="w-11 h-11 rounded-xl bg-neutral-200 dark:bg-neutral-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/5" />
                        <div className="h-3 bg-neutral-100 dark:bg-neutral-600 rounded w-2/5" />
                      </div>
                    </div>
                    <div className="h-3 bg-neutral-100 dark:bg-neutral-700 rounded w-1/3" />
                    <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
                    <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3" />
                    <div className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Room results grid */}
          {!loading && hasResults && (
            <ul
              id="results-grid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0 m-0"
              aria-label={`${result!.rooms.length} available rooms`}
            >
              {result!.rooms.map((room, i) => (
                <li key={room.room_id}>
                  <RoomCard
                    room={room}
                    checkIn={result!.checkIn}
                    checkOut={result!.checkOut}
                    index={i}
                  />
                </li>
              ))}
            </ul>
          )}

          {/* Empty state */}
          {!loading && searched && result && !hasResults && (
            <div
              id="results-empty-state"
              className="
                flex flex-col items-center justify-center
                py-20 text-center gap-6
              "
            >
              {/* Bed illustration */}
              <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
                  className="w-10 h-10 text-blue-400" aria-hidden="true">
                  <path d="M3 7v10M21 7v10M3 12h18M5 7h14a2 2 0 0 1 2 2v1H3V9a2 2 0 0 1 2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
                  No rooms available
                </h2>
                <p className="mt-2 text-neutral-500 dark:text-neutral-400 max-w-md">
                  All rooms in {selectedBranch?.name ?? 'this branch'} are booked for those dates.
                  Try different dates or choose another branch.
                </p>
              </div>
              <button
                id="search-try-again-btn"
                type="button"
                onClick={() => {
                  setResult(null);
                  setSearched(false);
                  document.getElementById('search-branch')?.focus();
                }}
                className="
                  px-6 py-2.5 rounded-xl
                  border border-blue-300 dark:border-blue-700
                  text-blue-700 dark:text-blue-300
                  hover:bg-blue-50 dark:hover:bg-blue-950
                  text-sm font-medium transition-colors duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                "
              >
                Try Different Dates
              </button>
            </div>
          )}

          {/* Pre-search prompt (before any search is submitted) */}
          {!loading && !searched && (
            <div
              id="search-prompt"
              className="flex flex-col items-center justify-center py-16 text-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
                  className="w-8 h-8 text-indigo-400" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-xs">
                Select a branch and your dates above to see available rooms.
              </p>
            </div>
          )}

        </section>
      </main>
    </>
  );
}
