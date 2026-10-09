CREATE TABLE IF NOT EXISTS billing_summary (
    invoice_id              UUID                        NOT NULL DEFAULT gen_random_uuid(),
    reservation_id          UUID                        NOT NULL,
    invoice_date            TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT now(),
    tax_id                  BIGINT                      NOT NULL,
    tax_percentage_applied  NUMERIC(5,2)                NOT NULL,
    payment_status          payment_status              NOT NULL DEFAULT 'Unpaid',

    CONSTRAINT pk_billing_summary PRIMARY KEY (invoice_id),

    CONSTRAINT uq_billing_summary_reservation UNIQUE (reservation_id),

    CONSTRAINT chk_billing_tax_percentage_non_negative CHECK (tax_percentage_applied >= 0),

    CONSTRAINT fk_billing_summary_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES reservation(reservation_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_billing_summary_tax
        FOREIGN KEY (tax_id)
        REFERENCES tax_policies(tax_id)
        ON DELETE RESTRICT
);

-- Index: look up the invoice for a reservation (primary read path)
CREATE INDEX IF NOT EXISTS idx_billing_summary_reservation_id
    ON billing_summary(reservation_id);

-- Index: filter invoices by date range (used by vw_monthly_revenue, billing reports)
CREATE INDEX IF NOT EXISTS idx_billing_summary_invoice_date
    ON billing_summary(invoice_date DESC);

-- Index: filter by payment_status (Unpaid / PartiallyPaid / Paid - used in billing reports)
CREATE INDEX IF NOT EXISTS idx_billing_summary_payment_status
    ON billing_summary(payment_status);

COMMENT ON TABLE billing_summary IS
    'One stored invoice record per reservation. '
    'Created by sp_finalize_invoice() which snapshots the active tax rate. '
    'Monetary totals are NOT stored here - they are computed by vw_invoice_totals '
    'using fn_calc_room_charges(), fn_calc_service_charges(), and SUM(payment.amount_paid). '
    'Decision D006: billing_summary is a stored table; vw_invoice_totals computes running totals.';

COMMENT ON COLUMN billing_summary.invoice_id IS
    'UUID primary key for the invoice. Used as FK target in the payment table.';

COMMENT ON COLUMN billing_summary.reservation_id IS
    'FK to reservation. UNIQUE constraint enforces one invoice per reservation.';

COMMENT ON COLUMN billing_summary.tax_percentage_applied IS
    'Snapshot of the tax rate at invoice creation time (from tax_policies). '
    'Stored here so historical invoices remain accurate even if the tax rate changes later. '
    'Applied to room_charges only (Decision D005).';

COMMENT ON COLUMN billing_summary.payment_status IS
    'Denormalized payment status. Updated by sp_post_payment() each time a payment is made. '
    'Authoritative balance is always in vw_invoice_totals.outstanding_balance.';