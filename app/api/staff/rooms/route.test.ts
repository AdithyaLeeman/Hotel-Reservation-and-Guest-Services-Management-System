import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { roomRepository } from '@/repositories/room.repository';
import * as sessionModule from '@/lib/auth/session';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

describe('GET and POST /api/staff/rooms', () => {
  beforeEach(() => {
    roomRepository._resetMockStore();
    vi.clearAllMocks();
  });

  describe('GET /api/staff/rooms', () => {
    it('returns 401 if unauthenticated', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({} as any);

      // Set NODE_ENV to production temporarily to test unauthenticated rejection
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const req = new NextRequest('http://localhost:3000/api/staff/rooms');
      const res = await GET(req);
      const json = await res.json();

      process.env.NODE_ENV = originalEnv;

      expect(res.status).toBe(401);
      expect(json.error.code).toBe('NOT_AUTHENTICATED');
    });

    it('returns 403 if user has Guest role', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'guest-1',
        role: 'Guest',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('INSUFFICIENT_ROLE');
    });

    it('returns scoped rooms for Receptionist', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-1',
        role: 'Receptionist',
        branchId: 1,
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBe(5);
      expect(json.data.every((r: any) => r.branch_id === 1)).toBe(true);
      expect(json.meta.requestId).toBeDefined();
    });

    it('returns 403 if Receptionist tries to query a different branch', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-1',
        role: 'Receptionist',
        branchId: 1,
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms?branchId=2');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('BRANCH_SCOPE_VIOLATION');
    });

    it('allows Manager to view all rooms across branches', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-1',
        role: 'Manager',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBe(15);
    });

    it('allows filtering by status and typeId', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-1',
        role: 'Manager',
      } as any);

      const req = new NextRequest(
        'http://localhost:3000/api/staff/rooms?branchId=1&status=Maintenance'
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBe(1);
      expect(json.data[0].room_number).toBe('103');
    });

    it('returns 400 for invalid query parameters', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-1',
        role: 'Manager',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms?branchId=invalid');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/staff/rooms', () => {
    it('rejects Receptionist with 403', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-1',
        role: 'Receptionist',
        branchId: 1,
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms', {
        method: 'POST',
        body: JSON.stringify({
          room_number: '501',
          branch_id: 1,
          type_id: 1,
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('INSUFFICIENT_ROLE');
    });

    it('allows Manager to create a room', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-1',
        role: 'Manager',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms', {
        method: 'POST',
        body: JSON.stringify({
          room_number: '501',
          branch_id: 1,
          type_id: 1,
          status: 'Available',
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.room_number).toBe('501');
      expect(json.data.branch_id).toBe(1);
      expect(json.meta.requestId).toBeDefined();
    });

    it('returns 409 Conflict if room number already exists in branch', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-1',
        role: 'Manager',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms', {
        method: 'POST',
        body: JSON.stringify({
          room_number: '101', // already exists in branch 1
          branch_id: 1,
          type_id: 1,
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error.code).toBe('CONFLICT');
    });

    it('returns 400 if room type does not exist', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-1',
        role: 'Manager',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms', {
        method: 'POST',
        body: JSON.stringify({
          room_number: '601',
          branch_id: 1,
          type_id: 999,
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
