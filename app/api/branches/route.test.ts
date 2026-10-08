import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { branchRepository } from '@/repositories/branch.repository';

vi.mock('@/repositories/branch.repository', () => ({
  branchRepository: {
    listBranches: vi.fn(),
  },
}));

describe('GET /api/branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with list of branches', async () => {
    const mockBranches = [
      { branch_id: 1, location_name: 'Colombo' },
      { branch_id: 2, location_name: 'Kandy' },
      { branch_id: 3, location_name: 'Galle' },
    ];
    vi.mocked(branchRepository.listBranches).mockResolvedValueOnce(mockBranches);

    const response = await GET();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data).toEqual(mockBranches);
    expect(json.meta.requestId).toBeDefined();
  });

  it('returns 500 when repository throws an error', async () => {
    vi.mocked(branchRepository.listBranches).mockRejectedValueOnce(new Error('DB failure'));

    const response = await GET();
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json.error.code).toBe('INTERNAL_ERROR');
    expect(json.error.message).toBe('Failed to fetch branches');
  });
});
