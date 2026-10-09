/**
 * Route: /api/staff/reports/top-services
 *
 * GET - return top-used services ranked by total quantity consumed.
 *       Data sourced from vw_top_services (mock-first; real DB in Phase 6).
 *
 * Security:
 *   - Authentication: requires a logged-in staff user (session.userId present)
 *   - RBAC: Manager and Admin only (Receptionist receives 403)
 *   - No branch scoping: this is a hotel-wide aggregate report
 *
 * Response shape: { data: TopServiceRow[], meta: { requestId: string } }
 * Each row contains: service_id, service_name, total_quantity, total_revenue,
 *                    reservation_count, usage_rank
 *
 * Owned by: Member 3 (M3) | Task: P05-M03-T02
 * Lecture alignment: L06 (REST), L07 (RBAC), L05 (views/aggregate)
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { topServicesRepository } from '@/repositories/top-services.repository';
import { ERROR_CODES } from '@/types/api';
import type { SessionData } from '@/types/session';

// ---------------------------------------------------------------------------
// Fallback dev session for local mock-first development.
// Replaced by real iron-session in Phase 6 (P06-M03-T01).
// ---------------------------------------------------------------------------
function getDevStaffSession(): Partial<SessionData> {
  return {
    userId: 'user-mock-003',
    role: 'Manager', // Manager has report access; change to test 403 with 'Receptionist'
    employeeId: 3,
  };
}

async function resolveSession(): Promise<Partial<SessionData>> {
  try {
    const session = await getSession();
    if (session.userId && session.role) {
      return session;
    }
  } catch {
    // In dev / mock-first mode when cookies may not be present
  }

  if (process.env.NODE_ENV !== 'production') {
    return getDevStaffSession();
  }

  return {};
}

// ---------------------------------------------------------------------------
// Response helpers - conform to docs/21_shared-contracts.md Section 6
// { data, meta } for success | { error: { code, message } } for errors
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
// Roles permitted to access report endpoints (Manager and Admin only).
// Receptionist is excluded - reports are management-level views.
// ---------------------------------------------------------------------------
const REPORT_ROLES = ['Manager', 'Admin'] as const;
type ReportRole = (typeof REPORT_ROLES)[number];

function isReportRole(role: string | undefined): role is ReportRole {
  return REPORT_ROLES.includes(role as ReportRole);
}

// ---------------------------------------------------------------------------
// GET /api/staff/reports/top-services (P05-M03-T02)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req?: Request): Promise<NextResponse> {
  try {
    const session = await resolveSession();

    // 1. Authentication check
    if (!session.userId || !session.role) {
      return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Not authenticated.');
    }

    // 2. RBAC: Manager / Admin only
    if (!isReportRole(session.role)) {
      return err(
        403,
        ERROR_CODES.INSUFFICIENT_ROLE,
        `Access requires Manager or Admin role. Your role: ${session.role}`
      );
    }

    // 3. Fetch report data
    const topServices = await topServicesRepository.getTopServices();
    return ok(topServices);
  } catch (error) {
    console.error('[GET /api/staff/reports/top-services]', error);
    return err(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while fetching top-services report.'
    );
  }
}
