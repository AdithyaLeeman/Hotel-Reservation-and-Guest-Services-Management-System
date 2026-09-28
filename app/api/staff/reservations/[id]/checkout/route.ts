
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { paymentService } from '@/services/payment.service';
import { ERROR_CODES, isSqlState } from '@/types/api';
import type { SessionData } from '@/types/session';

const SQLSTATE_OUTSTANDING_BALANCE = '45030';
const SQLSTATE_NOT_CHECKED_IN_FOR_CHECKOUT = '45031';
const STAFF_ROLES = ['Receptionist', 'Manager', 'Admin'] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

function isStaffRole(role: string | undefined): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}
function getDevStaffSession(): Partial<SessionData> {
  return {
    userId:     'user-mock-staff-001',
    role:       'Receptionist',
    employeeId: 1,
    branchId:   1,
  };
}
async function resolveSession(): Promise<Partial<SessionData>> {
  try {
    const session = await getSession();
    if (session.userId && session.role) {
      return session;
    }
  } catch {

  }

  if (process.env.NODE_ENV !== 'production') {
    return getDevStaffSession();
  }

  return {};
}

function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    { data, meta: { requestId: crypto.randomUUID() } },
    { status }
  );
}

function err(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await resolveSession();

  if (!session.userId || !isStaffRole(session.role)) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
  }

  if (!session.employeeId) {
    return err(403, ERROR_CODES.BRANCH_SCOPE_VIOLATION, 'Staff session is missing employeeId.');
  }

  // Receptionists must have a numeric branchId in their session
  if (session.role === 'Receptionist' && typeof session.branchId !== 'number') {
    return err(403, ERROR_CODES.BRANCH_SCOPE_VIOLATION, 'Receptionist session is missing branchId.');
  }

  const { id: reservationId } = await params;

  if (!reservationId || reservationId.trim() === '') {
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Reservation ID is required.');
  }

  try {
    await paymentService.checkout(reservationId, session.employeeId);
    return ok({ reservation_id: reservationId, status: 'CheckedOut' });

  } catch (error) {
 
    if (isSqlState(error, SQLSTATE_OUTSTANDING_BALANCE)) {
      return err(
        409,
        ERROR_CODES.OUTSTANDING_BALANCE,
        'Cannot check out: reservation has an outstanding balance.'
      );
    }

    if (isSqlState(error, SQLSTATE_NOT_CHECKED_IN_FOR_CHECKOUT)) {
      return err(
        409,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        'Cannot check out: reservation is not in CheckedIn status.'
      );
    }

    console.error('[POST /api/staff/reservations/[id]/checkout]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}