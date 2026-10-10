import { z } from 'zod';

/**
 * Zod schemas for reservation and availability endpoints.
 *
 * Note on date validation:
 * - Dates are ISO 8601 strings (YYYY-MM-DD) from the client
 * - DB enforces check_out_date > check_in_date via CHECK constraint
 * - Client-side date order is validated here for early feedback
 *
 * TODO (P03-M03-T04): Validate room_ids is non-empty array of positive integers.
 * Lecture alignment: L07 (input validation)
 */

const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const AvailabilitySearchSchema = z.object({
  branch_id: z.coerce.number().int().positive('branch_id must be a positive integer'),
  check_in: isoDateString,
  check_out: isoDateString,
}).refine(
  (data) => data.check_in < data.check_out,
  { message: 'check_out must be after check_in', path: ['check_out'] }
);

export const CreateReservationSchema = z.object({
  branch_id: z.number().int().positive(),
  check_in_date: isoDateString,
  check_out_date: isoDateString,
  room_ids: z.array(z.number().int().positive()).min(1, 'At least one room is required'),
  booking_source: z.enum(['Online', 'Reception', 'Phone']),
  discount_percentage: z.number().min(0).max(99.99).optional(),
  // processed_by_employee_id is read from session — never from request body
}).refine(
  (data) => data.check_in_date < data.check_out_date,
  { message: 'check_out_date must be after check_in_date', path: ['check_out_date'] }
);

export type AvailabilitySearchInput = z.infer<typeof AvailabilitySearchSchema>;
export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
