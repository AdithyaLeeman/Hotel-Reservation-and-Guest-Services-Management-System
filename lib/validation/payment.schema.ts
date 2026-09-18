import { z } from 'zod';

/**
 * Zod schema for payment input validation.
 *
 * The amount is validated as a positive number (display) but stored as NUMERIC(12,2).
 * Outstanding balance enforcement is DB-side (sp_post_payment raises exception).
 *
 * TODO (P05-M05-T03): Refine based on payment gateway integration.
 */

export const PostPaymentSchema = z.object({
  invoice_id: z.string().uuid('invoice_id must be a valid UUID'),
  amount: z
    .number()
    .positive('Payment amount must be greater than 0')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  payment_method: z.enum(['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer']),
  transaction_reference: z.string().max(100).optional(),
});

export type PostPaymentInput = z.infer<typeof PostPaymentSchema>;
