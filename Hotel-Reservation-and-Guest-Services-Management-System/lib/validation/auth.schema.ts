/**
 * Zod validation schemas for authentication and user registration endpoints.
 *
 * These schemas validate HTTP request shape BEFORE any DB call.
 * They are the only authoritative place for HTTP-layer input constraints.
 *
 * Business rules (duplicate email, duplicate username, password policy beyond
 * minimum length) are enforced by PostgreSQL constraints — not here.
 *
 * See docs/21_shared-contracts.md Section 6 (API shape) for HTTP contract.
 * See AGENTS.md Section 10 for security rules.
 *
 * Task: P01-M01-T21
 * Lecture alignment: L07 (input validation, injection prevention)
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Guest registration — POST /api/guest/register
// ---------------------------------------------------------------------------

export const GuestRegisterSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(100, 'Username must be 100 characters or fewer')
    .regex(/^\S+$/, 'Username must not contain spaces'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or fewer'),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(100, 'Email must be 100 characters or fewer')
    .toLowerCase(),
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be 100 characters or fewer'),
  phone: z
    .string()
    .trim()
    .max(20, 'Phone must be 20 characters or fewer')
    .optional(),
  identification: z
    .string()
    .trim()
    .max(50, 'Identification must be 50 characters or fewer')
    .optional(),
});

export type GuestRegisterInput = z.infer<typeof GuestRegisterSchema>;

// ---------------------------------------------------------------------------
// Guest login — POST /api/guest/login
// ---------------------------------------------------------------------------

export const GuestLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type GuestLoginInput = z.infer<typeof GuestLoginSchema>;

// ---------------------------------------------------------------------------
// Staff login — POST /api/staff/login
// ---------------------------------------------------------------------------

export const StaffLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type StaffLoginInput = z.infer<typeof StaffLoginSchema>;

// ---------------------------------------------------------------------------
// Shared helper — flatten Zod errors into field-level error map
// for the standard API error response shape (docs/21 Section 6)
// ---------------------------------------------------------------------------

/**
 * Convert a Zod ZodError into the API-contract-compliant fields map.
 *
 * @example
 * const result = GuestRegisterSchema.safeParse(body);
 * if (!result.success) {
 *   return Response.json({
 *     error: {
 *       code: 'VALIDATION_ERROR',
 *       message: 'Validation failed',
 *       fields: flattenZodErrors(result.error),
 *     },
 *   }, { status: 400 });
 * }
 */
export function flattenZodErrors(
  error: z.ZodError
): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors;
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors) as [string, string[] | undefined][]) {
    if (messages && messages.length > 0) {
      result[field] = messages[0];
    }
  }
  return result;
}
