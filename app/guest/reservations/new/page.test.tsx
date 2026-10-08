// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewReservationPage from './page';

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('NewReservationPage (/guest/reservations/new)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams({
      roomId: '1',
      branchId: '1',
      checkIn: '2026-10-15',
      checkOut: '2026-10-17',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders booking summary with branch name and night count when valid query params are present', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/branches')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              { branch_id: 1, location_name: 'Colombo' },
              { branch_id: 2, location_name: 'Kandy' },
            ],
          }),
        } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    });

    render(<NewReservationPage />);

    expect(screen.getByRole('heading', { name: /confirm your reservation/i })).toBeTruthy();
    expect(screen.getAllByText(/2 nights/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /confirm booking/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getAllByText(/colombo/i).length).toBeGreaterThan(0);
    });
  });

  it('displays error banner if required query params are missing', () => {
    mockSearchParams = new URLSearchParams({});

    render(<NewReservationPage />);

    expect(screen.getByText(/invalid booking parameters/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /back to room search/i })).toBeTruthy();
  });

  it('submits booking and navigates to confirmation on success', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL, opts?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/branches')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ branch_id: 1, location_name: 'Colombo' }],
          }),
        } as Response;
      }
      if (urlStr.includes('/api/guest/reservations') && opts?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            data: { reservation_id: 'res-new-123' },
            meta: { requestId: 'req-new' },
          }),
        } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    });

    render(<NewReservationPage />);

    const confirmBtn = screen.getByRole('button', { name: /confirm booking/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/guest/book/confirm?id=res-new-123')
      );
    });
  });
});
