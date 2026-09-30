-- =============================================================================
-- Migration: P05-M05-T01-01_create_payment.sql
-- Owner:     Member 5 (Kabilraj K., 240304C)
-- Phase:     P5 — Payments, Checkout, and Reports
-- Depends:   P04-M05-T02 (billing_summary) — must be executed first
--            P01-M01-T08 (employee), P01-M01-T06 (user_account)
-- Execute:   After SP4.5 DB steps are DONE
-- Lecture:   L05 (DDL, constraints), L08 (idempotency via UNIQUE)
-- =============================================================================

-- payment
-- Individual payment records posted against a billing_summary invoice.
-- A reservation may have multiple partial payments until the balance reaches zero.
-- Idempotency is enforced by the UNIQUE constraint on transaction_reference (BR-12).
-- Business rule BR-14: amount_paid must be > 0 (no zero or negative payments).

CREATE TABLE IF NOT EXISTS payment (
    payment_id                  BIGINT                      NOT NULL GENERATED ALWAYS AS IDENTITY,
    invoice_id                  UUID                        NOT NULL,
    amount_paid                 NUMERIC(12,2)               NOT NULL,
    payment_date                TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT now(),
    payment_method              VARCHAR(50)                 NOT NULL,
    processed_by_employee_id    BIGINT,                              -- NULL for online/guest self-service payments
    paid_by_user_id             UUID                        NOT NULL,
    transaction_reference       VARCHAR(100),                        -- Idempotency key; must be unique when provided

    -- Primary key
    CONSTRAINT pk_payment PRIMARY KEY (payment_id),

    -- Business rule BR-14: no zero or negative payments
    CONSTRAINT chk_payment_amount_positive CHECK (amount_paid > 0),

    -- Business rule BR-12: duplicate transaction_reference must be rejected
    CONSTRAINT uq_payment_transaction_reference UNIQUE (transaction_reference),

    -- Foreign keys (all RESTRICT — payment rows must not be orphaned)

    -- FK to billing_summary (invoice this payment is against)
    CONSTRAINT fk_payment_invoice
        FOREIGN KEY (invoice_id)
        REFERENCES billing_summary(invoice_id)
        ON DELETE RESTRICT,

    -- FK to employee (staff who processed the payment; NULL for online payments)
    CONSTRAINT fk_payment_employee
        FOREIGN KEY (processed_by_employee_id)
        REFERENCES employee(employee_id)
        ON DELETE RESTRICT,

    -- FK to user_account (the user who made the payment — guest or staff acting on behalf)
    CONSTRAINT fk_payment_user
        FOREIGN KEY (paid_by_user_id)
        REFERENCES user_account(user_id)
        ON DELETE RESTRICT
);

-- Index: look up all payments for a specific invoice (primary read path in vw_invoice_totals)
CREATE INDEX IF NOT EXISTS idx_payment_invoice_id
    ON payment(invoice_id);

-- Index: filter payments by date range (used by vw_monthly_revenue and billing reports)
CREATE INDEX IF NOT EXISTS idx_payment_payment_date
    ON payment(payment_date DESC);

-- Index: filter by processor (staff audit — "all payments processed by employee X")
CREATE INDEX IF NOT EXISTS idx_payment_employee_id
    ON payment(processed_by_employee_id)
    WHERE processed_by_employee_id IS NOT NULL;

COMMENT ON TABLE payment IS
    'Individual payment records posted against a billing_summary invoice. '
    'A reservation may receive multiple partial payments. '
    'sp_post_payment() is the authoritative write path — never INSERT directly. '
    'Outstanding balance is computed by vw_invoice_totals, never stored here.';

COMMENT ON COLUMN payment.amount_paid IS
    'Amount of this payment in LKR. Must be > 0 (BR-14). '
    'Stored as NUMERIC(12,2) per the project money convention (docs/21, Section 3).';

COMMENT ON COLUMN payment.payment_method IS
    'Payment method string, e.g. ''Cash'', ''Credit Card'', ''Bank Transfer''. '
    'Not an enum — method options may expand without a schema migration.';

COMMENT ON COLUMN payment.processed_by_employee_id IS
    'Staff member who processed the payment. NULL for online/self-service payments '
    'made directly by the guest through the guest portal.';

COMMENT ON COLUMN payment.transaction_reference IS
    'Optional external idempotency key (e.g., payment gateway reference). '
    'When provided, the UNIQUE constraint prevents duplicate processing (BR-12). '
    'sp_post_payment() checks this before inserting.';
