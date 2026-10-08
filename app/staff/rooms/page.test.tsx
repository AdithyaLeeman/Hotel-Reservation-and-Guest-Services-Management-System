// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StaffRoomsPage from './page';

vi.mock('@/components/RoomForm', () => ({
  default: () => <div data-testid="room-form-modal">Room Form Modal</div>,
}));

const MOCK_ROOMS = [
  {
    room_id: 1,
    room_number: '101',
    branch_id: 1,
    type_id: 1,
    status: 'Available',
    room_type: { type_id: 1, type_name: 'Single', capacity: 1, daily_rate: '5000.00' },
  },
  {
    room_id: 2,
    room_number: '201',
    branch_id: 2,
    type_id: 2,
    status: 'Occupied',
    room_type: { type_id: 2, type_name: 'Double', capacity: 2, daily_rate: '8000.00' },
  },
];

describe('StaffRoomsPage (/staff/rooms)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockApi(rooms = MOCK_ROOMS) {
    return vi.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/staff/rooms')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: rooms }),
        } as Response;
      }
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
      if (urlStr.includes('/api/room-types')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              { type_id: 1, type_name: 'Single', capacity: 1, daily_rate: '5000.00' },
              { type_id: 2, type_name: 'Double', capacity: 2, daily_rate: '8000.00' },
            ],
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      } as Response;
    });
  }

  it('renders heading, filter dropdowns, and room table rows', async () => {
    mockApi();

    render(<StaffRoomsPage />);

    expect(screen.getByRole('heading', { name: /room management/i })).toBeTruthy();
    expect(screen.getByLabelText(/^branch$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^status$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^room type$/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /create a new room/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('101')).toBeTruthy();
      expect(screen.getByText('201')).toBeTruthy();
    });
  });

  it('opens RoomForm modal when Add Room button is clicked', async () => {
    mockApi();

    render(<StaffRoomsPage />);

    const addBtn = screen.getByRole('button', { name: /create a new room/i });
    fireEvent.click(addBtn);

    expect(screen.getByTestId('room-form-modal')).toBeTruthy();
  });

  it('filters rooms by branch selection', async () => {
    mockApi();

    render(<StaffRoomsPage />);

    await waitFor(() => {
      expect(screen.getByText('101')).toBeTruthy();
    });

    const branchSelect = screen.getByLabelText(/^branch$/i);
    fireEvent.change(branchSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeTruthy();
    });
  });
});
