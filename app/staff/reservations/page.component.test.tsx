// @vitest-environment jsdom
/**
 * Tests for /staff/reservations page (P03-M03-T21)
 *
 * Strategy: render the page with @testing-library/react, mock global.fetch to
 * control API responses, and verify correct UI state transitions for loading,
 * success (data rendering), client-side filters/search, empty state, and
 * error/retry.
 *
 * Environment: jsdom — enforced via @vitest-environment docblock because the
 * environmentMatchGlobs entry in vitest.config.mjs does not activate the jsdom
 * pool for app/**\/*.component.test.tsx in vitest v5 (pre-existing config issue;
 * same behaviour affects app/staff/checkin/page.test.tsx).
 *
 * Owned by: Member 3 (M3) | Task: P03-M03-T21 (Mock-First)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import StaffReservationsPage from './page';
import type { ActiveReservationRow } from '@/repositories/reservation.repository';

/* ─── Mock: Next.js navigation (Link uses router internally) ─────────────── */

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    id,
    className,
    'aria-label': ariaLabel,
  }: {
    href: string;
    children: React.ReactNode;
    id?: string;
    className?: string;
    'aria-label'?: string;
  }) => (
    <a href={href} id={id} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/** Build a minimal ActiveReservationRow for tests. */
function makeRow(overrides: Partial<ActiveReservationRow> = {}): ActiveReservationRow {
  return {
    reservation_id:              'res-mock-001',
    guest_id:                    'guest-mock-001',
    guest_full_name:             'Amal Perera',
    guest_email:                 'amal@example.com',
    branch_id:                   1,
    branch_location_name:        'Colombo',
    check_in_date:               '2026-10-01',
    check_out_date:              '2026-10-05',
    reservation_status:          'Booked',
    booking_source:              'Online',
    discount_percentage:         null,
    processed_by_employee_id:    null,
    room_count:                  1,
    created_at:                  '2026-09-15T08:00:00Z',
    ...overrides,
  };
}

/** Stub global.fetch to return a successful API response with the given rows. */
function mockFetchSuccess(rows: ActiveReservationRow[]) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok:     true,
    status: 200,
    json:   async () => ({
      data: rows,
      meta: { requestId: 'test-req-id' },
    }),
  } as Response);
}

/** Stub global.fetch to return an HTTP error response. */
function mockFetchError(status = 500, message = 'Internal server error.') {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok:     false,
    status,
    json:   async () => ({ error: { code: 'INTERNAL_ERROR', message } }),
  } as Response);
}

/** Stub global.fetch to throw a network error. */
function mockFetchNetworkError() {
  return vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network failure'));
}

/* ─── Tests ──────────────────────────────────────────────────────────────── */

describe('/staff/reservations page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ── Loading state ─────────────────────────────────────────────────────── */

  it('shows a loading spinner on initial render', () => {
    // fetch never resolves during this test so the loading state persists
    vi.spyOn(global, 'fetch').mockReturnValueOnce(new Promise(() => {}));

    render(<StaffReservationsPage />);

    expect(
      screen.getByRole('status', { name: /loading reservations/i })
    ).toBeTruthy();
  });

  /* ── Page structure ─────────────────────────────────────────────────────── */

  it('renders the page heading, subtitle, and filter controls', async () => {
    mockFetchSuccess([]);

    render(<StaffReservationsPage />);

    // Wait for loading to finish
    await waitFor(() =>
      expect(screen.queryByRole('status', { name: /loading/i })).toBeNull()
    );

    expect(
      screen.getByRole('heading', { name: /reservations/i, level: 1 })
    ).toBeTruthy();

    // Filters
    expect(screen.getByLabelText(/branch/i)).toBeTruthy();
    expect(screen.getByLabelText(/status/i)).toBeTruthy();
    expect(screen.getByLabelText(/guest name or reservation id/i)).toBeTruthy();
  });

  /* ── Success: data rendering ────────────────────────────────────────────── */

  it('renders reservation rows and stats when data is loaded', async () => {
    const rows = [
      makeRow({ reservation_id: 'res-mock-001', guest_full_name: 'Amal Perera', reservation_status: 'Booked' }),
      makeRow({ reservation_id: 'res-mock-002', guest_full_name: 'Nimal Silva', reservation_status: 'CheckedIn' }),
    ];
    mockFetchSuccess(rows);

    render(<StaffReservationsPage />);

    await waitFor(() =>
      expect(screen.queryByRole('status', { name: /loading/i })).toBeNull()
    );

    // Guest names visible
    expect(screen.getByText('Amal Perera')).toBeTruthy();
    expect(screen.getByText('Nimal Silva')).toBeTruthy();

    // Stats strip — scope to the stats section to avoid ambiguity with table
    // badges and filter dropdown options that also contain "Booked" text.
    const statsSection = screen.getByLabelText(/reservation statistics/i);
    expect(within(statsSection).getByText('2')).toBeTruthy(); // total count
    expect(within(statsSection).getByText('Booked')).toBeTruthy();
    expect(within(statsSection).getByText('Checked In')).toBeTruthy();

    // Action buttons
    expect(screen.getByLabelText(/view details for reservation res-mock-001/i)).toBeTruthy();
    expect(screen.getByLabelText(/view details for reservation res-mock-002/i)).toBeTruthy();
  });

  it('renders row IDs for each reservation', async () => {
    const rows = [makeRow({ reservation_id: 'res-mock-001' })];
    mockFetchSuccess(rows);

    const { container } = render(<StaffReservationsPage />);

    await waitFor(() =>
      expect(screen.queryByRole('status', { name: /loading/i })).toBeNull()
    );

    expect(container.querySelector('#row-res-mock-001')).toBeTruthy();
    expect(container.querySelector('#btn-view-res-mock-001')).toBeTruthy();
  });

  it('shows the Check In button only for Booked reservations', async () => {
    const rows = [
      makeRow({ reservation_id: 'res-mock-001', reservation_status: 'Booked' }),
      makeRow({ reservation_id: 'res-mock-002', reservation_status: 'CheckedIn' }),
    ];
    mockFetchSuccess(rows);

    const { container } = render(<StaffReservationsPage />);

    await waitFor(() =>
      expect(screen.queryByRole('status', { name: /loading/i })).toBeNull()
    );

    // Booked row has a Check In button
    expect(container.querySelector('#btn-checkin-res-mock-001')).toBeTruthy();
    // CheckedIn row does NOT
    expect(container.querySelector('#btn-checkin-res-mock-002')).toBeNull();
  });

  it('View Details links point to /staff/reservations/[id]', async () => {
    mockFetchSuccess([makeRow({ reservation_id: 'res-mock-abc' })]);

    const { container } = render(<StaffReservationsPage />);

    await waitFor(() =>
      expect(screen.queryByRole('status', { name: /loading/i })).toBeNull()
    );

    const link = container.querySelector('#btn-view-res-mock-abc') as HTMLAnchorElement | null;
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('/staff/reservations/res-mock-abc');
  });

  /* ── Empty state ────────────────────────────────────────────────────────── */

  it('shows the empty state when no reservations are returned', async () => {
    mockFetchSuccess([]);

    render(<StaffReservationsPage />);

    await waitFor(() =>
      expect(screen.queryByRole('status', { name: /loading/i })).toBeNull()
    );

    expect(screen.getByText(/no active reservations/i)).toBeTruthy();
  });

  /* ── Client-side filtering ───────────────────────────────────────────────── */

  it('filters rows by status when the status select changes', async () => {
    const rows = [
      makeRow({ reservation_id: 'res-mock-001', guest_full_name: 'Amal Perera', reservation_status: 'Booked' }),
      makeRow({ reservation_id: 'res-mock-002', guest_full_name: 'Nimal Silva', reservation_status: 'CheckedIn' }),
    ];
    mockFetchSuccess(rows);

    render(<StaffReservationsPage />);

    await waitFor(() => expect(screen.getByText('Amal Perera')).toBeTruthy());

    // Filter to CheckedIn
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: 'CheckedIn' },
    });

    // Nimal Silva (CheckedIn) is visible
    expect(screen.getByText('Nimal Silva')).toBeTruthy();
    // Amal Perera (Booked) is not
    expect(screen.queryByText('Amal Perera')).toBeNull();
  });

  it('filters rows by guest name search', async () => {
    const rows = [
      makeRow({ reservation_id: 'res-mock-001', guest_full_name: 'Amal Perera' }),
      makeRow({ reservation_id: 'res-mock-002', guest_full_name: 'Nimal Silva' }),
    ];
    mockFetchSuccess(rows);

    render(<StaffReservationsPage />);

    await waitFor(() => expect(screen.getByText('Amal Perera')).toBeTruthy());

    fireEvent.change(screen.getByLabelText(/guest name or reservation id/i), {
      target: { value: 'Nimal' },
    });

    expect(screen.getByText('Nimal Silva')).toBeTruthy();
    expect(screen.queryByText('Amal Perera')).toBeNull();
  });

  it('filters rows by reservation ID prefix search', async () => {
    const rows = [
      makeRow({ reservation_id: 'res-mock-aaa', guest_full_name: 'Amal Perera' }),
      makeRow({ reservation_id: 'res-mock-bbb', guest_full_name: 'Nimal Silva' }),
    ];
    mockFetchSuccess(rows);

    render(<StaffReservationsPage />);

    await waitFor(() => expect(screen.getByText('Amal Perera')).toBeTruthy());

    fireEvent.change(screen.getByLabelText(/guest name or reservation id/i), {
      target: { value: 'res-mock-bbb' },
    });

    expect(screen.getByText('Nimal Silva')).toBeTruthy();
    expect(screen.queryByText('Amal Perera')).toBeNull();
  });

  it('shows empty state with "no matching" message when filters produce no results', async () => {
    mockFetchSuccess([makeRow({ guest_full_name: 'Amal Perera' })]);

    render(<StaffReservationsPage />);

    await waitFor(() => expect(screen.getByText('Amal Perera')).toBeTruthy());

    fireEvent.change(screen.getByLabelText(/guest name or reservation id/i), {
      target: { value: 'XXXXXXXX' },
    });

    expect(screen.getByText(/no matching reservations/i)).toBeTruthy();
  });

  it('clears all filters when "Clear filters" button is clicked', async () => {
    const rows = [
      makeRow({ reservation_id: 'res-mock-001', guest_full_name: 'Amal Perera', reservation_status: 'Booked' }),
      makeRow({ reservation_id: 'res-mock-002', guest_full_name: 'Nimal Silva', reservation_status: 'CheckedIn' }),
    ];
    mockFetchSuccess(rows);

    render(<StaffReservationsPage />);

    await waitFor(() => expect(screen.getByText('Amal Perera')).toBeTruthy());

    // Apply a filter so the Clear button appears
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: 'CheckedIn' },
    });

    // Clear filters button should appear
    const clearBtn = screen.getByRole('button', { name: /clear filters/i });
    expect(clearBtn).toBeTruthy();

    fireEvent.click(clearBtn);

    // Both rows visible again
    expect(screen.getByText('Amal Perera')).toBeTruthy();
    expect(screen.getByText('Nimal Silva')).toBeTruthy();
    // Clear button is gone
    expect(screen.queryByRole('button', { name: /clear filters/i })).toBeNull();
  });

  /* ── Error state and retry ───────────────────────────────────────────────── */

  it('shows an error alert when the API call fails', async () => {
    mockFetchError(500, 'An unexpected error occurred.');

    render(<StaffReservationsPage />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeTruthy()
    );

    expect(screen.getByText(/failed to load reservations/i)).toBeTruthy();
    expect(screen.getByText(/an unexpected error occurred/i)).toBeTruthy();
  });

  it('shows an error alert on network failure', async () => {
    mockFetchNetworkError();

    render(<StaffReservationsPage />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeTruthy()
    );

    expect(screen.getByText(/network error/i)).toBeTruthy();
  });

  it('retries the fetch when "Try Again" is clicked after an error', async () => {
    // First call: error
    mockFetchError(500, 'Temporary failure.');
    // Second call: success
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok:     true,
      status: 200,
      json:   async () => ({ data: [makeRow()], meta: { requestId: 'r2' } }),
    } as Response);

    render(<StaffReservationsPage />);

    // Wait for error state
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());

    // Click retry
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    // Should show loading then data
    await waitFor(() =>
      expect(screen.getByText('Amal Perera')).toBeTruthy()
    );

    // Error is gone
    expect(screen.queryByRole('alert')).toBeNull();
  });

  /* ── Accessibility ───────────────────────────────────────────────────────── */

  it('renders the reservations table with an accessible label', async () => {
    mockFetchSuccess([makeRow()]);

    render(<StaffReservationsPage />);

    await waitFor(() => expect(screen.getByText('Amal Perera')).toBeTruthy());

    expect(screen.getByRole('table', { name: /active reservations/i })).toBeTruthy();
  });

  /* ── Required element IDs ────────────────────────────────────────────────── */

  it('has all required element IDs', async () => {
    mockFetchSuccess([makeRow({ reservation_id: 'res-mock-001' })]);

    const { container } = render(<StaffReservationsPage />);

    await waitFor(() => expect(screen.getByText('Amal Perera')).toBeTruthy());

    const ids = [
      'staff-reservations-main',
      'filter-branch',
      'filter-status',
      'filter-search',
      'reservations-table',
      'row-res-mock-001',
      'btn-view-res-mock-001',
      'btn-checkin-res-mock-001',
    ];

    for (const id of ids) {
      expect(container.querySelector(`#${id}`), `Expected element with id="${id}" to exist`).toBeTruthy();
    }
  });

  it('has the reservations-loading id during the loading phase', () => {
    vi.spyOn(global, 'fetch').mockReturnValueOnce(new Promise(() => {}));

    const { container } = render(<StaffReservationsPage />);

    expect(container.querySelector('#reservations-loading')).toBeTruthy();
  });

  it('has the reservations-error id in the error state', async () => {
    mockFetchError();

    const { container } = render(<StaffReservationsPage />);

    await waitFor(() =>
      expect(container.querySelector('#reservations-error')).toBeTruthy()
    );
  });

  it('has the reservations-empty id in the empty state', async () => {
    mockFetchSuccess([]);

    const { container } = render(<StaffReservationsPage />);

    await waitFor(() =>
      expect(container.querySelector('#reservations-empty')).toBeTruthy()
    );
  });

  it('has the btn-clear-filters id when filters are active', async () => {
    mockFetchSuccess([makeRow()]);

    const { container } = render(<StaffReservationsPage />);

    await waitFor(() => expect(screen.getByText('Amal Perera')).toBeTruthy());

    // Activate a filter
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: 'CheckedIn' },
    });

    expect(container.querySelector('#btn-clear-filters')).toBeTruthy();
  });
});
