// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchPage from './page';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('SearchPage (/search)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders search form elements with proper accessible labels', () => {
    render(<SearchPage />);

    expect(screen.getByLabelText(/destination/i)).toBeTruthy();
    expect(screen.getByLabelText(/check-in date/i)).toBeTruthy();
    expect(screen.getByLabelText(/check-out date/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /search available rooms/i })).toBeTruthy();
  });

  it('renders default branch options', () => {
    render(<SearchPage />);

    const select = screen.getByLabelText(/destination/i) as HTMLSelectElement;
    expect(select.options.length).toBeGreaterThan(1);
    expect(screen.getByRole('option', { name: /colombo/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /kandy/i })).toBeTruthy();
    expect(screen.getByRole('option', { name: /galle/i })).toBeTruthy();
  });

  it('allows toggling amenity filter pills', () => {
    render(<SearchPage />);

    const wifiBtn = screen.getByRole('button', { name: /\+ Wi-Fi/i });
    expect(wifiBtn).toBeTruthy();

    fireEvent.click(wifiBtn);
    expect(screen.getByRole('button', { name: /✓ Wi-Fi/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /✓ Wi-Fi/i }));
    expect(screen.getByRole('button', { name: /\+ Wi-Fi/i })).toBeTruthy();
  });

  it('shows validation error when branch is not selected on submit', async () => {
    render(<SearchPage />);

    const form = screen.getByRole('form', { name: /room availability search/i });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/please select a branch/i)).toBeTruthy();
    });
  });

  it('fetches availability and renders results on valid submit', async () => {
    const mockRooms = [
      {
        room_id: 101,
        room_number: '101',
        branch_id: 1,
        branch_name: 'Colombo',
        type_id: 1,
        type_name: 'Single',
        capacity: 1,
        daily_rate: '5000.00',
        total_price: '5000.00',
        nights: 1,
        amenities: ['Wi-Fi'],
        status: 'Available',
      },
    ];

    vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/availability')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              rooms: mockRooms,
              checkIn: '2026-10-10',
              checkOut: '2026-10-11',
              nightsRequested: 1,
            },
            meta: { requestId: 'req-1' },
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      } as Response;
    });

    render(<SearchPage />);

    // Select branch Colombo (id 1)
    const branchSelect = screen.getByLabelText(/destination/i);
    fireEvent.change(branchSelect, { target: { name: 'branchId', value: '1' } });

    // Submit form
    const form = screen.getByRole('form', { name: /room availability search/i });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/room 101/i)).toBeTruthy();
      expect(screen.getAllByText(/single/i).length).toBeGreaterThan(0);
    });
  });
});
