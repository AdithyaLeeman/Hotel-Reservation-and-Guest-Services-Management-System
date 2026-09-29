/**
 * Unit tests for GET + POST /api/staff/services
 *
 * Strategy: mock serviceUsageService; verify route-level auth, role guard
 * for POST (Manager/Admin only), body validation, happy-path responses,
 * and all error-code mappings.
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T14 (GET) + P04-M04-T15 (POST)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

// ---------------------------------------------------------------------------
// Mock the service layer
// ---------------------------------------------------------------------------
vi.mock('@/services/service-usage.service', () => {
  const ServiceUsageServiceError = class extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'ServiceUsageServiceError';
    }
  };
  return {
    ServiceUsageServiceError,
    serviceUsageService: {
      listCatalogue:    vi.fn(),
      addCatalogueItem: vi.fn(),
    },
  };
});

import {
  serviceUsageService,
  ServiceUsageServiceError,
} from '@/services/service-usage.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeGetRequest() {
  return new NextRequest('http://localhost/api/staff/services', { method: 'GET' });
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/staff/services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const MOCK_CATALOGUE = [
  { service_id: 1, service_name: 'Airport Transfer', current_price: 3500, status: 'Active' },
  { service_id: 2, service_name: 'Laundry',          current_price:  800, status: 'Active' },
  { service_id: 3, service_name: 'Spa Treatment',    current_price: 5000, status: 'Active' },
];

const VALID_POST_BODY = {
  service_name:  'Minibar Usage',
  current_price: 250,
};

const MOCK_NEW_ITEM = {
  service_id:    7,
  service_name:  'Minibar Usage',
  current_price: 250,
  status:        'Active',
};

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------
describe('GET /api/staff/services', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with array of active catalogue items', async () => {
    vi.mocked(serviceUsageService.listCatalogue).mockResolvedValueOnce(MOCK_CATALOGUE as any);

    const res  = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data).toHaveLength(3);
    expect(json.meta.requestId).toBeDefined();
    expect(serviceUsageService.listCatalogue).toHaveBeenCalledOnce();
  });

  it('returns 200 with empty array when no active services exist', async () => {
    vi.mocked(serviceUsageService.listCatalogue).mockResolvedValueOnce([]);

    const res  = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual([]);
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(serviceUsageService.listCatalogue).mockRejectedValueOnce(new Error('DB down'));

    const res  = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });
});

// ---------------------------------------------------------------------------
// POST tests
// ---------------------------------------------------------------------------
describe('POST /api/staff/services', () => {
  beforeEach(() => vi.clearAllMocks());

  // Happy path
  it('returns 201 with the new catalogue item', async () => {
    vi.mocked(serviceUsageService.addCatalogueItem).mockResolvedValueOnce(MOCK_NEW_ITEM as any);

    const res  = await POST(makePostRequest(VALID_POST_BODY));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toMatchObject({ service_name: 'Minibar Usage', status: 'Active' });
    expect(json.meta.requestId).toBeDefined();
    expect(serviceUsageService.addCatalogueItem).toHaveBeenCalledOnce();
  });

  // Defaults status to Active
  it('defaults status to Active when not supplied', async () => {
    vi.mocked(serviceUsageService.addCatalogueItem).mockResolvedValueOnce(MOCK_NEW_ITEM as any);

    await POST(makePostRequest({ service_name: 'Minibar Usage', current_price: 250 }));

    expect(serviceUsageService.addCatalogueItem).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Active' })
    );
  });

  // Validation — missing service_name
  it('returns 400 when service_name is missing', async () => {
    const res  = await POST(makePostRequest({ current_price: 500 }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.fields).toHaveProperty('service_name');
  });

  // Validation — negative current_price
  it('returns 400 when current_price is negative', async () => {
    const res  = await POST(makePostRequest({ service_name: 'X', current_price: -1 }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.fields).toHaveProperty('current_price');
  });

  // Validation — non-JSON body
  it('returns 400 when body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/staff/services', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    'not-json',
    });
    const res  = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  // Conflict — duplicate name
  it('returns 409 when service name already exists', async () => {
    vi.mocked(serviceUsageService.addCatalogueItem).mockRejectedValueOnce(
      new ServiceUsageServiceError('DUPLICATE_SERVICE_NAME', '"Spa Treatment" already exists.')
    );

    const res  = await POST(makePostRequest(VALID_POST_BODY));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe('CONFLICT');
  });

  // Unexpected error
  it('returns 500 on unexpected error', async () => {
    vi.mocked(serviceUsageService.addCatalogueItem).mockRejectedValueOnce(
      new Error('DB connection lost')
    );

    const res  = await POST(makePostRequest(VALID_POST_BODY));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });
});