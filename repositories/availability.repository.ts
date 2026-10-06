

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
    const result = await pool.query<AvailableRoom>(
      'SELECT * FROM fn_get_available_rooms($1::bigint, $2::date, $3::date)',
      [branchId, checkIn, checkOut],
    );
    return result.rows;
  },

  /**
   * No-op mock store reset for test compatibility (docs/21_shared-contracts.md).
   */
  _resetMockStore: (): void => {},
};
