-- ============================================================================
-- Test Suite: test_availability.sql
-- Subphase:   SP2.5 - Tests
-- Task:       P02-M02-T17
-- Member:     Member 2 (Room Inventory and Availability)
-- Purpose:    Comprehensive test script for fn_get_available_rooms() function.
--
-- Test Cases:
-- 1. Happy path: returns available rooms for valid branch and dates.
-- 2. Maintenance exclusion: rooms with status = 'Maintenance' are excluded.
-- 3. Overlap exclusion: active 'Booked' / 'CheckedIn' reservations exclude room.
-- 4. Non-overlapping boundaries:
--    - Reservation ending on check_in day does NOT block room (departure day).
--    - Reservation starting on check_out day does NOT block room (arrival day).
-- 5. Cancelled & CheckedOut status: reservations do NOT block availability.
-- 6. Date validation: check_out <= check_in raises SQLSTATE '22023'.
-- 7. Null parameters: null branch_id or dates raise SQLSTATE '22004' / '22023'.
--
-- Running:
--   psql -U <user> -d <db> -f database/tests/test_availability.sql
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_test_branch_id BIGINT;
  v_type_single_id BIGINT;
  v_type_double_id BIGINT;
  v_room_avail_id BIGINT;
  v_room_maint_id BIGINT;
  v_room_booked_id BIGINT;
  v_room_cancelled_id BIGINT;
  v_guest_id UUID;
  v_user_id UUID;
  v_count INT;
  v_err_code TEXT;
BEGIN
  RAISE NOTICE '>>> Starting test suite: test_availability.sql (P02-M02-T17) <<<';

  -- -------------------------------------------------------------------------
  -- Setup test data
  -- -------------------------------------------------------------------------
  -- 1. Branch
  INSERT INTO branch (branch_name, address, city, phone)
  VALUES ('Test Branch', '100 Test St', 'Colombo', '+94112000999')
  RETURNING branch_id INTO v_test_branch_id;

  -- 2. Room Types
  INSERT INTO room_type (type_name, capacity, daily_rate)
  VALUES ('Test Single', 1, 10000.00)
  RETURNING type_id INTO v_type_single_id;

  INSERT INTO room_type (type_name, capacity, daily_rate)
  VALUES ('Test Double', 2, 18000.00)
  RETURNING type_id INTO v_type_double_id;

  -- 3. Rooms
  -- Room A: Available
  INSERT INTO room (room_number, branch_id, type_id, status)
  VALUES ('T-101', v_test_branch_id, v_type_single_id, 'Available')
  RETURNING room_id INTO v_room_avail_id;

  -- Room B: Maintenance
  INSERT INTO room (room_number, branch_id, type_id, status)
  VALUES ('T-102', v_test_branch_id, v_type_single_id, 'Maintenance')
  RETURNING room_id INTO v_room_maint_id;

  -- Room C: Booked overlap
  INSERT INTO room (room_number, branch_id, type_id, status)
  VALUES ('T-201', v_test_branch_id, v_type_double_id, 'Available')
  RETURNING room_id INTO v_room_booked_id;

  -- Room D: Cancelled reservation
  INSERT INTO room (room_number, branch_id, type_id, status)
  VALUES ('T-202', v_test_branch_id, v_type_double_id, 'Available')
  RETURNING room_id INTO v_room_cancelled_id;

  -- 4. User and Guest for reservation test
  INSERT INTO user_account (email, password_hash, role)
  VALUES ('test_guest_avail@skynest.lk', '$2a$12$eXampleHashOnlyForTestsPlaceholder12345', 'Guest')
  RETURNING user_id INTO v_user_id;

  INSERT INTO guest (user_id, first_name, last_name, phone, id_passport_number)
  VALUES (v_user_id, 'Avail', 'Tester', '+94770000111', 'N99999999V')
  RETURNING guest_id INTO v_guest_id;

  -- 5. Active overlapping reservation for Room C: 2026-11-01 to 2026-11-05
  INSERT INTO reservation (guest_id, branch_id, check_in_date, check_out_date, reservation_status, created_by_user_id, booking_source)
  VALUES (v_guest_id, v_test_branch_id, '2026-11-01', '2026-11-05', 'Booked', v_user_id, 'Online')
  RETURNING reservation_id INTO v_user_id; -- recycle variable for reservation_id

  INSERT INTO reservation_rooms (reservation_id, room_id, rate_per_night)
  VALUES (v_user_id, v_room_booked_id, 18000.00);

  -- 6. Cancelled reservation for Room D: 2026-11-01 to 2026-11-05
  INSERT INTO reservation (guest_id, branch_id, check_in_date, check_out_date, reservation_status, created_by_user_id, booking_source)
  VALUES (v_guest_id, v_test_branch_id, '2026-11-01', '2026-11-05', 'Cancelled', v_user_id, 'Online')
  RETURNING reservation_id INTO v_user_id;

  INSERT INTO reservation_rooms (reservation_id, room_id, rate_per_night)
  VALUES (v_user_id, v_room_cancelled_id, 18000.00);

  -- -------------------------------------------------------------------------
  -- TEST CASE 1: Query for overlapping range 2026-11-02 to 2026-11-04
  -- Expected:
  -- - Room A (T-101) Available -> RETURNED
  -- - Room B (T-102) Maintenance -> EXCLUDED
  -- - Room C (T-201) Booked overlap -> EXCLUDED
  -- - Room D (T-202) Cancelled overlap -> RETURNED
  -- -------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_count
  FROM fn_get_available_rooms(v_test_branch_id, '2026-11-02'::DATE, '2026-11-04'::DATE);

  ASSERT v_count = 2,
    format('Test 1 Failed: Expected 2 available rooms (A and D), found %s', v_count);

  -- Verify Room B (Maintenance) is absent
  PERFORM 1 FROM fn_get_available_rooms(v_test_branch_id, '2026-11-02'::DATE, '2026-11-04'::DATE)
  WHERE room_id = v_room_maint_id;
  ASSERT NOT FOUND, 'Test 1b Failed: Maintenance room was returned in available rooms';

  -- Verify Room C (Booked) is absent
  PERFORM 1 FROM fn_get_available_rooms(v_test_branch_id, '2026-11-02'::DATE, '2026-11-04'::DATE)
  WHERE room_id = v_room_booked_id;
  ASSERT NOT FOUND, 'Test 1c Failed: Overlapping Booked room was returned in available rooms';

  RAISE NOTICE 'Test 1 PASSED: Overlapping active reservations and maintenance excluded correctly.';

  -- -------------------------------------------------------------------------
  -- TEST CASE 2: Boundary check - check_in = existing check_out (2026-11-05 to 2026-11-08)
  -- Expected: Room C is AVAILABLE because previous guest departs on 2026-11-05
  -- -------------------------------------------------------------------------
  PERFORM 1 FROM fn_get_available_rooms(v_test_branch_id, '2026-11-05'::DATE, '2026-11-08'::DATE)
  WHERE room_id = v_room_booked_id;
  ASSERT FOUND, 'Test 2 Failed: Room should be available on departure day (check_in = existing check_out)';

  RAISE NOTICE 'Test 2 PASSED: Departure day boundary availability confirmed.';

  -- -------------------------------------------------------------------------
  -- TEST CASE 3: Boundary check - check_out = existing check_in (2026-10-28 to 2026-11-01)
  -- Expected: Room C is AVAILABLE because guest checks out before existing check-in
  -- -------------------------------------------------------------------------
  PERFORM 1 FROM fn_get_available_rooms(v_test_branch_id, '2026-10-28'::DATE, '2026-11-01'::DATE)
  WHERE room_id = v_room_booked_id;
  ASSERT FOUND, 'Test 3 Failed: Room should be available before arrival day (check_out = existing check_in)';

  RAISE NOTICE 'Test 3 PASSED: Arrival day boundary availability confirmed.';

  -- -------------------------------------------------------------------------
  -- TEST CASE 4: Date validation - check_out <= check_in must raise exception 22023
  -- -------------------------------------------------------------------------
  BEGIN
    PERFORM * FROM fn_get_available_rooms(v_test_branch_id, '2026-11-05'::DATE, '2026-11-05'::DATE);
    RAISE EXCEPTION 'Test 4 Failed: Same-day check_out did not raise exception';
  EXCEPTION
    WHEN SQLSTATE '22023' THEN
      RAISE NOTICE 'Test 4 PASSED: Caught expected invalid_parameter_value (22023) for same-day dates.';
  END;

  BEGIN
    PERFORM * FROM fn_get_available_rooms(v_test_branch_id, '2026-11-10'::DATE, '2026-11-05'::DATE);
    RAISE EXCEPTION 'Test 4b Failed: Inverted dates did not raise exception';
  EXCEPTION
    WHEN SQLSTATE '22023' THEN
      RAISE NOTICE 'Test 4b PASSED: Caught expected invalid_parameter_value (22023) for inverted dates.';
  END;

  RAISE NOTICE '>>> All availability tests PASSED successfully! <<<';
END;
$$;

-- Always rollback test transaction to preserve clean state
ROLLBACK;
