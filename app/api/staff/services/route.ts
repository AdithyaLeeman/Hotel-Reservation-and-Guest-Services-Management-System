/**
 * Route: GET  /api/staff/services   — list service catalogue (all staff)
 *        POST /api/staff/services   — add a new catalogue item (Manager/Admin only)
 *
 * Security:
 *   - GET:  any staff role (Receptionist, Manager, Admin)
 *   - POST: Manager or Admin only (Receptionist denied — 403)
 *
 * HTTP responses (GET):
 *   200  — list of Active catalogue items
 *   401  — not authenticated
 *   403  — wrong role
 *   500  — unexpected error
 *
 * HTTP responses (POST):
 *   201  — catalogue item created
 *   400  — validation error
 *   401  — not authenticated
 *   403  — wrong role or insufficient permissions
 *   409  — duplicate service name
 *   500  — unexpected error
 *
 * Owned by: Member 4 (M4) | Tasks: P04-M04-T14 (GET), P04-M04-T15 (POST)
 * Lecture alignment: L07 (RBAC), L06 (service catalogue)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { CreateCatalogueItemSchema } from '@/lib/validation/service.schema';
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
    role:       'Manager',   // Change to 'Receptionist' to test 403 on POST
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
// GET /api/staff/services — list Active catalogue items
// Accessible to all staff roles.
// ---------------------------------------------------------------------------
export async function GET(_req: NextRequest): Promise<NextResponse> {
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

// ---------------------------------------------------------------------------
// POST /api/staff/services — add a new service catalogue item
// Manager / Admin only.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest): Promise<NextResponse> {
  // TODO (P01-M01-T11): const session = await getSession(req);
  const session = getDevSession();

  if (!session.userId || !isStaffRole(session.role)) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Staff authentication required.');
  }

  // Manager / Admin only — Receptionist may not add catalogue items
  if (session.role === 'Receptionist') {
    return err(403, ERROR_CODES.INSUFFICIENT_ROLE, 'Only Managers and Admins can add service catalogue items.');
  }

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
    input = CreateCatalogueItemSchema.parse(body);
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
    const item = await serviceUsageService.addCatalogueItem(input);
    return ok(item, 201);
  } catch (error) {
    if (error instanceof ServiceUsageServiceError) {
      if (error.code === 'DUPLICATE_SERVICE_NAME') {
        return err(409, ERROR_CODES.CONFLICT, error.message);
      }
      return err(500, ERROR_CODES.INTERNAL_ERROR, error.message);
    }
    console.error('[POST /api/staff/services]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}
