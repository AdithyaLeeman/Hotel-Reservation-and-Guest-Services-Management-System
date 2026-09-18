/**
 * Reservation Repository — calls sp_create_reservation() and retrieval queries.
 *
 * Security: guest_id comes from session — NEVER from request parameters.
 * All guest queries include WHERE guest_id = $1 with the session-derived ID.
 *
 * Owned by: Member 3 (M3) | Implemented in: P03-M03-T03, T06, T07
 */
import type { PoolClient } from '@/lib/db/pool';
import type { Reservation } from '@/types/domain';

export const reservationRepository = {
  /**
   * Calls sp_create_reservation() stored procedure atomically.
   * The procedure handles overlap check + room allocation.
   */
  callCreateReservation: async (
    _client: PoolClient,
    _params: unknown
  ): Promise<{ reservation_id: string }> => {
    // TODO: CALL sp_create_reservation($1, $2, ...) RETURNING p_reservation_id
    throw new Error('reservationRepository.callCreateReservation not implemented — P03-M03-T03');
  },

  /**
   * List reservations for a guest.
   * @param guestId — MUST come from session.guestId, not request parameters.
   */
  listByGuestId: async (
    _guestId: string
  ): Promise<Reservation[]> => {
    // TODO: SELECT * FROM reservation WHERE guest_id = $1 ORDER BY created_at DESC
    throw new Error('reservationRepository.listByGuestId not implemented — P03-M03-T06');
  },

  /**
   * Get a reservation by ID, enforcing guest ownership.
   * @param reservationId
   * @param guestId — MUST come from session.guestId
   */
  findByIdAndGuestId: async (
    _reservationId: string,
    _guestId: string
  ): Promise<Reservation | null> => {
    // TODO: SELECT * FROM reservation WHERE reservation_id = $1 AND guest_id = $2
    throw new Error('reservationRepository.findByIdAndGuestId not implemented — P03-M03-T07');
  },

  findById: async (_reservationId: string): Promise<Reservation | null> => {
    throw new Error('reservationRepository.findById not implemented — P03-M03-T08');
  },
};
