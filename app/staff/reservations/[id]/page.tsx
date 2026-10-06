/**
 * Page: /staff/reservations/[id]
 *
 * Staff Reservation Detail — allows Receptionist/Manager/Admin to view
 * the full details of a single reservation and perform lifecycle actions:
 *   - Check In  (Booked -> CheckedIn)
 *   - Cancel    (Booked -> Cancelled)
 *   - Check Out (CheckedIn -> CheckedOut)
 *   - Navigate to Service Logging (CheckedIn)
 *
 * This is a Client Component because it needs:
 *   - useParams-style params unwrapped via React.use()
 *   - useState / useEffect for fetch-on-mount and action outcomes
 *   - Confirmation modal for destructive / state-changing actions
 *
 * API consumed:
 *   GET   /api/staff/reservations/[id]          -> { data: ReservationDetail }
 *   PATCH /api/staff/reservations/[id]/cancel   -> { data: { reservation_status } }
 *   POST  /api/staff/reservations/[id]/checkin  -> { data: { status } }
 *   POST  /api/staff/reservations/[id]/checkout -> { data: { status } }
 *
 * Layout note:
 *   StaffNav is rendered by app/staff/layout.tsx -- do NOT add it here.
 *
 * Owned by: Member 3 (M3) | Task: P03-M03-T22 (Mock-First)
 * Lecture alignment: L06 (REST), L07 (RBAC, branch scoping)
 */

'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import type { ReservationDetail, ReservationRoomDetail } from '@/repositories/reservation.repository';
import type { ReservationStatus } from '@/types/enums';

/* ---- Types ---------------------------------------------------------------- */

type LoadState = 'loading' | 'success' | 'not_found' | 'error';

type ActionKind = 'checkin' | 'cancel' | 'checkout';

type ActionState =
  | { stage: 'idle' }
  | { stage: 'confirming'; kind: ActionKind }
  | { stage: 'submitting'; kind: ActionKind }
  | { stage: 'error'; kind: ActionKind; message: string };

interface ApiSuccess {
  data: ReservationDetail;
  meta: { requestId: string };
}

interface ApiError {
  error: { code: string; message: string };
}

/* ---- Constants ------------------------------------------------------------ */

const STATUS_BADGE_CLASS: Record<ReservationStatus, string> = {
  Booked:     'badge badge-booked',
  CheckedIn:  'badge badge-checked-in',
  CheckedOut: 'badge badge-checked-out',
  Cancelled:  'badge badge-cancelled',
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  Booked:     'Booked',
  CheckedIn:  'Checked In',
  CheckedOut: 'Checked Out',
  Cancelled:  'Cancelled',
};

const ACTION_LABEL: Record<ActionKind, string> = {
  checkin:  'Check In',
  cancel:   'Cancel Reservation',
  checkout: 'Check Out',
};

/* ---- Helpers -------------------------------------------------------------- */

/** Format ISO date string as "01 Oct 2026" */
function formatDate(iso: string): string {
  if (!iso) return '\u2014';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

/** Format ISO timestamp as "01 Oct 2026, 10:30 AM" */
function formatDateTime(iso: string): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-GB', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

/** Calculate number of nights between two ISO date strings */
function countNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/** Format NUMERIC(12,2) string as "LKR XX,XXX.XX" */
function formatRate(rate: string): string {
  const num = parseFloat(rate);
  if (isNaN(num)) return 'LKR \u2014';
  return 'LKR ' + num.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ---- Sub-components ------------------------------------------------------- */

/** Skeleton shown while loading */
function LoadingSkeleton() {
  return (
    <div
      id="reservation-detail-loading"
      role="status"
      aria-label="Loading reservation details"
      className="animate-pulse flex flex-col gap-6"
    >
      <span className="sr-only">Loading reservation details&hellip;</span>

      {/* Header skeleton */}
      <div className="card p-6 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="h-5 bg-[var(--color-bg-subtle)] rounded w-48" />
          <div className="h-6 bg-[var(--color-bg-subtle)] rounded-full w-24" />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="h-4 bg-[var(--color-bg-subtle)] rounded w-4/5" />
          <div className="h-4 bg-[var(--color-bg-subtle)] rounded w-4/5" />
          <div className="h-4 bg-[var(--color-bg-subtle)] rounded w-3/5" />
          <div className="h-4 bg-[var(--color-bg-subtle)] rounded w-3/5" />
        </div>
      </div>

      {/* Actions skeleton */}
      <div className="flex gap-3">
        <div className="h-9 bg-[var(--color-bg-subtle)] rounded-lg w-28" />
        <div className="h-9 bg-[var(--color-bg-subtle)] rounded-lg w-36" />
      </div>

      {/* Rooms skeleton */}
      <div className="card p-6 flex flex-col gap-3">
        <div className="h-4 bg-[var(--color-bg-subtle)] rounded w-1/4" />
        <div className="h-10 bg-[var(--color-bg-subtle)] rounded-lg" />
        <div className="h-10 bg-[var(--color-bg-subtle)] rounded-lg" />
      </div>
    </div>
  );
}

/** Shown when the reservation is not found (404) */
function NotFoundState() {
  return (
    <div
      id="reservation-detail-not-found"
      className="flex flex-col items-center justify-center py-24 text-center gap-5"
    >
      <span
        aria-hidden="true"
        className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--color-bg-subtle)]"
      >
        <svg
          className="w-8 h-8 text-[var(--color-text-subtle)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="11" />
          <line x1="11" y1="14" x2="11.01" y2="14" />
        </svg>
      </span>

      <div>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">
          Reservation not found
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)] max-w-sm">
          This reservation does not exist or you do not have access to view it.
        </p>
      </div>

      <Link
        href="/staff/reservations"
        id="not-found-back-btn"
        className="btn btn-outline"
      >
        &larr; Back to Reservations
      </Link>
    </div>
  );
}

/** Shown on fetch error, with retry button */
function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      id="reservation-detail-error"
      role="alert"
      className="card p-8 flex flex-col items-center justify-center gap-4 text-center"
    >
      <span
        aria-hidden="true"
        className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--color-error-bg)]"
      >
        <svg
          className="w-6 h-6 text-[var(--color-error)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>

      <div>
        <p className="font-semibold text-[var(--color-text)]">
          Failed to load reservation
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-sm">
          {message}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          id="detail-retry-btn"
          type="button"
          onClick={onRetry}
          className="btn btn-primary"
        >
          Try Again
        </button>
        <Link
          href="/staff/reservations"
          id="error-back-btn"
          className="btn btn-ghost"
        >
          &larr; Reservations
        </Link>
      </div>
    </div>
  );
}

/** A single key-value detail row inside a dl grid */
function DetailRow({
  label,
  id,
  value,
}: {
  label: string;
  id: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider mb-0.5">
        {label}
      </dt>
      <dd
        id={id}
        className="text-sm font-medium text-[var(--color-text)] break-words"
      >
        {value ?? <span className="text-[var(--color-text-subtle)]">&mdash;</span>}
      </dd>
    </div>
  );
}

/** Rooms table in the detail view */
function RoomsTable({ rooms }: { rooms: ReservationRoomDetail[] }) {
  if (rooms.length === 0) {
    return (
      <p
        id="rooms-empty"
        className="p-6 text-sm text-[var(--color-text-muted)] italic"
      >
        No room records found for this reservation.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        id="reservation-rooms-table"
        className="min-w-full text-left"
        aria-label="Assigned rooms"
      >
        <thead>
          <tr className="bg-[var(--color-bg-subtle)]">
            {['Room Number', 'Type', 'Captured Rate / Night'].map((col) => (
              <th
                key={col}
                scope="col"
                className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {rooms.map((room) => (
            <tr
              key={room.room_id}
              id={`room-row-${room.room_id}`}
              className="hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <td className="px-4 py-3 text-sm font-semibold text-[var(--color-text)] whitespace-nowrap">
                Room {room.room_number}
              </td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-muted)] whitespace-nowrap">
                {room.type_name}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-[var(--color-text)] whitespace-nowrap text-right">
                {formatRate(room.rate_per_night)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-2.5 text-xs text-[var(--color-text-subtle)] border-t border-[var(--color-border)]">
        Rates shown are the historical snapshot captured at booking time.
        Final billing is calculated at checkout by the hotel system.
      </p>
    </div>
  );
}

/** Confirmation dialog for state-changing actions */
function ConfirmModal({
  kind,
  actionState,
  onConfirm,
  onCancel,
  reservationId,
}: {
  kind: ActionKind;
  actionState: ActionState;
  onConfirm: () => void;
  onCancel: () => void;
  reservationId: string;
}) {
  const isSubmitting = actionState.stage === 'submitting';
  const hasError     = actionState.stage === 'error' && actionState.kind === kind;

  const TITLE: Record<ActionKind, string> = {
    checkin:  'Confirm Check-In',
    cancel:   'Confirm Cancellation',
    checkout: 'Confirm Check-Out',
  };

  const BODY: Record<ActionKind, string> = {
    checkin:
      'This will mark the reservation as Checked In and set all assigned rooms to Occupied. This cannot be undone.',
    cancel:
      'This will permanently cancel the reservation. Only "Booked" reservations can be cancelled. This cannot be undone.',
    checkout:
      'This will mark the reservation as Checked Out and release all assigned rooms. Ensure the balance is fully settled first.',
  };

  const SUBMITTING_LABEL: Record<ActionKind, string> = {
    checkin:  'Checking In\u2026',
    cancel:   'Cancelling\u2026',
    checkout: 'Checking Out\u2026',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      id={`confirm-modal-${kind}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onCancel();
      }}
    >
      <div
        className="card p-0 w-full max-w-md shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2
            id="modal-title"
            className="text-base font-semibold text-[var(--color-text)]"
          >
            {TITLE[kind]}
          </h2>
          {!isSubmitting && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close modal"
              className="btn btn-ghost btn-sm"
            >
              &times;
            </button>
          )}
        </div>

        {/* Modal body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">{BODY[kind]}</p>
          <p className="text-xs font-mono text-[var(--color-text-subtle)]">
            Reservation: {reservationId}
          </p>

          {hasError && actionState.stage === 'error' && (
            <p
              id={`modal-error-${kind}`}
              role="alert"
              className="text-sm text-[var(--color-error)] bg-[var(--color-error-bg)] rounded-md px-3 py-2"
            >
              {actionState.message}
            </p>
          )}
        </div>

        {/* Modal footer */}
        <div className="px-5 py-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3 bg-[var(--color-bg-subtle)]">
          <button
            type="button"
            id={`modal-cancel-${kind}`}
            onClick={onCancel}
            disabled={isSubmitting}
            className="btn btn-ghost btn-sm"
          >
            Cancel
          </button>

          <button
            type="button"
            id={`modal-confirm-${kind}`}
            onClick={onConfirm}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className={kind === 'cancel' ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm'}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
                {SUBMITTING_LABEL[kind]}
              </span>
            ) : (
              ACTION_LABEL[kind]
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Page ----------------------------------------------------------------- */

export default function StaffReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: reservationId } = use(params);

  const [loadState,    setLoadState]    = useState<LoadState>('loading');
  const [detail,       setDetail]       = useState<ReservationDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryKey,     setRetryKey]     = useState(0);
  const [actionState,  setActionState]  = useState<ActionState>({ stage: 'idle' });

  /* -- Fetch -- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState('loading');
      setDetail(null);
      setErrorMessage('');

      try {
        const res  = await fetch(`/api/staff/reservations/${reservationId}`);
        const json = (await res.json()) as ApiSuccess | ApiError;

        if (cancelled) return;

        if (res.status === 404) {
          setLoadState('not_found');
          return;
        }

        if (!res.ok) {
          setErrorMessage(
            (json as ApiError).error?.message ?? `Request failed (HTTP ${res.status}).`
          );
          setLoadState('error');
          return;
        }

        setDetail((json as ApiSuccess).data);
        setLoadState('success');
      } catch {
        if (!cancelled) {
          setErrorMessage(
            'Network error \u2014 unable to reach the server. Please try again.'
          );
          setLoadState('error');
        }
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [reservationId, retryKey]);

  function handleRetry() {
    setRetryKey((k) => k + 1);
  }

  /* -- Action helpers -- */

  function requestAction(kind: ActionKind) {
    setActionState({ stage: 'confirming', kind });
  }

  function cancelAction() {
    if (actionState.stage === 'confirming' || actionState.stage === 'error') {
      setActionState({ stage: 'idle' });
    }
  }

  async function confirmAction() {
    if (actionState.stage !== 'confirming' && actionState.stage !== 'error') return;
    const kind = actionState.kind;
    setActionState({ stage: 'submitting', kind });

    const ENDPOINT: Record<ActionKind, string> = {
      cancel:   `/api/staff/reservations/${reservationId}/cancel`,
      checkin:  `/api/staff/reservations/${reservationId}/checkin`,
      checkout: `/api/staff/reservations/${reservationId}/checkout`,
    };

    const METHOD: Record<ActionKind, string> = {
      cancel:   'PATCH',
      checkin:  'POST',
      checkout: 'POST',
    };

    try {
      const res  = await fetch(ENDPOINT[kind], { method: METHOD[kind] });
      const json = (await res.json()) as { error?: { message: string } };

      if (!res.ok) {
        setActionState({
          stage:   'error',
          kind,
          message: json?.error?.message ?? `Action failed (HTTP ${res.status}).`,
        });
        return;
      }

      // Success: close modal and refresh detail
      setActionState({ stage: 'idle' });
      setRetryKey((k) => k + 1);
    } catch {
      setActionState({
        stage:   'error',
        kind,
        message: 'Network error \u2014 unable to complete the action. Please try again.',
      });
    }
  }

  /* -- Derived -- */

  const isLoading  = loadState === 'loading';
  const isNotFound = loadState === 'not_found';
  const isError    = loadState === 'error';
  const isSuccess  = loadState === 'success' && detail !== null;

  const status      = detail?.reservation_status;
  const isBooked    = status === 'Booked';
  const isCheckedIn = status === 'CheckedIn';
  const isTerminal  = status === 'CheckedOut' || status === 'Cancelled';

  const nights  = detail ? countNights(detail.check_in_date, detail.check_out_date) : 0;
  const shortId = reservationId ? reservationId.slice(0, 8).toUpperCase() : '';

  const isModalOpen =
    actionState.stage === 'confirming' ||
    actionState.stage === 'submitting' ||
    actionState.stage === 'error';

  /* -- Render -- */
  return (
    <>
      <title>
        {isSuccess && detail
          ? `Reservation ${shortId}\u2026 \u2014 SkyNest Hotels Staff Portal`
          : 'Reservation Detail \u2014 SkyNest Hotels Staff Portal'}
      </title>

      <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
        <main
          id="staff-reservation-detail-main"
          className="flex-1 container-page py-8 space-y-6"
          aria-label="Reservation detail"
        >

          {/* Page header */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">
                {isSuccess && detail
                  ? `Reservation ${shortId}\u2026`
                  : 'Reservation Detail'}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                {isSuccess && detail
                  ? `SkyNest ${detail.branch_location_name} \u00b7 ${detail.guest_full_name}`
                  : 'Loading\u2026'}
              </p>
            </div>
            <Link
              href="/staff/reservations"
              id="detail-back-link"
              className="btn btn-ghost text-sm hidden sm:inline-flex"
            >
              &larr; Reservations
            </Link>
          </header>



          {/* Content area */}
          <section aria-live="polite" aria-busy={isLoading}>

            {isLoading  && <LoadingSkeleton />}
            {isNotFound && <NotFoundState />}
            {isError    && <ErrorState message={errorMessage} onRetry={handleRetry} />}

            {isSuccess && detail && (
              <div className="space-y-6">

                {/* Status + identifiers card */}
                <div id="reservation-header-card" className="card p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="text-xs text-[var(--color-text-subtle)] uppercase tracking-wider mb-1">
                        Booking Reference
                      </p>
                      <p
                        id="detail-reservation-id"
                        className="font-mono text-base font-semibold text-[var(--color-text)] break-all"
                      >
                        {detail.reservation_id}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      <span
                        id="detail-status-badge"
                        className={STATUS_BADGE_CLASS[detail.reservation_status]}
                        aria-label={`Status: ${STATUS_LABEL[detail.reservation_status]}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                        {STATUS_LABEL[detail.reservation_status]}
                      </span>

                      <span
                        id="detail-source-badge"
                        className="badge"
                        style={{
                          background: 'var(--color-bg-subtle)',
                          color:      'var(--color-text-muted)',
                        }}
                      >
                        {detail.booking_source}
                      </span>
                    </div>
                  </div>

                  <hr className="border-[var(--color-border)]" />

                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                    <DetailRow label="Branch"    id="detail-branch"    value={`SkyNest ${detail.branch_location_name}`} />
                    <DetailRow label="Check-In"  id="detail-check-in"  value={formatDate(detail.check_in_date)} />
                    <DetailRow label="Check-Out" id="detail-check-out" value={formatDate(detail.check_out_date)} />
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
                          ? <span className="text-[var(--color-success)] font-semibold">{detail.discount_percentage}%</span>
                          : <span className="text-[var(--color-text-subtle)]">None</span>
                      }
                    />
                    <DetailRow label="Booked On" id="detail-created-at" value={formatDateTime(detail.created_at)} />
                    {detail.processed_by_employee_id && (
                      <DetailRow
                        label="Processed by Employee"
                        id="detail-employee-id"
                        value={`#${detail.processed_by_employee_id}`}
                      />
                    )}
                  </dl>
                </div>

                {/* Guest information card */}
                <div id="reservation-guest-card" className="card p-6 space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
                    Guest Information
                  </h2>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                    <DetailRow label="Full Name" id="detail-guest-name"  value={detail.guest_full_name} />
                    <DetailRow
                      label="Email"
                      id="detail-guest-email"
                      value={
                        <a
                          href={`mailto:${detail.guest_email}`}
                          className="text-[var(--color-primary)] hover:underline underline-offset-2"
                        >
                          {detail.guest_email}
                        </a>
                      }
                    />
                    <DetailRow
                      label="Guest ID"
                      id="detail-guest-id"
                      value={<span className="font-mono text-xs">{detail.guest_id}</span>}
                    />
                  </dl>
                </div>

                {/* Action toolbar — hidden for terminal states */}
                {!isTerminal && (
                  <div
                    id="reservation-actions-bar"
                    className="card p-4 flex flex-wrap items-center gap-3"
                    aria-label="Reservation actions"
                  >
                    <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)] mr-2">
                      Actions
                    </span>

                    {isBooked && (
                      <>
                        <button
                          id="btn-checkin"
                          type="button"
                          onClick={() => requestAction('checkin')}
                          className="btn btn-primary btn-sm"
                          aria-label="Check in this reservation"
                        >
                          Check In
                        </button>
                        <button
                          id="btn-cancel"
                          type="button"
                          onClick={() => requestAction('cancel')}
                          className="btn btn-danger btn-sm"
                          aria-label="Cancel this reservation"
                        >
                          Cancel Reservation
                        </button>
                      </>
                    )}

                    {isCheckedIn && (
                      <>
                        <button
                          id="btn-checkout"
                          type="button"
                          onClick={() => requestAction('checkout')}
                          className="btn btn-primary btn-sm"
                          aria-label="Check out this reservation"
                        >
                          Check Out
                        </button>
                        <Link
                          id="btn-services"
                          href={`/staff/reservations/${reservationId}/services`}
                          className="btn btn-outline btn-sm"
                          aria-label="Add or view service usage for this reservation"
                        >
                          Add / View Services &rarr;
                        </Link>
                      </>
                    )}
                  </div>
                )}

                {/* Assigned rooms card */}
                <div id="reservation-rooms-card" className="card p-0 overflow-hidden">
                  <div className="px-6 py-4 border-b border-[var(--color-border)]">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
                      Assigned Rooms
                      <span className="ml-2 text-xs font-normal normal-case tracking-normal text-[var(--color-text-subtle)]">
                        ({detail.rooms.length} {detail.rooms.length === 1 ? 'room' : 'rooms'})
                      </span>
                    </h2>
                  </div>
                  <RoomsTable rooms={detail.rooms} />
                </div>

              </div>
            )}
          </section>

          {/* Mobile back link */}
          {!isLoading && (
            <div className="sm:hidden">
              <Link
                href="/staff/reservations"
                id="detail-back-link-mobile"
                className="btn btn-ghost text-sm"
              >
                &larr; Back to Reservations
              </Link>
            </div>
          )}

        </main>

        <footer
          id="staff-reservation-detail-footer"
          className="border-t border-[var(--color-border)] py-4 text-center text-xs text-[var(--color-text-subtle)]"
        >
          SkyNest Hotels &mdash; Staff Portal &middot; All access is logged and monitored
        </footer>
      </div>

      {/* Confirmation modal */}
      {isModalOpen && (
        <ConfirmModal
          kind={(actionState as Extract<ActionState, { kind: ActionKind }>).kind}
          actionState={actionState}
          onConfirm={confirmAction}
          onCancel={cancelAction}
          reservationId={reservationId}
        />
      )}
    </>
  );
}
