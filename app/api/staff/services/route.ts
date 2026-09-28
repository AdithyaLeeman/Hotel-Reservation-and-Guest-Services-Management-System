/**
 * Route: GET /api/staff/services  +  POST /api/staff/services
 *
 * GET  — Returns all Active service catalogue items (any staff role).
 * POST — Adds a new item to the service catalogue (Manager / Admin only).
 *
 * Security:
 *   GET  : Receptionist | Manager | Admin
 *   POST : Manager | Admin ONLY  (REQ-4.7.1, SRS Section 5.3)
 *   No branch scoping — the catalogue is hotel-wide.
 *
 * HTTP responses (GET):
 *   200  — array of catalogue items (may be empty)
 *   401  — not authenticated
 *   500  — unexpected error
 *
 * HTTP responses (POST):
 *   201  — catalogue item created
 *   400  — validation error
 *   401  — not authenticated
 *   403  — insufficient role (Receptionist)
 *   409  — service name already exists
 *   500  — unexpected error
 *
 * Mock swap plan (Phase 6 / P06-M04-T01):
 *   GET  listCatalogue()      -> SELECT * FROM service_catalogue WHERE status='Active' ORDER BY service_name
 *   POST addCatalogueItem()   -> INSERT INTO service_catalogue ... RETURNING *
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T14 (GET) + P04-M04-T15 (POST)
 * Lecture alignment: L06 (stored procedures), L08 (price snapshot rule)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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
    userId:     'user-mock-005',
    role:       'Manager',
    employeeId: 5,
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
// Role helpers
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// POST body schema
// ---------------------------------------------------------------------------
const AddCatalogueItemBody = z.object({
  service_name: z
    .string({ required_error: 'service_name is required.' })
    .min(1, 'service_name must not be empty.')
    .max(100, 'service_name must be 100 characters or fewer.'),
  current_price: z
    .number({ required_error: 'current_price is required.' })
    .nonnegative('current_price must be zero or positive.'),
  status: z.enum(['Active', 'Inactive']).optional().default('Active'),
});

// ---------------------------------------------------------------------------
// GET /api/staff/services
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest
): Promise<NextResponse> {
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

// ---------------------------------------------------------------------------
// POST /api/staff/services
// ---------------------------------------------------------------------------
export async function POST(
  req: NextRequest
): Promise<NextResponse> {
  const session = getDevSession();

  if (!session.userId || !isStaffRole(session.role)) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
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
    const item = await serviceUsageService.addCatalogueItem(parsed.data);
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