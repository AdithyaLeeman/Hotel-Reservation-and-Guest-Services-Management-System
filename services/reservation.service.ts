/**
 * Reservation Service — orchestrates reservation creation, retrieval, and cancellation.
 *
 * Architectural rules:
 *   - DB-first: sp_create_reservation() and sp_cancel_reservation() own all
 *     atomic mutations. This layer calls those via the repository — never
 *     reimplements their logic.
 *   - SQLSTATE mapping: DB error codes (45001, 45010, P0002) are caught here
 *     and re-thrown as typed ServiceError so route handlers stay thin.
 *   - Security: guest_id and user_id are always passed in from the session
 *     (provided by the caller). They are NEVER read from input/request body.
 *
 * Error model:
 *   ServiceError.code values route handlers should handle:
 *     'ROOM_OVERLAP'            — 409 Conflict
 *     'ROOM_BRANCH_MISMATCH'    — 422 Unprocessable Entity
 *     'ROOM_IN_MAINTENANCE'     — 422 Unprocessable Entity
 *     'NOT_FOUND'               — 404 Not Found
 *     'INVALID_STATUS_TRANSITION' — 409 Conflict
 *
 * Owned by: Member 3 (M3) — Hiripitiya S.K., 240238C
 * Tasks:    P03-M03-T10 (createGuestReservation / createStaffReservation)
 *           P03-M03-T06 (getGuestReservations / listActiveReservations)
 *           P03-M03-T07 (getReservationDetail)
 *           P03-M03-T04 (cancelReservation)
 */

import { pool } from '@/lib/db/pool';
import {
  reservationRepository,
  type CreateReservationParams,
  type ReservationDetail,
  type ActiveReservationRow,
} from '@/repositories/reservation.repository';
import type { Reservation } from '@/types/domain';
import type { CreateReservationInput } from '@/lib/validation/reservation.schema';
import type { SessionData } from '@/types/session';
import { isSqlState } from '@/types/api';
import { SQLSTATE } from '@/types/enums';

// ---------------------------------------------------------------------------
// Typed service errors — route handlers catch these instead of raw DB errors
// ---------------------------------------------------------------------------

export type ServiceErrorCode =
  | 'ROOM_OVERLAP'
  | 'ROOM_BRANCH_MISMATCH'
  | 'ROOM_IN_MAINTENANCE'
  | 'NOT_FOUND'
  | 'INVALID_STATUS_TRANSITION';

export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

// ---------------------------------------------------------------------------
// Internal helper: map a raw DB / mock error code → ServiceError
// ---------------------------------------------------------------------------

function mapDbError(err: unknown): ServiceError | null {
  if (isSqlState(err, SQLSTATE.ROOM_OVERLAP))
    return new ServiceError('ROOM_OVERLAP', 'One or more rooms are already reserved for the requested dates.');
  if (isSqlState(err, SQLSTATE.ROOM_BRANCH_MISMATCH))
    return new ServiceError('ROOM_BRANCH_MISMATCH', 'One or more rooms do not belong to the requested branch.');
  if (isSqlState(err, SQLSTATE.ROOM_IN_MAINTENANCE))
    return new ServiceError('ROOM_IN_MAINTENANCE', 'One or more rooms are currently in Maintenance and cannot be reserved.');
  if (isSqlState(err, 'P0002'))
    return new ServiceError('NOT_FOUND', 'Reservation not found.');
  if (isSqlState(err, SQLSTATE.NOT_BOOKED_STATUS))
    return new ServiceError('INVALID_STATUS_TRANSITION', 'Only reservations with status "Booked" can be cancelled.');
  return null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const reservationService = {
  // -------------------------------------------------------------------------
  // P03-M03-T10 — Create reservation (guest path)
  // -------------------------------------------------------------------------

  /**
   * Create a reservation on behalf of an authenticated guest.
   *
   * Reads guest_id and user_id exclusively from the server-side session.
   * Delegates the atomic INSERT + overlap check to sp_create_reservation()
   * via the repository.
   *
   * @param input    — validated CreateReservationInput from Zod schema
   * @param session  — server-side session (guest_id sourced from here)
   * @returns        — { reservation_id } of the newly created reservation
   * @throws ServiceError on room overlap, branch mismatch, or maintenance
   */
  createGuestReservation: async (
    input: CreateReservationInput,
    session: Pick<SessionData, 'userId' | 'guestId'>
  ): Promise<{ reservation_id: string }> => {
    if (!session.guestId) {
      throw new ServiceError('NOT_FOUND', 'Guest profile not found in session.');
    }

    const params: CreateReservationParams = {
      guest_id:              session.guestId,          // ALWAYS from session — never input
      branch_id:             input.branch_id,
      check_in_date:         input.check_in_date,
      check_out_date:        input.check_out_date,
      room_ids:              input.room_ids,
      booking_source:        'Online',                 // guest-portal bookings are always Online
      created_by_user_id:    session.userId,
      employee_id:           null,                     // no employee for guest-initiated bookings
      discount_percentage:   input.discount_percentage != null
                               ? input.discount_percentage.toFixed(2)
                               : null,
    };

    // sp_create_reservation owns its own transaction — do NOT wrap in BEGIN/COMMIT
    const client = await pool.connect();
    try {
      return await reservationRepository.callCreateReservation(client, params);
    } catch (err) {
      const mapped = mapDbError(err);
      if (mapped) throw mapped;
      throw err; // unexpected error — let route handler return 500
    } finally {
      client.release();
    }
  },

  // -------------------------------------------------------------------------
  // P03-M03-T10 — Create reservation (staff path)
  // -------------------------------------------------------------------------

  /**
   * Create a reservation on behalf of a staff member (Receptionist / Manager).
   *
   * Staff can set booking_source to 'Reception' or 'Phone' and may apply a
   * discount. The employee_id is read from the session.
   *
   * @param input    — validated CreateReservationInput from Zod schema
   * @param session  — staff session (employeeId sourced from here)
   * @param guestId  — guest_id for the target guest (looked up by staff, must
   *                   be verified as a real guest before calling this method)
   * @returns        — { reservation_id } of the newly created reservation
   * @throws ServiceError on room overlap, branch mismatch, or maintenance
   */
  createStaffReservation: async (
    input: CreateReservationInput,
    session: Pick<SessionData, 'userId' | 'employeeId'>,
    guestId: string
  ): Promise<{ reservation_id: string }> => {
    const params: CreateReservationParams = {
      guest_id:              guestId,
      branch_id:             input.branch_id,
      check_in_date:         input.check_in_date,
      check_out_date:        input.check_out_date,
      room_ids:              input.room_ids,
      booking_source:        input.booking_source,     // staff can use Reception / Phone
      created_by_user_id:    session.userId,
      employee_id:           session.employeeId ?? null,
      discount_percentage:   input.discount_percentage != null
                               ? input.discount_percentage.toFixed(2)
                               : null,
    };

    const client = await pool.connect();
    try {
      return await reservationRepository.callCreateReservation(client, params);
    } catch (err) {
      const mapped = mapDbError(err);
      if (mapped) throw mapped;
      throw err;
    } finally {
      client.release();
    }
  },

  // -------------------------------------------------------------------------
  // P03-M03-T06 — List reservations for a guest
  // -------------------------------------------------------------------------

  /**
   * Return all reservations belonging to the authenticated guest, newest first.
   *
   * SECURITY: guestId is sourced from the session by the route handler.
   * It must NOT be taken from the request URL or body.
   *
   * @param guestId  — session.guestId
   * @returns        — array of Reservation rows (may be empty)
   */
  getGuestReservations: async (guestId: string): Promise<Reservation[]> => {
    return reservationRepository.listByGuestId(guestId);
  },

  // -------------------------------------------------------------------------
  // P03-M03-T06 — List active reservations for staff
  // -------------------------------------------------------------------------

  /**
   * Return active (Booked + CheckedIn) reservations for the staff dashboard.
   *
   * Branch scoping:
   *   - Receptionist: pass session.branchId → scoped to their branch
   *   - Manager / Admin: pass null → returns all branches
   *
   * @param branchId  — session.branchId for Receptionist; null for Manager/Admin
   * @returns         — array of ActiveReservationRow
   */
  listActiveReservations: async (
    branchId: number | null
  ): Promise<ActiveReservationRow[]> => {
    return reservationRepository.listActive(branchId);
  },

  // -------------------------------------------------------------------------
  // P03-M03-T07 — Get full reservation detail
  // -------------------------------------------------------------------------

  /**
   * Return the full detail view of a single reservation.
   *
   * Ownership is enforced at the DB level via fn_get_reservation_detail():
   *   - Guest access: pass guestId from session → ownership enforced in SQL
   *   - Staff access: pass null → no ownership restriction
   *
   * Returns null (→ 404) if the reservation is not found or (for guest access)
   * does not belong to the requesting guest — same result to prevent info leakage.
   *
   * @param reservationId  — UUID from URL param
   * @param guestId        — session.guestId for guest; null for staff
   * @returns              — ReservationDetail or null
   */
  getReservationDetail: async (
    reservationId: string,
    guestId: string | null
  ): Promise<ReservationDetail | null> => {
    return reservationRepository.findDetailById(reservationId, guestId);
  },

  // -------------------------------------------------------------------------
  // P03-M03-T04 — Cancel reservation
  // -------------------------------------------------------------------------

  /**
   * Cancel a reservation.
   *
   * Delegates to sp_cancel_reservation() which:
   *   - Locks the row (FOR UPDATE)
   *   - Allows only 'Booked' status to be cancelled (raises 45010 otherwise)
   *   - Enforces guest ownership when guestId is provided
   *
   * @param reservationId      — UUID from URL param
   * @param cancelledByUserId  — session.userId of the actor (for audit trail)
   * @param guestId            — session.guestId for guest cancellations;
   *                             null for staff override (no ownership check)
   * @throws ServiceError 'NOT_FOUND' if not found or (for guest) wrong owner
   * @throws ServiceError 'INVALID_STATUS_TRANSITION' if not in 'Booked' status
   */
  cancelReservation: async (
    reservationId: string,
    cancelledByUserId: string,
    guestId: string | null
  ): Promise<void> => {
    try {
      await reservationRepository.callCancelReservation(
        reservationId,
        guestId,
        cancelledByUserId
      );
    } catch (err) {
      const mapped = mapDbError(err);
      if (mapped) throw mapped;
      throw err;
    }
  },
};
