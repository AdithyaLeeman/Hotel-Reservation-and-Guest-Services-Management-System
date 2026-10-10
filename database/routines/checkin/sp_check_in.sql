create or replace procedure sp_check_in(
  p_reservation_id uuid,
  p_employee_id integer
)
language plpgsql
as $$
declare
  v_status reservation_status;
  v_maintenance_count integer;
begin
  select reservation_status into v_status
  from reservation
  where reservation_id = p_reservation_id;

  if not found then
    raise exception 'Reservation % not found', p_reservation_id using errcode = '23503';
  end if;

  if v_status != 'Booked' then
    raise exception 'Reservation % cannot be checked in - current status is %', p_reservation_id, v_status using errcode = '45010';
  end if;

  select count(*) into v_maintenance_count
  from reservation_rooms rr
  join room r on rr.room_id = r.room_id
  where rr.reservation_id = p_reservation_id
    and r.status = 'Maintenance';

  if v_maintenance_count > 0 then
    raise exception 'Cannot check-in. One or more reserved rooms are in Maintenance.' using errcode = '45003';
  end if;

  update reservation
  set reservation_status = 'CheckedIn',
      processed_by_employee_id = p_employee_id
  where reservation_id = p_reservation_id;

  update room
  set status = 'Occupied'
  where room_id in (
    select room_id
    from reservation_rooms
    where reservation_id = p_reservation_id
  );
end;
$$;
