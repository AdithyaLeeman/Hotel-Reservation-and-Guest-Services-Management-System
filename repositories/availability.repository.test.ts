/**
 * Tests for Availability Repository — P06-M02-T01 (real DB wire-up)
 * Mocks `pool.query` so tests stay fast and DB-independent.
 * All original assertions are preserved.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AvailableRoom } from './availability.repository';

// Mock pool — intercepts every pool.query call
vi.mock('@/lib/db/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import { pool } from '@/lib/db/pool';
import { availabilityRepository } from './availability.repository';

const KANDY_ROOMS: AvailableRoom[] = [
  { room_id: 6,  room_number: '101', branch_id: 2, type_id: 1, status: 'Available', type_name: 'Single', capacity: 1, daily_rate: '10000.00' },
  { room_id: 7,  room_number: '102', branch_id: 2, type_id: 2, status: 'Available', type_name: 'Double', capacity: 2, daily_rate: '18000.00' },
  { room_id: 8,  room_number: '103', branch_id: 2, type_id: 2, status: 'Available', type_name: 'Double', capacity: 2, daily_rate: '18000.00' },
  { room_id: 9,  room_number: '201', branch_id: 2, type_id: 3, status: 'Available', type_name: 'Suite',  capacity: 4, daily_rate: '35000.00' },
  { room_id: 10, room_number: '202', branch_id: 2, type_id: 3, status: 'Available', type_name: 'Suite',  capacity: 4, daily_rate: '35000.00' },
];

const COLOMBO_ROOMS_WITHOUT_MAINTENANCE: AvailableRoom[] = [
  { room_id: 1, room_number: '101', branch_id: 1, type_id: 1, status: 'Available', type_name: 'Single', capacity: 1, daily_rate: '10000.00' },
  { room_id: 2, room_number: '102', branch_id: 1, type_id: 2, status: 'Available', type_name: 'Double', capacity: 2, daily_rate: '18000.00' },
  { room_id: 4, room_number: '201', branch_id: 1, type_id: 3, status: 'Available', type_name: 'Suite',  capacity: 4, daily_rate: '35000.00' },
  { room_id: 5, room_number: '202', branch_id: 1, type_id: 3, status: 'Available', type_name: 'Suite',  capacity: 4, daily_rate: '35000.00' },
];

// Helpers
const FUTURE_DATE = (daysFromNow: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};

function mockQuery(rows: AvailableRoom[]): void {
  vi.mocked(pool.query).mockResolvedValueOnce({ rows, rowCount: rows.length } as never);
}

describe('Availability Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAvailableRooms — Kandy branch (no reservations)', () => {
    it('returns all 5 rooms for Kandy when no reservations exist', async () => {
      mockQuery(KANDY_ROOMS);
      const rooms = await availabilityRepository.getAvailableRooms(
        2,
        FUTURE_DATE(1),
        FUTURE_DATE(3),
      );
      expect(rooms).toHaveLength(5);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM fn_get_available_rooms($1, $2, $3)',
        [2, FUTURE_DATE(1), FUTURE_DATE(3)],
      );
    });

    it('every returned room belongs to the requested branch', async () => {
      mockQuery(KANDY_ROOMS);
      const rooms = await availabilityRepository.getAvailableRooms(
        2,
        FUTURE_DATE(1),
        FUTURE_DATE(4),
      );
      expect(rooms.every((r: AvailableRoom) => r.branch_id === 2)).toBe(true);
    });
  });

  describe('getAvailableRooms — Colombo branch filters', () => {
    it('excludes Maintenance rooms (room 3)', async () => {
      mockQuery(COLOMBO_ROOMS_WITHOUT_MAINTENANCE);
      const rooms = await availabilityRepository.getAvailableRooms(
        1,
        FUTURE_DATE(10),
        FUTURE_DATE(12),
      );
      const ids = rooms.map((r: AvailableRoom) => r.room_id);
      expect(ids).not.toContain(3);
    });
  });

  describe('date-overlap exclusion', () => {
    it('excludes a room blocked by a Booked reservation', async () => {
      const availableWithoutBlocked = KANDY_ROOMS.filter((r) => r.room_id !== 6);
      mockQuery(availableWithoutBlocked);
      const rooms = await availabilityRepository.getAvailableRooms(
        2,
        '2026-10-02',
        '2026-10-04',
      );
      expect(rooms.map((r: AvailableRoom) => r.room_id)).not.toContain(6);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM fn_get_available_rooms($1, $2, $3)',
        [2, '2026-10-02', '2026-10-04'],
      );
    });
  });
});
