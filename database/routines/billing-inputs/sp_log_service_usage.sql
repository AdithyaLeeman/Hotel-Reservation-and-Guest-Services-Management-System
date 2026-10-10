create or replace procedure sp_log_service_usage(
  p_reservation_id uuid,
  p_room_id bigint,
  p_service_id bigint,
  p_quantity int,
  p_logged_by_employee_id bigint,
  p_request_channel varchar
)
language plpgsql
as $$
declare
  v_status reservation_status;
  v_service_status service_catalogue_status;
  v_current_price decimal(12,2);
begin
  if p_quantity < 1 then
    raise exception 'Quantity must be at least 1' using errcode = '22023';
  end if;

  select reservation_status into v_status
  from reservation
  where reservation_id = p_reservation_id;

  if not found then
    raise exception 'Reservation % not found', p_reservation_id using errcode = '23503';
  end if;

  if v_status != 'CheckedIn' then
    raise exception 'Reservation % must be CheckedIn to log service usage', p_reservation_id using errcode = '45011';
  end if;

  if not exists (
    select 1
    from reservation_rooms
    where reservation_id = p_reservation_id
      and room_id = p_room_id
  ) then
    raise exception 'Room % does not belong to reservation %', p_room_id, p_reservation_id using errcode = '23503';
  end if;

  select status, current_price into v_service_status, v_current_price
  from service_catalogue
  where service_id = p_service_id;

  if not found then
    raise exception 'Service % not found', p_service_id using errcode = '23503';
  end if;

  if v_service_status != 'Active' then
    raise exception 'Service % is inactive', p_service_id using errcode = '45012';
  end if;

  insert into service_usage (
    room_id,
    reservation_id,
    service_id,
    quantity,
    charged_price,
    logged_by_employee_id,
    request_channel
  ) values (
    p_room_id,
    p_reservation_id,
    p_service_id,
    p_quantity,
    v_current_price,
    p_logged_by_employee_id,
    p_request_channel
  );
end;
$$;
