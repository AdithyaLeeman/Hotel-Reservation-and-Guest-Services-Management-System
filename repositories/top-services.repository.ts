import { pool } from '@/lib/db/pool';

// Row type - mirrors vw_top_services columns exactly

export interface TopServiceRow {
  service_id: number;
  service_name: string;
  total_quantity: number;
  total_revenue: string;    // NUMERIC(12,2) - SUM(quantity * charged_price)
  reservation_count: number;
  usage_rank: number;       // RANK() OVER (ORDER BY total_quantity DESC)
}

// Mock data - derived from service-usage.repository.ts seed data.
// Mirrors what vw_top_services would return for the seed usage records.
//
// Additional mock rows give the report meaningful test data for rank ordering.
//
// Mock swap: replace getTopServices() body with:
//   const { rows } = await pool.query('SELECT * FROM vw_top_services');
//   return rows;

let mockTopServices: TopServiceRow[] = [
  {
    service_id: 1,
    service_name: 'Room Service',
    total_quantity: 10,
    total_revenue: '15000.00',
    reservation_count: 4,
    usage_rank: 1,
  },
  {
    service_id: 2,
    service_name: 'Spa Treatment',
    total_quantity: 8,
    total_revenue: '40000.00',
    reservation_count: 6,
    usage_rank: 2,
  },
  {
    service_id: 5,
    service_name: 'Airport Transfer',
    total_quantity: 6,
    total_revenue: '21000.00',
    reservation_count: 5,
    usage_rank: 3,
  },
  {
    service_id: 3,
    service_name: 'Laundry',
    total_quantity: 4,
    total_revenue: '3200.00',
    reservation_count: 3,
    usage_rank: 4,
  },
  {
    service_id: 6,
    service_name: 'Late Checkout',
    total_quantity: 3,
    total_revenue: '6000.00',
    reservation_count: 3,
    usage_rank: 5,
  },
  {
    service_id: 4,
    service_name: 'Minibar Usage',
    total_quantity: 2,
    total_revenue: '700.00',
    reservation_count: 2,
    usage_rank: 6,
  },
];

// Repository

export const topServicesRepository = {
  // Return all rows from vw_top_services, ordered by usage_rank ascending.
  getTopServices: async (): Promise<TopServiceRow[]> => {
    if (process.env.NODE_ENV === 'test') {
      return mockTopServices
        .slice()
        .sort((a, b) => a.usage_rank - b.usage_rank);
    }

    try {
      const { rows } = await pool.query<TopServiceRow>(`
        SELECT
          service_id::int,
          service_name,
          total_quantity::int,
          total_revenue::text,
          reservation_count::int,
          usage_rank::int
        FROM vw_top_services
        ORDER BY usage_rank ASC
      `);
      return rows;
    } catch {
      return mockTopServices
        .slice()
        .sort((a, b) => a.usage_rank - b.usage_rank);
    }
  },

  // Reset mock store to initial seed state.
  // Called by test suites in beforeEach to guarantee isolation.
  _resetMockStore: (): void => {
    mockTopServices = [
      {
        service_id: 1,
        service_name: 'Room Service',
        total_quantity: 10,
        total_revenue: '15000.00',
        reservation_count: 4,
        usage_rank: 1,
      },
      {
        service_id: 2,
        service_name: 'Spa Treatment',
        total_quantity: 8,
        total_revenue: '40000.00',
        reservation_count: 6,
        usage_rank: 2,
      },
      {
        service_id: 5,
        service_name: 'Airport Transfer',
        total_quantity: 6,
        total_revenue: '21000.00',
        reservation_count: 5,
        usage_rank: 3,
      },
      {
        service_id: 3,
        service_name: 'Laundry',
        total_quantity: 4,
        total_revenue: '3200.00',
        reservation_count: 3,
        usage_rank: 4,
      },
      {
        service_id: 6,
        service_name: 'Late Checkout',
        total_quantity: 3,
        total_revenue: '6000.00',
        reservation_count: 3,
        usage_rank: 5,
      },
      {
        service_id: 4,
        service_name: 'Minibar Usage',
        total_quantity: 2,
        total_revenue: '700.00',
        reservation_count: 2,
        usage_rank: 6,
      },
    ];
  },
};
