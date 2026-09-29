/**
 * Tests for /staff/checkin page (P04-M04-T16)
 *
 * Strategy: render the page with @testing-library/react, interact with the
 * search form and check-in button, verify correct UI state transitions.
 * The fetch call is mocked so no real network requests are made.
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T16 (Mock-First)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import StaffCheckinPage from './page';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/StaffNav', () => ({
  default: () => <nav data-testid="staff-nav">StaffNav</nav>,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockFetch(ok: boolean, body: object) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 409,
    json:   async () => body,
  } as Response);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('/staff/checkin page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders page heading and search form', () => {
    render(<StaffCheckinPage />);
    expect(screen.getByRole('heading', { name: /check-in guest/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /search/i })).toBeTruthy();
    expect(screen.getByPlaceholderText(/reservation id/i)).toBeTruthy();
  });

  it('shows idle placeholder before any search', () => {
    render(<StaffCheckinPage />);
    expect(screen.getByText(/enter a reservation id above to begin/i)).toBeTruthy();
  });

  it('shows loading indicator while searching', async () => {
    render(<StaffCheckinPage />);
    const input = screen.getByPlaceholderText(/reservation id/i);
    const btn   = screen.getByRole('button', { name: /search/i });

    fireEvent.change(input, { target: { value: 'res-mock-001' } });
    fireEvent.click(btn);

    expect(screen.getByRole('status', { name: /loading reservation details/i })).toBeTruthy();
  });

  it('shows reservation card for a valid Booked reservation ID', async () => {
    render(<StaffCheckinPage />);
    const input = screen.getByPlaceholderText(/reservation id/i);
    const btn   = screen.getByRole('button', { name: /search/i });

    fireEvent.change(input, { target: { value: 'res-mock-001' } });
    fireEvent.click(btn);

    await act(async () => { vi.runAllTimers(); });

    expect(screen.getByText('Amal Perera')).toBeTruthy();
    expect(screen.getByText('Booked')).toBeTruthy();
    expect(screen.getByRole('button', { name: /confirm check-in/i })).toBeTruthy();
  });

  it('shows ineligible notice for an already-checked-in reservation', async () => {
    render(<StaffCheckinPage />);
    const input = screen.getByPlaceholderText(/reservation id/i);

    fireEvent.change(input, { target: { value: 'res-mock-002' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await act(async () => { vi.runAllTimers(); });

    expect(screen.getByText(/already checked in/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /confirm check-in/i })).toBeNull();
  });

  it('shows error message for an unknown reservation ID', async () => {
    render(<StaffCheckinPage />);
    const input = screen.getByPlaceholderText(/reservation id/i);

    fireEvent.change(input, { target: { value: 'res-unknown-999' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await act(async () => { vi.runAllTimers(); });

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/no reservation found/i)).toBeTruthy();
  });

  it('shows success panel after successful check-in API call', async () => {
    mockFetch(true, { data: { reservation_id: 'res-mock-001', status: 'CheckedIn' } });

    render(<StaffCheckinPage />);
    const input = screen.getByPlaceholderText(/reservation id/i);

    fireEvent.change(input, { target: { value: 'res-mock-001' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await act(async () => { vi.runAllTimers(); });

    fireEvent.click(screen.getByRole('button', { name: /confirm check-in/i }));

    await waitFor(() =>
      expect(screen.getByText(/check-in successful/i)).toBeTruthy()
    );
  });

  it('shows error alert when check-in API call fails', async () => {
    mockFetch(false, { error: { message: 'Reservation is not in Booked status.' } });

    render(<StaffCheckinPage />);
    const input = screen.getByPlaceholderText(/reservation id/i);

    fireEvent.change(input, { target: { value: 'res-mock-001' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await act(async () => { vi.runAllTimers(); });

    fireEvent.click(screen.getByRole('button', { name: /confirm check-in/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeTruthy()
    );
    expect(screen.getByText(/reservation is not in booked status/i)).toBeTruthy();
  });

  it('clears state when Clear button is clicked', async () => {
    render(<StaffCheckinPage />);
    const input = screen.getByPlaceholderText(/reservation id/i);

    fireEvent.change(input, { target: { value: 'res-mock-001' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await act(async () => { vi.runAllTimers(); });

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(screen.getByText(/enter a reservation id above to begin/i)).toBeTruthy();
    expect((screen.getByPlaceholderText(/reservation id/i) as HTMLInputElement).value).toBe('');
  });
});