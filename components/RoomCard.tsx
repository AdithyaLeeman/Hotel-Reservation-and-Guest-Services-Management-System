/**
 * RoomCard — displays a single available room result on the public search page.
 *
 * Owned by: Member 2 (M2) | Task: P02-M02-T14
 * Type: 🟢 PARALLEL — no DB dependency.
 *
 * Design rules (context/07-ui-rules.md):
 * - daily_rate displayed as LKR with 2 decimal places — never multiplied here
 * - Color is never the only means of conveying information (icon + color)
 * - All interactive elements have unique, descriptive id attributes
 *
 * See context/06-ui-tokens.md for design tokens.
 */

import type { AvailableRoom } from '@/repositories/availability.repository';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RoomCardProps {
  room: AvailableRoom;
  /** ISO date strings echoed from the search query — needed for the reserve link */
  checkIn: string;
  checkOut: string;
  /** Visual index for unique IDs (position in the results list) */
  index?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a NUMERIC(12,2) string from the API as "LKR XX,XXX.XX".
 * Display-only — authoritative billing lives in PostgreSQL.
 */
function formatRate(dailyRate: string): string {
  const num = parseFloat(dailyRate);
  if (isNaN(num)) return 'LKR —';
  return (
    'LKR ' +
    num.toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function capacityLabel(capacity: number): string {
  return capacity === 1 ? '1 guest' : `Up to ${capacity} guests`;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  Available:   'bg-emerald-100 text-emerald-800 border-emerald-200',
  Occupied:    'bg-amber-100   text-amber-800   border-amber-200',
  Maintenance: 'bg-red-100     text-red-800     border-red-200',
};

const STATUS_LABEL: Record<string, string> = {
  Available:   'Available',
  Occupied:    'Occupied',
  Maintenance: 'Under Maintenance',
};

// ---------------------------------------------------------------------------
// Room type icon (inline SVG, no extra dependency)
// ---------------------------------------------------------------------------

function RoomTypeIcon({ typeName }: { typeName: string }) {
  if (typeName === 'Single') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        className="w-6 h-6" aria-hidden="true">
        <path d="M3 7v10M21 7v10M3 12h18M5 7h14a2 2 0 0 1 2 2v1H3V9a2 2 0 0 1 2-2z" />
      </svg>
    );
  }
  if (typeName === 'Double') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        className="w-6 h-6" aria-hidden="true">
        <path d="M2 7v11M22 7v11M2 12h20M5 7h14a2 2 0 0 1 2 2v1H3V9a2 2 0 0 1 2-2zM8 7V5M16 7V5" />
      </svg>
    );
  }
  // Suite / luxury
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className="w-6 h-6" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RoomCard displays a single available room from the /api/availability response.
 * The reserve CTA pre-fills the booking form with check-in/check-out dates.
 */
export default function RoomCard({ room, checkIn, checkOut, index = 0 }: RoomCardProps) {
  const cardId   = `room-card-${room.room_id}`;
  const reserveId = `reserve-btn-${room.room_id}-${index}`;

  const badgeClass = STATUS_BADGE[room.status] ?? STATUS_BADGE.Available;
  const statusLabel = STATUS_LABEL[room.status] ?? room.status;

  const reserveParams = new URLSearchParams({
    roomId:   String(room.room_id),
    checkIn,
    checkOut,
  });

  return (
    <article
      id={cardId}
      aria-label={`Room ${room.room_number} — ${room.type_name}`}
      className="
        group relative flex flex-col
        bg-white dark:bg-neutral-900
        border border-neutral-200 dark:border-neutral-700
        rounded-2xl shadow-sm
        hover:shadow-xl hover:-translate-y-1
        transition-all duration-300 ease-out
        overflow-hidden
      "
    >
      {/* Decorative gradient header band */}
      <div
        aria-hidden="true"
        className="
          h-2 w-full
          bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500
          group-hover:from-amber-400 group-hover:via-orange-400 group-hover:to-yellow-400
          transition-all duration-500
        "
      />

      <div className="flex flex-col flex-1 p-6 gap-4">

        {/* Header: icon + room number/type + status badge */}
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="
                flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0
                bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400
              "
            >
              <RoomTypeIcon typeName={room.type_name} />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white leading-tight">
                Room {room.room_number}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{room.type_name}</p>
            </div>
          </div>

          <span
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1
              rounded-full border text-xs font-medium flex-shrink-0
              ${badgeClass}
            `}
            aria-label={`Status: ${statusLabel}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
            {statusLabel}
          </span>
        </header>

        {/* Capacity */}
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            className="w-4 h-4 flex-shrink-0 text-neutral-400" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>{capacityLabel(room.capacity)}</span>
        </div>

        <hr className="border-neutral-100 dark:border-neutral-800" />

        {/* Price */}
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
              {formatRate(room.daily_rate)}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              per night · prices exclude tax
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-300 dark:text-neutral-600">
            #{room.room_id}
          </span>
        </div>

        {/* Reserve CTA */}
        <div className="mt-auto pt-2">
          <Link
            id={reserveId}
            href={`/guest/reservations/new?${reserveParams.toString()}`}
            aria-label={`Reserve room ${room.room_number} — ${checkIn} to ${checkOut}`}
            className="
              block w-full text-center px-4 py-3 rounded-xl
              bg-blue-600 hover:bg-blue-700 active:bg-blue-800
              dark:bg-blue-500 dark:hover:bg-blue-400
              text-white text-sm font-semibold
              transition-colors duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
            "
          >
            Reserve This Room
          </Link>
        </div>

      </div>
    </article>
  );
}
