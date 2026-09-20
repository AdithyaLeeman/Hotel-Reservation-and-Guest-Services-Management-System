import { describe, it, expect, beforeEach } from 'vitest';
import {
  roomService,
  RoomNotFoundError,
  RoomConflictError,
  RoomStatusForbiddenError,
  RoomValidationError
} from './room.service';
import { roomRepository } from '../repositories/room.repository';

describe('Room Service', () => {
  beforeEach(() => {
    roomRepository._resetMockStore();
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
