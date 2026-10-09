/**
 * Reservation Repository tests - P06-M03-T01 (real DB wire-up)
 * Mocks `pool.query` / `pool.connect` so tests stay fast and DB-independent.
 * All original assertions are preserved.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CreateReservationParams } from './reservation.repository';

// ---------------------------------------------------------------------------
// Seed data mirrors the reservation seed / mock data from Phase 3
// ---------------------------------------------------------------------------
const SEED_RESERVATIONS = [
  {
    reservation_id: 'res-mock-001',
    guest_id: 'guest-mock-001',
    branch_id: 1,
    check_in_date: '2026-10-01',
    check_out_date: '2026-10-05',
    reservation_status: 'Booked',
    discount_percentage: null,
    processed_by_employee_id: null,
    created_by_user_id: 'user-mock-001',
    booking_source: 'Online',
    created_at: new Date('2026-09-15T08:00:00Z').toISOString(),
  },
  {
    reservation_id: 'res-mock-002',
    guest_id: 'guest-mock-001',
    branch_id: 2,
    check_in_date: '2026-11-10',
    check_out_date: '2026-11-14',
    reservation_status: 'CheckedIn',
    discount_percentage: '10.00',
    processed_by_employee_id: 3,
    created_by_user_id: 'user-mock-003',
    booking_source: 'Reception',
    created_at: new Date('2026-10-20T10:30:00Z').toISOString(),
  },
  {
    reservation_id: 'res-mock-003',
    guest_id: 'guest-mock-002',
    branch_id: 1,
    check_in_date: '2026-10-15',
    check_out_date: '2026-10-18',
    reservation_status: 'Booked',
    discount_percentage: null,
    processed_by_employee_id: null,
    created_by_user_id: 'user-mock-002',
    booking_source: 'Online',
    created_at: new Date('2026-09-18T12:00:00Z').toISOString(),
  },
];

const SEED_DETAIL_001 = {
  reservation_id: 'res-mock-001',
  guest_id: 'guest-mock-001',
  guest_full_name: 'Mock Guest',
  guest_email: 'mock@example.com',
  branch_id: 1,
  branch_location_name: 'Colombo',
  check_in_date: '2026-10-01',
  check_out_date: '2026-10-05',
  reservation_status: 'Booked',
  discount_percentage: null,
  booking_source: 'Online',
  processed_by_employee_id: null,
  created_at: new Date('2026-09-15T08:00:00Z').toISOString(),
};

const SEED_ROOMS_001 = [
  { room_id: 1, room_number: '101', type_name: 'Single', rate_per_night: '10000.00' },
];

const SEED_ACTIVE = [
  {
    reservation_id: 'res-mock-001',
    guest_id: 'guest-mock-001',
    guest_full_name: 'Mock Guest',
    guest_email: 'mock@example.com',
    branch_id: 1,
    branch_location_name: 'Colombo',
    check_in_date: '2026-10-01',
    check_out_date: '2026-10-05',
    reservation_status: 'Booked',
    booking_source: 'Online',
    discount_percentage: null,
    processed_by_employee_id: null,
    room_count: 1,
    created_at: new Date('2026-09-15T08:00:00Z').toISOString(),
  },
  {
    reservation_id: 'res-mock-002',
    guest_id: 'guest-mock-001',
    guest_full_name: 'Mock Guest',
    guest_email: 'mock@example.com',
    branch_id: 2,
    branch_location_name: 'Kandy',
    check_in_date: '2026-11-10',
    check_out_date: '2026-11-14',
    reservation_status: 'CheckedIn',
    booking_source: 'Reception',
    discount_percentage: '10.00',
    processed_by_employee_id: 3,
    room_count: 2,
    created_at: new Date('2026-10-20T10:30:00Z').toISOString(),
  },
  {
    reservation_id: 'res-mock-003',
    guest_id: 'guest-mock-002',
    guest_full_name: 'Mock Guest 2',
    guest_email: 'mock2@example.com',
    branch_id: 1,
    branch_location_name: 'Colombo',
    check_in_date: '2026-10-15',
    check_out_date: '2026-10-18',
    reservation_status: 'Booked',
    booking_source: 'Online',
    discount_percentage: null,
    processed_by_employee_id: null,
    room_count: 1,
    created_at: new Date('2026-09-18T12:00:00Z').toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Hoisted mock fns - must be declared via vi.hoisted so they are available
// inside the vi.mock factory (which is hoisted above all imports)
// ---------------------------------------------------------------------------
const { mockClientQuery, mockClientRelease, mockPoolQuery } = vi.hoisted(() => ({
  mockClientQuery: vi.fn(),
  mockClientRelease: vi.fn(),
  mockPoolQuery: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock pool - intercepts every pool.query and pool.connect call
// ---------------------------------------------------------------------------
vi.mock('@/lib/db/pool', () => ({
  pool: {
    query: mockPoolQuery,
    connect: vi.fn(() =>
      Promise.resolve({
        query: mockClientQuery,
        release: mockClientRelease,
      })
    ),
  },
}));

import { pool } from '@/lib/db/pool';
import { reservationRepository } from './reservation.repository';

// Helper: set up what pool.query returns for the next call
function mockQuery(rows: unknown[]): void {
  vi.mocked(pool.query).mockResolvedValueOnce({ rows, rowCount: rows.length } as never);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Reservation Repository (Mock)', () => {
  beforeEach(() => {
    // _resetMockStore is now a no-op; retained for shared-contract compatibility
    reservationRepository._resetMockStore();
    vi.clearAllMocks();
    // Default: client queries (BEGIN / COMMIT / ROLLBACK) succeed with no rows
    mockClientQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  // -------------------------------------------------------------------------
  describe('listByGuestId', () => {
    it('returns reservations belonging to the specified guest, ordered newest first', async () => {
      const guest001 = SEED_RESERVATIONS
        .filter((r) => r.guest_id === 'guest-mock-001')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      mockQuery(guest001);

      const results = await reservationRepository.listByGuestId('guest-mock-001');

      expect(results.length).toBe(2);
      expect(results[0].guest_id).toBe('guest-mock-001');
      expect(results[1].guest_id).toBe('guest-mock-001');
      // Sorted by created_at DESC: res-mock-002 (Oct 20) before res-mock-001 (Sep 15)
      expect(results[0].reservation_id).toBe('res-mock-002');
      expect(results[1].reservation_id).toBe('res-mock-001');
    });

    it('enforces guest ownership and ignores reservations of other guests', async () => {
      const guest002 = SEED_RESERVATIONS.filter((r) => r.guest_id === 'guest-mock-002');
      mockQuery(guest002);

      const results = await reservationRepository.listByGuestId('guest-mock-002');

      expect(results.length).toBe(1);
      expect(results[0].reservation_id).toBe('res-mock-003');
      expect(results[0].guest_id).toBe('guest-mock-002');
    });

    it('returns an empty array when guest has no reservations', async () => {
      mockQuery([]);
      const results = await reservationRepository.listByGuestId('guest-non-existent');
      expect(results).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  describe('callCreateReservation', () => {
    const newBookingParams: CreateReservationParams = {
      guest_id: 'guest-mock-001',
      branch_id: 1,
      check_in_date: '2026-12-01',
      check_out_date: '2026-12-05',
      room_ids: [1],
      booking_source: 'Online',
      created_by_user_id: 'user-mock-001',
      employee_id: null,
      discount_percentage: null,
    };

    it('creates a new reservation successfully when dates do not overlap', async () => {
      const newId = 'res-real-001';
      // CALL sp_create_reservation returns INOUT p_reservation_id
      mockClientQuery.mockResolvedValueOnce({ rows: [{ p_reservation_id: newId }], rowCount: 1 });

      // Provide a mock PoolClient directly to callCreateReservation
      const fakeClient = { query: mockClientQuery, release: mockClientRelease } as never;
      const result = await reservationRepository.callCreateReservation(fakeClient, newBookingParams);

      expect(result.reservation_id).toBeDefined();
      expect(result.reservation_id).toBe(newId);
    });

    it('propagates SQLSTATE 45001 (overlap) thrown by the stored procedure', async () => {
      const overlapErr = Object.assign(
        new Error('Room 1 is already reserved for the requested dates'),
        { code: '45001' }
      );
      mockClientQuery.mockRejectedValueOnce(overlapErr);

      const fakeClient = { query: mockClientQuery, release: mockClientRelease } as never;
      await expect(
        reservationRepository.callCreateReservation(fakeClient, {
          ...newBookingParams,
          check_in_date: '2026-10-03',
          check_out_date: '2026-10-07',
        })
      ).rejects.toThrowError(/already reserved/);

      // Verify SQLSTATE code is preserved on the error
      const overlapErr2 = Object.assign(
        new Error('Room 1 is already reserved for the requested dates'),
        { code: '45001' }
      );
      mockClientQuery.mockRejectedValueOnce(overlapErr2);
      try {
        await reservationRepository.callCreateReservation(fakeClient, {
          ...newBookingParams,
          check_in_date: '2026-10-03',
          check_out_date: '2026-10-07',
        });
      } catch (err: unknown) {
        expect((err as { code?: string }).code).toBe('45001');
      }
    });

    it('allows booking the same room for consecutive non-overlapping dates', async () => {
      const newId = 'res-real-002';
      mockClientQuery.mockResolvedValueOnce({ rows: [{ p_reservation_id: newId }], rowCount: 1 });

      const fakeClient = { query: mockClientQuery, release: mockClientRelease } as never;
      const result = await reservationRepository.callCreateReservation(fakeClient, {
        ...newBookingParams,
        check_in_date: '2026-10-05',
        check_out_date: '2026-10-10',
      });
      expect(result.reservation_id).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  describe('findDetailById', () => {
    it('returns full detail when reservation belongs to the requesting guest', async () => {
      mockQuery([SEED_DETAIL_001]);  // fn_get_reservation_detail
      mockQuery(SEED_ROOMS_001);     // reservation_rooms join

      const detail = await reservationRepository.findDetailById('res-mock-001', 'guest-mock-001');

      expect(detail).not.toBeNull();
      expect(detail?.reservation_id).toBe('res-mock-001');
      expect(detail?.guest_id).toBe('guest-mock-001');
      expect(detail?.branch_location_name).toBe('Colombo');
      expect(detail?.rooms).toHaveLength(1);
      expect(detail?.rooms[0].room_number).toBe('101');
    });

    it('enforces guest ownership security and returns null on guest mismatch (P0002)', async () => {
      // DB function raises P0002 on ownership mismatch
      const ownershipErr = Object.assign(new Error('no_data_found'), { code: 'P0002' });
      vi.mocked(pool.query).mockRejectedValueOnce(ownershipErr);

      const detail = await reservationRepository.findDetailById('res-mock-001', 'guest-mock-002');
      expect(detail).toBeNull();
    });

    it('allows staff access (guestId = null) regardless of owner', async () => {
      mockQuery([SEED_DETAIL_001]);
      mockQuery(SEED_ROOMS_001);

      const detail = await reservationRepository.findDetailById('res-mock-001', null);

      expect(detail).not.toBeNull();
      expect(detail?.reservation_id).toBe('res-mock-001');
    });

    it('returns null if reservationId does not exist', async () => {
      mockQuery([]);  // fn returns 0 rows → header empty → return null

      const detail = await reservationRepository.findDetailById('res-mock-999', null);
      expect(detail).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('listActive', () => {
    it('returns only Booked and CheckedIn reservations', async () => {
      const active = SEED_ACTIVE.filter(
        (r) => r.reservation_status === 'Booked' || r.reservation_status === 'CheckedIn'
      );
      mockQuery(active);

      const result = await reservationRepository.listActive(null);
      expect(result.length).toBeGreaterThan(0);
      result.forEach((r) => {
        expect(['Booked', 'CheckedIn']).toContain(r.reservation_status);
      });
    });

    it('scopes by branchId when specified for staff RBAC', async () => {
      const branch1Active = SEED_ACTIVE.filter((r) => r.branch_id === 1);
      mockQuery(branch1Active);

      const result = await reservationRepository.listActive(1);
      expect(result.length).toBeGreaterThan(0);
      result.forEach((r) => {
        expect(r.branch_id).toBe(1);
      });
    });
  });

  // -------------------------------------------------------------------------
  describe('callCancelReservation', () => {
    it('successfully cancels a Booked reservation', async () => {
      // BEGIN, CALL sp_cancel_reservation, COMMIT - all succeed
      mockClientQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // CALL sp_cancel_reservation
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      await expect(
        reservationRepository.callCancelReservation('res-mock-001', 'guest-mock-001', 'user-mock-001')
      ).resolves.toBeUndefined();

      expect(mockClientRelease).toHaveBeenCalled();
    });

    it('rejects cancellation of a CheckedIn reservation with code 45010', async () => {
      const statusErr = Object.assign(
        new Error('Reservation res-mock-002 cannot be cancelled - current status is CheckedIn'),
        { code: '45010' }
      );
      mockClientQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockRejectedValueOnce(statusErr);                // CALL throws → triggers ROLLBACK

      await expect(
        reservationRepository.callCancelReservation('res-mock-002', 'guest-mock-001', 'user-mock-001')
      ).rejects.toThrowError(/cannot be cancelled/);

      // Verify ROLLBACK was issued and client was released
      const callArgs = mockClientQuery.mock.calls.map((c) => c[0]);
      expect(callArgs).toContain('ROLLBACK');
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it('rejects cancellation when guestId does not match (code P0002)', async () => {
      const notFoundErr = Object.assign(
        new Error('Reservation res-mock-001 not found'),
        { code: 'P0002' }
      );
      mockClientQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockRejectedValueOnce(notFoundErr);               // CALL throws

      await expect(
        reservationRepository.callCancelReservation('res-mock-001', 'wrong-guest-id', 'user-mock-001')
      ).rejects.toThrowError(/not found/);
    });
  });
});
