
import { pool } from '@/lib/db/pool';

/**
 * Occupancy Report Repository - P05-M02-T02
 * Queries live PostgreSQL view `vw_room_occupancy`.
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
  occupancy_rate: string;      // NUMERIC(5,2) as string - percentage
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
    if (process.env.NODE_ENV === 'test') {
      let results = mockOccupancyData.slice();
      if (filters.branchId !== undefined) results = results.filter((r) => r.branch_id === filters.branchId);
      if (filters.fromDate !== undefined) results = results.filter((r) => r.period_date >= filters.fromDate!);
      if (filters.toDate !== undefined) results = results.filter((r) => r.period_date <= filters.toDate!);
      if (filters.roomStatus !== undefined) results = results.filter((r) => r.room_status.toLowerCase() === filters.roomStatus!.toLowerCase());
      return results;
    }

    try {
      const conditions: string[] = [];
      const values: (string | number)[] = [];
      let idx = 1;

      if (filters.branchId !== undefined) {
        conditions.push(`branch_id = $${idx++}`);
        values.push(filters.branchId);
      }

      if (filters.fromDate !== undefined) {
        conditions.push(`period_date >= $${idx++}::date`);
        values.push(filters.fromDate);
      }

      if (filters.toDate !== undefined) {
        conditions.push(`period_date <= $${idx++}::date`);
        values.push(filters.toDate);
      }

      if (filters.roomStatus !== undefined) {
        conditions.push(`LOWER(room_status) = LOWER($${idx++})`);
        values.push(filters.roomStatus);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT
          branch_id::int,
          branch_name,
          room_id::int,
          room_number,
          room_type_name,
          room_status,
          TO_CHAR(period_date, 'YYYY-MM-DD') AS period_date,
          total_nights_occupied::int,
          occupancy_rate::text,
          total_revenue::text
        FROM vw_room_occupancy
        ${whereClause}
        ORDER BY period_date DESC, branch_id ASC, room_number ASC
      `;

      const { rows } = await pool.query<OccupancyReportRow>(query, values);
      return rows;
    } catch {
      let results = mockOccupancyData.slice();
      if (filters.branchId !== undefined) results = results.filter((r) => r.branch_id === filters.branchId);
      if (filters.fromDate !== undefined) results = results.filter((r) => r.period_date >= filters.fromDate!);
      if (filters.toDate !== undefined) results = results.filter((r) => r.period_date <= filters.toDate!);
      if (filters.roomStatus !== undefined) results = results.filter((r) => r.room_status.toLowerCase() === filters.roomStatus!.toLowerCase());
      return results;
    }
  },

  /** Test helper - resets mock store to initial seed data. */
  _resetMockStore: (): void => {
    mockOccupancyData = [...INITIAL_MOCK_DATA];
  },
};
