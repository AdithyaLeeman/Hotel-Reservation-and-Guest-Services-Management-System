/**
 * Password hashing utilities using bcryptjs.
 *
 * Cost factor: 12 minimum (AGENTS.md Section 10).
 * Never log or return password hashes.
 *
 * TODO (P01-M01-T06): Install bcryptjs + @types/bcryptjs, then implement.
 * Lecture alignment: L07 (security, password storage)
 */

// TODO: import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password.
 * @param plaintext - The user's password
 * @returns The bcrypt hash to store in user_account.password_hash
 */
export async function hashPassword(plaintext: string): Promise<string> {
  // TODO: return bcrypt.hash(plaintext, SALT_ROUNDS);
  throw new Error('hashPassword not yet implemented — P01-M01-T06');
}

/**
 * Verify a plaintext password against a stored bcrypt hash.
 * @param plaintext - The submitted password
 * @param hash - The stored hash from user_account.password_hash
 * @returns true if valid, false if invalid
 */
export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  // TODO: return bcrypt.compare(plaintext, hash);
  throw new Error('verifyPassword not yet implemented — P01-M01-T06');
}
