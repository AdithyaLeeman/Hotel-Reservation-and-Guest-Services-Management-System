/**
 * Route: /api/staff/reservations
 *
 * GET  — list active (Booked + CheckedIn) reservations for staff dashboard
 * POST — create a reservation on behalf of a guest (staff-initiated)
 *
 * Security:
 *   - Requires a staff role (Receptionist / Manager / Admin)
 *   - Receptionist: automatically scoped to session.branchId
 *   - Manager / Admin: can see all branches
 *   - guest_id for creation must be supplied as body.guest_id (staff looks it up),
 *     but employee_id and branch scoping always come from session
 *   - TODO (P01-M01-T07/T14): Replace DEV_SESSION stub with real iron-session
 *
 * Owned by: Member 3 (M3) | Tasks: P03-M03-T18, P03-M03-T19
 * Lecture alignment: L06 (REST), L07 (RBAC, branch scoping)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { CreateReservationSchema } from '@/lib/validation/reservation.schema';
import { reservationService, ServiceError } from '@/services/reservation.service';
import { ERROR_CODES } from '@/types/api';
import type { SessionData } from '@/types/session';

// ---------------------------------------------------------------------------
// DEV SESSION STUB
// Replace with real iron-session call once P01-M01-T07 lands.
// Toggle the returned role/branchId to test different access scenarios.
// ---------------------------------------------------------------------------
function getDevSession(): Partial<SessionData> {
  return {
    userId:     'user-mock-003',
    role:       'Receptionist',   // change to 'Manager' to test all-branch access
    employeeId: 3,
    branchId:   1,                // Receptionist is scoped to branch 1 (Colombo)
  };
}

// ---------------------------------------------------------------------------
// Extended body schema for staff create (adds required guest_id)
// ---------------------------------------------------------------------------
const StaffCreateReservationSchema = CreateReservationSchema.and(
  z.object({
    guest_id: z.string().uuid('guest_id must be a valid UUID'),
  })
);

// ---------------------------------------------------------------------------
// Shared response helpers
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
type StaffRole = typeof STAFF_ROLES[number];

function isStaffRole(role: string | undefined): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

// ---------------------------------------------------------------------------
// GET /api/staff/reservations — list active reservations
//
// Query params:
//   ?branch_id=<n>  — (Manager/Admin only) filter to a specific branch
//                     Receptionist always sees only their own branch.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  // TODO (P01-M01-T07): const session = await getSession(req);
  const session = getDevSession();

  if (!session.userId || !isStaffRole(session.role)) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
  }

  // Determine branch scope:
  //   Receptionist → always their branchId (session.branchId)
  //   Manager/Admin → optional ?branch_id query param, or null for all
  let branchId: number | null = null;

  if (session.role === 'Receptionist') {
    if (!session.branchId) {
      return err(403, ERROR_CODES.BRANCH_SCOPE_VIOLATION, 'Receptionist session missing branchId.');
    }
    branchId = session.branchId;
  } else {
    // Manager / Admin: respect optional query param
    const qp = req.nextUrl.searchParams.get('branch_id');
    if (qp !== null) {
      const parsed = parseInt(qp, 10);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return err(400, ERROR_CODES.VALIDATION_ERROR, 'branch_id must be a positive integer.');
      }
      branchId = parsed;
    }
  }

  try {
    const reservations = await reservationService.listActiveReservations(branchId);
    return ok(reservations);
  } catch (error) {
    console.error('[GET /api/staff/reservations]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}

// ---------------------------------------------------------------------------
// POST /api/staff/reservations — create reservation (staff-initiated)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // TODO (P01-M01-T07): const session = await getSession(req);
  const session = getDevSession();

  if (!session.userId || !isStaffRole(session.role)) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
  }

  // Parse + validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Request body must be valid JSON.');
  }

  let input;
  try {
    input = StaffCreateReservationSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of error.issues) {
        fields[issue.path.join('.')] = issue.message;
      }
      return NextResponse.json(
        { error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Validation failed.', fields } },
        { status: 400 }
      );
    }
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid request body.');
  }

  // Receptionist branch scope enforcement: the reservation's branch_id must
  // match the Receptionist's own branchId.
  if (session.role === 'Receptionist') {
    if (session.branchId !== input.branch_id) {
      return err(403, ERROR_CODES.BRANCH_SCOPE_VIOLATION,
        'Receptionist can only create reservations for their assigned branch.');
    }
  }

  try {
    const result = await reservationService.createStaffReservation(
      input,
      { userId: session.userId, employeeId: session.employeeId },
      input.guest_id   // guest_id supplied by staff (looked up separately)
    );
    return ok(result, 201);
  } catch (error) {
    if (error instanceof ServiceError) {
      switch (error.code) {
        case 'ROOM_OVERLAP':
          return err(409, ERROR_CODES.ROOM_OVERLAP, error.message);
        case 'ROOM_BRANCH_MISMATCH':
        case 'ROOM_IN_MAINTENANCE':
          return err(422, ERROR_CODES.CONFLICT, error.message);
        case 'NOT_FOUND':
          return err(404, ERROR_CODES.NOT_FOUND, error.message);
        default:
          return err(500, ERROR_CODES.INTERNAL_ERROR, error.message);
      }
    }
    console.error('[POST /api/staff/reservations]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}
