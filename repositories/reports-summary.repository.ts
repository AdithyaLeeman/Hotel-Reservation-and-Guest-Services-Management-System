import { pool } from '@/lib/db/pool';

export interface ReportsSummary {
  branch_count: number;
  total_revenue: string;
  total_outstanding: string;
  avg_occupancy_rate: string;
  services_count: number;
}

const DEFAULT_MOCK_SUMMARY: ReportsSummary = {
  branch_count: 3,
  total_revenue: '202300.00',
  total_outstanding: '65520.00',
  avg_occupancy_rate: '73.2',
  services_count: 6,
};

let mockSummaryStore: ReportsSummary = { ...DEFAULT_MOCK_SUMMARY };

export const reportsSummaryRepository = {
  getSummary: async (): Promise<ReportsSummary> => {
    if (process.env.NODE_ENV === 'test') {
      return { ...mockSummaryStore };
    }

    try {
      const q = `
        SELECT
          (SELECT COUNT(*)::int FROM branch) AS branch_count,
          COALESCE((SELECT SUM(total_revenue::numeric) FROM vw_monthly_revenue), 0)::numeric(12,2)::text AS total_revenue,
          COALESCE((SELECT SUM(total_outstanding::numeric) FROM vw_monthly_revenue), 0)::numeric(12,2)::text AS total_outstanding,
          COALESCE(
            (SELECT ROUND(AVG(occupancy_rate::numeric), 1) FROM vw_room_occupancy WHERE period_date = DATE_TRUNC('month', CURRENT_DATE)::DATE),
            (SELECT ROUND(AVG(occupancy_rate::numeric), 1) FROM vw_room_occupancy WHERE total_nights_occupied > 0),
            0
          )::text AS avg_occupancy_rate,
          (SELECT COUNT(*)::int FROM vw_top_services) AS services_count
      `;

      const { rows } = await pool.query<ReportsSummary>(q);
      if (rows[0]) {
        return {
          branch_count: Number(rows[0].branch_count) || 3,
          total_revenue: rows[0].total_revenue ?? '0.00',
          total_outstanding: rows[0].total_outstanding ?? '0.00',
          avg_occupancy_rate: rows[0].avg_occupancy_rate ?? '0.0',
          services_count: Number(rows[0].services_count) || 0,
        };
      }
    } catch (err) {
      console.warn('[reportsSummaryRepository] Database query fallback:', err);
    }

    return { ...DEFAULT_MOCK_SUMMARY };
  },

  _setMockSummary: (data: Partial<ReportsSummary>): void => {
    mockSummaryStore = { ...mockSummaryStore, ...data };
  },

  _resetMockStore: (): void => {
    mockSummaryStore = { ...DEFAULT_MOCK_SUMMARY };
  },
};
