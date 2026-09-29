'use client';

import React from 'react';
import Link from 'next/link';
import type { Payment } from '@/types/domain';

export interface PaymentConfirmationProps {
  payment: Payment;
  reservationId?: string;
  remainingBalance?: string;
  guestName?: string;
  branchName?: string;
  onPayAgain?: () => void;
}

/** Format currency string to LKR XX,XXX.XX */
function formatLKR(amountStr: string | number): string {
  const num = typeof amountStr === 'number' ? amountStr : parseFloat(amountStr);
  if (isNaN(num)) return 'LKR 0.00';
  return 'LKR ' + num.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(iso: string): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PaymentConfirmation({
  payment,
  reservationId,
  remainingBalance,
  guestName,
  branchName,
  onPayAgain,
}: PaymentConfirmationProps) {
  const remainingNum = remainingBalance ? parseFloat(remainingBalance) : 0;
  const isFullySettled = remainingNum <= 0;

  return (
    <div
      id="payment-confirmation-card"
      data-testid="payment-confirmation-card"
      className="
        bg-white dark:bg-neutral-900
        border border-neutral-200 dark:border-neutral-700
        rounded-3xl shadow-xl overflow-hidden
        max-w-2xl mx-auto transition-all
      "
    >
      {/* Decorative top accent line */}
      <div
        aria-hidden="true"
        className="h-3 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
      />

      <div className="p-6 sm:p-10 flex flex-col items-center text-center">
        {/* Success checkmark badge */}
        <div
          id="confirmation-badge"
          data-testid="confirmation-badge"
          className="
            w-16 h-16 sm:w-20 sm:h-20
            rounded-full
            bg-emerald-100 dark:bg-emerald-950/80
            text-emerald-600 dark:text-emerald-400
            flex items-center justify-center
            mb-4 ring-8 ring-emerald-50 dark:ring-emerald-900/30
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-8 sm:w-10 sm:h-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2
          id="confirmation-title"
          className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight"
        >
          Payment Received!
        </h2>
        <p
          id="confirmation-subtitle"
          className="mt-1 text-sm sm:text-base text-neutral-500 dark:text-neutral-400 max-w-md"
        >
          Thank you. Your payment has been securely recorded and credited to your reservation.
        </p>

        {/* Amount Card */}
        <div
          id="confirmation-amount-card"
          className="
            mt-6 w-full py-4 px-6
            rounded-2xl
            bg-neutral-50 dark:bg-neutral-800/80
            border border-neutral-100 dark:border-neutral-700
          "
        >
          <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500">
            Amount Paid
          </span>
          <div
            id="confirmation-amount-paid"
            data-testid="confirmation-amount-paid"
            className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums"
          >
            {formatLKR(payment.amount_paid)}
          </div>
          {payment.transaction_reference && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Ref: <span id="confirmation-ref-text" className="font-mono font-medium text-neutral-700 dark:text-neutral-300">{payment.transaction_reference}</span>
            </p>
          )}
        </div>

        {/* Receipt breakdown */}
        <div
          id="confirmation-receipt-details"
          className="w-full mt-6 text-left border-t border-b border-neutral-100 dark:border-neutral-800 py-5"
        >
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Receipt ID
              </dt>
              <dd id="confirmation-receipt-id" data-testid="confirmation-receipt-id" className="font-mono text-neutral-800 dark:text-neutral-200 mt-0.5">
                PAY-#{payment.payment_id}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Date &amp; Time
              </dt>
              <dd id="confirmation-date" className="text-neutral-800 dark:text-neutral-200 mt-0.5">
                {formatDateTime(payment.payment_date)}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Payment Method
              </dt>
              <dd id="confirmation-method" className="text-neutral-800 dark:text-neutral-200 mt-0.5 font-medium">
                {payment.payment_method}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Invoice Reference
              </dt>
              <dd id="confirmation-invoice-id" className="font-mono text-xs text-neutral-700 dark:text-neutral-300 mt-0.5 truncate">
                {payment.invoice_id}
              </dd>
            </div>

            {reservationId && (
              <div>
                <dt className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  Reservation ID
                </dt>
                <dd id="confirmation-reservation-id" className="font-mono text-xs text-neutral-700 dark:text-neutral-300 mt-0.5">
                  {reservationId}
                </dd>
              </div>
            )}

            {branchName && (
              <div>
                <dt className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  Hotel Branch
                </dt>
                <dd id="confirmation-branch" className="text-neutral-800 dark:text-neutral-200 mt-0.5">
                  SkyNest {branchName}
                </dd>
              </div>
            )}

            {guestName && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  Billed To
                </dt>
                <dd id="confirmation-guest-name" className="text-neutral-800 dark:text-neutral-200 mt-0.5 font-medium">
                  {guestName}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Balance status card */}
        <div
          id="confirmation-balance-status"
          data-testid="confirmation-balance-status"
          className={`
            w-full mt-6 p-4 rounded-xl flex items-center justify-between gap-4 text-sm
            ${isFullySettled
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300'
            }
          `}
        >
          <div className="flex items-center gap-3 text-left">
            <span
              className={`
                w-2.5 h-2.5 rounded-full flex-shrink-0
                ${isFullySettled ? 'bg-emerald-500' : 'bg-amber-500'}
              `}
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">
                {isFullySettled ? 'Bill Fully Settled' : 'Partial Payment Completed'}
              </p>
              <p className="text-xs opacity-80">
                {isFullySettled
                  ? 'Your account balance is LKR 0.00. You are all set for checkout!'
                  : 'A balance remains on this reservation.'}
              </p>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-xs uppercase tracking-wider block opacity-75">
              Outstanding
            </span>
            <span
              id="confirmation-remaining-balance"
              data-testid="confirmation-remaining-balance"
              className="font-bold tabular-nums text-base"
            >
              {remainingBalance ? formatLKR(remainingBalance) : 'LKR 0.00'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full justify-center">
          {reservationId && (
            <Link
              href={`/guest/reservations/${reservationId}`}
              id="confirmation-view-reservation-btn"
              className="
                inline-flex items-center justify-center gap-2
                px-5 py-3 rounded-xl
                bg-blue-600 hover:bg-blue-700
                text-white text-sm font-semibold
                shadow-sm shadow-blue-500/20
                transition-colors duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
              "
            >
              View Reservation
            </Link>
          )}

          {!isFullySettled && onPayAgain && (
            <button
              id="confirmation-pay-again-btn"
              type="button"
              onClick={onPayAgain}
              className="
                inline-flex items-center justify-center gap-2
                px-5 py-3 rounded-xl
                bg-emerald-600 hover:bg-emerald-700
                text-white text-sm font-semibold
                shadow-sm shadow-emerald-500/20
                transition-colors duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2
              "
            >
              Pay Remaining Balance
            </button>
          )}

          <button
            id="confirmation-print-btn"
            type="button"
            onClick={() => window.print()}
            className="
              inline-flex items-center justify-center gap-2
              px-5 py-3 rounded-xl
              border border-neutral-300 dark:border-neutral-600
              text-neutral-700 dark:text-neutral-300
              hover:bg-neutral-50 dark:hover:bg-neutral-800
              text-sm font-medium
              transition-colors duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print Receipt
          </button>

          <Link
            href="/guest/reservations"
            id="confirmation-back-to-list-btn"
            className="
              inline-flex items-center justify-center gap-2
              px-5 py-3 rounded-xl
              text-neutral-600 dark:text-neutral-400
              hover:text-neutral-900 dark:hover:text-white
              text-sm font-medium
              transition-colors duration-200
            "
          >
            My Reservations
          </Link>
        </div>
      </div>
    </div>
  );
}