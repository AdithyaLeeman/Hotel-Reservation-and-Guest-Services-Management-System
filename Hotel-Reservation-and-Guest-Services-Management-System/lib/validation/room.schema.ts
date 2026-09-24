/**
 * Zod validation schemas for room inventory and management endpoints.
 *
 * Used by:
 * - GET  /api/staff/rooms       (ListRoomsQuerySchema)
 * - POST /api/staff/rooms       (CreateRoomSchema)
 * - PATCH /api/staff/rooms/[id] (UpdateRoomStatusSchema)
 *
 * Owned by: Member 2 (M2) | Tasks: P02-M02-T10, P02-M02-T11, P02-M02-T12
 * Lecture alignment: L07 (input validation, injection prevention)
 */

import { z } from 'zod';

export const RoomStatusEnum = z.enum(['Available', 'Occupied', 'Maintenance']);

export const CreateRoomSchema = z.object({
  room_number: z
    .string()
    .trim()
    .min(1, 'Room number is required')
    .max(10, 'Room number must be 10 characters or fewer'),
  branch_id: z.coerce
    .number()
    .int('branch_id must be an integer')
    .positive('branch_id must be a positive integer'),
  type_id: z.coerce
    .number()
    .int('type_id must be an integer')
    .positive('type_id must be a positive integer'),
  status: RoomStatusEnum.optional().default('Available'),
});

export const UpdateRoomStatusSchema = z.object({
  status: RoomStatusEnum,
});

export const ListRoomsQuerySchema = z.object({
  branchId: z.coerce
    .number()
    .int('branchId must be an integer')
    .positive('branchId must be a positive integer')
    .optional(),
  status: RoomStatusEnum.optional(),
  typeId: z.coerce
    .number()
    .int('typeId must be an integer')
    .positive('typeId must be a positive integer')
    .optional(),
});

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type UpdateRoomStatusInput = z.infer<typeof UpdateRoomStatusSchema>;
export type ListRoomsQueryInput = z.infer<typeof ListRoomsQuerySchema>;
