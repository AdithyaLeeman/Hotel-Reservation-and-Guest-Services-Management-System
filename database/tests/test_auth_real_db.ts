import { pool } from '../../lib/db/pool';
import { withTransaction } from '../../lib/db/transaction';
import { userRepository } from '../../repositories/user.repository';
import { guestRepository } from '../../repositories/guest.repository';
import { authService, AuthServiceError } from '../../services/auth.service';

let passCount = 0;
let failCount = 0;

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passCount++;
  } else {
    console.error(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
    failCount++;
  }
}

function section(title: string): void {
  console.log(`\n-- ${title}`);
}

const RUN_ID = Date.now();
const TEST_USERNAME = `test_guest_${RUN_ID}`;
const TEST_EMAIL = `test_${RUN_ID}@example.com`;

async function run(): Promise<void> {
  console.log('=== P06-M01-T01 -- Auth Real-DB Integration Test ===');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ?? '(unset)'}\n`);

  // 1. Pool connectivity
  section('1. Pool connectivity');
  try {
    const res = await pool.query<{ now: Date }>('SELECT NOW() AS now');
    assert('Pool connects and returns a row', res.rows.length === 1);
    assert('Returned value is a Date', res.rows[0].now instanceof Date);
  } catch (err) {
    assert('Pool connects', false, String(err));
  }

  // 2. userRepository.findByUsername -- seeded guest (johnp)
  section('2. userRepository.findByUsername -- seeded guest johnp');
  const guestUser = await userRepository.findByUsername('johnp');
  assert('Returns a row for seeded guest johnp', guestUser !== null);
  if (guestUser) {
    assert('username is johnp', guestUser.username === 'johnp');
    assert('role is Guest', guestUser.role === 'Guest');
    assert('status is Active', guestUser.status === 'Active');
    assert('password_hash starts $2b$', guestUser.password_hash.startsWith('$2b$'));
    assert('user_id is a non-empty string', typeof guestUser.user_id === 'string' && guestUser.user_id.length > 0);
  }

  // 3. userRepository.findByUsername -- missing user
  section('3. userRepository.findByUsername -- missing user');
  const missing = await userRepository.findByUsername('__no_such_user__');
  assert('Returns null for unknown username', missing === null);

  // 4. userRepository.findStaffByUsername -- seeded receptionist
  section('4. userRepository.findStaffByUsername -- recep_cmb');
  const staffUser = await userRepository.findStaffByUsername('recep_cmb');
  assert('Returns a row for seeded receptionist recep_cmb', staffUser !== null);
  if (staffUser) {
    assert('role is Receptionist', staffUser.role === 'Receptionist');
    assert('employee_id is a positive number', typeof staffUser.employee_id === 'number' && staffUser.employee_id > 0);
    assert('branch_id is 1 (Colombo)', staffUser.branch_id === 1);
    assert('password_hash present', staffUser.password_hash.startsWith('$2b$'));
  }

  // 5. userRepository.findById -- seeded guest by UUID
  section('5. userRepository.findById');
  if (guestUser) {
    const byId = await userRepository.findById(guestUser.user_id);
    assert('Returns row for known user_id', byId !== null);
    if (byId) {
      assert('username matches', byId.username === 'johnp');
      assert('No password_hash field on findById row', !('password_hash' in byId));
    }
  }

  // 6. guestRepository.findByUserId
  section('6. guestRepository.findByUserId');
  let guestProfile: Awaited<ReturnType<typeof guestRepository.findByUserId>> = null;
  if (guestUser) {
    guestProfile = await guestRepository.findByUserId(guestUser.user_id);
    assert('Returns guest profile for seeded guest', guestProfile !== null);
    if (guestProfile) {
      assert('guest_id is a non-empty UUID', typeof guestProfile.guest_id === 'string' && guestProfile.guest_id.length > 0);
      assert('user_id matches', guestProfile.user_id === guestUser.user_id);
      assert('email is present', typeof guestProfile.email === 'string' && guestProfile.email.length > 0);
    }
  }

  // 7. guestRepository.findById
  section('7. guestRepository.findById');
  if (guestProfile) {
    const byGuestId = await guestRepository.findById(guestProfile.guest_id);
    assert('Returns guest profile by guest_id', byGuestId !== null);
    if (byGuestId) {
      assert('guest_id matches', byGuestId.guest_id === guestProfile.guest_id);
    }
  }

  // 8. withTransaction -- atomic registration
  section('8. Atomic guest registration via withTransaction');
  let newUserId: string | null = null;
  let newGuestId: string | null = null;
  try {
    const { user, guest } = await withTransaction(async (client) => {
      const user = await userRepository.insertUserAccount(client, {
        username: TEST_USERNAME,
        // Minimum-length valid bcrypt hash pattern (not a real password, just for insert test)
        password_hash: '$2b$12$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        role: 'Guest',
      });
      const guest = await guestRepository.insertGuest(client, {
        user_id: user.user_id,
        full_name: 'Integration Test Guest',
        email: TEST_EMAIL,
      });
      return { user, guest };
    });
    newUserId = user.user_id;
    newGuestId = guest.guest_id;
    assert('user_id returned is a UUID string', typeof user.user_id === 'string' && user.user_id.includes('-'));
    assert('role returned is Guest', user.role === 'Guest');
    assert('status returned is Active', user.status === 'Active');
    assert('guest_id returned is a UUID string', typeof guest.guest_id === 'string' && guest.guest_id.includes('-'));
    assert('guest user_id matches user', guest.user_id === user.user_id);
  } catch (err) {
    assert('Transaction completes without error', false, String(err));
  }

  // 9. Duplicate username -> SQLSTATE 23505
  section('9. Duplicate username returns SQLSTATE 23505');
  try {
    await withTransaction(async (client) => {
      await userRepository.insertUserAccount(client, {
        username: TEST_USERNAME,
        password_hash: '$2b$12$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        role: 'Guest',
      });
    });
    assert('Duplicate username throws SQLSTATE 23505', false, 'No error was thrown');
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    assert('SQLSTATE 23505 thrown for duplicate username', code === '23505', `Got code: ${code}`);
  }

  // 10. authService.registerGuest -- full register on real DB (known password)
  section('10. authService.registerGuest -- full real-DB registration');
  const LOGIN_USERNAME = `login_test_${RUN_ID}`;
  const LOGIN_PASSWORD = 'TestP@ssword99!';
  const LOGIN_EMAIL = `login_test_${RUN_ID}@example.com`;
  let registeredUserId: string | null = null;
  let registeredGuestId: string | null = null;
  try {
    const { user: regUser, guest: regGuest } = await authService.registerGuest({
      username: LOGIN_USERNAME,
      password: LOGIN_PASSWORD,
      full_name: 'Auth Test Guest',
      email: LOGIN_EMAIL,
    });
    registeredUserId = regUser.user_id;
    registeredGuestId = regGuest.guest_id;
    assert('registerGuest returns a userId', typeof regUser.user_id === 'string');
    assert('registerGuest role is Guest', regUser.role === 'Guest');
    assert('registerGuest returns a guestId', typeof regGuest.guest_id === 'string');
    assert('registerGuest guest.user_id matches user.user_id', regGuest.user_id === regUser.user_id);
  } catch (err) {
    assert('registerGuest completes without error', false, String(err));
  }

  // 11. authService.loginGuest -- login with known password from step 10
  section('11. authService.loginGuest -- login with known registered account');
  if (registeredUserId) {
    try {
      const sessionData = await authService.loginGuest({
        username: LOGIN_USERNAME,
        password: LOGIN_PASSWORD,
      });
      assert('loginGuest returns userId', typeof sessionData.userId === 'string');
      assert('loginGuest userId matches registered userId', sessionData.userId === registeredUserId);
      assert('loginGuest role is Guest', sessionData.role === 'Guest');
      assert('loginGuest returns guestId', typeof sessionData.guestId === 'string');
      assert('loginGuest guestId matches registered guestId', sessionData.guestId === registeredGuestId);
    } catch (err) {
      assert('loginGuest runs without error', false, String(err));
    }
  } else {
    console.log('  SKIP  loginGuest -- skipped because registerGuest failed in step 10');
  }

  // 12. Wrong password -> INVALID_CREDENTIALS
  section('12. authService.loginGuest -- wrong password');
  try {
    await authService.loginGuest({ username: LOGIN_USERNAME, password: 'WrongPassword999!' });
    assert('Wrong password throws AuthServiceError', false, 'No error thrown');
  } catch (err) {
    if (err instanceof AuthServiceError) {
      assert('AuthServiceError code is INVALID_CREDENTIALS', err.code === 'INVALID_CREDENTIALS');
    } else {
      assert('Throws AuthServiceError for wrong password', false, String(err));
    }
  }

  // 13. Guest account on staff endpoint -> INVALID_CREDENTIALS (role gate)
  section('13. Guest account on staff endpoint -- role gate check');
  try {
    await authService.loginStaff({ username: LOGIN_USERNAME, password: LOGIN_PASSWORD });
    assert('Guest on staff endpoint throws AuthServiceError', false, 'No error thrown -- role gate missing');
  } catch (err) {
    if (err instanceof AuthServiceError) {
      // loginStaff joins user_account with employee; a guest has no employee row
      // so findStaffByUsername returns null, giving INVALID_CREDENTIALS
      assert('Staff endpoint rejects guest account (INVALID_CREDENTIALS)', err.code === 'INVALID_CREDENTIALS');
    } else {
      assert('Staff endpoint rejects guest account', false, String(err));
    }
  }

  // 14. findStaffByUsername bigint coercion -- employee_id and branch_id are JS numbers
  section('14. userRepository.findStaffByUsername -- bigint coercion');
  if (staffUser) {
    assert('employee_id is typeof number (not string)', typeof staffUser.employee_id === 'number');
    assert('branch_id is typeof number (not string)', typeof staffUser.branch_id === 'number');
    assert('employee_id > 0', staffUser.employee_id > 0);
    assert('branch_id === 1 (Colombo)', staffUser.branch_id === 1);
  }

  // Cleanup test rows
  const cleanupPairs: Array<{ guestId: string | null; userId: string | null }> = [
    { guestId: newGuestId, userId: newUserId },
    { guestId: registeredGuestId, userId: registeredUserId },
  ];
  for (const { guestId, userId } of cleanupPairs) {
    if (guestId && userId) {
      try {
        await pool.query('DELETE FROM guest WHERE guest_id = $1', [guestId]);
        await pool.query('DELETE FROM user_account WHERE user_id = $1', [userId]);
      } catch {
        // best-effort only
      }
    }
  }

  // Summary
  console.log(`\n${'='.repeat(52)}`);
  console.log(`RESULTS: ${passCount} passed, ${failCount} failed`);
  if (failCount === 0) {
    console.log('P06-M01-T01  All auth repository real-DB checks passed.');
  } else {
    console.log('P06-M01-T01  Some checks failed -- see output above.');
  }
  console.log('='.repeat(52));

  await pool.end();
  process.exit(failCount > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
