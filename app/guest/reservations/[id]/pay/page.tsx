'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PaymentConfirmation } from '@/components/PaymentConfirmation';
import type { Payment } from '@/types/domain';

interface InvoiceData {
  invoice_id: string;
  reservation_id: string;
  invoice_date: string;
  payment_status: string;
  room_charges: string;
  service_charges: string;
  tax_percentage_applied: string;
  tax_amount: string;
  grand_total: string;
  total_paid: string;
  outstanding_balance: string;
}

interface ReservationData {
  reservation_id: string;
  guest_id: string;
  guest_name: string;
  guest_email: string;
  branch_id: number;
  branch_name: string;
  check_in_date: string;
  check_out_date: string;
  reservation_status: string;
  booking_source: string;
  discount_percentage: string | null;
  rooms: Array<{
    room_id: number;
    room_number: string;
    type_name: string;
    rate_per_night: string;
  }>;
}

interface InvoiceApiResponse {
  data: {
    invoice: InvoiceData;
    payments: Payment[];
    reservation: ReservationData;
  };
  meta: { requestId: string };
}

type LoadState = 'loading' | 'success' | 'not_found' | 'error';
type PaymentMethod = 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'Cash';

function formatLKR(amountStr: string | number): string {
  const num = typeof amountStr === 'number' ? amountStr : parseFloat(amountStr);
  if (isNaN(num)) return 'LKR 0.00';
  return 'LKR ' + num.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  if (!iso) return '\u2014';
  const clean = iso.includes('T') ? iso.split('T')[0] : iso;
  const d = new Date(clean + 'T00:00:00');
  if (isNaN(d.getTime())) return '\u2014';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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

function PaySkeleton() {
  return (
    <div
      id="pay-loading-skeleton"
      role="status"
      aria-label="Loading bill and payment details"
      className="animate-pulse flex flex-col gap-6"
    >
      <span className="sr-only">Loading billing details&hellip;</span>
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-700 p-8">
        <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-3/4" />
          <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-1/2" />
          <div className="h-8 bg-neutral-100 dark:bg-neutral-800 rounded w-full col-span-2" />
        </div>
      </div>
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-700 p-8">
        <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4 mb-4" />
        <div className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded w-full mb-3" />
        <div className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded w-full" />
      </div>
    </div>
  );
}

function NotFoundState({ reservationId }: { reservationId: string }) {
  return (
    <div
      id="pay-not-found-state"
      className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-700 p-12 text-center max-w-xl mx-auto"
    >
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
        Reservation Not Found
      </h2>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Could not find an invoice for reservation <span className="font-mono">{reservationId}</span> or you do not have permission to view it.
      </p>
      <div className="mt-6">
        <Link
          href="/guest/reservations"
          id="pay-not-found-back-btn"
          className="gold-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          Back to My Reservations
        </Link>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      id="pay-error-state"
      className="bg-white dark:bg-neutral-900 rounded-3xl border border-red-200 dark:border-red-900/50 p-8 text-center max-w-lg mx-auto"
    >
      <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950 text-red-500 mx-auto flex items-center justify-center mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
        Unable to Load Invoice
      </h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 mb-6">
        {message}
      </p>
      <div className="flex justify-center gap-3">
        <button
          id="pay-retry-btn"
          type="button"
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          Try Again
        </button>
        <Link
          href="/guest/reservations"
          className="gold-btn px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          My Reservations
        </Link>
      </div>
    </div>
  );
}

export default function GuestPayPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = typeof params.id === 'string' ? params.id : '';

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reservation, setReservation] = useState<ReservationData | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Payment form states
  const [amountInput, setAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit Card');
  const [referenceInput, setReferenceInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);

  // Validate ID presence
  useEffect(() => {
    if (!reservationId) router.replace('/guest/reservations');
  }, [reservationId, router]);

  // Load invoice data
  useEffect(() => {
    if (!reservationId) return;
    let cancelled = false;

    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/guest/reservations/${reservationId}/invoice`);
        const json = await res.json();

        if (cancelled) return;

        if (res.status === 404) {
          setLoadState('not_found');
          return;
        }

        if (!res.ok) {
          setErrorMessage(json.error?.message ?? 'Failed to load invoice details.');
          setLoadState('error');
          return;
        }

        const payload = json as InvoiceApiResponse;
        setInvoice(payload.data.invoice);
        setPayments(payload.data.payments);
        setReservation(payload.data.reservation);

        // Pre-fill amount with outstanding balance if not set
        const bal = parseFloat(payload.data.invoice.outstanding_balance);
        if (bal > 0) {
          setAmountInput(bal.toFixed(2));
        } else {
          setAmountInput('0.00');
        }

        setLoadState('success');
      } catch {
        if (cancelled) return;
        setErrorMessage('Network error. Please verify your connection.');
        setLoadState('error');
      }
    }

    void fetchInvoice();
    return () => { cancelled = true; };
  }, [reservationId, reloadKey]);

  function handleRetry() {
    setLoadState('loading');
    setErrorMessage('');
    setReloadKey((k) => k + 1);
  }

  function handleAutoGenerateRef() {
    const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, '0');
    setReferenceInput(`TXN-${Date.now().toString().slice(-4)}-${randomHex}`);
  }

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!invoice) return;

    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt <= 0) {
      setSubmitError('Please enter a valid payment amount greater than zero.');
      return;
    }

    const maxBalance = parseFloat(invoice.outstanding_balance);
    if (amt > maxBalance + 0.001) {
      setSubmitError(`Payment amount cannot exceed the outstanding balance of ${formatLKR(maxBalance)}.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/guest/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.invoice_id,
          amount: amt,
          payment_method: paymentMethod,
          transaction_reference: referenceInput.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setSubmitError('A payment with this transaction reference already exists. Please use a unique reference.');
        } else {
          setSubmitError(json.error?.message ?? 'Payment failed. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      // Successful payment
      const paymentRecord = json.data as Payment;
      setLastPayment(paymentRecord);
      
      // Update local view
      setReloadKey((k) => k + 1);
      setIsSubmitting(false);
    } catch {
      setSubmitError('Network error while processing payment. Please try again.');
      setIsSubmitting(false);
    }
  }

  const outstandingNum = invoice ? parseFloat(invoice.outstanding_balance) : 0;
  const totalPaidNum = invoice ? parseFloat(invoice.total_paid) : 0;
  const isSettled = outstandingNum <= 0 && (totalPaidNum > 0 || parseFloat(invoice?.grand_total ?? '0') === 0);

  // Authoritative payment status: if outstanding balance is 0 and payments exist, it is Paid!
  const effectivePaymentStatus: string = isSettled
    ? 'Paid'
    : totalPaidNum > 0
    ? 'Partial'
    : (invoice?.payment_status && invoice.payment_status !== 'Paid' ? invoice.payment_status : 'Unpaid');

  return (
    <main
      id="guest-pay-page-root"
      className="
        min-h-screen
        bg-[#faf8f5] dark:bg-[#141312]
      "
    >
      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <section
        aria-labelledby="pay-heading"
        className="
          relative overflow-hidden
          bg-gradient-to-br from-[#1c1a17] via-[#24211d] to-[#141312]
          border-b border-[#38332b]
          py-12 px-4 md:px-6 lg:px-8 text-white
        "
      >
        <div aria-hidden="true" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#c5a880]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 text-sm text-[#c5a880]/80 list-none p-0 m-0">
              <li>
                <Link href="/guest/reservations" className="hover:text-white transition-colors">
                  My Reservations
                </Link>
              </li>
              <li aria-hidden="true" className="text-[#c5a880]/40">&rsaquo;</li>
              <li>
                <Link href={`/guest/reservations/${reservationId}`} className="hover:text-white transition-colors">
                  {reservationId ? `Res #${reservationId.slice(0, 8)}` : 'Detail'}
                </Link>
              </li>
              <li aria-hidden="true" className="text-[#c5a880]/40">&rsaquo;</li>
              <li aria-current="page" className="text-white font-medium">
                Bill &amp; Pay
              </li>
            </ol>
          </nav>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#c5a880] text-xs">★★★★★</span>
            <span className="text-xs uppercase tracking-[0.2em] text-[#c5a880] font-medium">SkyNest Payment Portal</span>
          </div>

          <h1 id="pay-heading" className="text-3xl md:text-4xl font-serif tracking-tight text-white">
            Reservation Invoice &amp; Payment
          </h1>
          <p className="mt-2 text-[#e2cfb4]/80 text-sm sm:text-base">
            {reservation ? `SkyNest ${reservation.branch_name}` : 'SkyNest Luxury Hotels & Resorts'}
          </p>
        </div>
      </section>

      {/* ── Page Content ─────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-10">

        {/* Back Link */}
        <div className="mb-6">
          <Link
            href={`/guest/reservations/${reservationId}`}
            id="pay-back-link"
            className="
              inline-flex items-center gap-2
              text-sm text-neutral-500 dark:text-neutral-400
              hover:text-[#c5a880]
              transition-colors duration-200
            "
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Reservation Details
          </Link>
        </div>

        {/* Loading State */}
        {loadState === 'loading' && <PaySkeleton />}

        {/* Not Found State */}
        {loadState === 'not_found' && <NotFoundState reservationId={reservationId} />}

        {/* Error State */}
        {loadState === 'error' && <ErrorState message={errorMessage} onRetry={handleRetry} />}

        {/* Success State */}
        {loadState === 'success' && invoice && reservation && (
          <div className="flex flex-col gap-8">

            {/* If a new payment was just made, render Confirmation Component at the top! */}
            {lastPayment && (
              <PaymentConfirmation
                payment={lastPayment}
                reservationId={reservation.reservation_id}
                remainingBalance={invoice.outstanding_balance}
                guestName={reservation.guest_name}
                branchName={reservation.branch_name}
                onPayAgain={() => setLastPayment(null)}
              />
            )}

            {/* ── Invoice Breakdown Card ─────────────────────────────── */}
            <div
              id="invoice-summary-card"
              data-testid="invoice-summary-card"
              className="
                bg-white dark:bg-neutral-900
                border border-neutral-200 dark:border-neutral-700
                rounded-3xl shadow-sm overflow-hidden
              "
            >
              <div
                aria-hidden="true"
                className="h-1.5 w-full bg-gradient-to-r from-[#c5a880] via-[#e2cfb4] to-[#c5a880]"
              />

              <div className="p-6 sm:p-8">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-neutral-800">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500">
                      Invoice Reference
                    </span>
                    <h2 id="invoice-id-display" className="text-lg font-mono font-bold text-neutral-800 dark:text-neutral-200 break-all">
                      {invoice.invoice_id}
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Issued: {formatDate(invoice.invoice_date)} &bull; Res: {reservation.reservation_id}
                    </p>
                  </div>

                  <span
                    id="invoice-status-badge"
                    data-testid="invoice-status-badge"
                    className={`
                      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border self-start sm:self-auto
                      ${effectivePaymentStatus === 'Paid'
                        ? 'bg-[#c5a880]/15 text-[#c5a880] border-[#c5a880]/40 shadow-[0_0_12px_rgba(197,168,128,0.15)]'
                        : effectivePaymentStatus === 'Partial'
                        ? 'bg-[#b45309]/15 text-[#fcd34d] border-[#b45309]/35'
                        : 'bg-[rgba(127,29,29,0.2)] text-[#fca5a5] border-[rgba(127,29,29,0.35)]'}
                    `}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" aria-hidden="true" />
                    Status: {effectivePaymentStatus}
                  </span>
                </div>

                {/* Reservation Context Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-neutral-100 dark:border-neutral-800 text-sm">
                  <div>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Branch</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{reservation.branch_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Check-in</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{formatDate(reservation.check_in_date)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Check-out</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{formatDate(reservation.check_out_date)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Rooms</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{reservation.rooms.length} room(s)</span>
                  </div>
                </div>

                {/* Line Items Breakdown */}
                <div className="py-6 flex flex-col gap-3 text-sm">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-1">
                    Charge Breakdown
                  </h3>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-neutral-600 dark:text-neutral-300">
                      Room Charges
                      {reservation.discount_percentage && (
                        <span className="ml-2 text-xs text-[#c5a880] font-medium">
                          ({reservation.discount_percentage}% discount applied)
                        </span>
                      )}
                    </span>
                    <span id="breakdown-room-charges" className="font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">
                      {formatLKR(invoice.room_charges)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-neutral-600 dark:text-neutral-300">
                      Taxes &amp; Levies ({invoice.tax_percentage_applied}% on rooms)
                    </span>
                    <span id="breakdown-tax-amount" className="font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">
                      {formatLKR(invoice.tax_amount)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-neutral-600 dark:text-neutral-300">
                      Guest Services &amp; Amenities
                    </span>
                    <span id="breakdown-service-charges" className="font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">
                      {formatLKR(invoice.service_charges)}
                    </span>
                  </div>

                  <hr className="my-2 border-neutral-100 dark:border-neutral-800" />

                  <div className="flex justify-between items-center py-1 text-base">
                    <span className="font-bold text-neutral-900 dark:text-white">
                      Grand Total
                    </span>
                    <span id="breakdown-grand-total" data-testid="breakdown-grand-total" className="font-extrabold tabular-nums text-neutral-900 dark:text-white">
                      {formatLKR(invoice.grand_total)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 text-sm text-[#c5a880]">
                    <span className="font-medium">Total Paid to Date</span>
                    <span id="breakdown-total-paid" data-testid="breakdown-total-paid" className="font-bold tabular-nums">
                      - {formatLKR(invoice.total_paid)}
                    </span>
                  </div>
                </div>

                {/* Outstanding Balance Banner */}
                <div
                  id="outstanding-balance-banner"
                  data-testid="outstanding-balance-banner"
                  className={`
                    p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2
                    ${isSettled
                      ? 'bg-[#c5a880]/10 border border-[#c5a880]/30 text-[#f5e6d3]'
                      : 'bg-[#1c1917] border border-[#3e3933] text-[#f5e6d3]'}
                  `}
                >
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold block opacity-75">
                      {isSettled ? 'Account Settled' : 'Current Outstanding Balance'}
                    </span>
                    <p className="text-sm mt-0.5 opacity-90">
                      {isSettled
                        ? 'All charges have been fully cleared. Ready for checkout.'
                        : 'Balance is payable online or upon arrival at reception.'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      id="display-outstanding-balance"
                      data-testid="display-outstanding-balance"
                      className="text-3xl font-extrabold tabular-nums tracking-tight"
                    >
                      {formatLKR(invoice.outstanding_balance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Payment History ────────────────────────────────────── */}
            {payments.length > 0 && (
              <div
                id="payment-history-card"
                data-testid="payment-history-card"
                className="
                  bg-white dark:bg-neutral-900
                  border border-neutral-200 dark:border-neutral-700
                  rounded-3xl shadow-sm overflow-hidden p-6 sm:p-8
                "
              >
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                  Payment History &amp; Receipts ({payments.length})
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm" id="payments-history-table">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        <th className="pb-3">Receipt</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Method</th>
                        <th className="pb-3">Reference</th>
                        <th className="pb-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {payments.map((p) => (
                        <tr key={p.payment_id} id={`payment-row-${p.payment_id}`}>
                          <td className="py-3 font-mono font-medium text-neutral-700 dark:text-neutral-300">
                            PAY-#{p.payment_id}
                          </td>
                          <td className="py-3 text-neutral-600 dark:text-neutral-400">
                            {formatDateTime(p.payment_date)}
                          </td>
                          <td className="py-3 text-neutral-800 dark:text-neutral-200 font-medium">
                            {p.payment_method}
                          </td>
                          <td className="py-3 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                            {p.transaction_reference ?? '\u2014'}
                          </td>
                          <td className="py-3 text-right font-bold tabular-nums text-[#c5a880]">
                            {formatLKR(p.amount_paid)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Payment Form (when balance > 0) ────────────────────── */}
            {!isSettled ? (
              <div
                id="make-payment-card"
                data-testid="make-payment-card"
                className="
                  bg-white dark:bg-neutral-900
                  border border-neutral-200 dark:border-neutral-700
                  rounded-3xl shadow-sm overflow-hidden p-6 sm:p-8
                "
              >
                <div className="mb-6">
                  <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                    Submit Payment
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Select your preferred payment method and specify the amount you wish to settle.
                  </p>
                </div>

                {submitError && (
                  <div
                    id="payment-error-alert"
                    role="alert"
                    className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-start gap-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{submitError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitPayment} className="flex flex-col gap-6" id="guest-payment-form" data-testid="guest-payment-form">

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash'] as PaymentMethod[]).map((method) => {
                        const isSelected = paymentMethod === method;
                        return (
                          <button
                            key={method}
                            type="button"
                            id={`payment-method-${method.toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={() => setPaymentMethod(method)}
                            className={`
                              py-3 px-4 rounded-xl border text-sm font-semibold transition-all flex flex-col items-center gap-1.5
                              ${isSelected
                                ? 'border-[#c5a880] bg-[#c5a880]/15 text-[#c5a880] ring-2 ring-[#c5a880]/20'
                                : 'border-[#3e3933] text-[#d6d3d1] hover:bg-[#25221e]'}
                            `}
                          >
                            <span>{method}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Amount */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="payment-amount-input" className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Amount to Pay (LKR)
                      </label>
                      <button
                        type="button"
                        id="pay-full-balance-btn"
                        onClick={() => setAmountInput(outstandingNum.toFixed(2))}
                        className="text-xs text-[#c5a880] font-medium hover:underline"
                      >
                        Pay Full Balance ({formatLKR(outstandingNum)})
                      </button>
                    </div>

                    <div className="relative rounded-2xl shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400 dark:text-neutral-500 font-bold">
                        LKR
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={outstandingNum.toFixed(2)}
                        id="payment-amount-input"
                        data-testid="payment-amount-input"
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        placeholder="0.00"
                        required
                        className="
                          w-full pl-16 pr-4 py-3.5 rounded-2xl
                          border border-neutral-300 dark:border-neutral-700
                          bg-white dark:bg-neutral-800
                          text-neutral-900 dark:text-white font-bold text-lg tabular-nums
                          focus:ring-2 focus:ring-[#c5a880]/30 focus:border-[#c5a880] outline-none
                          transition-all
                        "
                      />
                    </div>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                      Max allowed: {formatLKR(outstandingNum)}. Partial payments are accepted.
                    </p>
                  </div>

                  {/* Transaction Reference (Optional / Generated) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="transaction-ref-input" className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Transaction Reference / Note
                      </label>
                      <button
                        type="button"
                        id="generate-ref-btn"
                        onClick={handleAutoGenerateRef}
                        className="text-xs text-[#c5a880] font-medium hover:underline"
                      >
                        Auto-generate Reference
                      </button>
                    </div>

                    <input
                      type="text"
                      id="transaction-ref-input"
                      data-testid="transaction-ref-input"
                      value={referenceInput}
                      onChange={(e) => setReferenceInput(e.target.value)}
                      placeholder="e.g. TXN-1029384"
                      className="
                        w-full px-4 py-3 rounded-2xl
                        border border-neutral-300 dark:border-neutral-700
                        bg-white dark:bg-neutral-800
                        text-neutral-900 dark:text-white font-mono text-sm
                        focus:ring-2 focus:ring-[#c5a880]/30 focus:border-[#c5a880] outline-none
                      "
                    />
                  </div>

                  {/* Submit CTA */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      id="submit-payment-btn"
                      data-testid="submit-payment-btn"
                      disabled={isSubmitting || parseFloat(amountInput || '0') <= 0}
                      className="
                        w-full py-4 px-6 rounded-2xl
                        gold-btn font-bold text-base
                        shadow-lg shadow-[#c5a880]/20
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center justify-center gap-2
                      "
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                          <span>Processing Payment...</span>
                        </>
                      ) : (
                        <span>
                          Pay {amountInput && parseFloat(amountInput) > 0 ? formatLKR(amountInput) : 'Now'}
                        </span>
                      )}
                    </button>
                  </div>

                </form>
              </div>
            ) : (
              /* Settled congratulatory banner */
              <div
                id="settled-congratulations-card"
                className="
                  bg-[#c5a880]/10
                  border border-[#c5a880]/30
                  rounded-3xl p-8 text-center
                "
              >
                <div className="w-14 h-14 rounded-full bg-[#c5a880]/15 border border-[#c5a880]/30 text-[#c5a880] mx-auto flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-extrabold text-[#f5e6d3]">
                  All Set! No Payment Required
                </h3>
                <p className="mt-1 text-sm text-[#d6d3d1] max-w-md mx-auto">
                  Your reservation billing is fully settled with a balance of LKR 0.00. You are eligible for swift checkout at the front desk.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Link
                    href={`/guest/reservations/${reservation.reservation_id}`}
                    id="settled-view-res-btn"
                    className="gold-btn px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
                  >
                    View Reservation Details
                  </Link>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </main>
  );
}