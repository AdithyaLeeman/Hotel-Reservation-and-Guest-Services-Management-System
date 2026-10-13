import type { SessionData } from '@/types/session';
import type { UserRole } from '@/types/enums';
import type { IronSession } from 'iron-session';

export class AuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// Assert that the session belongs to an authenticated user whose role is in
// the allowed list. After this guard the session is guaranteed to be fully
export function requireRole(
  session: IronSession<SessionData>,
  allowedRoles: UserRole[]
): asserts session is IronSession<SessionData> & SessionData {
  if (!session.userId) {
    throw new AuthError(401, 'Not authenticated');
  }
  if (!session.role || !allowedRoles.includes(session.role)) {
    throw new AuthError(
      403,
      `Access requires one of: ${allowedRoles.join(', ')}. Your role: ${session.role}`
    );
  }
}

// For Receptionist: enforce that the resource belongs to the staff member's
// assigned branch. Manager and Admin have all-branch access and always pass.
export function requireBranchScope(
  session: IronSession<SessionData> & SessionData,
  targetBranchId: number
): void {
  if (session.role === 'Receptionist' && session.branchId !== targetBranchId) {
    throw new AuthError(
      403,
      'Access restricted to your assigned branch'
    );
  }
}

// Convert an AuthError into the standard API error response shape.
// Use inside route handler catch blocks alongside isSqlState().
export function authErrorResponse(err: AuthError): Response {
  const code = err.status === 401 ? 'NOT_AUTHENTICATED' : 'INSUFFICIENT_ROLE';
  return Response.json(
    { error: { code, message: err.message } },
    { status: err.status }
  );
}
