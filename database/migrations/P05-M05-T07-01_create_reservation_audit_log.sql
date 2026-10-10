create table if not exists reservation_audit_log(
  audit_id bigint not null generated always as identity,
  reservation_id uuid not null,
  old_status reservation_status not null,
  new_status reservation_status not null,
  changed_at timestamp with time zone not null default now(),
  changed_by_user_id uuid not null,
  employee_id bigint,
  change_reason varchar(255),

  constraint pk_reservation_audit_log primary key (audit_id),
  constraint fk_audit_log_reservation foreign key (reservation_id) references reservation (reservation_id) on delete restrict,
  constraint fk_audit_log_user foreign key (changed_by_user_id) references user_account (user_id) on delete restrict,
  constraint fk_audit_log_employee foreign key (employee_id) references employee (employee_id) on delete restrict,
  constraint chk_audit_log_status_changed check (old_status <> new_status)
);

create index if not exists idx_audit_log_reservation_id on reservation_audit_log (reservation_id);
create index if not exists idx_audit_log_changed_at on reservation_audit_log (changed_at desc);
create index if not exists idx_audit_log_employee_id on reservation_audit_log (employee_id) where employee_id is not null;

comment on table reservation_audit_log is
  'Append-only audit trail for reservation status changes. '
  'Populated exclusively by trg_audit_reservation_status. '
  'Never UPDATE or DELETE rows in this table.';
comment on column reservation_audit_log.employee_id is
  'Staff member who performed the action. NULL for guest-initiated status changes '
  '(e.g., online cancellation through the guest portal).';
comment on column reservation_audit_log.change_reason is
  'Optional human-readable reason for the status change. '
  'Set via app.audit_reason session variable by stored procedures before UPDATE.';