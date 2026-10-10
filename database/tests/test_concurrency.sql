do $$
declare
  v_room_id bigint;
  v_branch_id bigint;
  v_guest_a_id uuid;
  v_guest_b_id uuid;
  v_user_a_id uuid;
  v_user_b_id uuid;
  v_res_a_id uuid := gen_random_uuid();
  v_res_b_id uuid := gen_random_uuid();
begin
  select r.room_id, r.branch_id into v_room_id, v_branch_id
  from room r where r.status = 'Available' limit 1;

  select g.guest_id, ua.user_id into v_guest_a_id, v_user_a_id
  from guest g join user_account ua on ua.user_id = g.user_id limit 1;

  select g.guest_id, ua.user_id into v_guest_b_id, v_user_b_id
  from guest g join user_account ua on ua.user_id = g.user_id offset 1 limit 1;

  if v_room_id is null or v_guest_a_id is null or v_guest_b_id is null then
    raise notice 'CONCURRENCY TEST SKIPPED: Insufficient seed data (need room + 2 guests)';
    return;
  end if;

  begin
    call sp_create_reservation(
      p_guest_id => v_guest_a_id,
      p_branch_id => v_branch_id,
      p_check_in_date => '2026-12-01',
      p_check_out_date => '2026-12-05',
      p_room_ids => array[v_room_id],
      p_booking_source => 'Online',
      p_created_by_user_id => v_user_a_id,
      p_employee_id => null,
      p_discount_percentage => null,
      p_reservation_id => v_res_a_id
    );
    raise notice 'TEST C1 PASSED: First booking for room % (Dec 1-5) created: %', v_room_id, v_res_a_id;
  exception
    when others then
      raise exception 'TEST C1 FAILED: First booking should have succeeded. SQLSTATE=%, MSG=%',
        sqlstate, sqlerrm;
  end;

  begin
    call sp_create_reservation(
      p_guest_id => v_guest_b_id,
      p_branch_id => v_branch_id,
      p_check_in_date => '2026-12-03',
      p_check_out_date => '2026-12-07',
      p_room_ids => array[v_room_id],
      p_booking_source => 'Online',
      p_created_by_user_id => v_user_b_id,
      p_employee_id => null,
      p_discount_percentage => null,
      p_reservation_id => v_res_b_id
    );
    raise exception 'TEST C2 FAILED: Overlapping booking should have raised 45001';
  exception
    when sqlstate '45001' then
      raise notice 'TEST C2 PASSED: Overlapping booking correctly rejected with SQLSTATE 45001';
    when others then
      raise exception 'TEST C2 FAILED: Expected 45001 but got SQLSTATE=%, MSG=%',
        sqlstate, sqlerrm;
  end;

  begin
    v_res_b_id := gen_random_uuid();
    call sp_create_reservation(
      p_guest_id => v_guest_b_id,
      p_branch_id => v_branch_id,
      p_check_in_date => '2026-12-05',
      p_check_out_date => '2026-12-09',
      p_room_ids => array[v_room_id],
      p_booking_source => 'Online',
      p_created_by_user_id => v_user_b_id,
      p_employee_id => null,
      p_discount_percentage => null,
      p_reservation_id => v_res_b_id
    );
    raise notice 'TEST C3 PASSED: Adjacent booking (Dec 5-9) correctly allowed: %', v_res_b_id;
  exception
    when others then
      raise exception 'TEST C3 FAILED: Adjacent booking should be allowed. SQLSTATE=%, MSG=%',
        sqlstate, sqlerrm;
  end;

  call sp_cancel_reservation(v_res_a_id, null, v_user_a_id);
  raise notice 'TEST C4 SETUP: Cancelled reservation %', v_res_a_id;

  begin
    v_res_a_id := gen_random_uuid();
    call sp_create_reservation(
      p_guest_id => v_guest_b_id,
      p_branch_id => v_branch_id,
      p_check_in_date => '2026-12-01',
      p_check_out_date => '2026-12-05',
      p_room_ids => array[v_room_id],
      p_booking_source => 'Online',
      p_created_by_user_id => v_user_b_id,
      p_employee_id => null,
      p_discount_percentage => null,
      p_reservation_id => v_res_a_id
    );
    raise notice 'TEST C4 PASSED: Room re-bookable after first reservation cancelled: %', v_res_a_id;
  exception
    when others then
      raise exception 'TEST C4 FAILED: Should be bookable after cancel. SQLSTATE=%, MSG=%',
        sqlstate, sqlerrm;
  end;

  rollback;
  raise notice '=== test_concurrency.sql complete - all test state rolled back ===';
end $$;
