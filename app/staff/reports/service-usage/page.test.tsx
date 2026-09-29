/**
 * Tests for /staff/reports/service-usage page (P05-M04-T01)
 *
 * Strategy: render with @testing-library/react, mock fetch for the
 * GET /api/staff/reports/top-services endpoint.
 * Verify loading state, successful render of report table, and error handling.
 *
 * Owned by: Member 4 (M4) | Task: P05-M04-T01 (Mock-First)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ServiceUsageReportPage from './page';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/StaffNav', () => ({
  default: () => <nav data-testid="staff-nav">StaffNav</nav>,
}));

const MOCK_REPORT_DATA = [
  {
    service_id: 1,
    service_name: 'Room Service',
    total_quantity: 45,
    total_revenue: 54000,
    reservation_count: 30,
    usage_rank: 1,
  },
  {
    service_id: 2,
    service_name: 'Airport Transfer',
    total_quantity: 12,
    total_revenue: 42000,
    reservation_count: 10,
    usage_rank: 2,
  },
];

function mockFetch(ok: boolean, body: object) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 403,
    json: async () => body,
  } as Response);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('/staff/reports/service-usage page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders page heading and loading state initially', async () => {
    mockFetch(true, { data: MOCK_REPORT_DATA });

    render(<ServiceUsageReportPage />);

    expect(screen.getByRole('heading', { name: /service usage report/i })).toBeTruthy();
    expect(screen.getByRole('status', { name: /loading report data/i })).toBeTruthy();

    await waitFor(() => screen.getByRole('table', { name: /top services breakdown/i }));
  });

  it('renders report table with data on successful fetch', async () => {
    mockFetch(true, { data: MOCK_REPORT_DATA });

    render(<ServiceUsageReportPage />);

    await waitFor(() => screen.getByRole('table', { name: /top services breakdown/i }));

    // Check data rendering
    expect(screen.getByText('Room Service')).toBeTruthy();
    expect(screen.getByText('45')).toBeTruthy(); // quantity
    expect(screen.getByText(/54,000/)).toBeTruthy(); // revenue
    
    expect(screen.getByText('Airport Transfer')).toBeTruthy();
    expect(screen.getByText('#1')).toBeTruthy();
    expect(screen.getByText('#2')).toBeTruthy();
  });

  it('renders empty state when data is empty', async () => {
    mockFetch(true, { data: [] });

    render(<ServiceUsageReportPage />);

    await waitFor(() =>
      expect(screen.getByText(/no service usage data available/i)).toBeTruthy()
    );
    
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows error alert when fetch fails (e.g., 403 Forbidden)', async () => {
    mockFetch(false, { error: { message: 'Access requires Manager or Admin role.' } });

    render(<ServiceUsageReportPage />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeTruthy()
    );

    expect(screen.getByText(/access requires manager or admin role/i)).toBeTruthy();
  });

  it('shows generic network error message when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    render(<ServiceUsageReportPage />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeTruthy()
    );

    expect(screen.getByText(/network error — unable to reach the server/i)).toBeTruthy();
  });
});
