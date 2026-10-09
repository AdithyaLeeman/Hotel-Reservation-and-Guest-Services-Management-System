-- =============================================================================
-- View:      vw_service_usage_breakdown.sql
-- Owner:     Member 4 (Bandaranayaka I.B.W.D., 240061C)
-- Phase:     P4 - Stay Services and Billing
-- Task:      P04-M04-T08
-- Depends:   SP4.1 executed (service_catalogue, service_usage tables exist)
--            SP3.1 executed (reservation table exists)
-- Lecture:   L05 (views, aggregate functions, GROUP BY), L07 (RBAC, reporting)
-- =============================================================================
--
-- PURPOSE:
--   Provides a denormalized, per-usage-row breakdown of every service consumed
--   during a reservation stay.  Each row represents one service_usage record,
--   enriched with:
--     - reservation context  (branch_id, check-in/out dates)
--     - room number           (from room table)
--     - service name          (from service_catalogue)
--     - line total            (quantity * charged_price - price snapshot, NOT
--                              the current catalogue price)
--     - the employee who logged the usage
--
--   Used by:
--     - fn_calc_service_charges()          - aggregate total per reservation
--     - Staff service-usage report page    - app/staff/reports/service-usage
--     - Billing invoice detail             - Phase 6 wire-up
--
-- RULE: charged_price is the snapshot captured at logging time by
--       sp_log_service_usage(); this view never recalculates from
--       service_catalogue.current_price.
--
-- NOTE: This SQL file is written now but executed after SP4.1 (service_catalogue
--       + service_usage) and SP3.1 (reservation) DDLs have been applied.
-- =============================================================================

CREATE OR REPLACE VIEW vw_service_usage_breakdown AS
SELECT
    -- Service usage identifiers
    su.usage_id,
    su.reservation_id,
    su.room_id,
    su.service_id,

    -- Reservation context
    r.branch_id,
    r.check_in_date,
    r.check_out_date,
    r.reservation_status,

    -- Room info
    rm.room_number,

    -- Service info
    sc.service_name,

    -- Usage details
    su.usage_date,
    su.quantity,
    su.charged_price,                               -- price snapshot at log time
    (su.quantity * su.charged_price)  AS line_total, -- per-line revenue
    su.request_channel,

    -- Who logged this usage
    su.logged_by_employee_id,
    e.full_name AS logged_by_name

FROM service_usage su
JOIN reservation          r  ON r.reservation_id  = su.reservation_id
JOIN room                 rm ON rm.room_id         = su.room_id
JOIN service_catalogue    sc ON sc.service_id      = su.service_id
JOIN employee             e  ON e.employee_id      = su.logged_by_employee_id;

COMMENT ON VIEW vw_service_usage_breakdown IS
    'Per-row service usage breakdown for a reservation. '
    'line_total = quantity * charged_price (price snapshot - never recalculated). '
    'Joins: service_usage → reservation, room, service_catalogue, employee. '
    'Used by fn_calc_service_charges() and billing/audit reports.';
