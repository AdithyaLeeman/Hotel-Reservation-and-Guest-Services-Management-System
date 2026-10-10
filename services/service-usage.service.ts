/**
 * Service Usage Service — Real DB Implementation
 *
 * Orchestrates:
 *   - Logging a service usage record against a checked-in reservation.
 *   - Listing the service catalogue.
 *   - Adding a new item to the service catalogue (Manager/Admin only).
 *
 * DB-first rules (MANDATORY — see AGENTS.md Section 5):
 *   - charged_price is NEVER computed in TypeScript.
 *   - sp_log_service_usage() snapshots service_catalogue.current_price
 *     into service_usage.charged_price at the moment of logging.
 *   - fn_calc_service_charges(reservation_id) is the authoritative total;
 *     TypeScript may display line_total from vw_service_usage_breakdown
 *     for UI purposes only.
 *
 * P06-M04-T01 — Delegates to real repository; maps PostgreSQL SQLSTATE codes
 * to structured ServiceUsageServiceError codes:
 *   SQLSTATE 23503 → NOT_FOUND   (FK / record missing)
 *   SQLSTATE 45011 → NOT_CHECKED_IN
 *   SQLSTATE 45012 → SERVICE_INACTIVE
 *   SQLSTATE 22023 → INVALID_QUANTITY
 *   SQLSTATE 23505 → DUPLICATE_SERVICE_NAME
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T11
 * Lecture alignment: L06 (stored procedures), L08 (price snapshot rule)
 */

import {
  serviceUsageRepository,
  type LogServiceUsageInput,
  type CreateCatalogueItemInput,
  type ServiceUsageBreakdownRow,
} from '@/repositories/service-usage.repository';
import type { ServiceCatalogue, ServiceUsage } from '@/types/domain';

// ---------------------------------------------------------------------------
// ServiceUsageServiceError — structured error for route handler mapping
// ---------------------------------------------------------------------------

export class ServiceUsageServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'SERVICE_INACTIVE'
      | 'INVALID_QUANTITY'
      | 'DUPLICATE_SERVICE_NAME'
      | 'NOT_CHECKED_IN',
    message: string
  ) {
    super(message);
    this.name = 'ServiceUsageServiceError';
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const serviceUsageService = {
  /**
   * List all Active service catalogue items, ordered alphabetically.
   *
   * Mock swap: serviceUsageRepository.listCatalogue()
   * → SELECT * FROM service_catalogue WHERE status = 'Active' ORDER BY service_name
   */
  listCatalogue: async (): Promise<ServiceCatalogue[]> => {
    return serviceUsageRepository.listCatalogue();
  },

  /**
   * Add a new item to the service catalogue.
   * Only Managers and Admins may call this endpoint (enforced in route handler).
   *
   * Mock swap: serviceUsageRepository.insertCatalogueItem(input)
   * → INSERT INTO service_catalogue (service_name, current_price, status) VALUES ($1,$2,$3) RETURNING *
   *
   * @throws ServiceUsageServiceError DUPLICATE_SERVICE_NAME if name already exists
   */
  addCatalogueItem: async (input: CreateCatalogueItemInput): Promise<ServiceCatalogue> => {
    try {
      return await serviceUsageRepository.insertCatalogueItem(input);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      // SQLSTATE 23505 — PostgreSQL unique_violation (service_name UNIQUE constraint)
      if (pgErr.code === '23505') {
        throw new ServiceUsageServiceError(
          'DUPLICATE_SERVICE_NAME',
          `Service name "${input.service_name}" already exists in the catalogue.`
        );
      }
      throw err;
    }
  },

  /**
   * Log a service usage record against a reservation.
   *
   * DB-first price snapshot rule:
   *   The mock reads charged_price from MOCK_CATALOGUE at call time and stores
   *   it immutably — exactly what sp_log_service_usage() does in PostgreSQL.
   *   TypeScript MUST NOT compute or override charged_price.
   *
   * Mock swap: serviceUsageRepository.callLogServiceUsage(params)
   * → CALL sp_log_service_usage($1,$2,$3,$4,$5,$6)
   *   Error SQLSTATE '45011' → NOT_CHECKED_IN
   *   Error SQLSTATE '23503' → NOT_FOUND (FK violation)
   *
   * @param params      - Usage details (room, service, quantity, channel).
   * @param employeeId  - From session — the staff member logging the usage.
   * @throws ServiceUsageServiceError NOT_FOUND if service_id is unknown.
   * @throws ServiceUsageServiceError SERVICE_INACTIVE if service is Inactive.
   * @throws ServiceUsageServiceError INVALID_QUANTITY if quantity < 1.
   */
  logUsage: async (
    params: Omit<LogServiceUsageInput, 'logged_by_employee_id'>,
    employeeId: number
  ): Promise<ServiceUsage> => {
    try {
      return await serviceUsageRepository.callLogServiceUsage({
        ...params,
        logged_by_employee_id: employeeId,
      });
    } catch (err: unknown) {
      const pgErr = err as { code?: string; message?: string };
      const msg   = pgErr.message ?? (err instanceof Error ? err.message : String(err));

      // SQLSTATE 23503 — FK / record-missing: reservation not found, room not
      // in reservation, or service_id not found.
      if (pgErr.code === '23503') {
        throw new ServiceUsageServiceError(
          'NOT_FOUND',
          `Reservation, room, or service not found. ${msg}`
        );
      }
      // SQLSTATE 45011 — reservation is not in CheckedIn status
      if (pgErr.code === '45011') {
        throw new ServiceUsageServiceError(
          'NOT_CHECKED_IN',
          `The reservation must be in CheckedIn status to log service usage.`
        );
      }
      // SQLSTATE 45012 — service is Inactive
      if (pgErr.code === '45012') {
        throw new ServiceUsageServiceError(
          'SERVICE_INACTIVE',
          `The requested service is currently inactive and cannot be logged.`
        );
      }
      // SQLSTATE 22023 — quantity < 1
      if (pgErr.code === '22023') {
        throw new ServiceUsageServiceError(
          'INVALID_QUANTITY',
          'Quantity must be at least 1.'
        );
      }

      throw err;
    }
  },

  /**
   * List all service usage records for a reservation, with service name and line total.
   *
   * NOTE: line_total in the result is computed by the mock for UI display only.
   * The authoritative service charge total is fn_calc_service_charges(reservation_id)
   * — never recompute it in TypeScript.
   *
   * Mock swap: serviceUsageRepository.listUsageByReservation(reservationId)
   * → SELECT * FROM vw_service_usage_breakdown WHERE reservation_id = $1
   */
  listUsageByReservation: async (
    reservationId: string
  ): Promise<ServiceUsageBreakdownRow[]> => {
    return serviceUsageRepository.listUsageByReservation(reservationId);
  },
};
