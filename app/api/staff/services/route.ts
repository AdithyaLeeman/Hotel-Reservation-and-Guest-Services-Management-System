/**
 * Route: GET /api/staff/services
 *
 * Returns the full list of Active service catalogue items, ordered
 * alphabetically by service_name. Staff use this to pick a service when
 * logging usage against a checked-in reservation.
 *
 * Security:
 *   - Requires staff role: Receptionist, Manager, or Admin
 *   - No branch scoping required — the catalogue is hotel-wide.
 *
 * HTTP responses:
 *   200  — array of catalogue items (may be empty)
 *   401  — not authenticated
 *   500  — unexpected error
 *
 * Mock swap plan (Phase 6 / P06-M04-T01):
 *   serviceUsageService.listCatalogue()
 *   -> serviceUsageRepository.listCatalogue()
 *   -> SELECT * FROM service_catalogue WHERE status = 'Active' ORDER BY service_name
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T14 (Mock-First)
 * Lecture alignment: L06 (stored procedures), L08 (price snapshot rule)
 */

import { NextRequest, NextResponse } from 'next/server';
import { serviceUsageService } from '@/services/service-usage.service';
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
// Role guard
// ---------------------------------------------------------------------------
const STAFF_ROLES = ['Receptionist', 'Manager', 'Admin'] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

function isStaffRole(role: string | undefined): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

// ---------------------------------------------------------------------------
// GET /api/staff/services
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest
): Promise<NextResponse> {
  // TODO (P01-M01-T11): const session = await getSession(_req);
  const session = getDevSession();

  if (!session.userId || !isStaffRole(session.role)) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
  }

  try {
    const catalogue = await serviceUsageService.listCatalogue();
    return ok(catalogue);
  } catch (error) {
    console.error('[GET /api/staff/services]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}