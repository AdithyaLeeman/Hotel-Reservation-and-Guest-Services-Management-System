/**
 * Room Repository — parameterized SQL for room and room type queries.
 * Owned by: Member 2 (M2) | Implemented in: P02-M02-T06
 */
import type { Room } from '@/types/domain';

export const roomRepository = {
  listByBranch: async (_branchId: number): Promise<Room[]> => {
    throw new Error('roomRepository.listByBranch not implemented — P02-M02-T06');
  },
  findById: async (_roomId: number): Promise<Room | null> => {
    throw new Error('roomRepository.findById not implemented — P02-M02-T06');
  },
  insert: async (_input: unknown): Promise<Room> => {
    throw new Error('roomRepository.insert not implemented — P02-M02-T06');
  },
  updateStatus: async (_roomId: number, _status: string): Promise<void> => {
    throw new Error('roomRepository.updateStatus not implemented — P02-M02-T08');
  },
};
