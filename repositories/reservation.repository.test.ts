import { describe, it, expect, beforeEach } from 'vitest';
import { reservationRepository } from './reservation.repository';
import type { CreateReservationParams } from './reservation.repository';
import type { PoolClient } from '@/lib/db/pool';

// Stub PoolClient for mock mode
const mockClient = {} as PoolClient;

describe('Reservation Repository (Mock)', () => {
  beforeEach(() => {
    // Reset mock store to initial seed state before every test
    reservationRepository._resetMockStore();
  });

  describe('listByGuestId', () => {
    it('returns reservations belonging to the specified guest, ordered newest first', async () => {
      const results = await reservationRepository.listByGuestId('guest-mock-001');

      expect(results.length).toBe(2);
      expect(results[0].guest_id).toBe('guest-mock-001');
      expect(results[1].guest_id).toBe('guest-mock-001');
      // Should be sorted by created_at DESC (res-mock-002 was created Oct 20, res-mock-001 Sep 15)
      expect(results[0].reservation_id).toBe('res-mock-002');
      expect(results[1].reservation_id).toBe('res-mock-001');
    });

    it('enforces guest ownership and ignores reservations of other guests', async () => {
      const results = await reservationRepository.listByGuestId('guest-mock-002');

      expect(results.length).toBe(1);
      expect(results[0].reservation_id).toBe('res-mock-003');
      expect(results[0].guest_id).toBe('guest-mock-002');
    });

    it('returns an empty array when guest has no reservations', async () => {
      const results = await reservationRepository.listByGuestId('guest-non-existent');
      expect(results).toEqual([]);
    });
  });

  describe('callCreateReservation', () => {
    it('creates a new reservation successfully when dates do not overlap', async () => {
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

      const result = await reservationRepository.callCreateReservation(mockClient, newBookingParams);
      expect(result.reservation_id).toBeDefined();
      expect(result.reservation_id).toMatch(/^res-mock-/);

      // Verify it can now be retrieved
      const guestReservations = await reservationRepository.listByGuestId('guest-mock-001');
      expect(guestReservations.some((r) => r.reservation_id === result.reservation_id)).toBe(true);
    });

    it('throws SQLSTATE 45001 when reserving a room during an overlapping date range', async () => {
      // res-mock-001 is booked for room 1 from 2026-10-01 to 2026-10-05
      const overlappingParams: CreateReservationParams = {
        guest_id: 'guest-mock-002',
        branch_id: 1,
        check_in_date: '2026-10-03', // overlaps with 10-01 -> 10-05
        check_out_date: '2026-10-07',
        room_ids: [1],
        booking_source: 'Online',
        created_by_user_id: 'user-mock-002',
        employee_id: null,
        discount_percentage: null,
      };

      await expect(
        reservationRepository.callCreateReservation(mockClient, overlappingParams)
      ).rejects.toThrowError(/already reserved/);

      try {
        await reservationRepository.callCreateReservation(mockClient, overlappingParams);
      } catch (err: any) {
        expect(err.code).toBe('45001');
      }
    });

    it('allows booking the same room for consecutive non-overlapping dates', async () => {
      // res-mock-001 is 2026-10-01 to 2026-10-05 for room 1
      const nextDayParams: CreateReservationParams = {
        guest_id: 'guest-mock-002',
        branch_id: 1,
        check_in_date: '2026-10-05', // check-in on same day as previous check-out
        check_out_date: '2026-10-10',
        room_ids: [1],
        booking_source: 'Online',
        created_by_user_id: 'user-mock-002',
        employee_id: null,
        discount_percentage: null,
      };

      const result = await reservationRepository.callCreateReservation(mockClient, nextDayParams);
      expect(result.reservation_id).toBeDefined();
    });
  });

  describe('findDetailById', () => {
    it('returns full detail when reservation belongs to the requesting guest', async () => {
      const detail = await reservationRepository.findDetailById('res-mock-001', 'guest-mock-001');

      expect(detail).not.toBeNull();
      expect(detail?.reservation_id).toBe('res-mock-001');
      expect(detail?.guest_id).toBe('guest-mock-001');
      expect(detail?.branch_location_name).toBe('Colombo');
      expect(detail?.rooms).toHaveLength(1);
      expect(detail?.rooms[0].room_number).toBe('101');
    });

    it('enforces guest ownership security and returns null on guest mismatch', async () => {
      // res-mock-001 belongs to guest-mock-001, but guest-mock-002 tries to view it
      const detail = await reservationRepository.findDetailById('res-mock-001', 'guest-mock-002');
      expect(detail).toBeNull();
    });

    it('allows staff access (guestId = null) regardless of owner', async () => {
      const detail = await reservationRepository.findDetailById('res-mock-001', null);

      expect(detail).not.toBeNull();
      expect(detail?.reservation_id).toBe('res-mock-001');
    });

    it('returns null if reservationId does not exist', async () => {
      const detail = await reservationRepository.findDetailById('res-mock-999', null);
      expect(detail).toBeNull();
    });
  });

  describe('listActive', () => {
    it('returns only Booked and CheckedIn reservations', async () => {
      const active = await reservationRepository.listActive(null);
      expect(active.length).toBeGreaterThan(0);
      active.forEach((r) => {
        expect(['Booked', 'CheckedIn']).toContain(r.reservation_status);
      });
    });

    it('scopes by branchId when specified for staff RBAC', async () => {
      const branch1Active = await reservationRepository.listActive(1);
      expect(branch1Active.length).toBeGreaterThan(0);
      branch1Active.forEach((r) => {
        expect(r.branch_id).toBe(1);
      });
    });
  });

  describe('callCancelReservation', () => {
    it('successfully cancels a Booked reservation', async () => {
      await reservationRepository.callCancelReservation('res-mock-001', 'guest-mock-001', 'user-mock-001');

      const detail = await reservationRepository.findDetailById('res-mock-001', 'guest-mock-001');
      expect(detail?.reservation_status).toBe('Cancelled');
    });

    it('rejects cancellation of a CheckedIn reservation with code 45010', async () => {
      // res-mock-002 is CheckedIn
      await expect(
        reservationRepository.callCancelReservation('res-mock-002', 'guest-mock-001', 'user-mock-001')
      ).rejects.toThrowError(/cannot be cancelled/);

      try {
        await reservationRepository.callCancelReservation('res-mock-002', 'guest-mock-001', 'user-mock-001');
      } catch (err: any) {
        expect(err.code).toBe('45010');
      }
    });

    it('rejects cancellation when guestId does not match (code P0002)', async () => {
      await expect(
        reservationRepository.callCancelReservation('res-mock-001', 'wrong-guest-id', 'user-mock-001')
      ).rejects.toThrowError(/not found/);
    });
  });
});
