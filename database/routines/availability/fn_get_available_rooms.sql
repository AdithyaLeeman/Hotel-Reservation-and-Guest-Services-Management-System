-- ============================================================================
-- Routine:   fn_get_available_rooms
-- Subphase:  SP2.2 - Availability DB
-- Task:      P02-M02-T03
-- Member:    Member 2 (Room Inventory and Availability)
-- Purpose:   Returns all rooms in a given branch that are available for booking
--            across the specified [check_in, check_out) date range.
--
-- Rules & Logic:
-- 1. Exclude rooms where status = 'Maintenance'.
-- 2. Exclude rooms that have an active reservation (status 'Booked' or 'CheckedIn')
--    whose date interval overlaps [p_check_in, p_check_out):
--      res.check_in_date < p_check_out AND res.check_out_date > p_check_in
-- 3. Reservations with status 'Cancelled' or 'CheckedOut' do NOT block availability.
-- 4. Date validation: p_check_out must be strictly greater than p_check_in.
--
-- Course Concept Alignment:
-- - L08: PL/pgSQL stored function with parameter validation and table return
-- - L05: Subqueries (NOT EXISTS), interval overlap logic, relational joins
-- - L10: B-Tree index optimization via reservation_rooms and reservation tables
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_get_available_rooms(
  p_branch_id  BIGINT,
  p_check_in   DATE,
  p_check_out  DATE
)
RETURNS TABLE (
  room_id       BIGINT,
  room_number   VARCHAR(10),
  branch_id     BIGINT,
  type_id       BIGINT,
  type_name     VARCHAR(50),
  capacity      INT,
  daily_rate    NUMERIC(12,2),
  status        room_status
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- 1. Input parameter validation
  IF p_branch_id IS NULL THEN
    RAISE EXCEPTION 'branch_id cannot be NULL'
      USING ERRCODE = '22004'; -- null_value_not_allowed
  END IF;

  IF p_check_in IS NULL OR p_check_out IS NULL THEN
    RAISE EXCEPTION 'check_in and check_out dates cannot be NULL'
      USING ERRCODE = '22023'; -- invalid_parameter_value
  END IF;

  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'check_out_date (%) must be strictly after check_in_date (%)', p_check_out, p_check_in
      USING ERRCODE = '22023'; -- invalid_parameter_value
  END IF;

  -- 2. Query available rooms
  RETURN QUERY
  SELECT
    r.room_id,
    r.room_number,
    r.branch_id,
    r.type_id,
    rt.type_name,
    rt.capacity,
    rt.daily_rate,
    r.status
  FROM room r
  INNER JOIN room_type rt ON rt.type_id = r.type_id
  WHERE r.branch_id = p_branch_id
    AND r.status != 'Maintenance'
    AND NOT EXISTS (
      SELECT 1
      FROM reservation_rooms rr
      INNER JOIN reservation res ON res.reservation_id = rr.reservation_id
      WHERE rr.room_id = r.room_id
        AND res.reservation_status NOT IN ('Cancelled', 'CheckedOut')
        AND res.check_in_date < p_check_out
        AND res.check_out_date > p_check_in
    )
  ORDER BY
    rt.capacity ASC,
    rt.daily_rate ASC,
    r.room_number ASC;
END;
$$;

COMMENT ON FUNCTION fn_get_available_rooms(BIGINT, DATE, DATE) IS
  'Authoritative room availability function. Returns non-maintenance rooms for a branch not overlapping any active reservations for the specified dates.';
