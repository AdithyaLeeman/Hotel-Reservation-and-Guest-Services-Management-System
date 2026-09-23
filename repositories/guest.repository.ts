import { pool } from '@/lib/db/pool';
import type { PoolClient } from '@/lib/db/pool';
import type { Guest } from '@/types/domain';



export interface InsertGuestInput {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  identification?: string;
}


export const guestRepository = {
  /**
   * Insert a new guest row inside an existing transaction.
   * Must be called after userRepository.insertUserAccount() in the SAME transaction.
   *
   * @param client - Active PoolClient (from withTransaction)
   * @param input  - Guest profile fields linked to the new user_account
   * @returns The newly created Guest row
   */
  insertGuest: async (
    client: PoolClient,
    input: InsertGuestInput
  ): Promise<Guest> => {
    const result = await client.query<Guest>(
      `INSERT INTO guest (user_id, full_name, email, phone, identification)
       VALUES ($1, $2, $3, $4, $5) * Owned by: Member 1 (M1)

       RETURNING guest_id, user_id, full_name, email, phone, identification`,
      [
        input.user_id,
        input.full_name,
        input.email,
        input.phone ?? null,
        input.identification ?? null,
      ]
    );
    return result.rows[0];
  },

  /**
   * Find a guest profile by the linked user_account user_id.
   * Used after login to populate session.guestId.
   *
   * @param userId - UUID from user_account.user_id
   * @returns Guest if found, null otherwise
   */
  findByUserId: async (userId: string): Promise<Guest | null> => {
    const result = await pool.query<Guest>(
      `SELECT guest_id, user_id, full_name, email, phone, identification
       FROM guest
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] ?? null;
  },

  /**
   * Find a guest profile by the guest_id primary key.
   * Used to verify ownership before exposing reservation data.
   *
   * @param guestId - UUID from guest.guest_id (session.guestId)
   * @returns Guest if found, null otherwise
   */
  findById: async (guestId: string): Promise<Guest | null> => {
    const result = await pool.query<Guest>(
      `SELECT guest_id, user_id, full_name, email, phone, identification
       FROM guest
       WHERE guest_id = $1`,
      [guestId]
    );
    return result.rows[0] ?? null;
  },
};
