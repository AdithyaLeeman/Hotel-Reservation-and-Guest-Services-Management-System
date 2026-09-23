import { pool } from '@/lib/db/pool';
import type { PoolClient } from '@/lib/db/pool';
import type { UserAccount } from '@/types/domain';
import type { UserRole } from '@/types/enums';

export interface InsertUserAccountInput {
  username: string;
  password_hash: string;
  role: UserRole;
}


export type UserAccountWithHash = UserAccount & { password_hash: string };


export const userRepository = {
  /**
   * Insert a new user_account row inside an existing transaction.
   * Called during guest registration — must be wrapped with guestRepository.insertGuest
   * in the same transaction so both succeed or both rollback.
   *
   * @param client - Active PoolClient (from withTransaction)
   * @param input  - username, password_hash (already bcrypt-hashed), role
   * @returns The newly created UserAccount row (no password_hash)
   */
  insertUserAccount: async (
    client: PoolClient,
    input: InsertUserAccountInput
  ): Promise<UserAccount> => {
    const result = await client.query<UserAccount>(
      `INSERT INTO user_account (username, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING user_id, username, role, status`,
      [input.username, input.password_hash, input.role]
    );
    return result.rows[0];
  },

  /**
   * Find a user_account by username — INCLUDES password_hash for login verification.
   * NEVER pass the returned object to the HTTP response.
   *
   * Uses pool directly (read-only; no transaction needed).
   *
   * @param username - The login username to look up
   * @returns UserAccountWithHash if found, null otherwise
   */
  findByUsername: async (
    username: string
  ): Promise<UserAccountWithHash | null> => {
    const result = await pool.query<UserAccountWithHash>(
      `SELECT user_id, username, role, status, password_hash
       FROM user_account
       WHERE username = $1`,
      [username]
    );
    return result.rows[0] ?? null;
  },

  /**
   * Find a user_account by user_id — does NOT include password_hash.
   * Safe for session population and public-facing use.
   *
   * @param userId - UUID primary key
   * @returns UserAccount if found, null otherwise
   */
  findById: async (userId: string): Promise<UserAccount | null> => {
    const result = await pool.query<UserAccount>(
      `SELECT user_id, username, role, status
       FROM user_account
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] ?? null;
  },

  /**
   * Find a user_account joined with employee to get branch_id.
   * INCLUDES password_hash — only for internal staff login verification.
   * NEVER expose to route handlers or responses.
   *
   * @param username - The staff login username
   * @returns Row combining user account, hash, and employee context if found
   */
  findStaffByUsername: async (
    username: string
  ): Promise<(UserAccountWithHash & { employee_id: number; branch_id: number | null }) | null> => {
    const result = await pool.query<
      UserAccountWithHash & { employee_id: number; branch_id: number | null }
    >(
      `SELECT
         ua.user_id,
         ua.username,
         ua.role,
         ua.status,
         ua.password_hash,
         e.employee_id,
         e.branch_id
       FROM user_account ua
       JOIN employee e ON e.user_id = ua.user_id
       WHERE ua.username = $1`,
      [username]
    );
    return result.rows[0] ?? null;
  },
};
