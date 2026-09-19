import { describe, it, expect, beforeEach } from 'vitest';
import { roomRepository } from './room.repository';

describe('Room Repository (Mock)', () => {
  // Ensure the mock store is reset to a clean state before every test
  beforeEach(() => {
    roomRepository._resetMockStore();
  });

  describe('listAll', () => {
    it('returns all 15 seeded rooms', async () => {
      const rooms = await roomRepository.listAll();
      expect(rooms).toHaveLength(15);
      // Verify we get a copy, not a reference
      rooms[0].room_number = '999';
      const freshRooms = await roomRepository.listAll();
      expect(freshRooms[0].room_number).not.toBe('999');
    });
  });

  describe('listByBranch', () => {
    it('returns only rooms for the specified branch', async () => {
      const branch1Rooms = await roomRepository.listByBranch(1);
      expect(branch1Rooms).toHaveLength(5);
      expect(branch1Rooms.every((r) => r.branch_id === 1)).toBe(true);
    });

    it('returns an empty array for an invalid branch', async () => {
      const rooms = await roomRepository.listByBranch(999);
      expect(rooms).toEqual([]);
    });
  });

  describe('listWithDetailsByBranch', () => {
    it('returns rooms with type details and amenities attached', async () => {
      const rooms = await roomRepository.listWithDetailsByBranch(1);
      expect(rooms).toHaveLength(5);
      
      const firstRoom = rooms[0];
      expect(firstRoom.room_type).toBeDefined();
      expect(firstRoom.room_type?.type_name).toBe('Single');
      
      expect(firstRoom.amenities).toBeDefined();
      expect(firstRoom.amenities?.length).toBeGreaterThan(0);
    });
  });

  describe('findById', () => {
    it('returns the correct room by its ID', async () => {
      const room = await roomRepository.findById(1);
      expect(room).toBeDefined();
      expect(room?.room_number).toBe('101');
    });

    it('returns null for a non-existent room ID', async () => {
      const room = await roomRepository.findById(999);
      expect(room).toBeNull();
    });
  });

  describe('findByBranchAndNumber', () => {
    it('returns the correct room for a given branch and room number', async () => {
      const room = await roomRepository.findByBranchAndNumber(2, '102');
      expect(room).toBeDefined();
      expect(room?.room_id).toBe(7);
      expect(room?.branch_id).toBe(2);
    });

    it('returns null if the room number does not exist in the branch', async () => {
      const room = await roomRepository.findByBranchAndNumber(2, '999');
      expect(room).toBeNull();
    });
  });

  describe('insert', () => {
    it('successfully inserts a new room', async () => {
      const newRoom = await roomRepository.insert({
        room_number: '301',
        branch_id: 1,
        type_id: 1,
        status: 'Maintenance',
      });
      
      expect(newRoom.room_id).toBeDefined();
      expect(newRoom.room_number).toBe('301');
      expect(newRoom.status).toBe('Maintenance');

      // Verify it was actually added
      const fetched = await roomRepository.findById(newRoom.room_id);
      expect(fetched).toBeDefined();
      expect(fetched?.room_number).toBe('301');
    });

    it('defaults status to Available if none is provided', async () => {
      const newRoom = await roomRepository.insert({
        room_number: '302',
        branch_id: 2,
        type_id: 2,
      });
      expect(newRoom.status).toBe('Available');
    });

    it('throws an error if the room type is invalid', async () => {
      await expect(
        roomRepository.insert({
          room_number: '401',
          branch_id: 1,
          type_id: 999,
        })
      ).rejects.toThrow(/does not exist/);
    });

    it('throws an error if a room with the same branch_id and room_number already exists', async () => {
      // Room 101 in branch 1 already exists
      await expect(
        roomRepository.insert({
          room_number: '101',
          branch_id: 1,
          type_id: 1,
        })
      ).rejects.toThrow(/UNIQUE violation/);
    });
  });

  describe('updateStatus', () => {
    it('updates the status of an existing room', async () => {
      // Room 1 starts as Available
      const updated = await roomRepository.updateStatus(1, 'Maintenance');
      expect(updated.status).toBe('Maintenance');

      // Verify in store
      const fetched = await roomRepository.findById(1);
      expect(fetched?.status).toBe('Maintenance');
    });

    it('throws an error if the room ID does not exist', async () => {
      await expect(roomRepository.updateStatus(999, 'Occupied')).rejects.toThrow(/not found/);
    });
  });

  describe('listRoomTypes', () => {
    it('returns all seeded room types', async () => {
      const types = await roomRepository.listRoomTypes();
      expect(types).toHaveLength(3);
      expect(types.map((t) => t.type_name)).toContain('Suite');
    });
  });

  describe('findRoomTypeById', () => {
    it('returns the correct room type by ID', async () => {
      const type = await roomRepository.findRoomTypeById(2);
      expect(type).toBeDefined();
      expect(type?.type_name).toBe('Double');
    });

    it('returns null for an invalid room type ID', async () => {
      const type = await roomRepository.findRoomTypeById(999);
      expect(type).toBeNull();
    });
  });
});
