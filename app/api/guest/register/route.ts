
import { authService } from '@/services/auth.service';
import { getSession } from '@/lib/auth/session';
import { GuestRegisterSchema, flattenZodErrors } from '@/lib/validation/auth.schema';
import { ERROR_CODES, isSqlState } from '@/types/api';

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

  const parsed = GuestRegisterSchema.safeParse(body);
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
    // Step 2 — Register guest (atomic insert: user_account + guest)
    const { user, guest } = await authService.registerGuest(parsed.data);

    // Step 3 — Write session
    const session = await getSession();
    session.userId = user.user_id;
    session.role = 'Guest';
    session.guestId = guest.guest_id;
    await session.save();

    // Step 4 — Return safe profile (no password_hash)
    return Response.json(
      {
        data: {
          userId: user.user_id,
          guestId: guest.guest_id,
          username: user.username,
          fullName: guest.full_name,
          email: guest.email,
        },
        meta: { requestId: crypto.randomUUID() },
      },
      { status: 201 }
    );
  } catch (err) {
    // SQLSTATE 23505 — UNIQUE violation (duplicate username or email)
    if (isSqlState(err, '23505')) {
      return Response.json(
        {
          error: {
            code: ERROR_CODES.CONFLICT,
            message: 'An account with that username or email already exists',
          },
        },
        { status: 409 }
      );
    }

    console.error('[POST /api/guest/register] Unexpected error:', err);
    return Response.json(
      { error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Registration failed' } },
      { status: 500 }
    );
  }
}
