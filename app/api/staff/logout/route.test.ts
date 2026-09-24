import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import * as sessionModule from '@/lib/auth/session';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
  destroySession: vi.fn(),
}));

describe('POST /api/staff/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 and destroys session on staff logout', async () => {
    const mockSession = { userId: 'user-staff-1', role: 'Receptionist' };
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue(mockSession as any);
    vi.spyOn(sessionModule, 'destroySession').mockResolvedValue(undefined);

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual({ loggedOut: true });
    expect(json.meta.requestId).toBeDefined();
    expect(sessionModule.destroySession).toHaveBeenCalledWith(mockSession);
  });

  it('returns 500 on unexpected error', async () => {
    vi.spyOn(sessionModule, 'getSession').mockRejectedValueOnce(new Error('Session error'));

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_ERROR');
    expect(json.error.message).toBe('Logout failed');
  });
});
