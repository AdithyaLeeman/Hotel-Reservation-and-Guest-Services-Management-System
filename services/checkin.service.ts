/**
 * Check-in Service — Real DB Implementation
 *
 * Orchestrates the check-in workflow:
 *   1. Verify the session employee has branch access to the reservation.
 *   2. Call the repository which delegates to sp_check_in() — the stored
 *      procedure performs the status transition + room status update atomically
 *      inside a single PostgreSQL transaction (L08 — transactions, L09 — concurrency).
 *
 * DB-first rule (AGENTS.md §5):
 *   sp_check_in() owns the entire state transition. This service MUST NOT
 *   reproduce any status check or room update in TypeScript — it only calls
 *   the stored procedure and maps SQLSTATE errors to structured service errors.
 *
 * P06-M04-T01 — Mock store replaced with real pg Pool via checkinRepository.
 *
 * DB routines used:
 *   sp_check_in(p_reservation_id, p_employee_id) — P04-M04-T04
 *
 * Error states from sp_check_in SQLSTATE codes:
 *   SQLSTATE '23503' — reservation not found (FK / record missing)
 *   SQLSTATE '45010' — reservation is not in 'Booked' status
 *   SQLSTATE '45003' — a reserved room is in Maintenance
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T10
 * Lecture alignment: L08 (transactions), L09 (concurrency)
 */

import { pool } from '@/lib/db/pool';
import type { ReservationStatus } from '@/types/enums';

// ---------------------------------------------------------------------------
// CheckinServiceError — structured error with machine-readable code.
// Route handlers map these to appropriate HTTP status codes.
// ---------------------------------------------------------------------------

export class CheckinServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'NOT_BOOKED_STATUS'
      | 'ROOM_IN_MAINTENANCE'
      | 'BRANCH_SCOPE_VIOLATION',
    message: string
  ) {
    super(message);
    this.name = 'CheckinServiceError';
  }
}

// ---------------------------------------------------------------------------
// Row shape for the branch-scope pre-check query
// ---------------------------------------------------------------------------

interface ReservationBranchRow {
  branch_id: number;
  reservation_status: ReservationStatus;
}

// ---------------------------------------------------------------------------
// Check-in service
// ---------------------------------------------------------------------------

export const checkinService = {
  /**
   * Perform a check-in for the given reservation.
   *
   * Branch scope is verified before calling sp_check_in() so that
   * Receptionists cannot check in reservations outside their branch
   * (the stored procedure does not enforce branch scope — that is an
   * application-layer responsibility per AGENTS.md §10).
   *
   * The stored procedure (sp_check_in) atomically:
   *   - Guards: reservation must be in 'Booked' status (SQLSTATE 45010)
   *   - Guards: no reserved room is in Maintenance  (SQLSTATE 45003)
   *   - UPDATE reservation SET reservation_status = 'CheckedIn'
   *   - UPDATE room SET status = 'Occupied' for all rooms in the reservation
   *
   * @param reservationId - UUID of the reservation to check in.
   * @param employeeId    - Staff member performing the check-in (from session).
   * @param branchId      - Branch scope of the employee; null = all branches (Manager/Admin).
   */
  checkIn: async (
    reservationId: string,
    employeeId: number,
    branchId: number | null
  ): Promise<void> => {
    // Step 1: branch scope pre-check (application-layer guard).
    // We read branch_id from the reservation before calling sp_check_in().
    // This is a separate SELECT, not part of the procedure, so we do it
    // under a standard connection without locking.
    const scopeRes = await pool.query<ReservationBranchRow>(
      `SELECT branch_id, reservation_status
       FROM reservation
       WHERE reservation_id = $1::uuid`,
      [reservationId]
    );

    if (scopeRes.rows.length === 0) {
      throw new CheckinServiceError(
        'NOT_FOUND',
        `Reservation ${reservationId} not found.`
      );
    }

    const { branch_id: reservationBranchId } = scopeRes.rows[0];

    // Receptionist can only check in reservations for their own branch.
    // Manager and Admin (branchId = null) have no restriction.
    if (branchId !== null && Number(reservationBranchId) !== Number(branchId)) {
      throw new CheckinServiceError(
        'BRANCH_SCOPE_VIOLATION',
        `Reservation ${reservationId} does not belong to branch ${branchId}.`
      );
    }

    // Step 2: call sp_check_in() inside an explicit transaction.
    // The procedure raises SQLSTATE codes on guard failures; we catch and
    // map them to CheckinServiceError codes.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `CALL sp_check_in($1::uuid, $2::integer)`,
        [reservationId, employeeId]
      );
      await client.query('COMMIT');
    } catch (err: unknown) {
      await client.query('ROLLBACK');

      const pgErr = err as { code?: string; message?: string };
      const msg   = pgErr.message ?? '';

      if (pgErr.code === '23503') {
        throw new CheckinServiceError('NOT_FOUND', `Reservation ${reservationId} not found.`);
      }
      if (pgErr.code === '45010') {
        throw new CheckinServiceError(
          'NOT_BOOKED_STATUS',
          `Reservation ${reservationId} cannot be checked in — ${msg}`
        );
      }
      if (pgErr.code === '45003') {
        throw new CheckinServiceError(
          'ROOM_IN_MAINTENANCE',
          `Cannot check in — one or more reserved rooms are in Maintenance.`
        );
      }

      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * No-op mock store reset for test compatibility (docs/21_shared-contracts.md).
   * The mock store has been removed; this stub ensures existing test setups
   * that call _resetMockStore() continue to compile and run without error.
   */
  _resetMockStore: (): void => {},
};
