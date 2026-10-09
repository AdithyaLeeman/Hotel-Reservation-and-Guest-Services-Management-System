-- =============================================================================
-- Migration: P03-M03-T01-01_create_reservation.sql
-- Owner:     Member 3 (Hiripitiya S.K., 240238C)
-- Phase:     P3 - Guests and Reservations
-- Depends:   P01-M01-T09 (guest), P01-M01-T07 (branch), P01-M01-T08 (employee)
--            P01-M01-T06 (user_account) - all must be executed first
-- Execute:   After SP1.2 + SP2.1 DB steps are DONE
-- Lecture:   L05 (DDL, constraints), L12 (concurrency context)
-- =============================================================================

-- reservation
-- A guest's reservation record. May span multiple rooms (see reservation_rooms).
-- All rooms in a reservation must belong to the same branch_id.
-- Overlap prevention enforced by sp_create_reservation() using SELECT FOR UPDATE.

CREATE TABLE IF NOT EXISTS reservation (
    reservation_id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    guest_id                    UUID            NOT NULL,
    branch_id                   BIGINT          NOT NULL,
    check_in_date               DATE            NOT NULL,
    check_out_date              DATE            NOT NULL,
    reservation_status          reservation_status NOT NULL DEFAULT 'Booked',
    discount_percentage         NUMERIC(5,2)    CHECK (discount_percentage >= 0 AND discount_percentage < 100),
    processed_by_employee_id    BIGINT,
    created_by_user_id          UUID            NOT NULL,
    booking_source              booking_source  NOT NULL,
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- Primary key
    CONSTRAINT pk_reservation PRIMARY KEY (reservation_id),

    -- Business rule: check-out must be strictly after check-in
    CONSTRAINT chk_reservation_dates CHECK (check_out_date > check_in_date),

    -- Foreign keys
    CONSTRAINT fk_reservation_guest
        FOREIGN KEY (guest_id) REFERENCES guest(guest_id) ON DELETE RESTRICT,

    CONSTRAINT fk_reservation_branch
        FOREIGN KEY (branch_id) REFERENCES branch(branch_id) ON DELETE RESTRICT,

    CONSTRAINT fk_reservation_employee
        FOREIGN KEY (processed_by_employee_id) REFERENCES employee(employee_id) ON DELETE RESTRICT,

    CONSTRAINT fk_reservation_user
        FOREIGN KEY (created_by_user_id) REFERENCES user_account(user_id) ON DELETE RESTRICT
);

-- Index: speed up guest's "My Reservations" queries
CREATE INDEX IF NOT EXISTS idx_reservation_guest_id
    ON reservation(guest_id);

-- Index: speed up branch-scoped staff queries and availability checks
CREATE INDEX IF NOT EXISTS idx_reservation_branch_id
    ON reservation(branch_id);

-- Index: speed up overlap detection by date range
CREATE INDEX IF NOT EXISTS idx_reservation_dates
    ON reservation(check_in_date, check_out_date);

-- Index: filter by status (common pattern in reports and availability checks)
CREATE INDEX IF NOT EXISTS idx_reservation_status
    ON reservation(reservation_status);

COMMENT ON TABLE reservation IS
    'Guest reservation header. Rooms are in reservation_rooms. '
    'All overlap and branch-validation logic lives in sp_create_reservation().';

COMMENT ON COLUMN reservation.discount_percentage IS
    'Optional discount applied at reservation time. NULL = no discount. '
    'Used by vw_invoice_totals for grand total calculation.';

COMMENT ON COLUMN reservation.booking_source IS
    'Origin of the reservation: Online (guest self-service), Reception or Phone (staff-created).';
