/**
 * GuestNav — navigation bar for guest-facing pages.
 *
 * Owned by: Member 1 (M1) | Implemented in: P01-M01-T13
 * See context/06-ui-tokens.md for design tokens.
 * See context/07-ui-rules.md for UI rules.
 * See ui-registry.md for approved component patterns.
 *
 * TODO (P01-M01-T13): Implement with SkyNest brand colors, responsive design,
 * session-aware links (show My Reservations only when logged in).
 */

export default function GuestNav() {
  // TODO: Implement
  return (
    <nav aria-label="Guest navigation">
      {/* Placeholder — implement in P01-M01-T13 */}
      <a href="/">SkyNest Hotels</a>
      <a href="/search">Search Rooms</a>
      <a href="/guest/login">Login</a>
      <a href="/guest/register">Register</a>
    </nav>
  );
}
