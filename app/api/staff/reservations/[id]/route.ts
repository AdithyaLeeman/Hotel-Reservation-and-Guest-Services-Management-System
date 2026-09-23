/**
 * Route: /api/staff/reservations/[id]
 *
 * GET — get full detail for any reservation (staff access, no guest ownership check)
 *
 * Security:
 *   - Requires a staff role (Receptionist / Manager / Admin)
 *   - Receptionist: enforces branch scope (reservation must belong to their branch)
 *   - No guest ownership restriction — staff can view any reservation
 *   - TODO (P01-M01-T07/T14): Replace DEV_SESSION stub with real iron-session
 *
 * Owned by: Member 3 (M3) | Task: P03-M03-T22
 * Lecture alignment: L06 (REST), L07 (RBAC)
 */

import { NextRequest, NextResponse } from 'next/server';
import { reservationService } from '@/services/reservation.service';
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
// GET /api/staff/reservations/[id] — full reservation detail (staff)
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // TODO (P01-M01-T07): const session = await getSession(req);
  const session = getDevSession();

  if (!session.userId || !isStaffRole(session.role)) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
  }

  const { id: reservationId } = await context.params;

  try {
    // Pass null for guestId — staff access has no ownership restriction
    const detail = await reservationService.getReservationDetail(reservationId, null);

    if (!detail) {
      return err(404, ERROR_CODES.NOT_FOUND, `Reservation ${reservationId} not found.`);
    }

    // Receptionist branch scope: they can only view reservations at their branch
    if (session.role === 'Receptionist') {
      if (!session.branchId) {
        return err(403, ERROR_CODES.BRANCH_SCOPE_VIOLATION, 'Receptionist session missing branchId.');
      }
      if (detail.branch_id !== session.branchId) {
        return err(403, ERROR_CODES.BRANCH_SCOPE_VIOLATION,
          'Receptionist can only view reservations at their assigned branch.');
      }
    }

    return ok(detail);
  } catch (error) {
    console.error(`[GET /api/staff/reservations/${reservationId}]`, error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}
