
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  occupancyReportRepository,
  type OccupancyReportFilters,
} from '@/repositories/occupancy-report.repository';
import { ERROR_CODES } from '@/types/api';
import type { SessionData } from '@/types/session';

// ─── Dev / mock-first session helper ──────────────────────────────────────────
function getDevStaffSession(): Partial<SessionData> {
  return {
    userId: 'user-mock-staff-002',
    role: 'Manager',
    employeeId: 2,
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

// ─── Response helpers ──────────────────────────────────────────────────────────
function ok<T>(data: T, metaExtras?: Record<string, unknown>): NextResponse {
  return NextResponse.json(
    {
      data,
      meta: {
        requestId: crypto.randomUUID(),
        ...metaExtras,
      },
    },
    { status: 200 }
  );
}

function err(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

// ─── RBAC ─────────────────────────────────────────────────────────────────────
const REPORT_ROLES = ['Manager', 'Admin'] as const;
type ReportRole = (typeof REPORT_ROLES)[number];

function isReportRole(role: string | undefined): role is ReportRole {
  return REPORT_ROLES.includes(role as ReportRole);
}

// ─── Valid room statuses ───────────────────────────────────────────────────────
const VALID_ROOM_STATUSES = ['Available', 'Occupied', 'Maintenance'] as const;
type RoomStatus = (typeof VALID_ROOM_STATUSES)[number];

function isValidRoomStatus(s: string): s is RoomStatus {
  return VALID_ROOM_STATUSES.includes(s as RoomStatus);
}

// ─── ISO date validation (YYYY-MM-DD) ─────────────────────────────────────────
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isIsoDate(s: string): boolean {
  return ISO_DATE_RE.test(s) && !isNaN(Date.parse(s));
}

// ─── Route handler ─────────────────────────────────────────────────────────────
/**
 * GET /api/staff/reports/occupancy
 *
 * Returns room occupancy data from `vw_room_occupancy` (mock-first).
 * Access: Manager | Admin only.
 *
 * Query params:
 *   branchId    - integer, filter to one branch
 *   fromDate    - YYYY-MM-DD, inclusive lower bound on period_date
 *   toDate      - YYYY-MM-DD, inclusive upper bound on period_date
 *   roomStatus  - 'Available' | 'Occupied' | 'Maintenance'
 *
 * Response 200:
 *   { data: OccupancyReportRow[], meta: { requestId, count } }
 *
 * Task: P05-M02-T02
 * Owner: M2 - Karunarathna W.P. 240331F
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authentication
    const session = await resolveSession();
    if (!session.userId || !session.role) {
      return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Not authenticated.');
    }

    // 2. RBAC - Manager / Admin only
    if (!isReportRole(session.role)) {
      return err(
        403,
        ERROR_CODES.INSUFFICIENT_ROLE,
        `Access requires Manager or Admin role. Your role: ${session.role}`
      );
    }

    // 3. Parse and validate query parameters
    const searchParams = req.nextUrl.searchParams;
    const filters: OccupancyReportFilters = {};

    const rawBranchId = searchParams.get('branchId');
    if (rawBranchId !== null) {
      const parsed = parseInt(rawBranchId, 10);
      if (isNaN(parsed) || parsed <= 0) {
        return err(
          400,
          ERROR_CODES.VALIDATION_ERROR,
          'branchId must be a positive integer.'
        );
      }
      filters.branchId = parsed;
    }

    const rawFromDate = searchParams.get('fromDate');
    if (rawFromDate !== null) {
      if (!isIsoDate(rawFromDate)) {
        return err(
          400,
          ERROR_CODES.VALIDATION_ERROR,
          'fromDate must be a valid date in YYYY-MM-DD format.'
        );
      }
      filters.fromDate = rawFromDate;
    }

    const rawToDate = searchParams.get('toDate');
    if (rawToDate !== null) {
      if (!isIsoDate(rawToDate)) {
        return err(
          400,
          ERROR_CODES.VALIDATION_ERROR,
          'toDate must be a valid date in YYYY-MM-DD format.'
        );
      }
      filters.toDate = rawToDate;
    }

    // fromDate must not be after toDate when both are supplied
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      return err(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'fromDate must not be after toDate.'
      );
    }

    const rawRoomStatus = searchParams.get('roomStatus');
    if (rawRoomStatus !== null) {
      if (!isValidRoomStatus(rawRoomStatus)) {
        return err(
          400,
          ERROR_CODES.VALIDATION_ERROR,
          `roomStatus must be one of: ${VALID_ROOM_STATUSES.join(', ')}.`
        );
      }
      filters.roomStatus = rawRoomStatus;
    }

    // 4. Fetch occupancy data
    const rows = await occupancyReportRepository.getOccupancyReport(filters);

    return ok(rows, { count: rows.length });
  } catch (error) {
    console.error('[GET /api/staff/reports/occupancy]', error);
    return err(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while fetching the room occupancy report.'
    );
  }
}
