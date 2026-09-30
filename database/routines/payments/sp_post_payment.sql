CREATE OR REPLACE PROCEDURE sp_post_payment(
    p_invoice_id              UUID,
    p_amount                  NUMERIC(12, 2),
    p_method                  VARCHAR(50),
    p_transaction_reference   VARCHAR(100),
    p_paid_by_user_id         UUID,
    p_employee_id             BIGINT,
    OUT p_payment_id          BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_outstanding_balance  NUMERIC(12, 2);
    v_invoice_exists       BOOLEAN;
BEGIN

    IF p_amount <= 0 THEN
        RAISE EXCEPTION
            'Payment amount must be greater than zero; received %', p_amount
            USING ERRCODE = '22023';  
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM   billing_summary
        WHERE  invoice_id = p_invoice_id
    ) INTO v_invoice_exists;

    IF NOT v_invoice_exists THEN
        RAISE EXCEPTION
            'Invoice % not found in billing_summary', p_invoice_id
            USING ERRCODE = '23503';
    END IF;

    SELECT outstanding_balance
    INTO   v_outstanding_balance
    FROM   vw_invoice_totals
    WHERE  invoice_id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Invoice % not found in vw_invoice_totals', p_invoice_id
            USING ERRCODE = '23503';
    END IF;

    IF p_amount > v_outstanding_balance THEN
        RAISE EXCEPTION
            'Payment amount % exceeds outstanding balance % for invoice %',
            p_amount, v_outstanding_balance, p_invoice_id
            USING ERRCODE = '45020';
    END IF;

    INSERT INTO payment (
        invoice_id,
        amount_paid,
        payment_date,
        payment_method,
        processed_by_employee_id,
        paid_by_user_id,
        transaction_reference
    )
    VALUES (
        p_invoice_id,
        p_amount,
        now(),
        p_method,
        p_employee_id,           
        p_paid_by_user_id,
        p_transaction_reference   
    )
    RETURNING payment_id INTO p_payment_id;

END;
$$;