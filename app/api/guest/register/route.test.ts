import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { authService } from '@/services/auth.service';
import * as sessionModule from '@/lib/auth/session';

vi.mock('@/services/auth.service', () => ({
  authService: {
    registerGuest: vi.fn(),
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

describe('POST /api/guest/register', () => {
  const mockSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
      save: mockSave,
    } as any);
  });

  it('returns 201 and sets session on successful registration', async () => {
    const mockUser = {
      user_id: 'user-123',
      username: 'johndoe',
      role: 'Guest' as const,
      status: 'Active' as const,
      created_at: new Date(),
    };
    const mockGuest = {
      guest_id: 'guest-123',
      user_id: 'user-123',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+94771234567',
      identification: '123456789V',
      created_at: new Date(),
    };

    vi.mocked(authService.registerGuest).mockResolvedValueOnce({
      user: mockUser,
      guest: mockGuest,
    });

    const req = new Request('http://localhost:3000/api/guest/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'johndoe',
        password: 'Password123!',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+94771234567',
        identification: '123456789V',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toEqual({
      userId: 'user-123',
      guestId: 'guest-123',
      username: 'johndoe',
      fullName: 'John Doe',
      email: 'john@example.com',
    });
    expect(json.meta.requestId).toBeDefined();
    expect(mockSave).toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost:3000/api/guest/register', {
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

  it('returns 400 for Zod validation failure', async () => {
    const req = new Request('http://localhost:3000/api/guest/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'short',
        password: '123', // too short
        email: 'not-an-email',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.fields).toBeDefined();
  });

  it('returns 409 Conflict on SQLSTATE 23505 (duplicate username/email)', async () => {
    const sqlError = new Error('duplicate key value violates unique constraint');
    (sqlError as any).code = '23505';

    vi.mocked(authService.registerGuest).mockRejectedValueOnce(sqlError);

    const req = new Request('http://localhost:3000/api/guest/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'existinguser',
        password: 'Password123!',
        full_name: 'John Doe',
        email: 'existing@example.com',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe('CONFLICT');
  });

  it('returns 500 on unexpected service error', async () => {
    vi.mocked(authService.registerGuest).mockRejectedValueOnce(new Error('DB failure'));

    const req = new Request('http://localhost:3000/api/guest/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'johndoe',
        password: 'Password123!',
        full_name: 'John Doe',
        email: 'john@example.com',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });
});
