/**
 * Room Service — manages room inventory and status.
 *
 * Owned by: Member 2 (M2)
 * Implemented in: P02-M02-T06, T08
 */

export const roomService = {
  listRooms: async (_branchId?: number): Promise<void> => {
    throw new Error('roomService.listRooms not yet implemented — P02-M02-T06');
  },
  createRoom: async (_input: unknown): Promise<void> => {
    throw new Error('roomService.createRoom not yet implemented — P02-M02-T06');
  },
  updateRoom: async (_roomId: number, _input: unknown): Promise<void> => {
    throw new Error('roomService.updateRoom not yet implemented — P02-M02-T08');
  },
};
