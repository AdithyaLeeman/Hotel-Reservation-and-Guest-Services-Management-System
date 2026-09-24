/**
 * Availability Service — search orchestration layer.
 * Owned by: Member 2 (M2) | Task: P02-M02-T08 (Mock-First)
 *
 * Responsibilities:
 *   1. Validate input date ranges (shape + semantics)
 *   2. Delegate to availabilityRepository.getAvailableRooms()
 *   3. Map raw repository rows to a typed response the route handler returns
 *
 * DB-first rule (AGENTS.md §5):
 *   This service does NOT perform any availability logic itself.
 *   All overlap detection and status filtering happen inside fn_get_available_rooms()
 *   (or its in-memory mock equivalent in the repository during parallel development).
 *
 * This layer intentionally contains NO financial calculations.
 * daily_rate is passed through from the DB row as a string — never multiplied here.
 */

import {
  availabilityRepository,
  type AvailableRoom,
} from '@/repositories/availability.repository';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class AvailabilityValidationError extends Error {
  constructor(
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AvailabilityValidationError';
  }
}

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

export interface AvailabilitySearchInput {
  branchId: number;
  /** ISO date string YYYY-MM-DD */
  checkIn: string;
  /** ISO date string YYYY-MM-DD */
  checkOut: string;
}

/**
 * The shape returned to route handlers and ultimately to the client.
 * daily_rate is kept as a string to honour the money-as-string contract
 * (docs/21_shared-contracts.md §3).
 */
export interface AvailabilitySearchResult {
  rooms: AvailableRoom[];
  /** Human-readable ISO dates echoed back for client confirmation */
  checkIn: string;
  checkOut: string;
  /** Number of nights — informational only; authoritative value lives in DB */
  nightsRequested: number;
}

// ---------------------------------------------------------------------------
// ISO date helpers
// ---------------------------------------------------------------------------

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

/**
 * Compute the number of calendar nights between two ISO date strings.
 * Used for display only — DO NOT use this for billing calculations.
 * Authoritative nights = check_out_date - check_in_date computed in PostgreSQL.
 */
function computeNights(checkIn: string, checkOut: string): number {
  const inMs  = new Date(checkIn  + 'T00:00:00Z').getTime();
  const outMs = new Date(checkOut + 'T00:00:00Z').getTime();
  return Math.round((outMs - inMs) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const availabilityService = {
  /**
   * Search for available rooms for a given branch and date range.
   *
   * Validation (performed here, before DB call):
   *   - branchId must be a positive integer
   *   - checkIn and checkOut must be valid ISO YYYY-MM-DD date strings
   *   - checkOut must be strictly after checkIn (minimum 1 night stay)
   *   - checkIn must not be in the past (today or future only)
   *
   * Delegation:
   *   All availability computation is delegated to availabilityRepository,
   *   which wraps fn_get_available_rooms() (PostgreSQL in production).
   */
  async searchAvailable(
    input: AvailabilitySearchInput,
  ): Promise<AvailabilitySearchResult> {
    // --- Input validation ---
    if (!Number.isInteger(input.branchId) || input.branchId <= 0) {
      throw new AvailabilityValidationError('branchId must be a positive integer', {
        branchId: 'Must be a positive integer',
      });
    }

    if (!isValidIsoDate(input.checkIn)) {
      throw new AvailabilityValidationError('checkIn is not a valid date', {
        checkIn: 'Must be a valid date in YYYY-MM-DD format',
      });
    }

    if (!isValidIsoDate(input.checkOut)) {
      throw new AvailabilityValidationError('checkOut is not a valid date', {
        checkOut: 'Must be a valid date in YYYY-MM-DD format',
      });
    }

    if (input.checkOut <= input.checkIn) {
      throw new AvailabilityValidationError(
        'checkOut must be after checkIn (minimum 1 night)',
        {
          checkOut: 'Must be strictly after check-in date',
        },
      );
    }

    // Past date guard — compare against today in UTC to avoid timezone edge cases
    const todayUtc = new Date().toISOString().slice(0, 10);
    if (input.checkIn < todayUtc) {
      throw new AvailabilityValidationError(
        'checkIn date cannot be in the past',
        {
          checkIn: 'Must be today or a future date',
        },
      );
    }

    // --- Delegation to repository ---
    const rooms = await availabilityRepository.getAvailableRooms(
      input.branchId,
      input.checkIn,
      input.checkOut,
    );

    return {
      rooms,
      checkIn:         input.checkIn,
      checkOut:        input.checkOut,
      nightsRequested: computeNights(input.checkIn, input.checkOut),
    };
  },
};
