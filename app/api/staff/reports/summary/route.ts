import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { reportsSummaryRepository } from '@/repositories/reports-summary.repository';
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

export async function GET(): Promise<NextResponse> {
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

    // 3. Fetch summary metrics from database views
    const summary = await reportsSummaryRepository.getSummary();

    return ok(summary);
  } catch (error) {
    console.error('[GET /api/staff/reports/summary]', error);
    return err(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while fetching the reports summary.'
    );
  }
}
