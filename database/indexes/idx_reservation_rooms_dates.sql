create index if not exists idx_reservation_rooms_room_dates
  on reservation_rooms (room_id, reservation_id);

create index if not exists idx_reservation_overlap_lookup
  on reservation (reservation_status, check_in_date, check_out_date);

create index if not exists idx_room_branch_status
  on room (branch_id, status)
  include (type_id, room_number);

comment on index idx_reservation_rooms_room_dates is
  'Optimizes room allocation joins during date-range availability checks.';

comment on index idx_reservation_overlap_lookup is
  'Optimizes date overlap and reservation status filtering in fn_get_available_rooms.';

comment on index idx_room_branch_status is
  'Optimizes branch filtering and maintenance exclusion in availability queries.';
