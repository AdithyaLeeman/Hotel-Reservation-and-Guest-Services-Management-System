/**
 * Tests for /staff/reservations/[id]/services page (P04-M04-T17)
 *
 * Strategy: render with @testing-library/react, mock fetch for both
 * GET /api/staff/services (catalogue) and POST /api/staff/reservations/[id]/services.
 * Verify form render, catalogue load, successful log, and error handling.
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T17 (Mock-First)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ServiceUsageLoggingPage from './page';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/StaffNav', () => ({
  default: () => <nav data-testid="staff-nav">StaffNav</nav>,
}));

// React 19 `use(params)` — mock params as a resolved promise
const RESERVATION_ID = 'res-mock-001';
const MOCK_PARAMS = Promise.resolve({ id: RESERVATION_ID });

// Catalogue response
const MOCK_CATALOGUE = [
  { service_id: 1, service_name: 'Room Service',  current_price: 1200, status: 'Active' },
  { service_id: 2, service_name: 'Spa Treatment', current_price: 5000, status: 'Active' },
  { service_id: 3, service_name: 'Laundry',       current_price:  800, status: 'Active' },
];

// New usage row returned by POST
const MOCK_NEW_USAGE = {
  usage_id:      'u-new-001',
  reservation_id: RESERVATION_ID,
  service_id:    1,
  quantity:      2,
  usage_date:    '2026-09-29',
  charged_price: 1200,
  channel:       'FrontDesk',
};

// ---------------------------------------------------------------------------
// fetch mock helper
// ---------------------------------------------------------------------------
function mockFetchSequence(responses: Array<{ ok: boolean; body: object }>) {
  let call = 0;
  return vi.spyOn(global, 'fetch').mockImplementation(async () => {
    const r = responses[call] ?? responses[responses.length - 1];
    call++;
    return {
      ok:   r.ok,
      status: r.ok ? 200 : 500,
      json: async () => r.body,
    } as Response;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('/staff/reservations/[id]/services page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders page heading with reservation ID', async () => {
    mockFetchSequence([{ ok: true, body: { data: MOCK_CATALOGUE } }]);

    render(<ServiceUsageLoggingPage params={MOCK_PARAMS} />);

    expect(screen.getByRole('heading', { name: /log service usage/i })).toBeTruthy();
    expect(screen.getByText(RESERVATION_ID)).toBeTruthy();
  });

  it('shows loading state then populates catalogue select', async () => {
    mockFetchSequence([{ ok: true, body: { data: MOCK_CATALOGUE } }]);

    render(<ServiceUsageLoggingPage params={MOCK_PARAMS} />);

    // Loading text appears first
    expect(screen.getByText(/loading catalogue/i)).toBeTruthy();

    // After fetch resolves, select is populated
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /service/i })).toBeTruthy()
    );

    const options = screen.getAllByRole('option');
    // 1 placeholder + 3 catalogue items
    expect(options.length).toBeGreaterThanOrEqual(4);
  });

  it('shows existing usage rows and service total in the table', async () => {
    mockFetchSequence([{ ok: true, body: { data: MOCK_CATALOGUE } }]);

    render(<ServiceUsageLoggingPage params={MOCK_PARAMS} />);

    await waitFor(() => screen.getByRole('table', { name: /service usage breakdown/i }));

    // Pre-existing mock row
    expect(screen.getByText('Room Service')).toBeTruthy();
    // line total of the pre-existing mock row (1200 * 2 = 2400)
    expect(screen.getByText(/2,400/)).toBeTruthy();
  });

  it('submit button is disabled when no service is selected', async () => {
    mockFetchSequence([{ ok: true, body: { data: MOCK_CATALOGUE } }]);

    render(<ServiceUsageLoggingPage params={MOCK_PARAMS} />);

    await waitFor(() => screen.getByRole('combobox', { name: /service/i }));

    const submitBtn = screen.getByRole('button', { name: /log service/i });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('appends a new row and shows success toast after successful POST', async () => {
    mockFetchSequence([
      { ok: true, body: { data: MOCK_CATALOGUE } },                    // GET catalogue
      { ok: true, body: { data: MOCK_NEW_USAGE } },                    // POST usage
    ]);

    render(<ServiceUsageLoggingPage params={MOCK_PARAMS} />);

    await waitFor(() => screen.getByRole('combobox', { name: /service/i }));

    // Select service ID 1 (Room Service)
    fireEvent.change(screen.getByRole('combobox', { name: /service/i }), {
      target: { name: 'service_id', value: '1' },
    });

    // Set quantity
    fireEvent.change(screen.getByRole('spinbutton', { name: /quantity/i }), {
      target: { name: 'quantity', value: '2' },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /log service/i }));

    await waitFor(() =>
      expect(screen.getByText(/service logged successfully/i)).toBeTruthy()
    );
  });

  it('shows error alert when POST fails', async () => {
    mockFetchSequence([
      { ok: true,  body: { data: MOCK_CATALOGUE } },
      { ok: false, body: { error: { message: 'Reservation is not checked in.' } } },
    ]);

    render(<ServiceUsageLoggingPage params={MOCK_PARAMS} />);

    await waitFor(() => screen.getByRole('combobox', { name: /service/i }));

    fireEvent.change(screen.getByRole('combobox', { name: /service/i }), {
      target: { name: 'service_id', value: '1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /log service/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeTruthy()
    );
    expect(screen.getByText(/reservation is not checked in/i)).toBeTruthy();
  });

  it('falls back to inline mock catalogue when GET /api/staff/services fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    render(<ServiceUsageLoggingPage params={MOCK_PARAMS} />);

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /service/i })).toBeTruthy()
    );

    // Fallback catalogue has Room Service
    expect(screen.getByText(/Room Service/)).toBeTruthy();
  });
});