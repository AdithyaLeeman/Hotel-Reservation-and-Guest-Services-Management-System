-- =============================================================================
-- Migration: P03-M03-T02-01_create_reservation_rooms.sql
-- Owner:     Member 3 (Hiripitiya S.K., 240238C)
-- Phase:     P3 — Guests and Reservations
-- Depends:   P03-M03-T01 (reservation), P02-M02-T01 (room) — both executed
-- Execute:   After P03-M03-T01 + P02-M02-T01 are DONE on real DB
-- NOTE:      After this migration executes → notify M2 so they can run
--            fn_get_available_rooms (SP2.2-T03) which depends on this table.
-- Lecture:   L05 (junction tables, composite PKs), L10 (indexing)
-- =============================================================================

-- reservation_rooms
-- Junction table linking a reservation to one or more rooms.
-- Captures rate_per_night as a historical snapshot at booking time.
-- The rate is immutable after creation — it is NOT updated if room_type.daily_rate changes.

CREATE TABLE IF NOT EXISTS reservation_rooms (
    reservation_id  UUID            NOT NULL,
    room_id         BIGINT          NOT NULL,
    rate_per_night  NUMERIC(12,2)   NOT NULL CHECK (rate_per_night > 0),

    -- Composite primary key: each room appears at most once per reservation
    CONSTRAINT pk_reservation_rooms PRIMARY KEY (reservation_id, room_id),

    -- Foreign keys
    CONSTRAINT fk_resrooms_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservation(reservation_id) ON DELETE RESTRICT,

    CONSTRAINT fk_resrooms_room
        FOREIGN KEY (room_id) REFERENCES room(room_id) ON DELETE RESTRICT
);

-- Composite index for overlap detection: given a room_id, quickly find reservations
-- that overlap a date range by joining back to reservation.check_in_date/check_out_date.
-- Used by fn_get_available_rooms() and sp_create_reservation().
CREATE INDEX IF NOT EXISTS idx_reservation_rooms_room_id
    ON reservation_rooms(room_id);

-- Covering index for the overlap query pattern:
-- JOIN reservation ON reservation_rooms.reservation_id = reservation.reservation_id
-- WHERE reservation_rooms.room_id = $1
-- AND reservation.check_in_date < $check_out AND reservation.check_out_date > $check_in
-- AND reservation.reservation_status NOT IN ('Cancelled', 'CheckedOut')
-- (Index on reservation side already exists — idx_reservation_dates)

COMMENT ON TABLE reservation_rooms IS
    'Room allocations for a reservation. rate_per_night is a historical snapshot '
    'captured at booking time — immutable after creation. '
    'All rooms must belong to reservation.branch_id (enforced by sp_create_reservation).';

COMMENT ON COLUMN reservation_rooms.rate_per_night IS
    'Snapshot of room_type.daily_rate at the time of booking. '
    'Used by fn_calc_room_charges() for authoritative billing. '
    'Never updated even if the room type rate changes.';
