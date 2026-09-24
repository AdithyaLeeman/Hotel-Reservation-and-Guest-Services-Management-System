/**
 * Service Usage Repository — data access layer for service_catalogue and service_usage.
 * Owned by: Member 4 (M4) | Task: P04-M04-T09 (Mock-First)
 *
 * Parallel development mode:
 * Operates with an in-memory mock store representing seed data
 * (6 service catalogue items + sample service usage records).
 *
 * Mock swap plan (Phase 6 / P06-M04-T01):
 * - listCatalogue()           → SELECT * FROM service_catalogue WHERE status = 'Active' ORDER BY service_name
 * - findCatalogueById()       → SELECT * FROM service_catalogue WHERE service_id = $1
 * - insertCatalogueItem()     → INSERT INTO service_catalogue ... RETURNING *
 * - callLogServiceUsage()     → CALL sp_log_service_usage($1,$2,$3,$4,$5,$6)
 * - listUsageByReservation()  → SELECT * FROM vw_service_usage_breakdown WHERE reservation_id = $1
 *
 * DB-first rule: charged_price is NEVER computed in TypeScript.
 * sp_log_service_usage() snapshots service_catalogue.current_price into
 * service_usage.charged_price at the moment of logging.
 * See docs/08_business-rules-and-enforcement.md — Calculation Placement Matrix.
 */

import type { ServiceCatalogue, ServiceUsage } from '@/types/domain';
import type { ServiceCatalogueStatus } from '@/types/enums';

// ---------------------------------------------------------------------------
// Input / extended types
// ---------------------------------------------------------------------------

export interface LogServiceUsageInput {
  reservation_id: string;
  room_id: number;
  service_id: number;
  quantity: number;
  logged_by_employee_id: number;
  request_channel?: string | null;
}

export interface CreateCatalogueItemInput {
  service_name: string;
  current_price: string; // NUMERIC(12,2) as string — never a JS float
  status?: ServiceCatalogueStatus;
}

export interface ServiceUsageBreakdownRow extends ServiceUsage {
  service_name: string; // joined from service_catalogue
  line_total: string;   // charged_price * quantity — computed by vw_service_usage_breakdown in real DB
}

// ---------------------------------------------------------------------------
// Mock seed data — mirrors database/seeds/P04-M04-T02_seed_services.sql
// 6 services as defined in .agent/members/member-4.md
// ---------------------------------------------------------------------------

const MOCK_CATALOGUE: ServiceCatalogue[] = [
  { service_id: 1, service_name: 'Room Service',     current_price: '1500.00', status: 'Active' },
  { service_id: 2, service_name: 'Spa Treatment',    current_price: '5000.00', status: 'Active' },
  { service_id: 3, service_name: 'Laundry',          current_price:  '800.00', status: 'Active' },
  { service_id: 4, service_name: 'Minibar Usage',    current_price:  '350.00', status: 'Active' },
  { service_id: 5, service_name: 'Airport Transfer', current_price: '3500.00', status: 'Active' },
  /**
   * service_id=6 is SYSTEM-RESERVED for Late Checkout.
   * Do NOT change its service_id — referenced by sp_check_in() implicitly.
   * See .agent/members/member-4.md — "6 Services to Seed".
   */
  { service_id: 6, service_name: 'Late Checkout',    current_price: '2000.00', status: 'Active' },
];

// Mock usage records — sample data for reservation 'RES-MOCK-001'
let mockUsageRecords: ServiceUsage[] = [
  {
    usage_id: 1,
    room_id: 4,
    reservation_id: 'RES-MOCK-001',
    service_id: 1,
    usage_date: '2026-09-15',
    quantity: 2,
    charged_price: '1500.00', // price snapshot — immutable
    logged_by_employee_id: 10,
    request_channel: 'Phone',
  },
  {
    usage_id: 2,
    room_id: 4,
    reservation_id: 'RES-MOCK-001',
    service_id: 3,
    usage_date: '2026-09-16',
    quantity: 1,
    charged_price: '800.00',
    logged_by_employee_id: 10,
    request_channel: null,
  },
];

let nextUsageId = 3;
let nextCatalogueId = 7;

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const serviceUsageRepository = {
  /**
   * List all Active catalogue items, ordered alphabetically by name.
   *
   * Mock swap: SELECT * FROM service_catalogue WHERE status = 'Active' ORDER BY service_name
   */
  listCatalogue: async (): Promise<ServiceCatalogue[]> => {
    return MOCK_CATALOGUE
      .filter((s) => s.status === 'Active')
      .map((s) => ({ ...s }))
      .sort((a, b) => a.service_name.localeCompare(b.service_name));
  },

  /**
   * Find a single catalogue item by its primary key.
   *
   * Mock swap: SELECT * FROM service_catalogue WHERE service_id = $1
   */
  findCatalogueById: async (serviceId: number): Promise<ServiceCatalogue | null> => {
    const found = MOCK_CATALOGUE.find((s) => s.service_id === serviceId);
    return found ? { ...found } : null;
  },

  /**
   * Insert a new service catalogue item.
   * Throws if a service with the same name already exists (mirrors UNIQUE constraint).
   *
   * Mock swap: INSERT INTO service_catalogue (service_name, current_price, status)
   *            VALUES ($1, $2, $3) RETURNING *
   */
  insertCatalogueItem: async (input: CreateCatalogueItemInput): Promise<ServiceCatalogue> => {
    const duplicate = MOCK_CATALOGUE.find(
      (s) => s.service_name.toLowerCase() === input.service_name.toLowerCase()
    );
    if (duplicate) {
      throw new Error(
        `Service "${input.service_name}" already exists in the catalogue (UNIQUE violation)`
      );
    }

    const newItem: ServiceCatalogue = {
      service_id: nextCatalogueId++,
      service_name: input.service_name,
      current_price: input.current_price,
      status: input.status ?? 'Active',
    };

    MOCK_CATALOGUE.push(newItem);
    return { ...newItem };
  },

  /**
   * Log a service usage record against a reservation.
   *
   * IMPORTANT — DB-first price snapshot rule:
   * The real implementation calls sp_log_service_usage() which copies
   * service_catalogue.current_price into service_usage.charged_price at the
   * moment of logging. That price is NEVER recomputed later.
   * The mock replicates this by reading the current catalogue price at call time
   * and storing it as an immutable snapshot.
   *
   * Mock swap: CALL sp_log_service_usage($1, $2, $3, $4, $5, $6)
   *
   * Error states (replicated by real SP):
   * - SQLSTATE '45011': reservation not in CheckedIn status
   * - SQLSTATE '23503': service_id or room_id does not exist (FK violation)
   */
  callLogServiceUsage: async (params: LogServiceUsageInput): Promise<ServiceUsage> => {
    const catalogueItem = MOCK_CATALOGUE.find((s) => s.service_id === params.service_id);
    if (!catalogueItem) {
      throw new Error(`Service with ID ${params.service_id} not found in catalogue`);
    }
    if (catalogueItem.status === 'Inactive') {
      throw new Error(`Service "${catalogueItem.service_name}" is Inactive and cannot be logged`);
    }
    if (params.quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    // Snapshot current_price at log time — mirrors sp_log_service_usage() behaviour.
    // DO NOT compute charged_price * quantity here — that belongs to vw_service_usage_breakdown.
    const newUsage: ServiceUsage = {
      usage_id: nextUsageId++,
      room_id: params.room_id,
      reservation_id: params.reservation_id,
      service_id: params.service_id,
      usage_date: new Date().toISOString().split('T')[0],
      quantity: params.quantity,
      charged_price: catalogueItem.current_price, // price snapshot — immutable after this point
      logged_by_employee_id: params.logged_by_employee_id,
      request_channel: params.request_channel ?? null,
    };

    mockUsageRecords.push(newUsage);
    return { ...newUsage };
  },

  /**
   * List all service usage records for a reservation, joined with catalogue details.
   * Ordered by usage_date ascending then usage_id ascending.
   *
   * Mock swap: SELECT * FROM vw_service_usage_breakdown WHERE reservation_id = $1
   *            ORDER BY usage_date, usage_id
   *
   * Note: line_total is computed inside vw_service_usage_breakdown in the real DB.
   * The mock computes it here only to satisfy the UI contract.
   * The authoritative total is fn_calc_service_charges(reservation_id).
   */
  listUsageByReservation: async (reservationId: string): Promise<ServiceUsageBreakdownRow[]> => {
    return mockUsageRecords
      .filter((u) => u.reservation_id === reservationId)
      .sort((a, b) => {
        if (a.usage_date !== b.usage_date) {
          return a.usage_date < b.usage_date ? -1 : 1;
        }
        return a.usage_id - b.usage_id;
      })
      .map((u) => {
        const catalogueItem = MOCK_CATALOGUE.find((s) => s.service_id === u.service_id);
        return {
          ...u,
          service_name: catalogueItem?.service_name ?? 'Unknown',
          // line_total mirrors vw_service_usage_breakdown: charged_price * quantity
          line_total: (parseFloat(u.charged_price) * u.quantity).toFixed(2),
        };
      });
  },

  /**
   * Reset mock stores to initial seed state.
   * Used by test suites (beforeEach).
   */
  _resetMockStore: (): void => {
    mockUsageRecords = [
      {
        usage_id: 1,
        room_id: 4,
        reservation_id: 'RES-MOCK-001',
        service_id: 1,
        usage_date: '2026-09-15',
        quantity: 2,
        charged_price: '1500.00',
        logged_by_employee_id: 10,
        request_channel: 'Phone',
      },
      {
        usage_id: 2,
        room_id: 4,
        reservation_id: 'RES-MOCK-001',
        service_id: 3,
        usage_date: '2026-09-16',
        quantity: 1,
        charged_price: '800.00',
        logged_by_employee_id: 10,
        request_channel: null,
      },
    ];
    nextUsageId = 3;
    nextCatalogueId = 7;

    // Trim any test-inserted catalogue items
    if (MOCK_CATALOGUE.length > 6) {
      MOCK_CATALOGUE.splice(6);
    }
    // Restore all seed rows to original values
    MOCK_CATALOGUE[0] = { service_id: 1, service_name: 'Room Service',     current_price: '1500.00', status: 'Active' };
    MOCK_CATALOGUE[1] = { service_id: 2, service_name: 'Spa Treatment',    current_price: '5000.00', status: 'Active' };
    MOCK_CATALOGUE[2] = { service_id: 3, service_name: 'Laundry',          current_price:  '800.00', status: 'Active' };
    MOCK_CATALOGUE[3] = { service_id: 4, service_name: 'Minibar Usage',    current_price:  '350.00', status: 'Active' };
    MOCK_CATALOGUE[4] = { service_id: 5, service_name: 'Airport Transfer', current_price: '3500.00', status: 'Active' };
    MOCK_CATALOGUE[5] = { service_id: 6, service_name: 'Late Checkout',    current_price: '2000.00', status: 'Active' };
  },
};
