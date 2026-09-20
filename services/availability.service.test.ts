/**
 * Tests for Availability Service — P02-M02-T08
 * Owned by: Member 2 (M2)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  availabilityService,
  AvailabilityValidationError,
} from '../services/availability.service';
import { availabilityRepository } from '../repositories/availability.repository';

const FIXED_TODAY = '2026-09-21';
const FIXED_TOMORROW = '2026-09-22';
const FIXED_IN_3 = '2026-09-24';
const PAST_DATE = '2026-09-01';

const mockIsoNow = FIXED_TODAY + 'T00:00:00.000Z';

describe('Availability Service', () => {
  let dateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    availabilityRepository._resetMockStore();
    dateSpy = vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockIsoNow);
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  describe('searchAvailable — happy path', () => {
    it('computes nightsRequested correctly', async () => {
      const result = await availabilityService.searchAvailable({
        branchId: 2,
        checkIn:  '2026-10-01',
        checkOut: '2026-10-05',
      });
      expect(result.nightsRequested).toBe(4);
    });
  });

  describe('searchAvailable — validation errors', () => {
    it('throws AvailabilityValidationError for branchId = 0', async () => {
      await expect(
        availabilityService.searchAvailable({
          branchId: 0,
          checkIn:  FIXED_TOMORROW,
          checkOut: FIXED_IN_3,
        }),
      ).rejects.toThrow(AvailabilityValidationError);
    });

    it('throws AvailabilityValidationError when checkOut === checkIn (same-day)', async () => {
      await expect(
        availabilityService.searchAvailable({
          branchId: 2,
          checkIn:  FIXED_TOMORROW,
          checkOut: FIXED_TOMORROW,
        }),
      ).rejects.toThrow(AvailabilityValidationError);
    });

    it('throws AvailabilityValidationError for a past checkIn date', async () => {
      await expect(
        availabilityService.searchAvailable({
          branchId: 2,
          checkIn:  PAST_DATE,
          checkOut: FIXED_TOMORROW,
        }),
      ).rejects.toThrow(AvailabilityValidationError);
    });
  });
});
