/**
 * Reservation Service — orchestrates reservation creation, retrieval, and cancellation.
 *
 * DB-first rule: sp_create_reservation() owns the atomic creation + overlap check.
 * This service calls the stored procedure via the repository layer.
 *
 * Security: guest_id MUST come from session, never from input parameters.
 *
 * Owned by: Member 3 (M3)
 * Implemented in: P03-M03-T04, T06, T07, T08, T10
 */

// TODO (P03-M03-T04): Implement createGuestReservation()
// TODO (P03-M03-T06): Implement getGuestReservations()
// TODO (P03-M03-T07): Implement getReservationDetail()
// TODO (P03-M03-T08): Implement createStaffReservation()
// TODO (P03-M03-T10): Implement cancelReservation()

export const reservationService = {
  createGuestReservation: async (_input: unknown): Promise<void> => {
    throw new Error('reservationService.createGuestReservation not yet implemented — P03-M03-T04');
  },
  getGuestReservations: async (_guestId: string): Promise<void> => {
    throw new Error('reservationService.getGuestReservations not yet implemented — P03-M03-T06');
  },
  getReservationDetail: async (_reservationId: string, _guestId: string): Promise<void> => {
    throw new Error('reservationService.getReservationDetail not yet implemented — P03-M03-T07');
  },
  cancelReservation: async (_reservationId: string, _actorId: string): Promise<void> => {
    throw new Error('reservationService.cancelReservation not yet implemented — P03-M03-T10');
  },
};
