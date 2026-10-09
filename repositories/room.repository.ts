/**
 * Room Repository - data access layer for rooms and room types.
 * Owned by: Member 2 (M2) | Task: P06-M02-T01
 *
 * Phase 6 SP6.1 - Mock store replaced with real parameterized pg Pool queries.
 * All SQL is parameterized (no string concatenation - AGENTS.md §8).
 * Money columns returned as strings from pg (NUMERIC(12,2) - AGENTS.md §8).
 */

import { pool } from '@/lib/db/pool';
import type { Room, RoomType, Amenity } from '@/types/domain';
import type { RoomStatus } from '@/types/enums';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoomWithDetails extends Room {
  room_type?: RoomType;
  amenities?: Amenity[];
}

export interface CreateRoomInput {
  room_number: string;
  branch_id: number;
  type_id: number;
  status?: RoomStatus;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const roomRepository = {
  /**
   * List all rooms across all branches (Manager / Admin use).
   */
  listAll: async (): Promise<Room[]> => {
    const result = await pool.query<{
      room_id: number | string;
      room_number: string;
      branch_id: number | string;
      type_id: number | string;
      status: RoomStatus;
    }>(
      `SELECT room_id, room_number, branch_id, type_id, status
       FROM room
       ORDER BY branch_id, room_number`
    );
    return result.rows.map((r) => ({
      room_id:     Number(r.room_id),
      room_number: r.room_number,
      branch_id:   Number(r.branch_id),
      type_id:     Number(r.type_id),
      status:      r.status,
    }));
  },

  /**
   * List all rooms belonging to a specific branch.
   */
  listByBranch: async (branchId: number): Promise<Room[]> => {
    const result = await pool.query<{
      room_id: number | string;
      room_number: string;
      branch_id: number | string;
      type_id: number | string;
      status: RoomStatus;
    }>(
      `SELECT room_id, room_number, branch_id, type_id, status
       FROM room
       WHERE branch_id = $1
       ORDER BY room_number`,
      [branchId]
    );
    return result.rows.map((r) => ({
      room_id:     Number(r.room_id),
      room_number: r.room_number,
      branch_id:   Number(r.branch_id),
      type_id:     Number(r.type_id),
      status:      r.status,
    }));
  },

  /**
   * List all rooms across all branches joined with room_type + amenities.
   */
  listWithDetailsAll: async (): Promise<RoomWithDetails[]> => {
    const result = await pool.query<{
      room_id: number | string;
      room_number: string;
      branch_id: number | string;
      type_id: number | string;
      status: RoomStatus;
      type_name: string;
      capacity: number | string;
      daily_rate: string;
      amenities: Amenity[];
    }>(
      `SELECT
         r.room_id,
         r.room_number,
         r.branch_id,
         r.type_id,
         r.status,
         rt.type_name,
         rt.capacity,
         rt.daily_rate,
         COALESCE(
           json_agg(
             json_build_object(
               'amenity_id',   a.amenity_id,
               'amenity_name', a.amenity_name
             ) ORDER BY a.amenity_name
           ) FILTER (WHERE a.amenity_id IS NOT NULL),
           '[]'::json
         ) AS amenities
       FROM room r
       JOIN room_type rt ON rt.type_id = r.type_id
       LEFT JOIN room_type_amenity rta ON rta.type_id = rt.type_id
       LEFT JOIN amenity a             ON a.amenity_id  = rta.amenity_id
       GROUP BY r.room_id, rt.type_id, rt.type_name, rt.capacity, rt.daily_rate
       ORDER BY r.branch_id, r.room_number`
    );

    return result.rows.map((row) => ({
      room_id:     Number(row.room_id),
      room_number: row.room_number,
      branch_id:   Number(row.branch_id),
      type_id:     Number(row.type_id),
      status:      row.status,
      room_type: {
        type_id:    Number(row.type_id),
        type_name:  row.type_name,
        capacity:   Number(row.capacity),
        daily_rate: row.daily_rate,
      },
      amenities: (row.amenities ?? []).map((a) => ({
        amenity_id:   Number(a.amenity_id),
        amenity_name: a.amenity_name,
      })),
    }));
  },

  /**
   * List rooms for a branch joined with room_type + amenities.
   * Amenities aggregated as a JSON array so a single query covers the join.
   */
  listWithDetailsByBranch: async (branchId: number): Promise<RoomWithDetails[]> => {
    const result = await pool.query<{
      room_id: number | string;
      room_number: string;
      branch_id: number | string;
      type_id: number | string;
      status: RoomStatus;
      type_name: string;
      capacity: number | string;
      daily_rate: string;
      amenities: Amenity[];
    }>(
      `SELECT
         r.room_id,
         r.room_number,
         r.branch_id,
         r.type_id,
         r.status,
         rt.type_name,
         rt.capacity,
         rt.daily_rate,
         COALESCE(
           json_agg(
             json_build_object(
               'amenity_id',   a.amenity_id,
               'amenity_name', a.amenity_name
             ) ORDER BY a.amenity_name
           ) FILTER (WHERE a.amenity_id IS NOT NULL),
           '[]'::json
         ) AS amenities
       FROM room r
       JOIN room_type rt ON rt.type_id = r.type_id
       LEFT JOIN room_type_amenity rta ON rta.type_id = rt.type_id
       LEFT JOIN amenity a             ON a.amenity_id  = rta.amenity_id
       WHERE r.branch_id = $1
       GROUP BY r.room_id, rt.type_id, rt.type_name, rt.capacity, rt.daily_rate
       ORDER BY r.room_number`,
      [branchId]
    );

    return result.rows.map((row) => ({
      room_id:     Number(row.room_id),
      room_number: row.room_number,
      branch_id:   Number(row.branch_id),
      type_id:     Number(row.type_id),
      status:      row.status,
      room_type: {
        type_id:    Number(row.type_id),
        type_name:  row.type_name,
        capacity:   Number(row.capacity),
        daily_rate: row.daily_rate,
      },
      amenities: (row.amenities ?? []).map((a) => ({
        amenity_id:   Number(a.amenity_id),
        amenity_name: a.amenity_name,
      })),
    }));
  },

  /**
   * Find a room by primary key (room_id).
   */
  findById: async (roomId: number): Promise<Room | null> => {
    const result = await pool.query<{
      room_id: number | string;
      room_number: string;
      branch_id: number | string;
      type_id: number | string;
      status: RoomStatus;
    }>(
      `SELECT room_id, room_number, branch_id, type_id, status
       FROM room
       WHERE room_id = $1`,
      [roomId]
    );
    if (!result.rows[0]) return null;
    const r = result.rows[0];
    return {
      room_id:     Number(r.room_id),
      room_number: r.room_number,
      branch_id:   Number(r.branch_id),
      type_id:     Number(r.type_id),
      status:      r.status,
    };
  },

  /**
   * Find a room by unique natural candidate key (branch_id, room_number).
   * Enforces UNIQUE(branch_id, room_number) invariant from ERD.
   */
  findByBranchAndNumber: async (
    branchId: number,
    roomNumber: string
  ): Promise<Room | null> => {
    const result = await pool.query<{
      room_id: number | string;
      room_number: string;
      branch_id: number | string;
      type_id: number | string;
      status: RoomStatus;
    }>(
      `SELECT room_id, room_number, branch_id, type_id, status
       FROM room
       WHERE branch_id = $1 AND room_number = $2`,
      [branchId, roomNumber]
    );
    if (!result.rows[0]) return null;
    const r = result.rows[0];
    return {
      room_id:     Number(r.room_id),
      room_number: r.room_number,
      branch_id:   Number(r.branch_id),
      type_id:     Number(r.type_id),
      status:      r.status,
    };
  },

  /**
   * Insert a new room record.
   * PostgreSQL UNIQUE constraint on (branch_id, room_number) raises SQLSTATE 23505
   * on duplicate - caught and re-thrown by the service layer as RoomConflictError.
   */
  insert: async (input: CreateRoomInput): Promise<Room> => {
    const result = await pool.query<{
      room_id: number | string;
      room_number: string;
      branch_id: number | string;
      type_id: number | string;
      status: RoomStatus;
    }>(
      `INSERT INTO room (room_number, branch_id, type_id, status)
       VALUES ($1, $2, $3, $4)
       RETURNING room_id, room_number, branch_id, type_id, status`,
      [
        input.room_number,
        input.branch_id,
        input.type_id,
        input.status ?? 'Available',
      ]
    );
    const r = result.rows[0];
    return {
      room_id:     Number(r.room_id),
      room_number: r.room_number,
      branch_id:   Number(r.branch_id),
      type_id:     Number(r.type_id),
      status:      r.status,
    };
  },

  /**
   * Update the operational status of a room.
   * Returns the updated row; throws if room_id is not found.
   */
  updateStatus: async (roomId: number, status: RoomStatus): Promise<Room> => {
    const result = await pool.query<{
      room_id: number | string;
      room_number: string;
      branch_id: number | string;
      type_id: number | string;
      status: RoomStatus;
    }>(
      `UPDATE room
       SET status = $1
       WHERE room_id = $2
       RETURNING room_id, room_number, branch_id, type_id, status`,
      [status, roomId]
    );
    if (result.rows.length === 0) {
      throw new Error(`Room with ID ${roomId} not found`);
    }
    const r = result.rows[0];
    return {
      room_id:     Number(r.room_id),
      room_number: r.room_number,
      branch_id:   Number(r.branch_id),
      type_id:     Number(r.type_id),
      status:      r.status,
    };
  },

  /**
   * List all room types in the catalogue.
   */
  listRoomTypes: async (): Promise<RoomType[]> => {
    const result = await pool.query<{
      type_id: number | string;
      type_name: string;
      capacity: number | string;
      daily_rate: string;
    }>(
      `SELECT type_id, type_name, capacity, daily_rate
       FROM room_type
       ORDER BY type_id`
    );
    return result.rows.map((rt) => ({
      type_id:    Number(rt.type_id),
      type_name:  rt.type_name,
      capacity:   Number(rt.capacity),
      daily_rate: rt.daily_rate,
    }));
  },

  /**
   * Find a single room type by primary key.
   */
  findRoomTypeById: async (typeId: number): Promise<RoomType | null> => {
    const result = await pool.query<{
      type_id: number | string;
      type_name: string;
      capacity: number | string;
      daily_rate: string;
    }>(
      `SELECT type_id, type_name, capacity, daily_rate
       FROM room_type
       WHERE type_id = $1`,
      [typeId]
    );
    if (!result.rows[0]) return null;
    const rt = result.rows[0];
    return {
      type_id:    Number(rt.type_id),
      type_name:  rt.type_name,
      capacity:   Number(rt.capacity),
      daily_rate: rt.daily_rate,
    };
  },

  /**
   * No-op mock store reset for test compatibility (docs/21_shared-contracts.md).
   */
  _resetMockStore: (): void => {},
};

