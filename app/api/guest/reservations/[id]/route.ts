/**
 * Route: /api/guest/reservations/[id]
 *
 * GET    — get full detail for one of the guest's reservations
 * DELETE — cancel a reservation (guest-initiated)
 *
 * Security:
 *   - Ownership is enforced at the DB level via fn_get_reservation_detail()
 *     and sp_cancel_reservation() — both use guest_id from session as a
 *     SQL predicate, so Guest A cannot access Guest B's reservations.
 *   - guest_id is read from session.guestId — never from URL params or body
 *   - TODO (P01-M01-T07/T14): Replace DEV_SESSION stub with real iron-session
 *
 * Owned by: Member 3 (M3) | Tasks: P03-M03-T13
 * Lecture alignment: L06 (REST), L07 (security), L08 (ownership enforcement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { reservationService, ServiceError } from '@/services/reservation.service';
import { ERROR_CODES } from '@/types/api';
import type { SessionData } from '@/types/session';

// ---------------------------------------------------------------------------
// DEV SESSION STUB
// Replace with real iron-session call once P01-M01-T07 lands:
//   import { getSession } from '@/lib/auth/session';
//   const session = await getSession(req);
// ---------------------------------------------------------------------------
function getDevSession(): Partial<SessionData> {
  return {
    userId:  'user-mock-001',
    role:    'Guest',
    guestId: 'guest-mock-001',
  };
}

// ---------------------------------------------------------------------------
// Shared response helpers
// ---------------------------------------------------------------------------

function ok<T>(data: T): NextResponse {
  return NextResponse.json(
    { data, meta: { requestId: crypto.randomUUID() } },
    { status: 200 }
  );
}

function err(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

// ---------------------------------------------------------------------------
// Route params type
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// GET /api/guest/reservations/[id] — reservation detail
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // TODO (P01-M01-T07): const session = await getSession(req);
  const session = getDevSession();

  if (!session.userId || session.role !== 'Guest') {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Not authenticated.');
  }
  if (!session.guestId) {
    return err(403, ERROR_CODES.INSUFFICIENT_ROLE, 'Guest profile not found in session.');
  }

  const { id: reservationId } = await context.params;

  try {
    // Pass session.guestId → DB enforces ownership; returns null on mismatch (prevents info leak)
    const detail = await reservationService.getReservationDetail(reservationId, session.guestId);

    if (!detail) {
      return err(404, ERROR_CODES.NOT_FOUND, `Reservation ${reservationId} not found.`);
    }

    return ok(detail);
  } catch (error) {
    console.error(`[GET /api/guest/reservations/${reservationId}]`, error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/guest/reservations/[id] — cancel reservation (guest)
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // TODO (P01-M01-T07): const session = await getSession(req);
  const session = getDevSession();

  if (!session.userId || session.role !== 'Guest') {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Not authenticated.');
  }
  if (!session.guestId) {
    return err(403, ERROR_CODES.INSUFFICIENT_ROLE, 'Guest profile not found in session.');
  }

  const { id: reservationId } = await context.params;

  try {
    // guestId is passed so sp_cancel_reservation enforces ownership in SQL
    await reservationService.cancelReservation(
      reservationId,
      session.userId,
      session.guestId   // ownership enforced in stored procedure
    );

    return NextResponse.json(
      { data: { reservation_id: reservationId, reservation_status: 'Cancelled' },
        meta: { requestId: crypto.randomUUID() } },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      switch (error.code) {
        case 'NOT_FOUND':
          return err(404, ERROR_CODES.NOT_FOUND, error.message);
        case 'INVALID_STATUS_TRANSITION':
          return err(409, ERROR_CODES.INVALID_STATUS_TRANSITION, error.message);
        default:
          return err(500, ERROR_CODES.INTERNAL_ERROR, error.message);
      }
    }
    console.error(`[DELETE /api/guest/reservations/${reservationId}]`, error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}
