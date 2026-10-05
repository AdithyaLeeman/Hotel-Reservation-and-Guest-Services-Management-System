/**
 * Service Usage Service Tests — P06-M04-T01 (real DB wire-up)
 * Mocks the repository so tests stay fast and DB-independent.
 * All original assertions are preserved.
 *
 * Run: npm test -- services/service-usage.service.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Seed catalogue mirrors database/seeds/P04-M04-T02_seed_services.sql
// ---------------------------------------------------------------------------
const SEED_CATALOGUE = [
  { service_id: 1, service_name: 'Room Service',     current_price: '1500.00', status: 'Active' as const },
  { service_id: 2, service_name: 'Spa Treatment',    current_price: '5000.00', status: 'Active' as const },
  { service_id: 3, service_name: 'Laundry',          current_price:  '800.00', status: 'Active' as const },
  { service_id: 4, service_name: 'Minibar Usage',    current_price:  '350.00', status: 'Active' as const },
  { service_id: 5, service_name: 'Airport Transfer', current_price: '3500.00', status: 'Active' as const },
  { service_id: 6, service_name: 'Late Checkout',    current_price: '2000.00', status: 'Active' as const },
];

// Mutable mock usage rows reset by configureRepoMocks()
let mockUsageRows: Array<{
  usage_id: number;
  room_id: number;
  reservation_id: string;
  service_id: number;
  service_name: string;
  usage_date: string;
  quantity: number;
  charged_price: string;
  line_total: string;
  request_channel: string | null;
  logged_by_employee_id: number;
}> = [];

let nextUsageId = 1;

function resetUsageRows(): void {
  nextUsageId = 1;
  mockUsageRows = [
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
  nextUsageId = 3;
}

// ---------------------------------------------------------------------------
// Hoisted mock fns for repository methods
// ---------------------------------------------------------------------------
const {
  mockListCatalogue,
  mockFindById,
  mockInsertItem,
  mockCallLog,
  mockListUsage,
} = vi.hoisted(() => ({
  mockListCatalogue: vi.fn(),
  mockFindById:      vi.fn(),
  mockInsertItem:    vi.fn(),
  mockCallLog:       vi.fn(),
  mockListUsage:     vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock the repository — service calls go through these fns
// ---------------------------------------------------------------------------
vi.mock('@/repositories/service-usage.repository', () => ({
  serviceUsageRepository: {
    listCatalogue:        mockListCatalogue,
    findCatalogueById:    mockFindById,
    insertCatalogueItem:  mockInsertItem,
    callLogServiceUsage:  mockCallLog,
    listUsageByReservation: mockListUsage,
    _resetMockStore:      vi.fn(),
  },
}));

// Also mock pool for modules that import it directly
vi.mock('@/lib/db/pool', () => ({
  pool: {
    query:   vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: vi.fn(() =>
      Promise.resolve({
        query:   vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: vi.fn(),
      })
    ),
  },
}));

import { serviceUsageService, ServiceUsageServiceError } from './service-usage.service';
import { serviceUsageRepository } from '@/repositories/service-usage.repository';

// ---------------------------------------------------------------------------
// Configure repository mocks with seed behavior
// ---------------------------------------------------------------------------
function configureRepoMocks(): void {
  resetUsageRows();

  const activeCatalogue = SEED_CATALOGUE.filter((s) => s.status === 'Active');

  mockListCatalogue.mockResolvedValue(
    [...activeCatalogue].sort((a, b) => a.service_name.localeCompare(b.service_name))
  );

  mockFindById.mockImplementation((id: number) => {
    const found = SEED_CATALOGUE.find((s) => s.service_id === id);
    return Promise.resolve(found ? { ...found } : null);
  });

  // insertCatalogueItem — simulate UNIQUE violation for duplicates
  mockInsertItem.mockImplementation(
    (input: { service_name: string; current_price: string; status?: string }) => {
      const dup = SEED_CATALOGUE.find(
        (s) => s.service_name.toLowerCase() === input.service_name.toLowerCase()
      );
      if (dup) {
        return Promise.reject(Object.assign(
          new Error(`duplicate key value violates unique constraint "service_catalogue_service_name_key"`),
          { code: '23505' }
        ));
      }
      const newItem = {
        service_id: 99,
        service_name: input.service_name,
        current_price: input.current_price,
        status: (input.status ?? 'Active') as 'Active' | 'Inactive',
      };
      return Promise.resolve(newItem);
    }
  );

  // callLogServiceUsage — simulate sp_log_service_usage behavior
  mockCallLog.mockImplementation(
    (params: {
      reservation_id: string;
      room_id?: number;
      service_id: number;
      quantity: number;
      logged_by_employee_id: number;
      request_channel?: string | null;
    }) => {
      if (params.quantity < 1) {
        return Promise.reject(Object.assign(
          new Error('Quantity must be at least 1'),
          { code: '22023' }
        ));
      }
      const svc = SEED_CATALOGUE.find((s) => s.service_id === params.service_id);
      if (!svc) {
        return Promise.reject(Object.assign(
          new Error(`Service ${params.service_id} not found`),
          { code: '23503' }
        ));
      }
      if (svc.status !== 'Active') {
        return Promise.reject(Object.assign(
          new Error(`Service ${params.service_id} is inactive`),
          { code: '45012' }
        ));
      }
      const row = {
        usage_id: nextUsageId++,
        room_id: params.room_id ?? 1,
        reservation_id: params.reservation_id,
        service_id: params.service_id,
        usage_date: new Date().toISOString().split('T')[0],
        quantity: params.quantity,
        charged_price: svc.current_price, // price snapshot
        logged_by_employee_id: params.logged_by_employee_id,
        request_channel: params.request_channel ?? null,
      };
      return Promise.resolve(row);
    }
  );

  // listUsageByReservation — return rows for the given reservation
  mockListUsage.mockImplementation((reservationId: string) => {
    const rows = mockUsageRows.filter((r) => r.reservation_id === reservationId);
    return Promise.resolve(rows);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Service Usage Service (Mock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureRepoMocks();
    serviceUsageRepository._resetMockStore(); // no-op in real impl; API compatible
  });

  // -------------------------------------------------------------------------
  // listCatalogue
  // -------------------------------------------------------------------------
  describe('listCatalogue', () => {
    it('returns all 6 seeded Active services', async () => {
      const items = await serviceUsageService.listCatalogue();
      expect(items).toHaveLength(6);
      expect(items.every((s) => s.status === 'Active')).toBe(true);
    });

    it('returns items ordered alphabetically', async () => {
      const items = await serviceUsageService.listCatalogue();
      const names = items.map((s) => s.service_name);
      expect(names).toEqual([...names].sort());
    });
  });

  // -------------------------------------------------------------------------
  // addCatalogueItem
  // -------------------------------------------------------------------------
  describe('addCatalogueItem', () => {
    it('adds a new service and returns it', async () => {
      const item = await serviceUsageService.addCatalogueItem({
        service_name: 'Evening Yoga',
        current_price: '2500.00',
        status: 'Active',
      });
      expect(item.service_id).toBeDefined();
      expect(item.service_name).toBe('Evening Yoga');
      expect(item.current_price).toBe('2500.00');
      expect(item.status).toBe('Active');
    });

    it('throws DUPLICATE_SERVICE_NAME for an existing name', async () => {
      await expect(
        serviceUsageService.addCatalogueItem({
          service_name: 'Room Service',
          current_price: '999.00',
          status: 'Active',
        })
      ).rejects.toMatchObject({ code: 'DUPLICATE_SERVICE_NAME' });
    });

    it('error is an instance of ServiceUsageServiceError', async () => {
      await expect(
        serviceUsageService.addCatalogueItem({
          service_name: 'laundry', // case-insensitive match
          current_price: '999.00',
          status: 'Active',
        })
      ).rejects.toBeInstanceOf(ServiceUsageServiceError);
    });
  });

  // -------------------------------------------------------------------------
  // logUsage — price snapshot rule
  // -------------------------------------------------------------------------
  describe('logUsage', () => {
    it('logs usage and returns the record with charged_price snapshot', async () => {
      const usage = await serviceUsageService.logUsage(
        {
          reservation_id: 'RES-TEST-001',
          room_id: 3,
          service_id: 2, // Spa Treatment: 5000.00
          quantity: 1,
          request_channel: 'Phone',
        },
        10
      );

      expect(usage.reservation_id).toBe('RES-TEST-001');
      expect(usage.service_id).toBe(2);
      expect(usage.charged_price).toBe('5000.00'); // price snapshot
      expect(usage.quantity).toBe(1);
      expect(usage.logged_by_employee_id).toBe(10);
    });

    it('charged_price is snapshot — equals catalogue price at log time', async () => {
      // Spa Treatment is 5000.00 in seed data
      const usage = await serviceUsageService.logUsage(
        { reservation_id: 'RES-TEST-002', room_id: 1, service_id: 2, quantity: 3 },
        5
      );
      expect(usage.charged_price).toBe('5000.00');
    });

    it('throws NOT_FOUND for unknown service_id', async () => {
      await expect(
        serviceUsageService.logUsage(
          { reservation_id: 'RES-TEST-003', room_id: 1, service_id: 9999, quantity: 1 },
          5
        )
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('throws INVALID_QUANTITY for quantity < 1', async () => {
      await expect(
        serviceUsageService.logUsage(
          { reservation_id: 'RES-TEST-004', room_id: 1, service_id: 1, quantity: 0 },
          5
        )
      ).rejects.toMatchObject({ code: 'INVALID_QUANTITY' });
    });

    it('allows multiple services on the same reservation', async () => {
      // Pre-populate mockUsageRows for this reservation
      mockListUsage.mockImplementationOnce(() =>
        Promise.resolve([
          { usage_id: 10, reservation_id: 'RES-MULTI', service_id: 1, quantity: 2, charged_price: '1500.00', line_total: '3000.00', room_id: 2, service_name: 'Room Service', usage_date: '2026-10-05', request_channel: null, logged_by_employee_id: 10 },
          { usage_id: 11, reservation_id: 'RES-MULTI', service_id: 4, quantity: 1, charged_price: '350.00',  line_total: '350.00',  room_id: 2, service_name: 'Minibar Usage', usage_date: '2026-10-05', request_channel: null, logged_by_employee_id: 10 },
        ])
      );

      await serviceUsageService.logUsage(
        { reservation_id: 'RES-MULTI', room_id: 2, service_id: 1, quantity: 2 },
        10
      );
      await serviceUsageService.logUsage(
        { reservation_id: 'RES-MULTI', room_id: 2, service_id: 4, quantity: 1 },
        10
      );

      const rows = await serviceUsageService.listUsageByReservation('RES-MULTI');
      expect(rows).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // listUsageByReservation
  // -------------------------------------------------------------------------
  describe('listUsageByReservation', () => {
    it('returns usage rows for RES-MOCK-001 with service_name and line_total', async () => {
      const rows = await serviceUsageService.listUsageByReservation('RES-MOCK-001');
      expect(rows).toHaveLength(2);
      expect(rows[0].service_name).toBeDefined();
      expect(rows[0].line_total).toBeDefined();
    });

    it('returns empty array for unknown reservation', async () => {
      const rows = await serviceUsageService.listUsageByReservation('RES-DOES-NOT-EXIST');
      expect(rows).toEqual([]);
    });

    it('line_total equals charged_price * quantity (UI display, not authoritative)', async () => {
      const rows = await serviceUsageService.listUsageByReservation('RES-MOCK-001');
      // usage_id=1: Room Service 1500.00 * 2 = 3000.00
      const row1 = rows.find((r) => r.usage_id === 1);
      expect(row1?.line_total).toBe('3000.00');
    });
  });
});
