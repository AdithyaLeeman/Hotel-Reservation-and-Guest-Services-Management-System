/**
 * Auth Service — orchestrates registration, login, and logout.
 *
 * Responsibilities:
 * - Validate credentials against user_account (via repository)
 * - Hash / verify passwords (via lib/auth/password)
 * - Create / destroy sessions (via lib/auth/session)
 * - Return typed domain objects to the route handler
 *
 * This service is THIN: it orchestrates, does not compute financial values,
 * does not access the pool directly, and does not format HTTP responses.
 *
 * Owned by: Member 1 (M1)
 * Implemented in: P01-M01-T08, T09, T10
 */

// TODO (P01-M01-T08): Implement registerGuest()
// TODO (P01-M01-T09): Implement loginGuest()
// TODO (P01-M01-T10): Implement loginStaff()
// TODO: Implement logout()

export const authService = {
  registerGuest: async (_input: unknown): Promise<void> => {
    throw new Error('authService.registerGuest not yet implemented — P01-M01-T08');
  },
  loginGuest: async (_input: unknown): Promise<void> => {
    throw new Error('authService.loginGuest not yet implemented — P01-M01-T09');
  },
  loginStaff: async (_input: unknown): Promise<void> => {
    throw new Error('authService.loginStaff not yet implemented — P01-M01-T10');
  },
};
