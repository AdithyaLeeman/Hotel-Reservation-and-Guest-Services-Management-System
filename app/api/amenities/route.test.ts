import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { amenityRepository } from '@/repositories/amenity.repository';

vi.mock('@/repositories/amenity.repository', () => ({
  amenityRepository: {
    listAmenities: vi.fn(),
  },
}));

describe('GET /api/amenities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with list of amenities', async () => {
    const mockAmenities = [
      { amenity_id: 1, amenity_name: 'Wi-Fi' },
      { amenity_id: 2, amenity_name: 'Air Conditioning' },
    ];
    vi.mocked(amenityRepository.listAmenities).mockResolvedValueOnce(mockAmenities);

    const response = await GET();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data).toEqual(mockAmenities);
    expect(json.meta.requestId).toBeDefined();
  });

  it('returns 500 when repository throws an error', async () => {
    vi.mocked(amenityRepository.listAmenities).mockRejectedValueOnce(new Error('DB failure'));

    const response = await GET();
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json.error.code).toBe('INTERNAL_ERROR');
    expect(json.error.message).toBe('Failed to fetch amenities');
  });
});
