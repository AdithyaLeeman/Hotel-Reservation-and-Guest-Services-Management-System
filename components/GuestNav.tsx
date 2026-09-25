/**
 * GuestNav — Navigation bar for guest-facing pages.
 *
 * Owned by: Member 1 (M1) | Task: P01-M01-T24
 * Design tokens: context/06-ui-tokens.md / app/globals.css
 * UI rules:      context/07-ui-rules.md
 *
 * Architecture:
 *  - This is a React Server Component that reads the session server-side.
 *  - `isLoggedIn` and `guestName` are derived from the server session and
 *    passed into the GuestNavClient (Client Component) for interactive behavior.
 *  - Session fields are NEVER trusted from the browser — AGENTS.md § 10.
 *
 * Links shown:
 *  - Always: SkyNest logo, Search Rooms
 *  - Guest logged in: My Reservations, [name] greeting, Logout
 *  - Guest not logged in: Login, Register
 */

import { getSession } from '@/lib/auth/session';
import GuestNavClient from './GuestNavClient';

export default async function GuestNav() {
  const session = await getSession();
  const isLoggedIn = Boolean(session?.userId && session?.role === 'Guest');
  // guestName is not stored in the session (only guestId is).
  // TODO (P06-M01-T01): fetch guest full_name from DB using session.guestId
  //   and pass it here so the nav can display the greeting.
  const guestName: string | null = null;

  return (
    <GuestNavClient
      isLoggedIn={isLoggedIn}
      guestName={guestName}
    />
  );
}
