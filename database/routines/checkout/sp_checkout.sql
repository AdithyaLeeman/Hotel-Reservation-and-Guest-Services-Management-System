
CREATE OR REPLACE PROCEDURE sp_checkout(
    p_reservation_id UUID,
    p_employee_id    BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status              reservation_status;
    v_outstanding_balance NUMERIC(12, 2);
BEGIN
    -- 1. Check reservation exists and retrieve current status
    SELECT reservation_status
    INTO   v_status
    FROM   reservation
    WHERE  reservation_id = p_reservation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation % not found', p_reservation_id
            USING ERRCODE = '23503';
    END IF;

    -- 2. State guard: must be in 'CheckedIn' status to check out (BR-08)
    IF v_status != 'CheckedIn' THEN
        RAISE EXCEPTION 'Reservation % cannot be checked out - current status is %',
            p_reservation_id, v_status
            USING ERRCODE = '45031';
    END IF;

    -- 3. Balance guard: read outstanding balance from vw_invoice_totals (BR-08)
    SELECT outstanding_balance
    INTO   v_outstanding_balance
    FROM   vw_invoice_totals
    WHERE  reservation_id = p_reservation_id;

    IF FOUND AND v_outstanding_balance > 0 THEN
        RAISE EXCEPTION 'Reservation % has outstanding balance of %; checkout blocked',
            p_reservation_id, v_outstanding_balance
            USING ERRCODE = '45030';
    END IF;

    -- 4. Set session employee context for trg_audit_reservation_status
    IF p_employee_id IS NOT NULL THEN
        PERFORM set_config('app.current_employee_id', p_employee_id::text, true);
    END IF;

    -- 5. Transition reservation status to 'CheckedOut'
    UPDATE reservation
    SET reservation_status       = 'CheckedOut',
        processed_by_employee_id = p_employee_id
    WHERE reservation_id = p_reservation_id;

    -- 6. Release all assigned rooms back to 'Available' atomically (BR-10)
    UPDATE room
    SET status = 'Available'
    WHERE room_id IN (
        SELECT room_id
        FROM   reservation_rooms
        WHERE  reservation_id = p_reservation_id
    );

    -- 7. Ensure invoice payment_status is marked 'Paid' if billing record exists
    UPDATE billing_summary
    SET payment_status = 'Paid'
    WHERE reservation_id = p_reservation_id
      AND payment_status != 'Paid';

END;
$$;