-- =============================================================================
-- Routine:   fn_calc_room_charges.sql
-- Owner:     Member 4
-- Phase:     P4 - Stay Services and Billing
-- Task:      P04-M04-T06
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_calc_room_charges(p_reservation_id UUID)
RETURNS NUMERIC(12,2) AS $$
DECLARE
    v_total NUMERIC(12,2);
BEGIN
    SELECT COALESCE(SUM(rr.rate_per_night * (r.check_out_date - r.check_in_date)), 0.00)
    INTO v_total
    FROM reservation r
    JOIN reservation_rooms rr ON r.reservation_id = rr.reservation_id
    WHERE r.reservation_id = p_reservation_id;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql;
