do $$ begin
  create type reservation_room_row as (
    room_id bigint,
    room_number varchar(10),
    type_name varchar(50),
    rate_per_night numeric(12,2)
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type reservation_detail_row as (
    reservation_id uuid,
    guest_id uuid,
    guest_full_name varchar(100),
    guest_email varchar(100),
    branch_id bigint,
    branch_location_name varchar(100),
    check_in_date date,
    check_out_date date,
    reservation_status reservation_status,
    discount_percentage numeric(5,2),
    booking_source booking_source,
    processed_by_employee_id bigint,
    created_at timestamp with time zone
  );
exception when duplicate_object then null; end $$;

create or replace function fn_get_reservation_detail(
  p_reservation_id uuid,
  p_guest_id uuid
)
returns reservation_detail_row
language plpgsql
stable
as $$
declare
  v_result reservation_detail_row;
begin
  select
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
  into strict v_result
  from reservation res
  join guest g on g.guest_id = res.guest_id
  join branch b on b.branch_id = res.branch_id
  where res.reservation_id = p_reservation_id
    and (p_guest_id is null or res.guest_id = p_guest_id);

  return v_result;

exception
  when no_data_found then
    raise exception 'Reservation % not found', p_reservation_id
      using errcode = 'P0002';
end;
$$;

comment on function fn_get_reservation_detail(uuid, uuid) is
  'Fetch full reservation detail with guest and branch names. '
  'Enforces guest ownership when p_guest_id is provided. '
  'Raises P0002 (no_data_found) when not found or ownership mismatch.';
