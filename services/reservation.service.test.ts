/**
 * Reservation Service tests - P06-M03-T01 (real DB wire-up)
 * Mocks the reservation repository so tests stay fast and DB-independent.
 * All original assertions are preserved.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CreateReservationInput } from '@/lib/validation/reservation.schema';
import type { SessionData } from '@/types/session';

// ---------------------------------------------------------------------------
// Seed data mirrors the Phase 3 mock store - used to configure mock returns
// ---------------------------------------------------------------------------
const MOCK_RESERVATIONS = [
  {
    reservation_id: 'res-mock-001',
    guest_id: 'guest-mock-001',
    branch_id: 1,
    check_in_date: '2026-10-01',
    check_out_date: '2026-10-05',
    reservation_status: 'Booked' as const,
    discount_percentage: null,
    processed_by_employee_id: null,
    created_by_user_id: 'user-mock-001',
    booking_source: 'Online' as const,
    created_at: new Date('2026-09-15T08:00:00Z').toISOString(),
  },
  {
    reservation_id: 'res-mock-002',
    guest_id: 'guest-mock-001',
    branch_id: 2,
    check_in_date: '2026-11-10',
    check_out_date: '2026-11-14',
    reservation_status: 'CheckedIn' as const,
    discount_percentage: '10.00',
    processed_by_employee_id: 3,
    created_by_user_id: 'user-mock-003',
    booking_source: 'Reception' as const,
    created_at: new Date('2026-10-20T10:30:00Z').toISOString(),
  },
  {
    reservation_id: 'res-mock-003',
    guest_id: 'guest-mock-002',
    branch_id: 1,
    check_in_date: '2026-10-15',
    check_out_date: '2026-10-18',
    reservation_status: 'Booked' as const,
    discount_percentage: null,
    processed_by_employee_id: null,
    created_by_user_id: 'user-mock-002',
    booking_source: 'Online' as const,
    created_at: new Date('2026-09-18T12:00:00Z').toISOString(),
  },
];

const MOCK_DETAIL_001 = {
  reservation_id: 'res-mock-001',
  guest_id: 'guest-mock-001',
  guest_full_name: 'Mock Guest',
  guest_email: 'mock@example.com',
  branch_id: 1,
  branch_location_name: 'Colombo',
  check_in_date: '2026-10-01',
  check_out_date: '2026-10-05',
  reservation_status: 'Booked' as const,
  discount_percentage: null,
  booking_source: 'Online' as const,
  processed_by_employee_id: null,
  created_at: new Date('2026-09-15T08:00:00Z').toISOString(),
  rooms: [{ room_id: 1, room_number: '101', type_name: 'Single', rate_per_night: '10000.00' }],
};

const MOCK_ACTIVE = [
  {
    reservation_id: 'res-mock-001',
    guest_id: 'guest-mock-001',
    guest_full_name: 'Mock Guest',
    guest_email: 'mock@example.com',
    branch_id: 1,
    branch_location_name: 'Colombo',
    check_in_date: '2026-10-01',
    check_out_date: '2026-10-05',
    reservation_status: 'Booked' as const,
    booking_source: 'Online' as const,
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
    reservation_status: 'CheckedIn' as const,
    booking_source: 'Reception' as const,
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
    reservation_status: 'Booked' as const,
    booking_source: 'Online' as const,
    discount_percentage: null,
    processed_by_employee_id: null,
    room_count: 1,
    created_at: new Date('2026-09-18T12:00:00Z').toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Hoisted mock fns for repository methods
// ---------------------------------------------------------------------------
const {
  mockCallCreate,
  mockListByGuest,
  mockFindDetail,
  mockListActive,
  mockCallCancel,
} = vi.hoisted(() => ({
  mockCallCreate: vi.fn(),
  mockListByGuest: vi.fn(),
  mockFindDetail: vi.fn(),
  mockListActive: vi.fn(),
  mockCallCancel: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock the reservation repository - service calls go through these fns
// ---------------------------------------------------------------------------
vi.mock('@/repositories/reservation.repository', () => ({
  reservationRepository: {
    callCreateReservation: mockCallCreate,
    listByGuestId: mockListByGuest,
    findDetailById: mockFindDetail,
    findById: vi.fn(),
    listActive: mockListActive,
    callCancelReservation: mockCallCancel,
    findByIdAndGuestId: vi.fn(),
    _resetMockStore: vi.fn(),
  },
}));

// Mock pool.connect (service layer acquires client for write operations)
vi.mock('@/lib/db/pool', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(() =>
      Promise.resolve({
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: vi.fn(),
      })
    ),
  },
}));

import { reservationService, ServiceError } from './reservation.service';
import { reservationRepository } from '@/repositories/reservation.repository';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Reservation Service', () => {
  beforeEach(() => {
    // _resetMockStore is now a no-op in the real repo; safe to call on vi.fn()
    reservationRepository._resetMockStore();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  describe('createGuestReservation', () => {
    it('creates a guest reservation and sources guest_id from session', async () => {
      const newId = 'res-new-001';
      mockCallCreate.mockResolvedValueOnce({ reservation_id: newId });
      mockFindDetail.mockResolvedValueOnce({
        ...MOCK_DETAIL_001,
        reservation_id: newId,
        guest_id: 'guest-mock-001',
        booking_source: 'Online',
      });

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
      } catch (err: unknown) {
        expect((err as { code?: string }).code).toBe('NOT_FOUND');
        expect((err as Error).message).toContain('Guest profile not found in session');
      }
    });

    it('maps SQLSTATE 45001 room overlap error to ServiceError ROOM_OVERLAP', async () => {
      const overlapErr = Object.assign(
        new Error('Room 1 is already reserved for the requested dates'),
        { code: '45001' }
      );
      mockCallCreate.mockRejectedValueOnce(overlapErr);
      mockCallCreate.mockRejectedValueOnce(overlapErr);

      const inputOverlapping: CreateReservationInput = {
        branch_id: 1,
        check_in_date: '2026-10-02',
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
      } catch (err: unknown) {
        expect((err as { code?: string }).code).toBe('ROOM_OVERLAP');
      }
    });
  });

  // -------------------------------------------------------------------------
  describe('createStaffReservation', () => {
    it('creates a staff reservation with employeeId and discount', async () => {
      const newId = 'res-staff-001';
      mockCallCreate.mockResolvedValueOnce({ reservation_id: newId });
      mockFindDetail.mockResolvedValueOnce({
        ...MOCK_DETAIL_001,
        reservation_id: newId,
        processed_by_employee_id: 3,
        booking_source: 'Reception',
        discount_percentage: '15.00',
      });

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

  // -------------------------------------------------------------------------
  describe('getGuestReservations', () => {
    it('returns all reservations for the session guest', async () => {
      const guest001 = MOCK_RESERVATIONS.filter((r) => r.guest_id === 'guest-mock-001');
      mockListByGuest.mockResolvedValueOnce(guest001);

      const res = await reservationService.getGuestReservations('guest-mock-001');
      expect(res.length).toBe(2);
      expect(res.every((r) => r.guest_id === 'guest-mock-001')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('listActiveReservations', () => {
    it('returns all active reservations for Manager/Admin (branchId = null)', async () => {
      mockListActive.mockResolvedValueOnce(MOCK_ACTIVE);

      const list = await reservationService.listActiveReservations(null);
      expect(list.length).toBeGreaterThan(0);
      expect(
        list.every((r) => r.reservation_status === 'Booked' || r.reservation_status === 'CheckedIn')
      ).toBe(true);
    });

    it('returns branch-filtered active reservations for Receptionist (branchId = 1)', async () => {
      const branch1 = MOCK_ACTIVE.filter((r) => r.branch_id === 1);
      mockListActive.mockResolvedValueOnce(branch1);

      const list = await reservationService.listActiveReservations(1);
      expect(list.length).toBeGreaterThan(0);
      expect(list.every((r) => r.branch_id === 1)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('cancelReservation', () => {
    it('cancels a Booked reservation successfully', async () => {
      mockCallCancel.mockResolvedValueOnce(undefined);
      mockFindDetail.mockResolvedValueOnce({ ...MOCK_DETAIL_001, reservation_status: 'Cancelled' });

      await reservationService.cancelReservation('res-mock-001', 'user-mock-001', 'guest-mock-001');
      const detail = await reservationService.getReservationDetail('res-mock-001', 'guest-mock-001');
      expect(detail?.reservation_status).toBe('Cancelled');
    });

    it('throws ServiceError INVALID_STATUS_TRANSITION when trying to cancel a CheckedIn reservation', async () => {
      const statusErr = Object.assign(
        new Error('Reservation cannot be cancelled - current status is CheckedIn'),
        { code: '45010' }
      );
      mockCallCancel.mockRejectedValueOnce(statusErr);
      mockCallCancel.mockRejectedValueOnce(statusErr);

      await expect(
        reservationService.cancelReservation('res-mock-002', 'user-mock-001', 'guest-mock-001')
      ).rejects.toThrow(ServiceError);

      try {
        await reservationService.cancelReservation('res-mock-002', 'user-mock-001', 'guest-mock-001');
      } catch (err: unknown) {
        expect((err as { code?: string }).code).toBe('INVALID_STATUS_TRANSITION');
      }
    });

    it('throws ServiceError NOT_FOUND when reservation does not exist or guest mismatch', async () => {
      const notFoundErr = Object.assign(
        new Error('Reservation not found'),
        { code: 'P0002' }
      );
      mockCallCancel.mockRejectedValueOnce(notFoundErr);
      mockCallCancel.mockRejectedValueOnce(notFoundErr);

      await expect(
        reservationService.cancelReservation('res-mock-001', 'user-mock-001', 'wrong-guest')
      ).rejects.toThrow(ServiceError);

      try {
        await reservationService.cancelReservation('res-mock-001', 'user-mock-001', 'wrong-guest');
      } catch (err: unknown) {
        expect((err as { code?: string }).code).toBe('NOT_FOUND');
      }
    });
  });
});
