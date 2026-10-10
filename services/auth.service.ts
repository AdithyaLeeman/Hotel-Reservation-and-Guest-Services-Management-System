import { withTransaction } from '@/lib/db/transaction';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { userRepository } from '@/repositories/user.repository';
import { guestRepository } from '@/repositories/guest.repository';
import type { GuestRegisterInput, GuestLoginInput, StaffLoginInput } from '@/lib/validation/auth.schema';
import type { UserAccount, Guest } from '@/types/domain';
import type { SessionData } from '@/types/session';


export interface RegisterGuestResult {
  user: UserAccount;
  guest: Guest;
}

export class AuthServiceError extends Error {
  constructor(
    public readonly code: 'INVALID_CREDENTIALS' | 'ACCOUNT_INACTIVE',
    message: string
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

export const authService = {
  /**
   * Register a new guest account.
   *
   * Atomically inserts one user_account row (role='Guest') and one guest row
   * in the same PostgreSQL transaction. If either insert fails (e.g. duplicate
   * username/email UNIQUE violation) the entire transaction rolls back and the
   * pg DatabaseError is re-thrown to the route handler.
   *
   * @param input - Validated guest registration fields
   * @returns { user, guest } — safe to serialize (no password_hash)
   * @throws DatabaseError (SQLSTATE 23505) on duplicate username or email
   */
  registerGuest: async (input: GuestRegisterInput): Promise<RegisterGuestResult> => {
    const password_hash = await hashPassword(input.password);

    return withTransaction(async (client) => {
      // 1. Insert user_account (role = 'Guest')
      const user = await userRepository.insertUserAccount(client, {
        username: input.username,
        password_hash,
        role: 'Guest',
      });

      // 2. Insert guest profile linked to the new user_account
      const guest = await guestRepository.insertGuest(client, {
        user_id: user.user_id,
        full_name: input.full_name,
        email: input.email,
        phone: input.phone,
        identification: input.identification,
      });

      return { user, guest };
    });
  },

  /**
   * Authenticate a guest login.
   *
   * Finds the user_account by username, verifies the bcrypt password, checks
   * account status, then fetches the guest profile for session population.
   *
   * @param input - Validated username + password
   * @returns SessionData — caller must write this to iron-session and save()
   * @throws AuthServiceError('INVALID_CREDENTIALS') — wrong username or password
   * @throws AuthServiceError('ACCOUNT_INACTIVE')    — account suspended/inactive
   */
  loginGuest: async (input: GuestLoginInput): Promise<SessionData> => {
    // 1. Look up the user_account (includes password_hash for verification)
    const user = await userRepository.findByUsername(input.username);

    // 2. Verify password — use the same error for missing user and wrong password
    //    to prevent username enumeration attacks
    if (!user || !(await verifyPassword(input.password, user.password_hash))) {
      throw new AuthServiceError('INVALID_CREDENTIALS', 'Invalid username or password');
    }

    // 3. Reject non-Guest logins on the guest endpoint
    if (user.role !== 'Guest') {
      throw new AuthServiceError('INVALID_CREDENTIALS', 'Invalid username or password');
    }

    // 4. Block inactive / suspended accounts
    if (user.status !== 'Active') {
      throw new AuthServiceError('ACCOUNT_INACTIVE', 'Your account is inactive or suspended');
    }

    // 5. Fetch guest profile to get guest_id for session
    const guest = await guestRepository.findByUserId(user.user_id);
    if (!guest) {
      // Should never happen if DB constraints are intact
      throw new Error(`[authService] No guest profile found for user_id=${user.user_id}`);
    }

    return {
      userId: user.user_id,
      role: 'Guest',
      guestId: guest.guest_id,
    };
  },

  /**
   * Authenticate a staff login (Receptionist, Manager, Admin).
   *
   * Finds the user_account joined with employee for branch_id, verifies
   * credentials, checks account status, then returns session data.
   *
   * @param input - Validated username + password
   * @returns SessionData — caller must write to iron-session and save()
   * @throws AuthServiceError('INVALID_CREDENTIALS') — wrong username or password
   * @throws AuthServiceError('ACCOUNT_INACTIVE')    — account suspended/inactive
   */
  loginStaff: async (input: StaffLoginInput): Promise<SessionData> => {
    // 1. Look up user_account + employee in one JOIN query
    const user = await userRepository.findStaffByUsername(input.username);

    // 2. Same unified error for missing user or wrong password
    if (!user || !(await verifyPassword(input.password, user.password_hash))) {
      throw new AuthServiceError('INVALID_CREDENTIALS', 'Invalid username or password');
    }

    // 3. Only staff roles are allowed on the staff endpoint
    if (user.role === 'Guest') {
      throw new AuthServiceError('INVALID_CREDENTIALS', 'Invalid username or password');
    }

    // 4. Block inactive / suspended accounts
    if (user.status !== 'Active') {
      throw new AuthServiceError('ACCOUNT_INACTIVE', 'Your account is inactive or suspended');
    }

    return {
      userId: user.user_id,
      role: user.role,
      employeeId: user.employee_id,
      // Receptionist branch_id is always non-null (DB constraint); Manager/Admin may be null
      branchId: user.branch_id ?? undefined,
    };
  },
};
