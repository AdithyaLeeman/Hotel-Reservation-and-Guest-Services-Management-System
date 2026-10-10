create or replace procedure sp_create_reservation(
  in p_guest_id uuid,
  in p_branch_id bigint,
  in p_check_in_date date,
  in p_check_out_date date,
  in p_room_ids bigint[],
  in p_booking_source booking_source,
  in p_created_by_user_id uuid,
  in p_employee_id bigint,
  in p_discount_percentage numeric(5,2),
  inout p_reservation_id uuid
)
language plpgsql
as $$
declare
  v_room_id bigint;
  v_room_branch_id bigint;
  v_room_status room_status;
  v_type_id bigint;
  v_rate_per_night numeric(12,2);
  v_overlap_count int;
  v_room_rates jsonb := '[]'::jsonb;
begin
  p_reservation_id := gen_random_uuid();

  foreach v_room_id in array p_room_ids
  loop
    select r.branch_id, r.status, r.type_id
      into v_room_branch_id, v_room_status, v_type_id
      from room r
     where r.room_id = v_room_id
    for update;

    select rt.daily_rate
      into v_rate_per_night
      from room_type rt
     where rt.type_id = v_type_id;

    if not found then
      raise exception 'Room % does not exist', v_room_id
        using errcode = '22023';
    end if;

    if v_room_branch_id <> p_branch_id then
      raise exception 'Room % belongs to branch % but reservation targets branch %',
        v_room_id, v_room_branch_id, p_branch_id
        using errcode = '45002';
    end if;

    if v_room_status = 'Maintenance' then
      raise exception 'Room % is in Maintenance and cannot be reserved', v_room_id
        using errcode = '45003';
    end if;

    perform 1
      from reservation_rooms rr
      join reservation res on res.reservation_id = rr.reservation_id
     where rr.room_id = v_room_id
       and res.reservation_status not in ('Cancelled', 'CheckedOut')
       and res.check_in_date < p_check_out_date
       and res.check_out_date > p_check_in_date;

    if found then
      raise exception 'Room % is already reserved for the requested dates', v_room_id
        using errcode = '45001';
    end if;

    v_room_rates := v_room_rates || jsonb_build_object(
      'room_id', v_room_id,
      'rate', v_rate_per_night
    );
  end loop;

  insert into reservation (
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
  ) values (
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

  for i in 0 .. jsonb_array_length(v_room_rates) - 1
  loop
    insert into reservation_rooms (reservation_id, room_id, rate_per_night)
    values (
      p_reservation_id,
      (v_room_rates->i->>'room_id')::bigint,
      (v_room_rates->i->>'rate')::numeric(12,2)
    );
  end loop;
end;
$$;

comment on procedure sp_create_reservation is
  'Atomically create a reservation with room allocations. '
  'Enforces branch consistency, maintenance exclusion, and overlap prevention '
  'using SELECT FOR UPDATE for concurrency safety. '
  'SQLSTATE 45001=overlap, 45002=branch mismatch, 45003=maintenance.';
