'use client';

/**
 * Service Usage Logging Page — per reservation
 *
 * Allows staff to:
 *   1. View all logged service usage for a checked-in reservation.
 *   2. Log a new service usage entry (service, room, quantity, channel).
 *
 * DB-first rule:
 *   charged_price is NEVER entered by the user or computed in the UI.
 *   It is captured by sp_log_service_usage() at log time from the catalogue.
 *   The displayed line_total is from vw_service_usage_breakdown (UI-only; not authoritative).
 *
 * Calls:
 *   GET  /api/staff/reservations/[id]/services  — usage breakdown
 *   POST /api/staff/reservations/[id]/services  — log new usage
 *   GET  /api/staff/services                    — catalogue for dropdown
 *
 * Owned by: Member 4 (M4) | Task: P04-M04-T17 (Mock-First)
 * Lecture alignment: L06 (stored procedures, price snapshot), L07 (RBAC)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

// ---------------------------------------------------------------------------
// Types (mirrors API response shapes)
// ---------------------------------------------------------------------------

interface ServiceCatalogueItem {
  service_id: number;
  service_name: string;
  current_price: string;
  status: 'Active' | 'Inactive';
}

interface ServiceUsageBreakdownRow {
  usage_id: number;
  room_id: number;
  reservation_id: string;
  service_id: number;
  service_name: string;
  usage_date: string;
  quantity: number;
  charged_price: string;
  line_total: string;
  request_channel: string | null;
}

interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ServiceUsageLoggingPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const reservationId = params.id ?? '';

  // Catalogue dropdown
  const [catalogue, setCatalogue] = useState<ServiceCatalogueItem[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);

  // Usage history
  const [usageRows, setUsageRows] = useState<ServiceUsageBreakdownRow[]>([]);
  const [usageLoading, setUsageLoading] = useState(true);

  // Log form state
  const [roomId, setRoomId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [channel, setChannel] = useState<'Phone' | 'InPerson' | 'App' | ''>('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch catalogue items
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/staff/services');
        if (res.ok) {
          const json = await res.json() as { data: ServiceCatalogueItem[] };
          if (active) setCatalogue(json.data);
        }
      } catch {
        // Catalogue fetch failure is non-fatal — form shows empty dropdown
      } finally {
        if (active) setCatalogueLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch / refresh usage breakdown
  // ---------------------------------------------------------------------------
  const refreshUsage = useCallback(async () => {
    if (!reservationId) return;
    setUsageLoading(true);
    try {
      const res = await fetch(`/api/staff/reservations/${encodeURIComponent(reservationId)}/services`);
      if (res.ok) {
        const json = await res.json() as { data: ServiceUsageBreakdownRow[] };
        setUsageRows(json.data);
      }
    } catch {
      // Non-fatal
    } finally {
      setUsageLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    void refreshUsage();
  }, [refreshUsage]);

  // ---------------------------------------------------------------------------
  // Log new usage
  // ---------------------------------------------------------------------------
  const handleLogUsage = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);
    setSubmitting(true);

    const parsedRoomId = parseInt(roomId, 10);
    const parsedServiceId = parseInt(serviceId, 10);
    const parsedQuantity = parseInt(quantity, 10);

    if (!parsedRoomId || !parsedServiceId || !parsedQuantity || parsedQuantity < 1) {
      setSubmitError({ code: 'VALIDATION_ERROR', message: 'Please fill all required fields correctly.' });
      setSubmitting(false);
      return;
    }

    const body = {
      room_id: parsedRoomId,
      service_id: parsedServiceId,
      quantity: parsedQuantity,
      request_channel: channel || null,
    };

    try {
      const res = await fetch(
        `/api/staff/reservations/${encodeURIComponent(reservationId)}/services`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      const json = await res.json() as
        | { data: ServiceUsageBreakdownRow; meta: { requestId: string } }
        | { error: ApiError };

      if (!res.ok) {
        setSubmitError((json as { error: ApiError }).error);
      } else {
        setSubmitSuccess(true);
        // Reset form fields
        setRoomId('');
        setServiceId('');
        setQuantity('1');
        setChannel('');
        // Refresh the usage table
        await refreshUsage();
      }
    } catch {
      setSubmitError({ code: 'NETWORK_ERROR', message: 'Network error — please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived: total service charges (UI display only — NOT authoritative)
  // Authoritative total = fn_calc_service_charges(reservation_id) in PostgreSQL
  // ---------------------------------------------------------------------------
  const displayTotal = usageRows.reduce(
    (acc, row) => acc + parseFloat(row.line_total),
    0
  ).toFixed(2);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* ── Page Header ── */}
        <header>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Service Usage Logging
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Reservation ID:{' '}
            <span className="font-mono text-indigo-400">{reservationId || '—'}</span>
            &ensp;·&ensp;SkyNest Hotels Staff Portal
          </p>
        </header>

        {/* ── Log New Usage Form ── */}
        <section
          aria-label="Log new service usage"
          className="bg-gray-900 border border-gray-700 rounded-2xl shadow-lg p-7"
        >
          <h2 className="text-lg font-semibold text-white mb-5">Log Service Usage</h2>

          <form id="log-usage-form" onSubmit={handleLogUsage} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Service selector */}
              <div>
                <label htmlFor="service-select" className="block text-sm font-medium text-gray-300 mb-1">
                  Service <span aria-hidden className="text-red-400">*</span>
                </label>
                <select
                  id="service-select"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  required
                  aria-required="true"
                  disabled={catalogueLoading}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-white
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">— Select a service —</option>
                  {catalogue.map((s) => (
                    <option key={s.service_id} value={String(s.service_id)}>
                      {s.service_name} (LKR {s.current_price})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Charged price is captured at log time — not editable.
                </p>
              </div>

              {/* Room ID */}
              <div>
                <label htmlFor="room-id-input" className="block text-sm font-medium text-gray-300 mb-1">
                  Room ID <span aria-hidden className="text-red-400">*</span>
                </label>
                <input
                  id="room-id-input"
                  type="number"
                  min={1}
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  required
                  aria-required="true"
                  placeholder="e.g. 4"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-white
                             placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity-input" className="block text-sm font-medium text-gray-300 mb-1">
                  Quantity <span aria-hidden className="text-red-400">*</span>
                </label>
                <input
                  id="quantity-input"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  aria-required="true"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-white
                             focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Request channel */}
              <div>
                <label htmlFor="channel-select" className="block text-sm font-medium text-gray-300 mb-1">
                  Request Channel
                </label>
                <select
                  id="channel-select"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as typeof channel)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-white
                             focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Optional —</option>
                  <option value="Phone">Phone</option>
                  <option value="InPerson">In Person</option>
                  <option value="App">App</option>
                </select>
              </div>
            </div>

            <button
              id="log-usage-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
                         disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-lg
                         transition-colors duration-200"
            >
              {submitting ? 'Logging…' : 'Log Service Usage'}
            </button>
          </form>

          {/* Success */}
          {submitSuccess && (
            <div
              role="alert"
              aria-live="polite"
              id="log-usage-success"
              className="mt-4 bg-green-900/40 border border-green-600 rounded-xl p-4 text-green-300 text-sm"
            >
              ✓ Service usage logged successfully. Price snapshot captured.
            </div>
          )}

          {/* Error */}
          {submitError && (
            <div
              role="alert"
              aria-live="assertive"
              id="log-usage-error"
              className="mt-4 bg-red-900/40 border border-red-600 rounded-xl p-4 text-red-300 text-sm"
            >
              <p className="font-semibold text-red-200 mb-1">✗ Failed to log usage</p>
              <p>{submitError.message}</p>
              {submitError.fields && (
                <ul className="mt-2 list-disc list-inside text-xs text-red-400">
                  {Object.entries(submitError.fields).map(([field, msg]) => (
                    <li key={field}><span className="font-mono">{field}</span>: {msg}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* ── Usage History Table ── */}
        <section aria-label="Service usage history" className="bg-gray-900 border border-gray-700 rounded-2xl shadow-lg p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">Service Usage History</h2>
            <button
              type="button"
              onClick={() => void refreshUsage()}
              disabled={usageLoading}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline disabled:opacity-50"
            >
              {usageLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {usageLoading ? (
            <p className="text-gray-500 text-sm">Loading usage records…</p>
          ) : usageRows.length === 0 ? (
            <p className="text-gray-500 text-sm">No service usage recorded for this reservation yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Service usage breakdown table">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="pb-3 pr-4 font-medium">Date</th>
                      <th className="pb-3 pr-4 font-medium">Service</th>
                      <th className="pb-3 pr-4 font-medium">Room</th>
                      <th className="pb-3 pr-4 font-medium text-right">Qty</th>
                      <th className="pb-3 pr-4 font-medium text-right">Unit Price (LKR)</th>
                      <th className="pb-3 font-medium text-right">Line Total (LKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageRows.map((row) => (
                      <tr
                        key={row.usage_id}
                        className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="py-3 pr-4 text-gray-300">{row.usage_date}</td>
                        <td className="py-3 pr-4 text-white">{row.service_name}</td>
                        <td className="py-3 pr-4 text-gray-300">{row.room_id}</td>
                        <td className="py-3 pr-4 text-gray-300 text-right">{row.quantity}</td>
                        <td className="py-3 pr-4 text-gray-300 text-right">{row.charged_price}</td>
                        <td className="py-3 text-white font-medium text-right">{row.line_total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Display subtotal — UI only, NOT the authoritative total */}
              <div className="mt-4 flex justify-end">
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-0.5">
                    Subtotal (display only — authoritative total computed by DB)
                  </p>
                  <p className="text-xl font-bold text-indigo-300">
                    LKR {displayTotal}
                  </p>
                </div>
              </div>
            </>
          )}
        </section>

      </div>
    </main>
  );
}
