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
