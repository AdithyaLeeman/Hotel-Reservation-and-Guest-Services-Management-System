/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
import { roomRepository } from '@/repositories/room.repository';
import * as sessionModule from '@/lib/auth/session';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock room repository - real repo now uses pg Pool (Phase 6 SP6.1).
// Route tests stay fast and DB-independent.
// ---------------------------------------------------------------------------
vi.mock('@/repositories/room.repository', () => {
  const ROOM_TYPES = [
    { type_id: 1, type_name: 'Single', capacity: 1, daily_rate: '10000.00' },
    { type_id: 2, type_name: 'Double', capacity: 2, daily_rate: '18000.00' },
    { type_id: 3, type_name: 'Suite',  capacity: 4, daily_rate: '35000.00' },
  ];

  const SEED_ROOMS = [
    { room_id: 1,  room_number: '101', branch_id: 1, type_id: 1, status: 'Available'   },
    { room_id: 2,  room_number: '102', branch_id: 1, type_id: 2, status: 'Available'   },
    { room_id: 3,  room_number: '103', branch_id: 1, type_id: 2, status: 'Maintenance' },
    { room_id: 4,  room_number: '201', branch_id: 1, type_id: 3, status: 'Occupied'    },
    { room_id: 5,  room_number: '202', branch_id: 1, type_id: 3, status: 'Available'   },
    { room_id: 6,  room_number: '101', branch_id: 2, type_id: 1, status: 'Available'   },
    { room_id: 7,  room_number: '102', branch_id: 2, type_id: 2, status: 'Available'   },
    { room_id: 8,  room_number: '103', branch_id: 2, type_id: 2, status: 'Available'   },
    { room_id: 9,  room_number: '201', branch_id: 2, type_id: 3, status: 'Available'   },
    { room_id: 10, room_number: '202', branch_id: 2, type_id: 3, status: 'Available'   },
    { room_id: 11, room_number: '101', branch_id: 3, type_id: 1, status: 'Available'   },
    { room_id: 12, room_number: '102', branch_id: 3, type_id: 2, status: 'Available'   },
    { room_id: 13, room_number: '103', branch_id: 3, type_id: 2, status: 'Maintenance' },
    { room_id: 14, room_number: '201', branch_id: 3, type_id: 3, status: 'Available'   },
    { room_id: 15, room_number: '202', branch_id: 3, type_id: 3, status: 'Occupied'    },
  ];

  let rooms = SEED_ROOMS.map(r => ({ ...r }));

  const reset = () => { rooms = SEED_ROOMS.map(r => ({ ...r })); };

  return {
    roomRepository: {
      findById: vi.fn(async (roomId: number) => {
        const found = rooms.find(r => r.room_id === roomId);
        if (!found) return null;
        const type = ROOM_TYPES.find(t => t.type_id === found.type_id);
        return { ...found, room_type: type ? { ...type } : undefined, amenities: [] };
      }),
      updateStatus: vi.fn(async (roomId: number, status: string) => {
        const idx = rooms.findIndex(r => r.room_id === roomId);
        if (idx === -1) throw new Error(`Room with ID ${roomId} not found`);
        rooms[idx] = { ...rooms[idx], status: status as any };
        return { ...rooms[idx] };
      }),
      listAll: vi.fn(async () => rooms.map(r => ({ ...r }))),
      listByBranch: vi.fn(async (branchId: number) => rooms.filter(r => r.branch_id === branchId).map(r => ({ ...r }))),
      listWithDetailsByBranch: vi.fn(async (branchId: number) =>
        rooms.filter(r => r.branch_id === branchId).map(r => ({
          ...r,
          room_type: ROOM_TYPES.find(t => t.type_id === r.type_id),
          amenities: [],
        }))
      ),
      insert: vi.fn(),
      findByBranchAndNumber: vi.fn(),
      listRoomTypes: vi.fn(async () => ROOM_TYPES.map(t => ({ ...t }))),
      findRoomTypeById: vi.fn(async (typeId: number) => ROOM_TYPES.find(t => t.type_id === typeId) ?? null),
      _resetMockStore: reset,
    },
  };
});

describe('GET and PATCH /api/staff/rooms/[id]', () => {
  beforeEach(() => {
    roomRepository._resetMockStore?.();
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
