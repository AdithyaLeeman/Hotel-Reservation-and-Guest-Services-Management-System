import { z } from 'zod';

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
