/**
 * Reservation Repository — data access layer for guest and staff reservations.
 *
 * Security invariant (CRITICAL):
 *   guest_id is ALWAYS sourced from the server-side session — never from
 *   request parameters or body. Every guest query includes WHERE guest_id = $1
 *   with the session-derived ID. Violation is a security defect.
 *
 * Mock-first pattern (SP3.3):
 *   All methods use an in-memory mock store that mirrors seed data.
 *   To switch to real DB: set USE_MOCK = false — each method contains
 *   the exact pg parameterised query / CALL statement to uncomment.
 *   Swap is safe once SP3.1 migrations are executed on the real database.
 *
 * DB routines used:
 *   sp_create_reservation()     — P03-M03-T03 (atomic create + overlap check)
 *   fn_get_reservation_detail() — P03-M03-T04 (full detail join)
 *   sp_cancel_reservation()     — P03-M03-T05 (status-guarded cancel)
 *   vw_active_reservations      — P03-M03-T06 (staff list view)
 *
 * Owned by: Member 3 (M3) — Hiripitiya S.K., 240238C
 * Tasks:    P03-M03-T07, T08, T09 (repository methods)
 */

import type { PoolClient } from '@/lib/db/pool';
import { pool } from '@/lib/db/pool';
import type { Reservation } from '@/types/domain';
import type { BookingSource, ReservationStatus } from '@/types/enums';

// ---------------------------------------------------------------------------
// Mock-first flag — set false once SP3.1 migrations are executed on real DB
// ---------------------------------------------------------------------------
const USE_MOCK = true;

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

/** Parameters for sp_create_reservation() */
export interface CreateReservationParams {
  /** From session.guestId — never from request body */
  guest_id: string;
  branch_id: number;
  check_in_date: string;   // ISO date string 'YYYY-MM-DD'
  check_out_date: string;  // ISO date string 'YYYY-MM-DD'
  room_ids: number[];
  booking_source: BookingSource;
  /** From session.userId — the user account performing the action */
  created_by_user_id: string;
  /** NULL for online bookings; employee_id for Reception/Phone */
  employee_id: number | null;
  discount_percentage: string | null; // NUMERIC(5,2) string or null
}

/** Room detail row joined alongside a reservation */
export interface ReservationRoomDetail {
  room_id: number;
  room_number: string;
  type_name: string;
  rate_per_night: string; // NUMERIC(12,2) — historical snapshot
}

/** Full reservation detail returned by fn_get_reservation_detail() + rooms sub-query */
export interface ReservationDetail {
  reservation_id: string;
  guest_id: string;
  guest_full_name: string;
  guest_email: string;
  branch_id: number;
  branch_location_name: string;
  check_in_date: string;
  check_out_date: string;
  reservation_status: ReservationStatus;
  discount_percentage: string | null;
  booking_source: BookingSource;
  processed_by_employee_id: number | null;
  created_at: string;
  /** Rooms fetched via reservation_rooms JOIN room JOIN room_type */
  rooms: ReservationRoomDetail[];
}

/** Row shape returned by vw_active_reservations */
export interface ActiveReservationRow {
  reservation_id: string;
  guest_id: string;
  guest_full_name: string;
  guest_email: string;
  branch_id: number;
  branch_location_name: string;
  check_in_date: string;
  check_out_date: string;
  reservation_status: ReservationStatus;
  booking_source: BookingSource;
  discount_percentage: string | null;
  processed_by_employee_id: number | null;
  room_count: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// In-memory mock store (private to this module)
// ---------------------------------------------------------------------------

interface MockReservation extends Reservation {
  /** Internal: rooms stored alongside for mock detail joins */
  _rooms: ReservationRoomDetail[];
}

const MOCK_STORE: MockReservation[] = [
  {
    reservation_id: 'res-mock-001',
    guest_id: 'guest-mock-001',
    branch_id: 1,
    check_in_date: '2026-10-01',
    check_out_date: '2026-10-05',
    reservation_status: 'Booked',
    discount_percentage: null,
    processed_by_employee_id: null,
    created_by_user_id: 'user-mock-001',
    booking_source: 'Online',
    created_at: new Date('2026-09-15T08:00:00Z').toISOString(),
    _rooms: [
      { room_id: 1, room_number: '101', type_name: 'Single', rate_per_night: '10000.00' },
    ],
  },
  {
    reservation_id: 'res-mock-002',
    guest_id: 'guest-mock-001',
    branch_id: 2,
    check_in_date: '2026-11-10',
    check_out_date: '2026-11-14',
    reservation_status: 'CheckedIn',
    discount_percentage: '10.00',
    processed_by_employee_id: 3,
    created_by_user_id: 'user-mock-003',
    booking_source: 'Reception',
    created_at: new Date('2026-10-20T10:30:00Z').toISOString(),
    _rooms: [
      { room_id: 7, room_number: '102', type_name: 'Double', rate_per_night: '18000.00' },
      { room_id: 8, room_number: '103', type_name: 'Double', rate_per_night: '18000.00' },
    ],
  },
  {
    reservation_id: 'res-mock-003',
    guest_id: 'guest-mock-002', // different guest — for ownership tests
    branch_id: 1,
    check_in_date: '2026-10-15',
    check_out_date: '2026-10-18',
    reservation_status: 'Booked',
    discount_percentage: null,
    processed_by_employee_id: null,
    created_by_user_id: 'user-mock-002',
    booking_source: 'Online',
    created_at: new Date('2026-09-18T12:00:00Z').toISOString(),
    _rooms: [
      { room_id: 2, room_number: '102', type_name: 'Double', rate_per_night: '18000.00' },
    ],
  },
];

let mockCounter = 4;

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const reservationRepository = {
  // -------------------------------------------------------------------------
  // P03-M03-T07 — Create reservation (calls sp_create_reservation)
  // -------------------------------------------------------------------------

  /**
   * Calls sp_create_reservation() stored procedure atomically.
   *
   * The procedure owns the entire transaction:
   *   - Overlap check via SELECT FOR UPDATE (concurrency lock — L12)
   *   - Branch consistency check (SQLSTATE 45002)
   *   - Maintenance exclusion check (SQLSTATE 45003)
   *   - INSERT into reservation + reservation_rooms (with rate_per_night snapshot)
   *
   * Caller must NOT wrap in BEGIN/COMMIT — the procedure manages its own transaction.
   *
   * @param client  — pg PoolClient acquired by the caller
   * @param params  — CreateReservationParams (guest_id MUST come from session)
   * @returns       — { reservation_id } of the newly created reservation
   *
   * SQLSTATE errors propagated from the procedure:
   *   45001 — room overlap
   *   45002 — branch mismatch
   *   45003 — room in Maintenance
   */
  callCreateReservation: async (
    client: PoolClient,
    params: CreateReservationParams
  ): Promise<{ reservation_id: string }> => {
    if (USE_MOCK) {
      // Simulate overlap: reject if any requested room is in an active
      // reservation for an overlapping date range (mirrors SP logic)
      const reqStart = new Date(params.check_in_date);
      const reqEnd   = new Date(params.check_out_date);

      for (const roomId of params.room_ids) {
        const conflict = MOCK_STORE.find(
          (r) =>
            r.reservation_status !== 'Cancelled' &&
            r.reservation_status !== 'CheckedOut' &&
            r._rooms.some((rr) => rr.room_id === roomId) &&
            new Date(r.check_in_date)  < reqEnd &&
            new Date(r.check_out_date) > reqStart
        );
        if (conflict) {
          const err = new Error(
            `Room ${roomId} is already reserved for the requested dates`
          ) as Error & { code: string };
          err.code = '45001';
          throw err;
        }
      }

      const newId = `res-mock-${String(mockCounter++).padStart(3, '0')}`;
      MOCK_STORE.push({
        reservation_id: newId,
        guest_id: params.guest_id,
        branch_id: params.branch_id,
        check_in_date: params.check_in_date,
        check_out_date: params.check_out_date,
        reservation_status: 'Booked',
        discount_percentage: params.discount_percentage,
        processed_by_employee_id: params.employee_id,
        created_by_user_id: params.created_by_user_id,
        booking_source: params.booking_source,
        created_at: new Date().toISOString(),
        _rooms: params.room_ids.map((id) => ({
          room_id: id,
          room_number: `R${id}`,   // placeholder — real JOIN fills this in DB path
          type_name: 'Unknown',
          rate_per_night: '0.00',
        })),
      });
      return { reservation_id: newId };
    }

    // --- REAL DB path (uncomment once SP3.1 executed) ---
    // PostgreSQL CALL with INOUT parameter pattern.
    // The procedure sets p_reservation_id := gen_random_uuid() internally.
    //
    // const result = await client.query<{ p_reservation_id: string }>(
    //   `CALL sp_create_reservation(
    //       $1::uuid,            -- p_guest_id
    //       $2::bigint,          -- p_branch_id
    //       $3::date,            -- p_check_in_date
    //       $4::date,            -- p_check_out_date
    //       $5::bigint[],        -- p_room_ids
    //       $6::booking_source,  -- p_booking_source
    //       $7::uuid,            -- p_created_by_user_id
    //       $8::bigint,          -- p_employee_id (NULL for online)
    //       $9::numeric(5,2),    -- p_discount_percentage (NULL = no discount)
    //       NULL::uuid           -- p_reservation_id (INOUT — filled by procedure)
    //    )`,
    //   [
    //     params.guest_id,
    //     params.branch_id,
    //     params.check_in_date,
    //     params.check_out_date,
    //     params.room_ids,
    //     params.booking_source,
    //     params.created_by_user_id,
    //     params.employee_id ?? null,
    //     params.discount_percentage ?? null,
    //   ]
    // );
    // return { reservation_id: result.rows[0].p_reservation_id };

    void client; // suppress unused-param lint until real path active
    throw new Error(
      'reservationRepository.callCreateReservation: real DB path not active. ' +
      'Set USE_MOCK = false after running SP3.1 migrations.'
    );
  },

  // -------------------------------------------------------------------------
  // P03-M03-T08 — List reservations for a guest (guest portal)
  // -------------------------------------------------------------------------

  /**
   * Returns all reservations for a specific guest, ordered newest first.
   *
   * SECURITY: guestId MUST come from session.guestId, never from the request.
   * The WHERE guest_id = $1 predicate enforces ownership at the query level.
   *
   * @param guestId  — session.guestId
   * @returns        — array of Reservation rows (empty if none found)
   */
  listByGuestId: async (guestId: string): Promise<Reservation[]> => {
    if (USE_MOCK) {
      return MOCK_STORE
        .filter((r) => r.guest_id === guestId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(({ _rooms: _ignored, ...r }) => ({ ...r }));
    }

    // --- REAL DB path ---
    // const result = await pool.query<Reservation>(
    //   `SELECT
    //       reservation_id,
    //       guest_id,
    //       branch_id,
    //       check_in_date::text,
    //       check_out_date::text,
    //       reservation_status,
    //       discount_percentage::text,
    //       processed_by_employee_id,
    //       created_by_user_id,
    //       booking_source,
    //       created_at::text
    //    FROM reservation
    //    WHERE guest_id = $1
    //    ORDER BY created_at DESC`,
    //   [guestId]
    // );
    // return result.rows;

    void pool;
    throw new Error(
      'reservationRepository.listByGuestId: real DB path not active. ' +
      'Set USE_MOCK = false after running SP3.1 migrations.'
    );
  },

  // -------------------------------------------------------------------------
  // P03-M03-T09 — Get full reservation detail (guest-owned or staff access)
  // -------------------------------------------------------------------------

  /**
   * Returns full reservation detail by calling fn_get_reservation_detail().
   *
   * SECURITY: Pass guestId (from session) for guest access — the DB function
   * enforces ownership and raises P0002 on mismatch to prevent info leakage.
   * Pass null for staff access (no ownership restriction).
   *
   * @param reservationId  — UUID of the reservation
   * @param guestId        — session.guestId for guest access; null for staff
   * @returns              — ReservationDetail including rooms, or null if not found
   */
  findDetailById: async (
    reservationId: string,
    guestId: string | null
  ): Promise<ReservationDetail | null> => {
    if (USE_MOCK) {
      const found = MOCK_STORE.find(
        (r) =>
          r.reservation_id === reservationId &&
          (guestId === null || r.guest_id === guestId)
      );
      if (!found) return null;

      return {
        reservation_id: found.reservation_id,
        guest_id: found.guest_id,
        guest_full_name: 'Mock Guest',
        guest_email: 'mock@example.com',
        branch_id: found.branch_id,
        branch_location_name:
          ['Colombo', 'Kandy', 'Galle'][found.branch_id - 1] ?? 'Unknown Branch',
        check_in_date: found.check_in_date,
        check_out_date: found.check_out_date,
        reservation_status: found.reservation_status,
        discount_percentage: found.discount_percentage,
        booking_source: found.booking_source,
        processed_by_employee_id: found.processed_by_employee_id,
        created_at: found.created_at,
        rooms: found._rooms.map((rr) => ({ ...rr })),
      };
    }

    // --- REAL DB path ---
    // Step 1: call fn_get_reservation_detail() for the header row.
    // Step 2: fetch rooms from reservation_rooms JOIN room JOIN room_type.
    //
    // try {
    //   const headerRes = await pool.query<Omit<ReservationDetail, 'rooms'>>(
    //     `SELECT * FROM fn_get_reservation_detail($1::uuid, $2::uuid)`,
    //     [reservationId, guestId ?? null]
    //   );
    //   if (headerRes.rows.length === 0) return null;
    //   const header = headerRes.rows[0];
    //
    //   const roomsRes = await pool.query<ReservationRoomDetail>(
    //     `SELECT
    //         rr.room_id,
    //         r.room_number,
    //         rt.type_name,
    //         rr.rate_per_night::text
    //      FROM reservation_rooms rr
    //      JOIN room      r  ON r.room_id  = rr.room_id
    //      JOIN room_type rt ON rt.type_id = r.type_id
    //      WHERE rr.reservation_id = $1`,
    //     [reservationId]
    //   );
    //
    //   return { ...header, rooms: roomsRes.rows };
    // } catch (err: unknown) {
    //   // P0002 = no_data_found raised by fn_get_reservation_detail on ownership mismatch
    //   if ((err as { code?: string }).code === 'P0002') return null;
    //   throw err;
    // }

    throw new Error(
      'reservationRepository.findDetailById: real DB path not active. ' +
      'Set USE_MOCK = false after running SP3.1 migrations.'
    );
  },

  // -------------------------------------------------------------------------
  // Convenience: findById (no ownership — staff use only)
  // -------------------------------------------------------------------------

  /**
   * Find a reservation by ID only (no guest ownership check — staff use).
   * Returns the base Reservation row (no joined data).
   */
  findById: async (reservationId: string): Promise<Reservation | null> => {
    if (USE_MOCK) {
      const found = MOCK_STORE.find((r) => r.reservation_id === reservationId);
      if (!found) return null;
      const { _rooms: _ignored, ...r } = found;
      void _ignored;
      return { ...r };
    }

    // --- REAL DB path ---
    // const result = await pool.query<Reservation>(
    //   `SELECT
    //       reservation_id, guest_id, branch_id,
    //       check_in_date::text, check_out_date::text,
    //       reservation_status, discount_percentage::text,
    //       processed_by_employee_id, created_by_user_id,
    //       booking_source, created_at::text
    //    FROM reservation
    //    WHERE reservation_id = $1`,
    //   [reservationId]
    // );
    // return result.rows[0] ?? null;

    throw new Error(
      'reservationRepository.findById: real DB path not active. ' +
      'Set USE_MOCK = false after running SP3.1 migrations.'
    );
  },

  // -------------------------------------------------------------------------
  // P03-M03-T08 — List active reservations (staff, via vw_active_reservations)
  // -------------------------------------------------------------------------

  /**
   * List active (Booked + CheckedIn) reservations for staff dashboards.
   * Reads from vw_active_reservations with optional branch_id filter for
   * Receptionist scope enforcement (see docs/08_business-rules).
   *
   * @param branchId  — if provided, scopes to this branch (Receptionist RBAC)
   *                    if null, returns all branches (Manager / Admin)
   * @returns         — array of ActiveReservationRow
   */
  listActive: async (branchId: number | null): Promise<ActiveReservationRow[]> => {
    if (USE_MOCK) {
      return MOCK_STORE
        .filter(
          (r) =>
            (r.reservation_status === 'Booked' || r.reservation_status === 'CheckedIn') &&
            (branchId === null || r.branch_id === branchId)
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((r) => ({
          reservation_id: r.reservation_id,
          guest_id: r.guest_id,
          guest_full_name: 'Mock Guest',
          guest_email: 'mock@example.com',
          branch_id: r.branch_id,
          branch_location_name:
            ['Colombo', 'Kandy', 'Galle'][r.branch_id - 1] ?? 'Unknown Branch',
          check_in_date: r.check_in_date,
          check_out_date: r.check_out_date,
          reservation_status: r.reservation_status,
          booking_source: r.booking_source,
          discount_percentage: r.discount_percentage,
          processed_by_employee_id: r.processed_by_employee_id,
          room_count: r._rooms.length,
          created_at: r.created_at,
        }));
    }

    // --- REAL DB path ---
    // const query = branchId !== null
    //   ? `SELECT * FROM vw_active_reservations WHERE branch_id = $1 ORDER BY created_at DESC`
    //   : `SELECT * FROM vw_active_reservations ORDER BY created_at DESC`;
    // const params = branchId !== null ? [branchId] : [];
    // const result = await pool.query<ActiveReservationRow>(query, params);
    // return result.rows;

    throw new Error(
      'reservationRepository.listActive: real DB path not active. ' +
      'Set USE_MOCK = false after running SP3.1 migrations.'
    );
  },

  // -------------------------------------------------------------------------
  // P03-M03-T09 — Cancel reservation (calls sp_cancel_reservation)
  // -------------------------------------------------------------------------

  /**
   * Calls sp_cancel_reservation() to mark a reservation as 'Cancelled'.
   *
   * The procedure:
   *   - Locks the row (FOR UPDATE) to prevent concurrent state changes
   *   - Guards: only 'Booked' reservations can be cancelled (45010 otherwise)
   *   - Enforces guest ownership when guestId is provided (P0002 on mismatch)
   *   - Raises P0002 if not found
   *
   * @param reservationId      — UUID of the reservation to cancel
   * @param guestId            — session.guestId for guest cancellations;
   *                             null for staff override (no ownership check)
   * @param cancelledByUserId  — session.userId of the actor (audit trail)
   */
  callCancelReservation: async (
    reservationId: string,
    guestId: string | null,
    cancelledByUserId: string
  ): Promise<void> => {
    if (USE_MOCK) {
      const idx = MOCK_STORE.findIndex(
        (r) =>
          r.reservation_id === reservationId &&
          (guestId === null || r.guest_id === guestId)
      );

      if (idx === -1) {
        const err = new Error(`Reservation ${reservationId} not found`) as Error & { code: string };
        err.code = 'P0002';
        throw err;
      }

      const current = MOCK_STORE[idx];
      if (current.reservation_status !== 'Booked') {
        const err = new Error(
          `Reservation ${reservationId} cannot be cancelled — current status is ${current.reservation_status}`
        ) as Error & { code: string };
        err.code = '45010';
        throw err;
      }

      MOCK_STORE[idx] = { ...current, reservation_status: 'Cancelled' };
      void cancelledByUserId; // stored in reservation.updated_by in real DB path
      return;
    }

    // --- REAL DB path ---
    // sp_cancel_reservation does NOT issue its own COMMIT, so we need a transaction.
    //
    // const client = await pool.connect();
    // try {
    //   await client.query('BEGIN');
    //   await client.query(
    //     `CALL sp_cancel_reservation($1::uuid, $2::uuid, $3::uuid)`,
    //     [reservationId, guestId ?? null, cancelledByUserId]
    //   );
    //   await client.query('COMMIT');
    // } catch (err) {
    //   await client.query('ROLLBACK');
    //   throw err;
    // } finally {
    //   client.release();
    // }

    void cancelledByUserId;
    throw new Error(
      'reservationRepository.callCancelReservation: real DB path not active. ' +
      'Set USE_MOCK = false after running SP3.1 migrations.'
    );
  },

  // -------------------------------------------------------------------------
  // Backward-compatible alias for existing callers using findByIdAndGuestId
  // -------------------------------------------------------------------------

  /**
   * @deprecated Use findDetailById(reservationId, guestId) for full detail.
   * Kept for backward compatibility with existing stubs that reference this name.
   */
  findByIdAndGuestId: async (
    reservationId: string,
    guestId: string
  ): Promise<Reservation | null> => {
    if (USE_MOCK) {
      const found = MOCK_STORE.find(
        (r) => r.reservation_id === reservationId && r.guest_id === guestId
      );
      if (!found) return null;
      const { _rooms: _ignored, ...r } = found;
      void _ignored;
      return { ...r };
    }

    // --- REAL DB path ---
    // const result = await pool.query<Reservation>(
    //   `SELECT
    //       reservation_id, guest_id, branch_id,
    //       check_in_date::text, check_out_date::text,
    //       reservation_status, discount_percentage::text,
    //       processed_by_employee_id, created_by_user_id,
    //       booking_source, created_at::text
    //    FROM reservation
    //    WHERE reservation_id = $1 AND guest_id = $2`,
    //   [reservationId, guestId]
    // );
    // return result.rows[0] ?? null;

    throw new Error(
      'reservationRepository.findByIdAndGuestId: real DB path not active. ' +
      'Set USE_MOCK = false after running SP3.1 migrations.'
    );
  },

  // -------------------------------------------------------------------------
  // Test helpers — mock store access (never called from API routes)
  // -------------------------------------------------------------------------

  /** Reset the in-memory store to initial seed state (for unit tests). */
  _resetMockStore: (): void => {
    MOCK_STORE.length = 0;
    MOCK_STORE.push(
      {
        reservation_id: 'res-mock-001',
        guest_id: 'guest-mock-001',
        branch_id: 1,
        check_in_date: '2026-10-01',
        check_out_date: '2026-10-05',
        reservation_status: 'Booked',
        discount_percentage: null,
        processed_by_employee_id: null,
        created_by_user_id: 'user-mock-001',
        booking_source: 'Online',
        created_at: new Date('2026-09-15T08:00:00Z').toISOString(),
        _rooms: [
          { room_id: 1, room_number: '101', type_name: 'Single', rate_per_night: '10000.00' },
        ],
      },
      {
        reservation_id: 'res-mock-002',
        guest_id: 'guest-mock-001',
        branch_id: 2,
        check_in_date: '2026-11-10',
        check_out_date: '2026-11-14',
        reservation_status: 'CheckedIn',
        discount_percentage: '10.00',
        processed_by_employee_id: 3,
        created_by_user_id: 'user-mock-003',
        booking_source: 'Reception',
        created_at: new Date('2026-10-20T10:30:00Z').toISOString(),
        _rooms: [
          { room_id: 7, room_number: '102', type_name: 'Double', rate_per_night: '18000.00' },
          { room_id: 8, room_number: '103', type_name: 'Double', rate_per_night: '18000.00' },
        ],
      },
      {
        reservation_id: 'res-mock-003',
        guest_id: 'guest-mock-002',
        branch_id: 1,
        check_in_date: '2026-10-15',
        check_out_date: '2026-10-18',
        reservation_status: 'Booked',
        discount_percentage: null,
        processed_by_employee_id: null,
        created_by_user_id: 'user-mock-002',
        booking_source: 'Online',
        created_at: new Date('2026-09-18T12:00:00Z').toISOString(),
        _rooms: [
          { room_id: 2, room_number: '102', type_name: 'Double', rate_per_night: '18000.00' },
        ],
      }
    );
    mockCounter = 4;
  },

  /** Expose mock store as read-only snapshot (for unit test assertions). */
  _getMockStore: (): readonly Reservation[] =>
    MOCK_STORE.map(({ _rooms: _ignored, ...r }) => {
      void _ignored;
      return r;
    }),
};
