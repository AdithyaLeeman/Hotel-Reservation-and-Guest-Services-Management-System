create or replace view vw_active_reservations as
select
  res.reservation_id,
  res.guest_id,
  g.full_name as guest_full_name,
  g.email as guest_email,
  res.branch_id,
  b.location_name as branch_location_name,
  res.check_in_date,
  res.check_out_date,
  res.reservation_status,
  res.booking_source,
  res.discount_percentage,
  res.processed_by_employee_id,
  count(rr.room_id) as room_count,
  res.created_at
from reservation res
join guest g on g.guest_id = res.guest_id
join branch b on b.branch_id = res.branch_id
left join reservation_rooms rr on rr.reservation_id = res.reservation_id
where res.reservation_status in ('Booked', 'CheckedIn')
group by
  res.reservation_id,
  g.full_name,
  g.email,
  b.location_name;

comment on view vw_active_reservations is
  'Active reservations (Booked + CheckedIn) with guest, branch, and room count. '
  'Apply branch_id filter in the calling query for Receptionist scope enforcement.';
