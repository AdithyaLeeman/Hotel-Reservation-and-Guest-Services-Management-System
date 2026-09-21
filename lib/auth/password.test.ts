/**
 * Unit tests for lib/auth/password.ts (P01-M01-T10)
 *
 * Covers: hashPassword, verifyPassword
 * Strategy: happy path + negative path + security invariant (hash uniqueness).
 */

import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('hashPassword', () => {
  it('returns a string that starts with a bcrypt prefix', async () => {
    const hash = await hashPassword('myPassword123');
    // bcrypt hashes always start with $2b$ (cost 12)
    expect(hash).toMatch(/^\$2b\$12\$/);
  });

  it('produces a different hash for the same input on each call (salt uniqueness)', async () => {
    const hash1 = await hashPassword('samePassword');
    const hash2 = await hashPassword('samePassword');
    expect(hash1).not.toBe(hash2);
  });

  it('produces a hash longer than 50 characters', async () => {
    const hash = await hashPassword('short');
    expect(hash.length).toBeGreaterThan(50);
  });
});

describe('verifyPassword', () => {
  it('returns true when the plaintext matches the stored hash', async () => {
    const password = 'correctPassword!42';
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  it('returns false when the plaintext does not match the stored hash', async () => {
    const hash = await hashPassword('correctPassword!42');
    const result = await verifyPassword('wrongPassword', hash);
    expect(result).toBe(false);
  });

  it('returns false for an empty string against a valid hash', async () => {
    const hash = await hashPassword('validPassword');
    const result = await verifyPassword('', hash);
    expect(result).toBe(false);
  });

  it('returns false for a hash that is not a valid bcrypt string', async () => {
    const result = await verifyPassword('anyPassword', 'not_a_bcrypt_hash');
    expect(result).toBe(false);
  });
});
