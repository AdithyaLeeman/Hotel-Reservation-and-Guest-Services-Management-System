import { describe, it, expect } from 'vitest';
import {
  CreateRoomSchema,
  UpdateRoomStatusSchema,
  ListRoomsQuerySchema,
} from './room.schema';

describe('Room Validation Schemas', () => {
  describe('CreateRoomSchema', () => {
    it('accepts valid room creation data', () => {
      const result = CreateRoomSchema.safeParse({
        room_number: '301',
        branch_id: 1,
        type_id: 2,
        status: 'Available',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.room_number).toBe('301');
        expect(result.data.branch_id).toBe(1);
        expect(result.data.type_id).toBe(2);
        expect(result.data.status).toBe('Available');
      }
    });

    it('defaults status to Available if omitted', () => {
      const result = CreateRoomSchema.safeParse({
        room_number: '302',
        branch_id: 2,
        type_id: 1,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('Available');
      }
    });

    it('rejects empty or whitespace room number', () => {
      const result = CreateRoomSchema.safeParse({
        room_number: '   ',
        branch_id: 1,
        type_id: 1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid room numbers exceeding 10 characters', () => {
      const result = CreateRoomSchema.safeParse({
        room_number: 'ROOM-1000000',
        branch_id: 1,
        type_id: 1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid status', () => {
      const result = CreateRoomSchema.safeParse({
        room_number: '303',
        branch_id: 1,
        type_id: 1,
        status: 'InvalidStatus',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateRoomStatusSchema', () => {
    it('accepts valid room statuses', () => {
      expect(UpdateRoomStatusSchema.safeParse({ status: 'Available' }).success).toBe(true);
      expect(UpdateRoomStatusSchema.safeParse({ status: 'Occupied' }).success).toBe(true);
      expect(UpdateRoomStatusSchema.safeParse({ status: 'Maintenance' }).success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = UpdateRoomStatusSchema.safeParse({ status: 'Cleaning' });
      expect(result.success).toBe(false);
    });
  });

  describe('ListRoomsQuerySchema', () => {
    it('accepts valid query parameters with coercions', () => {
      const result = ListRoomsQuerySchema.safeParse({
        branchId: '1',
        status: 'Available',
        typeId: '2',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.branchId).toBe(1);
        expect(result.data.status).toBe('Available');
        expect(result.data.typeId).toBe(2);
      }
    });

    it('accepts empty query parameters', () => {
      const result = ListRoomsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects invalid branchId', () => {
      const result = ListRoomsQuerySchema.safeParse({ branchId: '-5' });
      expect(result.success).toBe(false);
    });
  });
});
