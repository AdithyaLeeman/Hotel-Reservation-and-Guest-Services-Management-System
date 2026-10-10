/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import GuestPayPage from './page';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'res-mock-001' }),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const MOCK_INVOICE_RESPONSE = {
  data: {
    invoice: {
      invoice_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      reservation_id: 'res-mock-001',
      invoice_date: '2026-10-01',
      payment_status: 'Pending',
      room_charges: '40000.00',
      service_charges: '0.00',
      tax_percentage_applied: '8.00',
      tax_amount: '3200.00',
      grand_total: '43200.00',
      total_paid: '0.00',
      outstanding_balance: '43200.00',
    },
    payments: [],
    reservation: {
      reservation_id: 'res-mock-001',
      guest_id: 'guest-mock-001',
      guest_name: 'Alice Fernando',
      guest_email: 'alice@example.com',
      branch_id: 1,
      branch_name: 'Colombo',
      check_in_date: '2026-10-01',
      check_out_date: '2026-10-05',
      reservation_status: 'Booked',
      booking_source: 'Online',
      discount_percentage: null,
      rooms: [
        { room_id: 1, room_number: '101', type_name: 'Single', rate_per_night: '10000.00' },
      ],
    },
  },
  meta: { requestId: 'req-1' },
};

describe('GuestPayPage — P05-M05-T14', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton initially', () => {
    // Return unresolved promise for loading state
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));

    render(<GuestPayPage />);

    expect(screen.getByRole('status', { name: /loading bill and payment details/i })).toBeInTheDocument();
  });

  it('renders invoice details, charge breakdown, and payment form when loaded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => MOCK_INVOICE_RESPONSE,
    });

    render(<GuestPayPage />);

    await waitFor(() => {
      expect(screen.getByTestId('invoice-summary-card')).toBeInTheDocument();
    });

    // Check header & branch
    expect(screen.getByText('Reservation Invoice & Payment')).toBeInTheDocument();
    expect(screen.getByText('SkyNest Colombo')).toBeInTheDocument();
    expect(screen.getByText('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBeInTheDocument();

    // Check financial figures
    expect(screen.getByTestId('breakdown-grand-total')).toHaveTextContent('LKR 43,200.00');
    expect(screen.getByTestId('display-outstanding-balance')).toHaveTextContent('LKR 43,200.00');

    // Check payment form
    expect(screen.getByTestId('make-payment-card')).toBeInTheDocument();
    expect(screen.getByTestId('payment-amount-input')).toHaveValue(43200);
    expect(screen.getByTestId('submit-payment-btn')).toBeInTheDocument();
  });

  it('renders settled state when balance is zero', async () => {
    const settledResponse = {
      ...MOCK_INVOICE_RESPONSE,
      data: {
        ...MOCK_INVOICE_RESPONSE.data,
        invoice: {
          ...MOCK_INVOICE_RESPONSE.data.invoice,
          payment_status: 'Paid',
          total_paid: '43200.00',
          outstanding_balance: '0.00',
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => settledResponse,
    });

    render(<GuestPayPage />);

    await waitFor(() => {
      expect(screen.getByText('All Set! No Payment Required')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('make-payment-card')).not.toBeInTheDocument();
    expect(screen.getByTestId('display-outstanding-balance')).toHaveTextContent('LKR 0.00');
  });

  it('validates amount: prevents paying more than outstanding balance', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => MOCK_INVOICE_RESPONSE,
    });

    render(<GuestPayPage />);

    await waitFor(() => {
      expect(screen.getByTestId('payment-amount-input')).toBeInTheDocument();
    });

    // Change amount to 50000 (greater than 43200)
    fireEvent.change(screen.getByTestId('payment-amount-input'), { target: { value: '50000.00' } });
    fireEvent.submit(screen.getByTestId('guest-payment-form'));

    expect(await screen.findByText(/payment amount cannot exceed the outstanding balance/i)).toBeInTheDocument();
  });

  it('submits payment successfully and displays PaymentConfirmation component', async () => {
    // 1. Initial GET invoice
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => MOCK_INVOICE_RESPONSE,
    });

    render(<GuestPayPage />);

    await waitFor(() => {
      expect(screen.getByTestId('payment-amount-input')).toBeInTheDocument();
    });

    // Select payment method
    fireEvent.click(screen.getByText('Debit Card'));

    // Set custom amount
    fireEvent.change(screen.getByTestId('payment-amount-input'), { target: { value: '15000.00' } });
    fireEvent.change(screen.getByTestId('transaction-ref-input'), { target: { value: 'TXN-CUSTOM-77' } });

    // 2. Mock POST /api/guest/payments
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        data: {
          payment_id: 99,
          invoice_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          amount_paid: '15000.00',
          payment_date: '2026-10-02T15:00:00Z',
          payment_method: 'Debit Card',
          transaction_reference: 'TXN-CUSTOM-77',
          processed_by_employee_id: null,
          paid_by_user_id: 'user-mock-guest-001',
        },
      }),
    });

    // 3. Mock second GET invoice (refetch after payment)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ...MOCK_INVOICE_RESPONSE,
        data: {
          ...MOCK_INVOICE_RESPONSE.data,
          invoice: {
            ...MOCK_INVOICE_RESPONSE.data.invoice,
            total_paid: '15000.00',
            outstanding_balance: '28200.00',
            payment_status: 'Partial',
          },
          payments: [
            {
              payment_id: 99,
              invoice_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
              amount_paid: '15000.00',
              payment_date: '2026-10-02T15:00:00Z',
              payment_method: 'Debit Card',
              transaction_reference: 'TXN-CUSTOM-77',
            },
          ],
        },
      }),
    });

    fireEvent.submit(screen.getByTestId('guest-payment-form'));

    await waitFor(() => {
      expect(screen.getByTestId('payment-confirmation-card')).toBeInTheDocument();
    });

    expect(screen.getByTestId('confirmation-receipt-id')).toHaveTextContent('PAY-#99');
    expect(screen.getByTestId('confirmation-amount-paid')).toHaveTextContent('LKR 15,000.00');
  });

  it('displays error banner if POST returns 409 duplicate transaction reference', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => MOCK_INVOICE_RESPONSE,
    });

    render(<GuestPayPage />);

    await waitFor(() => {
      expect(screen.getByTestId('submit-payment-btn')).toBeInTheDocument();
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: { code: 'DUPLICATE_PAYMENT', message: 'A payment with this transaction reference already exists.' },
      }),
    });

    fireEvent.click(screen.getByTestId('submit-payment-btn'));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });

  it('renders not found state when GET returns 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: 'NOT_FOUND', message: 'Reservation not found.' } }),
    });

    render(<GuestPayPage />);

    await waitFor(() => {
      expect(screen.getByText('Reservation Not Found')).toBeInTheDocument();
    });
  });
});