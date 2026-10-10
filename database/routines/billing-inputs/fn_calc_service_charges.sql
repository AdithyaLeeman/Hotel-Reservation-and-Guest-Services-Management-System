create or replace function fn_calc_service_charges(p_reservation_id uuid)
returns numeric(12,2) as $$
declare
  v_total numeric(12,2);
begin
  select coalesce(sum(quantity * charged_price), 0.00)
  into v_total
  from service_usage
  where reservation_id = p_reservation_id;

  return v_total;
end;
$$ language plpgsql;
