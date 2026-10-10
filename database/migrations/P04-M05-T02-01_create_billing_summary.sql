create table if not exists billing_summary(
  invoice_id uuid not null default gen_random_uuid(),
  reservation_id uuid not null,
  invoice_date timestamp with time zone not null default now(),
  tax_id bigint not null,
  tax_percentage_applied numeric(5,2) not null,
  payment_status payment_status not null default 'Unpaid',

  constraint pk_billing_summary primary key (invoice_id),
  constraint uq_billing_summary_reservation unique (reservation_id),
  constraint chk_billing_tax_percentage_non_negative check (tax_percentage_applied >= 0),
  constraint fk_billing_summary_reservation foreign key (reservation_id) references reservation (reservation_id) on delete restrict,
  constraint fk_billing_summary_tax foreign key (tax_id) references tax_policies (tax_id) on delete restrict
);

create index if not exists idx_billing_summary_reservation_id on billing_summary (reservation_id);
create index if not exists idx_billing_summary_invoice_date on billing_summary (invoice_date desc);
create index if not exists idx_billing_summary_payment_status on billing_summary (payment_status);

comment on table billing_summary is
  'One stored invoice record per reservation. '
  'Created by sp_finalize_invoice() which snapshots the active tax rate. '
  'Monetary totals are NOT stored here - they are computed by vw_invoice_totals '
  'using fn_calc_room_charges(), fn_calc_service_charges(), and SUM(payment.amount_paid). '
  'Decision D006: billing_summary is a stored table; vw_invoice_totals computes running totals.';
comment on column billing_summary.invoice_id is
  'UUID primary key for the invoice. Used as FK target in the payment table.';
comment on column billing_summary.reservation_id is
  'FK to reservation. UNIQUE constraint enforces one invoice per reservation.';
comment on column billing_summary.tax_percentage_applied is
  'Snapshot of the tax rate at invoice creation time (from tax_policies). '
  'Stored here so historical invoices remain accurate even if the tax rate changes later. '
  'Applied to room_charges only (Decision D005).';
comment on column billing_summary.payment_status is
  'Denormalized payment status. Updated by sp_post_payment() each time a payment is made. '
  'Authoritative balance is always in vw_invoice_totals.outstanding_balance.';