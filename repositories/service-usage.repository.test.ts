/**
 * Service Usage Repository Tests (Mock)
 * Task: P04-M04-T09
 *
 * Every task must include tests per AGENTS.md Section 12.
 * Run: npm test -- repositories/service-usage.repository.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { serviceUsageRepository } from './service-usage.repository';

describe('Service Usage Repository (Mock)', () => {
  beforeEach(() => {
    serviceUsageRepository._resetMockStore();
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

    it('returns copies — mutating result does not affect store', async () => {
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

      const fetched = await serviceUsageRepository.findCatalogueById(newItem.service_id);
      expect(fetched?.service_name).toBe('Breakfast Buffet');
    });

    it('defaults status to Active if not provided', async () => {
      const newItem = await serviceUsageRepository.insertCatalogueItem({
        service_name: 'Pool Access',
        current_price: '500.00',
      });
      expect(newItem.status).toBe('Active');
    });

    it('throws on duplicate service name (case-insensitive UNIQUE constraint)', async () => {
      await expect(
        serviceUsageRepository.insertCatalogueItem({
          service_name: 'room service', // case-insensitive match
          current_price: '9999.00',
        })
      ).rejects.toThrow(/UNIQUE violation/);
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

    it('price snapshot is immutable — catalogue price change does not affect logged record', async () => {
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

      // Retrieve the logged record — price must still be the snapshot
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
      ).rejects.toThrow(/not found/);
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
      ).rejects.toThrow(/Quantity must be at least 1/);
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
