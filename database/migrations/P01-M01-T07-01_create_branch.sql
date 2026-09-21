create table if not exists branch(
  branch_id bigint generated always as identity,
  location_name varchar(100) not null,

  constraint pk_branch primary key (branch_id),
  constraint uq_branch_location_name unique (location_name),
  constraint ck_branch_location_len check (length(trim(location_name))>=2)
);

comment on table branch is
  'Hotel branches operated by SkyNest Hotels. '
  'Seeded with Colombo, Kandy, Galle — do not add branches without team approval.';
comment on column branch.branch_id is 'Auto-generated bigint surrogate key';
comment on column branch.location_name is 'Unique city/location name for the branch';