import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
import { roomRepository } from '@/repositories/room.repository';
import * as sessionModule from '@/lib/auth/session';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

describe('GET and PATCH /api/staff/rooms/[id]', () => {
  beforeEach(() => {
    roomRepository._resetMockStore();
    vi.clearAllMocks();
  });

  describe('GET /api/staff/rooms/[id]', () => {
    it('returns room details for staff member within branch', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-1',
        role: 'Receptionist',
        branchId: 1,
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms/1');
      const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.room_id).toBe(1);
      expect(json.data.branch_id).toBe(1);
      expect(json.data.room_type).toBeDefined();
    });

    it('returns 403 if Receptionist accesses room in another branch', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-1',
        role: 'Receptionist',
        branchId: 1,
      } as any);

      // Room 6 is in branch 2 (Kandy)
      const req = new NextRequest('http://localhost:3000/api/staff/rooms/6');
      const res = await GET(req, { params: Promise.resolve({ id: '6' }) });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('BRANCH_SCOPE_VIOLATION');
    });

    it('returns 404 if room does not exist', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-1',
        role: 'Manager',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms/999');
      const res = await GET(req, { params: Promise.resolve({ id: '999' }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/staff/rooms/[id]', () => {
    it('allows Receptionist to update room status to Occupied', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-1',
        role: 'Receptionist',
        branchId: 1,
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms/1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Occupied' }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.status).toBe('Occupied');
    });

    it('forbids Receptionist from setting status to Maintenance (BR-16)', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-1',
        role: 'Receptionist',
        branchId: 1,
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms/1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Maintenance' }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('INSUFFICIENT_ROLE');
    });

    it('allows Manager to set status to Maintenance', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-1',
        role: 'Manager',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms/1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Maintenance' }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.status).toBe('Maintenance');
    });

    it('returns 403 if Receptionist tries to update a room in another branch', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'staff-1',
        role: 'Receptionist',
        branchId: 1,
      } as any);

      // Room 6 is in branch 2
      const req = new NextRequest('http://localhost:3000/api/staff/rooms/6', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Available' }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: '6' }) });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('BRANCH_SCOPE_VIOLATION');
    });

    it('returns 400 for invalid status value', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
        userId: 'mgr-1',
        role: 'Manager',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/staff/rooms/1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'UnknownStatus' }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
