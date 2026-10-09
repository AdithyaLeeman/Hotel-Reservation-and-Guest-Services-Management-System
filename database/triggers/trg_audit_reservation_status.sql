CREATE OR REPLACE FUNCTION fn_trg_audit_reservation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id     UUID;
    v_employee_id BIGINT;
    v_reason      VARCHAR(255);
BEGIN
    -- Only capture genuine status transitions
    IF NEW.reservation_status = OLD.reservation_status THEN
        RETURN NEW;
    END IF;

    -- Read actor context from session variables (set by SP or route handler).
    -- current_setting() with missing_ok=true returns NULL (not '') when unset.
    -- NULL::UUID = NULL silently (no exception), so we COALESCE to the
    -- reservation owner as the safe fallback.
    BEGIN
        v_user_id := COALESCE(
            current_setting('app.current_user_id', true)::UUID,
            NEW.created_by_user_id
        );
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NEW.created_by_user_id;   -- fallback: reservation owner
    END;

    BEGIN
        v_employee_id := current_setting('app.current_employee_id', true)::BIGINT;
    EXCEPTION WHEN OTHERS THEN
        v_employee_id := NULL;
    END;

    BEGIN
        v_reason := current_setting('app.audit_reason', true);
    EXCEPTION WHEN OTHERS THEN
        v_reason := NULL;
    END;

    INSERT INTO reservation_audit_log (
        reservation_id,
        old_status,
        new_status,
        changed_at,
        changed_by_user_id,
        employee_id,
        change_reason
    ) VALUES (
        NEW.reservation_id,
        OLD.reservation_status,
        NEW.reservation_status,
        now(),
        v_user_id,
        v_employee_id,
        v_reason
    );

    RETURN NEW;
END;
$$;

-- -------------------------------------------------------------------------
-- Bind trigger to reservation table
-- -------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_reservation_status ON reservation;

CREATE TRIGGER trg_audit_reservation_status
    AFTER UPDATE OF reservation_status
    ON reservation
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_audit_reservation_status();

COMMENT ON TRIGGER trg_audit_reservation_status ON reservation IS
    'AFTER UPDATE trigger: logs every reservation_status change to '
    'reservation_audit_log. Actor attributed via app.current_user_id '
    'and app.current_employee_id session variables.';

COMMENT ON FUNCTION fn_trg_audit_reservation_status() IS
    'Trigger function backing trg_audit_reservation_status. '
    'SECURITY DEFINER - runs as owner to guarantee INSERT access to '
    'reservation_audit_log regardless of calling role.';
