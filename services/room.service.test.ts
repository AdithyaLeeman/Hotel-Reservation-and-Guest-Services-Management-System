import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  roomService,
  RoomNotFoundError,
  RoomConflictError,
  RoomStatusForbiddenError,
  RoomValidationError
} from './room.service';
import { roomRepository } from '../repositories/room.repository';

// ---------------------------------------------------------------------------
// Mock the repository - the real repo now talks to PostgreSQL.
// Service-layer tests stay fast and DB-independent.
// ---------------------------------------------------------------------------
vi.mock('../repositories/room.repository', () => {
  // In-memory state isolated to this test file
  const ROOM_TYPES = [
    { type_id: 1, type_name: 'Single', capacity: 1, daily_rate: '10000.00' },
    { type_id: 2, type_name: 'Double', capacity: 2, daily_rate: '18000.00' },
    { type_id: 3, type_name: 'Suite',  capacity: 4, daily_rate: '35000.00' },
  ];

  const AMENITIES = [
    { amenity_id: 1, amenity_name: 'Free High-Speed Wi-Fi' },
    { amenity_id: 2, amenity_name: 'Air Conditioning' },
  ];

  const SEED_ROOMS = [
    { room_id: 1, room_number: '101', branch_id: 1, type_id: 1, status: 'Available'   },
    { room_id: 2, room_number: '102', branch_id: 1, type_id: 2, status: 'Available'   },
    { room_id: 3, room_number: '103', branch_id: 1, type_id: 2, status: 'Maintenance' },
    { room_id: 4, room_number: '201', branch_id: 1, type_id: 3, status: 'Occupied'    },
    { room_id: 5, room_number: '202', branch_id: 1, type_id: 3, status: 'Available'   },
    { room_id: 6, room_number: '101', branch_id: 2, type_id: 1, status: 'Available'   },
    { room_id: 7, room_number: '102', branch_id: 2, type_id: 2, status: 'Available'   },
    { room_id: 8, room_number: '103', branch_id: 2, type_id: 2, status: 'Available'   },
    { room_id: 9, room_number: '201', branch_id: 2, type_id: 3, status: 'Available'   },
    { room_id: 10, room_number: '202', branch_id: 2, type_id: 3, status: 'Available'  },
    { room_id: 11, room_number: '101', branch_id: 3, type_id: 1, status: 'Available'  },
    { room_id: 12, room_number: '102', branch_id: 3, type_id: 2, status: 'Available'  },
    { room_id: 13, room_number: '103', branch_id: 3, type_id: 2, status: 'Maintenance'},
    { room_id: 14, room_number: '201', branch_id: 3, type_id: 3, status: 'Available'  },
    { room_id: 15, room_number: '202', branch_id: 3, type_id: 3, status: 'Occupied'   },
  ];

  let rooms = SEED_ROOMS.map(r => ({ ...r }));
  let nextId = 16;

  const reset = () => {
    rooms = SEED_ROOMS.map(r => ({ ...r }));
    nextId = 16;
  };

  return {
    roomRepository: {
      listAll: vi.fn(async () => rooms.map(r => ({ ...r }))),
      listByBranch: vi.fn(async (branchId: number) =>
        rooms.filter(r => r.branch_id === branchId).map(r => ({ ...r }))
      ),
      listWithDetailsByBranch: vi.fn(async (branchId: number) =>
        rooms
          .filter(r => r.branch_id === branchId)
          .map(r => ({
            ...r,
            room_type: ROOM_TYPES.find(t => t.type_id === r.type_id),
            amenities: [...AMENITIES],
          }))
      ),
      findById: vi.fn(async (roomId: number) => {
        const found = rooms.find(r => r.room_id === roomId);
        return found ? { ...found } : null;
      }),
      findByBranchAndNumber: vi.fn(async (branchId: number, roomNumber: string) => {
        const found = rooms.find(r => r.branch_id === branchId && r.room_number === roomNumber);
        return found ? { ...found } : null;
      }),
      insert: vi.fn(async (input: { room_number: string; branch_id: number; type_id: number; status?: string }) => {
        const exists = rooms.some(r => r.branch_id === input.branch_id && r.room_number === input.room_number);
        if (exists) throw new Error(`Room ${input.room_number} already exists in branch ${input.branch_id} (UNIQUE violation)`);
        const typeExists = ROOM_TYPES.some(t => t.type_id === input.type_id);
        if (!typeExists) throw new Error(`Room type with ID ${input.type_id} does not exist`);
        const newRoom = { room_id: nextId++, room_number: input.room_number, branch_id: input.branch_id, type_id: input.type_id, status: (input.status ?? 'Available') as 'Available' | 'Occupied' | 'Maintenance' };
        rooms.push(newRoom);
        return { ...newRoom };
      }),
      updateStatus: vi.fn(async (roomId: number, status: string) => {
        const idx = rooms.findIndex(r => r.room_id === roomId);
        if (idx === -1) throw new Error(`Room with ID ${roomId} not found`);
        rooms[idx] = { ...rooms[idx], status: status as 'Available' | 'Occupied' | 'Maintenance' };
        return { ...rooms[idx] };
      }),
      listRoomTypes: vi.fn(async () => ROOM_TYPES.map(t => ({ ...t }))),
      findRoomTypeById: vi.fn(async (typeId: number) => {
        const found = ROOM_TYPES.find(t => t.type_id === typeId);
        return found ? { ...found } : null;
      }),
      // Expose reset for beforeEach
      _resetMockStore: reset,
    },
  };
});

describe('Room Service', () => {
  beforeEach(() => {
    roomRepository._resetMockStore?.();
    vi.clearAllMocks();
  });

  describe('listRooms', () => {
    it('returns all rooms when no branchId is provided', async () => {
      const rooms = await roomService.listRooms();
      expect(rooms).toHaveLength(15);
      expect(rooms[0]).toHaveProperty('room_type');
    });

    it('returns rooms for a specific branch', async () => {
      const rooms = await roomService.listRooms(1);
      expect(rooms).toHaveLength(5);
      expect(rooms.every(r => r.branch_id === 1)).toBe(true);
      expect(rooms[0]).toHaveProperty('room_type');
    });

    it('filters rooms by status', async () => {
      const maintenanceRooms = await roomService.listRooms({ status: 'Maintenance' });
      expect(maintenanceRooms.length).toBeGreaterThan(0);
      expect(maintenanceRooms.every(r => r.status === 'Maintenance')).toBe(true);
    });

    it('filters rooms by typeId and branchId', async () => {
      const colomboSuites = await roomService.listRooms({ branchId: 1, typeId: 3 });
      expect(colomboSuites.length).toBe(2);
      expect(colomboSuites.every(r => r.branch_id === 1 && r.type_id === 3)).toBe(true);
    });
  });

  describe('getRoomById', () => {
    it('returns a room with details if found', async () => {
      const room = await roomService.getRoomById(1);
      expect(room.room_id).toBe(1);
      expect(room.room_type).toBeDefined();
    });

    it('throws RoomNotFoundError if not found', async () => {
      await expect(roomService.getRoomById(999)).rejects.toThrow(RoomNotFoundError);
    });
  });

  describe('createRoom', () => {
    it('creates a room successfully', async () => {
      const newRoom = await roomService.createRoom({
        room_number: '999',
        branch_id: 1,
        type_id: 1,
        status: 'Available',
      });
      expect(newRoom.room_number).toBe('999');

      const found = await roomService.getRoomById(newRoom.room_id);
      expect(found.room_number).toBe('999');
    });

    it('throws RoomValidationError if room type does not exist', async () => {
      await expect(roomService.createRoom({
        room_number: '999',
        branch_id: 1,
        type_id: 99,
      })).rejects.toThrow(RoomValidationError);
    });

    it('throws RoomConflictError if room number already exists in branch', async () => {
      await expect(roomService.createRoom({
        room_number: '101', // Already exists in branch 1
        branch_id: 1,
        type_id: 1,
      })).rejects.toThrow(RoomConflictError);
    });
  });

  describe('updateRoomStatus', () => {
    it('updates status for Receptionist if not Maintenance', async () => {
      const room = await roomService.updateRoomStatus(1, {
        status: 'Occupied',
        requesterRole: 'Receptionist'
      });
      expect(room.status).toBe('Occupied');
    });

    it('allows Manager to set Maintenance', async () => {
      const room = await roomService.updateRoomStatus(1, {
        status: 'Maintenance',
        requesterRole: 'Manager'
      });
      expect(room.status).toBe('Maintenance');
    });

    it('allows Admin to set Maintenance', async () => {
      const room = await roomService.updateRoomStatus(1, {
        status: 'Maintenance',
        requesterRole: 'Admin'
      });
      expect(room.status).toBe('Maintenance');
    });

    it('throws RoomStatusForbiddenError if Receptionist tries to set Maintenance', async () => {
      await expect(roomService.updateRoomStatus(1, {
        status: 'Maintenance',
        requesterRole: 'Receptionist'
      })).rejects.toThrow(RoomStatusForbiddenError);
    });

    it('throws RoomNotFoundError if room does not exist', async () => {
      await expect(roomService.updateRoomStatus(999, {
        status: 'Occupied',
        requesterRole: 'Admin'
      })).rejects.toThrow(RoomNotFoundError);
    });
  });
});


