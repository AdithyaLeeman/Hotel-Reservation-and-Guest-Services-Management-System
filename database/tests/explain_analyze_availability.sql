select
  indexname,
  tablename,
  indexdef
from pg_indexes
where indexname in (
  'idx_reservation_rooms_room_dates',
  'idx_reservation_overlap_lookup',
  'idx_room_branch_status'
)
order by indexname;

select count(*) from fn_get_available_rooms(1, '2027-01-10', '2027-01-15');

explain (analyze, buffers, format text)
select * from fn_get_available_rooms(1, '2027-01-10', '2027-01-15');

explain (analyze, buffers, format text)
select * from fn_get_available_rooms(2, '2027-02-07', '2027-02-09');

explain (analyze, buffers, format text)
select * from fn_get_available_rooms(3, '2027-03-01', '2027-03-15');

set enable_indexscan = off;
set enable_bitmapscan = off;

explain (analyze, buffers, format text)
select * from fn_get_available_rooms(1, '2027-01-10', '2027-01-15');

reset enable_indexscan;
reset enable_bitmapscan;

explain (analyze, buffers, format text)
select * from fn_get_available_rooms(1, '2027-01-10', '2027-01-15');

select
  schemaname,
  relname as table_name,
  indexrelname as index_name,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
from pg_stat_user_indexes
where indexrelname in (
  'idx_reservation_rooms_room_dates',
  'idx_reservation_overlap_lookup',
  'idx_room_branch_status'
)
order by idx_scan desc;
