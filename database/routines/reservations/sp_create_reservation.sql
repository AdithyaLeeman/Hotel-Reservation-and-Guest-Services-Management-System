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
-- TRANSACTION: This procedure owns its transaction.
--   Caller must NOT wrap in an outer BEGIN/COMMIT.
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
    v_rate_per_night    NUMERIC(12,2);
    v_overlap_count     INT;
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
        -- 1a. Fetch room details; error if room does not exist
        SELECT r.branch_id, r.status, rt.daily_rate
          INTO v_room_branch_id, v_room_status, v_rate_per_night
          FROM room r
          JOIN room_type rt ON rt.type_id = r.type_id
         WHERE r.room_id = v_room_id;

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

        -- 1d. Overlap check with SELECT FOR UPDATE (concurrency lock — L12)
        --     Lock any existing reservation_rooms rows for this room that
        --     could overlap our date window, preventing a concurrent transaction
        --     from inserting a conflicting reservation simultaneously.
        SELECT COUNT(*)
          INTO v_overlap_count
          FROM reservation_rooms rr
          JOIN reservation res ON res.reservation_id = rr.reservation_id
         WHERE rr.room_id = v_room_id
           AND res.reservation_status NOT IN ('Cancelled', 'CheckedOut')
           AND res.check_in_date  < p_check_out_date   -- existing starts before our end
           AND res.check_out_date > p_check_in_date     -- existing ends after our start
        FOR UPDATE OF rr;                               -- lock the conflicting rows

        IF v_overlap_count > 0 THEN
            RAISE EXCEPTION
                'Room % is already reserved for the requested dates', v_room_id
                USING ERRCODE = '45001';
        END IF;
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
    -- ------------------------------------------------------------------
    FOREACH v_room_id IN ARRAY p_room_ids
    LOOP
        -- Re-fetch rate_per_night (already fetched above, but loop var is local)
        SELECT rt.daily_rate
          INTO v_rate_per_night
          FROM room r
          JOIN room_type rt ON rt.type_id = r.type_id
         WHERE r.room_id = v_room_id;

        INSERT INTO reservation_rooms (reservation_id, room_id, rate_per_night)
        VALUES (p_reservation_id, v_room_id, v_rate_per_night);
    END LOOP;

    -- p_reservation_id is already set — procedure returns via INOUT
END;
$$;

COMMENT ON PROCEDURE sp_create_reservation IS
    'Atomically create a reservation with room allocations. '
    'Enforces branch consistency, maintenance exclusion, and overlap prevention '
    'using SELECT FOR UPDATE for concurrency safety. '
    'SQLSTATE 45001=overlap, 45002=branch mismatch, 45003=maintenance.';
