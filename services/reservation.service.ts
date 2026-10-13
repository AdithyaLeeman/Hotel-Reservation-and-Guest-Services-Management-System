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

// Typed service errors - route handlers catch these instead of raw DB errors

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

// Internal helper: map a raw DB / mock error code → ServiceError

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

// Service

export const reservationService = {
  // P03-M03-T10 - Create reservation (guest path)

  // Create a reservation on behalf of an authenticated guest.
  createGuestReservation: async (
    input: CreateReservationInput,
    session: Pick<SessionData, 'userId' | 'guestId'>
  ): Promise<{ reservation_id: string }> => {
    if (!session.guestId) {
      throw new ServiceError('NOT_FOUND', 'Guest profile not found in session.');
    }

    const params: CreateReservationParams = {
      guest_id:              session.guestId,          // ALWAYS from session - never input
      branch_id:             input.branch_id,
      check_in_date:         input.check_in_date,
      check_out_date:        input.check_out_date,
      room_ids:              input.room_ids,
      booking_source:        'Online',                 // guest-portal bookings are always Online
      created_by_user_id:    session.userId,
      employee_id:           null,                     // no employee for guest-initiated bookings
      // Pass discount as number|null - PostgreSQL casts it to NUMERIC(5,2) via the procedure.
      // Authoritative financial computation stays in SQL (context/04-code-standards.md).
      discount_percentage:   input.discount_percentage ?? null,
    };

    // sp_create_reservation owns its own transaction - do NOT wrap in BEGIN/COMMIT
    const client = await pool.connect();
    try {
      return await reservationRepository.callCreateReservation(client, params);
    } catch (err) {
      const mapped = mapDbError(err);
      if (mapped) throw mapped;
      throw err; // unexpected error - let route handler return 500
    } finally {
      client.release();
    }
  },

  // P03-M03-T10 - Create reservation (staff path)

  // Create a reservation on behalf of a staff member (Receptionist / Manager).
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
      // Pass discount as number|null - PostgreSQL casts it to NUMERIC(5,2) via the procedure.
      // Authoritative financial computation stays in SQL (context/04-code-standards.md).
      discount_percentage:   input.discount_percentage ?? null,
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

  // P03-M03-T06 - List reservations for a guest

  // Return all reservations belonging to the authenticated guest, newest first.
  getGuestReservations: async (guestId: string): Promise<Reservation[]> => {
    return reservationRepository.listByGuestId(guestId);
  },

  // P03-M03-T06 - List active reservations for staff

  // Return active (Booked + CheckedIn) reservations for the staff dashboard.
  listActiveReservations: async (
    branchId: number | null
  ): Promise<ActiveReservationRow[]> => {
    return reservationRepository.listActive(branchId);
  },

  // P03-M03-T07 - Get full reservation detail

  // Return the full detail view of a single reservation.
  getReservationDetail: async (
    reservationId: string,
    guestId: string | null
  ): Promise<ReservationDetail | null> => {
    return reservationRepository.findDetailById(reservationId, guestId);
  },

  // P03-M03-T04 - Cancel reservation

  // Cancel a reservation.
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
