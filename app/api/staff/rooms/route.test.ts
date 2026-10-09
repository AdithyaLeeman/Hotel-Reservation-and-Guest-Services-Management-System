/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
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
  let nextId = 16;

  const reset = () => {
    rooms = SEED_ROOMS.map(r => ({ ...r }));
    nextId = 16;
  };

  return {
    roomRepository: {
      listAll: vi.fn(async () => rooms.map(r => ({ ...r }))),
      listByBranch: vi.fn(async (branchId: number) =>
        rooms.filter(r => r.branch_id === branchId).map(r => ({ ...r }))
      ),
      listWithDetailsByBranch: vi.fn(async (branchId: number) =>
        rooms
          .filter(r => r.branch_id === branchId)
          .map(r => ({
            ...r,
            room_type: ROOM_TYPES.find(t => t.type_id === r.type_id),
            amenities: [],
          }))
      ),
      findById: vi.fn(async (roomId: number) => {
        const found = rooms.find(r => r.room_id === roomId);
        if (!found) return null;
        const type = ROOM_TYPES.find(t => t.type_id === found.type_id);
        return { ...found, room_type: type ? { ...type } : undefined, amenities: [] };
      }),
      findByBranchAndNumber: vi.fn(async (branchId: number, roomNumber: string) => {
        const found = rooms.find(r => r.branch_id === branchId && r.room_number === roomNumber);
        return found ? { ...found } : null;
      }),
      insert: vi.fn(async (input: { room_number: string; branch_id: number; type_id: number; status?: string }) => {
        const exists = rooms.some(r => r.branch_id === input.branch_id && r.room_number === input.room_number);
        if (exists) {
          throw new Error(`Room ${input.room_number} already exists in branch ${input.branch_id} (UNIQUE violation)`);
        }
        const typeExists = ROOM_TYPES.some(t => t.type_id === input.type_id);
        if (!typeExists) {
          throw new Error(`Room type with ID ${input.type_id} does not exist`);
        }
        const newRoom = {
          room_id: nextId++,
          room_number: input.room_number,
          branch_id: input.branch_id,
          type_id: input.type_id,
          status: (input.status ?? 'Available') as any,
        };
        rooms.push(newRoom);
        return { ...newRoom };
      }),
      updateStatus: vi.fn(async (roomId: number, status: string) => {
        const idx = rooms.findIndex(r => r.room_id === roomId);
        if (idx === -1) throw new Error(`Room with ID ${roomId} not found`);
        rooms[idx] = { ...rooms[idx], status: status as any };
        return { ...rooms[idx] };
      }),
      listRoomTypes: vi.fn(async () => ROOM_TYPES.map(t => ({ ...t }))),
      findRoomTypeById: vi.fn(async (typeId: number) => {
        const found = ROOM_TYPES.find(t => t.type_id === typeId);
        return found ? { ...found } : null;
      }),
      _resetMockStore: reset,
    },
  };
});

describe('GET and POST /api/staff/rooms', () => {
  beforeEach(() => {
    roomRepository._resetMockStore?.();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('GET /api/staff/rooms', () => {
    it('returns 401 if unauthenticated', async () => {
      vi.spyOn(sessionModule, 'getSession').mockResolvedValue({} as any);

      // Stub NODE_ENV to 'production' to test unauthenticated rejection
      vi.stubEnv('NODE_ENV', 'production');

      const req = new NextRequest('http://localhost:3000/api/staff/rooms');
      const res = await GET(req);
      const json = await res.json();

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
