create table if not exists payment(
  payment_id bigint not null generated always as identity,
  invoice_id uuid not null,
  amount_paid numeric(12,2) not null,
  payment_date timestamp with time zone not null default now(),
  payment_method varchar(50) not null,
  processed_by_employee_id bigint,
  paid_by_user_id uuid not null,
  transaction_reference varchar(100),

  constraint pk_payment primary key (payment_id),
  constraint chk_payment_amount_positive check (amount_paid > 0),
  constraint uq_payment_transaction_reference unique (transaction_reference),
  constraint fk_payment_invoice foreign key (invoice_id) references billing_summary (invoice_id) on delete restrict,
  constraint fk_payment_employee foreign key (processed_by_employee_id) references employee (employee_id) on delete restrict,
  constraint fk_payment_user foreign key (paid_by_user_id) references user_account (user_id) on delete restrict
);

create index if not exists idx_payment_invoice_id on payment (invoice_id);
create index if not exists idx_payment_payment_date on payment (payment_date desc);
create index if not exists idx_payment_employee_id on payment (processed_by_employee_id) where processed_by_employee_id is not null;

comment on table payment is
  'Individual payment records posted against a billing_summary invoice. '
  'A reservation may receive multiple partial payments. '
  'sp_post_payment() is the authoritative write path - never INSERT directly. '
  'Outstanding balance is computed by vw_invoice_totals, never stored here.';
comment on column payment.amount_paid is
  'Amount of this payment in LKR. Must be > 0 (BR-14). '
  'Stored as NUMERIC(12,2) per the project money convention (docs/21, Section 3).';
comment on column payment.payment_method is
  'Payment method string, e.g. ''Cash'', ''Credit Card'', ''Bank Transfer''. '
  'Not an enum - method options may expand without a schema migration.';
comment on column payment.processed_by_employee_id is
  'Staff member who processed the payment. NULL for online/self-service payments '
  'made directly by the guest through the guest portal.';
comment on column payment.transaction_reference is
  'Optional external idempotency key (e.g., payment gateway reference). '
  'When provided, the UNIQUE constraint prevents duplicate processing (BR-12). '
  'sp_post_payment() checks this before inserting.';
