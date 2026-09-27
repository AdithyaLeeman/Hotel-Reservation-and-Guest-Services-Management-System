
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getSession } from '@/lib/auth/session';
import { PostPaymentSchema } from '@/lib/validation/payment.schema';
import { paymentService } from '@/services/payment.service';
import { ERROR_CODES, isSqlState } from '@/types/api';
import type { SessionData } from '@/types/session';

function getDevGuestSession(): Partial<SessionData> {
  return {
    userId:  'user-mock-guest-001',
    role:    'Guest',
    guestId: 'guest-mock-001',
  };
}

async function resolveSession(): Promise<Partial<SessionData>> {
  try {
    const session = await getSession();
    if (session.userId && session.role) {
      return session;
    }
  } catch {
    // In dev / mock-first mode when cookies are not present
  }

  if (process.env.NODE_ENV !== 'production') {
    return getDevGuestSession();
  }

  return {};
}


function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    { data, meta: { requestId: crypto.randomUUID() } },
    { status }
  );
}

function err(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    { status }
  );
}

function zodFieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'body';
    if (!fields[path]) fields[path] = issue.message;
  }
  return fields;
}


export async function POST(req: NextRequest): Promise<NextResponse> {
  
  const session = await resolveSession();

  if (!session.userId || !session.role) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Not authenticated.');
  }

  if (session.role !== 'Guest') {
    return err(
      403,
      ERROR_CODES.INSUFFICIENT_ROLE,
      `This endpoint is for guests only. Your role: ${session.role}`
    );
  }


  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Request body must be valid JSON.');
  }


  let input: ReturnType<typeof PostPaymentSchema.parse>;
  try {
    input = PostPaymentSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof ZodError) {
      return err(400, ERROR_CODES.VALIDATION_ERROR, 'Validation failed.', zodFieldErrors(error));
    }
    return err(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid request body.');
  }

  
  try {
    const payment = await paymentService.postPayment(
      {
        invoice_id:            input.invoice_id,
        amount_paid:           input.amount.toFixed(2),
        payment_method:        input.payment_method,
        transaction_reference: input.transaction_reference ?? null,
      },
      session.userId,
      null, // employeeId — null for guest self-pay; staff payments use P05-M05-T11
    );

    return ok(payment, 201);

  } catch (error) {
   
    if (isSqlState(error, '23505')) {
      return err(
        409,
        ERROR_CODES.DUPLICATE_PAYMENT,
        'A payment with this transaction reference already exists.'
      );
    }

    
    if (isSqlState(error, '23514')) {
      return err(
        422,
        ERROR_CODES.VALIDATION_ERROR,
        'Payment amount must be greater than 0.'
      );
    }

    console.error('[POST /api/guest/payments]', error);
    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}