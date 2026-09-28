/** @vitest-environment jsdom */

/**
 * Unit tests for Staff Dashboard Skeleton — P01-M01-T29
 *
 * Strategy:
 *   The dashboard is a Server Component that calls getSession() and
 *   conditionally renders content based on the returned role.
 *
 *   Because vitest-jsdom cannot run RSC async functions directly, we:
 *     1. Mock `@/lib/auth/session` so `getSession` returns a controlled session.
 *     2. Mock `next/navigation` (redirect, Link).
 *     3. Mock `@/components/StaffNav` with a lightweight stub.
 *     4. Import and invoke the default export as an async function (RSC pattern),
 *        then render the JSX it returns.
 *
 *   Coverage:
 *     - Rendering: heading, KPI cards, quick-action links, activity feed, footer
 *     - Role routing: Receptionist sees receptionist KPIs; Manager sees manager KPIs
 *     - Access control: Manager-only actions hidden for Receptionist
 *     - Unauthenticated: redirect to /staff/login called
 *     - Breadcrumb elements and accessible landmarks present
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';

/* ─── Mocks ──────────────────────────────────────────────────────────────── */

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    // throw so execution stops, mirroring real next/navigation behaviour
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => <a href={href} {...rest}>{children}</a>,
}));

vi.mock('@/components/StaffNav', () => ({
  default: () => <nav data-testid="staff-nav">StaffNav</nav>,
}));

const mockGetSession = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  getSession: () => mockGetSession(),
}));

/* ─── Helper: render the RSC page ─────────────────────────────────────────── */

async function renderDashboard() {
  // Dynamic import so that the mock above is in place first
  const mod = await import('./page');
  const Page = mod.default;
  const jsx = await Page();
  render(jsx as React.ReactElement);
}

/* ─── Session factories ────────────────────────────────────────────────────── */

function receptionistSession() {
  return {
    userId: 'user-001',
    role: 'Receptionist',
    employeeId: 1,
    branchId: 1,
  };
}

function managerSession() {
  return {
    userId: 'user-002',
    role: 'Manager',
    employeeId: 2,
    branchId: null,
  };
}

function adminSession() {
  return {
    userId: 'user-003',
    role: 'Admin',
    employeeId: 3,
    branchId: null,
  };
}

/* ─── Tests ─────────────────────────────────────────────────────────────── */

describe('StaffDashboardPage — rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('renders StaffNav', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(screen.getByTestId('staff-nav')).toBeInTheDocument();
  });

  it('renders the page h1 greeting', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    // Greeting is one of Good morning/afternoon/evening
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toMatch(/Good (morning|afternoon|evening)/i);
  });

  it('renders the footer with brand text', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).toContain('SkyNest Hotels');
  });

  it('renders the dashboard main landmark', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders the "At a Glance" section heading', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(
      screen.getByText(/at a glance/i, { selector: '[id="kpi-heading"]' })
    ).toBeInTheDocument();
  });

  it('renders the "Quick Actions" section heading', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(
      screen.getByText(/quick actions/i, {
        selector: '[id="quick-actions-heading"]',
      })
    ).toBeInTheDocument();
  });

  it('renders the "Recent Activity" section heading', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(
      screen.getByText(/recent activity/i, {
        selector: '[id="activity-heading"]',
      })
    ).toBeInTheDocument();
  });

  it('renders the System status panel', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(screen.getByText(/System/i, { selector: '[id="system-status-heading"]' })).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Operational')).toBeInTheDocument();
  });

  it('renders the development mock-data notice outside production', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    // NODE_ENV is 'test' in vitest — same behaviour as dev: notice should render
    await renderDashboard();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('StaffDashboardPage — Receptionist role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('shows Receptionist KPI labels (arrivals / departures)', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(screen.getByText(/today's arrivals/i)).toBeInTheDocument();
    expect(screen.getByText(/today's departures/i)).toBeInTheDocument();
  });

  it('shows "Rooms Occupied" and "In Maintenance" KPI cards', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(screen.getByText(/rooms occupied/i)).toBeInTheDocument();
    expect(screen.getByText(/in maintenance/i)).toBeInTheDocument();
  });

  it('does NOT show manager-level KPI (Revenue)', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(
      screen.queryByText(/today's revenue/i)
    ).not.toBeInTheDocument();
  });

  it('shows Receptionist quick actions (Reservations and Rooms)', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(screen.getByRole('link', { name: /new reservation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /room operations/i })).toBeInTheDocument();
  });

  it('does NOT show Manager-only quick action (Reports) for Receptionist', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(
      screen.queryByRole('link', { name: /^reports$/i })
    ).not.toBeInTheDocument();
  });

  it('does NOT show Admin-only quick action (Administration) for Receptionist', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(
      screen.queryByRole('link', { name: /administration/i })
    ).not.toBeInTheDocument();
  });

  it('shows the branch name in the subtitle for Receptionist', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    // Mock always returns 'Colombo' for Receptionist
    expect(screen.getByText(/colombo/i)).toBeInTheDocument();
  });

  it('shows correct role badge', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    const badge = screen.getByLabelText(/role: receptionist/i);
    expect(badge).toBeInTheDocument();
  });
});

describe('StaffDashboardPage — Manager role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('shows Manager KPI labels (Total Occupied / Revenue)', async () => {
    mockGetSession.mockResolvedValue(managerSession());
    await renderDashboard();
    expect(screen.getByText(/total occupied/i)).toBeInTheDocument();
    expect(screen.getByText(/today's revenue/i)).toBeInTheDocument();
  });

  it('does NOT show Receptionist-only KPIs (Today\'s Arrivals)', async () => {
    mockGetSession.mockResolvedValue(managerSession());
    await renderDashboard();
    expect(
      screen.queryByText(/today's arrivals/i)
    ).not.toBeInTheDocument();
  });

  it('shows both Receptionist and Manager quick actions', async () => {
    mockGetSession.mockResolvedValue(managerSession());
    await renderDashboard();
    expect(screen.getByRole('link', { name: /new reservation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /room operations/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument();
  });

  it('does NOT show Admin-only action for Manager', async () => {
    mockGetSession.mockResolvedValue(managerSession());
    await renderDashboard();
    expect(
      screen.queryByRole('link', { name: /administration/i })
    ).not.toBeInTheDocument();
  });

  it('shows "All branches" in subtitle for Manager', async () => {
    mockGetSession.mockResolvedValue(managerSession());
    await renderDashboard();
    // The subtitle p tag inside the dashboard header contains "All branches"
    const header = document.getElementById('dashboard-header')!;
    expect(header.textContent).toMatch(/all branches/i);
  });
});

describe('StaffDashboardPage — Admin role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('shows all four quick actions for Admin', async () => {
    mockGetSession.mockResolvedValue(adminSession());
    await renderDashboard();
    const links = [
      screen.getByRole('link', { name: /new reservation/i }),
      screen.getByRole('link', { name: /room operations/i }),
      screen.getByRole('link', { name: /reports/i }),
      screen.getByRole('link', { name: /administration/i }),
    ];
    expect(links).toHaveLength(4);
    links.forEach((l) => expect(l).toBeInTheDocument());
  });
});

describe('StaffDashboardPage — activity feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('renders the activity feed container', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(
      document.getElementById('dashboard-activity-feed')
    ).toBeInTheDocument();
  });

  it('renders at least one activity item', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(screen.getByText(/guest checked in/i)).toBeInTheDocument();
  });

  it('renders status badges inside the activity feed', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    const feed = document.getElementById('dashboard-activity-feed')!;
    expect(within(feed).getByText('Checked In')).toBeInTheDocument();
  });
});

describe('StaffDashboardPage — unauthenticated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('calls redirect to /staff/login when session has no userId', async () => {
    mockGetSession.mockResolvedValue({ userId: null, role: null });
    const mod = await import('./page');
    const Page = mod.default;

    await expect(Page()).rejects.toThrow('REDIRECT:/staff/login?redirect=/staff/dashboard');
    expect(mockRedirect).toHaveBeenCalledWith(
      '/staff/login?redirect=/staff/dashboard'
    );
  });

  it('calls redirect when session is empty object', async () => {
    mockGetSession.mockResolvedValue({});
    const mod = await import('./page');
    const Page = mod.default;

    await expect(Page()).rejects.toThrow('REDIRECT:/staff/login?redirect=/staff/dashboard');
    expect(mockRedirect).toHaveBeenCalledTimes(1);
  });
});

describe('StaffDashboardPage — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('has a single h1 on the page', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('all quick-action links have accessible names', async () => {
    mockGetSession.mockResolvedValue(adminSession());
    await renderDashboard();
    // All links rendered should have an accessible name (aria-label or text content)
    const actionLinks = [
      screen.getByRole('link', { name: /new reservation/i }),
      screen.getByRole('link', { name: /room operations/i }),
      screen.getByRole('link', { name: /reports/i }),
      screen.getByRole('link', { name: /administration/i }),
    ];
    actionLinks.forEach((link) => {
      expect(link.getAttribute('href')).toBeTruthy();
    });
  });

  it('quick-action links point to the correct href values', async () => {
    mockGetSession.mockResolvedValue(adminSession());
    await renderDashboard();
    expect(
      screen.getByRole('link', { name: /new reservation/i }).getAttribute('href')
    ).toBe('/staff/reservations');
    expect(
      screen.getByRole('link', { name: /room operations/i }).getAttribute('href')
    ).toBe('/staff/rooms');
    expect(
      screen.getByRole('link', { name: /reports/i }).getAttribute('href')
    ).toBe('/staff/reports');
    expect(
      screen.getByRole('link', { name: /administration/i }).getAttribute('href')
    ).toBe('/staff/admin');
  });

  it('system status indicators have aria-labels', async () => {
    mockGetSession.mockResolvedValue(receptionistSession());
    await renderDashboard();
    expect(screen.getByLabelText(/database status: connected/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/session status: active/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/api status: operational/i)).toBeInTheDocument();
  });
});
