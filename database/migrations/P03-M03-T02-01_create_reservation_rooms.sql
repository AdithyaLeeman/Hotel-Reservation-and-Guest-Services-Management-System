create table if not exists reservation_rooms(
  reservation_id uuid not null,
  room_id bigint not null,
  rate_per_night numeric(12,2) not null check (rate_per_night > 0),

  constraint pk_reservation_rooms primary key (reservation_id, room_id),
  constraint fk_resrooms_reservation foreign key (reservation_id) references reservation (reservation_id) on delete restrict,
  constraint fk_resrooms_room foreign key (room_id) references room (room_id) on delete restrict
);

create index if not exists idx_reservation_rooms_room_id on reservation_rooms (room_id);

comment on table reservation_rooms is
  'Room allocations for a reservation. rate_per_night is a historical snapshot '
  'captured at booking time - immutable after creation. '
  'All rooms must belong to reservation.branch_id (enforced by sp_create_reservation).';
comment on column reservation_rooms.rate_per_night is
  'Snapshot of room_type.daily_rate at the time of booking. '
  'Used by fn_calc_room_charges() for authoritative billing. '
  'Never updated even if the room type rate changes.';
