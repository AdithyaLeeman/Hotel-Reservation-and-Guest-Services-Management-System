-- =============================================================================
-- Routine:   fn_calc_service_charges.sql
-- Owner:     Member 4
-- Phase:     P4 - Stay Services and Billing
-- Task:      P04-M04-T07
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_calc_service_charges(p_reservation_id UUID)
RETURNS NUMERIC(12,2) AS $$
DECLARE
    v_total NUMERIC(12,2);
BEGIN
    SELECT COALESCE(SUM(quantity * charged_price), 0.00)
    INTO v_total
    FROM service_usage
    WHERE reservation_id = p_reservation_id;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql;
