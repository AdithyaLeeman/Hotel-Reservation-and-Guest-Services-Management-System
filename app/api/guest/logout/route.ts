

import { getSession, destroySession } from '@/lib/auth/session';
import { ERROR_CODES } from '@/types/api';

export async function POST(): Promise<Response> {
  try {
    const session = await getSession();
    await destroySession(session);

    return Response.json(
      {
        data: { loggedOut: true },
        meta: { requestId: crypto.randomUUID() },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[POST /api/guest/logout] Unexpected error:', err);
    return Response.json(
      { error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Logout failed' } },
      { status: 500 }
    );
  }
}
