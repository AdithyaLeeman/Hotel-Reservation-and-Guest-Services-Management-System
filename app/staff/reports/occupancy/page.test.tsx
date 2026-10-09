// @vitest-environment jsdom
/**
 * Component Tests for Room Occupancy Report Page (P05-M02-T01)
 *
 * File: app/staff/reports/occupancy/page.test.tsx
 * Strategy:
 *   - Render with @testing-library/react in jsdom environment.
 *   - Mock global.fetch to control GET /api/staff/reports/occupancy responses.
 *   - Verify KPI cards, filters, table rendering, sorting, empty state, and error handling.
 *
 * Owned by: Member 2 (M2) - Karunarathna W.P. 240331F
 * Task: P05-M02-T01
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OccupancyReportPage from './page';

/* ─── Mock Data ──────────────────────────────────────────────────────────── */

const MOCK_OCCUPANCY_ROWS = [
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
    branch_id: 2,
    branch_name: 'Kandy',
    room_id: 6,
    room_number: '201',
    room_type_name: 'Suite',
    room_status: 'Maintenance',
    period_date: '2025-12-01',
    total_nights_occupied: 0,
    occupancy_rate: '0.00',
    total_revenue: '0.00',
  },
];

function mockFetchResponse(ok: boolean, body: object, status = ok ? 200 : 400) {
  return vi.spyOn(global, 'fetch').mockImplementation(async () => ({
    ok,
    status,
    json: async () => body,
  } as Response));
}

describe('OccupancyReportPage (P05-M02-T01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ── 1. Initial State & Loading ── */
  it('renders page heading and loading indicator initially', async () => {
    mockFetchResponse(true, { data: MOCK_OCCUPANCY_ROWS });

    render(<OccupancyReportPage />);

    expect(
      screen.getByRole('heading', { name: /room occupancy report/i })
    ).toBeTruthy();

    expect(
      screen.getByLabelText(/loading occupancy report/i)
    ).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByRole('table', { name: /room occupancy report data/i })).toBeTruthy();
    });
  });

  /* ── 2. Data Rendering & KPI Calculation ── */
  it('renders KPI summary cards and table rows on successful data fetch', async () => {
    mockFetchResponse(true, { data: MOCK_OCCUPANCY_ROWS });

    render(<OccupancyReportPage />);

    await waitFor(() => {
      expect(screen.getByRole('table', { name: /room occupancy report data/i })).toBeTruthy();
    });

    // KPI values check
    // Total rooms = 3
    expect(screen.getByText('3')).toBeTruthy();
    // Total nights = 20 + 12 + 0 = 32
    expect(screen.getByText('32')).toBeTruthy();
    // Total revenue = 40000 + 24000 + 0 = 64,000.00
    expect(screen.getAllByText(/64,000\.00/).length).toBeGreaterThan(0);

    // Table rows check
    expect(screen.getByText('101')).toBeTruthy();
    expect(screen.getByText('102')).toBeTruthy();
    expect(screen.getByText('201')).toBeTruthy();
    expect(screen.getAllByText(/Colombo/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Kandy/).length).toBeGreaterThan(0);

    // Status badges
    expect(screen.getByLabelText('Status: Occupied')).toBeTruthy();
    expect(screen.getByLabelText('Status: Available')).toBeTruthy();
    expect(screen.getByLabelText('Status: Maintenance')).toBeTruthy();
  });

  /* ── 3. Filters ── */
  it('allows applying branch and status filters and passes query params to fetch', async () => {
    const fetchSpy = mockFetchResponse(true, { data: MOCK_OCCUPANCY_ROWS });

    render(<OccupancyReportPage />);

    await waitFor(() => {
      expect(screen.getByRole('table', { name: /room occupancy report data/i })).toBeTruthy();
    });

    // Select Colombo (id 1)
    const branchSelect = screen.getByLabelText(/branch location/i);
    fireEvent.change(branchSelect, { target: { value: '1' } });

    // Select Occupied
    const statusSelect = screen.getByLabelText(/room status/i);
    fireEvent.change(statusSelect, { target: { value: 'Occupied' } });

    // Set From Date and To Date
    const fromInput = screen.getByLabelText(/from date/i);
    fireEvent.change(fromInput, { target: { value: '2025-12-01' } });

    const toInput = screen.getByLabelText(/to date/i);
    fireEvent.change(toInput, { target: { value: '2025-12-31' } });

    // Submit filter form
    const applyBtn = screen.getByRole('button', { name: /apply filters/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/staff/reports/occupancy?branchId=1&roomStatus=Occupied&fromDate=2025-12-01&toDate=2025-12-31')
      );
    });
  });

  /* ── 4. Date validation error ── */
  it('shows error if fromDate is after toDate', async () => {
    mockFetchResponse(true, { data: MOCK_OCCUPANCY_ROWS });

    render(<OccupancyReportPage />);

    await waitFor(() => {
      expect(screen.getByRole('table', { name: /room occupancy report data/i })).toBeTruthy();
    });

    const fromInput = screen.getByLabelText(/from date/i);
    fireEvent.change(fromInput, { target: { value: '2025-12-31' } });

    const toInput = screen.getByLabelText(/to date/i);
    fireEvent.change(toInput, { target: { value: '2025-12-01' } });

    const applyBtn = screen.getByRole('button', { name: /apply filters/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/start date \(from date\) cannot be after end date \(to date\)/i)
      ).toBeTruthy();
    });
  });

  /* ── 5. Reset Filters ── */
  it('clears active filters and restores full query when Reset Filters is clicked', async () => {
    const fetchSpy = mockFetchResponse(true, { data: MOCK_OCCUPANCY_ROWS });

    render(<OccupancyReportPage />);

    await waitFor(() => {
      expect(screen.getByRole('table', { name: /room occupancy report data/i })).toBeTruthy();
    });

    // Set branch and apply
    const branchSelect = screen.getByLabelText(/branch location/i);
    fireEvent.change(branchSelect, { target: { value: '2' } });

    const applyBtn = screen.getByRole('button', { name: /apply filters/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reset filters/i })).toBeTruthy();
    });

    const resetBtn = screen.getByRole('button', { name: /reset filters/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenLastCalledWith('/api/staff/reports/occupancy');
    });
  });

  /* ── 6. Column Sorting ── */
  it('sorts table rows when column headers are clicked', async () => {
    mockFetchResponse(true, { data: MOCK_OCCUPANCY_ROWS });

    render(<OccupancyReportPage />);

    await waitFor(() => {
      expect(screen.getByRole('table', { name: /room occupancy report data/i })).toBeTruthy();
    });

    const roomHeader = screen.getByRole('columnheader', { name: /room/i });

    // Initial click sorts ascending
    fireEvent.click(roomHeader);
    expect(screen.getByRole('columnheader', { name: /room/i }).getAttribute('aria-sort')).toBe('ascending');

    // Second click toggles to descending
    fireEvent.click(roomHeader);
    expect(screen.getByRole('columnheader', { name: /room/i }).getAttribute('aria-sort')).toBe('descending');
  });

  /* ── 7. Empty State ── */
  it('displays empty state when API returns an empty array', async () => {
    mockFetchResponse(true, { data: [] });

    render(<OccupancyReportPage />);

    await waitFor(() => {
      expect(screen.getByText(/no occupancy records found/i)).toBeTruthy();
    });

    expect(screen.queryByRole('table')).toBeNull();
  });

  /* ── 8. Error Handling ── */
  it('displays error alert when API request fails (e.g. 403 Forbidden)', async () => {
    mockFetchResponse(
      false,
      { error: { message: 'Access requires Manager or Admin role. Your role: Guest' } },
      403
    );

    render(<OccupancyReportPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });

    expect(
      screen.getByText(/access requires manager or admin role/i)
    ).toBeTruthy();

    // Verify retry button exists
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
  });

  it('displays network error when fetch promise rejects', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Connection failure'));

    render(<OccupancyReportPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });

    expect(
      screen.getByText(/unable to connect to the reporting service/i)
    ).toBeTruthy();
  });
});
