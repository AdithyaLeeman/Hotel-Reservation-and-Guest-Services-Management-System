/**
 * Unit tests for lib/auth/rbac.ts (P01-M01-T19)
 *
 * Covers: requireRole, requireBranchScope, authErrorResponse
 * Strategy: happy path + all error states + type narrowing assertion.
 *
 * Note: IronSession is a Proxy object. We create minimal mock objects that
 * match the required fields rather than using the actual iron-session library,
 * since these are pure logic guards that do not depend on the cookie layer.
 */

import { describe, it, expect } from 'vitest';
import {
  requireRole,
  requireBranchScope,
  authErrorResponse,
  AuthError,
} from './rbac';
import type { SessionData } from '@/types/session';
import type { IronSession } from 'iron-session';

// ---------------------------------------------------------------------------
// Minimal mock session factory
// ---------------------------------------------------------------------------

function makeSession(
  overrides: Partial<SessionData> & { userId?: string } = {}
): IronSession<SessionData> {
  return {
    userId: 'user-uuid-123',
    role: 'Guest',
    ...overrides,
    // iron-session shape extras (not used in guard logic)
    save: async () => {},
    destroy: () => {},
    updateConfig: () => {},
  } as unknown as IronSession<SessionData>;
}

// ---------------------------------------------------------------------------
// requireRole
// ---------------------------------------------------------------------------

describe('requireRole', () => {
  it('does not throw when the session role is in the allowed list', () => {
    const session = makeSession({ role: 'Receptionist' });
    expect(() => requireRole(session, ['Receptionist', 'Manager'])).not.toThrow();
  });

  it('throws AuthError(401) when userId is missing (unauthenticated)', () => {
    const session = makeSession({ userId: undefined } as Partial<SessionData>);
    // Force userId to be missing
    (session as unknown as Record<string, unknown>).userId = undefined;
    expect(() => requireRole(session, ['Guest'])).toThrow(AuthError);
    try {
      requireRole(session, ['Guest']);
    } catch (err) {
      expect((err as AuthError).status).toBe(401);
    }
  });

  it('throws AuthError(403) when the role is not in the allowed list', () => {
    const session = makeSession({ role: 'Guest' });
    expect(() => requireRole(session, ['Receptionist', 'Manager', 'Admin'])).toThrow(AuthError);
    try {
      requireRole(session, ['Receptionist']);
    } catch (err) {
      expect((err as AuthError).status).toBe(403);
    }
  });

  it('allows Admin when Admin is in the list', () => {
    const session = makeSession({ role: 'Admin' });
    expect(() => requireRole(session, ['Manager', 'Admin'])).not.toThrow();
  });

  it('allows all roles when all are in the allowed list', () => {
    for (const role of ['Guest', 'Receptionist', 'Manager', 'Admin'] as const) {
      const session = makeSession({ role });
      expect(() =>
        requireRole(session, ['Guest', 'Receptionist', 'Manager', 'Admin'])
      ).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// requireBranchScope
// ---------------------------------------------------------------------------

describe('requireBranchScope', () => {
  it('does not throw for Receptionist accessing their own branch', () => {
    const session = makeSession({ role: 'Receptionist', branchId: 1 }) as IronSession<SessionData> & SessionData;
    expect(() => requireBranchScope(session, 1)).not.toThrow();
  });

  it('throws AuthError(403) for Receptionist accessing a different branch', () => {
    const session = makeSession({ role: 'Receptionist', branchId: 1 }) as IronSession<SessionData> & SessionData;
    expect(() => requireBranchScope(session, 2)).toThrow(AuthError);
    try {
      requireBranchScope(session, 2);
    } catch (err) {
      expect((err as AuthError).status).toBe(403);
    }
  });

  it('does not throw for Manager accessing any branch', () => {
    const session = makeSession({ role: 'Manager', branchId: 1 }) as IronSession<SessionData> & SessionData;
    expect(() => requireBranchScope(session, 2)).not.toThrow();
    expect(() => requireBranchScope(session, 3)).not.toThrow();
  });

  it('does not throw for Admin accessing any branch', () => {
    const session = makeSession({ role: 'Admin', branchId: undefined }) as IronSession<SessionData> & SessionData;
    expect(() => requireBranchScope(session, 1)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// authErrorResponse
// ---------------------------------------------------------------------------

describe('authErrorResponse', () => {
  it('returns a 401 Response for AuthError(401)', async () => {
    const err = new AuthError(401, 'Not authenticated');
    const response = authErrorResponse(err);
    expect(response.status).toBe(401);
    const body = await response.json() as { error: { code: string; message: string } };
    expect(body.error.code).toBe('NOT_AUTHENTICATED');
    expect(body.error.message).toBe('Not authenticated');
  });

  it('returns a 403 Response for AuthError(403)', async () => {
    const err = new AuthError(403, 'Insufficient role');
    const response = authErrorResponse(err);
    expect(response.status).toBe(403);
    const body = await response.json() as { error: { code: string; message: string } };
    expect(body.error.code).toBe('INSUFFICIENT_ROLE');
  });
});

// ---------------------------------------------------------------------------
// AuthError class
// ---------------------------------------------------------------------------

describe('AuthError', () => {
  it('extends Error and has correct name and status', () => {
    const err = new AuthError(403, 'test message');
    expect(err instanceof Error).toBe(true);
    expect(err.name).toBe('AuthError');
    expect(err.status).toBe(403);
    expect(err.message).toBe('test message');
  });
});
