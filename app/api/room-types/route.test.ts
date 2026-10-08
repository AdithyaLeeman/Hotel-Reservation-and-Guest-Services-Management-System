import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { roomRepository } from '@/repositories/room.repository';

describe('GET /api/room-types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with room types list', async () => {
    vi.spyOn(roomRepository, 'listRoomTypes').mockResolvedValueOnce([
      { type_id: 1, type_name: 'Single', capacity: 1, daily_rate: '5000.00' },
      { type_id: 2, type_name: 'Double', capacity: 2, daily_rate: '8000.00' },
      { type_id: 3, type_name: 'Suite', capacity: 4, daily_rate: '15000.00' },
    ]);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(3);
    expect(json.data[0].type_name).toBe('Single');
    expect(json.meta.requestId).toBeDefined();
  });

  it('returns 500 when repository throws an error', async () => {
    vi.spyOn(roomRepository, 'listRoomTypes').mockRejectedValueOnce(new Error('DB failure'));

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });
});
