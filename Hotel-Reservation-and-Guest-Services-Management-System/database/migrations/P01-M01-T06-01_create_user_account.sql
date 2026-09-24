create table if not exists user_account(
  user_id UUID not null default  gen_random_uuid(),
  username varchar(100) not null,
  password_hash varchar(255) not null,
  role user_role not null,
  status account_status not null default 'Active',

  constraint pk_user_account primary key (user_id),
  constraint uq_user_account_username unique (username),
  constraint ck_user_account_username check (length(trim(username))>=3)
);

comment on table user_account is
  'Unified authentication table for all actors (Guest, Receptionist, Manager, Admin). '
  'Role governs portal access. password_hash stores bcrypt output (cost 12+).';
comment on column user_account.user_id is 'UUID primary key — gen_random_uuid()';
comment on column user_account.username is 'Unique login name; minimum 3 non-whitespace characters';
comment on column user_account.password_hash is 'bcrypt hash (cost >= 12). Never store plaintext.';
comment on column user_account.role is 'user_role enum — determines portal access and RBAC';
comment on column user_account.status is 'account_status enum — Inactive/Suspended blocks login';