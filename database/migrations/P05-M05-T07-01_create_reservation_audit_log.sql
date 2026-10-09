
CREATE TABLE IF NOT EXISTS reservation_audit_log (
    audit_id            BIGINT                   NOT NULL GENERATED ALWAYS AS IDENTITY,
    reservation_id      UUID                     NOT NULL,
    old_status          reservation_status       NOT NULL,
    new_status          reservation_status       NOT NULL,
    changed_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    changed_by_user_id  UUID                     NOT NULL,
    employee_id         BIGINT,                           -- NULL for guest-initiated changes (e.g., cancellation via portal)
    change_reason       VARCHAR(255),                     -- Optional free-text note (set via session variable by stored procedures)

    -- Primary key
    CONSTRAINT pk_reservation_audit_log PRIMARY KEY (audit_id),

    -- Foreign keys (RESTRICT - audit rows must not be orphaned)
    CONSTRAINT fk_audit_log_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservation(reservation_id) ON DELETE RESTRICT,

    CONSTRAINT fk_audit_log_user
        FOREIGN KEY (changed_by_user_id) REFERENCES user_account(user_id) ON DELETE RESTRICT,

    CONSTRAINT fk_audit_log_employee
        FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE RESTRICT,

    -- Integrity: old and new status must differ (a no-op UPDATE should not produce a row)
    CONSTRAINT chk_audit_log_status_changed CHECK (old_status <> new_status)
);

-- Index: look up all audit entries for a specific reservation (primary access pattern)
CREATE INDEX IF NOT EXISTS idx_audit_log_reservation_id
    ON reservation_audit_log (reservation_id);

-- Index: chronological ordering and time-range report queries
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at
    ON reservation_audit_log (changed_at DESC);

-- Index: filter by actor (admin audit - "all changes made by employee X")
CREATE INDEX IF NOT EXISTS idx_audit_log_employee_id
    ON reservation_audit_log (employee_id)
    WHERE employee_id IS NOT NULL;

COMMENT ON TABLE reservation_audit_log IS
    'Append-only audit trail for reservation status changes. '
    'Populated exclusively by trg_audit_reservation_status. '
    'Never UPDATE or DELETE rows in this table.';

COMMENT ON COLUMN reservation_audit_log.employee_id IS
    'Staff member who performed the action. NULL for guest-initiated status changes '
    '(e.g., online cancellation through the guest portal).';

COMMENT ON COLUMN reservation_audit_log.change_reason IS
    'Optional human-readable reason for the status change. '
    'Set via app.audit_reason session variable by stored procedures before UPDATE.';