/**
 * Availability Service — calls fn_get_available_rooms() and returns results.
 *
 * DB-first rule: availability logic lives entirely in the PostgreSQL function.
 * This service only passes parameters and returns results.
 *
 * Owned by: Member 2 (M2)
 * Implemented in: P02-M02-T04
 */

// TODO (P02-M02-T04): Implement getAvailableRooms()

export const availabilityService = {
  getAvailableRooms: async (_input: unknown): Promise<void> => {
    throw new Error('availabilityService.getAvailableRooms not yet implemented — P02-M02-T04');
  },
};
