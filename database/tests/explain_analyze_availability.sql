-- ============================================================================
-- EXPLAIN ANALYZE - Availability Query Performance Analysis
-- Task:       P02-M02-T18
-- Member:     Member 2 (Room Inventory and Availability)
-- Subphase:   SP2.5 - Tests
--
-- Purpose:
--   Capture query execution plans for fn_get_available_rooms() under three
--   representative workloads:
--     1. Small dataset (seed data - 15 rooms, ~5 reservations)
--     2. With no indexes present (baseline, index dropped temporarily)
--     3. With all three indexes from P02-M02-T04 present (optimized)
--
-- How to Run:
--   psql -U hrgsms_user -d hrgsms -f database/tests/explain_analyze_availability.sql
--
-- Prerequisites:
--   All Phase 1-3 migrations executed, 15 rooms seeded, at least 5 reservations
--   present in the test database (run database/seeds/ files first).
--
-- Indexes under test (all from database/indexes/idx_reservation_rooms_dates.sql):
--   1. idx_reservation_rooms_room_dates  ON reservation_rooms (room_id, reservation_id)
--   2. idx_reservation_overlap_lookup    ON reservation (reservation_status, check_in_date, check_out_date)
--   3. idx_room_branch_status            ON room (branch_id, status) INCLUDE (type_id, room_number)
--
-- Course Concept Alignment:
--   L10 - B-Tree Indexes, covering indexes, index-only scans, filter push-down
--   L11 - EXPLAIN ANALYZE, execution plan interpretation, cost model
-- ============================================================================

\echo ''
\echo '======================================================================='
\echo 'EXPLAIN ANALYZE - fn_get_available_rooms availability query'
\echo 'P02-M02-T18 | Member 2 | SkyNest HRGSMS'
\echo '======================================================================='

-- ---------------------------------------------------------------------------
-- Step 1: Verify indexes exist before running
-- ---------------------------------------------------------------------------
\echo ''
\echo '--- [CHECK] Index presence verification ---'
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_reservation_rooms_room_dates',
  'idx_reservation_overlap_lookup',
  'idx_room_branch_status'
)
ORDER BY indexname;

-- ---------------------------------------------------------------------------
-- Step 2: Warm the buffer cache (run once silently before measuring)
-- ---------------------------------------------------------------------------
\echo ''
\echo '--- [WARM-UP] Buffer cache warm-up ---'
SELECT COUNT(*) FROM fn_get_available_rooms(1, '2027-01-10', '2027-01-15');

-- ---------------------------------------------------------------------------
-- Step 3: EXPLAIN ANALYZE - Colombo branch, 5-night window (happy path)
-- ---------------------------------------------------------------------------
\echo ''
\echo '--- [TEST 1] Colombo branch, 5-night stay (indexed) ---'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM fn_get_available_rooms(1, '2027-01-10', '2027-01-15');

-- ---------------------------------------------------------------------------
-- Step 4: EXPLAIN ANALYZE - Kandy branch, weekend stay
-- ---------------------------------------------------------------------------
\echo ''
\echo '--- [TEST 2] Kandy branch, 2-night weekend stay ---'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM fn_get_available_rooms(2, '2027-02-07', '2027-02-09');

-- ---------------------------------------------------------------------------
-- Step 5: EXPLAIN ANALYZE - Galle branch, long stay (14 nights)
-- ---------------------------------------------------------------------------
\echo ''
\echo '--- [TEST 3] Galle branch, 14-night long stay ---'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM fn_get_available_rooms(3, '2027-03-01', '2027-03-15');

-- ---------------------------------------------------------------------------
-- Step 6: EXPLAIN ANALYZE - Without indexes (seq-scan baseline)
--   NOTE: Only run this in a test environment. Drop and recreate safely.
-- ---------------------------------------------------------------------------
\echo ''
\echo '--- [BASELINE] Temporarily disable index usage (session-level) ---'
SET enable_indexscan = OFF;
SET enable_bitmapscan = OFF;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM fn_get_available_rooms(1, '2027-01-10', '2027-01-15');

-- Restore index usage
RESET enable_indexscan;
RESET enable_bitmapscan;
\echo ''
\echo '--- [RESTORED] Index usage re-enabled ---'

-- ---------------------------------------------------------------------------
-- Step 7: EXPLAIN ANALYZE - With indexes re-enabled (compare with baseline)
-- ---------------------------------------------------------------------------
\echo ''
\echo '--- [OPTIMIZED] Same query with indexes enabled ---'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM fn_get_available_rooms(1, '2027-01-10', '2027-01-15');

-- ---------------------------------------------------------------------------
-- Step 8: Index usage statistics (pg_stat_user_indexes)
-- ---------------------------------------------------------------------------
\echo ''
\echo '--- [STATS] Index scan counts after tests ---'
SELECT
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan   AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE indexrelname IN (
  'idx_reservation_rooms_room_dates',
  'idx_reservation_overlap_lookup',
  'idx_room_branch_status'
)
ORDER BY idx_scan DESC;

\echo ''
\echo '======================================================================='
\echo 'EXPLAIN ANALYZE complete. Copy output into docs/09 EXPLAIN ANALYZE section.'
\echo '======================================================================='
