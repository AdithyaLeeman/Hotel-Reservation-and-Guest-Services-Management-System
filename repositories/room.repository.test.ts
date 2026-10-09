/**
 * Room Repository tests - P06-M02-T01 (real DB wire-up)
 * Mocks `pool.query` so tests stay fast and DB-independent.
 * All original assertions are preserved.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Seed data mirrors the 15-room + 3-type + 5-amenity seed scripts
// ---------------------------------------------------------------------------
const SEED_ROOM_TYPES = [
  { type_id: 1, type_name: 'Single', capacity: 1, daily_rate: '10000.00' },
  { type_id: 2, type_name: 'Double', capacity: 2, daily_rate: '18000.00' },
  { type_id: 3, type_name: 'Suite',  capacity: 4, daily_rate: '35000.00' },
];

const SEED_AMENITIES = [
  { amenity_id: 1, amenity_name: 'Free High-Speed Wi-Fi' },
  { amenity_id: 2, amenity_name: 'Air Conditioning' },
  { amenity_id: 3, amenity_name: 'Minibar & Refrigerator' },
  { amenity_id: 4, amenity_name: 'Ocean View Balcony' },
  { amenity_id: 5, amenity_name: 'Smart Television' },
];

const BASE_SEED_ROOMS = [
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
] as const;

// ---------------------------------------------------------------------------
// Mutable in-memory store (reset in beforeEach)
// ---------------------------------------------------------------------------
let rooms: Array<{ room_id: number; room_number: string; branch_id: number; type_id: number; status: string }> = [];
let nextId = 16;

function resetStore(): void {
  rooms = BASE_SEED_ROOMS.map(r => ({ ...r }));
  nextId = 16;
}

// ---------------------------------------------------------------------------
// Mock pool - intercepts every pool.query call
// ---------------------------------------------------------------------------
vi.mock('@/lib/db/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import { pool } from '@/lib/db/pool';
import { roomRepository } from './room.repository';

// Helper: set up what pool.query returns for a given test
function mockQuery(rows: unknown[]): void {
  vi.mocked(pool.query).mockResolvedValueOnce({ rows, rowCount: rows.length } as never);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Room Repository (Mock)', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  describe('listAll', () => {
    it('returns all 15 seeded rooms', async () => {
      const copy = rooms.map(r => ({ ...r }));
      mockQuery(copy);
      const result = await roomRepository.listAll();
      expect(result).toHaveLength(15);
      // Returns a detached array (new objects from pg), not references
      result[0].room_number = '999';
      mockQuery(rooms.map(r => ({ ...r })));
      const fresh = await roomRepository.listAll();
      expect(fresh[0].room_number).not.toBe('999');
    });
  });

  describe('listByBranch', () => {
    it('returns only rooms for the specified branch', async () => {
      mockQuery(rooms.filter(r => r.branch_id === 1).map(r => ({ ...r })));
      const branch1Rooms = await roomRepository.listByBranch(1);
      expect(branch1Rooms).toHaveLength(5);
      expect(branch1Rooms.every(r => r.branch_id === 1)).toBe(true);
    });

    it('returns an empty array for an invalid branch', async () => {
      mockQuery([]);
      const result = await roomRepository.listByBranch(999);
      expect(result).toEqual([]);
    });
  });

  describe('listWithDetailsByBranch', () => {
    it('returns rooms with type details and amenities attached', async () => {
      const branch1 = rooms.filter(r => r.branch_id === 1).map(r => {
        const type = SEED_ROOM_TYPES.find(t => t.type_id === r.type_id)!;
        return { ...r, ...type, amenities: SEED_AMENITIES };
      });
      mockQuery(branch1);
      const result = await roomRepository.listWithDetailsByBranch(1);
      expect(result).toHaveLength(5);
      expect(result[0].room_type).toBeDefined();
      expect(result[0].room_type?.type_name).toBe('Single');
      expect(result[0].amenities).toBeDefined();
      expect(result[0].amenities?.length).toBeGreaterThan(0);
    });
  });

  describe('findById', () => {
    it('returns the correct room by its ID', async () => {
      mockQuery([{ ...rooms.find(r => r.room_id === 1)! }]);
      const room = await roomRepository.findById(1);
      expect(room).toBeDefined();
      expect(room?.room_number).toBe('101');
    });

    it('returns null for a non-existent room ID', async () => {
      mockQuery([]);
      const room = await roomRepository.findById(999);
      expect(room).toBeNull();
    });
  });

  describe('findByBranchAndNumber', () => {
    it('returns the correct room for a given branch and room number', async () => {
      const found = rooms.find(r => r.branch_id === 2 && r.room_number === '102')!;
      mockQuery([{ ...found }]);
      const room = await roomRepository.findByBranchAndNumber(2, '102');
      expect(room).toBeDefined();
      expect(room?.room_id).toBe(7);
      expect(room?.branch_id).toBe(2);
    });

    it('returns null if the room number does not exist in the branch', async () => {
      mockQuery([]);
      const room = await roomRepository.findByBranchAndNumber(2, '999');
      expect(room).toBeNull();
    });
  });

  describe('insert', () => {
    it('successfully inserts a new room', async () => {
      const newRoom = { room_id: nextId, room_number: '301', branch_id: 1, type_id: 1, status: 'Maintenance' };
      mockQuery([newRoom]);
      const result = await roomRepository.insert({ room_number: '301', branch_id: 1, type_id: 1, status: 'Maintenance' });
      expect(result.room_id).toBeDefined();
      expect(result.room_number).toBe('301');
      expect(result.status).toBe('Maintenance');

      // Verify a subsequent findById would return it
      mockQuery([newRoom]);
      const fetched = await roomRepository.findById(result.room_id);
      expect(fetched?.room_number).toBe('301');
    });

    it('defaults status to Available if none is provided', async () => {
      const newRoom = { room_id: nextId, room_number: '302', branch_id: 2, type_id: 2, status: 'Available' };
      mockQuery([newRoom]);
      const result = await roomRepository.insert({ room_number: '302', branch_id: 2, type_id: 2 });
      expect(result.status).toBe('Available');
    });

    it('throws an error if the room type is invalid (FK violation from pg)', async () => {
      const err = Object.assign(new Error('violates foreign key constraint "room_type_id_fkey"'), { code: '23503' });
      vi.mocked(pool.query).mockRejectedValueOnce(err);
      await expect(
        roomRepository.insert({ room_number: '401', branch_id: 1, type_id: 999 })
      ).rejects.toThrow();
    });

    it('throws an error if a room with the same branch_id and room_number already exists', async () => {
      const err = Object.assign(new Error('duplicate key value violates unique constraint (UNIQUE violation)'), { code: '23505' });
      vi.mocked(pool.query).mockRejectedValueOnce(err);
      await expect(
        roomRepository.insert({ room_number: '101', branch_id: 1, type_id: 1 })
      ).rejects.toThrow(/UNIQUE violation/);
    });
  });

  describe('updateStatus', () => {
    it('updates the status of an existing room', async () => {
      const updated = { ...rooms.find(r => r.room_id === 1)!, status: 'Maintenance' };
      mockQuery([updated]);
      const result = await roomRepository.updateStatus(1, 'Maintenance');
      expect(result.status).toBe('Maintenance');

      // Verify via a subsequent findById
      mockQuery([updated]);
      const fetched = await roomRepository.findById(1);
      expect(fetched?.status).toBe('Maintenance');
    });

    it('throws an error if the room ID does not exist', async () => {
      mockQuery([]); // RETURNING returns 0 rows → repo throws
      await expect(roomRepository.updateStatus(999, 'Occupied')).rejects.toThrow(/not found/);
    });
  });

  describe('listRoomTypes', () => {
    it('returns all seeded room types', async () => {
      mockQuery(SEED_ROOM_TYPES.map(t => ({ ...t })));
      const types = await roomRepository.listRoomTypes();
      expect(types).toHaveLength(3);
      expect(types.map(t => t.type_name)).toContain('Suite');
    });
  });

  describe('findRoomTypeById', () => {
    it('returns the correct room type by ID', async () => {
      mockQuery([{ ...SEED_ROOM_TYPES[1] }]);
      const type = await roomRepository.findRoomTypeById(2);
      expect(type).toBeDefined();
      expect(type?.type_name).toBe('Double');
    });

    it('returns null for an invalid room type ID', async () => {
      mockQuery([]);
      const type = await roomRepository.findRoomTypeById(999);
      expect(type).toBeNull();
    });
  });
});

