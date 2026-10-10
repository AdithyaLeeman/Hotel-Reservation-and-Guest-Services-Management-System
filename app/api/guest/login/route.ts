import { authService, AuthServiceError } from '@/services/auth.service';
import { getSession } from '@/lib/auth/session';
import { GuestLoginSchema, flattenZodErrors } from '@/lib/validation/auth.schema';
import { ERROR_CODES } from '@/types/api';

export async function POST(req: Request): Promise<Response> {
  // Step 1 — Parse + validate input shape
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  const parsed = GuestLoginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          fields: flattenZodErrors(parsed.error),
        },
      },
      { status: 400 }
    );
  }

  try {
    // Step 2 — Verify credentials + fetch guest profile
    const sessionData = await authService.loginGuest(parsed.data);

    // Step 3 — Write session
    const session = await getSession();
    session.userId = sessionData.userId;
    session.role = sessionData.role;
    session.guestId = sessionData.guestId;
    await session.save();

    // Step 4 — Return safe session info (never return password_hash)
    return Response.json(
      {
        data: {
          userId: sessionData.userId,
          role: sessionData.role,
          guestId: sessionData.guestId,
        },
        meta: { requestId: crypto.randomUUID() },
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof AuthServiceError) {
      if (err.code === 'INVALID_CREDENTIALS') {
        return Response.json(
          { error: { code: ERROR_CODES.NOT_AUTHENTICATED, message: err.message } },
          { status: 401 }
        );
      }
      if (err.code === 'ACCOUNT_INACTIVE') {
        return Response.json(
          { error: { code: ERROR_CODES.INSUFFICIENT_ROLE, message: err.message } },
          { status: 403 }
        );
      }
    }

    console.error('[POST /api/guest/login] Unexpected error:', err);
    return Response.json(
      { error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Login failed' } },
      { status: 500 }
    );
  }
}
