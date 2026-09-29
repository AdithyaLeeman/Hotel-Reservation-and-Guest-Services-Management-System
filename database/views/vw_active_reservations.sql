-- =============================================================================
-- View:      vw_active_reservations.sql
-- Owner:     Member 3 (Hiripitiya S.K., 240238C)
-- Task:      P03-M03-T06
-- Depends:   SP3.1 executed (reservation + reservation_rooms + related tables)
-- Lecture:   L05 (views, joins)
-- =============================================================================
--
-- PURPOSE:
--   Provides a convenient view of all active (Booked or CheckedIn) reservations
--   joined with guest, branch, and room-count information.
--   Used by staff dashboards and the staff reservations list page.
--
-- SECURITY:
--   Branch-level filtering (WHERE branch_id = $1) is applied at the query level
--   in the repository layer — not in this view — to keep the view general-purpose.
--   Receptionist branch scoping is enforced in route handlers via requireBranchScope().
--
-- COLUMNS:
--   reservation_id, guest_id, guest_full_name, guest_email,
--   branch_id, branch_location_name,
--   check_in_date, check_out_date, reservation_status,
--   booking_source, discount_percentage,
--   room_count,         -- number of rooms in this reservation
--   created_at
-- =============================================================================

CREATE OR REPLACE VIEW vw_active_reservations AS
SELECT
    res.reservation_id,
    res.guest_id,
    g.full_name                     AS guest_full_name,
    g.email                         AS guest_email,
    res.branch_id,
    b.location_name                 AS branch_location_name,
    res.check_in_date,
    res.check_out_date,
    res.reservation_status,
    res.booking_source,
    res.discount_percentage,
    res.processed_by_employee_id,
    COUNT(rr.room_id)               AS room_count,
    res.created_at
FROM reservation res
JOIN guest   g  ON g.guest_id  = res.guest_id
JOIN branch  b  ON b.branch_id = res.branch_id
LEFT JOIN reservation_rooms rr ON rr.reservation_id = res.reservation_id
WHERE res.reservation_status IN ('Booked', 'CheckedIn')
GROUP BY
    res.reservation_id,
    g.full_name,
    g.email,
    b.location_name;

COMMENT ON VIEW vw_active_reservations IS
    'Active reservations (Booked + CheckedIn) with guest, branch, and room count. '
    'Apply branch_id filter in the calling query for Receptionist scope enforcement.';
