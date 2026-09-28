import { redirect } from 'next/navigation';
import Link from 'next/link';
import StaffNav from '@/components/StaffNav';
import { getSession } from '@/lib/auth/session';
import type { StaffRole } from '@/types/enums';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface KpiCard {
  id: string;
  label: string;
  value: string | number;
  sub?: string;
  colorClass: string;
}

interface QuickAction {
  id: string;
  label: string;
  href: string;
  description: string;
  iconPath: string;
  minRole: StaffRole;
}

/* ─── Role rank helper ────────────────────────────────────────────────────── */

const RANK: Record<StaffRole, number> = {
  Receptionist: 1,
  Manager: 2,
  Admin: 3,
};

function hasAccess(acting: StaffRole, required: StaffRole): boolean {
  return RANK[acting] >= RANK[required];
}

/* ─── Static mock data — will be replaced with real DB calls in Phase 6 ──── */

// TODO(P06-M01-T01): replace with SELECT FROM vw_dashboard_summary WHERE branch_id = $branchId
const MOCK_KPI_RECEPTIONIST: KpiCard[] = [
  {
    id: 'kpi-arrivals',
    label: "Today's Arrivals",
    value: 4,
    sub: 'Expected check-ins',
    colorClass: 'kpi-blue',
  },
  {
    id: 'kpi-departures',
    label: "Today's Departures",
    value: 3,
    sub: 'Expected check-outs',
    colorClass: 'kpi-amber',
  },
  {
    id: 'kpi-occupied',
    label: 'Rooms Occupied',
    value: '12 / 20',
    sub: '60% occupancy',
    colorClass: 'kpi-green',
  },
  {
    id: 'kpi-maintenance',
    label: 'In Maintenance',
    value: 1,
    sub: 'Unavailable rooms',
    colorClass: 'kpi-red',
  },
];

// TODO(P06-M01-T01): replace with multi-branch summary view
const MOCK_KPI_MANAGER: KpiCard[] = [
  {
    id: 'kpi-total-occupied',
    label: 'Total Occupied',
    value: '38 / 60',
    sub: 'Across all branches',
    colorClass: 'kpi-green',
  },
  {
    id: 'kpi-revenue',
    label: "Today's Revenue",
    value: 'LKR 142,500',
    sub: 'Authoritative from DB',
    colorClass: 'kpi-blue',
  },
  {
    id: 'kpi-pending-checkout',
    label: 'Pending Checkout',
    value: 5,
    sub: 'Balance not yet settled',
    colorClass: 'kpi-amber',
  },
  {
    id: 'kpi-cancelled',
    label: 'Cancelled Today',
    value: 2,
    sub: 'Reservation cancellations',
    colorClass: 'kpi-red',
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'qa-new-reservation',
    label: 'New Reservation',
    href: '/staff/reservations',
    description: 'Create a reservation for a walk-in or phone guest',
    iconPath:
      'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    minRole: 'Receptionist',
  },
  {
    id: 'qa-rooms',
    label: 'Room Operations',
    href: '/staff/rooms',
    description: 'View room status, housekeeping, and maintenance',
    iconPath:
      'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    minRole: 'Receptionist',
  },
  {
    id: 'qa-reports',
    label: 'Reports',
    href: '/staff/reports',
    description: 'Occupancy, revenue, and top-services reports',
    iconPath:
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    minRole: 'Manager',
  },
  {
    id: 'qa-admin',
    label: 'Administration',
    href: '/staff/admin',
    description: 'Manage staff accounts, branches, and system settings',
    iconPath:
      'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    minRole: 'Admin',
  },
];

// TODO(P06-M01-T01): replace with SELECT from audit / reservation tables
const MOCK_RECENT_ACTIVITY = [
  {
    id: 'act-1',
    type: 'check-in',
    description: 'Guest checked in — Room 101',
    time: '09:14',
    badge: 'Checked In',
    badgeColor: 'badge-checked-in',
  },
  {
    id: 'act-2',
    type: 'reservation',
    description: 'New reservation created — 3 nights',
    time: '08:52',
    badge: 'Booked',
    badgeColor: 'badge-booked',
  },
  {
    id: 'act-3',
    type: 'payment',
    description: 'Payment received — LKR 18,500',
    time: '08:30',
    badge: 'Paid',
    badgeColor: 'badge-checked-out',
  },
  {
    id: 'act-4',
    type: 'check-out',
    description: 'Guest checked out — Room 204',
    time: '07:55',
    badge: 'Checked Out',
    badgeColor: 'badge-checked-out',
  },
  {
    id: 'act-5',
    type: 'maintenance',
    description: 'Room 305 flagged for maintenance',
    time: 'Yesterday',
    badge: 'Maintenance',
    badgeColor: 'badge-maintenance',
  },
];

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function KpiCardEl({ card }: { card: KpiCard }) {
  return (
    <div
      id={card.id}
      className={`card p-5 flex flex-col gap-1 border-l-4 ${card.colorClass}`}
      aria-label={`${card.label}: ${card.value}`}
    >
      <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
        {card.label}
      </p>
      <p className="text-2xl font-bold text-[var(--color-text)]">{card.value}</p>
      {card.sub && (
        <p className="text-xs text-[var(--color-text-subtle)]">{card.sub}</p>
      )}
    </div>
  );
}

function ActionCard({ action }: { action: QuickAction }) {
  return (
    <Link
      id={action.id}
      href={action.href}
      className="
        card p-5 flex items-start gap-4
        hover:border-[var(--color-primary)]
        hover:shadow-[var(--shadow-md)]
        transition-all duration-200
        group no-underline
      "
      aria-label={action.label}
    >
      <span
        aria-hidden="true"
        className="
          flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
          bg-[var(--color-primary-muted)]
          group-hover:bg-[var(--color-primary)] group-hover:text-white
          text-[var(--color-primary)]
          transition-colors duration-200
        "
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={action.iconPath} />
        </svg>
      </span>
      <div>
        <p className="text-sm font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
          {action.label}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
          {action.description}
        </p>
      </div>
    </Link>
  );
}

/* ─── Page (Server Component) ─────────────────────────────────────────────── */

export const metadata = {
  title: 'Dashboard \u2014 SkyNest Hotels Staff Portal',
  description:
    "SkyNest Hotels staff dashboard. View today's arrivals, departures, occupancy, and quick-access operations.",
};

export default async function StaffDashboardPage() {
  // Server-side session — never trust browser-supplied identity (AGENTS.md §10)
  const session = await getSession();

  if (!session.userId || !session.role) {
    redirect('/staff/login?redirect=/staff/dashboard');
  }

  const staffRole = session.role as StaffRole;
  // TODO(P06-M01-T01): fetch staffName and branchName from DB
  // const employee = await employeeRepository.findById(session.employeeId);
  const staffName: string | null = null;
  const branchName: string | null =
    staffRole === 'Receptionist' ? 'Colombo' : null; // mock — real: branch.branch_name

  // Choose KPI set based on role
  const kpis =
    hasAccess(staffRole, 'Manager') ? MOCK_KPI_MANAGER : MOCK_KPI_RECEPTIONIST;

  // Filter quick actions to those the role can access
  const visibleActions = QUICK_ACTIONS.filter((a) =>
    hasAccess(staffRole, a.minRole)
  );

  // Greeting based on server time
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = staffName ?? staffRole;

  return (
    <>
      <title>Dashboard — SkyNest Hotels Staff Portal</title>

      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
        <StaffNav />

        <main
          id="staff-dashboard-main"
          className="flex-1 container-page py-8 space-y-8"
          aria-label="Staff dashboard"
        >
          {/* ── Page header ── */}
          <header
            id="dashboard-header"
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">
                {greeting}, {displayName}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                {branchName
                  ? `Branch: ${branchName} — `
                  : 'All branches — '}
                {new Date().toLocaleDateString('en-LK', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Role badge */}
            <span
              id="dashboard-role-badge"
              className="badge self-start sm:self-center"
              aria-label={`Role: ${staffRole}`}
            >
              {staffRole}
            </span>
          </header>

          {/* ── Notice: mock data warning (visible in development) ── */}
          {process.env.NODE_ENV !== 'production' && (
            <div
              id="dashboard-mock-notice"
              role="status"
              className="alert alert-warning text-xs"
            >
              <strong>Development mode:</strong> KPI figures and recent activity
              are mock data. Replace with real DB queries in Phase 6
              (P06-M01-T01).
            </div>
          )}

          {/* ── KPI row ── */}
          <section aria-labelledby="kpi-heading">
            <h2
              id="kpi-heading"
              className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)] mb-3"
            >
              At a Glance
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((card) => (
                <KpiCardEl key={card.id} card={card} />
              ))}
            </div>
          </section>

          {/* ── Quick Actions ── */}
          <section aria-labelledby="quick-actions-heading">
            <h2
              id="quick-actions-heading"
              className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)] mb-3"
            >
              Quick Actions
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {visibleActions.map((action) => (
                <ActionCard key={action.id} action={action} />
              ))}
            </div>
          </section>

          {/* ── Two-column lower section ── */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Activity (2/3 width) */}
            <section
              aria-labelledby="activity-heading"
              className="lg:col-span-2"
            >
              <h2
                id="activity-heading"
                className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)] mb-3"
              >
                Recent Activity
              </h2>
              <div
                id="dashboard-activity-feed"
                className="card divide-y divide-[var(--color-border)]"
              >
                {MOCK_RECENT_ACTIVITY.length === 0 ? (
                  <p className="p-6 text-sm text-center text-[var(--color-text-muted)]">
                    No recent activity.
                  </p>
                ) : (
                  MOCK_RECENT_ACTIVITY.map((item) => (
                    <div
                      key={item.id}
                      id={item.id}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--color-bg-subtle)] transition-colors"
                    >
                      <p className="text-sm text-[var(--color-text)]">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                        <span className={`badge ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                        <time className="text-xs text-[var(--color-text-subtle)] tabular-nums">
                          {item.time}
                        </time>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* System status panel (1/3 width) */}
            <section aria-labelledby="system-status-heading">
              <h2
                id="system-status-heading"
                className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)] mb-3"
              >
                System
              </h2>
              <div className="card p-5 flex flex-col gap-4">
                {/* DB connection */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    Database
                  </span>
                  <span
                    id="system-db-status"
                    className="badge badge-checked-in text-xs"
                    aria-label="Database status: connected"
                  >
                    Connected
                  </span>
                </div>

                {/* Session */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    Session
                  </span>
                  <span
                    id="system-session-status"
                    className="badge badge-checked-in text-xs"
                    aria-label="Session status: active"
                  >
                    Active
                  </span>
                </div>

                {/* API */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    API
                  </span>
                  <span
                    id="system-api-status"
                    className="badge badge-checked-in text-xs"
                    aria-label="API status: operational"
                  >
                    Operational
                  </span>
                </div>

                <div className="divider" />

                <p className="text-xs text-[var(--color-text-subtle)] leading-relaxed">
                  SkyNest HRGSMS v0.1 — Phase 1 skeleton.
                  {' '}
                  <span className="font-medium text-[var(--color-text-muted)]">
                    Role: {staffRole}
                  </span>
                </p>
              </div>
            </section>
          </div>
        </main>

        {/* ── Footer ── */}
        <footer
          id="staff-dashboard-footer"
          className="border-t border-[var(--color-border)] py-4 text-center text-xs text-[var(--color-text-subtle)]"
        >
          SkyNest Hotels — Staff Portal · All access is logged and monitored
        </footer>
      </div>

      {/* KPI card colour tokens — inline so no extra CSS file needed */}
      <style>{`
        .kpi-blue  { border-left-color: var(--color-info); }
        .kpi-green { border-left-color: var(--color-success); }
        .kpi-amber { border-left-color: var(--color-warning); }
        .kpi-red   { border-left-color: var(--color-error); }

        .badge-booked      { background: var(--color-info-bg);    color: var(--color-info); }
        .badge-checked-in  { background: var(--color-success-bg); color: var(--color-success); }
        .badge-checked-out { background: var(--color-bg-subtle);  color: var(--color-text-muted); }
        .badge-maintenance { background: var(--color-warning-bg); color: var(--color-warning); }
      `}</style>
    </>
  );
}
