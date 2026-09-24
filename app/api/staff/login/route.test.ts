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
      loginStaff: vi.fn(),
    },
    AuthServiceError: MockAuthServiceError,
  };
});

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

describe('POST /api/staff/login', () => {
  const mockSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
      save: mockSave,
    } as any);
  });

  it('returns 200 and saves session with branchId for Receptionist', async () => {
    vi.mocked(authService.loginStaff).mockResolvedValueOnce({
      userId: 'user-staff-1',
      role: 'Receptionist',
      employeeId: 1,
      branchId: 1,
    });

    const req = new Request('http://localhost:3000/api/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'receptionist1',
        password: 'Password123!',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual({
      userId: 'user-staff-1',
      role: 'Receptionist',
      employeeId: 1,
      branchId: 1,
    });
    expect(json.meta.requestId).toBeDefined();
    expect(mockSave).toHaveBeenCalled();
  });

  it('returns 200 and saves session without branchId for Manager', async () => {
    vi.mocked(authService.loginStaff).mockResolvedValueOnce({
      userId: 'user-mgr-1',
      role: 'Manager',
      employeeId: 2,
      branchId: undefined,
    });

    const req = new Request('http://localhost:3000/api/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'manager1',
        password: 'Password123!',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual({
      userId: 'user-mgr-1',
      role: 'Manager',
      employeeId: 2,
    });
    expect(mockSave).toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost:3000/api/staff/login', {
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
    const req = new Request('http://localhost:3000/api/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'staff1' }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.fields).toBeDefined();
  });

  it('returns 401 on INVALID_CREDENTIALS error from authService', async () => {
    vi.mocked(authService.loginStaff).mockRejectedValueOnce(
      new AuthServiceError('INVALID_CREDENTIALS', 'Invalid username or password')
    );

    const req = new Request('http://localhost:3000/api/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'staff1',
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
    vi.mocked(authService.loginStaff).mockRejectedValueOnce(
      new AuthServiceError('ACCOUNT_INACTIVE', 'Account is deactivated')
    );

    const req = new Request('http://localhost:3000/api/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'inactivestaff',
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
    vi.mocked(authService.loginStaff).mockRejectedValueOnce(new Error('Unexpected error'));

    const req = new Request('http://localhost:3000/api/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'staff1',
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
