
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  revenueReportRepository,
  type RevenueReportFilters,
} from '@/repositories/revenue-report.repository';
import { ERROR_CODES } from '@/types/api';
import type { SessionData } from '@/types/session';

function getDevStaffSession(): Partial<SessionData> {
  return {
    userId: 'user-mock-staff-005',
    role: 'Manager',
    employeeId: 5,
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

const REPORT_ROLES = ['Manager', 'Admin'] as const;
type ReportRole = (typeof REPORT_ROLES)[number];

function isReportRole(role: string | undefined): role is ReportRole {
  return REPORT_ROLES.includes(role as ReportRole);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
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

    // 3. Parse and validate query parameters
    const searchParams = req.nextUrl.searchParams;
    const filters: RevenueReportFilters = {};

    const rawBranchId = searchParams.get('branchId');
    if (rawBranchId !== null) {
      const parsedBranchId = parseInt(rawBranchId, 10);
      if (isNaN(parsedBranchId) || parsedBranchId <= 0) {
        return err(
          400,
          ERROR_CODES.VALIDATION_ERROR,
          'branchId must be a positive integer.'
        );
      }
      filters.branchId = parsedBranchId;
    }

    const rawYear = searchParams.get('year');
    if (rawYear !== null) {
      const parsedYear = parseInt(rawYear, 10);
      if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
        return err(
          400,
          ERROR_CODES.VALIDATION_ERROR,
          'year must be a valid 4-digit year (between 1900 and 2100).'
        );
      }
      filters.year = parsedYear;
    }

    const rawMonth = searchParams.get('month');
    if (rawMonth !== null) {
      const parsedMonth = parseInt(rawMonth, 10);
      if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return err(
          400,
          ERROR_CODES.VALIDATION_ERROR,
          'month must be an integer between 1 and 12.'
        );
      }
      filters.month = parsedMonth;
    }

    // 4. Fetch monthly revenue data
    const rows = await revenueReportRepository.getMonthlyRevenue(filters);

    return ok(rows, { count: rows.length });
  } catch (error) {
    console.error('[GET /api/staff/reports/revenue]', error);
    return err(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while fetching the monthly revenue report.'
    );
  }
}