create or replace procedure sp_checkout(
  p_reservation_id uuid,
  p_employee_id bigint
)
language plpgsql
as $$
declare
  v_status reservation_status;
  v_outstanding_balance numeric(12,2);
begin
  select reservation_status
  into v_status
  from reservation
  where reservation_id = p_reservation_id;

  if not found then
    raise exception 'Reservation % not found', p_reservation_id
      using errcode = '23503';
  end if;

  if v_status != 'CheckedIn' then
    raise exception 'Reservation % cannot be checked out - current status is %',
      p_reservation_id, v_status
      using errcode = '45031';
  end if;

  select outstanding_balance
  into v_outstanding_balance
  from vw_invoice_totals
  where reservation_id = p_reservation_id;

  if found and v_outstanding_balance > 0 then
    raise exception 'Reservation % has outstanding balance of %; checkout blocked',
      p_reservation_id, v_outstanding_balance
      using errcode = '45030';
  end if;

  if p_employee_id is not null then
    perform set_config('app.current_employee_id', p_employee_id::text, true);
  end if;

  update reservation
  set reservation_status = 'CheckedOut',
      processed_by_employee_id = p_employee_id
  where reservation_id = p_reservation_id;

  update room
  set status = 'Available'
  where room_id in (
    select room_id
    from reservation_rooms
    where reservation_id = p_reservation_id
  );

  update billing_summary
  set payment_status = 'Paid'
  where reservation_id = p_reservation_id
    and payment_status != 'Paid';
end;
$$;