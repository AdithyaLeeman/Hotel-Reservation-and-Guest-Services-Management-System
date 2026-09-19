# docs/08 — Business Rules and Enforcement

## DB-First Computation Mandate
All authoritative calculations must be in PostgreSQL. TypeScript must not recompute any value that the DB already provides. See `AGENTS.md` Section 5 for the full rule.

## Business Rules

### BR-01 — No Double Booking
**Source:** Project brief, SRS REQ-4.1.2
**Rule:** No two active reservations may share the same room_id with overlapping date ranges.
**Enforcement:**
- UI: client-side date validation (convenience only)
- Server: Zod validates date range shape
- **DB (authoritative):** `sp_create_reservation()` uses `SELECT ... FOR UPDATE` on room records, then checks for overlapping reservations before inserting. Raises SQLSTATE exception if overlap found.
**Notes:** Simple UNIQUE constraint cannot express range overlaps. Procedure + locking is the correct mechanism.

---

### BR-02 — Rate Snapshot at Booking Time
**Source:** ERD `reservation_rooms.rate_per_night`, SRS implied by "room rate"
**Rule:** The `rate_per_night` captured in `reservation_rooms` at booking time is the authoritative charge rate, regardless of future changes to `room_type.daily_rate`.
**Enforcement:**
- **DB (authoritative):** `sp_create_reservation()` copies `room_type.daily_rate` into `reservation_rooms.rate_per_night` at booking time.
- TypeScript must never use `room_type.daily_rate` to compute charges for existing reservations.

---

### BR-03 — Room Charge Calculation in PostgreSQL
**Source:** Project brief, course mandate
**Rule:** `room_charge = SUM(rate_per_night * (check_out_date - check_in_date))` over all rooms. Computed by `fn_calc_room_charges(p_reservation_id)`.
**Enforcement:**
- **DB (authoritative):** `fn_calc_room_charges()` stored function.
- TypeScript: receives the value from the DB; does not recompute.

---

### BR-04 — Service Price Snapshot at Time of Use
**Source:** SRS REQ-4.4.2, SRS Section 6
**Rule:** `service_usage.charged_price` is set to `service_catalogue.current_price` at the time of logging. It is immutable. Later price changes do not affect existing usage records.
**Enforcement:**
- **DB (authoritative):** `sp_log_service_usage()` copies `current_price` to `charged_price` at insert time.
- TypeScript: passes service_id; the procedure fetches and snapshots the price.

---

### BR-05 — Service Charge Calculation in PostgreSQL
**Source:** Course mandate
**Rule:** `service_charge = SUM(charged_price * quantity)` over all service_usage for a reservation. Computed by `fn_calc_service_charges(p_reservation_id)`.
**Enforcement:**
- **DB (authoritative):** `fn_calc_service_charges()` stored function.

---

### BR-06 — Tax Applied to Room Charges Only
**Source:** SRS Section 2.5, SRS Section 5.5, D005
**Rule:** Tax = `room_charge * tax_percentage_applied / 100`. Applied only to room charges. Service charges are not taxed.
**Enforcement:**
- **DB (authoritative):** `vw_invoice_totals` and `sp_finalize_invoice()`.
- `tax_percentage_applied` is snapshotted from the active `tax_policies` record at invoice creation.

---

### BR-07 — Outstanding Balance in PostgreSQL Only
**Source:** SRS REQ-4.2.3, course mandate
**Rule:** `outstanding_balance = grand_total - total_paid`. Computed in `vw_invoice_totals`. Never stored as a column. Never recomputed in TypeScript.
**Enforcement:**
- **DB (authoritative):** `vw_invoice_totals` view.
- TypeScript: reads `outstanding_balance` from the view result; never subtracts payment from total.

---

### BR-08 — Checkout Blocked if Balance > 0
**Source:** SRS REQ-4.5.1, SRS REQ-4.2.5, project brief
**Rule:** Checkout transition to `CheckedOut` is forbidden if `outstanding_balance > 0`.
**Enforcement:**
- UI: balance indicator with warning (convenience only)
- Server: calls `sp_checkout()`
- **DB (authoritative):** `sp_checkout()` reads `outstanding_balance` from `vw_invoice_totals` and raises an exception if > 0. SQLSTATE documented. TypeScript translates to HTTP 409.

---

### BR-09 — Check-in Room Status Sync (Atomic)
**Source:** SRS REQ-4.3.2
**Rule:** When a reservation transitions to `CheckedIn`, all reserved rooms must atomically update to `Occupied`.
**Enforcement:**
- **DB (authoritative):** `sp_check_in()` — within one transaction: UPDATE reservation status AND UPDATE all reservation_rooms room statuses.
- Trigger option: may also add a trigger on `reservation.reservation_status` as belt-and-suspenders. Justify choice in `docs/09`.

---

### BR-10 — Checkout Room Status Sync (Atomic)
**Source:** SRS REQ-4.5.2
**Rule:** When a reservation transitions to `CheckedOut`, all reserved rooms must atomically update to `Available`.
**Enforcement:**
- **DB (authoritative):** `sp_checkout()` updates room statuses within the same transaction.

---

### BR-11 — Service Usage Only for Checked-In Reservation
**Source:** SRS REQ-4.4.1
**Rule:** Service usage may only be logged against a reservation with status `CheckedIn`.
**Enforcement:**
- Server: validates reservation status before calling DB procedure
- **DB (authoritative):** `sp_log_service_usage()` checks reservation status and raises exception if not `CheckedIn`.

---

### BR-12 — Payment Idempotency
**Source:** Architecture requirement
**Rule:** Duplicate payments with the same `transaction_reference` must be rejected.
**Enforcement:**
- **DB (authoritative):** `UNIQUE` constraint on `payment.transaction_reference`.

---

### BR-13 — Guest Ownership Enforcement
**Source:** SRS Section 5.3, security requirement
**Rule:** A guest may only view and modify their own reservations, bills, and payments. Guest identity must be derived from the server-side session, never from browser-supplied parameters.
**Enforcement:**
- **Server (authoritative):** All guest API queries use `session.guestId` in the WHERE predicate.
- **DB:** Parameterized queries prevent injection. Ownership enforced at query level, not only by hiding links.

---

### BR-14 — No Negative Payments
**Source:** Financial integrity
**Rule:** `payment.amount_paid` must be > 0.
**Enforcement:**
- **DB (authoritative):** `CHECK (amount_paid > 0)` constraint.

---

### BR-15 — Late Checkout Charge
**Source:** SRS Section 2.5, SRS Section 5.5 (TBD-4)
**Rule:** Checkout after 12:00 PM local time incurs a charge = 50% of one night's room rate, logged as a `service_usage` entry against the system-defined "Late Checkout" service.
**Enforcement:**
- **Server:** Checkout API checks current time; if after 12:00 PM local and reservation date matches, calls service usage logging for Late Checkout service before checkout procedure.
- **DB:** Standard service usage path; `charged_price` = 0.5 × `rate_per_night` (calculated and passed by service layer or computed by a dedicated function).
**Status:** PROPOSED (TBD-4 pending confirmation)

---

### BR-16 — Maintenance Rooms Excluded from Availability
**Source:** ERD RoomStatus enum (D003), recommendation
**Rule:** Rooms with `status = 'Maintenance'` must not appear in availability search results.
**Enforcement:**
- **DB (authoritative):** `fn_get_available_rooms()` filters `room.status != 'Maintenance'`.

---

## Calculation Placement Matrix

| Calculation | PostgreSQL | TypeScript Backend | UI |
|---|---|---|---|
| Room charge | `fn_calc_room_charges()` | ❌ Forbidden | Display only |
| Service charge | `fn_calc_service_charges()` | ❌ Forbidden | Display only |
| Tax amount | `vw_invoice_totals` | ❌ Forbidden | Display only |
| Grand total | `vw_invoice_totals` | ❌ Forbidden | Display only |
| Total paid | `vw_invoice_totals` | ❌ Forbidden | Display only |
| Outstanding balance | `vw_invoice_totals` | ❌ Forbidden | Display only |
| Nights count | `check_out_date - check_in_date` in DB | ❌ Forbidden | Display only |
| Availability | `fn_get_available_rooms()` | ❌ Forbidden | Display only |
| State transitions | SP + constraints | Orchestration call only | UI hint only |
| Input shape validity | — | Zod (pre-DB) | Client hint |
| Auth/session | — | Session read | Never trusted |
