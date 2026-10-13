import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import {
  serviceUsageService,
  ServiceUsageServiceError,
} from '@/services/service-usage.service';
import { ERROR_CODES } from '@/types/api';
import type { SessionData } from '@/types/session';

// TODO Phase 6: remove dev fallback - require real iron-session cookie
function getDevSession(): Partial<SessionData> {
  return {
    userId:     'user-mock-005',
    role:       'Manager',
    employeeId: 5,
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

// Response helpers
function ok<T>(data: T, status = 200): NextResponse {
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

// Role helpers
const STAFF_ROLES    = ['Receptionist', 'Manager', 'Admin'] as const;
const MGMT_ROLES     = ['Manager', 'Admin'] as const;
type StaffRole      = (typeof STAFF_ROLES)[number];
type ManagementRole = (typeof MGMT_ROLES)[number];

function isStaffRole(role: string | undefined): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

function isManagementRole(role: string | undefined): role is ManagementRole {
  return MGMT_ROLES.includes(role as ManagementRole);
}

// POST body schema
const AddCatalogueItemBody = z.object({
  service_name: z
    .string({ error: 'service_name is required.' })
    .min(1, 'service_name must not be empty.')
    .max(100, 'service_name must be 100 characters or fewer.'),
  current_price: z
    .number({ error: 'current_price is required.' })
    .nonnegative('current_price must be zero or positive.'),
  status: z.enum(['Active', 'Inactive']).optional().default('Active'),
});

// GET /api/staff/services
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req?: Request): Promise<NextResponse> {
  const session = await resolveSession();

  if (!session.userId || !session.role) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
  }

  if (!isStaffRole(session.role)) {
    return err(403, ERROR_CODES.INSUFFICIENT_ROLE, `Access requires staff role. Your role: ${session.role}`);
  }

  try {
    const catalogue = await serviceUsageService.listCatalogue();
    return ok(catalogue);
  } catch (error) {
    console.error('[GET /api/staff/services]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}

// POST /api/staff/services
export async function POST(
  req: NextRequest
): Promise<NextResponse> {
  const session = await resolveSession();

  if (!session.userId || !session.role) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
  }

  if (!isStaffRole(session.role)) {
    return err(403, ERROR_CODES.INSUFFICIENT_ROLE, `Access requires staff role. Your role: ${session.role}`);
  }

  if (!isManagementRole(session.role)) {
    return err(
      403,
      ERROR_CODES.INSUFFICIENT_ROLE,
      'Only Manager or Admin may add items to the service catalogue.'
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Request body must be valid JSON.');
  }

  const parsed = AddCatalogueItemBody.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'body';
      fields[key] = issue.message;
    }
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Request body validation failed.', fields);
  }

  try {
    const item = await serviceUsageService.addCatalogueItem({
      ...parsed.data,
      current_price: String(parsed.data.current_price),
    });
    return ok(item, 201);
  } catch (error) {
    if (error instanceof ServiceUsageServiceError) {
      switch (error.code) {
        case 'DUPLICATE_SERVICE_NAME':
          return err(409, ERROR_CODES.CONFLICT, error.message);
        default:
          return err(500, ERROR_CODES.INTERNAL_ERROR, error.message);
      }
    }
    console.error('[POST /api/staff/services]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}