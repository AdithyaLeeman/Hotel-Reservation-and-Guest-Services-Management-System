create or replace procedure sp_post_payment(
  p_invoice_id uuid,
  p_amount numeric(12,2),
  p_method varchar(50),
  p_transaction_reference varchar(100),
  p_paid_by_user_id uuid,
  p_employee_id bigint,
  out p_payment_id bigint
)
language plpgsql
as $$
declare
  v_outstanding_balance numeric(12,2);
  v_invoice_exists boolean;
begin
  if p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero; received %', p_amount
      using errcode = '22023';
  end if;

  select exists (
    select 1
    from billing_summary
    where invoice_id = p_invoice_id
  ) into v_invoice_exists;

  if not v_invoice_exists then
    raise exception 'Invoice % not found in billing_summary', p_invoice_id
      using errcode = '23503';
  end if;

  select outstanding_balance
  into v_outstanding_balance
  from vw_invoice_totals
  where invoice_id = p_invoice_id;

  if not found then
    raise exception 'Invoice % not found in vw_invoice_totals', p_invoice_id
      using errcode = '23503';
  end if;

  if p_amount > v_outstanding_balance then
    raise exception 'Payment amount % exceeds outstanding balance % for invoice %',
      p_amount, v_outstanding_balance, p_invoice_id
      using errcode = '45020';
  end if;

  insert into payment (
    invoice_id,
    amount_paid,
    payment_date,
    payment_method,
    processed_by_employee_id,
    paid_by_user_id,
    transaction_reference
  )
  values (
    p_invoice_id,
    p_amount,
    now(),
    p_method,
    p_employee_id,
    p_paid_by_user_id,
    p_transaction_reference
  )
  returning payment_id into p_payment_id;
end;
$$;