
import { authService, AuthServiceError } from '@/services/auth.service';
import { getSession } from '@/lib/auth/session';
import { StaffLoginSchema, flattenZodErrors } from '@/lib/validation/auth.schema';
import { ERROR_CODES } from '@/types/api';

export async function POST(req: Request): Promise<Response> {
  // Step 1 — Parse + validate input shape
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  const parsed = StaffLoginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          fields: flattenZodErrors(parsed.error),
        },
      },
      { status: 400 }
    );
  }

  try {
    // Step 2 — Verify credentials + fetch employee profile
    const sessionData = await authService.loginStaff(parsed.data);

    // Step 3 — Write session
    // branchId is present for Receptionist, undefined for Manager/Admin (all-branch)
    const session = await getSession();
    session.userId = sessionData.userId;
    session.role = sessionData.role;
    session.employeeId = sessionData.employeeId;
    session.branchId = sessionData.branchId;
    await session.save();

    // Step 4 — Return safe session info
    return Response.json(
      {
        data: {
          userId: sessionData.userId,
          role: sessionData.role,
          employeeId: sessionData.employeeId,
          branchId: sessionData.branchId,
        },
        meta: { requestId: crypto.randomUUID() },
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof AuthServiceError) {
      if (err.code === 'INVALID_CREDENTIALS') {
        return Response.json(
          { error: { code: ERROR_CODES.NOT_AUTHENTICATED, message: err.message } },
          { status: 401 }
        );
      }
      if (err.code === 'ACCOUNT_INACTIVE') {
        return Response.json(
          { error: { code: ERROR_CODES.INSUFFICIENT_ROLE, message: err.message } },
          { status: 403 }
        );
      }
    }

    console.error('[POST /api/staff/login] Unexpected error:', err);
    return Response.json(
      { error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Login failed' } },
      { status: 500 }
    );
  }
}
