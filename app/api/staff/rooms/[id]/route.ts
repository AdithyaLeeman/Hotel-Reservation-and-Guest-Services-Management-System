/**
 * Route: /api/staff/rooms/[id]
 *
 * GET   — get room details by ID
 * PATCH — update room status (Available, Occupied, Maintenance)
 *
 * Security & RBAC:
 *   - Authentication: staff role required (Receptionist, Manager, Admin)
 *   - Branch Scoping:
 *       Receptionist can only view and update rooms within their assigned branch.
 *   - Maintenance Status Guard (AGENTS.md §10, BR-16):
 *       Only Manager or Admin may set a room's status to 'Maintenance'.
 *       Receptionists attempting to set 'Maintenance' receive 403 INSUFFICIENT_ROLE.
 *
 * Owned by: Member 2 (M2) | Tasks: P02-M02-T12
 * Lecture alignment: L06 (REST API), L07 (RBAC, branch scoping)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getSession } from '@/lib/auth/session';
import {
  roomService,
  RoomNotFoundError,
  RoomStatusForbiddenError,
  RoomValidationError,
} from '@/services/room.service';
import { UpdateRoomStatusSchema } from '@/lib/validation/room.schema';
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
    branchId: 1,
  };
}

async function resolveSession(): Promise<Partial<SessionData>> {
  try {
    const session = await getSession();
    if (session.userId && session.role) {
      return session;
    }
  } catch {
    // In dev / mock-first mode
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

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// GET /api/staff/rooms/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
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

    const { id: rawId } = await context.params;
    const roomId = parseInt(rawId, 10);
    if (isNaN(roomId) || roomId <= 0) {
      return err(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid roomId: must be a positive integer.'
      );
    }

    const room = await roomService.getRoomById(roomId);

    // Enforce branch scoping for Receptionist
    if (session.role === 'Receptionist' && session.branchId !== room.branch_id) {
      return err(
        403,
        ERROR_CODES.BRANCH_SCOPE_VIOLATION,
        'Access restricted to your assigned branch.'
      );
    }

    return ok(room);
  } catch (error) {
    if (error instanceof RoomNotFoundError) {
      return err(404, ERROR_CODES.NOT_FOUND, error.message);
    }

    console.error('Unhandled error in GET /api/staff/rooms/[id]:', error);
    return err(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while fetching room details.'
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/staff/rooms/[id] (P02-M02-T12)
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
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

    const { id: rawId } = await context.params;
    const roomId = parseInt(rawId, 10);
    if (isNaN(roomId) || roomId <= 0) {
      return err(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid roomId: must be a positive integer.'
      );
    }

    // Check branch scope before modifying
    const existing = await roomService.getRoomById(roomId);
    if (session.role === 'Receptionist' && session.branchId !== existing.branch_id) {
      return err(
        403,
        ERROR_CODES.BRANCH_SCOPE_VIOLATION,
        'Access restricted to your assigned branch.'
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return err(400, ERROR_CODES.VALIDATION_ERROR, 'Malformed JSON body.');
    }

    const parsed = UpdateRoomStatusSchema.safeParse(rawBody);
    if (!parsed.success) {
      return err(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid room status payload.',
        zodFieldErrors(parsed.error)
      );
    }

    const updatedRoom = await roomService.updateRoomStatus(roomId, {
      status: parsed.data.status,
      requesterRole: session.role,
    });

    return ok(updatedRoom);
  } catch (error) {
    if (error instanceof RoomNotFoundError) {
      return err(404, ERROR_CODES.NOT_FOUND, error.message);
    }

    if (error instanceof RoomStatusForbiddenError) {
      return err(403, ERROR_CODES.INSUFFICIENT_ROLE, error.message);
    }

    if (error instanceof RoomValidationError) {
      return err(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        error.message,
        error.fields
      );
    }

    console.error('Unhandled error in PATCH /api/staff/rooms/[id]:', error);
    return err(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while updating room status.'
    );
  }
}
