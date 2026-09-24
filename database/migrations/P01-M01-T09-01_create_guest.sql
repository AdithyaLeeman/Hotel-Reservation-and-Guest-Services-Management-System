create table if not exists guest(
  guest_id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  full_name varchar(100) not null,
  email varchar(100) not null,
  phone varchar(20),
  identification varchar(50),

  constraint pk_guest primary key (guest_id),
  constraint uq_guest_user_id unique (user_id),
  constraint uq_guest_email unique (email),
  constraint fk_guest_user_account foreign key (user_id) references user_account (user_id) on delete restrict,
  constraint ck_guest_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint ck_guest_full_name check (length(trim(full_name)) >= 2)
);

comment on table guest is
  'Guest profiles linked to a user_account. '
  'Guests self-register; staff accounts are never created as guests.';
comment on column guest.guest_id is 'UUID primary key - gen_random_uuid()';
comment on column guest.user_id is 'FK - user_account.user_id (1:1 - one account per guest)';
comment on column guest.email is 'Guest contact email - must be unique';
comment on column guest.identification is 'National ID or passport number (optional at registration, required at check-in)';