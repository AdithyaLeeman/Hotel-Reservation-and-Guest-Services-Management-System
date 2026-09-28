/**
 * Tests: GET /api/staff/reports/top-services
 *
 * Covers:
 *   - 401 when unauthenticated (production mode, no session)
 *   - 403 for Guest role
 *   - 403 for Receptionist role (not allowed for reports)
 *   - 200 with full TopServiceRow[] for Manager
 *   - 200 with full TopServiceRow[] for Admin
 *   - Response shape: { data, meta: { requestId } }
 *   - Data is ordered by usage_rank ascending
 *   - Each row contains required vw_top_services fields
 *
 * Owned by: Member 3 (M3) | Task: P05-M03-T02
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { topServicesRepository } from '@/repositories/top-services.repository';
import * as sessionModule from '@/lib/auth/session';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

const BASE_URL = 'http://localhost:3000/api/staff/reports/top-services';

describe('GET /api/staff/reports/top-services', () => {
  beforeEach(() => {
    topServicesRepository._resetMockStore();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  it('returns 401 if unauthenticated (no session)', async () => {
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue({} as any);

    const originalEnv = process.env.NODE_ENV;
    // @ts-expect-error — TS2540: process.env.NODE_ENV is readonly in strict mode;
    // same suppression pattern used in app/api/staff/rooms/route.test.ts
    process.env.NODE_ENV = 'production';

    const req = new NextRequest(BASE_URL);
    const res = await GET(req);
    const json = await res.json();

    // @ts-expect-error — restore original value
    process.env.NODE_ENV = originalEnv;

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('NOT_AUTHENTICATED');
  });

  // -------------------------------------------------------------------------
  // RBAC — roles that must be rejected
  // -------------------------------------------------------------------------

  it('returns 403 if user has Guest role', async () => {
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
      userId: 'guest-uuid-1',
      role: 'Guest',
    } as any);

    const req = new NextRequest(BASE_URL);
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe('INSUFFICIENT_ROLE');
    expect(json.error.message).toContain('Manager or Admin');
  });

  it('returns 403 if user has Receptionist role', async () => {
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
      userId: 'staff-uuid-1',
      role: 'Receptionist',
      employeeId: 5,
      branchId: 2,
    } as any);

    const req = new NextRequest(BASE_URL);
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe('INSUFFICIENT_ROLE');
    expect(json.error.message).toContain('Manager or Admin');
  });

  // -------------------------------------------------------------------------
  // RBAC — roles that must succeed
  // -------------------------------------------------------------------------

  it('returns 200 with data for Manager role', async () => {
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
      userId: 'mgr-uuid-1',
      role: 'Manager',
      employeeId: 10,
    } as any);

    const req = new NextRequest(BASE_URL);
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(6);
  });

  it('returns 200 with data for Admin role', async () => {
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
      userId: 'admin-uuid-1',
      role: 'Admin',
      employeeId: 1,
    } as any);

    const req = new NextRequest(BASE_URL);
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(6);
  });

  // -------------------------------------------------------------------------
  // Response shape
  // -------------------------------------------------------------------------

  it('includes meta.requestId in success response', async () => {
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
      userId: 'mgr-uuid-1',
      role: 'Manager',
      employeeId: 10,
    } as any);

    const req = new NextRequest(BASE_URL);
    const res = await GET(req);
    const json = await res.json();

    expect(json.meta).toBeDefined();
    expect(typeof json.meta.requestId).toBe('string');
    expect(json.meta.requestId.length).toBeGreaterThan(0);
  });

  it('each row contains all required vw_top_services fields', async () => {
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
      userId: 'mgr-uuid-1',
      role: 'Manager',
      employeeId: 10,
    } as any);

    const req = new NextRequest(BASE_URL);
    const res = await GET(req);
    const json = await res.json();

    for (const row of json.data) {
      expect(typeof row.service_id).toBe('number');
      expect(typeof row.service_name).toBe('string');
      expect(typeof row.total_quantity).toBe('number');
      expect(typeof row.total_revenue).toBe('string');       // NUMERIC as string
      expect(typeof row.reservation_count).toBe('number');
      expect(typeof row.usage_rank).toBe('number');
    }
  });

  // -------------------------------------------------------------------------
  // Data ordering
  // -------------------------------------------------------------------------

  it('returns rows ordered by usage_rank ascending', async () => {
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
      userId: 'mgr-uuid-1',
      role: 'Manager',
      employeeId: 10,
    } as any);

    const req = new NextRequest(BASE_URL);
    const res = await GET(req);
    const json = await res.json();

    const ranks: number[] = json.data.map((r: { usage_rank: number }) => r.usage_rank);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]);
    }
  });

  it('first row has usage_rank 1 and highest total_quantity', async () => {
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
      userId: 'mgr-uuid-1',
      role: 'Manager',
      employeeId: 10,
    } as any);

    const req = new NextRequest(BASE_URL);
    const res = await GET(req);
    const json = await res.json();

    const first = json.data[0];
    expect(first.usage_rank).toBe(1);
    expect(first.service_name).toBe('Room Service');
    expect(first.total_quantity).toBe(10);
  });

  // -------------------------------------------------------------------------
  // Error handling — simulate repository failure
  // -------------------------------------------------------------------------

  it('returns 500 if the repository throws an unexpected error', async () => {
    vi.spyOn(sessionModule, 'getSession').mockResolvedValue({
      userId: 'mgr-uuid-1',
      role: 'Manager',
      employeeId: 10,
    } as any);

    vi.spyOn(topServicesRepository, 'getTopServices').mockRejectedValueOnce(
      new Error('Simulated DB failure')
    );

    const req = new NextRequest(BASE_URL);
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });
});
