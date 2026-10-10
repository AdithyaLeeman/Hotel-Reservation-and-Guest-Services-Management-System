create or replace view vw_guest_billing_summary as
select
  g.guest_id,
  g.full_name as guest_name,
  g.email,
  g.phone,
  r.reservation_id,
  r.branch_id,
  b.location_name as branch_name,
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
from billing_summary bs
join reservation r on r.reservation_id = bs.reservation_id
join guest g on g.guest_id = r.guest_id
join branch b on b.branch_id = r.branch_id
join vw_invoice_totals it on it.invoice_id = bs.invoice_id
order by bs.invoice_date desc, r.check_in_date desc;

comment on view vw_guest_billing_summary is
  'Guest billing summary report view including room charges, service charges, '
  'taxes, grand total, amount paid, and outstanding balance per reservation. '
  'Authoritative view for management billing reporting.';