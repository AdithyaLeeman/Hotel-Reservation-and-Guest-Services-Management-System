CREATE OR REPLACE PROCEDURE sp_finalize_invoice(
    p_reservation_id    UUID,
    OUT p_invoice_id    UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_existing_invoice_id   UUID;
    v_active_tax_id         BIGINT;
    v_active_tax_pct        NUMERIC(5,2);
    v_res_status            reservation_status;
BEGIN
    -- ── 1. Check if invoice already exists (idempotency) ─────────────────────
    SELECT invoice_id
    INTO v_existing_invoice_id
    FROM billing_summary
    WHERE reservation_id = p_reservation_id;

    IF FOUND THEN
        -- Invoice already created — return existing id, no changes made
        p_invoice_id := v_existing_invoice_id;
        RETURN;
    END IF;

    -- ── 2. Validate reservation exists and is in an invoiceable state ─────────
    SELECT reservation_status
    INTO v_res_status
    FROM reservation
    WHERE reservation_id = p_reservation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation % not found', p_reservation_id
            USING ERRCODE = '45040';
    END IF;

    IF v_res_status = 'Cancelled' THEN
        RAISE EXCEPTION 'Cannot finalize invoice for a cancelled reservation (reservation_id=%)', p_reservation_id
            USING ERRCODE = '45041';
    END IF;

    SELECT tax_id, tax_percentage
    INTO v_active_tax_id, v_active_tax_pct
    FROM tax_policies
    WHERE active = true
    ORDER BY tax_id DESC  -- take the most recently inserted active policy
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active tax policy found in tax_policies'
            USING ERRCODE = '45042';
    END IF;

    INSERT INTO billing_summary (
        reservation_id,
        tax_id,
        tax_percentage_applied,
        payment_status
    )
    VALUES (
        p_reservation_id,
        v_active_tax_id,
        v_active_tax_pct,
        'Unpaid'
    )
    RETURNING invoice_id INTO p_invoice_id;

END;
$$;

COMMENT ON PROCEDURE sp_finalize_invoice IS
    'Create (or retrieve) the billing_summary invoice for a reservation. '
    'IDEMPOTENT: safe to call multiple times — returns existing invoice_id if one exists. '
    'Snapshots the active tax rate from tax_policies into billing_summary.tax_percentage_applied '
    'so future tax rate changes do not affect this invoice (Decision D005). '
    'SQLSTATE 45040 = reservation not found. '
    'SQLSTATE 45041 = reservation is Cancelled. '
    'SQLSTATE 45042 = no active tax policy found.';