/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PaymentConfirmation } from './PaymentConfirmation';
import type { Payment } from '@/types/domain';

const MOCK_PAYMENT: Payment = {
  payment_id: 42,
  invoice_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  amount_paid: '15000.00',
  payment_date: '2026-10-02T14:30:00Z',
  payment_method: 'Credit Card',
  processed_by_employee_id: null,
  paid_by_user_id: 'user-mock-guest-001',
  transaction_reference: 'TXN-SKYN-998822',
};

describe('PaymentConfirmation Component - P05-M05-T15', () => {
  it('renders payment details correctly', () => {
    render(
      <PaymentConfirmation
        payment={MOCK_PAYMENT}
        reservationId="res-mock-001"
        remainingBalance="10000.00"
        guestName="Alice Fernando"
        branchName="Colombo"
      />
    );

    // Verify Title & Amount
    expect(screen.getByText('Payment Received!')).toBeInTheDocument();
    expect(screen.getByTestId('confirmation-amount-paid')).toHaveTextContent('LKR 15,000.00');

    // Verify Ref & IDs
    expect(screen.getByText('TXN-SKYN-998822')).toBeInTheDocument();
    expect(screen.getByText('PAY-#42')).toBeInTheDocument();
    expect(screen.getByText('Credit Card')).toBeInTheDocument();
    expect(screen.getByText('res-mock-001')).toBeInTheDocument();
    expect(screen.getByText('SkyNest Colombo')).toBeInTheDocument();
    expect(screen.getByText('Alice Fernando')).toBeInTheDocument();

    // Verify partial balance display
    expect(screen.getByText('Partial Payment Completed')).toBeInTheDocument();
    expect(screen.getByTestId('confirmation-remaining-balance')).toHaveTextContent('LKR 10,000.00');
  });

  it('renders fully settled state when remainingBalance is 0', () => {
    render(
      <PaymentConfirmation
        payment={MOCK_PAYMENT}
        reservationId="res-mock-001"
        remainingBalance="0.00"
      />
    );

    expect(screen.getByText('Bill Fully Settled')).toBeInTheDocument();
    expect(screen.getByTestId('confirmation-remaining-balance')).toHaveTextContent('LKR 0.00');
    expect(screen.queryByRole('button', { name: /pay remaining balance/i })).not.toBeInTheDocument();
  });

  it('calls onPayAgain when pay remaining balance button is clicked', () => {
    const handlePayAgain = vi.fn();
    render(
      <PaymentConfirmation
        payment={MOCK_PAYMENT}
        reservationId="res-mock-001"
        remainingBalance="5000.00"
        onPayAgain={handlePayAgain}
      />
    );

    const payAgainBtn = screen.getByRole('button', { name: /pay remaining balance/i });
    expect(payAgainBtn).toBeInTheDocument();
    fireEvent.click(payAgainBtn);
    expect(handlePayAgain).toHaveBeenCalledTimes(1);
  });

  it('triggers window.print when print button is clicked', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(
      <PaymentConfirmation
        payment={MOCK_PAYMENT}
        reservationId="res-mock-001"
      />
    );

    const printBtn = screen.getByRole('button', { name: /print receipt/i });
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
  });
});