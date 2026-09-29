-- =============================================================================
-- Test:      test_concurrency.sql
-- Owner:     Member 3 (Hiripitiya S.K., 240238C)
-- Task:      P03-M03-T24
-- Depends:   SP3.1 + SP3.2 executed with seed data
-- Execute:   After all Phase 3 DB routines are deployed
-- Lecture:   L12 (concurrency control, SELECT FOR UPDATE, serialization)
-- =============================================================================
--
-- TESTS:
--   1. Sequential double-booking prevention:
--      Two sequential calls to sp_create_reservation for the same room and dates.
--      First succeeds; second must raise SQLSTATE 45001.
--
--   2. Already-cancelled reservation is excluded from overlap check:
--      A room from a cancelled reservation should be bookable again.
--
--   3. Adjacent date ranges are allowed (back-to-back bookings):
--      check_out = Day 5 and check_in = Day 5 should NOT conflict.
--
-- NOTE: True concurrent test (two simultaneous sessions) requires a test harness
--       (pgbench or application-level test). This script tests the sequential
--       overlap logic that SELECT FOR UPDATE protects in the concurrent case.
-- =============================================================================

-- ============================================================
-- SETUP: use a known room and date range from seed data
-- ============================================================
DO $$
DECLARE
    v_room_id           BIGINT;
    v_branch_id         BIGINT;
    v_guest_a_id        UUID;
    v_guest_b_id        UUID;
    v_user_a_id         UUID;
    v_user_b_id         UUID;
    v_res_a_id          UUID := gen_random_uuid();
    v_res_b_id          UUID := gen_random_uuid();
BEGIN
    -- Fetch test data
    SELECT r.room_id, r.branch_id INTO v_room_id, v_branch_id
      FROM room r WHERE r.status = 'Available' LIMIT 1;

    SELECT g.guest_id, ua.user_id INTO v_guest_a_id, v_user_a_id
      FROM guest g JOIN user_account ua ON ua.user_id = g.user_id LIMIT 1;

    SELECT g.guest_id, ua.user_id INTO v_guest_b_id, v_user_b_id
      FROM guest g JOIN user_account ua ON ua.user_id = g.user_id OFFSET 1 LIMIT 1;

    IF v_room_id IS NULL OR v_guest_a_id IS NULL OR v_guest_b_id IS NULL THEN
        RAISE NOTICE 'CONCURRENCY TEST SKIPPED: Insufficient seed data (need room + 2 guests)';
        RETURN;
    END IF;

    -- --------------------------------------------------------
    -- TEST C1: First booking succeeds
    -- --------------------------------------------------------
    BEGIN
        CALL sp_create_reservation(
            p_guest_id            => v_guest_a_id,
            p_branch_id           => v_branch_id,
            p_check_in_date       => '2026-12-01',
            p_check_out_date      => '2026-12-05',
            p_room_ids            => ARRAY[v_room_id],
            p_booking_source      => 'Online',
            p_created_by_user_id  => v_user_a_id,
            p_employee_id         => NULL,
            p_discount_percentage => NULL,
            p_reservation_id      => v_res_a_id
        );
        RAISE NOTICE 'TEST C1 PASSED: First booking for room % (Dec 1-5) created: %', v_room_id, v_res_a_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'TEST C1 FAILED: First booking should have succeeded. SQLSTATE=%, MSG=%',
                SQLSTATE, SQLERRM;
    END;

    -- --------------------------------------------------------
    -- TEST C2: Overlapping booking fails with SQLSTATE 45001
    -- --------------------------------------------------------
    BEGIN
        CALL sp_create_reservation(
            p_guest_id            => v_guest_b_id,
            p_branch_id           => v_branch_id,
            p_check_in_date       => '2026-12-03',   -- overlaps Dec 1-5
            p_check_out_date      => '2026-12-07',
            p_room_ids            => ARRAY[v_room_id],
            p_booking_source      => 'Online',
            p_created_by_user_id  => v_user_b_id,
            p_employee_id         => NULL,
            p_discount_percentage => NULL,
            p_reservation_id      => v_res_b_id
        );
        RAISE EXCEPTION 'TEST C2 FAILED: Overlapping booking should have raised 45001';
    EXCEPTION
        WHEN SQLSTATE '45001' THEN
            RAISE NOTICE 'TEST C2 PASSED: Overlapping booking correctly rejected with SQLSTATE 45001';
        WHEN OTHERS THEN
            RAISE EXCEPTION 'TEST C2 FAILED: Expected 45001 but got SQLSTATE=%, MSG=%',
                SQLSTATE, SQLERRM;
    END;

    -- --------------------------------------------------------
    -- TEST C3: Adjacent (back-to-back) booking succeeds
    --          Dec 5-9 should NOT conflict with Dec 1-5
    -- --------------------------------------------------------
    BEGIN
        v_res_b_id := gen_random_uuid();
        CALL sp_create_reservation(
            p_guest_id            => v_guest_b_id,
            p_branch_id           => v_branch_id,
            p_check_in_date       => '2026-12-05',   -- starts exactly when first ends
            p_check_out_date      => '2026-12-09',
            p_room_ids            => ARRAY[v_room_id],
            p_booking_source      => 'Online',
            p_created_by_user_id  => v_user_b_id,
            p_employee_id         => NULL,
            p_discount_percentage => NULL,
            p_reservation_id      => v_res_b_id
        );
        RAISE NOTICE 'TEST C3 PASSED: Adjacent booking (Dec 5-9) correctly allowed: %', v_res_b_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'TEST C3 FAILED: Adjacent booking should be allowed. SQLSTATE=%, MSG=%',
                SQLSTATE, SQLERRM;
    END;

    -- --------------------------------------------------------
    -- TEST C4: Cancelled reservation frees the room
    -- --------------------------------------------------------
    -- Cancel the first booking
    CALL sp_cancel_reservation(v_res_a_id, NULL, v_user_a_id);
    RAISE NOTICE 'TEST C4 SETUP: Cancelled reservation %', v_res_a_id;

    -- Now the Dec 1-5 dates should be bookable again
    BEGIN
        v_res_a_id := gen_random_uuid();
        CALL sp_create_reservation(
            p_guest_id            => v_guest_b_id,
            p_branch_id           => v_branch_id,
            p_check_in_date       => '2026-12-01',
            p_check_out_date      => '2026-12-05',
            p_room_ids            => ARRAY[v_room_id],
            p_booking_source      => 'Online',
            p_created_by_user_id  => v_user_b_id,
            p_employee_id         => NULL,
            p_discount_percentage => NULL,
            p_reservation_id      => v_res_a_id
        );
        RAISE NOTICE 'TEST C4 PASSED: Room re-bookable after first reservation cancelled: %', v_res_a_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'TEST C4 FAILED: Should be bookable after cancel. SQLSTATE=%, MSG=%',
                SQLSTATE, SQLERRM;
    END;

    -- Rollback all test state
    ROLLBACK;
    RAISE NOTICE '=== test_concurrency.sql complete — all test state rolled back ===';
END $$;
