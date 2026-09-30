-- =============================================================================
-- Routine:   sp_check_in.sql
-- Owner:     Member 4
-- Phase:     P4 — Stay Services and Billing
-- Task:      P04-M04-T04
-- =============================================================================

CREATE OR REPLACE PROCEDURE sp_check_in(
    p_reservation_id UUID,
    p_employee_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status reservation_status;
    v_maintenance_count INTEGER;
BEGIN
    -- Check if reservation exists and get its status
    SELECT reservation_status INTO v_status
    FROM reservation
    WHERE reservation_id = p_reservation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation % not found', p_reservation_id USING ERRCODE = '23503';
    END IF;

    -- Ensure reservation is in 'Booked' status
    IF v_status != 'Booked' THEN
        RAISE EXCEPTION 'Reservation % cannot be checked in - current status is %', p_reservation_id, v_status USING ERRCODE = '45010';
    END IF;

    -- Check if any of the assigned rooms are in 'Maintenance'
    SELECT count(*) INTO v_maintenance_count
    FROM reservation_rooms rr
    JOIN room r ON rr.room_id = r.room_id
    WHERE rr.reservation_id = p_reservation_id
      AND r.status = 'Maintenance';

    IF v_maintenance_count > 0 THEN
        RAISE EXCEPTION 'Cannot check-in. One or more reserved rooms are in Maintenance.' USING ERRCODE = '45003';
    END IF;

    -- Update reservation status to 'CheckedIn'
    UPDATE reservation
    SET reservation_status = 'CheckedIn',
        processed_by_employee_id = p_employee_id
    WHERE reservation_id = p_reservation_id;

    -- Update room statuses to 'Occupied'
    UPDATE room
    SET status = 'Occupied'
    WHERE room_id IN (
        SELECT room_id 
        FROM reservation_rooms 
        WHERE reservation_id = p_reservation_id
    );
END;
$$;
