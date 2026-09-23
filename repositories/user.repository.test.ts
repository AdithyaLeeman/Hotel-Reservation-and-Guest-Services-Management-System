import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QueryResult } from 'pg';
import { userRepository } from './user.repository';
import { pool, type PoolClient } from '@/lib/db/pool';

vi.mock('@/lib/db/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

// pg Pool.query has overloads where one resolves to `void`.
// Cast once here so mockResolvedValueOnce accepts QueryResult without errors.
const mockPoolQuery = pool.query as unknown as ReturnType<typeof vi.fn>;

describe('User Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('insertUserAccount', () => {
    it('executes INSERT query on the provided transaction client', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          rows: [
            {
              user_id: 'user-uuid-1',
              username: 'johndoe',
              role: 'Guest',
              status: 'Active',
            },
          ],
        }),
      } as unknown as PoolClient;

      const result = await userRepository.insertUserAccount(mockClient, {
        username: 'johndoe',
        password_hash: '$2a$12$hash...',
        role: 'Guest',
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_account'),
        ['johndoe', '$2a$12$hash...', 'Guest']
      );
      expect(result).toEqual({
        user_id: 'user-uuid-1',
        username: 'johndoe',
        role: 'Guest',
        status: 'Active',
      });
    });
  });

  describe('findByUsername', () => {
    it('returns user account including password_hash when found', async () => {
      const mockUser = {
        user_id: 'user-uuid-1',
        username: 'johndoe',
        role: 'Guest',
        status: 'Active',
        password_hash: '$2a$12$hash...',
      };

      mockPoolQuery.mockResolvedValueOnce({
        rows: [mockUser],
      } as unknown as QueryResult);

      const user = await userRepository.findByUsername('johndoe');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE username = $1'),
        ['johndoe']
      );
      expect(user).toEqual(mockUser);
    });

    it('returns null when user is not found', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
      } as unknown as QueryResult);

      const user = await userRepository.findByUsername('unknown');
      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns user account without password_hash when found', async () => {
      const mockUser = {
        user_id: 'user-uuid-1',
        username: 'johndoe',
        role: 'Guest',
        status: 'Active',
      };

      mockPoolQuery.mockResolvedValueOnce({
        rows: [mockUser],
      } as unknown as QueryResult);

      const user = await userRepository.findById('user-uuid-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-uuid-1']
      );
      expect(user).toEqual(mockUser);
    });

    it('returns null when user_id is not found', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
      } as unknown as QueryResult);

      const user = await userRepository.findById('non-existent');
      expect(user).toBeNull();
    });
  });

  describe('findStaffByUsername', () => {
    it('returns staff account with employee_id and branch_id when found', async () => {
      const mockStaff = {
        user_id: 'staff-uuid-1',
        username: 'receptionist1',
        role: 'Receptionist',
        status: 'Active',
        password_hash: '$2a$12$hash...',
        employee_id: 10,
        branch_id: 1,
      };

      mockPoolQuery.mockResolvedValueOnce({
        rows: [mockStaff],
      } as unknown as QueryResult);

      const staff = await userRepository.findStaffByUsername('receptionist1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN employee'),
        ['receptionist1']
      );
      expect(staff).toEqual(mockStaff);
    });

    it('returns null when staff username is not found', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
      } as unknown as QueryResult);

      const staff = await userRepository.findStaffByUsername('unknownstaff');
      expect(staff).toBeNull();
    });
  });
});
