/**
 * Dashboard Repository — live database metrics and activity for Staff Dashboard
 *
 * DB-first: All metrics derived from PostgreSQL queries and vw_audit_log.
 * No hardcoded or mock figures.
 */

import { pool } from '@/lib/db/pool';

export interface EmployeeInfo {
  fullName: string;
  position: string | null;
  branchName: string | null;
}

export interface ReceptionistKpiData {
  arrivals: number;
  departures: number;
  occupiedRooms: number;
  totalRooms: number;
  maintenanceRooms: number;
}

export interface ManagerKpiData {
  occupiedRooms: number;
  totalRooms: number;
  todayRevenue: string;
  totalRevenue: string;
  pendingCheckout: number;
  cancelledTotal: number;
}

export interface DashboardActivity {
  auditId: string;
  reservationId: string;
  guestFullName: string;
  branchLocationName: string;
  oldStatus: string | null;
  newStatus: string;
  changedAt: Date;
  changedByName: string | null;
  actorRole: string;
}

export const dashboardRepository = {
  /**
   * Get employee and branch information by employee_id.
   */
  getEmployeeInfo: async (employeeId: number): Promise<EmployeeInfo | null> => {
    const res = await pool.query<{
      full_name: string;
      position: string | null;
      location_name: string | null;
    }>(
      `SELECT e.full_name, e.position, b.location_name
       FROM employee e
       LEFT JOIN branch b ON e.branch_id = b.branch_id
       WHERE e.employee_id = $1`,
      [employeeId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      fullName: row.full_name,
      position: row.position,
      branchName: row.location_name,
    };
  },

  /**
   * Get KPI figures for Receptionist view (scoped by branch if provided).
   */
  getReceptionistKpis: async (
    branchId?: number | null
  ): Promise<ReceptionistKpiData> => {
    const [arrivalsRes, departuresRes, roomRes] = await Promise.all([
      pool.query<{ count: string }>(
        `SELECT count(*) AS count
         FROM reservation
         WHERE check_in_date = CURRENT_DATE
           AND reservation_status = 'Booked'
           AND ($1::int IS NULL OR branch_id = $1)`,
        [branchId ?? null]
      ),
      pool.query<{ count: string }>(
        `SELECT count(*) AS count
         FROM reservation
         WHERE check_out_date = CURRENT_DATE
           AND reservation_status = 'CheckedIn'
           AND ($1::int IS NULL OR branch_id = $1)`,
        [branchId ?? null]
      ),
      pool.query<{
        occupied: string;
        maintenance: string;
        total: string;
      }>(
        `SELECT
           count(*) FILTER (WHERE status = 'Occupied') AS occupied,
           count(*) FILTER (WHERE status = 'Maintenance') AS maintenance,
           count(*) AS total
         FROM room
         WHERE ($1::int IS NULL OR branch_id = $1)`,
        [branchId ?? null]
      ),
    ]);

    return {
      arrivals: parseInt(arrivalsRes.rows[0]?.count ?? '0', 10),
      departures: parseInt(departuresRes.rows[0]?.count ?? '0', 10),
      occupiedRooms: parseInt(roomRes.rows[0]?.occupied ?? '0', 10),
      maintenanceRooms: parseInt(roomRes.rows[0]?.maintenance ?? '0', 10),
      totalRooms: parseInt(roomRes.rows[0]?.total ?? '0', 10),
    };
  },

  /**
   * Get KPI figures for Manager / Admin view (all branches or branch-scoped).
   */
  getManagerKpis: async (
    branchId?: number | null
  ): Promise<ManagerKpiData> => {
    const [roomRes, revRes, pendingRes, cancelRes] = await Promise.all([
      pool.query<{ occupied: string; total: string }>(
        `SELECT
           count(*) FILTER (WHERE status = 'Occupied') AS occupied,
           count(*) AS total
         FROM room
         WHERE ($1::int IS NULL OR branch_id = $1)`,
        [branchId ?? null]
      ),
      pool.query<{ total_revenue: string; today_revenue: string }>(
        `SELECT
           COALESCE(SUM(amount_paid), 0)::text AS total_revenue,
           COALESCE(SUM(amount_paid) FILTER (WHERE payment_date::date = CURRENT_DATE), 0)::text AS today_revenue
         FROM payment`
      ),
      pool.query<{ count: string }>(
        `SELECT count(*) AS count
         FROM reservation
         WHERE reservation_status = 'CheckedIn'
           AND check_out_date <= CURRENT_DATE
           AND ($1::int IS NULL OR branch_id = $1)`,
        [branchId ?? null]
      ),
      pool.query<{ count: string }>(
        `SELECT count(*) AS count
         FROM reservation
         WHERE reservation_status = 'Cancelled'
           AND ($1::int IS NULL OR branch_id = $1)`,
        [branchId ?? null]
      ),
    ]);

    return {
      occupiedRooms: parseInt(roomRes.rows[0]?.occupied ?? '0', 10),
      totalRooms: parseInt(roomRes.rows[0]?.total ?? '0', 10),
      todayRevenue: revRes.rows[0]?.today_revenue ?? '0.00',
      totalRevenue: revRes.rows[0]?.total_revenue ?? '0.00',
      pendingCheckout: parseInt(pendingRes.rows[0]?.count ?? '0', 10),
      cancelledTotal: parseInt(cancelRes.rows[0]?.count ?? '0', 10),
    };
  },

  /**
   * Get recent audit activities from vw_audit_log.
   */
  getRecentActivity: async (limit = 5): Promise<DashboardActivity[]> => {
    const res = await pool.query<{
      audit_id: string;
      reservation_id: string;
      guest_full_name: string;
      branch_location_name: string;
      old_status: string | null;
      new_status: string;
      changed_at: Date;
      changed_by_name: string | null;
      actor_role: string;
    }>(
      `SELECT
         audit_id,
         reservation_id,
         guest_full_name,
         branch_location_name,
         old_status,
         new_status,
         changed_at,
         changed_by_name,
         actor_role
       FROM vw_audit_log
       ORDER BY changed_at DESC
       LIMIT $1`,
      [limit]
    );

    return res.rows.map((r) => ({
      auditId: r.audit_id,
      reservationId: r.reservation_id,
      guestFullName: r.guest_full_name,
      branchLocationName: r.branch_location_name,
      oldStatus: r.old_status,
      newStatus: r.new_status,
      changedAt: r.changed_at,
      changedByName: r.changed_by_name,
      actorRole: r.actor_role,
    }));
  },
};
