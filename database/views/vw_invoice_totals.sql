CREATE OR REPLACE VIEW vw_invoice_totals AS
SELECT
    bs.invoice_id,
    bs.reservation_id,
    bs.invoice_date,
    bs.tax_id,
    bs.tax_percentage_applied,
    bs.payment_status,

    -- Room charges: rate_per_night × nights, summed across all rooms in reservation
    fn_calc_room_charges(bs.reservation_id)                             AS room_charges,

    -- Tax amount: applied to room charges only (Decision D005)
    ROUND(
        fn_calc_room_charges(bs.reservation_id)
        * bs.tax_percentage_applied / 100.0,
        2
    )                                                                   AS tax_amount,

    -- Service charges: SUM(quantity × charged_price) across all service_usage rows
    fn_calc_service_charges(bs.reservation_id)                         AS service_charges,

    -- Grand total: room charges + tax + service charges
    fn_calc_room_charges(bs.reservation_id)
    + ROUND(
        fn_calc_room_charges(bs.reservation_id)
        * bs.tax_percentage_applied / 100.0,
        2
    )
    + fn_calc_service_charges(bs.reservation_id)                       AS grand_total,

    -- Total paid: sum of all payment records against this invoice (0.00 if none)
    COALESCE((
        SELECT SUM(p.amount_paid)
        FROM payment p
        WHERE p.invoice_id = bs.invoice_id
    ), 0.00)                                                            AS total_paid,

    -- Outstanding balance: grand_total - total_paid
    (
        fn_calc_room_charges(bs.reservation_id)
        + ROUND(
            fn_calc_room_charges(bs.reservation_id)
            * bs.tax_percentage_applied / 100.0,
            2
        )
        + fn_calc_service_charges(bs.reservation_id)
    )
    - COALESCE((
        SELECT SUM(p.amount_paid)
        FROM payment p
        WHERE p.invoice_id = bs.invoice_id
    ), 0.00)                                                            AS outstanding_balance

FROM billing_summary bs;

COMMENT ON VIEW vw_invoice_totals IS
    'Authoritative billing totals view. Computes room_charges, tax_amount (room only, D005), '
    'service_charges, grand_total, total_paid (SUM of payment rows), and outstanding_balance '
    'for every billing_summary record. '
    'All monetary values are computed here - NEVER in TypeScript. '
    'sp_checkout() reads outstanding_balance from this view inside its transaction.';
