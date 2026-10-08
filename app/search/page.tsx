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

import { useState, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import RoomCard from '@/components/RoomCard';
import type { AvailableRoom } from '@/repositories/availability.repository';

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

export const KNOWN_AMENITIES = [
  'Wi-Fi',
  'Air Conditioning',
  'Mini Bar',
  'Ocean View',
  'Jacuzzi',
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
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [errors,    setErrors]    = useState<FormErrors>({});
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState<SearchResult | null>(null);
  const [searched,  setSearched]  = useState(false);

  // ── Amenity toggle handler ───────────────────────────────────────────────

  const toggleAmenity = useCallback((amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  }, []);

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
        if (selectedAmenities.length > 0) {
          params.set('amenities', selectedAmenities.join(','));
        }

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

      <main className="min-h-screen bg-[#faf8f5] dark:bg-[#121110] text-[#1c1917] dark:text-[#f8f6f0]">

        {/* ── Hero / search form section ──────────────────────────────── */}
        <section
          aria-labelledby="search-heading"
          className="
            relative overflow-hidden
            bg-[#141312] text-white
            pt-16 pb-20 px-4 md:px-6 lg:px-8
            border-b border-[#2e2a24]
          "
        >
          {/* Subtle luxury ambient background */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none opacity-20"
          >
            <img
              src="https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=2000&q=80"
              alt=""
              className="w-full h-full object-cover filter blur-xs"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141312] via-[#141312]/80 to-[#141312]/90" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center mb-10">
            <div className="flex items-center justify-center gap-1 text-[#c5a880] text-xs mb-3">
              <span>★★★★★</span>
              <span className="mx-2 opacity-50">·</span>
              <span className="uppercase tracking-[0.25em] font-medium text-[11px]">
                Colombo · Kandy · Galle
              </span>
            </div>
            <h1
              id="search-heading"
              className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal text-white leading-tight"
            >
              Discover Available Rooms &amp; Suites
            </h1>
            <p className="mt-4 text-[#c5a880]/90 text-sm sm:text-base max-w-xl mx-auto font-light">
              Check real-time room availability across SkyNest properties with guaranteed transparent billing.
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
                bg-[#181716] border border-[#38332c]
                rounded-xs shadow-2xl p-6 md:p-8
              "
            >
              {/* General error banner */}
              {errors.general && (
                <div
                  id="search-error-banner"
                  role="alert"
                  aria-live="assertive"
                  className="
                    mb-6 flex items-start gap-3 p-4 rounded-xs
                    bg-[#2d1212] border border-[#6b2525]
                    text-[#ff9c9c] text-xs uppercase tracking-wider
                  "
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                    className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#ff7575]" aria-hidden="true">
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
                    className="text-xs uppercase tracking-[0.16em] font-semibold text-[#c5a880]"
                  >
                    Destination <span aria-label="required">*</span>
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
                      w-full px-3.5 py-3 rounded-xs
                      border border-[#3e3932]
                      bg-[#242220]
                      text-white
                      focus:outline-none focus:border-[#c5a880]
                      aria-invalid:border-red-500
                      text-xs tracking-wider
                    "
                  >
                    <option value="" disabled className="bg-[#181716]">Select a property</option>
                    {BRANCHES.map((b) => (
                      <option key={b.id} value={b.id} className="bg-[#181716]">{b.name} SkyNest Hotel</option>
                    ))}
                  </select>
                  {errors.branchId && (
                    <p id="search-branch-error" role="alert" className="text-xs text-red-400 mt-1">
                      {errors.branchId}
                    </p>
                  )}
                </div>

                {/* Check-in date */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="search-check-in"
                    className="text-xs uppercase tracking-[0.16em] font-semibold text-[#c5a880]"
                  >
                    Check-in Date <span aria-label="required">*</span>
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
                      w-full px-3.5 py-3 rounded-xs
                      border border-[#3e3932]
                      bg-[#242220]
                      text-white
                      focus:outline-none focus:border-[#c5a880]
                      aria-invalid:border-red-500
                      text-xs tracking-wider
                    "
                  />
                  {errors.checkIn && (
                    <p id="search-check-in-error" role="alert" className="text-xs text-red-400 mt-1">
                      {errors.checkIn}
                    </p>
                  )}
                </div>

                {/* Check-out date */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="search-check-out"
                    className="text-xs uppercase tracking-[0.16em] font-semibold text-[#c5a880]"
                  >
                    Check-out Date <span aria-label="required">*</span>
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
                      w-full px-3.5 py-3 rounded-xs
                      border border-[#3e3932]
                      bg-[#242220]
                      text-white
                      focus:outline-none focus:border-[#c5a880]
                      aria-invalid:border-red-500
                      text-xs tracking-wider
                    "
                  />
                  {errors.checkOut && (
                    <p id="search-check-out-error" role="alert" className="text-xs text-red-400 mt-1">
                      {errors.checkOut}
                    </p>
                  )}
                </div>

              </div>

              {/* Submit button */}
              <div className="mt-8 flex justify-center md:justify-end">
                <button
                  id="search-submit-btn"
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="
                    inline-flex items-center gap-2.5
                    px-8 py-3.5 rounded-xs
                    bg-[#c5a880] hover:bg-[#b59469] active:bg-[#a68042]
                    disabled:opacity-60 disabled:cursor-not-allowed
                    text-[#161514] font-semibold text-xs uppercase tracking-[0.18em]
                    transition-all duration-200 shadow-md cursor-pointer
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a880] focus-visible:ring-offset-2
                  "
                >
                  {loading ? (
                    <>
                      {/* Spinner */}
                      <svg
                        className="animate-spin w-4 h-4 text-[#161514]"
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
                      Search Available Rooms
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
          className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-16"
        >
          {/* Results header */}
          {searched && !loading && result && (
            <div id="results-header" className="mb-10 pb-4 border-b border-[#e7e2d9] dark:border-[#2f2b26] flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
              <div>
                <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#c5a880]">
                  AVAILABILITY RESULTS
                </span>
                <h2 className="font-serif text-3xl font-medium text-[#1c1917] dark:text-[#f8f6f0] mt-1">
                  {hasResults
                    ? `${result.rooms.length} Room${result.rooms.length !== 1 ? 's' : ''} Available`
                    : 'No Rooms Available'}
                </h2>
              </div>
              <p className="text-xs uppercase tracking-wider text-[#78716c] dark:text-[#a8a29e]">
                {selectedBranch?.name} Property · {result.checkIn} → {result.checkOut} ({nightsLabel})
              </p>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div
              id="search-loading-skeleton"
              role="status"
              aria-label="Loading available rooms"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse bg-white dark:bg-[#1a1918] border border-[#e7e2d9] dark:border-[#2f2b26] rounded-xs shadow-sm overflow-hidden"
                >
                  <div className="aspect-[16/10] bg-[#e7e2d9]/60 dark:bg-[#282624]" />
                  <div className="p-6 space-y-4">
                    <div className="h-3 bg-[#c5a880]/30 rounded w-1/4" />
                    <div className="h-6 bg-[#e7e2d9] dark:bg-[#2e2a26] rounded w-3/5" />
                    <div className="h-3 bg-[#e7e2d9] dark:bg-[#2e2a26] rounded w-1/2" />
                    <div className="h-px bg-[#f0ece5] dark:border-[#2f2b26]" />
                    <div className="h-9 bg-[#c5a880]/20 rounded-xs" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Room results grid */}
          {!loading && hasResults && (
            <ul
              id="results-grid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 list-none p-0 m-0"
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
                py-20 text-center gap-6 max-w-lg mx-auto
              "
            >
              {/* Bed illustration */}
              <div className="w-20 h-20 rounded-full bg-[#c5a880]/15 border border-[#c5a880]/40 flex items-center justify-center text-[#c5a880]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
                  className="w-10 h-10" aria-hidden="true">
                  <path d="M3 7v10M21 7v10M3 12h18M5 7h14a2 2 0 0 1 2 2v1H3V9a2 2 0 0 1 2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="font-serif text-2xl font-medium text-[#1c1917] dark:text-[#f8f6f0]">
                  No Rooms Available
                </h2>
                <p className="mt-2 text-[#78716c] dark:text-[#a8a29e] text-sm font-light">
                  All rooms at our {selectedBranch?.name ?? 'selected'} property are reserved for those dates.
                  Please adjust your travel dates or consider one of our other island sanctuaries.
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
                  gold-btn-outline py-3 px-6 text-xs uppercase tracking-[0.16em]
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
              className="flex flex-col items-center justify-center py-20 text-center gap-4 max-w-sm mx-auto"
            >
              <div className="w-16 h-16 rounded-full bg-[#c5a880]/15 border border-[#c5a880]/30 flex items-center justify-center text-[#c5a880]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
                  className="w-7 h-7" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <p className="font-serif text-lg text-[#1c1917] dark:text-[#f8f6f0]">
                Plan Your Sanctuary Stay
              </p>
              <p className="text-[#78716c] dark:text-[#a8a29e] text-xs font-light tracking-wide">
                Select your preferred destination and stay dates above to explore available suites and seasonal rates.
              </p>
            </div>
          )}

        </section>
      </main>
    </>
  );
}
