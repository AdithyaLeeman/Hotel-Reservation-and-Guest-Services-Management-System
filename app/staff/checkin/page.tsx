'use client';

/**
 * Staff Check-In Page
 *
 * Allows Receptionists / Managers to find a reservation by ID and perform
 * check-in by calling POST /api/staff/reservations/[id]/checkin.
 *
 * Mock-first: the route handler uses mock data from checkinService.
 * In Phase 6 (P06-M04-T01/T02), the same UI wires to real DB via sp_check_in().
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T16 (Mock-First)
 * Lecture alignment: L07 (RBAC, session context), L08 (atomic procedures)
 */

import { useState } from 'react';

interface CheckinResult {
  reservation_id: string;
  status: string;
}

interface ApiError {
  code: string;
  message: string;
}

export default function CheckInPage(): React.JSX.Element {
  const [reservationId, setReservationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const handleCheckIn = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const trimmedId = reservationId.trim();
    if (!trimmedId) {
      setError({ code: 'VALIDATION_ERROR', message: 'Please enter a Reservation ID.' });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/staff/reservations/${encodeURIComponent(trimmedId)}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json() as
        | { data: CheckinResult; meta: { requestId: string } }
        | { error: ApiError };

      if (!res.ok) {
        const errPayload = (json as { error: ApiError }).error;
        setError(errPayload ?? { code: 'UNKNOWN', message: 'An unexpected error occurred.' });
      } else {
        setResult((json as { data: CheckinResult }).data);
      }
    } catch {
      setError({ code: 'NETWORK_ERROR', message: 'Network error — please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-start px-4 py-12">
      {/* ── Header ── */}
      <div className="w-full max-w-lg mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
          Guest Check-In
        </h1>
        <p className="text-gray-400 text-sm">
          SkyNest Hotels — Staff Portal
        </p>
      </div>

      {/* ── Check-in Form ── */}
      <section
        className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-xl p-8"
        aria-label="Check-in form"
      >
        <form onSubmit={handleCheckIn} id="checkin-form" noValidate>
          <label
            htmlFor="reservation-id-input"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Reservation ID
          </label>
          <input
            id="reservation-id-input"
            type="text"
            value={reservationId}
            onChange={(e) => setReservationId(e.target.value)}
            placeholder="e.g. RES-MOCK-001"
            required
            aria-required="true"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                       transition mb-6"
          />

          <button
            id="checkin-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
                       text-white font-semibold py-3 rounded-lg transition-colors duration-200"
          >
            {loading ? 'Processing…' : 'Confirm Check-In'}
          </button>
        </form>

        {/* ── Success ── */}
        {result && (
          <div
            role="alert"
            aria-live="polite"
            id="checkin-success-banner"
            className="mt-6 bg-green-900/40 border border-green-600 rounded-xl p-5 text-green-300"
          >
            <p className="font-semibold text-green-200 mb-1">✓ Check-In Successful</p>
            <p className="text-sm">
              Reservation <span className="font-mono text-white">{result.reservation_id}</span> is now{' '}
              <span className="font-semibold text-green-300">{result.status}</span>.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              All assigned rooms have been marked as Occupied.
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            id="checkin-error-banner"
            className="mt-6 bg-red-900/40 border border-red-600 rounded-xl p-5 text-red-300"
          >
            <p className="font-semibold text-red-200 mb-1">✗ Check-In Failed</p>
            <p className="text-sm">{error.message}</p>
            {error.code === 'INVALID_STATUS_TRANSITION' && (
              <p className="text-xs text-gray-400 mt-1">
                Only reservations in &quot;Booked&quot; status can be checked in.
              </p>
            )}
            {error.code === 'NOT_FOUND' && (
              <p className="text-xs text-gray-400 mt-1">
                Verify the Reservation ID and try again.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Quick reference ── */}
      <section className="w-full max-w-lg mt-6 text-xs text-gray-500" aria-label="Demo hint">
        <p className="text-center">
          Demo IDs (mock):&nbsp;
          {['RES-MOCK-001', 'RES-MOCK-002', 'RES-MOCK-004'].map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setReservationId(id)}
              className="mx-1 font-mono text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer"
            >
              {id}
            </button>
          ))}
        </p>
        <p className="text-center mt-1">
          Already checked-in (will 409):&nbsp;
          <button
            type="button"
            onClick={() => setReservationId('RES-MOCK-003')}
            className="font-mono text-yellow-500 hover:text-yellow-400 underline underline-offset-2 cursor-pointer"
          >
            RES-MOCK-003
          </button>
        </p>
      </section>
    </main>
  );
}
