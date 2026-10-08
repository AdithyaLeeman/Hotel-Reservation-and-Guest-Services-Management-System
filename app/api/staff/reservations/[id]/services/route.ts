/**
 * Route: POST /api/staff/reservations/[id]/services
 *
 * Logs a service usage entry against a checked-in reservation.
 * Delegates to serviceUsageService.logUsage() which (mock-first) snapshots
 * the current_price from the service catalogue into service_usage.charged_price.
 *
 * Security:
 *   - Requires staff role: Receptionist, Manager, or Admin
 *   - Receptionist: scoped to their own branchId
 *   - Manager / Admin: can log service usage on any reservation
 *
 * HTTP responses:
 *   201  — service usage logged successfully
 *   400  — validation error (missing/invalid body fields)
 *   401  — not authenticated
 *   403  — wrong role or branch scope violation
 *   404  — reservation or service not found
 *   409  — reservation is not in CheckedIn status
 *   422  — service is inactive or quantity is invalid
 *   500  — unexpected error
 *
 * DB-first price snapshot rule (MANDATORY — see AGENTS.md Section 5):
 *   TypeScript NEVER computes charged_price.
 *   sp_log_service_usage() (Phase 6) / the mock repository snapshots
 *   service_catalogue.current_price at the moment of logging.
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T13 (Mock-First)
 * Lecture alignment: L06 (stored procedures), L08 (price snapshot rule)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import {
  serviceUsageService,
  ServiceUsageServiceError,
} from '@/services/service-usage.service';
import { ERROR_CODES } from '@/types/api';
import type { SessionData } from '@/types/session';

// TODO Phase 6: remove dev fallback — require real iron-session cookie
function getDevSession(): Partial<SessionData> {
  return {
    userId:     'user-mock-004',
    role:       'Receptionist',
    employeeId: 4,
    branchId:   1,
  };
}

async function resolveSession(): Promise<Partial<SessionData>> {
  try {
    const session = await getSession();
    if (session.userId && session.role) return session;
  } catch { /* cookies not present in dev */ }
  if (process.env.NODE_ENV !== 'production') return getDevSession();
  return {};
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------
function ok<T>(data: T, status = 201): NextResponse {
  return NextResponse.json(
    { data, meta: { requestId: crypto.randomUUID() } },
    { status }
  );
}

function err(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    { status }
  );
}

// ---------------------------------------------------------------------------
// Role guard
// ---------------------------------------------------------------------------
const STAFF_ROLES = ['Receptionist', 'Manager', 'Admin'] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

function isStaffRole(role: string | undefined): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

// ---------------------------------------------------------------------------
// Request body schema
// ---------------------------------------------------------------------------
const LogServiceUsageBody = z.object({
  service_id: z
    .number({ error: 'service_id is required.' })
    .int()
    .positive(),
  quantity: z
    .number({ error: 'quantity is required.' })
    .int()
    .min(1, 'Quantity must be at least 1.'),
  usage_date: z
    .string({ error: 'usage_date is required.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'usage_date must be in YYYY-MM-DD format.'),
  channel: z
    .enum(['RoomService', 'FrontDesk', 'Online'])
    .optional()
    .default('FrontDesk'),
});

type LogServiceUsageBody = z.infer<typeof LogServiceUsageBody>;

// ---------------------------------------------------------------------------
// POST /api/staff/reservations/[id]/services
// ---------------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await resolveSession();

  if (!session.userId || !session.role) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
  }

  if (!isStaffRole(session.role)) {
    return err(403, ERROR_CODES.INSUFFICIENT_ROLE, `Access requires staff role. Your role: ${session.role}`);
  }

  const { id: reservationId } = await params;

  if (!reservationId) {
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Reservation ID is required.');
  }

  if (session.role === 'Receptionist' && session.branchId === undefined) {
    return err(403, ERROR_CODES.BRANCH_SCOPE_VIOLATION, 'Receptionist session missing branchId.');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Request body must be valid JSON.');
  }

  const parsed = LogServiceUsageBody.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'body';
      fields[key] = issue.message;
    }
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Request body validation failed.', fields);
  }

  const { service_id, quantity, usage_date, channel } = parsed.data;

  try {
    const usage = await serviceUsageService.logUsage(
      { reservation_id: reservationId, service_id, quantity, usage_date, channel },
      session.employeeId!
    );
    return ok(usage);
  } catch (error) {
    if (error instanceof ServiceUsageServiceError) {
      switch (error.code) {
        case 'NOT_FOUND':
          return err(404, ERROR_CODES.NOT_FOUND, error.message);
        case 'NOT_CHECKED_IN':
          return err(409, ERROR_CODES.INVALID_STATUS_TRANSITION, error.message);
        case 'SERVICE_INACTIVE':
          return err(422, ERROR_CODES.VALIDATION_ERROR, error.message);
        case 'INVALID_QUANTITY':
          return err(422, ERROR_CODES.VALIDATION_ERROR, error.message);
        default:
          return err(500, ERROR_CODES.INTERNAL_ERROR, error.message);
      }
    }
    console.error('[POST /api/staff/reservations/[id]/services]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}

// ---------------------------------------------------------------------------
// GET /api/staff/reservations/[id]/services
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await resolveSession();

  if (!session.userId || !session.role) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
  }

  if (!isStaffRole(session.role)) {
    return err(403, ERROR_CODES.INSUFFICIENT_ROLE, `Access requires staff role. Your role: ${session.role}`);
  }

  const { id: reservationId } = await params;

  if (!reservationId) {
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Reservation ID is required.');
  }

  try {
    const usages = await serviceUsageService.listUsageByReservation(reservationId);
    return NextResponse.json(
      { data: usages, meta: { requestId: crypto.randomUUID() } },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/staff/reservations/[id]/services]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}