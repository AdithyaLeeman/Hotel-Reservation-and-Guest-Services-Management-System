import {
  serviceUsageRepository,
  type LogServiceUsageInput,
  type CreateCatalogueItemInput,
  type ServiceUsageBreakdownRow,
} from '@/repositories/service-usage.repository';
import type { ServiceCatalogue, ServiceUsage } from '@/types/domain';

// ServiceUsageServiceError - structured error for route handler mapping

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

// Service

export const serviceUsageService = {
  // List all Active service catalogue items, ordered alphabetically.
  listCatalogue: async (): Promise<ServiceCatalogue[]> => {
    return serviceUsageRepository.listCatalogue();
  },

  // Add a new item to the service catalogue.
  // Only Managers and Admins may call this endpoint (enforced in route handler).
  addCatalogueItem: async (input: CreateCatalogueItemInput): Promise<ServiceCatalogue> => {
    try {
      return await serviceUsageRepository.insertCatalogueItem(input);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      // SQLSTATE 23505 - PostgreSQL unique_violation (service_name UNIQUE constraint)
      if (pgErr.code === '23505') {
        throw new ServiceUsageServiceError(
          'DUPLICATE_SERVICE_NAME',
          `Service name "${input.service_name}" already exists in the catalogue.`
        );
      }
      throw err;
    }
  },

  // Log a service usage record against a reservation.
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

      // SQLSTATE 23503 - FK / record-missing: reservation not found, room not
      // in reservation, or service_id not found.
      if (pgErr.code === '23503') {
        throw new ServiceUsageServiceError(
          'NOT_FOUND',
          `Reservation, room, or service not found. ${msg}`
        );
      }
      // SQLSTATE 45011 - reservation is not in CheckedIn status
      if (pgErr.code === '45011') {
        throw new ServiceUsageServiceError(
          'NOT_CHECKED_IN',
          `The reservation must be in CheckedIn status to log service usage.`
        );
      }
      // SQLSTATE 45012 - service is Inactive
      if (pgErr.code === '45012') {
        throw new ServiceUsageServiceError(
          'SERVICE_INACTIVE',
          `The requested service is currently inactive and cannot be logged.`
        );
      }
      // SQLSTATE 22023 - quantity < 1
      if (pgErr.code === '22023') {
        throw new ServiceUsageServiceError(
          'INVALID_QUANTITY',
          'Quantity must be at least 1.'
        );
      }

      throw err;
    }
  },

  // List all service usage records for a reservation, with service name and line total.
  listUsageByReservation: async (
    reservationId: string
  ): Promise<ServiceUsageBreakdownRow[]> => {
    return serviceUsageRepository.listUsageByReservation(reservationId);
  },
};
