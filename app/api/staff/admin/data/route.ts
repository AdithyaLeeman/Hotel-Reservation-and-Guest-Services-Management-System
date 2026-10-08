/**
 * Route: GET /api/staff/admin/data
 *
 * Returns all data needed for the Admin panel in one response:
 *   - staff list (employee + user_account + branch)
 *   - branches list
 *   - system stats
 *   - audit log (last 100 entries from vw_audit_log)
 *
 * Security: Admin role only.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { pool } from '@/lib/db/pool';

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session.userId || session.role !== 'Admin') {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
      { status: 401 }
    );
  }

  try {
    const [staffResult, branchResult, statsResult, auditResult] = await Promise.all([
      // Staff with user_id for toggle-status action
      pool.query(`
        SELECT
          e.employee_id::int                  AS employee_id,
          ua.user_id,
          e.employee_number,
          e.full_name,
          e.email,
          COALESCE(ua.role::text, 'Staff')   AS role,
          COALESCE(ua.status::text, 'Active') AS status,
          e.branch_id::int                    AS branch_id,
          b.location_name                     AS branch_name,
          e.department,
          e.position
        FROM employee e
        LEFT JOIN user_account ua ON ua.user_id = e.user_id
        LEFT JOIN branch b ON b.branch_id = e.branch_id
        ORDER BY ua.role, e.full_name
      `),
      pool.query(`SELECT branch_id::int AS branch_id, location_name FROM branch ORDER BY branch_id`),
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM employee)::int     AS total_staff,
          (SELECT COUNT(*) FROM guest)::int        AS total_guests,
          (SELECT COUNT(*) FROM reservation)::int  AS total_reservations,
          (SELECT COUNT(*) FROM room)::int         AS total_rooms
      `),
      // Audit log — last 100 entries
      pool.query(`
        SELECT
          audit_id::text,
          reservation_id,
          guest_full_name,
          guest_email,
          branch_location_name,
          old_status,
          new_status,
          changed_at,
          changed_by_name,
          actor_role,
          employee_number,
          change_reason
        FROM vw_audit_log
        LIMIT 100
      `).catch(() => ({ rows: [] })), // Graceful fallback if audit log is empty/missing
    ]);

    return NextResponse.json({
      data: {
        staff: staffResult.rows,
        branches: branchResult.rows,
        stats: statsResult.rows[0] ?? { total_staff: 0, total_guests: 0, total_reservations: 0, total_rooms: 0 },
        audit: auditResult.rows,
      },
    });
  } catch (error) {
    console.error('[GET /api/staff/admin/data]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to load admin data' } },
      { status: 500 }
    );
  }
}
