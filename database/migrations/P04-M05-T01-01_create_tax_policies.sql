CREATE TABLE IF NOT EXISTS tax_policies (
    tax_id          BIGINT          NOT NULL GENERATED ALWAYS AS IDENTITY,
    tax_name        VARCHAR(100)    NOT NULL,
    tax_percentage  NUMERIC(5,2)    NOT NULL,
    active          BOOLEAN         NOT NULL DEFAULT true,

    -- Primary key
    CONSTRAINT pk_tax_policies PRIMARY KEY (tax_id),

    -- Tax percentage must be non-negative
    CONSTRAINT chk_tax_percentage_non_negative CHECK (tax_percentage >= 0)
);

COMMENT ON TABLE tax_policies IS
    'Tax rate policies applied to room charges at invoice finalization time. '
    'Decision D005: tax applies to room charges only, not service charges. '
    'The active=true record is the currently applicable rate. '
    'tax_percentage_applied is snapshotted into billing_summary so old invoices '
    'are unaffected by future rate changes.';

COMMENT ON COLUMN tax_policies.tax_percentage IS
    'Tax rate as a percentage (e.g., 8.00 means 8%). '
    'Applied only to room_charges per decision D005. '
    'tax_amount = room_charges x tax_percentage / 100.';

COMMENT ON COLUMN tax_policies.active IS
    'True for the currently applicable rate. '
    'sp_finalize_invoice() selects the row WHERE active = true. '
    'Only one record should be active at a time.';