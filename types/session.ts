import type { UserRole } from './enums';

export interface SessionData {
  /** user_account.user_id - UUID */
  userId: string;
  /** The authenticated role */
  role: UserRole;
  /** guest.guest_id - present if role = 'Guest' */
  guestId?: string;
  /** employee.employee_id - present if staff role */
  employeeId?: number;
  // employee's assigned branch_id - present for Receptionist (scoped).
  // May be null/undefined for Manager and Admin (all-branch access).
  branchId?: number;
}
