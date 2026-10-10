create table if not exists reservation(
  reservation_id uuid not null default gen_random_uuid(),
  guest_id uuid not null,
  branch_id bigint not null,
  check_in_date date not null,
  check_out_date date not null,
  reservation_status reservation_status not null default 'Booked',
  discount_percentage numeric(5,2) check (discount_percentage >= 0 and discount_percentage < 100),
  processed_by_employee_id bigint,
  created_by_user_id uuid not null,
  booking_source booking_source not null,
  created_at timestamp with time zone not null default now(),

  constraint pk_reservation primary key (reservation_id),
  constraint chk_reservation_dates check (check_out_date > check_in_date),
  constraint fk_reservation_guest foreign key (guest_id) references guest (guest_id) on delete restrict,
  constraint fk_reservation_branch foreign key (branch_id) references branch (branch_id) on delete restrict,
  constraint fk_reservation_employee foreign key (processed_by_employee_id) references employee (employee_id) on delete restrict,
  constraint fk_reservation_user foreign key (created_by_user_id) references user_account (user_id) on delete restrict
);

create index if not exists idx_reservation_guest_id on reservation (guest_id);
create index if not exists idx_reservation_branch_id on reservation (branch_id);
create index if not exists idx_reservation_dates on reservation (check_in_date, check_out_date);
create index if not exists idx_reservation_status on reservation (reservation_status);

comment on table reservation is
  'Guest reservation header. Rooms are in reservation_rooms. '
  'All overlap and branch-validation logic lives in sp_create_reservation().';
comment on column reservation.discount_percentage is
  'Optional discount applied at reservation time. NULL = no discount. '
  'Used by vw_invoice_totals for grand total calculation.';
comment on column reservation.booking_source is
  'Origin of the reservation: Online (guest self-service), Reception or Phone (staff-created).';
