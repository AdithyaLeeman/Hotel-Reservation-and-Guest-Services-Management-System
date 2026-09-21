/**
 * Unit tests for lib/validation/auth.schema.ts (P01-M01-T21)
 *
 * Covers: GuestRegisterSchema, GuestLoginSchema, StaffLoginSchema, flattenZodErrors
 * Strategy: valid inputs pass; each invalid field produces the expected error message.
 */

import { describe, it, expect } from 'vitest';
import {
  GuestRegisterSchema,
  GuestLoginSchema,
  StaffLoginSchema,
  flattenZodErrors,
} from './auth.schema';

// ---------------------------------------------------------------------------
// GuestRegisterSchema
// ---------------------------------------------------------------------------

describe('GuestRegisterSchema', () => {
  const valid = {
    username: 'john_doe',
    password: 'SecurePass123',
    email: 'john@example.com',
    full_name: 'John Doe',
  };

  it('accepts a valid registration payload', () => {
    const result = GuestRegisterSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('normalises email to lowercase', () => {
    const result = GuestRegisterSchema.safeParse({
      ...valid,
      email: 'John@EXAMPLE.COM',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('john@example.com');
    }
  });

  it('rejects username shorter than 3 characters', () => {
    const result = GuestRegisterSchema.safeParse({ ...valid, username: 'ab' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = flattenZodErrors(result.error);
      expect(errors.username).toMatch(/3/);
    }
  });

  it('rejects username with spaces', () => {
    const result = GuestRegisterSchema.safeParse({
      ...valid,
      username: 'john doe',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = flattenZodErrors(result.error);
      expect(errors.username).toBeDefined();
    }
  });

  it('rejects username longer than 100 characters', () => {
    const result = GuestRegisterSchema.safeParse({
      ...valid,
      username: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = GuestRegisterSchema.safeParse({ ...valid, password: 'short1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = flattenZodErrors(result.error);
      expect(errors.password).toMatch(/8/);
    }
  });

  it('rejects invalid email format', () => {
    const result = GuestRegisterSchema.safeParse({
      ...valid,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = flattenZodErrors(result.error);
      expect(errors.email).toBeDefined();
    }
  });

  it('rejects full_name shorter than 2 characters', () => {
    const result = GuestRegisterSchema.safeParse({ ...valid, full_name: 'X' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = flattenZodErrors(result.error);
      expect(errors.full_name).toMatch(/2/);
    }
  });

  it('accepts payload without optional phone and identification', () => {
    const result = GuestRegisterSchema.safeParse({
      username: 'jane_d',
      password: 'ValidPass1',
      email: 'jane@example.com',
      full_name: 'Jane Doe',
    });
    expect(result.success).toBe(true);
  });

  it('rejects phone longer than 20 characters', () => {
    const result = GuestRegisterSchema.safeParse({
      ...valid,
      phone: '0'.repeat(21),
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GuestLoginSchema
// ---------------------------------------------------------------------------

describe('GuestLoginSchema', () => {
  it('accepts valid login credentials', () => {
    const result = GuestLoginSchema.safeParse({
      username: 'john_doe',
      password: 'anyPassword',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty username', () => {
    const result = GuestLoginSchema.safeParse({ username: '', password: 'pass' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = GuestLoginSchema.safeParse({ username: 'john', password: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    const result = GuestLoginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StaffLoginSchema
// ---------------------------------------------------------------------------

describe('StaffLoginSchema', () => {
  it('accepts valid staff login credentials', () => {
    const result = StaffLoginSchema.safeParse({
      username: 'receptionist_01',
      password: 'staffPass!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty username', () => {
    const result = StaffLoginSchema.safeParse({ username: '', password: 'pass' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = StaffLoginSchema.safeParse({
      username: 'staff',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// flattenZodErrors
// ---------------------------------------------------------------------------

describe('flattenZodErrors', () => {
  it('returns a record with one message per failing field', () => {
    const result = GuestRegisterSchema.safeParse({
      username: 'ab',         // fails length
      password: 'short',      // fails length
      email: 'bad',           // fails email
      full_name: 'X',         // fails length
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = flattenZodErrors(result.error);
      expect(Object.keys(errors)).toContain('username');
      expect(Object.keys(errors)).toContain('password');
      expect(Object.keys(errors)).toContain('email');
      expect(Object.keys(errors)).toContain('full_name');
      // Each value is a string (the first error message)
      for (const msg of Object.values(errors)) {
        expect(typeof msg).toBe('string');
        expect(msg.length).toBeGreaterThan(0);
      }
    }
  });

  it('returns an empty record when there are no field errors', () => {
    const result = GuestRegisterSchema.safeParse({
      username: 'valid_user',
      password: 'ValidPass!',
      email: 'user@example.com',
      full_name: 'Valid Name',
    });
    // This should pass — just verifying flattenZodErrors handles empty correctly
    // by constructing a synthetic empty ZodError scenario via a type-narrowed
    // parse of a valid schema with an impossible refinement
    const { z } = require('zod');
    const always_fail = z.string().refine(() => false, 'always fails');
    const bad = always_fail.safeParse('trigger');
    if (!bad.success) {
      const { ZodError } = require('zod');
      // Construct a ZodError with no fieldErrors
      const fakeError = new ZodError([]);
      const errors = flattenZodErrors(fakeError);
      expect(errors).toEqual({});
    }
  });
});
