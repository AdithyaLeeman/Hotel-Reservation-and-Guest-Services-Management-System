/**
 * Availability Repository — wraps fn_get_available_rooms() PostgreSQL function.
 * Owned by: Member 2 (M2) | Task: P02-M02-T07 (Mock-First)
 *
 * DB-first rule (AGENTS.md §5):
 *   In production this repository calls fn_get_available_rooms() inside PostgreSQL.
 *   ALL overlap checks and availability logic live in PostgreSQL — NOT in TypeScript.
 *
 * Parallel development mode:
 *   Operates with an in-memory mock that faithfully mirrors what fn_get_available_rooms()
 *   will return: rooms that are Available, not in Maintenance, and not overlapping any
 *   existing Booked/CheckedIn reservation for the requested dates.
 *
 *   Swap to real SQL (one-line change marked TODO:REAL_DB) when:
 *   - P02-M02-T03 SQL file has been executed on the real PostgreSQL database.
 *   - P03-M03-T02 reservation_rooms table DDL has been executed.
 *   Wire-up task: P06-M02-T01.
 *
 * Real SQL (Phase 6 replacement):
 *   SELECT * FROM fn_get_available_rooms($1, $2, $3)
 *   Parameters: $1 = branch_id, $2 = check_in_date (DATE), $3 = check_out_date (DATE)
 */

import type { RoomType } from '@/types/domain';
import type { RoomStatus } from '@/types/enums';

// ---------------------------------------------------------------------------
// Output type — mirrors the expected row shape from fn_get_available_rooms()
// ---------------------------------------------------------------------------

export interface AvailableRoom {
  room_id: number;
  room_number: string;
  branch_id: number;
  type_id: number;
  status: RoomStatus;
  /** Joined from room_type — included by fn_get_available_rooms() */
  type_name: string;
  capacity: number;
  /** NUMERIC(12,2) returned as string from pg */
  daily_rate: string;
}

// ---------------------------------------------------------------------------
// Mock data — mirrors seed data used by room.repository and seed scripts.
// ---------------------------------------------------------------------------

interface MockRoom {
  room_id: number;
  room_number: string;
  branch_id: number;
  type_id: number;
  status: RoomStatus;
}

interface MockRoomType extends RoomType {}

interface MockReservation {
  reservation_id: string;
  branch_id: number;
  /** ISO date string YYYY-MM-DD */
  check_in_date: string;
  /** ISO date string YYYY-MM-DD */
  check_out_date: string;
  /** Only Booked / CheckedIn reservations block availability */
  reservation_status: 'Booked' | 'CheckedIn' | 'CheckedOut' | 'Cancelled';
  room_ids: number[];
}

const MOCK_ROOM_TYPES: MockRoomType[] = [
  { type_id: 1, type_name: 'Single', capacity: 1, daily_rate: '10000.00' },
  { type_id: 2, type_name: 'Double', capacity: 2, daily_rate: '18000.00' },
  { type_id: 3, type_name: 'Suite',  capacity: 4, daily_rate: '35000.00' },
];

/**
 * In-memory rooms mirror the 15-room seed data.
 * Branch IDs: 1 = Colombo, 2 = Kandy, 3 = Galle.
 */
let MOCK_ROOMS: MockRoom[] = [
  // Branch 1: Colombo
  { room_id: 1,  room_number: '101', branch_id: 1, type_id: 1, status: 'Available'   },
  { room_id: 2,  room_number: '102', branch_id: 1, type_id: 2, status: 'Available'   },
  { room_id: 3,  room_number: '103', branch_id: 1, type_id: 2, status: 'Maintenance' },
  { room_id: 4,  room_number: '201', branch_id: 1, type_id: 3, status: 'Occupied'    },
  { room_id: 5,  room_number: '202', branch_id: 1, type_id: 3, status: 'Available'   },
  // Branch 2: Kandy
  { room_id: 6,  room_number: '101', branch_id: 2, type_id: 1, status: 'Available'   },
  { room_id: 7,  room_number: '102', branch_id: 2, type_id: 2, status: 'Available'   },
  { room_id: 8,  room_number: '103', branch_id: 2, type_id: 2, status: 'Available'   },
  { room_id: 9,  room_number: '201', branch_id: 2, type_id: 3, status: 'Available'   },
  { room_id: 10, room_number: '202', branch_id: 2, type_id: 3, status: 'Available'   },
  // Branch 3: Galle
  { room_id: 11, room_number: '101', branch_id: 3, type_id: 1, status: 'Available'   },
  { room_id: 12, room_number: '102', branch_id: 3, type_id: 2, status: 'Available'   },
  { room_id: 13, room_number: '103', branch_id: 3, type_id: 2, status: 'Maintenance' },
  { room_id: 14, room_number: '201', branch_id: 3, type_id: 3, status: 'Available'   },
  { room_id: 15, room_number: '202', branch_id: 3, type_id: 3, status: 'Occupied'    },
];

/**
 * In-memory reservations for overlap simulation.
 * Mirrors the date-range logic from fn_get_available_rooms():
 *   overlap = check_in_date < $3 AND check_out_date > $2
 */
let MOCK_RESERVATIONS: MockReservation[] = [
  // Room 4 (Colombo Suite 201) — booked 2026-10-01 to 2026-10-05
  {
    reservation_id: 'mock-res-001',
    branch_id: 1,
    check_in_date:  '2026-10-01',
    check_out_date: '2026-10-05',
    reservation_status: 'Booked',
    room_ids: [4],
  },
  // Room 15 (Galle Suite 202) — checked-in 2026-10-02 to 2026-10-10
  {
    reservation_id: 'mock-res-002',
    branch_id: 3,
    check_in_date:  '2026-10-02',
    check_out_date: '2026-10-10',
    reservation_status: 'CheckedIn',
    room_ids: [15],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Date-overlap predicate matching the PostgreSQL interval semantics:
 *   [check_in_date, check_out_date) — check-out day is exclusive (guest departs).
 *   overlap = existing.check_in_date < requested.check_out AND
 *             existing.check_out_date > requested.check_in
 */
function datesOverlap(
  existingIn:   string,
  existingOut:  string,
  requestedIn:  string,
  requestedOut: string,
): boolean {
  return existingIn < requestedOut && existingOut > requestedIn;
}

/**
 * Returns the set of room_ids blocked by active reservations during [checkIn, checkOut).
 */
function getBlockedRoomIds(checkIn: string, checkOut: string): Set<number> {
  const blocked = new Set<number>();
  for (const res of MOCK_RESERVATIONS) {
    if (
      res.reservation_status !== 'Cancelled' &&
      res.reservation_status !== 'CheckedOut' &&
      datesOverlap(res.check_in_date, res.check_out_date, checkIn, checkOut)
    ) {
      for (const id of res.room_ids) {
        blocked.add(id);
      }
    }
  }
  return blocked;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const availabilityRepository = {
  /**
   * Return rooms available for the requested date range at the given branch.
   *
   * Mock behaviour faithfully mirrors fn_get_available_rooms():
   *   - Excludes Maintenance rooms (status filter)
   *   - Excludes rooms with overlapping Booked or CheckedIn reservations
   *   - Joins room_type details
   *
   * TODO:REAL_DB (P06-M02-T01) — replace mock body with:
   *   const result = await pool.query<AvailableRoom>(
   *     'SELECT * FROM fn_get_available_rooms($1, $2, $3)',
   *     [branchId, checkIn, checkOut],
   *   );
   *   return result.rows;
   */
  getAvailableRooms: async (
    branchId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<AvailableRoom[]> => {
    const blocked = getBlockedRoomIds(checkIn, checkOut);

    return MOCK_ROOMS
      .filter(
        (r) =>
          r.branch_id === branchId &&
          r.status !== 'Maintenance' &&
          !blocked.has(r.room_id),
      )
      .map((r) => {
        const type = MOCK_ROOM_TYPES.find((t) => t.type_id === r.type_id)!;
        return {
          room_id:     r.room_id,
          room_number: r.room_number,
          branch_id:   r.branch_id,
          type_id:     r.type_id,
          status:      r.status,
          type_name:   type.type_name,
          capacity:    type.capacity,
          daily_rate:  type.daily_rate,
        };
      });
  },

  // ---------------------------------------------------------------------------
  // Test helpers — not called in production
  // ---------------------------------------------------------------------------

  /**
   * Reset in-memory store to initial seed state.
   * Call in beforeEach() to isolate tests.
   */
  _resetMockStore(): void {
    MOCK_ROOMS = [
      { room_id: 1,  room_number: '101', branch_id: 1, type_id: 1, status: 'Available'   },
      { room_id: 2,  room_number: '102', branch_id: 1, type_id: 2, status: 'Available'   },
      { room_id: 3,  room_number: '103', branch_id: 1, type_id: 2, status: 'Maintenance' },
      { room_id: 4,  room_number: '201', branch_id: 1, type_id: 3, status: 'Occupied'    },
      { room_id: 5,  room_number: '202', branch_id: 1, type_id: 3, status: 'Available'   },
      { room_id: 6,  room_number: '101', branch_id: 2, type_id: 1, status: 'Available'   },
      { room_id: 7,  room_number: '102', branch_id: 2, type_id: 2, status: 'Available'   },
      { room_id: 8,  room_number: '103', branch_id: 2, type_id: 2, status: 'Available'   },
      { room_id: 9,  room_number: '201', branch_id: 2, type_id: 3, status: 'Available'   },
      { room_id: 10, room_number: '202', branch_id: 2, type_id: 3, status: 'Available'   },
      { room_id: 11, room_number: '101', branch_id: 3, type_id: 1, status: 'Available'   },
      { room_id: 12, room_number: '102', branch_id: 3, type_id: 2, status: 'Available'   },
      { room_id: 13, room_number: '103', branch_id: 3, type_id: 2, status: 'Maintenance' },
      { room_id: 14, room_number: '201', branch_id: 3, type_id: 3, status: 'Available'   },
      { room_id: 15, room_number: '202', branch_id: 3, type_id: 3, status: 'Occupied'    },
    ];
    MOCK_RESERVATIONS = [
      {
        reservation_id: 'mock-res-001',
        branch_id: 1,
        check_in_date:  '2026-10-01',
        check_out_date: '2026-10-05',
        reservation_status: 'Booked',
        room_ids: [4],
      },
      {
        reservation_id: 'mock-res-002',
        branch_id: 3,
        check_in_date:  '2026-10-02',
        check_out_date: '2026-10-10',
        reservation_status: 'CheckedIn',
        room_ids: [15],
      },
    ];
  },

  /**
   * Inject a mock reservation to simulate overlap scenarios in tests.
   */
  _addMockReservation(reservation: {
    reservation_id: string;
    branch_id: number;
    check_in_date: string;
    check_out_date: string;
    reservation_status: 'Booked' | 'CheckedIn' | 'CheckedOut' | 'Cancelled';
    room_ids: number[];
  }): void {
    MOCK_RESERVATIONS.push(reservation);
  },
};
