-- =============================================================================
-- Routine:   sp_create_reservation.sql
-- Owner:     Member 3 (Hiripitiya S.K., 240238C)
-- Phase:     P3 — SP3.2 (Reservation DB)
-- Task:      P03-M03-T03
-- Depends:   SP3.1 executed (reservation + reservation_rooms tables exist)
--            SP2.2 done (fn_get_available_rooms — for availability, but overlap
--            is independently enforced here via SELECT FOR UPDATE)
-- Execute:   After SP3.1 + SP2.2 are DONE on real DB
-- =============================================================================
--
-- PURPOSE:
--   Atomically create a reservation and its room allocations.
--   Enforces:
--     1. All rooms belong to the same branch as the reservation (45002)
--     2. No room is in Maintenance status (45003)
--     3. No active reservation already occupies any room in the date range (45001)
--        — Uses SELECT FOR UPDATE for concurrency safety (L12)
--     4. Snapshots rate_per_night from room_type.daily_rate at booking time
--
-- INPUTS (via INOUT / IN parameters):
--   p_guest_id              UUID    — from session.guestId (never from client body)
--   p_branch_id             BIGINT  — target branch
--   p_check_in_date         DATE    — inclusive start date
--   p_check_out_date        DATE    — exclusive end date (check_out > check_in)
--   p_room_ids              BIGINT[]— one or more room IDs
--   p_booking_source        booking_source — 'Online' | 'Reception' | 'Phone'
--   p_created_by_user_id    UUID    — from session.userId
--   p_employee_id           BIGINT  — NULL for online; staff employee_id for Reception/Phone
--   p_discount_percentage   NUMERIC(5,2) — NULL = no discount
--
-- OUTPUT:
--   p_reservation_id        UUID    — INOUT, filled on success
--
-- SQLSTATE CODES:
--   45001 — Room overlap: a room is already reserved for the date range
--   45002 — Branch mismatch: a room does not belong to p_branch_id
--   45003 — Room in Maintenance: a room cannot be reserved
--
-- TRANSACTION: This procedure does NOT issue COMMIT/ROLLBACK.
--   Single-call pattern: pool.query() (autocommit applies to the CALL statement).
--   Multi-op pattern: wrap in BEGIN/COMMIT via pool.connect().
--   Do NOT call COMMIT inside this procedure — SELECT FOR UPDATE holds the
--   row lock until the caller's transaction commits or rolls back.
--
-- LECTURE ALIGNMENT:
--   L05 — Stored procedures, SQLSTATE
--   L08 — Functions and procedures
--   L12 — Concurrency: SELECT FOR UPDATE, serialization
-- =============================================================================

CREATE OR REPLACE PROCEDURE sp_create_reservation(
    IN  p_guest_id              UUID,
    IN  p_branch_id             BIGINT,
    IN  p_check_in_date         DATE,
    IN  p_check_out_date        DATE,
    IN  p_room_ids              BIGINT[],
    IN  p_booking_source        booking_source,
    IN  p_created_by_user_id    UUID,
    IN  p_employee_id           BIGINT,         -- NULL for online bookings
    IN  p_discount_percentage   NUMERIC(5,2),   -- NULL = no discount
    INOUT p_reservation_id      UUID            -- output: newly created reservation_id
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_room_id           BIGINT;
    v_room_branch_id    BIGINT;
    v_room_status       room_status;
    v_type_id           BIGINT;
    v_rate_per_night    NUMERIC(12,2);
    v_overlap_count     INT;
    -- Accumulates (room_id, rate_per_night) pairs from Step 1 validation.
    -- Used in Step 3 to avoid a second SELECT that could read a different rate
    -- if room_type.daily_rate is concurrently updated (READ COMMITTED isolation).
    v_room_rates        JSONB := '[]'::JSONB;
BEGIN
    -- Generate the new reservation ID upfront so we can return it on success
    p_reservation_id := gen_random_uuid();

    -- ------------------------------------------------------------------
    -- Step 1: Validate each requested room BEFORE inserting anything.
    --         Lock rows in reservation_rooms to prevent concurrent bookings
    --         for the same rooms in the same date window (L12).
    -- ------------------------------------------------------------------
    FOREACH v_room_id IN ARRAY p_room_ids
    LOOP
        -- 1a. Lock the room row for concurrency safety (L12).
        --     FOR UPDATE on a JOIN is not allowed in PostgreSQL when a joined
        --     table (room_type) is referenced — lock only the room row first,
        --     then fetch the rate in a separate plain SELECT.
        SELECT r.branch_id, r.status, r.type_id
          INTO v_room_branch_id, v_room_status, v_type_id
          FROM room r
         WHERE r.room_id = v_room_id
        FOR UPDATE;

        -- Fetch the rate from room_type without a lock (read-only lookup).
        SELECT rt.daily_rate
          INTO v_rate_per_night
          FROM room_type rt
         WHERE rt.type_id = v_type_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Room % does not exist', v_room_id
                USING ERRCODE = '22023'; -- invalid_parameter_value
        END IF;

        -- 1b. Branch mismatch check
        IF v_room_branch_id <> p_branch_id THEN
            RAISE EXCEPTION
                'Room % belongs to branch % but reservation targets branch %',
                v_room_id, v_room_branch_id, p_branch_id
                USING ERRCODE = '45002';
        END IF;

        -- 1c. Maintenance check
        IF v_room_status = 'Maintenance' THEN
            RAISE EXCEPTION
                'Room % is in Maintenance and cannot be reserved', v_room_id
                USING ERRCODE = '45003';
        END IF;

        -- 1d. Overlap check (L12)
        --     Check whether any active reservation occupies this room in the date window.
        PERFORM 1
          FROM reservation_rooms rr
          JOIN reservation res ON res.reservation_id = rr.reservation_id
         WHERE rr.room_id = v_room_id
           AND res.reservation_status NOT IN ('Cancelled', 'CheckedOut')
           AND res.check_in_date  < p_check_out_date   -- existing starts before our end
           AND res.check_out_date > p_check_in_date;   -- existing ends after our start

        IF FOUND THEN
            RAISE EXCEPTION
                'Room % is already reserved for the requested dates', v_room_id
                USING ERRCODE = '45001';
        END IF;

        -- Accumulate the validated rate for use in Step 3 (avoids a second SELECT)
        v_room_rates := v_room_rates || jsonb_build_object(
            'room_id', v_room_id,
            'rate',    v_rate_per_night
        );
    END LOOP;

    -- ------------------------------------------------------------------
    -- Step 2: Insert the reservation header
    -- ------------------------------------------------------------------
    INSERT INTO reservation (
        reservation_id,
        guest_id,
        branch_id,
        check_in_date,
        check_out_date,
        reservation_status,
        discount_percentage,
        processed_by_employee_id,
        created_by_user_id,
        booking_source
    ) VALUES (
        p_reservation_id,
        p_guest_id,
        p_branch_id,
        p_check_in_date,
        p_check_out_date,
        'Booked',
        p_discount_percentage,
        p_employee_id,
        p_created_by_user_id,
        p_booking_source
    );

    -- ------------------------------------------------------------------
    -- Step 3: Insert reservation_rooms rows (with rate snapshot)
    -- Rate values come from v_room_rates accumulated in Step 1.
    -- No second SELECT needed: the rate was already read in the same
    -- transaction and stored, preventing a READ COMMITTED phantom.
    -- ------------------------------------------------------------------
    FOR i IN 0 .. jsonb_array_length(v_room_rates) - 1
    LOOP
        INSERT INTO reservation_rooms (reservation_id, room_id, rate_per_night)
        VALUES (
            p_reservation_id,
            (v_room_rates->i->>'room_id')::BIGINT,
            (v_room_rates->i->>'rate')::NUMERIC(12,2)
        );
    END LOOP;

    -- p_reservation_id is already set — procedure returns via INOUT
END;
$$;

COMMENT ON PROCEDURE sp_create_reservation IS
    'Atomically create a reservation with room allocations. '
    'Enforces branch consistency, maintenance exclusion, and overlap prevention '
    'using SELECT FOR UPDATE for concurrency safety. '
    'SQLSTATE 45001=overlap, 45002=branch mismatch, 45003=maintenance.';
