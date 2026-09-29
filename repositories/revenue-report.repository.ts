
export interface MonthlyRevenueRow {
  branch_id: number;
  branch_name: string;
  revenue_year: number;
  revenue_month: number;
  period_label: string;
  total_invoices: number;
  room_revenue: string;       // NUMERIC(12,2) as string
  service_revenue: string;    // NUMERIC(12,2) as string
  tax_collected: string;      // NUMERIC(12,2) as string
  total_revenue: string;      // NUMERIC(12,2) — grand total
  total_paid: string;         // NUMERIC(12,2)
  total_outstanding: string;  // NUMERIC(12,2) — authoritative
}

export interface RevenueReportFilters {
  branchId?: number;
  year?: number;
  month?: number;
}

const INITIAL_MOCK_DATA: MonthlyRevenueRow[] = [
  {
    branch_id: 1,
    branch_name: 'Colombo',
    revenue_year: 2025,
    revenue_month: 12,
    period_label: 'December 2025',
    total_invoices: 2,
    room_revenue: '34000.00',
    service_revenue: '3500.00',
    tax_collected: '2720.00',
    total_revenue: '40220.00',
    total_paid: '23300.00',
    total_outstanding: '16920.00',
  },
  {
    branch_id: 2,
    branch_name: 'Kandy',
    revenue_year: 2025,
    revenue_month: 12,
    period_label: 'December 2025',
    total_invoices: 1,
    room_revenue: '16000.00',
    service_revenue: '3000.00',
    tax_collected: '1280.00',
    total_revenue: '20280.00',
    total_paid: '20280.00',
    total_outstanding: '0.00',
  },
  {
    branch_id: 3,
    branch_name: 'Galle',
    revenue_year: 2025,
    revenue_month: 12,
    period_label: 'December 2025',
    total_invoices: 1,
    room_revenue: '45000.00',
    service_revenue: '0.00',
    tax_collected: '3600.00',
    total_revenue: '48600.00',
    total_paid: '0.00',
    total_outstanding: '48600.00',
  },
  {
    branch_id: 1,
    branch_name: 'Colombo',
    revenue_year: 2025,
    revenue_month: 11,
    period_label: 'November 2025',
    total_invoices: 3,
    room_revenue: '52000.00',
    service_revenue: '4800.00',
    tax_collected: '4160.00',
    total_revenue: '60960.00',
    total_paid: '60960.00',
    total_outstanding: '0.00',
  },
  {
    branch_id: 2,
    branch_name: 'Kandy',
    revenue_year: 2025,
    revenue_month: 11,
    period_label: 'November 2025',
    total_invoices: 2,
    room_revenue: '28000.00',
    service_revenue: '2000.00',
    tax_collected: '2240.00',
    total_revenue: '32240.00',
    total_paid: '32240.00',
    total_outstanding: '0.00',
  },
];

let mockRevenueData: MonthlyRevenueRow[] = [...INITIAL_MOCK_DATA];

export const revenueReportRepository = {

  getMonthlyRevenue: async (
    filters: RevenueReportFilters = {}
  ): Promise<MonthlyRevenueRow[]> => {
    let results = mockRevenueData.slice();

    // 1. Branch filter
    if (filters.branchId !== undefined) {
      results = results.filter((r) => r.branch_id === filters.branchId);
    }

    // 2. Year filter
    if (filters.year !== undefined) {
      results = results.filter((r) => r.revenue_year === filters.year);
    }

    // 3. Month filter
    if (filters.month !== undefined) {
      results = results.filter((r) => r.revenue_month === filters.month);
    }

    return results;
  },

  _resetMockStore: (): void => {
    mockRevenueData = [...INITIAL_MOCK_DATA];
  },
};