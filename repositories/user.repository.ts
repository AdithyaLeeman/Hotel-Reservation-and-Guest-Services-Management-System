/**
 * User Repository — parameterized SQL for user_account and authentication queries.
 *
 * Rules:
 * - All SQL uses $1, $2 placeholders (NEVER string concatenation)
 * - Never return password_hash in query results
 * - Use pool.query() for single queries; accept PoolClient for transactional operations
 *
 * Owned by: Member 1 (M1)
 * Implemented in: P01-M01-T08, T09, T10
 * Lecture alignment: L07 (parameterized queries, injection prevention)
 */

import type { PoolClient } from '@/lib/db/pool';
import type { UserAccount } from '@/types/domain';

// TODO (P01-M01-T08): Implement insertUserAccount()
// TODO (P01-M01-T09): Implement findByUsername() — must return password_hash for verification
// TODO (P01-M01-T09): Implement findById()

export const userRepository = {
  insertUserAccount: async (
    _client: PoolClient,
    _input: unknown
  ): Promise<UserAccount> => {
    throw new Error('userRepository.insertUserAccount not implemented — P01-M01-T08');
  },

  findByUsername: async (
    _client: PoolClient,
    _username: string
  ): Promise<(UserAccount & { password_hash: string }) | null> => {
    throw new Error('userRepository.findByUsername not implemented — P01-M01-T09');
  },

  findById: async (
    _client: PoolClient,
    _userId: string
  ): Promise<UserAccount | null> => {
    throw new Error('userRepository.findById not implemented — P01-M01-T09');
  },
};
