import { describe, it, expect, vi, beforeEach } from 'vitest';
import { branchRepository } from './branch.repository';
import { pool } from '@/lib/db/pool';

vi.mock('@/lib/db/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

describe('branchRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listBranches', () => {
    it('returns all branches ordered by branch_id', async () => {
      const mockRows = [
        { branch_id: '1', location_name: 'Colombo' },
        { branch_id: '2', location_name: 'Kandy' },
        { branch_id: '3', location_name: 'Galle' },
      ];
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: mockRows } as never);

      const result = await branchRepository.listBranches();

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT branch_id, location_name'));
      expect(result).toEqual([
        { branch_id: 1, location_name: 'Colombo' },
        { branch_id: 2, location_name: 'Kandy' },
        { branch_id: 3, location_name: 'Galle' },
      ]);
    });
  });

  describe('findBranchById', () => {
    it('returns branch when found', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [{ branch_id: '2', location_name: 'Kandy' }],
      } as never);

      const result = await branchRepository.findBranchById(2);

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE branch_id = $1'), [2]);
      expect(result).toEqual({ branch_id: 2, location_name: 'Kandy' });
    });

    it('returns null when branch does not exist', async () => {
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as never);

      const result = await branchRepository.findBranchById(99);

      expect(result).toBeNull();
    });
  });
});
