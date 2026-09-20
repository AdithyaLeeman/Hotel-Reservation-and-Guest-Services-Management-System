/**
 * Room Service — business logic layer for room inventory management.
 * Owned by: Member 2 (M2) | Task: P02-M02-T06 (Mock-First)
 */

import { roomRepository, type CreateRoomInput, type RoomWithDetails } from '@/repositories/room.repository';
import type { Room, RoomType } from '@/types/domain';
import type { RoomStatus } from '@/types/enums';

// Error types

export class RoomNotFoundError extends Error {
  constructor(roomId: number) {
    super(`Room ${roomId} not found`);
    this.name = 'RoomNotFoundError';
  }
}

export class RoomConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoomConflictError';
  }
}

export class RoomStatusForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoomStatusForbiddenError';
  }
}

export class RoomValidationError extends Error {
  constructor(
    message: string,
    public readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'RoomValidationError';
  }
}


// Input types


export interface UpdateRoomStatusInput {
  status: RoomStatus;
  /**
   * The role of the authenticated staff member making this request.
   * Read from server-side session — never from request body.
   */
  requesterRole: string;
}

// 
// Service
// 

export const roomService = {
  /**
   * List rooms, optionally filtered by branch.
   * Returns rooms joined with their room_type detail.
   */
  async listRooms(branchId?: number): Promise<RoomWithDetails[]> {
    if (branchId !== undefined) {
      return roomRepository.listWithDetailsByBranch(branchId);
    }

    // For all branches, get all rooms and map their details
    const rooms = await roomRepository.listAll();
    const roomTypes = await roomRepository.listRoomTypes();

    return rooms.map((r) => {
      const type = roomTypes.find((t) => t.type_id === r.type_id);
      return {
        ...r,
        room_type: type ? { ...type } : undefined,
        amenities: [],
      };
    });
  },

  /**
   * Get a single room by ID with details.
   */
  async getRoomById(roomId: number): Promise<RoomWithDetails> {
    const room = await roomRepository.findById(roomId);
    if (!room) {
      throw new RoomNotFoundError(roomId);
    }
    const type = await roomRepository.findRoomTypeById(room.type_id);
    return {
      ...room,
      room_type: type ? { ...type } : undefined,
      amenities: [],
    };
  },

  /**
   * Create a new room.
   */
  async createRoom(input: CreateRoomInput): Promise<Room> {
    // Validate room type exists
    const roomType = await roomRepository.findRoomTypeById(input.type_id);
    if (!roomType) {
      throw new RoomValidationError(
        `Room type ${input.type_id} does not exist`,
        { type_id: 'Invalid room type' }
      );
    }

    try {
      return await roomRepository.insert({
        ...input,
        room_number: input.room_number.trim(),
      });
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE violation')) {
        throw new RoomConflictError(
          `Room number '${input.room_number}' already exists in branch ${input.branch_id}`
        );
      }
      throw err;
    }
  },

  /**
   * Update a room's operational status.
   */
  async updateRoomStatus(
    roomId: number,
    input: UpdateRoomStatusInput
  ): Promise<Room> {
    // RBAC rule: Maintenance status requires Manager or Admin
    if (
      input.status === 'Maintenance' &&
      input.requesterRole !== 'Manager' &&
      input.requesterRole !== 'Admin'
    ) {
      throw new RoomStatusForbiddenError(
        'Only Manager or Admin may set a room to Maintenance status'
      );
    }

    const existing = await roomRepository.findById(roomId);
    if (!existing) {
      throw new RoomNotFoundError(roomId);
    }

    return roomRepository.updateStatus(roomId, input.status);
  },

  async listRoomTypes(): Promise<RoomType[]> {
    return roomRepository.listRoomTypes();
  },
};
