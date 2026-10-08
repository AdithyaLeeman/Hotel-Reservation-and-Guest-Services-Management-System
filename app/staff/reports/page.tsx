'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  href: string;
  iconPath: string;
  accentClass: string;
  kpiLabel: string;
  kpiValue: string;
  badge: string;
}

type PageStage = 'loading' | 'ready' | 'unauthorized';

const REPORT_CARDS: ReportCard[] = [
  {
    id: 'report-card-occupancy',
    title: 'Room Occupancy',
    description:
      'Track occupancy rates, total nights booked, and room revenue across all branches and room types.',
    href: '/staff/reports/occupancy',
    iconPath:
      'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    accentClass: 'rc--teal',
    kpiLabel: 'Avg Occupancy',
    kpiValue: '73.2%',
    badge: 'Live View',
  },
  {
    id: 'report-card-revenue',
    title: 'Monthly Revenue',
    description:
      'Monitor room revenue, service revenue, tax collected, and total outstanding balances month by month.',
    href: '/staff/reports/revenue',
    iconPath:
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    accentClass: 'rc--gold',
    kpiLabel: 'Total Revenue',
    kpiValue: 'LKR 202,300',
    badge: 'All Branches',
  },
  {
    id: 'report-card-billing',
    title: 'Guest Billing Summary',
    description:
      'Review individual guest invoices, payment status, outstanding balances, and full billing breakdowns.',
    href: '/staff/reports/billing',
    iconPath:
      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    accentClass: 'rc--blue',
    kpiLabel: 'Outstanding',
    kpiValue: 'LKR 65,520',
    badge: 'Invoices',
  },
  {
    id: 'report-card-services',
    title: 'Top Services',
    description:
      'Analyse which hotel services are most popular by usage quantity and total revenue generated.',
    href: '/staff/reports/service-usage',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
    accentClass: 'rc--emerald',
    kpiLabel: 'Services Tracked',
    kpiValue: '6 Items',
    badge: 'Usage Rank',
  },
];

function formatDate(): string {
  return new Date().toLocaleDateString('en-LK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const CSS = `
/* ── Reports Dashboard ─────────────────────────────────────────── */
.rd-page {
  min-height: calc(100vh - 4rem);
  background: var(--color-bg);
  padding: 2rem 1rem 4rem;
}

/* Header */
.rd-breadcrumb {
  max-width: 1200px;
  margin: 0 auto 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: var(--color-text-subtle);
}
.rd-breadcrumb a {
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 150ms;
}
.rd-breadcrumb a:hover { color: var(--color-primary); }
.rd-breadcrumb__sep { color: var(--color-border-strong); }

.rd-header {
  max-width: 1200px;
  margin: 0 auto 2rem;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}
.rd-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.025em;
  margin: 0 0 0.375rem;
}
.rd-title span { color: var(--color-primary); }
.rd-subtitle { font-size: 0.9375rem; color: var(--color-text-muted); margin: 0; }

.rd-date-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: var(--color-text-subtle);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  padding: 0.375rem 0.875rem;
  white-space: nowrap;
}
.rd-date-badge svg { width: 0.875rem; height: 0.875rem; opacity: 0.6; }

/* Summary Strip */
.rd-strip {
  max-width: 1200px;
  margin: 0 auto 2rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 1.25rem 1.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  box-shadow: var(--shadow-sm);
}
.rd-strip__left { display: flex; align-items: center; gap: 0.875rem; }
.rd-strip__icon {
  width: 2.5rem; height: 2.5rem;
  background: rgba(197, 168, 128, 0.15);
  border: 1px solid rgba(197, 168, 128, 0.35);
  border-radius: 0.5rem;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.rd-strip__icon svg { width: 1.25rem; height: 1.25rem; color: #c5a880; }
.rd-strip__label h3 { margin: 0; font-size: 1rem; font-weight: 600; color: var(--color-text); }
.rd-strip__label p  { margin: 0.125rem 0 0; font-size: 0.8125rem; color: var(--color-text-muted); }
.rd-strip__kpis { display: flex; gap: 2rem; flex-wrap: wrap; }
.rd-kpi { text-align: right; }
.rd-kpi__label { margin: 0; font-size: 0.75rem; color: var(--color-text-subtle); text-transform: uppercase; letter-spacing: 0.06em; }
.rd-kpi__value { margin: 0.125rem 0 0; font-size: 1.125rem; font-weight: 700; color: var(--color-text); }

/* Grid */
.rd-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

/* Cards */
.rc {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 1.5rem;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition: transform 150ms cubic-bezier(0.16,1,0.3,1),
              box-shadow 150ms cubic-bezier(0.16,1,0.3,1),
              border-color 150ms;
}
.rc:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); border-color: var(--color-border-strong); }

.rc__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }

.rc__icon {
  width: 2.75rem; height: 2.75rem;
  border-radius: 0.5rem;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  background: rgba(197, 168, 128, 0.12);
  color: #c5a880;
  border: 1px solid rgba(197, 168, 128, 0.25);
}
.rc__icon svg { width: 1.25rem; height: 1.25rem; }
.rc--teal .rc__icon,
.rc--gold .rc__icon,
.rc--blue .rc__icon,
.rc--emerald .rc__icon {
  background: rgba(197, 168, 128, 0.12);
  color: #c5a880;
  border: 1px solid rgba(197, 168, 128, 0.25);
}

.rc__badge {
  font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  white-space: nowrap;
  background: rgba(197, 168, 128, 0.14);
  color: #c5a880;
  border: 1px solid rgba(197, 168, 128, 0.35);
}
.rc--teal .rc__badge,
.rc--gold .rc__badge,
.rc--blue .rc__badge,
.rc--emerald .rc__badge {
  background: rgba(197, 168, 128, 0.14);
  color: #c5a880;
  border: 1px solid rgba(197, 168, 128, 0.35);
}

.rc__title { font-size: 1.0625rem; font-weight: 700; color: var(--color-text); margin: 0; letter-spacing: -0.01em; }
.rc__desc  { font-size: 0.875rem; color: var(--color-text-muted); line-height: 1.55; margin: 0.25rem 0 0; }

.rc__footer {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
  margin-top: auto;
}
.rc__kpi-label { font-size: 0.75rem; color: var(--color-text-subtle); text-transform: uppercase; letter-spacing: 0.05em; }
.rc__kpi-value { font-size: 0.9375rem; font-weight: 700; color: var(--color-text); margin-top: 0.125rem; }
.rc__arrow {
  width: 1.25rem; height: 1.25rem;
  color: var(--color-text-subtle);
  flex-shrink: 0;
  transition: transform 150ms, color 150ms;
}
.rc:hover .rc__arrow { transform: translateX(4px); }
.rc--teal:hover .rc__arrow,
.rc--gold:hover .rc__arrow,
.rc--blue:hover .rc__arrow,
.rc--emerald:hover .rc__arrow {
  color: #c5a880;
}

/* Skeleton */
.rc--skeleton { pointer-events: none; min-height: 10rem; }
.skeleton {
  background: linear-gradient(90deg,
    var(--color-bg-subtle) 25%,
    var(--color-surface-overlay) 50%,
    var(--color-bg-subtle) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 0.375rem;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.sk-title   { height: 2rem;   width: 22rem; max-width: 100%; margin-bottom: 0.75rem; }
.sk-sub     { height: 1rem;   width: 14rem; max-width: 100%; }
.sk-icon    { height: 2.75rem; width: 2.75rem; border-radius: 0.5rem; margin-bottom: 1rem; }
.sk-card-t  { height: 1.125rem; width: 60%; margin-bottom: 0.5rem; }
.sk-card-d  { height: 0.875rem; width: 90%; }

/* Unauthorized */
.rd-unauth {
  max-width: 28rem; margin: 6rem auto;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 1rem;
}
.rd-unauth__icon { width: 3.5rem; height: 3.5rem; color: var(--color-text-subtle); }
.rd-unauth__title { font-size: 1.25rem; font-weight: 700; color: var(--color-text); margin: 0; }
.rd-unauth__msg { font-size: 0.9375rem; color: var(--color-text-muted); line-height: 1.6; margin: 0; }

/* Responsive */
@media (max-width: 640px) {
  .rd-grid { grid-template-columns: 1fr; }
  .rd-strip { flex-direction: column; align-items: flex-start; }
  .rd-strip__kpis { gap: 1rem; }
  .rd-kpi { text-align: left; }
  .rd-title { font-size: 1.5rem; }
  .rd-header { flex-direction: column; align-items: flex-start; }
}
`;

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function LoadingSkeleton() {
  return (
    <div className="rd-page" aria-busy="true" aria-label="Loading reports dashboard">
      <div style={{ maxWidth: 1200, margin: '0 auto 2rem' }}>
        <div className="skeleton sk-title" />
        <div className="skeleton sk-sub" />
      </div>
      <div className="rd-grid">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="rc rc--skeleton">
            <div className="skeleton sk-icon" />
            <div className="skeleton sk-card-t" />
            <div className="skeleton sk-card-d" />
          </div>
        ))}
      </div>
    </div>
  );
}

function UnauthorizedBanner() {
  return (
    <div className="rd-page">
      <div className="rd-unauth" role="alert">
        <svg className="rd-unauth__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h2 className="rd-unauth__title">Access Restricted</h2>
        <p className="rd-unauth__msg">
          Reports are available to <strong>Manager</strong> and{' '}
          <strong>Admin</strong> roles only. Please contact your branch manager
          if you require access.
        </p>
        <Link href="/staff/dashboard" className="btn btn-primary" id="reports-back-dashboard-btn">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function ReportsDashboardPage() {
  const [stage, setStage] = useState<PageStage>('loading');

  useEffect(() => {
    fetch('/api/staff/reports/revenue')
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          setStage('unauthorized');
        } else {
          setStage('ready');
        }
      })
      .catch(() => {
        // Network error in dev / mock-first — show dashboard
        setStage('ready');
      });
  }, []);

  if (stage === 'loading') return (
    <>
      <style>{CSS}</style>
      <LoadingSkeleton />
    </>
  );
  if (stage === 'unauthorized') return (
    <>
      <style>{CSS}</style>
      <UnauthorizedBanner />
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <main className="rd-page" id="reports-dashboard-main">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb">
          <div className="rd-breadcrumb">
            <Link href="/staff/dashboard">Dashboard</Link>
            <span className="rd-breadcrumb__sep" aria-hidden="true">›</span>
            <span aria-current="page">Reports</span>
          </div>
        </nav>

        {/* Title row */}
        <header className="rd-header">
          <div>
            <h1 className="rd-title">
              Reports &amp; <span>Analytics</span>
            </h1>
            <p className="rd-subtitle">
              Access all hotel performance and financial reports from one place.
            </p>
          </div>
          <div className="rd-date-badge" aria-label={`Report date: ${formatDate()}`}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate()}
          </div>
        </header>

        {/* Summary Strip */}
        <section className="rd-strip" aria-label="Hotel performance summary">
          <div className="rd-strip__left">
            <div className="rd-strip__icon" aria-hidden="true">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="rd-strip__label">
              <h3>SkyNest Hotels — All Branches</h3>
              <p>Performance summary from PostgreSQL analytical views</p>
            </div>
          </div>
          <div className="rd-strip__kpis" role="list" aria-label="Key metrics">
            {[
              { label: 'Branches',      value: '3' },
              { label: 'Total Revenue', value: 'LKR 202,300' },
              { label: 'Outstanding',   value: 'LKR 65,520' },
              { label: 'Reports',       value: '4 Active' },
            ].map((kpi) => (
              <div key={kpi.label} className="rd-kpi" role="listitem">
                <p className="rd-kpi__label">{kpi.label}</p>
                <p className="rd-kpi__value">{kpi.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Report Cards */}
        <section aria-label="Available reports">
          <div className="rd-grid">
            {REPORT_CARDS.map((card) => (
              <Link
                key={card.id}
                id={card.id}
                href={card.href}
                className={`rc ${card.accentClass}`}
                aria-label={`Open ${card.title} report`}
              >
                <div className="rc__header">
                  <div className="rc__icon" aria-hidden="true">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={card.iconPath} />
                    </svg>
                  </div>
                  <span className="rc__badge">{card.badge}</span>
                </div>

                <div>
                  <h2 className="rc__title">{card.title}</h2>
                  <p className="rc__desc">{card.description}</p>
                </div>

                <div className="rc__footer">
                  <div>
                    <div className="rc__kpi-label">{card.kpiLabel}</div>
                    <div className="rc__kpi-value">{card.kpiValue}</div>
                  </div>
                  <svg className="rc__arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}