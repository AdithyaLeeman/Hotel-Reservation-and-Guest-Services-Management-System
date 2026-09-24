/**
 * POST /api/guest/payments — P05-M05-T10 (MOCK-FIRST)
 *
 * Allows an authenticated guest to submit a payment against their invoice.
 *
 * Flow:
 *   1. Verify guest session (TODO: use real iron-session in Phase 1)
 *   2. Validate request body with Zod
 *   3. Call paymentService.postPayment()
 *   4. Map DB errors to HTTP responses:
 *      - SQLSTATE 23505 (duplicate transaction_reference) → 409 DUPLICATE_PAYMENT
 *   5. Return created payment data
 *
 * Owned by: Member 5 (M5)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PostPaymentSchema } from '@/lib/validation/payment.schema';
import { paymentService } from '@/services/payment.service';
import { ERROR_CODES, isSqlState } from '@/types/api';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();

  // ── Step 1: Chec
  // k authentication (MOCK — replace with real session in Phase 6) ──
  // In real implementation: const session = await getIronSession(...)
  // For now, read a mock user ID from a header so we can test without auth
  const mockUserId = req.headers.get('x-mock-user-id');
  if (!mockUserId) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.NOT_AUTHENTICATED, message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  // ── Step 2: Parse and validate request body ────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  const parsed = PostPaymentSchema.safeParse(body);
  if (!parsed.success) {
    // Build field-level error map from Zod issues
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path.join('.');
      fields[field] = issue.message;
    }
    return NextResponse.json(
      { error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Validation failed', fields } },
      { status: 400 }
    );
  }

  // ── Step 3: Call service ───────────────────────────────────────────────────
  try {
    const payment = await paymentService.postPayment(
      parsed.data,
      mockUserId,
      null // employee ID — null for guest self-pay
    );

    return NextResponse.json(
      { data: payment, meta: { requestId } },
      { status: 201 }
    );
  } catch (err) {
    // ── Step 4: Map known DB errors ──────────────────────────────────────────

    // Duplicate transaction_reference (SQLSTATE 23505)
    if (isSqlState(err, '23505')) {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.DUPLICATE_PAYMENT,
            message: 'A payment with this transaction reference already exists',
          },
        },
        { status: 409 }
      );
    }

    // Unknown error — do not expose DB internals
    console.error('[POST /api/guest/payments] Unexpected error:', err);
    return NextResponse.json(
      { error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
