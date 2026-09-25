import { z } from 'zod';

/**
 * Zod schemas for service catalogue and service usage endpoints.
 *
 * DB-first rule:
 * - charged_price is NEVER accepted from the client body — it is computed
 *   by sp_log_service_usage() from service_catalogue.current_price at log time.
 * - Quantities must be positive integers.
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T12/T13/T14/T15
 * Lecture alignment: L07 (input validation, parameterized queries)
 */

// ---------------------------------------------------------------------------
// Money string: matches NUMERIC(12,2) representation
// e.g. "1500.00"
// ---------------------------------------------------------------------------
const numericString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal with up to 2 decimal places');

// ---------------------------------------------------------------------------
// Log service usage — POST /api/staff/reservations/[id]/services
// ---------------------------------------------------------------------------
export const LogServiceUsageSchema = z.object({
  room_id: z.number().int().positive('room_id must be a positive integer'),
  service_id: z.number().int().positive('service_id must be a positive integer'),
  quantity: z.number().int().min(1, 'quantity must be at least 1'),
  request_channel: z.enum(['Phone', 'InPerson', 'App']).optional().nullable(),
  // reservation_id and logged_by_employee_id come from route params + session — NOT from body
});

export type LogServiceUsageInput = z.infer<typeof LogServiceUsageSchema>;

// ---------------------------------------------------------------------------
// Add catalogue item — POST /api/staff/services
// ---------------------------------------------------------------------------
export const CreateCatalogueItemSchema = z.object({
  service_name: z
    .string()
    .min(2, 'service_name must be at least 2 characters')
    .max(100, 'service_name must be at most 100 characters')
    .trim(),
  current_price: numericString,
  status: z.enum(['Active', 'Inactive']).optional().default('Active'),
});

export type CreateCatalogueItemInput = z.infer<typeof CreateCatalogueItemSchema>;
