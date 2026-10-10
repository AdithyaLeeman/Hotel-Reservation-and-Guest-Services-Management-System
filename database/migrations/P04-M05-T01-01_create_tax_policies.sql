create table if not exists tax_policies(
  tax_id bigint not null generated always as identity,
  tax_name varchar(100) not null,
  tax_percentage numeric(5,2) not null,
  active boolean not null default true,

  constraint pk_tax_policies primary key (tax_id),
  constraint chk_tax_percentage_non_negative check (tax_percentage >= 0)
);

comment on table tax_policies is
  'Tax rate policies applied to room charges at invoice finalization time. '
  'Decision D005: tax applies to room charges only, not service charges. '
  'The active=true record is the currently applicable rate. '
  'tax_percentage_applied is snapshotted into billing_summary so old invoices '
  'are unaffected by future rate changes.';
comment on column tax_policies.tax_percentage is
  'Tax rate as a percentage (e.g., 8.00 means 8%). '
  'Applied only to room_charges per decision D005. '
  'tax_amount = room_charges x tax_percentage / 100.';
comment on column tax_policies.active is
  'True for the currently applicable rate. '
  'sp_finalize_invoice() selects the row WHERE active = true. '
  'Only one record should be active at a time.';