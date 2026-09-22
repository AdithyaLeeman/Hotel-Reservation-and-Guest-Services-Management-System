/**
 * Route: /api/staff/reservations/[id]/cancel
 *
 * PATCH — cancel a reservation (staff override, no guest ownership check)
 *
 * Security:
 *   - Requires a staff role (Receptionist / Manager / Admin)
 *   - Receptionist scope: enforces that the reservation belongs to their branch
 *     (checked via detail lookup before cancellation)
 *   - No guest ownership check — staff can cancel any 'Booked' reservation
 *   - employee_id and branchId always come from session, never from body
 *   - TODO (P01-M01-T07/T14): Replace DEV_SESSION stub with real iron-session
 *
 * Owned by: Member 3 (M3) | Task: P03-M03-T20
 * Lecture alignment: L06 (REST), L07 (RBAC, branch scoping)
 */

import { NextRequest, NextResponse } from 'next/server';
import { reservationService, ServiceError } from '@/services/reservation.service';
import { ERROR_CODES } from '@/types/api';
import type { SessionData } from '@/types/session';

// ---------------------------------------------------------------------------
// DEV SESSION STUB — replace with getSession(req) from P01-M01-T07
// ---------------------------------------------------------------------------
function getDevSession(): Partial<SessionData> {
  return {
    userId:     'user-mock-003',
    role:       'Receptionist',
    employeeId: 3,
    branchId:   1,
  };
}

// ---------------------------------------------------------------------------
// Helpers
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

const STAFF_ROLES = ['Receptionist', 'Manager', 'Admin'] as const;
type StaffRole = typeof STAFF_ROLES[number];

function isStaffRole(role: string | undefined): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

// ---------------------------------------------------------------------------
// Route params type
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// PATCH /api/staff/reservations/[id]/cancel — staff cancel
// ---------------------------------------------------------------------------

export async function PATCH(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // TODO (P01-M01-T07): const session = await getSession(req);
  const session = getDevSession();

  if (!session.userId || !isStaffRole(session.role)) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
  }

  const { id: reservationId } = await context.params;

  // Receptionist branch scope: verify the reservation belongs to their branch
  // before allowing the cancellation. Fetch the detail with no guest_id (staff access).
  if (session.role === 'Receptionist') {
    if (!session.branchId) {
      return err(403, ERROR_CODES.BRANCH_SCOPE_VIOLATION, 'Receptionist session missing branchId.');
    }

    const detail = await reservationService.getReservationDetail(reservationId, null);
    if (!detail) {
      return err(404, ERROR_CODES.NOT_FOUND, `Reservation ${reservationId} not found.`);
    }
    if (detail.branch_id !== session.branchId) {
      return err(403, ERROR_CODES.BRANCH_SCOPE_VIOLATION,
        'Receptionist can only cancel reservations at their assigned branch.');
    }
  }

  try {
    // Pass null for guestId → sp_cancel_reservation skips ownership check (staff override)
    await reservationService.cancelReservation(
      reservationId,
      session.userId,
      null   // null = staff override, no guest ownership check in SP
    );

    return ok({ reservation_id: reservationId, reservation_status: 'Cancelled' });
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
    console.error(`[PATCH /api/staff/reservations/${reservationId}/cancel]`, error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}
