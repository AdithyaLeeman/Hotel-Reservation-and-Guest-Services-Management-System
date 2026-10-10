create or replace view vw_audit_log as
select
  al.audit_id,
  al.reservation_id,
  g.full_name as guest_full_name,
  g.email as guest_email,
  b.location_name as branch_location_name,
  res.branch_id,
  al.old_status,
  al.new_status,
  al.changed_at,
  coalesce(emp.full_name, g_actor.full_name) as changed_by_name,
  ua.role as actor_role,
  emp.employee_number,
  al.change_reason
from reservation_audit_log al
join reservation res on res.reservation_id = al.reservation_id
join guest g on g.guest_id = res.guest_id
join branch b on b.branch_id = res.branch_id
join user_account ua on ua.user_id = al.changed_by_user_id
left join guest g_actor on g_actor.user_id = al.changed_by_user_id
left join employee emp on emp.employee_id = al.employee_id
order by al.changed_at desc;

comment on view vw_audit_log is
  'Complete reservation status change audit trail. '
  'Shows who changed which reservation status and when, '
  'with guest, branch, and actor details. '
  'Apply branch_id filter at query level for Receptionist scope enforcement.';