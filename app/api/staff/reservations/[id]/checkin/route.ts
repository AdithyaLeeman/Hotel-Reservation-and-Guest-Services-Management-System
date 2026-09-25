/**
 * Route: POST /api/staff/reservations/[id]/checkin
 *
 * Triggers the check-in workflow for a reservation.
 * Delegates to checkinService which (mock-first) transitions the reservation
 * to 'CheckedIn' and marks all reservation rooms as 'Occupied'.
 *
 * Security:
 *   - Requires staff role: Receptionist, Manager, or Admin
 *   - Receptionist: scoped to their own branchId
 *   - Manager / Admin: can check in any reservation
 *
 * HTTP responses:
 *   200  — check-in succeeded
 *   401  — not authenticated
 *   403  — wrong role or branch scope violation
 *   404  — reservation not found
 *   409  — reservation is not in 'Booked' status (INVALID_STATUS_TRANSITION)
 *   500  — unexpected error
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T12 (Mock-First)
 * Lecture alignment: L08 (transactions), L09 (stored procedures, atomicity)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkinService, CheckinServiceError } from '@/services/checkin.service';
import { ERROR_CODES } from '@/types/api';
import type { SessionData } from '@/types/session';

// ---------------------------------------------------------------------------
// DEV SESSION STUB
// TODO (P01-M01-T11): Replace with real iron-session call.
// ---------------------------------------------------------------------------
function getDevSession(): Partial<SessionData> {
  return {
    userId:     'user-mock-004',
    role:       'Receptionist',
    employeeId: 4,
    branchId:   1, // Colombo branch
  };
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------
function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    { data, meta: { requestId: crypto.randomUUID() } },
    { status }
  );
}

function err(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

const STAFF_ROLES = ['Receptionist', 'Manager', 'Admin'] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

function isStaffRole(role: string | undefined): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

// ---------------------------------------------------------------------------
// POST /api/staff/reservations/[id]/checkin
// ---------------------------------------------------------------------------
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // TODO (P01-M01-T11): const session = await getSession(_req);
  const session = getDevSession();

  if (!session.userId || !isStaffRole(session.role)) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
  }

  const { id: reservationId } = await params;

  if (!reservationId) {
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Reservation ID is required.');
  }

  // Branch scope: Receptionist is locked to their branchId; Manager/Admin pass null
  const branchId = session.role === 'Receptionist' ? (session.branchId ?? null) : null;

  if (session.role === 'Receptionist' && session.branchId === undefined) {
    return err(403, ERROR_CODES.BRANCH_SCOPE_VIOLATION, 'Receptionist session missing branchId.');
  }

  try {
    await checkinService.checkIn(reservationId, session.employeeId!, branchId);
    return ok({ reservation_id: reservationId, status: 'CheckedIn' });
  } catch (error) {
    if (error instanceof CheckinServiceError) {
      switch (error.code) {
        case 'NOT_FOUND':
          return err(404, ERROR_CODES.NOT_FOUND, error.message);
        case 'BRANCH_SCOPE_VIOLATION':
          return err(403, ERROR_CODES.BRANCH_SCOPE_VIOLATION, error.message);
        case 'NOT_BOOKED_STATUS':
          return err(409, ERROR_CODES.INVALID_STATUS_TRANSITION, error.message);
        default:
          return err(500, ERROR_CODES.INTERNAL_ERROR, error.message);
      }
    }
    console.error('[POST /api/staff/reservations/[id]/checkin]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}
