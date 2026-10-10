

import { pool } from '@/lib/db/pool';
import type { RoomStatus } from '@/types/enums';


export interface AvailableRoom {
  room_id: number;
  room_number: string;
  branch_id: number;
  type_id: number;
  status: RoomStatus;
  /** Joined from room_type inside the PostgreSQL function */
  type_name: string;
  capacity: number;
  /** NUMERIC(12,2) returned as string from pg — never use as JS float */
  daily_rate: string;
  /** List of amenity names for this room type */
  amenities: string[];
}

export const availabilityRepository = {
  /**
   * @param branchId  - integer branch PK
   * @param checkIn   - ISO date string YYYY-MM-DD (inclusive)
   * @param checkOut  - ISO date string YYYY-MM-DD (exclusive — checkout day)
   */
  getAvailableRooms: async (
    branchId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<AvailableRoom[]> => {
    const result = await pool.query<{
      room_id: number;
      room_number: string;
      branch_id: number;
      type_id: number;
      status: RoomStatus;
      type_name: string;
      capacity: number;
      daily_rate: string;
      amenities?: Array<{ amenity_id?: number; amenity_name?: string } | string> | null;
    }>(
      `SELECT
         ar.room_id,
         ar.room_number,
         ar.branch_id,
         ar.type_id,
         ar.status,
         ar.type_name,
         ar.capacity,
         ar.daily_rate,
         COALESCE(
           json_agg(
             json_build_object(
               'amenity_id', a.amenity_id,
               'amenity_name', a.amenity_name
             ) ORDER BY a.amenity_name
           ) FILTER (WHERE a.amenity_id IS NOT NULL),
           '[]'::json
         ) AS amenities
       FROM fn_get_available_rooms($1::bigint, $2::date, $3::date) ar
       LEFT JOIN room_type_amenity rta ON rta.type_id = ar.type_id
       LEFT JOIN amenity a ON a.amenity_id = rta.amenity_id
       GROUP BY ar.room_id, ar.room_number, ar.branch_id, ar.type_id, ar.status, ar.type_name, ar.capacity, ar.daily_rate
       ORDER BY ar.capacity ASC, ar.daily_rate ASC, ar.room_number ASC`,
      [branchId, checkIn, checkOut],
    );

    return result.rows.map((row) => ({
      room_id: row.room_id,
      room_number: row.room_number,
      branch_id: row.branch_id,
      type_id: row.type_id,
      status: row.status,
      type_name: row.type_name,
      capacity: row.capacity,
      daily_rate: row.daily_rate,
      amenities: Array.isArray(row.amenities)
        ? row.amenities
            .map((item) => (typeof item === 'string' ? item : item.amenity_name || ''))
            .filter(Boolean)
        : [],
    }));
  },

  /**
   * No-op mock store reset for test compatibility (docs/21_shared-contracts.md).
   */
  _resetMockStore: (): void => {},
};
