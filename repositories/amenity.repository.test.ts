import { describe, it, expect, vi, beforeEach } from 'vitest';
import { amenityRepository } from './amenity.repository';
import { pool } from '@/lib/db/pool';

vi.mock('@/lib/db/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

describe('amenityRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listAmenities', () => {
    it('returns all amenities mapped with numeric IDs', async () => {
      const mockRows = [
        { amenity_id: '1', amenity_name: 'Wi-Fi' },
        { amenity_id: '2', amenity_name: 'Air Conditioning' },
        { amenity_id: '3', amenity_name: 'Mini Bar' },
      ];
      vi.mocked(pool.query).mockResolvedValueOnce({ rows: mockRows } as never);

      const result = await amenityRepository.listAmenities();

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT amenity_id, amenity_name'));
      expect(result).toEqual([
        { amenity_id: 1, amenity_name: 'Wi-Fi' },
        { amenity_id: 2, amenity_name: 'Air Conditioning' },
        { amenity_id: 3, amenity_name: 'Mini Bar' },
      ]);
    });
  });
});
