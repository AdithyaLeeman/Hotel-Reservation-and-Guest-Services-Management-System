/**
 * Amenity Repository — data access layer for room amenities.
 * Queries the PostgreSQL amenity table using pg Pool.
 */

import { pool } from '@/lib/db/pool';
import type { Amenity } from '@/types/domain';

export const amenityRepository = {
  /**
   * List all amenities ordered by amenity_id.
   */
  listAmenities: async (): Promise<Amenity[]> => {
    const result = await pool.query<{
      amenity_id: number | string;
      amenity_name: string;
    }>(
      `SELECT amenity_id, amenity_name
       FROM amenity
       ORDER BY amenity_id`
    );
    return result.rows.map((a) => ({
      amenity_id: Number(a.amenity_id),
      amenity_name: a.amenity_name,
    }));
  },
};
