import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reservationService, ServiceError } from './reservation.service';
import { reservationRepository } from '@/repositories/reservation.repository';
import type { CreateReservationInput } from '@/lib/validation/reservation.schema';
import type { SessionData } from '@/types/session';
import { pool } from '@/lib/db/pool';

describe('Reservation Service', () => {
  beforeEach(() => {
    reservationRepository._resetMockStore();

    // Mock pool.connect to return a dummy client in mock mode without hitting real Postgres TCP socket
    const dummyClient = {
      release: vi.fn(),
      query: vi.fn(),
    };
    vi.spyOn(pool, 'connect').mockResolvedValue(dummyClient as any);
  });

  describe('createGuestReservation', () => {
    it('creates a guest reservation and sources guest_id from session', async () => {
      const input: CreateReservationInput = {
        branch_id: 1,
        check_in_date: '2026-12-10',
        check_out_date: '2026-12-15',
        room_ids: [1],
        booking_source: 'Online',
        discount_percentage: undefined,
      };

      const session: Pick<SessionData, 'userId' | 'guestId'> = {
        userId: 'user-mock-001',
        guestId: 'guest-mock-001',
      };

      const result = await reservationService.createGuestReservation(input, session);

      expect(result.reservation_id).toBeDefined();

      const detail = await reservationService.getReservationDetail(result.reservation_id, 'guest-mock-001');
      expect(detail).not.toBeNull();
      expect(detail?.guest_id).toBe('guest-mock-001');
      expect(detail?.booking_source).toBe('Online');
    });

    it('throws ServiceError NOT_FOUND if guestId is missing from session', async () => {
      const input: CreateReservationInput = {
        branch_id: 1,
        check_in_date: '2026-12-10',
        check_out_date: '2026-12-15',
        room_ids: [1],
        booking_source: 'Online',
        discount_percentage: undefined,
      };

      const sessionWithoutGuest: Pick<SessionData, 'userId' | 'guestId'> = {
        userId: 'user-mock-staff',
        // guestId is missing/undefined
      };

      await expect(
        reservationService.createGuestReservation(input, sessionWithoutGuest)
      ).rejects.toThrow(ServiceError);

      try {
        await reservationService.createGuestReservation(input, sessionWithoutGuest);
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
        expect(err.message).toContain('Guest profile not found in session');
      }
    });

    it('maps SQLSTATE 45001 room overlap error to ServiceError ROOM_OVERLAP', async () => {
      const inputOverlapping: CreateReservationInput = {
        branch_id: 1,
        check_in_date: '2026-10-02', // Overlaps res-mock-001 (10-01 -> 10-05)
        check_out_date: '2026-10-04',
        room_ids: [1],
        booking_source: 'Online',
        discount_percentage: undefined,
      };

      const session: Pick<SessionData, 'userId' | 'guestId'> = {
        userId: 'user-mock-001',
        guestId: 'guest-mock-001',
      };

      await expect(
        reservationService.createGuestReservation(inputOverlapping, session)
      ).rejects.toThrow(ServiceError);

      try {
        await reservationService.createGuestReservation(inputOverlapping, session);
      } catch (err: any) {
        expect(err.code).toBe('ROOM_OVERLAP');
      }
    });
  });

  describe('createStaffReservation', () => {
    it('creates a staff reservation with employeeId and discount', async () => {
      const input: CreateReservationInput = {
        branch_id: 1,
        check_in_date: '2026-12-20',
        check_out_date: '2026-12-25',
        room_ids: [1],
        booking_source: 'Reception',
        discount_percentage: 15,
      };

      const session: Pick<SessionData, 'userId' | 'employeeId'> = {
        userId: 'user-mock-employee',
        employeeId: 3,
      };

      const result = await reservationService.createStaffReservation(input, session, 'guest-mock-001');
      expect(result.reservation_id).toBeDefined();

      const detail = await reservationService.getReservationDetail(result.reservation_id, null);
      expect(detail?.processed_by_employee_id).toBe(3);
      expect(detail?.booking_source).toBe('Reception');
      expect(detail?.discount_percentage).toBe('15.00');
    });
  });

  describe('getGuestReservations', () => {
    it('returns all reservations for the session guest', async () => {
      const res = await reservationService.getGuestReservations('guest-mock-001');
      expect(res.length).toBe(2);
      expect(res.every((r) => r.guest_id === 'guest-mock-001')).toBe(true);
    });
  });

  describe('listActiveReservations', () => {
    it('returns all active reservations for Manager/Admin (branchId = null)', async () => {
      const list = await reservationService.listActiveReservations(null);
      expect(list.length).toBeGreaterThan(0);
      expect(list.every((r) => r.reservation_status === 'Booked' || r.reservation_status === 'CheckedIn')).toBe(true);
    });

    it('returns branch-filtered active reservations for Receptionist (branchId = 1)', async () => {
      const list = await reservationService.listActiveReservations(1);
      expect(list.length).toBeGreaterThan(0);
      expect(list.every((r) => r.branch_id === 1)).toBe(true);
    });
  });

  describe('cancelReservation', () => {
    it('cancels a Booked reservation successfully', async () => {
      await reservationService.cancelReservation('res-mock-001', 'user-mock-001', 'guest-mock-001');
      const detail = await reservationService.getReservationDetail('res-mock-001', 'guest-mock-001');
      expect(detail?.reservation_status).toBe('Cancelled');
    });

    it('throws ServiceError INVALID_STATUS_TRANSITION when trying to cancel a CheckedIn reservation', async () => {
      await expect(
        reservationService.cancelReservation('res-mock-002', 'user-mock-001', 'guest-mock-001')
      ).rejects.toThrow(ServiceError);

      try {
        await reservationService.cancelReservation('res-mock-002', 'user-mock-001', 'guest-mock-001');
      } catch (err: any) {
        expect(err.code).toBe('INVALID_STATUS_TRANSITION');
      }
    });

    it('throws ServiceError NOT_FOUND when reservation does not exist or guest mismatch', async () => {
      await expect(
        reservationService.cancelReservation('res-mock-001', 'user-mock-001', 'wrong-guest')
      ).rejects.toThrow(ServiceError);

      try {
        await reservationService.cancelReservation('res-mock-001', 'user-mock-001', 'wrong-guest');
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });
  });
});
