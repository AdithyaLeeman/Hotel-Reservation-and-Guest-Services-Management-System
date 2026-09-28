-- =============================================================================
-- View:      vw_top_services.sql
-- Owner:     Member 3 (Hiripitiya S.K., 240238C)
-- Task:      P05-M03-T01 (Phase 5 contribution)
-- Depends:   SP4.1 executed (service_catalogue + service_usage tables exist)
-- Lecture:   L03 (aggregate functions, GROUP BY, ORDER BY), L05 (views)
-- =============================================================================
--
-- PURPOSE:
--   Report: Top-used services ranked by total quantity consumed.
--   Shows service name, total quantity, total revenue from that service,
--   and number of distinct reservations that used it.
--   Used by the top-services report page (app/staff/reports/top-services).
--
-- NOTE: This SQL file is written now but executed in Phase 5 after
--       SP4.1 (service_catalogue + service_usage) is complete.
-- =============================================================================

CREATE OR REPLACE VIEW vw_top_services AS
SELECT
    sc.service_id,
    sc.service_name,
    SUM(su.quantity)                            AS total_quantity,
    SUM(su.quantity * su.charged_price)         AS total_revenue,
    COUNT(DISTINCT su.reservation_id)           AS reservation_count,
    RANK() OVER (ORDER BY SUM(su.quantity) DESC) AS usage_rank
FROM service_usage su
JOIN service_catalogue sc ON sc.service_id = su.service_id
GROUP BY sc.service_id, sc.service_name
ORDER BY usage_rank;

COMMENT ON VIEW vw_top_services IS
    'Top services ranked by total quantity consumed. '
    'Includes total revenue (SUM of quantity * charged_price) and '
    'number of distinct reservations. Used by the top-services report.';
