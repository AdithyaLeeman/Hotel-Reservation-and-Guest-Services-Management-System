
CREATE OR REPLACE VIEW vw_monthly_revenue AS
SELECT
    b.branch_id,
    b.location_name                                     AS branch_name,
    EXTRACT(YEAR FROM bs.invoice_date)::INT            AS revenue_year,
    EXTRACT(MONTH FROM bs.invoice_date)::INT           AS revenue_month,
    TO_CHAR(DATE_TRUNC('month', bs.invoice_date), 'FMMonth YYYY') AS period_label,
    COUNT(bs.invoice_id)::INT                          AS total_invoices,
    SUM(it.room_charges)                               AS room_revenue,
    SUM(it.service_charges)                            AS service_revenue,
    SUM(it.tax_amount)                                 AS tax_collected,
    SUM(it.grand_total)                                AS total_revenue,
    SUM(it.total_paid)                                 AS total_paid,
    SUM(it.outstanding_balance)                         AS total_outstanding
FROM billing_summary bs
JOIN reservation r ON r.reservation_id = bs.reservation_id
JOIN branch b ON b.branch_id = r.branch_id
JOIN vw_invoice_totals it ON it.invoice_id = bs.invoice_id
GROUP BY
    b.branch_id,
    b.location_name,
    EXTRACT(YEAR FROM bs.invoice_date),
    EXTRACT(MONTH FROM bs.invoice_date),
    DATE_TRUNC('month', bs.invoice_date)
ORDER BY
    revenue_year DESC,
    revenue_month DESC,
    b.branch_id ASC;

COMMENT ON VIEW vw_monthly_revenue IS
    'Monthly revenue per branch aggregated by invoice_date on an accrual basis. '
    'Includes total invoices, room revenue, service revenue, tax, total revenue, '
    'paid amounts, and outstanding balance.';