// @vitest-environment jsdom
/**
 * Component tests for /staff/reservations/[id] page (P03-M03-T22)
 *
 * Strategy: render the page with @testing-library/react, mock global.fetch to
 * control API responses, and verify correct UI state transitions for:
 *   - Loading skeleton
 *   - Successful reservation detail rendering (all fields)
 *   - Guest information display
 *   - Dates, status badge, and rooms table
 *   - 404 / not-found state with back link
 *   - API / network error with retry button
 *   - Booked status: Check In + Cancel Reservation buttons present
 *   - CheckedIn status: Check Out + Services link present
 *   - Terminal states (CheckedOut, Cancelled): no action buttons
 *   - Correct API endpoint called when an action is confirmed
 *
 * Environment: jsdom -- enforced via @vitest-environment docblock.
 *
 * Owned by: Member 3 (M3) | Task: P03-M03-T22 (Mock-First)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import StaffReservationDetailPage from './page';
import type { ReservationDetail } from '@/repositories/reservation.repository';

/* ---- Mocks ---------------------------------------------------------------- */

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

/* ---- Helpers -------------------------------------------------------------- */

/** Build a resolved Promise<{ id: string }> with required Promise shape for Next.js 15 */
function makeParams(id = 'res-mock-001'): Promise<{ id: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = Promise.resolve({ id }) as any;
  p.status = 'fulfilled';
  p.value  = { id };
  return p as Promise<{ id: string }>;
}

/** Build a complete ReservationDetail fixture */
function makeDetail(overrides: Partial<ReservationDetail> = {}): ReservationDetail {
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
    created_at:                  '2026-09-15T08:00:00Z',
    rooms: [
      {
        room_id:        101,
        room_number:    '101',
        type_name:      'Deluxe Double',
        rate_per_night: '25000.00',
      },
    ],
    ...overrides,
  };
}

/** Stub global.fetch to return a successful GET detail response */
function mockFetchSuccess(detail: ReservationDetail) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok:     true,
    status: 200,
    json:   async () => ({ data: detail, meta: { requestId: 'test-req-id' } }),
  } as Response);
}

/** Stub global.fetch to return a 404 response */
function mockFetch404() {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok:     false,
    status: 404,
    json:   async () => ({ error: { code: 'NOT_FOUND', message: 'Not found.' } }),
  } as Response);
}

/** Stub global.fetch to return an HTTP error response */
function mockFetchError(status = 500, message = 'Internal server error.') {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok:     false,
    status,
    json:   async () => ({ error: { code: 'INTERNAL_ERROR', message } }),
  } as Response);
}

/** Stub global.fetch to throw a network error */
function mockFetchNetworkError() {
  return vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network failure'));
}

/** Stub a sequence of fetch calls (first call, then subsequent) */
function mockFetchSequence(
  responses: Array<{ ok: boolean; status: number; body: object }>
) {
  let call = 0;
  return vi.spyOn(global, 'fetch').mockImplementation(async () => {
    const r = responses[call] ?? responses[responses.length - 1];
    call++;
    return {
      ok:     r.ok,
      status: r.status,
      json:   async () => r.body,
    } as Response;
  });
}

/* ---- Tests ---------------------------------------------------------------- */

describe('/staff/reservations/[id] page (P03-M03-T22)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* -- Loading state -------------------------------------------------------- */

  it('renders the loading skeleton on initial mount', () => {
    mockFetchSuccess(makeDetail());

    render(<StaffReservationDetailPage params={makeParams()} />);

    expect(screen.getByRole('status', { name: /loading reservation details/i })).toBeTruthy();
  });

  /* -- Successful rendering ------------------------------------------------- */

  it('renders reservation ID after successful fetch', async () => {
    const detail = makeDetail({ reservation_id: 'res-mock-001' });
    mockFetchSuccess(detail);

    render(<StaffReservationDetailPage params={makeParams('res-mock-001')} />);

    await waitFor(() =>
      expect(screen.getByText('res-mock-001')).toBeTruthy()
    );
  });

  it('renders status badge for Booked reservation', async () => {
    mockFetchSuccess(makeDetail({ reservation_status: 'Booked' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByLabelText(/status: booked/i)).toBeTruthy()
    );
  });

  it('renders booking source badge', async () => {
    mockFetchSuccess(makeDetail({ booking_source: 'Reception' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByText('Reception')).toBeTruthy()
    );
  });

  it('renders branch name', async () => {
    mockFetchSuccess(makeDetail({ branch_location_name: 'Kandy' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    // Wait for fetch; branch appears in multiple nodes (subtitle + detail row)
    // so use findAllByText and confirm at least one element contains the text.
    const els = await screen.findAllByText(/SkyNest Kandy/);
    expect(els.length).toBeGreaterThan(0);
  });

  /* -- Guest information ---------------------------------------------------- */

  it('renders guest full name', async () => {
    mockFetchSuccess(makeDetail({ guest_full_name: 'Nimal Silva' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByText('Nimal Silva')).toBeTruthy()
    );
  });

  it('renders guest email with mailto link', async () => {
    mockFetchSuccess(makeDetail({ guest_email: 'nimal@example.com' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /nimal@example.com/i });
      expect(link).toBeTruthy();
      expect((link as HTMLAnchorElement).href).toContain('mailto:nimal@example.com');
    });
  });

  it('renders guest ID', async () => {
    mockFetchSuccess(makeDetail({ guest_id: 'guest-mock-007' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByText('guest-mock-007')).toBeTruthy()
    );
  });

  /* -- Dates and duration --------------------------------------------------- */

  it('renders check-in and check-out dates', async () => {
    mockFetchSuccess(makeDetail({
      check_in_date:  '2026-10-01',
      check_out_date: '2026-10-05',
    }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() => {
      expect(screen.getByText(/01 Oct 2026/)).toBeTruthy();
      expect(screen.getByText(/05 Oct 2026/)).toBeTruthy();
    });
  });

  it('renders number of nights derived from dates', async () => {
    mockFetchSuccess(makeDetail({
      check_in_date:  '2026-10-01',
      check_out_date: '2026-10-05',
    }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByText(/4 nights/)).toBeTruthy()
    );
  });

  it('renders discount percentage when present', async () => {
    mockFetchSuccess(makeDetail({ discount_percentage: '10.00' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByText(/10\.00%/)).toBeTruthy()
    );
  });

  it('renders "None" when no discount is set', async () => {
    mockFetchSuccess(makeDetail({ discount_percentage: null }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByText('None')).toBeTruthy()
    );
  });

  it('renders processed by employee ID when present', async () => {
    mockFetchSuccess(makeDetail({ processed_by_employee_id: 7 }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByText('#7')).toBeTruthy()
    );
  });

  /* -- Rooms table ---------------------------------------------------------- */

  it('renders room number, type, and rate per night', async () => {
    mockFetchSuccess(makeDetail({
      rooms: [
        { room_id: 205, room_number: '205', type_name: 'Suite', rate_per_night: '50000.00' },
      ],
    }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() => {
      expect(screen.getByText(/Room 205/)).toBeTruthy();
      expect(screen.getByText('Suite')).toBeTruthy();
      expect(screen.getByText(/50,000\.00/)).toBeTruthy();
    });
  });

  it('renders historical rate note in rooms section', async () => {
    mockFetchSuccess(makeDetail());

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(
        screen.getByText(/historical snapshot captured at booking time/i)
      ).toBeTruthy()
    );
  });

  it('renders "No room records found" when rooms array is empty', async () => {
    mockFetchSuccess(makeDetail({ rooms: [] }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByText(/No room records found/i)).toBeTruthy()
    );
  });

  /* -- Back link ------------------------------------------------------------ */

  it('renders back link to /staff/reservations', async () => {
    mockFetchSuccess(makeDetail());

    render(<StaffReservationDetailPage params={makeParams()} />);

    // Back link appears immediately in the header
    const backLinks = await screen.findAllByRole('link', { name: /reservations/i });
    const hasBackLink = backLinks.some(
      (el) => (el as HTMLAnchorElement).href.includes('/staff/reservations')
    );
    expect(hasBackLink).toBe(true);
  });

  /* -- 404 state ------------------------------------------------------------ */

  it('shows not-found state when API returns 404', async () => {
    mockFetch404();

    render(<StaffReservationDetailPage params={makeParams('res-does-not-exist')} />);

    await waitFor(() =>
      expect(screen.getByText(/reservation not found/i)).toBeTruthy()
    );
  });

  it('shows back link in not-found state', async () => {
    mockFetch404();

    render(<StaffReservationDetailPage params={makeParams('res-does-not-exist')} />);

    await waitFor(() => {
      // Multiple "back to reservations" links may be present (header + mobile);
      // target the one specific to the not-found state via its id.
      const btn = document.getElementById('not-found-back-btn') as HTMLAnchorElement | null;
      expect(btn).toBeTruthy();
      expect(btn!.href).toContain('/staff/reservations');
    });
  });

  /* -- Error state ---------------------------------------------------------- */

  it('shows error message and retry button on API failure', async () => {
    mockFetchError(500, 'Something broke on the server.');

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText(/Something broke on the server/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
    });
  });

  it('shows error message and retry button on network error', async () => {
    mockFetchNetworkError();

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText(/network error/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
    });
  });

  it('re-fetches when retry button is clicked', async () => {
    // First call: network error; second call: success
    mockFetchNetworkError();

    render(<StaffReservationDetailPage params={makeParams()} />);

    // Wait for error state
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy()
    );

    // Set up success for second call
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok:     true,
      status: 200,
      json:   async () => ({ data: makeDetail(), meta: { requestId: 'r2' } }),
    } as Response);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() =>
      expect(screen.getByText('res-mock-001')).toBeTruthy()
    );
  });

  /* -- Booked status actions ------------------------------------------------ */

  it('shows Check In and Cancel Reservation buttons for Booked status', async () => {
    mockFetchSuccess(makeDetail({ reservation_status: 'Booked' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /check in this reservation/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /cancel this reservation/i })).toBeTruthy();
    });
  });

  it('does NOT show Check Out or Services for Booked status', async () => {
    mockFetchSuccess(makeDetail({ reservation_status: 'Booked' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /check in this reservation/i })).toBeTruthy()
    );

    expect(screen.queryByRole('button', { name: /check out this reservation/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /add or view service usage/i })).toBeNull();
  });

  it('opens Check In confirmation dialog when Check In button is clicked', async () => {
    mockFetchSuccess(makeDetail({ reservation_status: 'Booked' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /check in this reservation/i })).toBeTruthy()
    );

    fireEvent.click(screen.getByRole('button', { name: /check in this reservation/i }));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/confirm check-in/i)).toBeTruthy();
  });

  it('opens Cancel confirmation dialog when Cancel button is clicked', async () => {
    mockFetchSuccess(makeDetail({ reservation_status: 'Booked' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /cancel this reservation/i })).toBeTruthy()
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel this reservation/i }));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/confirm cancellation/i)).toBeTruthy();
  });

  it('calls PATCH /cancel endpoint when Cancel is confirmed', async () => {
    const detail = makeDetail({ reservation_status: 'Booked' });
    // First fetch: load detail; second: cancel action; third: re-fetch after success
    const fetchSpy = mockFetchSequence([
      { ok: true,  status: 200, body: { data: detail, meta: { requestId: 'r1' } } },
      { ok: true,  status: 200, body: { data: { reservation_id: 'res-mock-001', reservation_status: 'Cancelled' }, meta: { requestId: 'r2' } } },
      { ok: true,  status: 200, body: { data: { ...detail, reservation_status: 'Cancelled' }, meta: { requestId: 'r3' } } },
    ]);

    render(<StaffReservationDetailPage params={makeParams()} />);

    // Wait for Booked actions
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /cancel this reservation/i })).toBeTruthy()
    );

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /cancel this reservation/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    // Confirm
    fireEvent.click(screen.getByRole('button', { name: /cancel reservation/i }));

    await waitFor(() => {
      // The second fetch call (index 1) should be the cancel PATCH
      const calls = fetchSpy.mock.calls;
      const cancelCall = calls.find(
        (args) =>
          typeof args[0] === 'string' &&
          args[0].includes('/cancel') &&
          (args[1] as RequestInit)?.method === 'PATCH'
      );
      expect(cancelCall).toBeTruthy();
    });
  });

  it('calls POST /checkin endpoint when Check In is confirmed', async () => {
    const detail = makeDetail({ reservation_status: 'Booked' });
    const fetchSpy = mockFetchSequence([
      { ok: true, status: 200, body: { data: detail, meta: { requestId: 'r1' } } },
      { ok: true, status: 200, body: { data: { reservation_id: 'res-mock-001', status: 'CheckedIn' }, meta: { requestId: 'r2' } } },
      { ok: true, status: 200, body: { data: { ...detail, reservation_status: 'CheckedIn' }, meta: { requestId: 'r3' } } },
    ]);

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /check in this reservation/i })).toBeTruthy()
    );

    fireEvent.click(screen.getByRole('button', { name: /check in this reservation/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /^check in$/i }));

    await waitFor(() => {
      const calls = fetchSpy.mock.calls;
      const checkinCall = calls.find(
        (args) =>
          typeof args[0] === 'string' &&
          args[0].includes('/checkin') &&
          (args[1] as RequestInit)?.method === 'POST'
      );
      expect(checkinCall).toBeTruthy();
    });
  });

  it('dismisses confirmation dialog when Cancel is clicked in modal', async () => {
    mockFetchSuccess(makeDetail({ reservation_status: 'Booked' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /cancel this reservation/i })).toBeTruthy()
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel this reservation/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    // Click the "Cancel" ghost button inside the modal footer
    const modalCancelBtn = screen.getByRole('button', { name: /^cancel$/i });
    fireEvent.click(modalCancelBtn);

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).toBeNull()
    );
  });

  /* -- CheckedIn status actions --------------------------------------------- */

  it('shows Check Out and Services link for CheckedIn status', async () => {
    mockFetchSuccess(makeDetail({ reservation_status: 'CheckedIn' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /check out this reservation/i })).toBeTruthy();
      expect(screen.getByRole('link', { name: /add or view service usage/i })).toBeTruthy();
    });
  });

  it('does NOT show Check In or Cancel for CheckedIn status', async () => {
    mockFetchSuccess(makeDetail({ reservation_status: 'CheckedIn' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /check out this reservation/i })).toBeTruthy()
    );

    expect(screen.queryByRole('button', { name: /check in this reservation/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /cancel this reservation/i })).toBeNull();
  });

  it('services link points to /staff/reservations/[id]/services', async () => {
    mockFetchSuccess(makeDetail({ reservation_status: 'CheckedIn' }));

    render(<StaffReservationDetailPage params={makeParams('res-mock-001')} />);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /add or view service usage/i });
      expect((link as HTMLAnchorElement).href).toContain(
        '/staff/reservations/res-mock-001/services'
      );
    });
  });

  it('opens Check Out confirmation dialog when Check Out button is clicked', async () => {
    mockFetchSuccess(makeDetail({ reservation_status: 'CheckedIn' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /check out this reservation/i })).toBeTruthy()
    );

    fireEvent.click(screen.getByRole('button', { name: /check out this reservation/i }));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/confirm check-out/i)).toBeTruthy();
  });

  it('calls POST /checkout endpoint when Check Out is confirmed', async () => {
    const detail = makeDetail({ reservation_status: 'CheckedIn' });
    const fetchSpy = mockFetchSequence([
      { ok: true, status: 200, body: { data: detail, meta: { requestId: 'r1' } } },
      { ok: true, status: 200, body: { data: { reservation_id: 'res-mock-001', status: 'CheckedOut' }, meta: { requestId: 'r2' } } },
      { ok: true, status: 200, body: { data: { ...detail, reservation_status: 'CheckedOut' }, meta: { requestId: 'r3' } } },
    ]);

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /check out this reservation/i })).toBeTruthy()
    );

    fireEvent.click(screen.getByRole('button', { name: /check out this reservation/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /^check out$/i }));

    await waitFor(() => {
      const calls = fetchSpy.mock.calls;
      const checkoutCall = calls.find(
        (args) =>
          typeof args[0] === 'string' &&
          args[0].includes('/checkout') &&
          (args[1] as RequestInit)?.method === 'POST'
      );
      expect(checkoutCall).toBeTruthy();
    });
  });

  /* -- Terminal states ------------------------------------------------------ */

  it('shows no action buttons for CheckedOut status', async () => {
    mockFetchSuccess(makeDetail({ reservation_status: 'CheckedOut' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByText('res-mock-001')).toBeTruthy()
    );

    expect(screen.queryByRole('button', { name: /check in this reservation/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /cancel this reservation/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /check out this reservation/i })).toBeNull();
    expect(screen.queryByLabelText(/reservation actions/i)).toBeNull();
  });

  it('shows no action buttons for Cancelled status', async () => {
    mockFetchSuccess(makeDetail({ reservation_status: 'Cancelled' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByText('res-mock-001')).toBeTruthy()
    );

    expect(screen.queryByRole('button', { name: /check in this reservation/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /cancel this reservation/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /check out this reservation/i })).toBeNull();
    expect(screen.queryByLabelText(/reservation actions/i)).toBeNull();
  });

  it('shows Cancelled status badge for Cancelled reservation', async () => {
    mockFetchSuccess(makeDetail({ reservation_status: 'Cancelled' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByLabelText(/status: cancelled/i)).toBeTruthy()
    );
  });

  it('shows CheckedOut status badge for CheckedOut reservation', async () => {
    mockFetchSuccess(makeDetail({ reservation_status: 'CheckedOut' }));

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByLabelText(/status: checked out/i)).toBeTruthy()
    );
  });

  /* -- Action error feedback ------------------------------------------------ */

  it('shows action error message inside modal when action API fails', async () => {
    const detail = makeDetail({ reservation_status: 'Booked' });
    mockFetchSequence([
      { ok: true,  status: 200, body: { data: detail, meta: { requestId: 'r1' } } },
      { ok: false, status: 409, body: { error: { code: 'INVALID_STATUS_TRANSITION', message: 'Reservation is not in Booked status.' } } },
    ]);

    render(<StaffReservationDetailPage params={makeParams()} />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /cancel this reservation/i })).toBeTruthy()
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel this reservation/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /cancel reservation/i }));

    await waitFor(() =>
      expect(screen.getByText(/Reservation is not in Booked status/i)).toBeTruthy()
    );
  });

  /* -- Dev mock notice ----------------------------------------------------- */

  it('does not render development mock notice after live db wireup', async () => {
    mockFetchSuccess(makeDetail());

    render(<StaffReservationDetailPage params={makeParams()} />);

    expect(screen.queryByText(/Development mode/i)).toBeNull();
  });

  /* -- Fetch called with correct URL --------------------------------------- */

  it('fetches detail from correct GET URL with reservation ID', async () => {
    const fetchSpy = mockFetchSuccess(makeDetail());

    render(<StaffReservationDetailPage params={makeParams('res-target-99')} />);

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/staff/reservations/res-target-99'
      )
    );
  });

  it('shows page heading and footer', async () => {
    mockFetchSuccess(makeDetail());

    render(<StaffReservationDetailPage params={makeParams()} />);

    // Footer should be visible immediately
    expect(
      screen.getByText(/Staff Portal/i)
    ).toBeTruthy();
  });
});
