/**
 * Route: POST /api/staff/reservations/[id]/services
 *         GET  /api/staff/reservations/[id]/services
 *
 * POST — Log a service usage event against a checked-in reservation.
 * GET  — Retrieve the service usage breakdown for a reservation (for staff view).
 *
 * DB-first rule:
 *   charged_price is NEVER accepted from the request body.
 *   sp_log_service_usage() (via mock) snapshots the catalogue price at log time.
 *
 * Security:
 *   - Requires staff role: Receptionist, Manager, or Admin
 *   - Receptionist: scoped to their branchId (enforced in service layer via branch check)
 *
 * HTTP responses (POST):
 *   201  — usage logged successfully
 *   400  — validation error
 *   401  — not authenticated
 *   403  — wrong role
 *   404  — service_id not found in catalogue
 *   409  — reservation not checked in (INVALID_STATUS_TRANSITION)
 *   500  — unexpected error
 *
 * HTTP responses (GET):
 *   200  — list of usage records with service_name and line_total
 *   401  — not authenticated
 *   403  — wrong role
 *   500  — unexpected error
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T13 (Mock-First)
 * Lecture alignment: L06 (stored procedures), L07 (input validation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { LogServiceUsageSchema } from '@/lib/validation/service.schema';
import {
  serviceUsageService,
  ServiceUsageServiceError,
} from '@/services/service-usage.service';
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
    branchId:   1,
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

function err(status: number, code: string, message: string, fields?: Record<string, string>): NextResponse {
  return NextResponse.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

const STAFF_ROLES = ['Receptionist', 'Manager', 'Admin'] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

function isStaffRole(role: string | undefined): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

// ---------------------------------------------------------------------------
// GET /api/staff/reservations/[id]/services
// Returns service usage breakdown for a reservation.
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = getDevSession();

  if (!session.userId || !isStaffRole(session.role)) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
  }

  const { id: reservationId } = await params;

  try {
    const records = await serviceUsageService.listUsageByReservation(reservationId);
    return ok(records);
  } catch (error) {
    console.error('[GET /api/staff/reservations/[id]/services]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}

// ---------------------------------------------------------------------------
// POST /api/staff/reservations/[id]/services — log service usage
// ---------------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // TODO (P01-M01-T11): const session = await getSession(req);
  const session = getDevSession();

  if (!session.userId || !isStaffRole(session.role)) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
  }

  if (!session.employeeId) {
    return err(403, ERROR_CODES.INSUFFICIENT_ROLE, 'Employee ID missing from session.');
  }

  const { id: reservationId } = await params;

  // Parse request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Request body must be valid JSON.');
  }

  // Validate with Zod
  let input;
  try {
    input = LogServiceUsageSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of error.issues) {
        fields[issue.path.join('.')] = issue.message;
      }
      return err(400, ERROR_CODES.VALIDATION_ERROR, 'Validation failed.', fields);
    }
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid request body.');
  }

  try {
    const usage = await serviceUsageService.logUsage(
      { ...input, reservation_id: reservationId },
      session.employeeId
    );
    return ok(usage, 201);
  } catch (error) {
    if (error instanceof ServiceUsageServiceError) {
      switch (error.code) {
        case 'NOT_FOUND':
          return err(404, ERROR_CODES.NOT_FOUND, error.message);
        case 'SERVICE_INACTIVE':
          return err(409, ERROR_CODES.CONFLICT, error.message);
        case 'NOT_CHECKED_IN':
          return err(409, ERROR_CODES.INVALID_STATUS_TRANSITION, error.message);
        case 'INVALID_QUANTITY':
          return err(400, ERROR_CODES.VALIDATION_ERROR, error.message);
        default:
          return err(500, ERROR_CODES.INTERNAL_ERROR, error.message);
      }
    }
    console.error('[POST /api/staff/reservations/[id]/services]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}
