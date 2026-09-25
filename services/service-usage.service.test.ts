/**
 * Service Usage Service Tests (Mock)
 * Task: P04-M04-T11
 *
 * Every task must include tests per AGENTS.md Section 12.
 * Run: npm test -- services/service-usage.service.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { serviceUsageService, ServiceUsageServiceError } from './service-usage.service';
import { serviceUsageRepository } from '@/repositories/service-usage.repository';

describe('Service Usage Service (Mock)', () => {
  beforeEach(() => {
    serviceUsageRepository._resetMockStore();
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
