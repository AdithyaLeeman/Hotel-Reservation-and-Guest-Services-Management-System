/**
 * Branch Repository - data access layer for hotel branches.
 * Queries the PostgreSQL branch table using pg Pool.
 */

import { pool } from '@/lib/db/pool';
import type { Branch } from '@/types/domain';

export const branchRepository = {
  /**
   * List all branches ordered by branch_id.
   */
  listBranches: async (): Promise<Branch[]> => {
    const result = await pool.query<{
      branch_id: number | string;
      location_name: string;
    }>(
      `SELECT branch_id, location_name
       FROM branch
       ORDER BY branch_id`
    );
    return result.rows.map((b) => ({
      branch_id: Number(b.branch_id),
      location_name: b.location_name,
    }));
  },

  /**
   * Find a branch by its primary key (branch_id).
   */
  findBranchById: async (branchId: number): Promise<Branch | null> => {
    const result = await pool.query<{
      branch_id: number | string;
      location_name: string;
    }>(
      `SELECT branch_id, location_name
       FROM branch
       WHERE branch_id = $1`,
      [branchId]
    );
    if (!result.rows[0]) return null;
    return {
      branch_id: Number(result.rows[0].branch_id),
      location_name: result.rows[0].location_name,
    };
  },
};
