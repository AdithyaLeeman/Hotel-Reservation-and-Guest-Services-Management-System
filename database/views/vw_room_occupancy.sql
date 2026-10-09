-- =============================================================================
-- View:     vw_room_occupancy.sql
-- Owner:    Member 5 (P05-M05-T04) / also referenced by M2 occupancy report
-- Phase:    P5 - Payments & Reports
-- Task:     P05-M05-T04
-- Depends:  room (P02-M02-T01), room_type (P01-M02-T01), branch (P01-M01-T07),
--           reservation (P03-M03-T01), reservation_rooms (P03-M03-T02)
-- Lecture:  L05 (views, derived data), L03 (GROUP BY, COUNT, SUM, DATE_TRUNC)
-- =============================================================================
--
-- Room occupancy report view.
-- Produces one row per room per calendar month showing:
--   - How many nights the room was occupied in that month
--   - The occupancy rate as a percentage of available days
--   - The room revenue for occupied nights (from the snapshotted rate_per_night)
--
-- Only reservations in status 'CheckedIn' or 'CheckedOut' are counted as occupied.
-- Cancelled and Booked reservations are excluded.
--
-- period_date = first day of the calendar month (e.g. 2025-12-01 for December 2025).
-- Consumers filter by period_date >= fromDate AND period_date <= toDate.
--
-- Repository contract (occupancy-report.repository.ts) expects these columns:
--   branch_id, branch_name, room_id, room_number, room_type_name, room_status,
--   period_date, total_nights_occupied, occupancy_rate, total_revenue
-- =============================================================================

CREATE OR REPLACE VIEW vw_room_occupancy AS
WITH

-- Generate one row per room per calendar month.
-- Range: 36 months back from the current month, to 12 months ahead.
-- This gives the report a rolling window without requiring dynamic SQL.
calendar_months AS (
    SELECT DATE_TRUNC('month', d)::DATE AS month_start
    FROM generate_series(
        DATE_TRUNC('month', NOW() - INTERVAL '36 months'),
        DATE_TRUNC('month', NOW() + INTERVAL '12 months'),
        INTERVAL '1 month'
    ) AS d
),

-- Cross-join every room with every month to get all (room, month) combinations
room_months AS (
    SELECT
        r.room_id,
        r.room_number,
        r.branch_id,
        r.type_id,
        r.status                        AS room_status,
        cm.month_start                  AS period_date,
        -- Last day of month, used for occupancy rate denominator
        (cm.month_start + INTERVAL '1 month - 1 day')::DATE AS month_end,
        -- Number of days in the month
        EXTRACT(DAY FROM cm.month_start + INTERVAL '1 month - 1 day')::INT AS days_in_month
    FROM room r
    CROSS JOIN calendar_months cm
),

-- For each (room, month) pair, sum the occupied nights from active reservations.
-- A reservation contributes nights = overlap between [check_in, check_out) and [month_start, month_end].
-- Only CheckedIn and CheckedOut reservations count as occupied.
occupied_nights AS (
    SELECT
        rr.room_id,
        DATE_TRUNC('month', r.check_in_date)::DATE AS month_start,
        -- Overlap start = greatest(check_in_date, month_start)
        -- Overlap end   = least(check_out_date, month_end + 1 day)
        -- Nights in month = overlap_end - overlap_start (clamped to >= 0)
        SUM(
            GREATEST(
                0,
                (
                    LEAST(r.check_out_date, DATE_TRUNC('month', r.check_in_date)::DATE + INTERVAL '1 month')::DATE
                    - GREATEST(r.check_in_date, DATE_TRUNC('month', r.check_in_date)::DATE)
                )
            )
        )                                           AS nights_this_room_this_month,
        SUM(
            GREATEST(
                0,
                (
                    LEAST(r.check_out_date, DATE_TRUNC('month', r.check_in_date)::DATE + INTERVAL '1 month')::DATE
                    - GREATEST(r.check_in_date, DATE_TRUNC('month', r.check_in_date)::DATE)
                )
            )
        ) * rr.rate_per_night                      AS revenue_this_room_this_month
    FROM reservation_rooms rr
    JOIN reservation r ON r.reservation_id = rr.reservation_id
    WHERE r.reservation_status IN ('CheckedIn', 'CheckedOut')
    GROUP BY rr.room_id, DATE_TRUNC('month', r.check_in_date)::DATE, rr.rate_per_night
),

-- Aggregate per (room, month) combining the cross-product with occupied nights
room_month_stats AS (
    SELECT
        rm.room_id,
        rm.room_number,
        rm.branch_id,
        rm.type_id,
        rm.room_status,
        rm.period_date,
        rm.days_in_month,
        COALESCE(SUM(on2.nights_this_room_this_month), 0)::INT          AS total_nights_occupied,
        COALESCE(SUM(on2.revenue_this_room_this_month), 0.00)           AS total_revenue
    FROM room_months rm
    LEFT JOIN occupied_nights on2
           ON on2.room_id      = rm.room_id
          AND on2.month_start  = rm.period_date
    GROUP BY
        rm.room_id,
        rm.room_number,
        rm.branch_id,
        rm.type_id,
        rm.room_status,
        rm.period_date,
        rm.days_in_month
)

SELECT
    rms.branch_id,
    b.location_name                                             AS branch_name,
    rms.room_id,
    rms.room_number,
    rt.type_name                                                AS room_type_name,
    rms.room_status::TEXT                                       AS room_status,
    rms.period_date,
    rms.total_nights_occupied,
    ROUND(
        (rms.total_nights_occupied::NUMERIC / rms.days_in_month) * 100,
        2
    )                                                           AS occupancy_rate,
    ROUND(rms.total_revenue, 2)                                 AS total_revenue

FROM room_month_stats rms
JOIN room_type rt ON rt.type_id = rms.type_id
JOIN branch b     ON b.branch_id = rms.branch_id
ORDER BY
    rms.period_date DESC,
    rms.branch_id   ASC,
    rms.room_number ASC;

COMMENT ON VIEW vw_room_occupancy IS
    'Room occupancy by calendar month. One row per room per month. '
    'Columns: branch_id, branch_name, room_id, room_number, room_type_name, room_status, '
    'period_date (first day of month), total_nights_occupied, occupancy_rate (%), total_revenue. '
    'Only CheckedIn and CheckedOut reservations contribute to occupancy. '
    'Rate uses the snapshotted rate_per_night from reservation_rooms. '
    'Consumers filter by period_date >= fromDate AND period_date <= toDate. '
    'Lecture alignment: L05 (view), L03 (GROUP BY month, SUM, generate_series).';
