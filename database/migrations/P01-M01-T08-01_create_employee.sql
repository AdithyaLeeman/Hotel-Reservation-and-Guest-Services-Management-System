create table if not exists employee(
  employee_id bigint generated always as identity,
  user_id uuid not null,
  branch_id bigint not null,
  employee_number varchar(50) not null,
  full_name varchar(100) not null,
  email varchar(100) not null,
  phone varchar(20),
  department varchar(50),
  position varchar(50),

  constraint pk_employee primary key (employee_id),
  constraint uq_employee_user_id unique (user_id),
  constraint uq_employee_number unique (employee_number),
  constraint uq_employee_email unique (email),
  constraint fk_employee_user_account foreign key (user_id) references user_account (user_id) on delete restrict,
  constraint fk_employee_branch foreign key (branch_id) references branch (branch_id) on delete restrict,
  constraint ck_employee_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

comment on table employee is
  'Staff profiles linked to a user_account. '
  'A Receptionist is always scoped to one branch_id; '
  'Manager and Admin may hold any branch_id.';
comment on column employee.employee_id is 'Auto-generated bigint surrogate key';
comment on column employee.user_id is 'FK - user_account.user_id (1:1 - one account per employee)';
comment on column employee.branch_id is 'FK - branch.branch_id - home branch for Receptionist scope';
comment on column employee.employee_number is 'Human-readable staff identifier (HR system code)';
comment on column employee.email is 'Work email - must be unique across all employees';