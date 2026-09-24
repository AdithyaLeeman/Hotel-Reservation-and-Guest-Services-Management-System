# docs/09 — Database Routines, Triggers, Views, and Indexes

_Living inventory. Each entry documents: purpose, signature, inputs/outputs, tables touched, transaction ownership, isolation level, SQLSTATE codes, and lecture alignment._

---

## Naming Conventions
- Functions: `fn_` prefix
- Stored Procedures: `sp_` prefix
- Triggers: `trg_` prefix
- Views: `vw_` prefix
- Indexes: `idx_` prefix

---

## Functions

### `fn_get_available_rooms`
**Purpose:** Return rooms available for booking in a given branch and date range.
**File:** `database/routines/availability/fn_get_available_rooms.sql`
**Status:** TODO (P02-M02-T03)

```sql
-- Signature:
CREATE OR REPLACE FUNCTION fn_get_available_rooms(
  p_branch_id  BIGINT,
  p_check_in   DATE,
  p_check_out  DATE
) RETURNS TABLE (
  room_id       BIGINT,
  room_number   VARCHAR(10),
  type_id       BIGINT,
  type_name     VARCHAR(50),
  capacity      INT,
  daily_rate    NUMERIC(12,2),
  status        room_status
) LANGUAGE plpgsql;
```

**Overlap exclusion logic:**
```sql
-- Exclude rooms that have an active reservation overlapping the date range:
-- r.check_in_date < p_check_out AND r.check_out_date > p_check_in
-- AND r.reservation_status NOT IN ('Cancelled', 'CheckedOut')
```

**Tables:** `room`, `room_type`, `reservation`, `reservation_rooms`
**Transaction ownership:** Caller (read-only within caller's transaction)
**Isolation level:** Read Committed (default) — concurrency-safe when called with FOR UPDATE in sp_create_reservation
**Lecture alignment:** L08 (PL/pgSQL function), L05 (subquery, date overlap), L10 (index usage), L11 (EXPLAIN ANALYZE)

---

### `fn_calc_room_charges`
**Purpose:** Compute total room charges for a reservation from snapshotted rate_per_night.
**File:** `database/routines/billing-inputs/fn_calc_room_charges.sql`
**Status:** TODO (P04-M04-T08)

```sql
-- Signature:
CREATE OR REPLACE FUNCTION fn_calc_room_charges(
  p_reservation_id UUID
) RETURNS NUMERIC(12,2) LANGUAGE plpgsql;
```

**Formula:** `SUM(rr.rate_per_night * (r.check_out_date - r.check_in_date))`
**Tables:** `reservation_rooms`, `reservation`
**Returns:** `NUMERIC(12,2)` — 0.00 if no rooms found
**Lecture alignment:** L08 (function), L03 (SUM, arithmetic), L05 (JOIN)

---

### `fn_calc_service_charges`
**Purpose:** Compute total service charges for a reservation.
**File:** `database/routines/billing-inputs/fn_calc_service_charges.sql`
**Status:** TODO (P04-M04-T09)

```sql
-- Signature:
CREATE OR REPLACE FUNCTION fn_calc_service_charges(
  p_reservation_id UUID
) RETURNS NUMERIC(12,2) LANGUAGE plpgsql;
```

**Formula:** `SUM(su.charged_price * su.quantity)`
**Tables:** `service_usage`
**Returns:** `NUMERIC(12,2)` — 0.00 if no services
**Lecture alignment:** L08 (function), L03 (SUM), L05 (JOIN)

---

## Stored Procedures

### `sp_create_reservation`
**Purpose:** Atomically create a reservation with room allocation, checking for overlaps.
**File:** `database/routines/reservations/sp_create_reservation.sql`
**Status:** TODO (P03-M03-T03)

**Inputs:**
- `p_guest_id UUID`
- `p_branch_id BIGINT`
- `p_check_in DATE`
- `p_check_out DATE`
- `p_room_ids BIGINT[]`
- `p_booking_source booking_source`
- `p_employee_id BIGINT` (nullable — NULL for online)
- `p_discount_percentage NUMERIC(5,2)` (nullable)

**Output:** `p_reservation_id UUID OUT`

**Transaction:** Owned by this procedure (BEGIN / COMMIT / ROLLBACK)
**Isolation level:** Read Committed + row-level locking (`SELECT FOR UPDATE`)
**Concurrency:** Locks room rows before checking overlap; prevents race conditions
**SQLSTATE exceptions:**
- `'45001'` — room overlap conflict
- `'45002'` — room branch mismatch
- `'45003'` — room in Maintenance status

**Lecture alignment:** L08 (procedure, exception), L12 (FOR UPDATE, concurrency), L05 (transaction, FK)

---

### `sp_check_in`
**Purpose:** Atomically transition reservation to CheckedIn and update all rooms to Occupied.
**File:** `database/routines/checkin/sp_check_in.sql`
**Status:** TODO (P04-M04-T03)

**Inputs:** `p_reservation_id UUID`, `p_employee_id BIGINT`
**Output:** None
**Precondition:** `reservation_status = 'Booked'`
**SQLSTATE exceptions:**
- `'45010'` — reservation not in Booked status
**Lecture alignment:** L08, L05 (transaction, state transition), L12 (atomicity)

---

### `sp_log_service_usage`
**Purpose:** Record a service usage with a price snapshot from the catalogue.
**File:** `database/routines/checkin/sp_log_service_usage.sql`
**Status:** TODO (P04-M04-T05)

**Inputs:** `p_reservation_id UUID`, `p_room_id BIGINT`, `p_service_id BIGINT`, `p_quantity INT`, `p_employee_id BIGINT`
**Precondition:** `reservation_status = 'CheckedIn'`
**SQLSTATE exceptions:**
- `'45011'` — reservation not checked in
**Price snapshot:** Reads `service_catalogue.current_price` and writes to `service_usage.charged_price`
**Lecture alignment:** L08, L05 (snapshot, constraint enforcement)

---

### `sp_finalize_invoice`
**Purpose:** Create or retrieve the billing_summary record for a reservation, snapshotting the active tax rate.
**File:** `database/routines/billing/sp_finalize_invoice.sql`
**Status:** TODO (P04-M05-T03)

**Inputs:** `p_reservation_id UUID`
**Output:** `p_invoice_id UUID OUT`
**Idempotent:** Returns existing invoice_id if already created
**Lecture alignment:** L08, L05 (transaction), L12 (idempotency)

---

### `sp_post_payment`
**Purpose:** Record a payment against an invoice, with idempotency check via transaction_reference.
**File:** `database/routines/payments/sp_post_payment.sql`
**Status:** TODO (P05-M05-T02)

**Inputs:** `p_invoice_id UUID`, `p_amount NUMERIC(12,2)`, `p_method VARCHAR`, `p_reference VARCHAR`, `p_user_id UUID`, `p_employee_id BIGINT`
**SQLSTATE exceptions:**
- `'23505'` — duplicate transaction_reference (UNIQUE violation)
- `'45020'` — amount exceeds outstanding balance
**Lecture alignment:** L08, L05 (UNIQUE, transaction), L12

---

### `sp_checkout`
**Purpose:** Guard checkout (balance = 0), transition reservation to CheckedOut, release rooms to Available.
**File:** `database/routines/checkout/sp_checkout.sql`
**Status:** TODO (P05-M05-T05)

**Inputs:** `p_reservation_id UUID`, `p_employee_id BIGINT`
**SQLSTATE exceptions:**
- `'45030'` — outstanding balance > 0 (checkout blocked)
- `'45031'` — reservation not CheckedIn
**Lecture alignment:** L08, L05 (transaction, guard), L12 (balance check atomicity)

---

## Triggers

### `trg_audit_reservation_status`
**Purpose:** Log reservation status changes to an audit table.
**File:** `database/triggers/trg_audit_reservation_status.sql`
**Status:** TODO (design decision: audit table schema TBD)
**Fires:** AFTER UPDATE OF reservation_status ON reservation FOR EACH ROW
**Lecture alignment:** L08 (trigger, FOR EACH ROW)

---

## Views

### `vw_invoice_totals`
**Purpose:** Computes room charges, tax, service charges, grand total, total paid, and outstanding balance for every invoice. The authoritative source for all billing totals.
**File:** `database/views/vw_invoice_totals.sql`
**Status:** TODO (P04-M05-T04)

**Columns:**
| Column | Source |
|---|---|
| invoice_id | billing_summary.invoice_id |
| reservation_id | billing_summary.reservation_id |
| room_charges | fn_calc_room_charges() |
| tax_amount | room_charges × tax_percentage_applied / 100 |
| service_charges | fn_calc_service_charges() |
| grand_total | room_charges + tax_amount + service_charges |
| total_paid | SUM(payment.amount_paid) |
| outstanding_balance | grand_total - total_paid |

**Lecture alignment:** L05 (view), L03 (aggregation, arithmetic)

---

### `vw_room_occupancy`
**Purpose:** Room occupancy by date period for the occupancy report.
**File:** `database/views/vw_room_occupancy.sql`
**Status:** TODO (P05-M05-T07)
**Lecture alignment:** L05 (view), L03 (GROUP BY, COUNT)

---

### `vw_monthly_revenue`
**Purpose:** Revenue per branch per month (invoiced).
**File:** `database/views/vw_monthly_revenue.sql`
**Status:** TODO (P05-M05-T09)
**Lecture alignment:** L05 (view), L03 (GROUP BY month, SUM)

---

### `vw_guest_billing_summary`
**Purpose:** Guest billing with outstanding balance for the billing report.
**File:** `database/views/vw_guest_billing_summary.sql`
**Status:** TODO (P05-M05-T08)
**Lecture alignment:** L05, L03

---

### `vw_service_usage_breakdown`
**Purpose:** Service usage per room and service type for the usage breakdown report.
**File:** `database/views/vw_service_usage_breakdown.sql`
**Status:** TODO (P04-M04-T10)
**Lecture alignment:** L05 (view), L03 (GROUP BY, SUM)

---

## Indexes

### `idx_reservation_rooms_room_dates`
**Purpose:** Speed up availability overlap queries.
**File:** `database/indexes/idx_reservation_rooms_room_dates.sql`
**Status:** TODO (P02-M02-T09)
**Definition:**
```sql
CREATE INDEX idx_reservation_rooms_room_dates
  ON reservation_rooms (room_id)
  INCLUDE (reservation_id);
-- Combined with index on reservation(check_in_date, check_out_date, reservation_status)
```
**EXPLAIN ANALYZE:** Required — capture output after seeding test data.
**Lecture alignment:** L10 (indexing), L11 (EXPLAIN ANALYZE, query optimization)

### `idx_reservation_guest_id`
**Purpose:** Speed up guest My Reservations lookups.
**File:** `database/indexes/idx_reservation_guest_id.sql`
**Status:** TODO
```sql
CREATE INDEX idx_reservation_guest_id ON reservation (guest_id);
```
**Lecture alignment:** L10

### `idx_service_usage_reservation_id`
**Purpose:** Speed up service charge aggregation by reservation.
**File:** `database/indexes/idx_service_usage_reservation_id.sql`
**Status:** TODO
**Lecture alignment:** L10
