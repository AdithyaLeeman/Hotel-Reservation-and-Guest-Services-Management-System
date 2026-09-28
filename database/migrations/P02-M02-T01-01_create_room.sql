create table if not exists room (
  room_id bigint generated always as identity,
  room_number varchar(10) not null,
  branch_id bigint not null,
  type_id bigint not null,
  status room_status not null default 'Available',

  constraint pk_room primary key (room_id),
  constraint fk_room_branch foreign key (branch_id) references branch (branch_id) on delete restrict,
  constraint fk_room_type foreign key (type_id) references room_type (type_id) on delete restrict,
  constraint uq_room_branch_number unique (branch_id, room_number),
  constraint ck_room_number_len check (length(trim(room_number)) >= 1)
);

comment on table room is
  'Individual hotel rooms across SkyNest branches. '
  'Room number is unique per branch (UNIQUE(branch_id, room_number)).';
comment on column room.room_id is 'Auto-generated bigint surrogate key';
comment on column room.room_number is 'Room number or identifier within branch (e.g. 101, 201)';
comment on column room.branch_id is 'Foreign key referencing branch';
comment on column room.type_id is 'Foreign key referencing room_type';
comment on column room.status is 'Operational status of room: Available, Occupied, Maintenance';
