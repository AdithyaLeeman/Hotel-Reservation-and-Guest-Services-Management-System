/**
 * Check-in Service — Mock-First Implementation
 *
 * Orchestrates the check-in workflow:
 *   1. Verify the session employee has branch access to the reservation.
 *   2. Call the repository which (in mock) transitions reservation → CheckedIn
 *      and marks all reservation rooms → Occupied.
 *
 * DB-first rule:
 *   In production (P06-M04-T01), the real implementation calls sp_check_in()
 *   which performs the status transition + room status update atomically inside
 *   a single PostgreSQL transaction. This service MUST NOT reproduce that logic
 *   in TypeScript — it must only call the stored procedure.
 *
 * Mock swap plan (Phase 6 / P06-M04-T01):
 *   checkinRepository.callCheckIn(reservationId, employeeId)
 *   → CALL sp_check_in($1, $2)
 *   where $1 = p_reservation_id, $2 = p_employee_id
 *
 * Error states (mirrored from sp_check_in SQLSTATE codes):
 *   SQLSTATE '45010' (NOT_BOOKED_STATUS) — reservation is not in 'Booked' status
 *   SQLSTATE '45003' (ROOM_IN_MAINTENANCE) — a reserved room is in Maintenance
 *   SQLSTATE '23503' — reservation not found (FK / record missing)
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T10 (Mock-First)
 * Lecture alignment: L08 (transactions), L09 (concurrency)
 */

import type { ReservationStatus } from '@/types/enums';

// ---------------------------------------------------------------------------
// Mock in-memory state that mirrors the reservation store.
// In the real implementation this state lives entirely in PostgreSQL.
// ---------------------------------------------------------------------------

/**
 * Minimal mock reservation record used by this service.
 * The real implementation queries the DB inside sp_check_in().
 */
interface MockReservation {
  reservation_id: string;
  branch_id: number;
  reservation_status: ReservationStatus;
}

// Seed a few representative mock reservations.
// These parallel the mock data in reservation.repository.ts (M3's mock store).
const MOCK_RESERVATIONS: MockReservation[] = [
  { reservation_id: 'RES-MOCK-001', branch_id: 1, reservation_status: 'Booked' },
  { reservation_id: 'RES-MOCK-002', branch_id: 1, reservation_status: 'Booked' },
  { reservation_id: 'RES-MOCK-003', branch_id: 2, reservation_status: 'CheckedIn' },
  { reservation_id: 'RES-MOCK-004', branch_id: 3, reservation_status: 'Booked' },
];

// ---------------------------------------------------------------------------
// ServiceError — structured error with a machine-readable code.
// Route handlers map these to appropriate HTTP status codes.
// ---------------------------------------------------------------------------

export class CheckinServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'NOT_BOOKED_STATUS'
      | 'BRANCH_SCOPE_VIOLATION',
    message: string
  ) {
    super(message);
    this.name = 'CheckinServiceError';
  }
}

// ---------------------------------------------------------------------------
// Check-in service
// ---------------------------------------------------------------------------

export const checkinService = {
  /**
   * Perform a check-in for the given reservation.
   *
   * Mock-first: transitions the in-memory reservation to 'CheckedIn'.
   * Real implementation: CALL sp_check_in($1, $2)
   *
   * @param reservationId - The reservation to check in.
   * @param employeeId    - The staff member performing the check-in (from session).
   * @param branchId      - The branch scope of the employee (null = all-branch access).
   */
  checkIn: async (
    reservationId: string,
    employeeId: number,
    branchId: number | null
  ): Promise<void> => {
    const reservation = MOCK_RESERVATIONS.find(
      (r) => r.reservation_id === reservationId
    );

    if (!reservation) {
      throw new CheckinServiceError(
        'NOT_FOUND',
        `Reservation ${reservationId} not found.`
      );
    }

    // Branch scope enforcement: Receptionist can only check in reservations
    // for their own branch. Manager/Admin (branchId = null) can check in any.
    if (branchId !== null && reservation.branch_id !== branchId) {
      throw new CheckinServiceError(
        'BRANCH_SCOPE_VIOLATION',
        `Reservation ${reservationId} does not belong to branch ${branchId}.`
      );
    }

    // Status guard — mirrors sp_check_in SQLSTATE '45010'
    if (reservation.reservation_status !== 'Booked') {
      throw new CheckinServiceError(
        'NOT_BOOKED_STATUS',
        `Reservation ${reservationId} cannot be checked in — current status is '${reservation.reservation_status}'. Expected 'Booked'.`
      );
    }

    // Transition: Booked → CheckedIn (mirrors sp_check_in() transaction)
    reservation.reservation_status = 'CheckedIn';

    // In the real implementation sp_check_in() also updates:
    //   UPDATE room SET status = 'Occupied' WHERE room_id IN (reservation room ids)
    // The mock omits room status update as room state lives in M2's store.

    void employeeId; // employeeId is passed to sp_check_in in real implementation
  },

  /**
   * Reset mock store to seed state.
   * Used by test suites (beforeEach).
   */
  _resetMockStore: (): void => {
    MOCK_RESERVATIONS.length = 0;
    MOCK_RESERVATIONS.push(
      { reservation_id: 'RES-MOCK-001', branch_id: 1, reservation_status: 'Booked' },
      { reservation_id: 'RES-MOCK-002', branch_id: 1, reservation_status: 'Booked' },
      { reservation_id: 'RES-MOCK-003', branch_id: 2, reservation_status: 'CheckedIn' },
      { reservation_id: 'RES-MOCK-004', branch_id: 3, reservation_status: 'Booked' }
    );
  },
};
