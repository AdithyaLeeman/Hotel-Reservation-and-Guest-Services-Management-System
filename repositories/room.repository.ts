/**
 * Room Repository — data access layer for rooms and room types.
 * Owned by: Member 2 (M2) | Task: P02-M02-T05 (Mock-First)
 *
 * Parallel development mode:
 * Operates with an in-memory mock store representing seed data
 * (15 rooms across 3 branches + 3 room types).
 * Ready to be swapped for parameterized pg Pool queries in Phase 6 / SP6.1
 * once SP1.2 and SP2.1 migrations are executed on the real database.
 */

import type { Room, RoomType, Amenity } from '@/types/domain';
import type { RoomStatus } from '@/types/enums';

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

// Initial mock room types matching seed data
const MOCK_ROOM_TYPES: RoomType[] = [
  {
    type_id: 1,
    type_name: 'Single',
    capacity: 1,
    daily_rate: '10000.00',
  },
  {
    type_id: 2,
    type_name: 'Double',
    capacity: 2,
    daily_rate: '18000.00',
  },
  {
    type_id: 3,
    type_name: 'Suite',
    capacity: 4,
    daily_rate: '35000.00',
  },
];

// Initial mock amenities
const MOCK_AMENITIES: Amenity[] = [
  { amenity_id: 1, amenity_name: 'Free High-Speed Wi-Fi' },
  { amenity_id: 2, amenity_name: 'Air Conditioning' },
  { amenity_id: 3, amenity_name: 'Minibar & Refrigerator' },
  { amenity_id: 4, amenity_name: 'Ocean View Balcony' },
  { amenity_id: 5, amenity_name: 'Smart Television' },
];

// In-memory mock store for rooms (15 rooms across 3 branches: 1=Colombo, 2=Kandy, 3=Galle)
let mockRooms: Room[] = [
  // Branch 1: Colombo
  { room_id: 1, room_number: '101', branch_id: 1, type_id: 1, status: 'Available' },
  { room_id: 2, room_number: '102', branch_id: 1, type_id: 2, status: 'Available' },
  { room_id: 3, room_number: '103', branch_id: 1, type_id: 2, status: 'Maintenance' }, // Test BR-16 maintenance filter
  { room_id: 4, room_number: '201', branch_id: 1, type_id: 3, status: 'Occupied' },
  { room_id: 5, room_number: '202', branch_id: 1, type_id: 3, status: 'Available' },

  // Branch 2: Kandy
  { room_id: 6, room_number: '101', branch_id: 2, type_id: 1, status: 'Available' },
  { room_id: 7, room_number: '102', branch_id: 2, type_id: 2, status: 'Available' },
  { room_id: 8, room_number: '103', branch_id: 2, type_id: 2, status: 'Available' },
  { room_id: 9, room_number: '201', branch_id: 2, type_id: 3, status: 'Available' },
  { room_id: 10, room_number: '202', branch_id: 2, type_id: 3, status: 'Available' },

  // Branch 3: Galle
  { room_id: 11, room_number: '101', branch_id: 3, type_id: 1, status: 'Available' },
  { room_id: 12, room_number: '102', branch_id: 3, type_id: 2, status: 'Available' },
  { room_id: 13, room_number: '103', branch_id: 3, type_id: 2, status: 'Maintenance' },
  { room_id: 14, room_number: '201', branch_id: 3, type_id: 3, status: 'Available' },
  { room_id: 15, room_number: '202', branch_id: 3, type_id: 3, status: 'Occupied' },
];

let nextRoomId = 16;

export const roomRepository = {
  /**
   * List all rooms across all branches (Manager/Admin use).
   */
  listAll: async (): Promise<Room[]> => {
    return mockRooms.map((r) => ({ ...r }));
  },

  /**
   * List all rooms belonging to a specific branch.
   */
  listByBranch: async (branchId: number): Promise<Room[]> => {
    return mockRooms
      .filter((r) => r.branch_id === branchId)
      .map((r) => ({ ...r }));
  },

  /**
   * List rooms for a branch joined with room type details.
   */
  listWithDetailsByBranch: async (branchId: number): Promise<RoomWithDetails[]> => {
    return mockRooms
      .filter((r) => r.branch_id === branchId)
      .map((r) => {
        const type = MOCK_ROOM_TYPES.find((t) => t.type_id === r.type_id);
        return {
          ...r,
          room_type: type ? { ...type } : undefined,
          amenities: [...MOCK_AMENITIES],
        };
      });
  },

  /**
   * Find a room by primary key (room_id).
   */
  findById: async (roomId: number): Promise<Room | null> => {
    const found = mockRooms.find((r) => r.room_id === roomId);
    return found ? { ...found } : null;
  },

  /**
   * Find a room by unique natural candidate key (branch_id, room_number).
   * Enforces UNIQUE(branch_id, room_number) invariant from ERD.
   */
  findByBranchAndNumber: async (
    branchId: number,
    roomNumber: string
  ): Promise<Room | null> => {
    const found = mockRooms.find(
      (r) => r.branch_id === branchId && r.room_number === roomNumber
    );
    return found ? { ...found } : null;
  },

  /**
   * Insert a new room record.
   * Throws error if (branch_id, room_number) already exists.
   */
  insert: async (input: CreateRoomInput): Promise<Room> => {
    const exists = mockRooms.some(
      (r) => r.branch_id === input.branch_id && r.room_number === input.room_number
    );
    if (exists) {
      throw new Error(
        `Room ${input.room_number} already exists in branch ${input.branch_id} (UNIQUE violation)`
      );
    }

    const typeExists = MOCK_ROOM_TYPES.some((t) => t.type_id === input.type_id);
    if (!typeExists) {
      throw new Error(`Room type with ID ${input.type_id} does not exist`);
    }

    const newRoom: Room = {
      room_id: nextRoomId++,
      room_number: input.room_number,
      branch_id: input.branch_id,
      type_id: input.type_id,
      status: input.status ?? 'Available',
    };

    mockRooms.push(newRoom);
    return { ...newRoom };
  },

  /**
   * Update the status of a room (e.g. set to Maintenance or Available).
   */
  updateStatus: async (roomId: number, status: RoomStatus): Promise<Room> => {
    const index = mockRooms.findIndex((r) => r.room_id === roomId);
    if (index === -1) {
      throw new Error(`Room with ID ${roomId} not found`);
    }

    mockRooms[index] = {
      ...mockRooms[index],
      status,
    };

    return { ...mockRooms[index] };
  },

  /**
   * List all room types in the catalogue.
   */
  listRoomTypes: async (): Promise<RoomType[]> => {
    return MOCK_ROOM_TYPES.map((t) => ({ ...t }));
  },

  /**
   * Find a room type by ID.
   */
  findRoomTypeById: async (typeId: number): Promise<RoomType | null> => {
    const found = MOCK_ROOM_TYPES.find((t) => t.type_id === typeId);
    return found ? { ...found } : null;
  },

  /**
   * Reset mock store to initial seed state (useful for test suites).
   */
  _resetMockStore: (): void => {
    mockRooms = [
      { room_id: 1, room_number: '101', branch_id: 1, type_id: 1, status: 'Available' },
      { room_id: 2, room_number: '102', branch_id: 1, type_id: 2, status: 'Available' },
      { room_id: 3, room_number: '103', branch_id: 1, type_id: 2, status: 'Maintenance' },
      { room_id: 4, room_number: '201', branch_id: 1, type_id: 3, status: 'Occupied' },
      { room_id: 5, room_number: '202', branch_id: 1, type_id: 3, status: 'Available' },

      { room_id: 6, room_number: '101', branch_id: 2, type_id: 1, status: 'Available' },
      { room_id: 7, room_number: '102', branch_id: 2, type_id: 2, status: 'Available' },
      { room_id: 8, room_number: '103', branch_id: 2, type_id: 2, status: 'Available' },
      { room_id: 9, room_number: '201', branch_id: 2, type_id: 3, status: 'Available' },
      { room_id: 10, room_number: '202', branch_id: 2, type_id: 3, status: 'Available' },

      { room_id: 11, room_number: '101', branch_id: 3, type_id: 1, status: 'Available' },
      { room_id: 12, room_number: '102', branch_id: 3, type_id: 2, status: 'Available' },
      { room_id: 13, room_number: '103', branch_id: 3, type_id: 2, status: 'Maintenance' },
      { room_id: 14, room_number: '201', branch_id: 3, type_id: 3, status: 'Available' },
      { room_id: 15, room_number: '202', branch_id: 3, type_id: 3, status: 'Occupied' },
    ];
    nextRoomId = 16;
  },
};
