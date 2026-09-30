
/**
 * Occupancy Report Repository — P05-M02-T02
 *
 * Mock-first implementation that will query `vw_room_occupancy` once the
 * view is executed on the live DB (after SP3–SP4 are complete).
 *
 * TODO (Phase 6 wire-up — P06-M02-T01):
 *   Replace the mock store with:
 *     const { rows } = await pool.query<OccupancyReportRow>(
 *       `SELECT * FROM vw_room_occupancy
 *         WHERE ($1::int  IS NULL OR branch_id   = $1)
 *           AND ($2::date IS NULL OR period_date >= $2)
 *           AND ($3::date IS NULL OR period_date <= $3)
 *           AND ($4::text IS NULL OR room_status  = $4)
 *        ORDER BY branch_id, period_date`,
 *       [filters.branchId ?? null, filters.fromDate ?? null,
 *        filters.toDate ?? null, filters.roomStatus ?? null]
 *     );
 *     return rows;
 */

export interface OccupancyReportRow {
  branch_id: number;
  branch_name: string;
  room_id: number;
  room_number: string;
  room_type_name: string;
  room_status: string;         // 'Available' | 'Occupied' | 'Maintenance'
  period_date: string;         // ISO date string (YYYY-MM-DD)
  total_nights_occupied: number;
  occupancy_rate: string;      // NUMERIC(5,2) as string — percentage
  total_revenue: string;       // NUMERIC(12,2) as string
}

export interface OccupancyReportFilters {
  branchId?: number;
  fromDate?: string;   // YYYY-MM-DD
  toDate?: string;     // YYYY-MM-DD
  roomStatus?: string; // 'Available' | 'Occupied' | 'Maintenance'
}

const INITIAL_MOCK_DATA: OccupancyReportRow[] = [
  // ── Colombo branch ────────────────────────────────────────────────────────
  {
    branch_id: 1,
    branch_name: 'Colombo',
    room_id: 1,
    room_number: '101',
    room_type_name: 'Standard',
    room_status: 'Occupied',
    period_date: '2025-12-01',
    total_nights_occupied: 20,
    occupancy_rate: '64.52',
    total_revenue: '40000.00',
  },
  {
    branch_id: 1,
    branch_name: 'Colombo',
    room_id: 2,
    room_number: '102',
    room_type_name: 'Deluxe',
    room_status: 'Available',
    period_date: '2025-12-01',
    total_nights_occupied: 12,
    occupancy_rate: '38.71',
    total_revenue: '24000.00',
  },
  {
    branch_id: 1,
    branch_name: 'Colombo',
    room_id: 3,
    room_number: '201',
    room_type_name: 'Suite',
    room_status: 'Maintenance',
    period_date: '2025-12-01',
    total_nights_occupied: 0,
    occupancy_rate: '0.00',
    total_revenue: '0.00',
  },
  // ── Kandy branch ──────────────────────────────────────────────────────────
  {
    branch_id: 2,
    branch_name: 'Kandy',
    room_id: 6,
    room_number: '101',
    room_type_name: 'Standard',
    room_status: 'Occupied',
    period_date: '2025-12-01',
    total_nights_occupied: 28,
    occupancy_rate: '90.32',
    total_revenue: '56000.00',
  },
  {
    branch_id: 2,
    branch_name: 'Kandy',
    room_id: 7,
    room_number: '102',
    room_type_name: 'Deluxe',
    room_status: 'Available',
    period_date: '2025-12-01',
    total_nights_occupied: 8,
    occupancy_rate: '25.81',
    total_revenue: '16000.00',
  },
  // ── Galle branch ──────────────────────────────────────────────────────────
  {
    branch_id: 3,
    branch_name: 'Galle',
    room_id: 11,
    room_number: '101',
    room_type_name: 'Suite',
    room_status: 'Occupied',
    period_date: '2025-12-01',
    total_nights_occupied: 15,
    occupancy_rate: '48.39',
    total_revenue: '75000.00',
  },
  {
    branch_id: 3,
    branch_name: 'Galle',
    room_id: 12,
    room_number: '102',
    room_type_name: 'Standard',
    room_status: 'Available',
    period_date: '2025-12-01',
    total_nights_occupied: 5,
    occupancy_rate: '16.13',
    total_revenue: '10000.00',
  },
];

let mockOccupancyData: OccupancyReportRow[] = [...INITIAL_MOCK_DATA];

export const occupancyReportRepository = {

  getOccupancyReport: async (
    filters: OccupancyReportFilters = {}
  ): Promise<OccupancyReportRow[]> => {
    let results = mockOccupancyData.slice();

    // 1. Branch filter
    if (filters.branchId !== undefined) {
      results = results.filter((r) => r.branch_id === filters.branchId);
    }

    // 2. From-date filter (inclusive)
    if (filters.fromDate !== undefined) {
      results = results.filter((r) => r.period_date >= filters.fromDate!);
    }

    // 3. To-date filter (inclusive)
    if (filters.toDate !== undefined) {
      results = results.filter((r) => r.period_date <= filters.toDate!);
    }

    // 4. Room status filter
    if (filters.roomStatus !== undefined) {
      results = results.filter(
        (r) => r.room_status.toLowerCase() === filters.roomStatus!.toLowerCase()
      );
    }

    return results;
  },

  /** Test helper — resets mock store to initial seed data. */
  _resetMockStore: (): void => {
    mockOccupancyData = [...INITIAL_MOCK_DATA];
  },
};
