import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

// Hash a plaintext password for storage in user_account.password_hash.
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

// Verify a plaintext password against a stored bcrypt hash.
export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
