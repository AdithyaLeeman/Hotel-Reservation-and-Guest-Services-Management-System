create or replace function fn_get_available_rooms(
  p_branch_id bigint,
  p_check_in date,
  p_check_out date
)
returns table (
  room_id bigint,
  room_number varchar(10),
  branch_id bigint,
  type_id bigint,
  type_name varchar(50),
  capacity int,
  daily_rate numeric(12,2),
  status room_status
)
language plpgsql
stable
as $$
begin
  if p_branch_id is null then
    raise exception 'branch_id cannot be NULL'
      using errcode = '22004';
  end if;

  if p_check_in is null or p_check_out is null then
    raise exception 'check_in and check_out dates cannot be NULL'
      using errcode = '22023';
  end if;

  if p_check_out <= p_check_in then
    raise exception 'check_out_date (%) must be strictly after check_in_date (%)', p_check_out, p_check_in
      using errcode = '22023';
  end if;

  return query
  select
    r.room_id,
    r.room_number,
    r.branch_id,
    r.type_id,
    rt.type_name,
    rt.capacity,
    rt.daily_rate,
    r.status
  from room r
  inner join room_type rt on rt.type_id = r.type_id
  where r.branch_id = p_branch_id
    and r.status != 'Maintenance'
    and not exists (
      select 1
      from reservation_rooms rr
      inner join reservation res on res.reservation_id = rr.reservation_id
      where rr.room_id = r.room_id
        and res.reservation_status not in ('Cancelled', 'CheckedOut')
        and res.check_in_date < p_check_out
        and res.check_out_date > p_check_in
    )
  order by
    rt.capacity asc,
    rt.daily_rate asc,
    r.room_number asc;
end;
$$;

comment on function fn_get_available_rooms(bigint, date, date) is
  'Authoritative room availability function. Returns non-maintenance rooms for a branch not overlapping any active reservations for the specified dates.';
