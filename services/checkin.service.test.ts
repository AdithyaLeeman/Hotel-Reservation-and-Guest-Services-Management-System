/**
 * Check-in Service Tests (Mock)
 * Task: P04-M04-T10
 *
 * Every task must include tests per AGENTS.md Section 12.
 * Run: npm test -- services/checkin.service.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { checkinService, CheckinServiceError } from './checkin.service';

describe('Check-in Service (Mock)', () => {
  beforeEach(() => {
    checkinService._resetMockStore();
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------
  describe('checkIn — success', () => {
    it('transitions a Booked reservation to CheckedIn', async () => {
      // Should not throw
      await expect(
        checkinService.checkIn('RES-MOCK-001', 4, 1)
      ).resolves.toBeUndefined();
    });

    it('allows Manager (branchId=null) to check in any reservation', async () => {
      await expect(
        checkinService.checkIn('RES-MOCK-004', 10, null)
      ).resolves.toBeUndefined();
    });

    it('prevents checking in the same reservation twice (status guard)', async () => {
      // First check-in succeeds
      await checkinService.checkIn('RES-MOCK-001', 4, 1);

      // Second attempt on the same reservation must fail with NOT_BOOKED_STATUS
      await expect(
        checkinService.checkIn('RES-MOCK-001', 4, 1)
      ).rejects.toThrow(CheckinServiceError);
    });
  });

  // -------------------------------------------------------------------------
  // NOT_FOUND
  // -------------------------------------------------------------------------
  describe('checkIn — NOT_FOUND', () => {
    it('throws CheckinServiceError NOT_FOUND for unknown reservationId', async () => {
      await expect(
        checkinService.checkIn('RES-DOES-NOT-EXIST', 4, 1)
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('error is an instance of CheckinServiceError', async () => {
      await expect(
        checkinService.checkIn('RES-DOES-NOT-EXIST', 4, 1)
      ).rejects.toBeInstanceOf(CheckinServiceError);
    });
  });

  // -------------------------------------------------------------------------
  // NOT_BOOKED_STATUS
  // -------------------------------------------------------------------------
  describe('checkIn — NOT_BOOKED_STATUS', () => {
    it('throws NOT_BOOKED_STATUS when reservation is already CheckedIn', async () => {
      // RES-MOCK-003 starts in CheckedIn state
      await expect(
        checkinService.checkIn('RES-MOCK-003', 4, null)
      ).rejects.toMatchObject({
        code: 'NOT_BOOKED_STATUS',
      });
    });

    it('error message mentions the current status', async () => {
      const error = await checkinService.checkIn('RES-MOCK-003', 4, null).catch((e) => e);
      expect(error.message).toContain('CheckedIn');
    });
  });

  // -------------------------------------------------------------------------
  // BRANCH_SCOPE_VIOLATION
  // -------------------------------------------------------------------------
  describe('checkIn — BRANCH_SCOPE_VIOLATION', () => {
    it('throws BRANCH_SCOPE_VIOLATION when Receptionist tries to check in another branch', async () => {
      // RES-MOCK-002 is branch 1; employee is scoped to branch 2
      await expect(
        checkinService.checkIn('RES-MOCK-002', 99, 2)
      ).rejects.toMatchObject({
        code: 'BRANCH_SCOPE_VIOLATION',
      });
    });

    it('allows Receptionist to check in a reservation in their own branch', async () => {
      // RES-MOCK-001 is branch 1, employee scoped to branch 1
      await expect(
        checkinService.checkIn('RES-MOCK-001', 4, 1)
      ).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Mock store reset
  // -------------------------------------------------------------------------
  describe('_resetMockStore', () => {
    it('restores reservations to seed state after a check-in', async () => {
      await checkinService.checkIn('RES-MOCK-001', 4, 1);

      // After reset the reservation should be Booked again
      checkinService._resetMockStore();

      // Checking in again should succeed (i.e. status is 'Booked')
      await expect(
        checkinService.checkIn('RES-MOCK-001', 4, 1)
      ).resolves.toBeUndefined();
    });
  });
});
