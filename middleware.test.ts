import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { getIronSession } from 'iron-session';

vi.mock('iron-session', () => ({
  getIronSession: vi.fn(),
  nextProxyCookies: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  sessionOptions: {},
}));

describe('Middleware route protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Public paths', () => {
    it.each([
      'http://localhost:3000/',
      'http://localhost:3000/search',
      'http://localhost:3000/search/rooms',
      'http://localhost:3000/guest/login',
      'http://localhost:3000/guest/register',
      'http://localhost:3000/staff/login',
    ])('allows public path: %s without session check', async (url) => {
      const req = new NextRequest(url);
      const res = await middleware(req);

      expect(getIronSession).not.toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('allows paths not matching any role rules (e.g., custom unmatched path)', async () => {
      const req = new NextRequest('http://localhost:3000/public-info');
      const res = await middleware(req);

      expect(getIronSession).not.toHaveBeenCalled();
      expect(res.status).toBe(200);
    });
  });

  describe('Protected /guest/* routes', () => {
    it('redirects unauthenticated guest to /guest/login', async () => {
      vi.mocked(getIronSession).mockResolvedValueOnce({} as any);

      const req = new NextRequest('http://localhost:3000/guest/reservations');
      const res = await middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/guest/login');
    });

    it('redirects staff user on /guest/* to /guest/login', async () => {
      vi.mocked(getIronSession).mockResolvedValueOnce({
        userId: 'staff-1',
        role: 'Receptionist',
      } as any);

      const req = new NextRequest('http://localhost:3000/guest/reservations');
      const res = await middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/guest/login');
    });

    it('allows Guest user to access /guest/reservations', async () => {
      vi.mocked(getIronSession).mockResolvedValueOnce({
        userId: 'guest-1',
        role: 'Guest',
        guestId: 'guest-uuid-1',
      } as any);

      const req = new NextRequest('http://localhost:3000/guest/reservations');
      const res = await middleware(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });
  });

  describe('Protected /staff/* routes', () => {
    it('redirects unauthenticated staff to /staff/login', async () => {
      vi.mocked(getIronSession).mockResolvedValueOnce({} as any);

      const req = new NextRequest('http://localhost:3000/staff/dashboard');
      const res = await middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/staff/login');
    });

    it('redirects Guest user on /staff/dashboard to /staff/login', async () => {
      vi.mocked(getIronSession).mockResolvedValueOnce({
        userId: 'guest-1',
        role: 'Guest',
      } as any);

      const req = new NextRequest('http://localhost:3000/staff/dashboard');
      const res = await middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/staff/login');
    });

    it('allows Receptionist to access /staff/dashboard', async () => {
      vi.mocked(getIronSession).mockResolvedValueOnce({
        userId: 'staff-1',
        role: 'Receptionist',
        branchId: 1,
      } as any);

      const req = new NextRequest('http://localhost:3000/staff/dashboard');
      const res = await middleware(req);

      expect(res.status).toBe(200);
    });

    it('redirects Receptionist trying to access /staff/reports/ to /staff/login', async () => {
      vi.mocked(getIronSession).mockResolvedValueOnce({
        userId: 'staff-1',
        role: 'Receptionist',
        branchId: 1,
      } as any);

      const req = new NextRequest('http://localhost:3000/staff/reports/occupancy');
      const res = await middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/staff/login');
    });

    it('allows Manager to access /staff/reports/occupancy', async () => {
      vi.mocked(getIronSession).mockResolvedValueOnce({
        userId: 'mgr-1',
        role: 'Manager',
      } as any);

      const req = new NextRequest('http://localhost:3000/staff/reports/occupancy');
      const res = await middleware(req);

      expect(res.status).toBe(200);
    });

    it('allows Admin to access /staff/admin/users', async () => {
      vi.mocked(getIronSession).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'Admin',
      } as any);

      const req = new NextRequest('http://localhost:3000/staff/admin/users');
      const res = await middleware(req);

      expect(res.status).toBe(200);
    });
  });

  describe('Session errors', () => {
    it('handles session decryption error by redirecting to login', async () => {
      vi.mocked(getIronSession).mockRejectedValueOnce(new Error('Corrupted cookie'));

      const req = new NextRequest('http://localhost:3000/staff/rooms');
      const res = await middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/staff/login');
    });
  });
});
