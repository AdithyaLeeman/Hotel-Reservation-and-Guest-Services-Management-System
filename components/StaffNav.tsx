/**
 * StaffNav — navigation bar for staff portal pages.
 *
 * Owned by: Member 1 (M1) | Implemented in: P01-M01-T13
 *
 * Role-conditional nav:
 * - Receptionist: Reservations, Rooms (own branch only)
 * - Manager: Reservations, Rooms, Reports
 * - Admin: Reservations, Rooms, Reports, Admin panel
 *
 * Branch scope display: show assigned branch name in nav for Receptionist.
 *
 * TODO (P01-M01-T13): Implement with role-aware conditional rendering.
 * Role must come from server-side session — never from client state.
 */

export default function StaffNav() {
  // TODO: Implement — read role from server component session
  return (
    <nav aria-label="Staff navigation">
      {/* Placeholder — implement in P01-M01-T13 */}
      <a href="/staff/dashboard">Dashboard</a>
      <a href="/staff/reservations">Reservations</a>
      <a href="/staff/rooms">Rooms</a>
    </nav>
  );
}
