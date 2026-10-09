/**
 * Service Usage Repository Tests - P06-M04-T01 (real DB wire-up)
 * Mocks `pool.query` / `pool.connect` so tests stay fast and DB-independent.
 * All original assertions are preserved.
 *
 * Run: npm test -- repositories/service-usage.repository.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Seed data mirrors database/seeds/P04-M04-T02_seed_services.sql
// ---------------------------------------------------------------------------
const SEED_CATALOGUE = [
  { service_id: 1, service_name: 'Room Service',     current_price: '1500.00', status: 'Active' },
  { service_id: 2, service_name: 'Spa Treatment',    current_price: '5000.00', status: 'Active' },
  { service_id: 3, service_name: 'Laundry',          current_price:  '800.00', status: 'Active' },
  { service_id: 4, service_name: 'Minibar Usage',    current_price:  '350.00', status: 'Active' },
  { service_id: 5, service_name: 'Airport Transfer', current_price: '3500.00', status: 'Active' },
  { service_id: 6, service_name: 'Late Checkout',    current_price: '2000.00', status: 'Active' },
];

// Seed usage records (mirrors the original mock store initial data)
const SEED_USAGE = [
  {
    usage_id: 1,
    room_id: 4,
    reservation_id: 'RES-MOCK-001',
    service_id: 1,
    service_name: 'Room Service',
    usage_date: '2026-09-15',
    quantity: 2,
    charged_price: '1500.00',
    line_total: '3000.00',
    request_channel: 'Phone',
    logged_by_employee_id: 10,
  },
  {
    usage_id: 2,
    room_id: 4,
    reservation_id: 'RES-MOCK-001',
    service_id: 3,
    service_name: 'Laundry',
    usage_date: '2026-09-16',
    quantity: 1,
    charged_price: '800.00',
    line_total: '800.00',
    request_channel: null,
    logged_by_employee_id: 10,
  },
];

// Mutable usage row store to simulate INSERT across tests
let usageStore: typeof SEED_USAGE = [];
let nextUsageId = 3;

function resetUsageStore(): void {
  usageStore = SEED_USAGE.map((r) => ({ ...r }));
  nextUsageId = 3;
}

// ---------------------------------------------------------------------------
// Hoisted mock functions
// ---------------------------------------------------------------------------
const { mockPoolQuery, mockClientQuery, mockClientRelease } = vi.hoisted(() => ({
  mockPoolQuery:   vi.fn(),
  mockClientQuery: vi.fn(),
  mockClientRelease: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock @/lib/db/pool
// ---------------------------------------------------------------------------
vi.mock('@/lib/db/pool', () => ({
  pool: {
    query:   mockPoolQuery,
    connect: vi.fn(() =>
      Promise.resolve({
        query:   mockClientQuery,
        release: mockClientRelease,
      })
    ),
  },
}));

import { serviceUsageRepository } from './service-usage.repository';

// ---------------------------------------------------------------------------
// Configure pool mocks with seed behavior
// ---------------------------------------------------------------------------
function configureMocks(): void {
  resetUsageStore();

  // pool.query - handles SELECT queries (listCatalogue, findCatalogueById,
  //              INSERT catalogue, listUsageByReservation)
  mockPoolQuery.mockImplementation((sql: string, params?: unknown[]) => {
    // listCatalogue: SELECT ... WHERE status = 'Active' ORDER BY service_name
    if (sql.includes('FROM service_catalogue') && sql.includes("status = 'Active'")) {
      const rows = [...SEED_CATALOGUE]
        .filter((s) => s.status === 'Active')
        .sort((a, b) => a.service_name.localeCompare(b.service_name))
        .map((s) => ({ ...s })); // deep copy - matches real DB result (fresh rows each call)
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    // findCatalogueById: SELECT ... WHERE service_id = $1
    if (sql.includes('FROM service_catalogue') && sql.includes('service_id = $1')) {
      const id = Number((params as unknown[])[0]);
      const found = SEED_CATALOGUE.find((s) => s.service_id === id);
      return Promise.resolve({ rows: found ? [{ ...found }] : [], rowCount: found ? 1 : 0 });
    }

    // insertCatalogueItem: INSERT INTO service_catalogue ... RETURNING *
    if (sql.includes('INSERT INTO service_catalogue')) {
      const name  = (params as string[])[0];
      const price = (params as string[])[1];
      const status = (params as string[])[2] ?? 'Active';
      // Simulate UNIQUE constraint on service_name (case-insensitive check)
      const dup = SEED_CATALOGUE.find(
        (s) => s.service_name.toLowerCase() === name.toLowerCase()
      );
      if (dup) {
        return Promise.reject(Object.assign(
          new Error(`duplicate key value violates unique constraint "service_catalogue_service_name_key"`),
          { code: '23505' }
        ));
      }
      const newRow = { service_id: 99, service_name: name, current_price: price, status };
      return Promise.resolve({ rows: [newRow], rowCount: 1 });
    }

    // listUsageByReservation: SELECT ... FROM vw_service_usage_breakdown WHERE reservation_id = $1
    if (sql.includes('vw_service_usage_breakdown')) {
      const id = (params as string[])[0];
      const rows = usageStore
        .filter((r) => r.reservation_id === id)
        .sort((a, b) => {
          if (a.usage_date !== b.usage_date) return a.usage_date < b.usage_date ? -1 : 1;
          return a.usage_id - b.usage_id;
        });
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  // client.query - handles BEGIN, CALL sp_log_service_usage(), SELECT room,
  //                SELECT fetched row, COMMIT, ROLLBACK
  mockClientQuery.mockImplementation((sql: string, params?: unknown[]) => {
    const trimmed = sql.trim();

    if (trimmed === 'BEGIN' || trimmed === 'COMMIT' || trimmed === 'ROLLBACK') {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    // Resolve room_id - SELECT room_id FROM reservation_rooms
    if (sql.includes('FROM reservation_rooms') && sql.includes('LIMIT 1')) {
      // Return a default room_id for any reservation in tests
      return Promise.resolve({ rows: [{ room_id: 1 }], rowCount: 1 });
    }

    // CALL sp_log_service_usage
    if (sql.includes('sp_log_service_usage')) {
      const reservationId = (params as unknown[])[0] as string;
      const serviceId     = Number((params as unknown[])[2]);
      const quantity      = Number((params as unknown[])[3]);
      const employeeId    = Number((params as unknown[])[4]);
      const channel       = ((params as unknown[])[5] as string | null) ?? null;

      if (quantity < 1) {
        return Promise.reject(Object.assign(
          new Error('Quantity must be at least 1'),
          { code: '22023' }
        ));
      }
      const svc = SEED_CATALOGUE.find((s) => s.service_id === serviceId);
      if (!svc) {
        return Promise.reject(Object.assign(
          new Error(`Service ${serviceId} not found`),
          { code: '23503' }
        ));
      }
      // Stage the new usage row for the follow-up SELECT
      const uid = nextUsageId++;
      usageStore.push({
        usage_id: uid,
        room_id: 1,
        reservation_id: reservationId,
        service_id: serviceId,
        service_name: svc.service_name,
        usage_date: new Date().toISOString().split('T')[0],
        quantity,
        charged_price: svc.current_price,
        line_total: (parseFloat(svc.current_price) * quantity).toFixed(2),
        request_channel: channel,
        logged_by_employee_id: employeeId,
      });
      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    // Fetch inserted row - SELECT ... FROM service_usage WHERE reservation_id = $1 ...
    if (sql.includes('FROM service_usage') && sql.includes('ORDER BY usage_id DESC')) {
      const reservationId = (params as unknown[])[0] as string;
      const serviceId     = Number((params as unknown[])[1]);
      const employeeId    = Number((params as unknown[])[2]);
      const row = [...usageStore]
        .filter(
          (r) =>
            r.reservation_id === reservationId &&
            r.service_id      === serviceId &&
            r.logged_by_employee_id === employeeId
        )
        .sort((a, b) => b.usage_id - a.usage_id)[0];
      return Promise.resolve({ rows: row ? [row] : [], rowCount: row ? 1 : 0 });
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Service Usage Repository (Mock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureMocks();
    serviceUsageRepository._resetMockStore(); // no-op; API compatible
  });

  // -------------------------------------------------------------------------
  // listCatalogue
  // -------------------------------------------------------------------------
  describe('listCatalogue', () => {
    it('returns only Active catalogue items', async () => {
      const items = await serviceUsageRepository.listCatalogue();
      expect(items.every((s) => s.status === 'Active')).toBe(true);
    });

    it('returns all 6 seeded services', async () => {
      const items = await serviceUsageRepository.listCatalogue();
      expect(items).toHaveLength(6);
    });

    it('returns items ordered alphabetically by service_name', async () => {
      const items = await serviceUsageRepository.listCatalogue();
      const names = items.map((s) => s.service_name);
      expect(names).toEqual([...names].sort());
    });

    it('returns copies - mutating result does not affect store', async () => {
      const items = await serviceUsageRepository.listCatalogue();
      items[0].service_name = 'MUTATED';
      const fresh = await serviceUsageRepository.listCatalogue();
      expect(fresh.some((s) => s.service_name === 'MUTATED')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // findCatalogueById
  // -------------------------------------------------------------------------
  describe('findCatalogueById', () => {
    it('returns the correct catalogue item by ID', async () => {
      const item = await serviceUsageRepository.findCatalogueById(2);
      expect(item).toBeDefined();
      expect(item?.service_name).toBe('Spa Treatment');
      expect(item?.current_price).toBe('5000.00');
    });

    it('returns null for a non-existent service ID', async () => {
      const item = await serviceUsageRepository.findCatalogueById(999);
      expect(item).toBeNull();
    });

    it('service_id=6 is Late Checkout (system-reserved)', async () => {
      const item = await serviceUsageRepository.findCatalogueById(6);
      expect(item?.service_name).toBe('Late Checkout');
    });
  });

  // -------------------------------------------------------------------------
  // insertCatalogueItem
  // -------------------------------------------------------------------------
  describe('insertCatalogueItem', () => {
    it('inserts a new catalogue item and returns it', async () => {
      const newItem = await serviceUsageRepository.insertCatalogueItem({
        service_name: 'Breakfast Buffet',
        current_price: '1200.00',
      });

      expect(newItem.service_id).toBeDefined();
      expect(newItem.service_name).toBe('Breakfast Buffet');
      expect(newItem.current_price).toBe('1200.00');
      expect(newItem.status).toBe('Active');
    });

    it('defaults status to Active if not provided', async () => {
      const newItem = await serviceUsageRepository.insertCatalogueItem({
        service_name: 'Pool Access',
        current_price: '500.00',
      });
      expect(newItem.status).toBe('Active');
    });

    it('throws on duplicate service name (case-insensitive UNIQUE constraint)', async () => {
      // The mock simulates SQLSTATE 23505 for duplicate names
      await expect(
        serviceUsageRepository.insertCatalogueItem({
          service_name: 'room service', // case-insensitive match
          current_price: '9999.00',
        })
      ).rejects.toMatchObject({ code: '23505' });
    });
  });

  // -------------------------------------------------------------------------
  // callLogServiceUsage (price snapshot rule)
  // -------------------------------------------------------------------------
  describe('callLogServiceUsage', () => {
    it('creates a usage record with a price snapshot from the catalogue', async () => {
      const usage = await serviceUsageRepository.callLogServiceUsage({
        reservation_id: 'RES-MOCK-002',
        room_id: 5,
        service_id: 2, // Spa Treatment: 5000.00
        quantity: 1,
        logged_by_employee_id: 20,
      });

      expect(usage.usage_id).toBeDefined();
      expect(usage.reservation_id).toBe('RES-MOCK-002');
      expect(usage.service_id).toBe(2);
      expect(usage.quantity).toBe(1);
      // Price snapshot must equal catalogue price at log time
      expect(usage.charged_price).toBe('5000.00');
      expect(usage.logged_by_employee_id).toBe(20);
    });

    it('price snapshot is immutable - catalogue price change does not affect logged record', async () => {
      // Log at current price
      const usage = await serviceUsageRepository.callLogServiceUsage({
        reservation_id: 'RES-MOCK-003',
        room_id: 5,
        service_id: 1, // Room Service: 1500.00
        quantity: 1,
        logged_by_employee_id: 20,
      });
      expect(usage.charged_price).toBe('1500.00');

      // Simulate catalogue price update (future price change)
      const item = await serviceUsageRepository.findCatalogueById(1);
      if (item) {
        // Even if we mutate the returned copy, the logged snapshot is unchanged
        item.current_price = '9999.00';
      }

      // Retrieve the logged record - price must still be the snapshot
      const records = await serviceUsageRepository.listUsageByReservation('RES-MOCK-003');
      expect(records[0].charged_price).toBe('1500.00');
    });

    it('throws if service_id does not exist', async () => {
      await expect(
        serviceUsageRepository.callLogServiceUsage({
          reservation_id: 'RES-MOCK-004',
          room_id: 1,
          service_id: 999,
          quantity: 1,
          logged_by_employee_id: 10,
        })
      ).rejects.toMatchObject({ code: '23503' });
    });

    it('throws if quantity is less than 1', async () => {
      await expect(
        serviceUsageRepository.callLogServiceUsage({
          reservation_id: 'RES-MOCK-004',
          room_id: 1,
          service_id: 1,
          quantity: 0,
          logged_by_employee_id: 10,
        })
      ).rejects.toMatchObject({ code: '22023' });
    });

    it('allows logging multiple services against the same reservation', async () => {
      await serviceUsageRepository.callLogServiceUsage({
        reservation_id: 'RES-MOCK-005',
        room_id: 2,
        service_id: 1,
        quantity: 3,
        logged_by_employee_id: 10,
      });
      await serviceUsageRepository.callLogServiceUsage({
        reservation_id: 'RES-MOCK-005',
        room_id: 2,
        service_id: 4,
        quantity: 2,
        logged_by_employee_id: 10,
      });

      const records = await serviceUsageRepository.listUsageByReservation('RES-MOCK-005');
      expect(records).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // listUsageByReservation
  // -------------------------------------------------------------------------
  describe('listUsageByReservation', () => {
    it('returns all usage records for a given reservation', async () => {
      const records = await serviceUsageRepository.listUsageByReservation('RES-MOCK-001');
      expect(records).toHaveLength(2);
      expect(records.every((r) => r.reservation_id === 'RES-MOCK-001')).toBe(true);
    });

    it('returns empty array for a reservation with no usage', async () => {
      const records = await serviceUsageRepository.listUsageByReservation('RES-NONEXISTENT');
      expect(records).toEqual([]);
    });

    it('includes service_name joined from catalogue', async () => {
      const records = await serviceUsageRepository.listUsageByReservation('RES-MOCK-001');
      expect(records[0].service_name).toBe('Room Service');
      expect(records[1].service_name).toBe('Laundry');
    });

    it('includes correct line_total (charged_price * quantity)', async () => {
      const records = await serviceUsageRepository.listUsageByReservation('RES-MOCK-001');
      // usage_id=1: 1500.00 * 2 = 3000.00
      expect(records.find((r) => r.usage_id === 1)?.line_total).toBe('3000.00');
      // usage_id=2: 800.00 * 1 = 800.00
      expect(records.find((r) => r.usage_id === 2)?.line_total).toBe('800.00');
    });

    it('returns records ordered by usage_date ascending then usage_id', async () => {
      const records = await serviceUsageRepository.listUsageByReservation('RES-MOCK-001');
      expect(records[0].usage_id).toBe(1); // 2026-09-15
      expect(records[1].usage_id).toBe(2); // 2026-09-16
    });
  });
});
