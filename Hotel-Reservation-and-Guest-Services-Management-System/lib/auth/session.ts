/**
 * Session management using iron-session v9 + Next.js App Router.
 *
 * iron-session v9 with App Router: pass `await cookies()` from `next/headers`
 * directly to `getIronSession`. The session is then read/written via
 * session.save() and session.destroy().
 *
 * Session shape contract: docs/21_shared-contracts.md Section 7.
 *
 * Security rules (AGENTS.md Section 10):
 * - Never trust any session field supplied by the browser.
 * - Always read session server-side on every protected request.
 * - Guest ownership is always derived from session.guestId — never from
 *   a client-supplied query param or request body field.
 * - SESSION_SECRET must be at least 32 characters (iron-session requirement).
 *
 * Task: P01-M01-T11
 * Lecture alignment: L07 (application security, session management)
 */

import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { IronSession, SessionOptions } from 'iron-session';
import type { SessionData } from '@/types/session';

export const SESSION_COOKIE_NAME = 'hrgsms_session';

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  // Only throw at startup — not during module evaluation — so tests that mock
  // the env variable can set it before requiring this module.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET environment variable must be set and at least 32 characters long.'
    );
  }
}

export const sessionOptions: SessionOptions = {
  cookieName: SESSION_COOKIE_NAME,
  password: process.env.SESSION_SECRET ?? 'dev_secret_replace_in_production_32+',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours in seconds
  },
};

/**
 * Get the current iron-session from the App Router cookie store.
 *
 * Call this inside a Server Component, Route Handler, or Server Action.
 * The returned object is mutable: assign fields then call session.save().
 *
 * @returns IronSession<SessionData> — contains session fields or empty object
 *
 * @example
 * const session = await getSession();
 * if (!session.userId) return unauthorizedResponse();
 * const { role, guestId, branchId } = session;
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Destroy the current session (logout).
 * Clears the encrypted cookie and resets the session object.
 *
 * @example
 * const session = await getSession();
 * await destroySession(session);
 */
export async function destroySession(
  session: IronSession<SessionData>
): Promise<void> {
  session.destroy();
}
