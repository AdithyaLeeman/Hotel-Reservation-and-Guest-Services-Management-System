/**
 * Check-in Service — calls sp_check_in() atomically.
 *
 * DB-first rule: sp_check_in() owns the state transition + room status update.
 * This service verifies the reservation belongs to the employee's branch before calling.
 *
 * Owned by: Member 4 (M4)
 * Implemented in: P04-M04-T04
 */

export const checkinService = {
  checkIn: async (_reservationId: string, _employeeId: number): Promise<void> => {
    throw new Error('checkinService.checkIn not yet implemented — P04-M04-T04');
  },
};
