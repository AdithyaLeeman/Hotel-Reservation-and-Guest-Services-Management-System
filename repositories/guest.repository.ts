/**
 * Guest Repository — parameterized SQL for guest profile operations.
 * Owned by: Member 1 (M1) | Implemented in: P01-M01-T08
 */
import type { PoolClient } from '@/lib/db/pool';
import type { Guest } from '@/types/domain';

export const guestRepository = {
  insertGuest: async (_client: PoolClient, _input: unknown): Promise<Guest> => {
    throw new Error('guestRepository.insertGuest not implemented — P01-M01-T08');
  },
  findByUserId: async (_client: PoolClient, _userId: string): Promise<Guest | null> => {
    throw new Error('guestRepository.findByUserId not implemented — P01-M01-T09');
  },
};
