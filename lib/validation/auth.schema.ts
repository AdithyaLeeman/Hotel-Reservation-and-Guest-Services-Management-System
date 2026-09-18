import { z } from 'zod';

/**
 * Zod schemas for guest authentication endpoints.
 *
 * See docs/21_shared-contracts.md for API contract.
 * These schemas validate input shape BEFORE any DB call.
 * Business rules (e.g., duplicate email) are enforced by PostgreSQL constraints.
 *
 * TODO (P01-M01-T08): Install zod, then fill in schemas with real constraints.
 * Lecture alignment: L07 (input validation, security)
 */

export const GuestRegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  email: z.string().email('Invalid email address').max(100),
  full_name: z.string().min(1, 'Full name is required').max(100),
  phone: z.string().max(20).optional(),
  identification: z.string().max(50).optional(),
});

export const GuestLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const StaffLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type GuestRegisterInput = z.infer<typeof GuestRegisterSchema>;
export type GuestLoginInput = z.infer<typeof GuestLoginSchema>;
export type StaffLoginInput = z.infer<typeof StaffLoginSchema>;
