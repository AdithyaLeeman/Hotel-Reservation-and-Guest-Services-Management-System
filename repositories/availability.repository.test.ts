/**
 * Tests for Availability Repository — P02-M02-T07
 * Owned by: Member 2 (M2)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  availabilityRepository,
  type AvailableRoom,
} from '../repositories/availability.repository';

// Helpers
const FUTURE_DATE = (daysFromNow: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};

describe('Availability Repository', () => {
  beforeEach(() => {
    availabilityRepository._resetMockStore();
  });

  describe('getAvailableRooms — Kandy branch (no reservations)', () => {
    it('returns all 5 rooms for Kandy when no reservations exist', async () => {
      const rooms = await availabilityRepository.getAvailableRooms(
        2,
        FUTURE_DATE(1),
        FUTURE_DATE(3),
      );
      expect(rooms).toHaveLength(5);
    });

    it('every returned room belongs to the requested branch', async () => {
      const rooms = await availabilityRepository.getAvailableRooms(
        2,
        FUTURE_DATE(1),
        FUTURE_DATE(4),
      );
      expect(rooms.every((r: AvailableRoom) => r.branch_id === 2)).toBe(true);
    });
  });

  describe('getAvailableRooms — Colombo branch filters', () => {
    it('excludes Maintenance rooms (room 3)', async () => {
      const rooms = await availabilityRepository.getAvailableRooms(
        1,
        FUTURE_DATE(10),
        FUTURE_DATE(12),
      );
      const ids = rooms.map((r: AvailableRoom) => r.room_id);
      expect(ids).not.toContain(3);
    });
  });

  describe('date-overlap exclusion', () => {
    it('excludes a room blocked by a Booked reservation', async () => {
      availabilityRepository._addMockReservation({
        reservation_id: 'test-overlap-booked',
        branch_id: 2,
        check_in_date:  '2026-10-01',
        check_out_date: '2026-10-05',
        reservation_status: 'Booked',
        room_ids: [6],
      });
      const rooms = await availabilityRepository.getAvailableRooms(
        2,
        '2026-10-02',
        '2026-10-04',
      );
      expect(rooms.map((r: AvailableRoom) => r.room_id)).not.toContain(6);
    });
  });
});
