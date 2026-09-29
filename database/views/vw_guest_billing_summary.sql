
CREATE OR REPLACE VIEW vw_guest_billing_summary AS
SELECT
    g.guest_id,
    g.full_name                         AS guest_name,
    g.email,
    g.phone,
    r.reservation_id,
    r.branch_id,
    b.location_name                     AS branch_name,
    r.check_in_date,
    r.check_out_date,
    r.reservation_status,
    bs.invoice_id,
    bs.invoice_date,
    bs.payment_status,
    it.room_charges,
    it.service_charges,
    it.tax_amount,
    it.grand_total,
    it.total_paid,
    it.outstanding_balance
FROM billing_summary bs
JOIN reservation r ON r.reservation_id = bs.reservation_id
JOIN guest g ON g.guest_id = r.guest_id
JOIN branch b ON b.branch_id = r.branch_id
JOIN vw_invoice_totals it ON it.invoice_id = bs.invoice_id
ORDER BY bs.invoice_date DESC, r.check_in_date DESC;

COMMENT ON VIEW vw_guest_billing_summary IS
    'Guest billing summary report view including room charges, service charges, '
    'taxes, grand total, amount paid, and outstanding balance per reservation. '
    'Authoritative view for management billing reporting.';