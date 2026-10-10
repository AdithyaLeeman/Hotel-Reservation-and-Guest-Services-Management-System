create or replace view vw_service_usage_breakdown as
select
  su.usage_id,
  su.reservation_id,
  su.room_id,
  su.service_id,
  r.branch_id,
  r.check_in_date,
  r.check_out_date,
  r.reservation_status,
  rm.room_number,
  sc.service_name,
  su.usage_date,
  su.quantity,
  su.charged_price,
  (su.quantity * su.charged_price) as line_total,
  su.request_channel,
  su.logged_by_employee_id,
  e.full_name as logged_by_name
from service_usage su
join reservation r on r.reservation_id = su.reservation_id
join room rm on rm.room_id = su.room_id
join service_catalogue sc on sc.service_id = su.service_id
join employee e on e.employee_id = su.logged_by_employee_id;

comment on view vw_service_usage_breakdown is
  'Per-row service usage breakdown for a reservation. '
  'line_total = quantity * charged_price (price snapshot - never recalculated). '
  'Joins: service_usage → reservation, room, service_catalogue, employee. '
  'Used by fn_calc_service_charges() and billing/audit reports.';
