create table if not exists room_type (
  type_id bigint generated always as identity,
  type_name varchar(50) not null,
  capacity int not null,
  daily_rate numeric(12,2) not null,

  constraint pk_room_type primary key (type_id),
  constraint uq_room_type_name unique (type_name),
  constraint ck_room_type_name_len check (length(trim(type_name)) >= 2),
  constraint ck_room_type_capacity check (capacity > 0),
  constraint ck_room_type_daily_rate check (daily_rate > 0)
);

comment on table room_type is
  'Room categories and their baseline pricing at SkyNest Hotels. '
  'Seeded with Single, Double, Suite.';
comment on column room_type.type_id is 'Auto-generated bigint surrogate key';
comment on column room_type.type_name is 'Unique category name (e.g. Single, Double, Suite)';
comment on column room_type.capacity is 'Maximum guest occupancy count (must be greater than 0)';
comment on column room_type.daily_rate is 'Current baseline rate per night in LKR (must be greater than 0)';
