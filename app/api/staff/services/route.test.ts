/**
 * Unit tests for GET /api/staff/services
 *
 * Strategy: mock serviceUsageService; verify route-level auth, happy-path 200,
 * empty-catalogue case, and unexpected error mapping.
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T14 (Mock-First)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// ---------------------------------------------------------------------------
// Mock the service layer
// ---------------------------------------------------------------------------
vi.mock('@/services/service-usage.service', () => ({
  serviceUsageService: {
    listCatalogue: vi.fn(),
  },
}));

import { serviceUsageService } from '@/services/service-usage.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest() {
  return new NextRequest('http://localhost/api/staff/services', { method: 'GET' });
}

const MOCK_CATALOGUE = [
  { service_id: 1, service_name: 'Airport Transfer', current_price: 3500, status: 'Active' },
  { service_id: 2, service_name: 'Laundry',          current_price:  800, status: 'Active' },
  { service_id: 3, service_name: 'Minibar Usage',    current_price:  250, status: 'Active' },
  { service_id: 4, service_name: 'Room Service',     current_price: 1200, status: 'Active' },
  { service_id: 5, service_name: 'Spa Treatment',    current_price: 5000, status: 'Active' },
  { service_id: 6, service_name: 'Late Checkout',    current_price:    0, status: 'Active' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/staff/services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy path — full catalogue
  it('returns 200 with array of active catalogue items', async () => {
    vi.mocked(serviceUsageService.listCatalogue).mockResolvedValueOnce(MOCK_CATALOGUE as any);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data).toHaveLength(6);
    expect(json.data[0]).toMatchObject({ service_name: 'Airport Transfer' });
    expect(json.meta.requestId).toBeDefined();
    expect(serviceUsageService.listCatalogue).toHaveBeenCalledOnce();
  });

  // Empty catalogue
  it('returns 200 with empty array when no active services exist', async () => {
    vi.mocked(serviceUsageService.listCatalogue).mockResolvedValueOnce([]);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual([]);
  });

  // Unexpected error
  it('returns 500 on unexpected error', async () => {
    vi.mocked(serviceUsageService.listCatalogue).mockRejectedValueOnce(
      new Error('DB connection lost')
    );

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });
});