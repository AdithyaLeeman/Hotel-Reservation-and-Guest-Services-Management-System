import type { NextRequest } from 'next/server';
import type { SessionData } from '@/types/session';

/**
 * Session management using iron-session.
 *
 * Session stores: { userId, role, guestId?, employeeId?, branchId? }
 * See docs/21_shared-contracts.md Section 7 for the full session shape contract.
 *
 * Security rules:
 * - Never trust any session field supplied by the browser
 * - Read session on every protected request — do not cache in app state
 * - Guest ownership always derived from session.guestId
 *
 * TODO (P01-M01-T07): Install iron-session, configure session options, implement.
 * Lecture alignment: L07 (application security)
 */

// TODO: import { getIronSession } from 'iron-session';

export const SESSION_COOKIE_NAME = 'hrgsms_session';

export const sessionOptions = {
  cookieName: SESSION_COOKIE_NAME,
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

/**
 * Get the current session from a request.
 * Returns null-like session if not authenticated.
 *
 * TODO: Implement using iron-session v8 API
 */
export async function getSession(
  _req: NextRequest
): Promise<Partial<SessionData>> {
  // TODO: return getIronSession<SessionData>(req, res, sessionOptions);
  throw new Error('getSession not yet implemented — P01-M01-T07');
}

/**
 * Destroy the current session (logout).
 *
 * TODO: Implement using iron-session v8 API
 */
export async function destroySession(_req: NextRequest): Promise<void> {
  // TODO: const session = await getSession(req); session.destroy();
  throw new Error('destroySession not yet implemented — P01-M01-T07');
}
