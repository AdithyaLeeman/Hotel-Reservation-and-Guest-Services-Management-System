import type { UserRole } from './enums';

/**
 * Server-side session shape.
 *
 * See docs/21_shared-contracts.md Section 7 for the full contract.
 *
 * NEVER trust session fields supplied from the browser.
 * ALWAYS read from the server-side session on every request.
 *
 * Guest ownership: use session.guestId in all guest DB queries.
 * Branch scope: use session.branchId for Receptionist-scoped queries.
 */
export interface SessionData {
  /** user_account.user_id — UUID */
  userId: string;
  /** The authenticated role */
  role: UserRole;
  /** guest.guest_id — present if role = 'Guest' */
  guestId?: string;
  /** employee.employee_id — present if staff role */
  employeeId?: number;
  /**
   * employee's assigned branch_id — present for Receptionist (scoped).
   * May be null/undefined for Manager and Admin (all-branch access).
   */
  branchId?: number;
}
