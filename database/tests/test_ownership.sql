-- =============================================================================
-- Test:      test_ownership.sql
-- Owner:     Member 3 (Hiripitiya S.K., 240238C)
-- Task:      P03-M03-T23
-- Depends:   SP3.1 + SP3.2 executed (all reservation tables and procedures)
-- Execute:   After SP3.1/SP3.2 DONE on real DB with seed data loaded
-- Lecture:   L07 (application security, RBAC)
-- =============================================================================
--
-- TESTS:
--   1. Guest A can fetch their own reservation via fn_get_reservation_detail
--   2. Guest A CANNOT fetch Guest B's reservation (ownership mismatch → P0002)
--   3. Staff (p_guest_id = NULL) CAN fetch any reservation
--   4. sp_cancel_reservation enforces ownership: Guest A cannot cancel Guest B's
--   5. sp_cancel_reservation with NULL guest_id (staff) can cancel any 'Booked'
--
-- USAGE: Run this script against the real DB after seeding Phase 3 test data.
--        All DO blocks will RAISE NOTICE on pass, RAISE EXCEPTION on fail.
-- =============================================================================

-- ============================================================
-- TEST 1: Guest can retrieve their own reservation
-- ============================================================
DO $$
DECLARE
    v_reservation   reservation_detail_row;
    v_guest_a_id    UUID;
    v_res_a_id      UUID;
BEGIN
    -- Get guest A and one of their reservations from seed data
    SELECT g.guest_id INTO v_guest_a_id FROM guest g LIMIT 1;
    SELECT r.reservation_id INTO v_res_a_id
      FROM reservation r WHERE r.guest_id = v_guest_a_id AND r.reservation_status = 'Booked' LIMIT 1;

    IF v_res_a_id IS NULL THEN
        RAISE NOTICE 'TEST 1 SKIPPED: No booked reservation found for guest A - seed data needed';
        RETURN;
    END IF;

    v_reservation := fn_get_reservation_detail(v_res_a_id, v_guest_a_id);
    ASSERT v_reservation.reservation_id = v_res_a_id, 'TEST 1 FAILED: reservation_id mismatch';
    RAISE NOTICE 'TEST 1 PASSED: Guest A can retrieve their own reservation';
END $$;

-- ============================================================
-- TEST 2: Guest A CANNOT retrieve Guest B's reservation
-- ============================================================
DO $$
DECLARE
    v_guest_a_id    UUID;
    v_guest_b_id    UUID;
    v_res_b_id      UUID;
    v_detail        reservation_detail_row;
BEGIN
    SELECT g.guest_id INTO v_guest_a_id FROM guest g ORDER BY guest_id LIMIT 1;
    SELECT g.guest_id INTO v_guest_b_id FROM guest g ORDER BY guest_id OFFSET 1 LIMIT 1;

    IF v_guest_b_id IS NULL THEN
        RAISE NOTICE 'TEST 2 SKIPPED: Need at least 2 guests in seed data';
        RETURN;
    END IF;

    SELECT r.reservation_id INTO v_res_b_id
      FROM reservation r WHERE r.guest_id = v_guest_b_id LIMIT 1;

    IF v_res_b_id IS NULL THEN
        RAISE NOTICE 'TEST 2 SKIPPED: Guest B has no reservations - seed data needed';
        RETURN;
    END IF;

    BEGIN
        -- This should raise P0002
        v_detail := fn_get_reservation_detail(v_res_b_id, v_guest_a_id);
        RAISE EXCEPTION 'TEST 2 FAILED: Guest A was able to fetch Guest B''s reservation';
    EXCEPTION
        WHEN SQLSTATE 'P0002' THEN
            RAISE NOTICE 'TEST 2 PASSED: Guest A correctly denied access to Guest B''s reservation (P0002)';
    END;
END $$;

-- ============================================================
-- TEST 3: Staff (NULL guest_id) can retrieve any reservation
-- ============================================================
DO $$
DECLARE
    v_res_id    UUID;
    v_detail    reservation_detail_row;
BEGIN
    SELECT reservation_id INTO v_res_id FROM reservation LIMIT 1;

    IF v_res_id IS NULL THEN
        RAISE NOTICE 'TEST 3 SKIPPED: No reservations in DB';
        RETURN;
    END IF;

    v_detail := fn_get_reservation_detail(v_res_id, NULL); -- NULL = staff
    ASSERT v_detail.reservation_id = v_res_id, 'TEST 3 FAILED: reservation_id mismatch';
    RAISE NOTICE 'TEST 3 PASSED: Staff can retrieve any reservation without ownership check';
END $$;

-- ============================================================
-- TEST 4: Guest A cannot cancel Guest B's reservation
-- ============================================================
DO $$
DECLARE
    v_guest_a_id    UUID;
    v_guest_b_id    UUID;
    v_res_b_id      UUID;
BEGIN
    SELECT g.guest_id INTO v_guest_a_id FROM guest g ORDER BY guest_id LIMIT 1;
    SELECT g.guest_id INTO v_guest_b_id FROM guest g ORDER BY guest_id OFFSET 1 LIMIT 1;

    IF v_guest_b_id IS NULL THEN
        RAISE NOTICE 'TEST 4 SKIPPED: Need at least 2 guests';
        RETURN;
    END IF;

    SELECT r.reservation_id INTO v_res_b_id
      FROM reservation r
     WHERE r.guest_id = v_guest_b_id AND r.reservation_status = 'Booked' LIMIT 1;

    IF v_res_b_id IS NULL THEN
        RAISE NOTICE 'TEST 4 SKIPPED: Guest B has no Booked reservations';
        RETURN;
    END IF;

    BEGIN
        CALL sp_cancel_reservation(v_res_b_id, v_guest_a_id, v_guest_a_id);
        RAISE EXCEPTION 'TEST 4 FAILED: Guest A was able to cancel Guest B''s reservation';
    EXCEPTION
        WHEN SQLSTATE 'P0002' THEN
            RAISE NOTICE 'TEST 4 PASSED: Guest A correctly denied cancellation of Guest B''s reservation';
    END;

    ROLLBACK; -- ensure no state change from this test
END $$;

-- ============================================================
-- TEST 5: Staff can cancel any Booked reservation
-- ============================================================
DO $$
DECLARE
    v_res_id        UUID;
    v_staff_uid     UUID;
    v_status_after  reservation_status;
BEGIN
    SELECT reservation_id INTO v_res_id
      FROM reservation WHERE reservation_status = 'Booked' LIMIT 1;

    SELECT user_id INTO v_staff_uid FROM user_account WHERE role = 'Receptionist' LIMIT 1;

    IF v_res_id IS NULL OR v_staff_uid IS NULL THEN
        RAISE NOTICE 'TEST 5 SKIPPED: Need a Booked reservation and a staff user';
        RETURN;
    END IF;

    -- Staff cancels (NULL guest_id = no ownership restriction)
    CALL sp_cancel_reservation(v_res_id, NULL, v_staff_uid);

    SELECT reservation_status INTO v_status_after FROM reservation WHERE reservation_id = v_res_id;
    ASSERT v_status_after = 'Cancelled', 'TEST 5 FAILED: Status not Cancelled after staff cancel';
    RAISE NOTICE 'TEST 5 PASSED: Staff successfully cancelled reservation';

    ROLLBACK; -- restore state for other tests
END $$;

RAISE NOTICE '=== test_ownership.sql complete ===';
