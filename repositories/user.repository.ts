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
  // Insert a new user_account row inside an existing transaction.
  // Called during guest registration - must be wrapped with guestRepository.insertGuest
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

  // Find a user_account by username - INCLUDES password_hash for login verification.
  // NEVER pass the returned object to the HTTP response.
  findByUsername: async (
    username: string
  ): Promise<UserAccountWithHash | null> => {
    const result = await pool.query<UserAccountWithHash>(
      `SELECT ua.user_id, ua.username, ua.role, ua.status, ua.password_hash
       FROM user_account ua
       LEFT JOIN guest g ON g.user_id = ua.user_id
       WHERE username = $1 OR g.email = $1`,
      [username]
    );
    return result.rows[0] ?? null;
  },

  // Find a user_account by user_id - does NOT include password_hash.
  // Safe for session population and public-facing use.
  findById: async (userId: string): Promise<UserAccount | null> => {
    const result = await pool.query<UserAccount>(
      `SELECT user_id, username, role, status
       FROM user_account
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] ?? null;
  },

  // Find a user_account joined with employee to get branch_id.
  // INCLUDES password_hash - only for internal staff login verification.
  findStaffByUsername: async (
    username: string
  ): Promise<(UserAccountWithHash & { employee_id: number; branch_id: number | null }) | null> => {
    const result = await pool.query<
      // pg returns bigint as string at runtime even though we type it as number.
      // We coerce explicitly below so callers always receive number.
      UserAccountWithHash & { employee_id: string | number; branch_id: string | number | null }
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
       WHERE ua.username = $1 OR e.email = $1`,
      [username]
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      ...row,
      // Coerce bigint strings to JS numbers (pg returns bigint as string)
      employee_id: parseInt(String(row.employee_id), 10),
      branch_id: row.branch_id != null ? parseInt(String(row.branch_id), 10) : null,
    };
  },
};
