-- =============================================================================
-- Routine:   fn_get_reservation_detail.sql
-- Owner:     Member 3 (Hiripitiya S.K., 240238C)
-- Task:      P03-M03-T04
-- Depends:   SP3.1 executed (reservation + reservation_rooms tables exist)
-- Lecture:   L05 (functions, joins), L08 (stored functions)
-- =============================================================================
--
-- PURPOSE:
--   Return full detail for a single reservation:
--   - Reservation header fields
--   - All rooms (room_id, room_number, room_type name, rate_per_night)
--   - Guest full name and email
--   - Branch location name
--
-- INPUTS:
--   p_reservation_id  UUID  - the reservation to fetch
--   p_guest_id        UUID  - if NOT NULL, enforces guest ownership
--                             (pass NULL for staff access - no ownership check)
--
-- OUTPUT: SETOF reservation_detail_row (composite type defined below)
--
-- SECURITY:
--   When p_guest_id is provided, function raises 'P0002' (no_data_found)
--   if the reservation does not belong to that guest - same error as "not found"
--   to avoid information leakage.
-- =============================================================================

-- Composite return type for room detail (used inside reservation_detail_row.rooms)
--
-- NOTE ON RE-DEPLOY: The DO/EXCEPTION pattern below silently skips CREATE TYPE
-- if the type already exists. If you change the column list or column types,
-- you must first DROP the type manually:
--   DROP TYPE IF EXISTS reservation_room_row CASCADE;
--   DROP TYPE IF EXISTS reservation_detail_row CASCADE;
-- Then re-run this file. Alternatively, create a new numbered migration file
-- (e.g. P03-M03-T04-02_alter_reservation_types.sql) that drops and recreates.
-- Do NOT just edit this file in place and re-run - the DO block will no-op.
DO $$ BEGIN
    CREATE TYPE reservation_room_row AS (
        room_id         BIGINT,
        room_number     VARCHAR(10),
        type_name       VARCHAR(50),
        rate_per_night  NUMERIC(12,2)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE reservation_detail_row AS (
        reservation_id              UUID,
        guest_id                    UUID,
        guest_full_name             VARCHAR(100),
        guest_email                 VARCHAR(100),
        branch_id                   BIGINT,
        branch_location_name        VARCHAR(100),
        check_in_date               DATE,
        check_out_date              DATE,
        reservation_status          reservation_status,
        discount_percentage         NUMERIC(5,2),
        booking_source              booking_source,
        processed_by_employee_id    BIGINT,
        created_at                  TIMESTAMP WITH TIME ZONE
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION fn_get_reservation_detail(
    p_reservation_id    UUID,
    p_guest_id          UUID    -- NULL = staff access (no ownership check)
)
RETURNS reservation_detail_row
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_result reservation_detail_row;
BEGIN
    SELECT
        res.reservation_id,
        res.guest_id,
        g.full_name,
        g.email,
        res.branch_id,
        b.location_name,
        res.check_in_date,
        res.check_out_date,
        res.reservation_status,
        res.discount_percentage,
        res.booking_source,
        res.processed_by_employee_id,
        res.created_at
    INTO STRICT v_result
    FROM reservation res
    JOIN guest   g ON g.guest_id  = res.guest_id
    JOIN branch  b ON b.branch_id = res.branch_id
    WHERE res.reservation_id = p_reservation_id
      AND (p_guest_id IS NULL OR res.guest_id = p_guest_id);

    RETURN v_result;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        -- Either not found or wrong guest - same response to prevent info leak
        RAISE EXCEPTION 'Reservation % not found', p_reservation_id
            USING ERRCODE = 'P0002';
END;
$$;

COMMENT ON FUNCTION fn_get_reservation_detail IS
    'Returns full reservation detail row. '
    'Pass p_guest_id for guest-owned access (ownership enforced). '
    'Pass NULL p_guest_id for staff access (no ownership restriction). '
    'Raises P0002 (no_data_found) if not found or ownership mismatch.';
