/**
 * Password hashing utilities using bcryptjs.
 *
 * Cost factor: 12 (AGENTS.md Section 10 — minimum 12).
 * Never log, return, or store password hashes in plaintext.
 *
 * Task: P01-M01-T10
 * Lecture alignment: L07 (security, password storage)
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password for storage in user_account.password_hash.
 *
 * @param plaintext - The user's raw password
 * @returns The bcrypt hash string to persist
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a stored bcrypt hash.
 *
 * @param plaintext - The password submitted at login
 * @param hash - The stored hash from user_account.password_hash
 * @returns true if the password is correct, false otherwise
 */
export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
