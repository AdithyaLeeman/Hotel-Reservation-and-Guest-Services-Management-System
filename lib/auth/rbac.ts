import type { SessionData } from '@/types/session';
import type { UserRole } from '@/types/enums';
import type { IronSession } from 'iron-session';

/**
 * RBAC middleware helpers.
 *
 * Every protected route handler must call requireRole() (and optionally
 * requireBranchScope()) before any business logic.
 *
 * Role and branch scope are read from the server-side iron-session — never
 * from the request body, query params, or headers supplied by the browser.
 *
 * Authorization sequence (docs/21_shared-contracts.md Section 12):
 *   1. getSession()
 *   2. requireRole(session, [...allowed roles])    → throws AuthError(401/403)
 *   3. requireBranchScope(session, branchId)       → throws AuthError(403)
 *   4. validateInput(schema)                       → Zod validation
 *   5. call service / repository
 *   6. return response
 *
 * Task: P01-M01-T19
 * Lecture alignment: L07 (RBAC, application security)
 */

/**
 * Thrown by requireRole and requireBranchScope when auth or authorization fails.
 * Route handlers catch this and return the appropriate HTTP status.
 */
export class AuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Assert that the session belongs to an authenticated user whose role is in
 * the allowed list. After this guard the session is guaranteed to be fully
 * populated (userId and role are non-null).
 *
 * @param session - The IronSession returned by getSession()
 * @param allowedRoles - Roles permitted to access this route
 * @throws AuthError(401) if no userId in session (not authenticated)
 * @throws AuthError(403) if role is not in allowedRoles (insufficient role)
 */
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

/**
 * For Receptionist: enforce that the resource belongs to the staff member's
 * assigned branch. Manager and Admin have all-branch access and always pass.
 *
 * Must be called AFTER requireRole() so the session is guaranteed populated.
 *
 * @param session - The authenticated session (after requireRole)
 * @param targetBranchId - The branch_id of the resource being accessed
 * @throws AuthError(403) if Receptionist tries to access another branch
 */
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

/**
 * Convert an AuthError into the standard API error response shape.
 * Use inside route handler catch blocks alongside isSqlState().
 *
 * @example
 * } catch (err) {
 *   if (err instanceof AuthError) return authErrorResponse(err);
 *   ...
 * }
 */
export function authErrorResponse(err: AuthError): Response {
  const code = err.status === 401 ? 'NOT_AUTHENTICATED' : 'INSUFFICIENT_ROLE';
  return Response.json(
    { error: { code, message: err.message } },
    { status: err.status }
  );
}
