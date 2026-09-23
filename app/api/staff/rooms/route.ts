/**
 * Route: /api/staff/rooms
 *
 * GET  — list rooms with optional filtering (status, typeId, branchId)
 * POST — create a new room (Manager/Admin only)
 *
 * Security:
 *   - Authentication: requires staff role (Receptionist, Manager, Admin)
 *   - Role-Based Access Control (AGENTS.md §10, docs/07_api-and-pages.md):
 *       GET  → Receptionist, Manager, Admin
 *       POST → Manager, Admin only (Receptionist receives 403)
 *   - Branch Scoping:
 *       Receptionist: scoped to session.branchId. Querying another branch yields 403.
 *       Manager/Admin: all-branch access (can query any branch or omit for all branches).
 *
 * Owned by: Member 2 (M2) | Tasks: P02-M02-T10, P02-M02-T11
 * Lecture alignment: L06 (REST API), L07 (RBAC, application security)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getSession } from '@/lib/auth/session';
import {
  roomService,
  RoomConflictError,
  RoomValidationError,
} from '@/services/room.service';
import {
  CreateRoomSchema,
  ListRoomsQuerySchema,
} from '@/lib/validation/room.schema';
import { ERROR_CODES } from '@/types/api';
import type { SessionData } from '@/types/session';

// ---------------------------------------------------------------------------
// Fallback dev session for local mock-first development
// ---------------------------------------------------------------------------
function getDevStaffSession(): Partial<SessionData> {
  return {
    userId: 'user-mock-staff-002',
    role: 'Receptionist',
    employeeId: 2,
    branchId: 1, // Default to Colombo for Receptionist
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
// Response helpers conforming to docs/21_shared-contracts.md Section 6
// ---------------------------------------------------------------------------

function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    {
      data,
      meta: { requestId: crypto.randomUUID() },
    },
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
    {
      error: {
        code,
        message,
        ...(fields ? { fields } : {}),
      },
    },
    { status }
  );
}

function zodFieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'body';
    if (!fields[path]) {
      fields[path] = issue.message;
    }
  }
  return fields;
}

// ---------------------------------------------------------------------------
// GET /api/staff/rooms (P02-M02-T10)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await resolveSession();

    if (!session.userId || !session.role) {
      return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Not authenticated.');
    }

    const staffRoles = ['Receptionist', 'Manager', 'Admin'];
    if (!staffRoles.includes(session.role)) {
      return err(
        403,
        ERROR_CODES.INSUFFICIENT_ROLE,
        `Access requires a staff role. Your role: ${session.role}`
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const rawQuery: Record<string, string> = {};
    if (searchParams.has('branchId')) rawQuery.branchId = searchParams.get('branchId')!;
    if (searchParams.has('status')) rawQuery.status = searchParams.get('status')!;
    if (searchParams.has('typeId')) rawQuery.typeId = searchParams.get('typeId')!;

    const parsedQuery = ListRoomsQuerySchema.safeParse(rawQuery);
    if (!parsedQuery.success) {
      return err(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        zodFieldErrors(parsedQuery.error)
      );
    }

    const { status, typeId } = parsedQuery.data;
    let targetBranchId = parsedQuery.data.branchId;

    // Enforce branch scoping for Receptionist
    if (session.role === 'Receptionist') {
      if (session.branchId === undefined) {
        return err(
          403,
          ERROR_CODES.BRANCH_SCOPE_VIOLATION,
          'Receptionist session is missing assigned branchId.'
        );
      }
      if (targetBranchId !== undefined && targetBranchId !== session.branchId) {
        return err(
          403,
          ERROR_CODES.BRANCH_SCOPE_VIOLATION,
          'Access restricted to your assigned branch.'
        );
      }
      targetBranchId = session.branchId;
    }

    // Fetch rooms via service
    const rooms = await roomService.listRooms({
      branchId: targetBranchId,
      status,
      typeId,
    });

    return ok(rooms);
  } catch (error) {
    console.error('Unhandled error in GET /api/staff/rooms:', error);
    return err(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while fetching rooms.'
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/staff/rooms (P02-M02-T11)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await resolveSession();

    if (!session.userId || !session.role) {
      return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Not authenticated.');
    }

    // Manager+ only for room creation
    const allowedRoles = ['Manager', 'Admin'];
    if (!allowedRoles.includes(session.role)) {
      return err(
        403,
        ERROR_CODES.INSUFFICIENT_ROLE,
        `Only Manager or Admin may create rooms. Your role: ${session.role}`
      );
    }

    // Parse JSON body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return err(400, ERROR_CODES.VALIDATION_ERROR, 'Malformed JSON body.');
    }

    const parsed = CreateRoomSchema.safeParse(rawBody);
    if (!parsed.success) {
      return err(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid room creation payload.',
        zodFieldErrors(parsed.error)
      );
    }

    const input = parsed.data;

    // If Manager is scoped to a specific branch, enforce branch scope
    if (
      session.role === 'Manager' &&
      session.branchId !== undefined &&
      session.branchId !== input.branch_id
    ) {
      return err(
        403,
        ERROR_CODES.BRANCH_SCOPE_VIOLATION,
        'Access restricted to your assigned branch.'
      );
    }

    const newRoom = await roomService.createRoom(input);
    return ok(newRoom, 201);
  } catch (error) {
    if (error instanceof RoomConflictError) {
      return err(409, ERROR_CODES.CONFLICT, error.message);
    }

    if (error instanceof RoomValidationError) {
      return err(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        error.message,
        error.fields
      );
    }

    console.error('Unhandled error in POST /api/staff/rooms:', error);
    return err(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while creating the room.'
    );
  }
}
