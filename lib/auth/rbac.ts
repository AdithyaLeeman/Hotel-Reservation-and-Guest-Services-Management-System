import type { SessionData } from '@/types/session';
import type { UserRole } from '@/types/enums';

/**
 * RBAC middleware helpers.
 *
 * All protected routes call requireRole() or requireBranchScope() before business logic.
 * Role and branch scope are read from the server-side session — never from the request body.
 *
 * See docs/11_security-and-rbac.md for the full RBAC matrix.
 * See docs/21_shared-contracts.md Section 8 for the branch scope contract.
 *
 * TODO (P01-M01-T14): Implement these helpers once session management is done.
 * Lecture alignment: L07 (RBAC, application security)
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
 * Verify the session contains a valid authenticated user with one of the required roles.
 * Throws AuthError(401) if no session; AuthError(403) if wrong role.
 *
 * @param session - The session from getSession()
 * @param allowedRoles - Roles that are permitted to access this resource
 */
export function requireRole(
  session: Partial<SessionData>,
  allowedRoles: UserRole[]
): asserts session is SessionData {
  // TODO: Implement
  // if (!session.userId) throw new AuthError(401, 'Not authenticated');
  // if (!allowedRoles.includes(session.role)) throw new AuthError(403, 'Insufficient role');
  throw new Error('requireRole not yet implemented — P01-M01-T14');
}

/**
 * For Receptionist: enforce that the request targets their assigned branch.
 * Manager and Admin are not restricted by branch.
 *
 * @param session - The authenticated session (after requireRole)
 * @param targetBranchId - The branch_id of the resource being accessed
 */
export function requireBranchScope(
  session: SessionData,
  targetBranchId: number
): void {
  // TODO: Implement
  // if (session.role === 'Receptionist' && session.branchId !== targetBranchId) {
  //   throw new AuthError(403, 'Access restricted to your branch');
  // }
  throw new Error('requireBranchScope not yet implemented — P01-M01-T14');
}
