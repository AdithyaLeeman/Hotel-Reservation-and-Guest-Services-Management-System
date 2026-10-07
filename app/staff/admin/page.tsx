/**
 * Staff Administration Panel — /staff/admin
 *
 * Admin-only page for managing staff accounts, viewing branch info,
 * and system administration tasks.
 *
 * Access: Admin role only (enforced server-side via session check).
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { pool } from '@/lib/db/pool';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface StaffRow {
  employee_id: number;
  employee_number: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  branch_name: string | null;
  department: string | null;
  position: string | null;
}

interface BranchRow {
  branch_id: number;
  location_name: string;
}

interface SystemStats {
  total_staff: number;
  total_guests: number;
  total_reservations: number;
  total_rooms: number;
}

/* ─── Data fetching ───────────────────────────────────────────────────────── */

async function fetchStaff(): Promise<StaffRow[]> {
  try {
    const result = await pool.query<StaffRow>(`
      SELECT
        e.employee_id,
        e.employee_number,
        e.full_name,
        e.email,
        ua.role,
        ua.status,
        b.location_name AS branch_name,
        e.department,
        e.position
      FROM employee e
      JOIN user_account ua ON ua.user_id = e.user_id
      LEFT JOIN branch b ON b.branch_id = e.branch_id
      ORDER BY ua.role, e.full_name
    `);
    return result.rows;
  } catch {
    return [];
  }
}

async function fetchBranches(): Promise<BranchRow[]> {
  try {
    const result = await pool.query<BranchRow>(`
      SELECT branch_id, location_name
      FROM branch
      ORDER BY branch_id
    `);
    return result.rows;
  } catch {
    return [];
  }
}

async function fetchSystemStats(): Promise<SystemStats> {
  try {
    const result = await pool.query<SystemStats>(`
      SELECT
        (SELECT COUNT(*) FROM employee)::int            AS total_staff,
        (SELECT COUNT(*) FROM guest)::int               AS total_guests,
        (SELECT COUNT(*) FROM reservation)::int         AS total_reservations,
        (SELECT COUNT(*) FROM room)::int                AS total_rooms
    `);
    return result.rows[0] ?? { total_staff: 0, total_guests: 0, total_reservations: 0, total_rooms: 0 };
  } catch {
    return { total_staff: 0, total_guests: 0, total_reservations: 0, total_rooms: 0 };
  }
}

/* ─── Role badge colours ──────────────────────────────────────────────────── */

function roleBadge(role: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    Admin: { background: '#7c3aed', color: '#ede9fe' },
    Manager: { background: '#b45309', color: '#fef3c7' },
    Receptionist: { background: '#0369a1', color: '#e0f2fe' },
    Guest: { background: '#374151', color: '#d1d5db' },
  };
  return map[role] ?? { background: '#374151', color: '#d1d5db' };
}

function statusBadge(status: string): React.CSSProperties {
  if (status === 'Active') return { background: '#065f46', color: '#d1fae5' };
  if (status === 'Inactive') return { background: '#374151', color: '#d1d5db' };
  return { background: '#7f1d1d', color: '#fee2e2' };
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default async function AdminPage() {
  const session = await getSession();

  // Enforce Admin-only access server-side
  if (!session.userId || session.role !== 'Admin') {
    redirect('/staff/login');
  }

  const [staff, branches, stats] = await Promise.all([
    fetchStaff(),
    fetchBranches(),
    fetchSystemStats(),
  ]);

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '2rem' }}>
          <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', fontSize: '0.85rem', color: '#9ca3af' }}>
            <Link href="/staff/dashboard" style={{ color: '#9ca3af', textDecoration: 'none' }}>Dashboard</Link>
            <span>›</span>
            <span style={{ color: '#f5f5f5' }}>Administration</span>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Administration</h1>
              <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.9rem' }}>System-wide management — SkyNest Hotels</p>
            </div>
          </div>
        </div>

        {/* ── System Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Staff Members', value: stats.total_staff, icon: '👤', color: '#7c3aed' },
            { label: 'Registered Guests', value: stats.total_guests, icon: '🏨', color: '#0369a1' },
            { label: 'Total Reservations', value: stats.total_reservations, icon: '📋', color: '#b45309' },
            { label: 'Total Rooms', value: stats.total_rooms, icon: '🛏️', color: '#065f46' },
          ].map((s) => (
            <div key={s.label} style={{ background: '#141414', border: '1px solid #262626', borderRadius: 12, padding: '1.25rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Branches ── */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#e5e7eb' }}>
            🏢 Branches ({branches.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
            {branches.map((b) => (
              <div key={b.branch_id} style={{ background: '#141414', border: '1px solid #262626', borderRadius: 12, padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{b.location_name}</div>
                  <span style={{ background: '#1a1a2e', color: '#818cf8', borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>
                    Branch #{b.branch_id}
                  </span>
                </div>
              </div>
            ))}
            {branches.length === 0 && (
              <div style={{ color: '#6b7280', gridColumn: '1/-1', padding: '2rem', textAlign: 'center' }}>
                No branches found
              </div>
            )}
          </div>
        </section>

        {/* ── Staff Accounts Table ── */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e5e7eb', margin: 0 }}>
              👥 Staff Accounts ({staff.length})
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              To add staff: see SQL reference below
            </div>
          </div>

          <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: 12, overflow: 'hidden' }}>
            {staff.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                No staff accounts found
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #262626' }}>
                    {['Employee #', 'Name', 'Email', 'Role', 'Branch', 'Dept / Position', 'Status'].map((h) => (
                      <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s, i) => (
                    <tr key={s.employee_id} style={{ borderBottom: i < staff.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                        {s.employee_number}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 500 }}>{s.full_name}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#9ca3af' }}>{s.email}</td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ ...roleBadge(s.role), borderRadius: 6, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block' }}>
                          {s.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#9ca3af' }}>
                        {s.branch_name ?? <em style={{ color: '#4b5563' }}>All branches</em>}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#9ca3af' }}>
                        {[s.department, s.position].filter(Boolean).join(' · ') || <em style={{ color: '#4b5563' }}>—</em>}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ ...statusBadge(s.status), borderRadius: 6, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block' }}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>



      </div>
    </main>
  );
}
