-- =============================================================================
-- Routine:   sp_cancel_reservation.sql
-- Owner:     Member 3 (Hiripitiya S.K., 240238C)
-- Task:      P03-M03-T05
-- Depends:   SP3.1 executed (reservation table exists)
-- Lecture:   L05 (stored procedures), L08 (procedures)
-- =============================================================================
--
-- PURPOSE:
--   Cancel a reservation by setting reservation_status = 'Cancelled'.
--   Guards:
--     - Only reservations with status 'Booked' can be cancelled (not CheckedIn/Out)
--     - Guest ownership enforced when p_guest_id is NOT NULL
--     - Staff can cancel any 'Booked' reservation (pass p_guest_id = NULL)
--
-- INPUTS:
--   p_reservation_id  UUID    — the reservation to cancel
--   p_guest_id        UUID    — NULL = staff actor (no ownership check)
--                               non-NULL = guest actor (ownership enforced)
--   p_cancelled_by    UUID    — user_id of actor (for audit trail)
--
-- SQLSTATE CODES:
--   45010 — Reservation is not in 'Booked' status (cannot cancel)
--   P0002 — Reservation not found (or ownership mismatch for guests)
--
-- TRANSACTION: Caller must wrap in BEGIN/COMMIT if needed.
--   This procedure does NOT issue COMMIT/ROLLBACK.
-- =============================================================================

CREATE OR REPLACE PROCEDURE sp_cancel_reservation(
    IN p_reservation_id UUID,
    IN p_guest_id       UUID,   -- NULL for staff; non-NULL for guest (ownership check)
    IN p_cancelled_by   UUID    -- user_id of the actor performing the cancellation
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_status reservation_status;
    v_owner_guest_id UUID;
BEGIN
    -- Fetch current status and owner, locking the row against concurrent changes
    SELECT reservation_status, guest_id
      INTO v_current_status, v_owner_guest_id
      FROM reservation
     WHERE reservation_id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation % not found', p_reservation_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Guest ownership check: if p_guest_id provided, must match
    IF p_guest_id IS NOT NULL AND v_owner_guest_id <> p_guest_id THEN
        -- Return same "not found" to prevent information leakage
        RAISE EXCEPTION 'Reservation % not found', p_reservation_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Status guard: only 'Booked' reservations can be cancelled
    IF v_current_status <> 'Booked' THEN
        RAISE EXCEPTION
            'Reservation % cannot be cancelled — current status is %',
            p_reservation_id, v_current_status
            USING ERRCODE = '45010';
    END IF;

    -- Perform the cancellation
    UPDATE reservation
       SET reservation_status = 'Cancelled'
     WHERE reservation_id = p_reservation_id;

END;
$$;

COMMENT ON PROCEDURE sp_cancel_reservation IS
    'Cancel a reservation. Only ''Booked'' reservations can be cancelled. '
    'Enforces guest ownership when p_guest_id is provided. '
    'SQLSTATE 45010 = wrong status; P0002 = not found / ownership mismatch.';
