/**
 * Availability Repository — calls fn_get_available_rooms() PostgreSQL function.
 *
 * DB-first rule: availability is computed entirely in PostgreSQL.
 * This repository executes the function call and maps result rows.
 *
 * Owned by: Member 2 (M2) | Implemented in: P02-M02-T04
 */

export const availabilityRepository = {
  getAvailableRooms: async (
    _branchId: number,
    _checkIn: string,
    _checkOut: string
  ): Promise<unknown[]> => {
    // TODO: SELECT * FROM fn_get_available_rooms($1, $2, $3)
    throw new Error('availabilityRepository.getAvailableRooms not implemented — P02-M02-T04');
  },
};
