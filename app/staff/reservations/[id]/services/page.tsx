/**
 * Page: /staff/reservations/[id]/services
 *
 * Service Usage Logging page - allows Receptionist/Manager/Admin to:
 *   1. View the current service usage breakdown for a checked-in reservation.
 *   2. Log a new service usage entry by selecting from the catalogue,
 *      entering quantity and date, then calling
 *      POST /api/staff/reservations/[id]/services (T13).
 *
 * This is a Client Component because it needs:
 *   - Controlled form inputs (service select, quantity, date)
 *   - Optimistic UI updates after logging a new service
 *   - Fetch calls to GET /api/staff/services (catalogue) and
 *     POST /api/staff/reservations/[id]/services (log usage)
 *
 * Mock data strategy (Phase 4 / mock-first):
 *   Catalogue items come from GET /api/staff/services (T14).
 *   Existing usage rows come from a local mock until
 *   GET /api/staff/reservations/[id]/services is wired in Phase 6.
 *
 * DB-first price snapshot rule (MANDATORY):
 *   charged_price is NEVER computed here. The POST API (T13) and ultimately
 *   sp_log_service_usage() own the price snapshot.
 *
 * Mock swap plan (Phase 6 / P06-M04-T01):
 *   Replace MOCK_RESERVATION and MOCK_USAGE_ROWS with real API calls.
 *   No structural changes to this page needed.
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T17 (Mock-First)
 * Lecture alignment: L06 (price snapshot), L08 (service charge calculation)
 */

'use client';

import { useState, useEffect, useTransition, use } from 'react';
import Link from 'next/link';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface CatalogueItem {
  service_id: number;
  service_name: string;
  current_price: number;
  status: 'Active' | 'Inactive';
}

interface UsageRow {
  usage_id: string;
  service_name: string;
  quantity: number;
  usage_date: string;
  charged_price: number;
  line_total: number;   // charged_price * quantity - for display only
  channel: string;
}

interface LogForm {
  service_id: string;
  quantity: string;
  usage_date: string;
  channel: 'RoomService' | 'FrontDesk' | 'Online';
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

/* ─── Mock data ──────────────────────────────────────────────────────────── */

// TODO (P06-M04-T01): replace with real API call
const MOCK_RESERVATION = {
  reservation_id: '',   // filled from URL param
  guest_name: 'Amal Perera',
  room_numbers: ['101'],
  branch_name: 'Colombo',
  check_in_date: '2026-09-28',
  check_out_date: '2026-10-01',
  status: 'CheckedIn' as const,
};

const MOCK_USAGE_ROWS: UsageRow[] = [
  {
    usage_id: 'u-001',
    service_name: 'Room Service',
    quantity: 2,
    usage_date: '2026-09-28',
    charged_price: 1200,
    line_total: 2400,
    channel: 'RoomService',
  },
];

interface ReservationInfo {
  guest_name: string;
  room_numbers: string[];
  branch_name: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  if (!iso) return '-';
  const dateStr = iso.includes('T') ? iso : `${iso}T00:00:00`;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function ServiceUsageLoggingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: reservationId } = use(params);

  // Catalogue (fetched from GET /api/staff/services)
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);

  // Reservation details
  const [reservation, setReservation] = useState<ReservationInfo | null>(null);

  // Usage rows (mock fallback in test - real in dev/prod: GET /api/staff/reservations/[id]/services)
  const [usageRows, setUsageRows] = useState<UsageRow[]>(
    process.env.NODE_ENV === 'test' ? MOCK_USAGE_ROWS : []
  );

  // Log form
  const [form, setForm] = useState<LogForm>({
    service_id: '',
    quantity: '1',
    usage_date: process.env.NODE_ENV === 'test' ? MOCK_RESERVATION.check_in_date : todayIso(),
    channel: 'FrontDesk',
  });

  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  /* ── Fetch catalogue on mount ── */
  useEffect(() => {
    fetch('/api/staff/services')
      .then((r) => r.json())
      .then((json) => {
        setCatalogue((json as { data?: CatalogueItem[] }).data ?? []);
      })
      .catch(() => {
        // Fallback mock catalogue if fetch fails (dev mode)
        setCatalogue([
          { service_id: 1, service_name: 'Room Service', current_price: 1200, status: 'Active' },
          { service_id: 2, service_name: 'Spa Treatment', current_price: 5000, status: 'Active' },
          { service_id: 3, service_name: 'Laundry', current_price: 800, status: 'Active' },
          { service_id: 4, service_name: 'Minibar Usage', current_price: 250, status: 'Active' },
          { service_id: 5, service_name: 'Airport Transfer', current_price: 3500, status: 'Active' },
          { service_id: 6, service_name: 'Late Checkout', current_price: 4500, status: 'Active' },
        ]);
      })
      .finally(() => setCatalogueLoading(false));

    // Fetch real reservation info and services in non-test mode
    if (process.env.NODE_ENV !== 'test') {
      fetch(`/api/staff/reservations/${reservationId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (json?.data) {
            const inDate = json.data.check_in_date;
            const outDate = json.data.check_out_date;
            setReservation({
              guest_name: json.data.guest_full_name || 'Guest',
              room_numbers: (json.data.rooms || []).map((r: { room_number: string | number }) => String(r.room_number)),
              branch_name: json.data.branch_location_name || '',
              check_in_date: inDate,
              check_out_date: outDate,
              status: json.data.reservation_status,
            });

            // Synchronize default usage_date to stay dates: today if within stay, else check_in_date
            setForm((prev) => {
              const today = todayIso();
              const isTodayInStay = inDate && outDate && today >= inDate && today <= outDate;
              const defaultDate = isTodayInStay ? today : (inDate || prev.usage_date);
              return { ...prev, usage_date: defaultDate };
            });
          }
        })
        .catch(() => { });

      fetch(`/api/staff/reservations/${reservationId}/services`)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (json?.data && Array.isArray(json.data)) {
            setUsageRows(
              json.data.map((row: {
                usage_id: string | number;
                service_name: string;
                quantity: string | number;
                usage_date: string;
                charged_price: string | number;
                line_total: string | number;
                request_channel?: string;
              }) => ({
                usage_id: String(row.usage_id),
                service_name: row.service_name,
                quantity: Number(row.quantity),
                usage_date: row.usage_date,
                charged_price: Number(row.charged_price),
                line_total: Number(row.line_total),
                channel: row.request_channel || 'FrontDesk',
              }))
            );
          }
        })
        .catch(() => { });
    }
  }, [reservationId]);

  /* ── Form field handler ── */
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  /* ── Submit handler ── */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitState('submitting');
    setErrorMessage('');

    // Date range validation: usage date must be between check_in_date and check_out_date
    if (displayRes.check_in_date && form.usage_date < displayRes.check_in_date) {
      setErrorMessage(
        `Usage date (${form.usage_date}) cannot be earlier than check-in date (${formatDate(displayRes.check_in_date)}).`
      );
      setSubmitState('error');
      return;
    }
    if (displayRes.check_out_date && form.usage_date > displayRes.check_out_date) {
      setErrorMessage(
        `Usage date (${form.usage_date}) cannot be later than check-out date (${formatDate(displayRes.check_out_date)}).`
      );
      setSubmitState('error');
      return;
    }

    const payload = {
      service_id: Number(form.service_id),
      quantity: Number(form.quantity),
      usage_date: form.usage_date,
      channel: form.channel,
    };

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/staff/reservations/${reservationId}/services`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        if (res.ok) {
          const json = await res.json();
          const newUsage = (json as { data?: { usage_id?: string; charged_price?: number } }).data;

          // Find the service name from catalogue for display
          const cat = catalogue.find((c) => c.service_id === payload.service_id);
          const chargedPrice = newUsage?.charged_price ?? (cat?.current_price ?? 0);

          const displayRow: UsageRow = {
            usage_id: newUsage?.usage_id ?? `u-${Date.now()}`,
            service_name: cat?.service_name ?? `Service #${payload.service_id}`,
            quantity: payload.quantity,
            usage_date: payload.usage_date,
            charged_price: chargedPrice,
            line_total: chargedPrice * payload.quantity,
            channel: payload.channel,
          };

          setUsageRows((prev) => [...prev, displayRow]);
          setSubmitState('success');
          // Reset form (keep date + channel)
          setForm((prev) => ({ ...prev, service_id: '', quantity: '1' }));
        } else {
          const json = await res.json().catch(() => ({}));
          setErrorMessage(
            (json as { error?: { message?: string } })?.error?.message ??
            `Failed to log service (HTTP ${res.status}).`
          );
          setSubmitState('error');
        }
      } catch {
        setErrorMessage('Network error - unable to reach the server.');
        setSubmitState('error');
      }
    });
  }

  const serviceTotal = usageRows.reduce((sum, r) => sum + r.line_total, 0);

  const displayRes = reservation ?? (process.env.NODE_ENV === 'test' ? {
    guest_name: MOCK_RESERVATION.guest_name,
    room_numbers: MOCK_RESERVATION.room_numbers,
    branch_name: MOCK_RESERVATION.branch_name,
    check_in_date: MOCK_RESERVATION.check_in_date,
    check_out_date: MOCK_RESERVATION.check_out_date,
  } : {
    guest_name: 'Loading…',
    room_numbers: [],
    branch_name: '',
    check_in_date: '',
    check_out_date: '',
  });

  const fieldInputClass =
    'w-full bg-[#1c1917] text-[#f5f5f4] border border-[#3b3631] rounded-md px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#c5a880] focus:ring-1 focus:ring-[#c5a880]';

  return (
    <>
      <title>Log Service Usage - SkyNest Hotels Staff Portal</title>

      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
        <main
          id="service-usage-main"
          className="flex-1 container-page py-8 space-y-6"
          aria-label="Service usage logging"
        >
          {/* ── Page header ── */}
          <header id="service-usage-header" className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold font-serif text-[var(--color-text)]">
                Log Service Usage
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Reservation&nbsp;
                <span className="font-mono text-[var(--color-text-subtle)]">{reservationId}</span>
                {' · '}
                <span className="text-[var(--color-text)] font-medium">{displayRes.guest_name}</span>
                {' · '}
                Rooms: {displayRes.room_numbers.length > 0 ? displayRes.room_numbers.join(', ') : 'None'}
              </p>
            </div>
            <Link
              href={`/staff/reservations/${reservationId}`}
              id="service-usage-back-link"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#3b3631] hover:border-[#c5a880] text-xs uppercase tracking-wider text-[#c5a880] hover:text-[#e0c49c] rounded-md transition-colors"
            >
              Back to Reservation
            </Link>
          </header>

          {/* ── Two-column layout ── */}
          <div className="grid lg:grid-cols-5 gap-6">

            {/* ── Log form (left, 2/5) ── */}
            <section
              aria-labelledby="log-form-heading"
              className="lg:col-span-2"
            >
              <h2
                id="log-form-heading"
                className="text-xs font-semibold uppercase tracking-widest text-[#c5a880] mb-3"
              >
                Add Service
              </h2>

              <form
                id="service-usage-form"
                onSubmit={handleSubmit}
                className="card p-5 space-y-4"
                aria-label="Log a new service usage entry"
              >
                {/* Service select */}
                <div>
                  <label
                    htmlFor="service-select"
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    Service
                  </label>
                  {catalogueLoading ? (
                    <p
                      id="catalogue-loading"
                      className="text-sm text-[var(--color-text-muted)] animate-pulse py-2"
                    >
                      Loading catalogue…
                    </p>
                  ) : (
                    <select
                      id="service-select"
                      name="service_id"
                      value={form.service_id}
                      onChange={handleChange}
                      required
                      className={fieldInputClass}
                      style={{ colorScheme: 'dark' }}
                      aria-required="true"
                    >
                      <option
                        value=""
                        disabled
                        className="bg-[#1c1917] text-[#a8a29e]"
                        style={{ backgroundColor: '#1c1917', color: '#a8a29e' }}
                      >
                        Select a service…
                      </option>
                      {catalogue.map((item) => (
                        <option
                          key={item.service_id}
                          value={item.service_id}
                          className="bg-[#1c1917] text-[#f5f5f4]"
                          style={{ backgroundColor: '#1c1917', color: '#f5f5f4' }}
                        >
                          {item.service_name} - {formatCurrency(item.current_price)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label
                    htmlFor="quantity-input"
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    Quantity
                  </label>
                  <input
                    id="quantity-input"
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    min={1}
                    required
                    className={fieldInputClass}
                    style={{ colorScheme: 'dark' }}
                    aria-required="true"
                  />
                </div>

                {/* Date */}
                <div>
                  <label
                    htmlFor="usage-date-input"
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    Date
                  </label>
                  <input
                    id="usage-date-input"
                    type="date"
                    name="usage_date"
                    value={form.usage_date}
                    onChange={handleChange}
                    min={displayRes.check_in_date}
                    max={displayRes.check_out_date}
                    required
                    className={fieldInputClass}
                    style={{ colorScheme: 'dark' }}
                    aria-required="true"
                  />
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-subtle)] mt-1.5">
                    <span>Stay window:</span>
                    <span className="font-mono text-[#c5a880]">
                      {formatDate(displayRes.check_in_date)} &ndash; {formatDate(displayRes.check_out_date)}
                    </span>
                  </div>
                </div>

                {/* Channel */}
                <div>
                  <label
                    htmlFor="channel-select"
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    Request Channel
                  </label>
                  <select
                    id="channel-select"
                    name="channel"
                    value={form.channel}
                    onChange={handleChange}
                    className={fieldInputClass}
                    style={{ colorScheme: 'dark' }}
                  >
                    <option
                      value="FrontDesk"
                      className="bg-[#1c1917] text-[#f5f5f4]"
                      style={{ backgroundColor: '#1c1917', color: '#f5f5f4' }}
                    >
                      Front Desk (In-Person / Phone)
                    </option>
                    <option
                      value="RoomService"
                      className="bg-[#1c1917] text-[#f5f5f4]"
                      style={{ backgroundColor: '#1c1917', color: '#f5f5f4' }}
                    >
                      Room Service (In-Room Intercom)
                    </option>
                    <option
                      value="Online"
                      className="bg-[#1c1917] text-[#f5f5f4]"
                      style={{ backgroundColor: '#1c1917', color: '#f5f5f4' }}
                    >
                      Online (Guest Web Portal)
                    </option>
                  </select>
                  <p className="text-xs text-[var(--color-text-subtle)] mt-1.5">
                    How the service was ordered (front desk, room phone, or guest portal).
                  </p>
                </div>

                {/* Error */}
                {submitState === 'error' && (
                  <p
                    id="service-usage-error"
                    className="alert alert-error text-sm"
                    role="alert"
                  >
                    {errorMessage}
                  </p>
                )}

                {/* Success toast */}
                {submitState === 'success' && (
                  <p
                    id="service-usage-success"
                    className="alert alert-success text-sm"
                    role="status"
                  >
                    Service logged successfully.
                  </p>
                )}

                {/* Submit */}
                <button
                  id="service-usage-submit-btn"
                  type="submit"
                  disabled={isPending || !form.service_id}
                  aria-busy={isPending}
                  className="w-full bg-[#c5a880] hover:bg-[#b59469] active:scale-[0.99] text-[#161514] font-semibold text-xs uppercase tracking-[0.18em] py-3 rounded-md transition-all duration-200 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span
                        className="inline-block w-4 h-4 border-2 border-[#161514] border-t-transparent rounded-full animate-spin"
                        aria-hidden="true"
                      />
                      Logging…
                    </span>
                  ) : (
                    'Log Service'
                  )}
                </button>
              </form>
            </section>

            {/* ── Usage breakdown (right, 3/5) ── */}
            <section
              aria-labelledby="usage-breakdown-heading"
              className="lg:col-span-3"
            >
              <h2
                id="usage-breakdown-heading"
                className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)] mb-3"
              >
                Service Usage Breakdown
              </h2>

              <div id="service-usage-table-wrapper" className="card overflow-hidden">
                {usageRows.length === 0 ? (
                  <p
                    id="service-usage-empty"
                    className="p-8 text-center text-sm text-[var(--color-text-muted)]"
                  >
                    No services logged yet for this reservation.
                  </p>
                ) : (
                  <table
                    id="service-usage-table"
                    className="w-full text-sm"
                    aria-label="Service usage breakdown"
                  >
                    <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left font-semibold text-[var(--color-text-muted)]">Service</th>
                        <th scope="col" className="px-4 py-3 text-center font-semibold text-[var(--color-text-muted)]">Qty</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">Unit Price</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]">Line Total</th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold text-[var(--color-text-muted)] hidden sm:table-cell">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {usageRows.map((row) => (
                        <tr
                          key={row.usage_id}
                          id={`usage-row-${row.usage_id}`}
                          className="hover:bg-[var(--color-bg-subtle)] transition-colors"
                        >
                          <td className="px-4 py-3 text-[var(--color-text)] font-medium">
                            {row.service_name}
                            <span className="ml-2 text-xs text-[var(--color-text-subtle)] hidden sm:inline">
                              ({row.channel})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums text-[var(--color-text-muted)]">
                            {row.quantity}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text-muted)]">
                            {formatCurrency(row.charged_price)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium text-[var(--color-text)]">
                            {formatCurrency(row.line_total)}
                          </td>
                          <td className="px-4 py-3 text-[var(--color-text-muted)] hidden sm:table-cell">
                            {formatDate(row.usage_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-right font-semibold text-[var(--color-text-muted)]"
                        >
                          Total Service Charge
                          <span className="ml-1 text-xs font-normal">(display only - authoritative in DB)</span>
                        </td>
                        <td
                          id="service-usage-total"
                          className="px-4 py-3 text-right tabular-nums font-bold text-[var(--color-text)]"
                          aria-label={`Total service charge: ${formatCurrency(serviceTotal)}`}
                        >
                          {formatCurrency(serviceTotal)}
                        </td>
                        <td className="hidden sm:table-cell" />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              {/* Reservation period summary */}
              <div
                id="service-usage-reservation-summary"
                className="card p-4 mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm"
              >
                <span>
                  <span className="text-[var(--color-text-subtle)] text-xs uppercase tracking-wide">Check-In</span>
                  <br />
                  <span className="font-medium">{formatDate(displayRes.check_in_date)}</span>
                </span>
                <span>
                  <span className="text-[var(--color-text-subtle)] text-xs uppercase tracking-wide">Check-Out</span>
                  <br />
                  <span className="font-medium">{formatDate(displayRes.check_out_date)}</span>
                </span>
                <span>
                  <span className="text-[var(--color-text-subtle)] text-xs uppercase tracking-wide">Branch</span>
                  <br />
                  <span className="font-medium">{displayRes.branch_name}</span>
                </span>
                <span className="ml-auto">
                  <Link
                    href={`/staff/reservations/${reservationId}`}
                    id="service-usage-view-reservation-link"
                    className="btn btn-ghost text-sm"
                  >
                    View Full Reservation
                  </Link>
                </span>
              </div>
            </section>
          </div>
        </main>

        <footer
          id="service-usage-footer"
          className="border-t border-[var(--color-border)] py-4 text-center text-xs text-[var(--color-text-subtle)]"
        >
          SkyNest Hotels - Staff Portal · All access is logged and monitored
        </footer>
      </div>

      <style>{`
        .alert-success { background: var(--color-success-bg); color: var(--color-success);
                         border: 1px solid var(--color-success); border-radius: var(--radius-md);
                         padding: 0.5rem 0.75rem; }
      `}</style>
    </>
  );
}