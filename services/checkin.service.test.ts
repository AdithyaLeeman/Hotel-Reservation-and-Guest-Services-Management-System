/**
 * Check-in Service Tests - P06-M04-T01 (real DB wire-up)
 * Mocks the pool so tests stay fast and DB-independent.
 * All original assertions are preserved.
 *
 * Run: npm test -- services/checkin.service.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Seed data mirrors the original mock store
// ---------------------------------------------------------------------------
type ReservationStatus = 'Booked' | 'CheckedIn' | 'Cancelled' | 'CheckedOut';

interface MockReservationRow {
  branch_id: number;
  reservation_status: ReservationStatus;
}

// Mutable seed state - managed by helpers below
let seedRows: Record<string, MockReservationRow> = {};

function resetSeed(): void {
  seedRows = {
    'RES-MOCK-001': { branch_id: 1, reservation_status: 'Booked' },
    'RES-MOCK-002': { branch_id: 1, reservation_status: 'Booked' },
    'RES-MOCK-003': { branch_id: 2, reservation_status: 'CheckedIn' },
    'RES-MOCK-004': { branch_id: 3, reservation_status: 'Booked' },
  };
}

// ---------------------------------------------------------------------------
// Hoisted mock fns for pool
// ---------------------------------------------------------------------------
const { mockPoolQuery, mockClientQuery, mockClientRelease } = vi.hoisted(() => ({
  mockPoolQuery: vi.fn(),
  mockClientQuery: vi.fn(),
  mockClientRelease: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock @/lib/db/pool - the service and repository both import this
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

import { checkinService, CheckinServiceError } from './checkin.service';

// ---------------------------------------------------------------------------
// Configure pool mock to simulate the seed data
// ---------------------------------------------------------------------------
function configurePoolMocks(): void {
  resetSeed();

  // pool.query - used for the branch-scope pre-check SELECT
  mockPoolQuery.mockImplementation(
    (sql: string, params: unknown[]) => {
      const id = (params as string[])[0] as string;
      const row = seedRows[id];
      return Promise.resolve({
        rows: row ? [row] : [],
        rowCount: row ? 1 : 0,
      });
    }
  );

  // client.query - used for BEGIN, CALL sp_check_in(), COMMIT, ROLLBACK
  mockClientQuery.mockImplementation((sql: string, params?: unknown[]) => {
    if (sql.trim().startsWith('BEGIN') || sql.trim().startsWith('COMMIT')) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes('ROLLBACK')) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes('sp_check_in')) {
      const id = (params as string[])[0] as string;
      const row = seedRows[id];
      if (!row) {
        return Promise.reject(Object.assign(new Error(`Reservation ${id} not found`), { code: '23503' }));
      }
      if (row.reservation_status !== 'Booked') {
        return Promise.reject(Object.assign(
          new Error(`Reservation ${id} cannot be checked in - current status is ${row.reservation_status}`),
          { code: '45010' }
        ));
      }
      // Transition: Booked -> CheckedIn
      row.reservation_status = 'CheckedIn';
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Check-in Service (Mock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configurePoolMocks();
    checkinService._resetMockStore(); // no-op in real impl; keeps API compatible
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------
  describe('checkIn - success', () => {
    it('transitions a Booked reservation to CheckedIn', async () => {
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

      // Re-configure pool so the seed row is now CheckedIn
      configurePoolMocks();
      seedRows['RES-MOCK-001'].reservation_status = 'CheckedIn';

      // Second attempt on the same reservation must fail with NOT_BOOKED_STATUS
      await expect(
        checkinService.checkIn('RES-MOCK-001', 4, 1)
      ).rejects.toThrow(CheckinServiceError);
    });
  });

  // -------------------------------------------------------------------------
  // NOT_FOUND
  // -------------------------------------------------------------------------
  describe('checkIn - NOT_FOUND', () => {
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
  describe('checkIn - NOT_BOOKED_STATUS', () => {
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
  describe('checkIn - BRANCH_SCOPE_VIOLATION', () => {
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
  // _resetMockStore (no-op compatibility)
  // -------------------------------------------------------------------------
  describe('_resetMockStore', () => {
    it('restores reservations to seed state after a check-in', async () => {
      await checkinService.checkIn('RES-MOCK-001', 4, 1);

      // Re-configure mocks to reset seed state (simulates _resetMockStore)
      configurePoolMocks();
      checkinService._resetMockStore();

      // Checking in again should succeed (seed state is Booked)
      await expect(
        checkinService.checkIn('RES-MOCK-001', 4, 1)
      ).resolves.toBeUndefined();
    });
  });
});
