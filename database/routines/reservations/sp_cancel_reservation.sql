create or replace procedure sp_cancel_reservation(
  in p_reservation_id uuid,
  in p_guest_id uuid,
  in p_cancelled_by uuid
)
language plpgsql
as $$
declare
  v_current_status reservation_status;
  v_owner_guest_id uuid;
begin
  select reservation_status, guest_id
    into v_current_status, v_owner_guest_id
    from reservation
   where reservation_id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation % not found', p_reservation_id
      using errcode = 'P0002';
  end if;

  if p_guest_id is not null and v_owner_guest_id <> p_guest_id then
    raise exception 'Reservation % not found', p_reservation_id
      using errcode = 'P0002';
  end if;

  if v_current_status <> 'Booked' then
    raise exception 'Reservation % cannot be cancelled - current status is %',
      p_reservation_id, v_current_status
      using errcode = '45010';
  end if;

  update reservation
     set reservation_status = 'Cancelled'
   where reservation_id = p_reservation_id;
end;
$$;

comment on procedure sp_cancel_reservation is
  'Cancel a reservation. Only ''Booked'' reservations can be cancelled. '
  'Enforces guest ownership when p_guest_id is provided. '
  'SQLSTATE 45010 = wrong status; P0002 = not found / ownership mismatch.';
