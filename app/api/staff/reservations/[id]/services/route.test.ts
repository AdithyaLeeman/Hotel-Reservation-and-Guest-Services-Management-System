/* eslint-disable @typescript-eslint/no-explicit-any */
﻿/**
 * Unit tests for POST /api/staff/reservations/[id]/services
 *
 * Strategy: mock serviceUsageService; verify route-level auth, validation,
 * happy-path 201, and all error-code mappings.
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T13 (Mock-First)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

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
      logUsage: vi.fn(),
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
const RESERVATION_ID = 'res-mock-001';

function makeParams(id = RESERVATION_ID) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: unknown) {
  return new NextRequest(
    `http://localhost/api/staff/reservations/${RESERVATION_ID}/services`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

const VALID_BODY = {
  service_id: 1,
  quantity:   2,
  usage_date: '2026-09-28',
  channel:    'FrontDesk',
};

const MOCK_USAGE = {
  usage_id:      'usage-mock-001',
  reservation_id: RESERVATION_ID,
  service_id:    1,
  quantity:      2,
  usage_date:    '2026-09-28',
  charged_price: 1500,
  channel:       'FrontDesk',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/staff/reservations/[id]/services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy path
  it('returns 201 with service usage on success', async () => {
    vi.mocked(serviceUsageService.logUsage).mockResolvedValueOnce(MOCK_USAGE as any);

    const res = await POST(makeRequest(VALID_BODY), makeParams());
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toMatchObject({ usage_id: 'usage-mock-001' });
    expect(json.meta.requestId).toBeDefined();
    expect(serviceUsageService.logUsage).toHaveBeenCalledOnce();
  });

  // Validation — missing service_id
  it('returns 400 when service_id is missing', async () => {
    const res = await POST(makeRequest({ quantity: 2, usage_date: '2026-09-28' }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.fields).toHaveProperty('service_id');
  });

  // Validation — quantity < 1
  it('returns 400 when quantity is less than 1', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, quantity: 0 }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.fields).toHaveProperty('quantity');
  });

  // Validation — bad date format
  it('returns 400 when usage_date is not YYYY-MM-DD', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, usage_date: '28-09-2026' }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.fields).toHaveProperty('usage_date');
  });

  // Validation — non-JSON body
  it('returns 400 when body is not valid JSON', async () => {
    const req = new NextRequest(
      `http://localhost/api/staff/reservations/${RESERVATION_ID}/services`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'not-json' }
    );
    const res = await POST(req, makeParams());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  // Service error — NOT_FOUND
  it('returns 404 when service is not found', async () => {
    vi.mocked(serviceUsageService.logUsage).mockRejectedValueOnce(
      new ServiceUsageServiceError('NOT_FOUND', 'Service ID 99 not found.')
    );

    const res = await POST(makeRequest(VALID_BODY), makeParams());
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  // Service error — NOT_CHECKED_IN
  it('returns 409 when reservation is not checked in', async () => {
    vi.mocked(serviceUsageService.logUsage).mockRejectedValueOnce(
      new ServiceUsageServiceError('NOT_CHECKED_IN', 'Reservation is not checked in.')
    );

    const res = await POST(makeRequest(VALID_BODY), makeParams());
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  // Service error — SERVICE_INACTIVE
  it('returns 422 when service is inactive', async () => {
    vi.mocked(serviceUsageService.logUsage).mockRejectedValueOnce(
      new ServiceUsageServiceError('SERVICE_INACTIVE', 'Service is currently inactive.')
    );

    const res = await POST(makeRequest(VALID_BODY), makeParams());
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  // Service error — INVALID_QUANTITY
  it('returns 422 when quantity is invalid per service rules', async () => {
    vi.mocked(serviceUsageService.logUsage).mockRejectedValueOnce(
      new ServiceUsageServiceError('INVALID_QUANTITY', 'Quantity must be at least 1.')
    );

    const res = await POST(makeRequest(VALID_BODY), makeParams());

    expect(res.status).toBe(422);
  });

  // Unexpected error
  it('returns 500 on unexpected error', async () => {
    vi.mocked(serviceUsageService.logUsage).mockRejectedValueOnce(
      new Error('Database connection lost')
    );

    const res = await POST(makeRequest(VALID_BODY), makeParams());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });

  // Default channel
  it('defaults channel to FrontDesk when not provided', async () => {
    vi.mocked(serviceUsageService.logUsage).mockResolvedValueOnce(MOCK_USAGE as any);

    const bodyWithoutChannel = { service_id: 1, quantity: 1, usage_date: '2026-09-28' };
    await POST(makeRequest(bodyWithoutChannel), makeParams());

    expect(serviceUsageService.logUsage).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'FrontDesk' }),
      expect.any(Number)
    );
  });
});