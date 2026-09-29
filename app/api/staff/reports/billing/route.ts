
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  billingReportRepository,
  type BillingReportFilters,
} from '@/repositories/billing-report.repository';
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

    if (!session.userId || !session.role) {
      return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Not authenticated.');
    }

    if (!isReportRole(session.role)) {
      return err(
        403,
        ERROR_CODES.INSUFFICIENT_ROLE,
        `Access requires Manager or Admin role. Your role: ${session.role}`
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const filters: BillingReportFilters = {};

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

    const rawUnpaidOnly = searchParams.get('unpaidOnly');
    if (rawUnpaidOnly !== null) {
      filters.unpaidOnly = rawUnpaidOnly.toLowerCase() === 'true' || rawUnpaidOnly === '1';
    }

    const rawPaymentStatus = searchParams.get('paymentStatus');
    if (rawPaymentStatus) {
      filters.paymentStatus = rawPaymentStatus;
    }

    const rawSearch = searchParams.get('search');
    if (rawSearch) {
      filters.search = rawSearch;
    }

    const rows = await billingReportRepository.getBillingSummary(filters);

    return ok(rows, { count: rows.length });
  } catch (error) {
    console.error('[GET /api/staff/reports/billing]', error);
    return err(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while fetching the guest billing summary report.'
    );
  }
}