/**
 * RoomCard - displays a single available room result on the public search page.
 *
 * Owned by: Member 2 (M2) | Task: P02-M02-T14
 * Type: 🟢 PARALLEL - no DB dependency.
 *
 * Design rules (context/07-ui-rules.md):
 * - daily_rate displayed as LKR with 2 decimal places - never multiplied here
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
  /** ISO date strings echoed from the search query - needed for the reserve link */
  checkIn: string;
  checkOut: string;
  /** Visual index for unique IDs (position in the results list) */
  index?: number;
  /** Optional amenities that match the user's active filter to highlight */
  highlightedAmenities?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function AmenityIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.includes('wi-fi') || lower.includes('wifi')) {
    return (
      <svg className="w-3.5 h-3.5 text-[#c5a880] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
    );
  }
  if (lower.includes('air') || lower.includes('ac')) {
    return (
      <svg className="w-3.5 h-3.5 text-[#c5a880] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
      </svg>
    );
  }
  if (lower.includes('mini bar') || lower.includes('bar')) {
    return (
      <svg className="w-3.5 h-3.5 text-[#c5a880] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 22h8M12 11v11M5 3l7 8 7-8z" />
      </svg>
    );
  }
  if (lower.includes('ocean') || lower.includes('view')) {
    return (
      <svg className="w-3.5 h-3.5 text-[#c5a880] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    );
  }
  if (lower.includes('jacuzzi')) {
    return (
      <svg className="w-3.5 h-3.5 text-[#c5a880] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12h20M7 19h10a4 4 0 0 0 4-4v-1H3v1a4 4 0 0 0 4 4z" />
        <path d="M6 8a2 2 0 0 1 2-2M12 8a2 2 0 0 1 2-2M18 8a2 2 0 0 1 2-2" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 text-[#c5a880] shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a NUMERIC(12,2) string from the API as "LKR XX,XXX.XX".
 * Display-only - authoritative billing lives in PostgreSQL.
 */
function formatRate(dailyRate: string): string {
  const num = parseFloat(dailyRate);
  if (isNaN(num)) return 'LKR -';
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
  Available:   'bg-[#c5a880]/15 text-[#c5a880] border border-[#c5a880]/40',
  Occupied:    'bg-[#a8a29e]/15 text-[#d6d3d1] border border-[#a8a29e]/30',
  Maintenance: 'bg-[#b45309]/20 text-[#fcd34d] border border-[#b45309]/40',
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

const ROOM_IMAGES: Record<string, string> = {
  Single: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
  Double: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
  Suite: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
  Deluxe: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RoomCard displays a single available room from the /api/availability response.
 * The reserve CTA pre-fills the booking form with check-in/check-out dates.
 */
export default function RoomCard({
  room,
  checkIn,
  checkOut,
  index = 0,
  highlightedAmenities = [],
}: RoomCardProps) {
  const cardId   = `room-card-${room.room_id}`;
  const reserveId = `reserve-btn-${room.room_id}-${index}`;

  const badgeClass = STATUS_BADGE[room.status] ?? STATUS_BADGE.Available;
  const statusLabel = STATUS_LABEL[room.status] ?? room.status;

  const reserveParams = new URLSearchParams({
    roomId:     String(room.room_id),
    roomNumber: room.room_number,
    branchId:   String(room.branch_id),
    typeName:   room.type_name,
    dailyRate:  room.daily_rate,
    amenities:  (room.amenities || []).join(','),
    checkIn,
    checkOut,
  });

  const imageUrl = ROOM_IMAGES[room.type_name] ?? 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80';

  return (
    <article
      id={cardId}
      aria-label={`Room ${room.room_number} - ${room.type_name}`}
      className="
        group relative flex flex-col
        bg-white dark:bg-[#1a1918]
        border border-[#e7e2d9] dark:border-[#2f2b26]
        rounded-sm shadow-sm hover:shadow-xl hover:-translate-y-1
        transition-all duration-300 ease-out
        overflow-hidden
      "
    >
      {/* Top Photography with Price Badge */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-900">
        <img
          src={imageUrl}
          alt={`SkyNest Hotel Room ${room.room_number} - ${room.type_name}`}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Gold Price Banner Badge */}
        <div className="absolute top-3 right-3 bg-[#c5a880] text-[#161514] font-semibold text-xs tracking-wider uppercase px-3 py-1.5 shadow-md flex items-baseline gap-1">
          <span className="font-bold">{formatRate(room.daily_rate)}</span>
          <span className="text-[10px] opacity-80">/ NIGHT</span>
        </div>

        {/* Status Badge */}
        <span
          className={`
            absolute bottom-3 left-3
            inline-flex items-center gap-1.5 px-2.5 py-1
            rounded-full backdrop-blur-md text-xs font-medium
            ${badgeClass}
          `}
          aria-label={`Status: ${statusLabel}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
          {statusLabel}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-6 gap-3">
        {/* Category & Star Rating */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#c5a880]">
            LUXURY {room.type_name.toUpperCase()}
          </span>
          <div className="flex text-[#c5a880] text-xs tracking-tight" aria-label="5 stars rating">
            ★★★★★
          </div>
        </div>

        {/* Room Title */}
        <div>
          <h3 className="font-serif text-xl font-medium text-[#1c1917] dark:text-[#f7f5f2] leading-tight group-hover:text-[#c5a880] transition-colors">
            Room {room.room_number}
          </h3>
          <p className="text-xs text-[#78716c] dark:text-[#a8a29e] mt-1 font-sans">
            SkyNest Premier Collection · {room.type_name}
          </p>
        </div>

        {/* Features Row */}
        <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#a8a29e] pt-2 border-t border-[#f0ece5] dark:border-[#2b2723]">
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
              className="w-4 h-4 text-[#c5a880]" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{capacityLabel(room.capacity)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
              className="w-4 h-4 text-[#c5a880]" aria-hidden="true">
              <path d="M3 7v10M21 7v10M3 12h18M5 7h14a2 2 0 0 1 2 2v1H3V9a2 2 0 0 1 2-2z" />
            </svg>
            <span>{room.type_name === 'Single' ? 'Twin/Single Bed' : 'King Size Bed'}</span>
          </div>
        </div>

        {/* Amenities Badges */}
        {room.amenities && room.amenities.length > 0 && (
          <div className="pt-2 border-t border-[#f0ece5] dark:border-[#2b2723]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8c827a] dark:text-[#a8a29e]">
                Included Amenities
              </span>
              <span className="text-[10px] text-[#c5a880] font-medium">
                {room.amenities.length} {room.amenities.length === 1 ? 'feature' : 'features'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5" aria-label={`Amenities for Room ${room.room_number}`}>
              {room.amenities.map((amenity) => {
                const isHighlighted = highlightedAmenities.some(
                  (h) => h.toLowerCase() === amenity.toLowerCase()
                );
                return (
                  <span
                    key={amenity}
                    className={`
                      inline-flex items-center gap-1.5
                      text-[11px] font-medium
                      px-2.5 py-1 rounded-xs
                      transition-colors
                      ${isHighlighted
                        ? 'bg-[#c5a880]/20 text-[#e5d3b3] border border-[#c5a880] shadow-[0_0_8px_rgba(197,168,128,0.2)]'
                        : 'bg-[#f6f2ec] dark:bg-[#201d19] text-[#57534e] dark:text-[#d6cec3] border border-[#e8e2d7] dark:border-[#38332c]'}
                    `}
                  >
                    <AmenityIcon name={amenity} />
                    <span>{amenity}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Reserve CTA */}
        <div className="mt-auto pt-3">
          <Link
            id={reserveId}
            href={`/guest/reservations/new?${reserveParams.toString()}`}
            aria-label={`Reserve room ${room.room_number} - ${checkIn} to ${checkOut}`}
            className="
              block w-full text-center py-2.5 px-4
              bg-[#c5a880] hover:bg-[#b59469] active:bg-[#a68042]
              text-[#161514] text-xs font-semibold uppercase tracking-[0.15em]
              transition-all duration-200 shadow-sm hover:shadow
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a880] focus-visible:ring-offset-2
            "
          >
            Reserve This Room
          </Link>
        </div>

      </div>
    </article>
  );
}
