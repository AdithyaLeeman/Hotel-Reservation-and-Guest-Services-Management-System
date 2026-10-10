create or replace procedure sp_finalize_invoice(
  p_reservation_id uuid,
  out p_invoice_id uuid
)
language plpgsql
as $$
declare
  v_existing_invoice_id uuid;
  v_active_tax_id bigint;
  v_active_tax_pct numeric(5,2);
  v_res_status reservation_status;
begin
  select invoice_id
  into v_existing_invoice_id
  from billing_summary
  where reservation_id = p_reservation_id;

  if found then
    p_invoice_id := v_existing_invoice_id;
    return;
  end if;

  select reservation_status
  into v_res_status
  from reservation
  where reservation_id = p_reservation_id;

  if not found then
    raise exception 'Reservation % not found', p_reservation_id
      using errcode = '45040';
  end if;

  if v_res_status = 'Cancelled' then
    raise exception 'Cannot finalize invoice for a cancelled reservation (reservation_id=%)', p_reservation_id
      using errcode = '45041';
  end if;

  select tax_id, tax_percentage
  into v_active_tax_id, v_active_tax_pct
  from tax_policies
  where active = true
  order by tax_id desc
  limit 1;

  if not found then
    raise exception 'No active tax policy found in tax_policies'
      using errcode = '45042';
  end if;

  insert into billing_summary (
    reservation_id,
    tax_id,
    tax_percentage_applied,
    payment_status
  )
  values (
    p_reservation_id,
    v_active_tax_id,
    v_active_tax_pct,
    'Unpaid'
  )
  returning invoice_id into p_invoice_id;
end;
$$;

comment on procedure sp_finalize_invoice is
  'Create (or retrieve) the billing_summary invoice for a reservation. '
  'IDEMPOTENT: safe to call multiple times - returns existing invoice_id if one exists. '
  'Snapshots the active tax rate from tax_policies into billing_summary.tax_percentage_applied '
  'so future tax rate changes do not affect this invoice (Decision D005). '
  'SQLSTATE 45040 = reservation not found. '
  'SQLSTATE 45041 = reservation is Cancelled. '
  'SQLSTATE 45042 = no active tax policy found.';
