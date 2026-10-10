create or replace function fn_trg_audit_reservation_status()
returns trigger
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_employee_id bigint;
  v_reason varchar(255);
begin
  if new.reservation_status = old.reservation_status then
    return new;
  end if;

  begin
    v_user_id := coalesce(
      current_setting('app.current_user_id', true)::uuid,
      new.created_by_user_id
    );
  exception when others then
    v_user_id := new.created_by_user_id;
  end;

  begin
    v_employee_id := current_setting('app.current_employee_id', true)::bigint;
  exception when others then
    v_employee_id := null;
  end;

  begin
    v_reason := current_setting('app.audit_reason', true);
  exception when others then
    v_reason := null;
  end;

  insert into reservation_audit_log (
    reservation_id,
    old_status,
    new_status,
    changed_at,
    changed_by_user_id,
    employee_id,
    change_reason
  ) values (
    new.reservation_id,
    old.reservation_status,
    new.reservation_status,
    now(),
    v_user_id,
    v_employee_id,
    v_reason
  );

  return new;
end;
$$;

drop trigger if exists trg_audit_reservation_status on reservation;

create trigger trg_audit_reservation_status
  after update of reservation_status
  on reservation
  for each row
  execute function fn_trg_audit_reservation_status();

comment on trigger trg_audit_reservation_status on reservation is
  'AFTER UPDATE trigger: logs every reservation_status change to '
  'reservation_audit_log. Actor attributed via app.current_user_id '
  'and app.current_employee_id session variables.';

comment on function fn_trg_audit_reservation_status() is
  'Trigger function backing trg_audit_reservation_status. '
  'SECURITY DEFINER - runs as owner to guarantee INSERT access to '
  'reservation_audit_log regardless of calling role.';
