-- =============================================================================
-- Routine:   sp_log_service_usage.sql
-- Owner:     Member 4
-- Phase:     P4 — Stay Services and Billing
-- Task:      P04-M04-T05
-- =============================================================================

CREATE OR REPLACE PROCEDURE sp_log_service_usage(
    p_reservation_id UUID,
    p_room_id BIGINT,
    p_service_id BIGINT,
    p_quantity INT,
    p_logged_by_employee_id BIGINT,
    p_request_channel VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status reservation_status;
    v_service_status service_catalogue_status;
    v_current_price DECIMAL(12, 2);
BEGIN
    -- Validate quantity
    IF p_quantity < 1 THEN
        RAISE EXCEPTION 'Quantity must be at least 1' USING ERRCODE = '22023';
    END IF;

    -- Check if reservation exists and get its status
    SELECT reservation_status INTO v_status
    FROM reservation
    WHERE reservation_id = p_reservation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation % not found', p_reservation_id USING ERRCODE = '23503';
    END IF;

    -- Ensure reservation is in CheckedIn status
    IF v_status != 'CheckedIn' THEN
        RAISE EXCEPTION 'Reservation % must be CheckedIn to log service usage', p_reservation_id USING ERRCODE = '45011';
    END IF;

    -- Check if room is part of the reservation
    IF NOT EXISTS (
        SELECT 1 
        FROM reservation_rooms 
        WHERE reservation_id = p_reservation_id 
          AND room_id = p_room_id
    ) THEN
        RAISE EXCEPTION 'Room % does not belong to reservation %', p_room_id, p_reservation_id USING ERRCODE = '23503';
    END IF;

    -- Get service catalogue details
    SELECT status, current_price INTO v_service_status, v_current_price
    FROM service_catalogue
    WHERE service_id = p_service_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service % not found', p_service_id USING ERRCODE = '23503';
    END IF;

    -- Ensure service is active
    IF v_service_status != 'Active' THEN
        RAISE EXCEPTION 'Service % is inactive', p_service_id USING ERRCODE = '45012';
    END IF;

    -- Log service usage, snapshotting the current price
    INSERT INTO service_usage (
        room_id,
        reservation_id,
        service_id,
        quantity,
        charged_price,
        logged_by_employee_id,
        request_channel
    ) VALUES (
        p_room_id,
        p_reservation_id,
        p_service_id,
        p_quantity,
        v_current_price,
        p_logged_by_employee_id,
        p_request_channel
    );
END;
$$;
