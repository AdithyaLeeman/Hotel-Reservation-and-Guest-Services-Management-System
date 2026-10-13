import { pool } from '@/lib/db/pool';
import type { ReservationStatus } from '@/types/enums';

// CheckinServiceError - structured error with machine-readable code.
// Route handlers map these to appropriate HTTP status codes.

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

// Row shape for the branch-scope pre-check query

interface ReservationBranchRow {
  branch_id: number;
  reservation_status: ReservationStatus;
}

// Check-in service

export const checkinService = {
  // Perform a check-in for the given reservation.
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
          `Reservation ${reservationId} cannot be checked in - ${msg}`
        );
      }
      if (pgErr.code === '45003') {
        throw new CheckinServiceError(
          'ROOM_IN_MAINTENANCE',
          `Cannot check in - one or more reserved rooms are in Maintenance.`
        );
      }

      throw err;
    } finally {
      client.release();
    }
  },

  // No-op mock store reset for test compatibility (docs/21_shared-contracts.md).
  // The mock store has been removed; this stub ensures existing test setups
  // that call _resetMockStore() continue to compile and run without error.
  _resetMockStore: (): void => {},
};
