create or replace view vw_invoice_totals as
select
  bs.invoice_id,
  bs.reservation_id,
  bs.invoice_date,
  bs.tax_id,
  bs.tax_percentage_applied,
  bs.payment_status,
  fn_calc_room_charges(bs.reservation_id) as room_charges,
  round(
    fn_calc_room_charges(bs.reservation_id) * bs.tax_percentage_applied / 100.0,
    2
  ) as tax_amount,
  fn_calc_service_charges(bs.reservation_id) as service_charges,
  fn_calc_room_charges(bs.reservation_id)
  + round(
    fn_calc_room_charges(bs.reservation_id) * bs.tax_percentage_applied / 100.0,
    2
  )
  + fn_calc_service_charges(bs.reservation_id) as grand_total,
  coalesce((
    select sum(p.amount_paid)
    from payment p
    where p.invoice_id = bs.invoice_id
  ), 0.00) as total_paid,
  (
    fn_calc_room_charges(bs.reservation_id)
    + round(
      fn_calc_room_charges(bs.reservation_id) * bs.tax_percentage_applied / 100.0,
      2
    )
    + fn_calc_service_charges(bs.reservation_id)
  )
  - coalesce((
    select sum(p.amount_paid)
    from payment p
    where p.invoice_id = bs.invoice_id
  ), 0.00) as outstanding_balance
from billing_summary bs;

comment on view vw_invoice_totals is
  'Authoritative billing totals view. Computes room_charges, tax_amount (room only, D005), '
  'service_charges, grand_total, total_paid (SUM of payment rows), and outstanding_balance '
  'for every billing_summary record. '
  'All monetary values are computed here - NEVER in TypeScript. '
  'sp_checkout() reads outstanding_balance from this view inside its transaction.';
