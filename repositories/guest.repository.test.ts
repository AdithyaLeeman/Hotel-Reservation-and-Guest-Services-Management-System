import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QueryResult } from 'pg';
import { guestRepository } from './guest.repository';
import { pool, type PoolClient } from '@/lib/db/pool';

vi.mock('@/lib/db/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

// pg Pool.query has overloads where one resolves to `void`.
// Cast once here so mockResolvedValueOnce accepts QueryResult without errors.
const mockPoolQuery = pool.query as unknown as ReturnType<typeof vi.fn>;

describe('Guest Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('insertGuest', () => {
    it('executes INSERT query on client with provided values including optional nulls', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          rows: [
            {
              guest_id: 'guest-uuid-1',
              user_id: 'user-uuid-1',
              full_name: 'John Doe',
              email: 'john@example.com',
              phone: '+94771234567',
              identification: 'NIC123456',
            },
          ],
        }),
      } as unknown as PoolClient;

      const result = await guestRepository.insertGuest(mockClient, {
        user_id: 'user-uuid-1',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+94771234567',
        identification: 'NIC123456',
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO guest'),
        ['user-uuid-1', 'John Doe', 'john@example.com', '+94771234567', 'NIC123456']
      );
      expect(result.guest_id).toBe('guest-uuid-1');
    });

    it('passes null for optional phone and identification when omitted', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          rows: [
            {
              guest_id: 'guest-uuid-2',
              user_id: 'user-uuid-2',
              full_name: 'Jane Doe',
              email: 'jane@example.com',
              phone: null,
              identification: null,
            },
          ],
        }),
      } as unknown as PoolClient;

      await guestRepository.insertGuest(mockClient, {
        user_id: 'user-uuid-2',
        full_name: 'Jane Doe',
        email: 'jane@example.com',
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO guest'),
        ['user-uuid-2', 'Jane Doe', 'jane@example.com', null, null]
      );
    });
  });

  describe('findByUserId', () => {
    it('returns guest profile when found by user_id', async () => {
      const mockGuest = {
        guest_id: 'guest-uuid-1',
        user_id: 'user-uuid-1',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+94771234567',
        identification: 'NIC123456',
      };

      mockPoolQuery.mockResolvedValueOnce({
        rows: [mockGuest],
      } as unknown as QueryResult);

      const guest = await guestRepository.findByUserId('user-uuid-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-uuid-1']
      );
      expect(guest).toEqual(mockGuest);
    });

    it('returns null when user_id has no guest profile', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
      } as unknown as QueryResult);

      const guest = await guestRepository.findByUserId('unknown-user-id');
      expect(guest).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns guest profile when found by guest_id', async () => {
      const mockGuest = {
        guest_id: 'guest-uuid-1',
        user_id: 'user-uuid-1',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: null,
        identification: null,
      };

      mockPoolQuery.mockResolvedValueOnce({
        rows: [mockGuest],
      } as unknown as QueryResult);

      const guest = await guestRepository.findById('guest-uuid-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE guest_id = $1'),
        ['guest-uuid-1']
      );
      expect(guest).toEqual(mockGuest);
    });

    it('returns null when guest_id is not found', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
      } as unknown as QueryResult);

      const guest = await guestRepository.findById('unknown-guest-id');
      expect(guest).toBeNull();
    });
  });
});
