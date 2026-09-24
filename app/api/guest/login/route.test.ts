import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { authService, AuthServiceError } from '@/services/auth.service';
import * as sessionModule from '@/lib/auth/session';

vi.mock('@/services/auth.service', () => {
  class MockAuthServiceError extends Error {
    constructor(public readonly code: string, message: string) {
      super(message);
      this.name = 'AuthServiceError';
    }
  }
  return {
    authService: {
      loginGuest: vi.fn(),
    },
    AuthServiceError: MockAuthServiceError,
  };
});

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

describe('POST /api/guest/login', () => {
  const mockSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
      save: mockSave,
    } as any);
  });

  it('returns 200 and saves session on valid credentials', async () => {
    vi.mocked(authService.loginGuest).mockResolvedValueOnce({
      userId: 'user-123',
      role: 'Guest',
      guestId: 'guest-123',
    });

    const req = new Request('http://localhost:3000/api/guest/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'johndoe',
        password: 'Password123!',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual({
      userId: 'user-123',
      role: 'Guest',
      guestId: 'guest-123',
    });
    expect(json.meta.requestId).toBeDefined();
    expect(mockSave).toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost:3000/api/guest/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toBe('Invalid JSON body');
  });

  it('returns 400 when username or password is missing', async () => {
    const req = new Request('http://localhost:3000/api/guest/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '' }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.fields).toBeDefined();
  });

  it('returns 401 on INVALID_CREDENTIALS error from authService', async () => {
    vi.mocked(authService.loginGuest).mockRejectedValueOnce(
      new AuthServiceError('INVALID_CREDENTIALS', 'Invalid username or password')
    );

    const req = new Request('http://localhost:3000/api/guest/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'johndoe',
        password: 'WrongPassword',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('NOT_AUTHENTICATED');
    expect(json.error.message).toBe('Invalid username or password');
  });

  it('returns 403 on ACCOUNT_INACTIVE error from authService', async () => {
    vi.mocked(authService.loginGuest).mockRejectedValueOnce(
      new AuthServiceError('ACCOUNT_INACTIVE', 'Account is deactivated')
    );

    const req = new Request('http://localhost:3000/api/guest/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'inactiveuser',
        password: 'Password123!',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe('INSUFFICIENT_ROLE');
    expect(json.error.message).toBe('Account is deactivated');
  });

  it('returns 500 on unexpected service error', async () => {
    vi.mocked(authService.loginGuest).mockRejectedValueOnce(new Error('Unexpected error'));

    const req = new Request('http://localhost:3000/api/guest/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'johndoe',
        password: 'Password123!',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_ERROR');
    expect(json.error.message).toBe('Login failed');
  });
});
