create or replace view vw_monthly_revenue as
select
  b.branch_id,
  b.location_name as branch_name,
  extract(year from bs.invoice_date)::int as revenue_year,
  extract(month from bs.invoice_date)::int as revenue_month,
  to_char(date_trunc('month', bs.invoice_date), 'FMMonth YYYY') as period_label,
  count(bs.invoice_id)::int as total_invoices,
  sum(it.room_charges) as room_revenue,
  sum(it.service_charges) as service_revenue,
  sum(it.tax_amount) as tax_collected,
  sum(it.grand_total) as total_revenue,
  sum(it.total_paid) as total_paid,
  sum(it.outstanding_balance) as total_outstanding
from billing_summary bs
join reservation r on r.reservation_id = bs.reservation_id
join branch b on b.branch_id = r.branch_id
join vw_invoice_totals it on it.invoice_id = bs.invoice_id
group by
  b.branch_id,
  b.location_name,
  extract(year from bs.invoice_date),
  extract(month from bs.invoice_date),
  date_trunc('month', bs.invoice_date)
order by
  revenue_year desc,
  revenue_month desc,
  b.branch_id asc;

comment on view vw_monthly_revenue is
  'Monthly revenue per branch aggregated by invoice_date on an accrual basis. '
  'Includes total invoices, room revenue, service revenue, tax, total revenue, '
  'paid amounts, and outstanding balance.';