do $$
declare
  v_reservation reservation_detail_row;
  v_guest_a_id uuid;
  v_res_a_id uuid;
begin
  select g.guest_id into v_guest_a_id from guest g limit 1;
  select r.reservation_id into v_res_a_id
  from reservation r where r.guest_id = v_guest_a_id and r.reservation_status = 'Booked' limit 1;

  if v_res_a_id is null then
    raise notice 'TEST 1 SKIPPED: No booked reservation found for guest A - seed data needed';
    return;
  end if;

  v_reservation := fn_get_reservation_detail(v_res_a_id, v_guest_a_id);
  assert v_reservation.reservation_id = v_res_a_id, 'TEST 1 FAILED: reservation_id mismatch';
  raise notice 'TEST 1 PASSED: Guest A can retrieve their own reservation';
end $$;

do $$
declare
  v_guest_a_id uuid;
  v_guest_b_id uuid;
  v_res_b_id uuid;
  v_detail reservation_detail_row;
begin
  select g.guest_id into v_guest_a_id from guest g order by guest_id limit 1;
  select g.guest_id into v_guest_b_id from guest g order by guest_id offset 1 limit 1;

  if v_guest_b_id is null then
    raise notice 'TEST 2 SKIPPED: Need at least 2 guests in seed data';
    return;
  end if;

  select r.reservation_id into v_res_b_id
  from reservation r where r.guest_id = v_guest_b_id limit 1;

  if v_res_b_id is null then
    raise notice 'TEST 2 SKIPPED: Guest B has no reservations - seed data needed';
    return;
  end if;

  begin
    v_detail := fn_get_reservation_detail(v_res_b_id, v_guest_a_id);
    raise exception 'TEST 2 FAILED: Guest A was able to fetch Guest B''s reservation';
  exception
    when sqlstate 'P0002' then
      raise notice 'TEST 2 PASSED: Guest A correctly denied access to Guest B''s reservation (P0002)';
  end;
end $$;

do $$
declare
  v_res_id uuid;
  v_detail reservation_detail_row;
begin
  select reservation_id into v_res_id from reservation limit 1;

  if v_res_id is null then
    raise notice 'TEST 3 SKIPPED: No reservations in DB';
    return;
  end if;

  v_detail := fn_get_reservation_detail(v_res_id, null);
  assert v_detail.reservation_id = v_res_id, 'TEST 3 FAILED: reservation_id mismatch';
  raise notice 'TEST 3 PASSED: Staff can retrieve any reservation without ownership check';
end $$;

do $$
declare
  v_guest_a_id uuid;
  v_guest_b_id uuid;
  v_res_b_id uuid;
begin
  select g.guest_id into v_guest_a_id from guest g order by guest_id limit 1;
  select g.guest_id into v_guest_b_id from guest g order by guest_id offset 1 limit 1;

  if v_guest_b_id is null then
    raise notice 'TEST 4 SKIPPED: Need at least 2 guests';
    return;
  end if;

  select r.reservation_id into v_res_b_id
  from reservation r
  where r.guest_id = v_guest_b_id and r.reservation_status = 'Booked' limit 1;

  if v_res_b_id is null then
    raise notice 'TEST 4 SKIPPED: Guest B has no Booked reservations';
    return;
  end if;

  begin
    call sp_cancel_reservation(v_res_b_id, v_guest_a_id, v_guest_a_id);
    raise exception 'TEST 4 FAILED: Guest A was able to cancel Guest B''s reservation';
  exception
    when sqlstate 'P0002' then
      raise notice 'TEST 4 PASSED: Guest A correctly denied cancellation of Guest B''s reservation';
  end;

  rollback;
end $$;

do $$
declare
  v_res_id uuid;
  v_staff_uid uuid;
  v_status_after reservation_status;
begin
  select reservation_id into v_res_id
  from reservation where reservation_status = 'Booked' limit 1;

  select user_id into v_staff_uid from user_account where role = 'Receptionist' limit 1;

  if v_res_id is null or v_staff_uid is null then
    raise notice 'TEST 5 SKIPPED: Need a Booked reservation and a staff user';
    return;
  end if;

  call sp_cancel_reservation(v_res_id, null, v_staff_uid);

  select reservation_status into v_status_after from reservation where reservation_id = v_res_id;
  assert v_status_after = 'Cancelled', 'TEST 5 FAILED: Status not Cancelled after staff cancel';
  raise notice 'TEST 5 PASSED: Staff successfully cancelled reservation';

  rollback;
end $$;

do $$ begin raise notice '=== test_ownership.sql complete ==='; end $$;
