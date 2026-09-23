/**
 * Route: /api/guest/reservations
 *
 * GET  — list all reservations for the authenticated guest
 * POST — create a new reservation for the authenticated guest
 *
 * Security:
 *   - guest_id is read from session.guestId — never from the request body
 *   - Role check: session.role must be 'Guest'
 *   - TODO (P01-M01-T07/T14): Replace DEV_SESSION stub with real iron-session
 *
 * Owned by: Member 3 (M3) | Tasks: P03-M03-T11, P03-M03-T12
 * Lecture alignment: L06 (REST API design), L07 (security, input validation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { CreateReservationSchema } from '@/lib/validation/reservation.schema';
import { reservationService, ServiceError } from '@/services/reservation.service';
import { ERROR_CODES } from '@/types/api';
import type { SessionData } from '@/types/session';

// ---------------------------------------------------------------------------
// DEV SESSION STUB
// Replace this entire block with real iron-session call once P01-M01-T07 lands:
//   import { getSession } from '@/lib/auth/session';
//   const session = await getSession(req);
//   if (!session.userId) return notAuthenticated();
// ---------------------------------------------------------------------------
function getDevSession(): Partial<SessionData> {
  return {
    userId:  'user-mock-001',
    role:    'Guest',
    guestId: 'guest-mock-001',
  };
}

// ---------------------------------------------------------------------------
// Shared response helpers
// ---------------------------------------------------------------------------

function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    { data, meta: { requestId: crypto.randomUUID() } },
    { status }
  );
}

function err(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

function notAuthenticated(): NextResponse {
  return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Not authenticated.');
}

// ---------------------------------------------------------------------------
// GET /api/guest/reservations — list my reservations
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  // TODO (P01-M01-T07): const session = await getSession(req);
  const session = getDevSession();

  if (!session.userId || session.role !== 'Guest') {
    return notAuthenticated();
  }
  if (!session.guestId) {
    return err(403, ERROR_CODES.INSUFFICIENT_ROLE, 'Guest profile not found in session.');
  }

  try {
    const reservations = await reservationService.getGuestReservations(session.guestId);
    return ok(reservations);
  } catch (error) {
    console.error('[GET /api/guest/reservations]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}

// ---------------------------------------------------------------------------
// POST /api/guest/reservations — create a reservation
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // TODO (P01-M01-T07): const session = await getSession(req);
  const session = getDevSession();

  if (!session.userId || session.role !== 'Guest') {
    return notAuthenticated();
  }
  if (!session.guestId) {
    return err(403, ERROR_CODES.INSUFFICIENT_ROLE, 'Guest profile not found in session.');
  }

  // Parse + validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Request body must be valid JSON.');
  }

  let input;
  try {
    input = CreateReservationSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of error.issues) {
        fields[issue.path.join('.')] = issue.message;
      }
      return NextResponse.json(
        { error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Validation failed.', fields } },
        { status: 400 }
      );
    }
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid request body.');
  }

  // Delegate to service (guest_id sourced from session inside service)
  try {
    const result = await reservationService.createGuestReservation(input, {
      userId:  session.userId,
      guestId: session.guestId,
    });
    return ok(result, 201);
  } catch (error) {
    if (error instanceof ServiceError) {
      switch (error.code) {
        case 'ROOM_OVERLAP':
          return err(409, ERROR_CODES.ROOM_OVERLAP, error.message);
        case 'ROOM_BRANCH_MISMATCH':
        case 'ROOM_IN_MAINTENANCE':
          return err(422, ERROR_CODES.CONFLICT, error.message);
        case 'NOT_FOUND':
          return err(404, ERROR_CODES.NOT_FOUND, error.message);
        default:
          return err(500, ERROR_CODES.INTERNAL_ERROR, error.message);
      }
    }
    console.error('[POST /api/guest/reservations]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}
