begin;

do $$
declare
  v_test_branch_id bigint;
  v_type_single_id bigint;
  v_type_double_id bigint;
  v_room_avail_id bigint;
  v_room_maint_id bigint;
  v_room_booked_id bigint;
  v_room_cancelled_id bigint;
  v_guest_id uuid;
  v_user_id uuid;
  v_count int;
  v_err_code text;
begin
  raise notice '>>> Starting test suite: test_availability.sql (P02-M02-T17) <<<';

  insert into branch (branch_name, address, city, phone)
  values ('Test Branch', '100 Test St', 'Colombo', '+94112000999')
  returning branch_id into v_test_branch_id;

  insert into room_type (type_name, capacity, daily_rate)
  values ('Test Single', 1, 10000.00)
  returning type_id into v_type_single_id;

  insert into room_type (type_name, capacity, daily_rate)
  values ('Test Double', 2, 18000.00)
  returning type_id into v_type_double_id;

  insert into room (room_number, branch_id, type_id, status)
  values ('T-101', v_test_branch_id, v_type_single_id, 'Available')
  returning room_id into v_room_avail_id;

  insert into room (room_number, branch_id, type_id, status)
  values ('T-102', v_test_branch_id, v_type_single_id, 'Maintenance')
  returning room_id into v_room_maint_id;

  insert into room (room_number, branch_id, type_id, status)
  values ('T-201', v_test_branch_id, v_type_double_id, 'Available')
  returning room_id into v_room_booked_id;

  insert into room (room_number, branch_id, type_id, status)
  values ('T-202', v_test_branch_id, v_type_double_id, 'Available')
  returning room_id into v_room_cancelled_id;

  insert into user_account (email, password_hash, role)
  values ('test_guest_avail@skynest.lk', '$2a$12$eXampleHashOnlyForTestsPlaceholder12345', 'Guest')
  returning user_id into v_user_id;

  insert into guest (user_id, first_name, last_name, phone, id_passport_number)
  values (v_user_id, 'Avail', 'Tester', '+94770000111', 'N99999999V')
  returning guest_id into v_guest_id;

  insert into reservation (guest_id, branch_id, check_in_date, check_out_date, reservation_status, created_by_user_id, booking_source)
  values (v_guest_id, v_test_branch_id, '2026-11-01', '2026-11-05', 'Booked', v_user_id, 'Online')
  returning reservation_id into v_user_id;

  insert into reservation_rooms (reservation_id, room_id, rate_per_night)
  values (v_user_id, v_room_booked_id, 18000.00);

  insert into reservation (guest_id, branch_id, check_in_date, check_out_date, reservation_status, created_by_user_id, booking_source)
  values (v_guest_id, v_test_branch_id, '2026-11-01', '2026-11-05', 'Cancelled', v_user_id, 'Online')
  returning reservation_id into v_user_id;

  insert into reservation_rooms (reservation_id, room_id, rate_per_night)
  values (v_user_id, v_room_cancelled_id, 18000.00);

  select count(*) into v_count
  from fn_get_available_rooms(v_test_branch_id, '2026-11-02'::date, '2026-11-04'::date);

  assert v_count = 2,
    format('Test 1 Failed: Expected 2 available rooms (A and D), found %s', v_count);

  perform 1 from fn_get_available_rooms(v_test_branch_id, '2026-11-02'::date, '2026-11-04'::date)
  where room_id = v_room_maint_id;
  assert not found, 'Test 1b Failed: Maintenance room was returned in available rooms';

  perform 1 from fn_get_available_rooms(v_test_branch_id, '2026-11-02'::date, '2026-11-04'::date)
  where room_id = v_room_booked_id;
  assert not found, 'Test 1c Failed: Overlapping Booked room was returned in available rooms';

  raise notice 'Test 1 PASSED: Overlapping active reservations and maintenance excluded correctly.';

  perform 1 from fn_get_available_rooms(v_test_branch_id, '2026-11-05'::date, '2026-11-08'::date)
  where room_id = v_room_booked_id;
  assert found, 'Test 2 Failed: Room should be available on departure day (check_in = existing check_out)';

  raise notice 'Test 2 PASSED: Departure day boundary availability confirmed.';

  perform 1 from fn_get_available_rooms(v_test_branch_id, '2026-10-28'::date, '2026-11-01'::date)
  where room_id = v_room_booked_id;
  assert found, 'Test 3 Failed: Room should be available before arrival day (check_out = existing check_in)';

  raise notice 'Test 3 PASSED: Arrival day boundary availability confirmed.';

  begin
    perform * from fn_get_available_rooms(v_test_branch_id, '2026-11-05'::date, '2026-11-05'::date);
    raise exception 'Test 4 Failed: Same-day check_out did not raise exception';
  exception
    when sqlstate '22023' then
      raise notice 'Test 4 PASSED: Caught expected invalid_parameter_value (22023) for same-day dates.';
  end;

  begin
    perform * from fn_get_available_rooms(v_test_branch_id, '2026-11-10'::date, '2026-11-05'::date);
    raise exception 'Test 4b Failed: Inverted dates did not raise exception';
  exception
    when sqlstate '22023' then
      raise notice 'Test 4b PASSED: Caught expected invalid_parameter_value (22023) for inverted dates.';
  end;

  raise notice '>>> All availability tests PASSED successfully! <<<';
end;
$$;

rollback;
