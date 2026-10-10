create or replace function fn_calc_room_charges(p_reservation_id uuid)
returns numeric(12,2) as $$
declare
  v_total numeric(12,2);
begin
  select coalesce(sum(rr.rate_per_night * (r.check_out_date - r.check_in_date)), 0.00)
  into v_total
  from reservation r
  join reservation_rooms rr on r.reservation_id = rr.reservation_id
  where r.reservation_id = p_reservation_id;

  return v_total;
end;
$$ language plpgsql;
