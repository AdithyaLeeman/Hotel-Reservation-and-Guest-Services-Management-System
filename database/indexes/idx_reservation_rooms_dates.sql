-- ============================================================================
-- Index:     idx_reservation_rooms_dates
-- Subphase:  SP2.2 — Availability DB
-- Task:      P02-M02-T04
-- Member:    Member 2 (Room Inventory and Availability)
-- Purpose:   Composite and supporting indexes to optimize availability search
--            and room overlap queries in fn_get_available_rooms() and sp_create_reservation().
--
-- Query Pattern Optimized:
--   SELECT 1 FROM reservation_rooms rr
--   INNER JOIN reservation res ON res.reservation_id = rr.reservation_id
--   WHERE rr.room_id = r.room_id
--     AND res.reservation_status NOT IN ('Cancelled', 'CheckedOut')
--     AND res.check_in_date < p_check_out
--     AND res.check_out_date > p_check_in;
--
-- Course Concept Alignment:
-- - L10: B-Tree composite indexing, index-only scans, filtering predicates
-- - L11: Query execution plan optimization (EXPLAIN ANALYZE verification)
-- ============================================================================

-- 1. Index on reservation_rooms: optimizes room_id lookup with covering reservation_id
CREATE INDEX IF NOT EXISTS idx_reservation_rooms_room_dates
  ON reservation_rooms (room_id, reservation_id);

-- 2. Index on reservation date ranges and status for fast overlap evaluation
CREATE INDEX IF NOT EXISTS idx_reservation_overlap_lookup
  ON reservation (reservation_status, check_in_date, check_out_date);

-- 3. Composite index on room branch and status to rapidly filter non-maintenance rooms
CREATE INDEX IF NOT EXISTS idx_room_branch_status
  ON room (branch_id, status)
  INCLUDE (type_id, room_number);

COMMENT ON INDEX idx_reservation_rooms_room_dates IS
  'Optimizes room allocation joins during date-range availability checks.';

COMMENT ON INDEX idx_reservation_overlap_lookup IS
  'Optimizes date overlap and reservation status filtering in fn_get_available_rooms.';

COMMENT ON INDEX idx_room_branch_status IS
  'Optimizes branch filtering and maintenance exclusion in availability queries.';
