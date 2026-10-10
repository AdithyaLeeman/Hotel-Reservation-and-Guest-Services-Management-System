# docs/18 — Source and ERD Gap Analysis

_Records every mismatch between the official brief, SRS, and ERD. Required by the master prompt Section 3._
_Do not silently resolve gaps by changing the ERD. Propose, document, and seek approval._

## Format
Each gap: requirement/topic | brief statement | SRS statement | ERD design | lecture concept | conflict/risk | recommendation | DB/backend/frontend impact | approval required | status

---

## GAP-01 — Single-Room Booking (SRS) vs. Multi-Room Reservation (ERD)

**Requirement:** Room booking/reservation structure
**Brief:** "A guest can make a room booking for a given check-in and check-out period. Each booking includes room details…"
**SRS:** `Booking.Room_ID` — single FK to `Room` (one room per booking)
**ERD:** `reservation` + `reservation_rooms` junction table — multiple rooms per reservation
**Lecture concept:** Many-to-many relationships (L02), junction tables (L02 ER-to-relational reduction)
**Conflict:** SRS models one room per booking; ERD models many rooms per reservation.
**Recommendation:** Adopt ERD multi-room model. ERD has higher source precedence. More realistic hotel scenario.
**Impact:** All reservation DDL, APIs, billing functions, seed data, UI (show room list per reservation)
**Approval required:** Yes — team decision (D001 logged, lecturer review recommended)
**Status:** PROPOSED (D001 approved at team level)

---

## GAP-02 — Outstanding Balance Location

**Requirement:** Outstanding balance calculation and storage
**Brief:** "system must flag bookings with outstanding dues"
**SRS:** `Booking.Outstanding_Balance` — stored column on Booking, maintained by trigger
**ERD:** No stored balance on `reservation` or `billing_summary`; must be derived
**Lecture concept:** Derived vs. stored attributes (L02), computed values in views (L05)
**Conflict:** SRS stores balance as a column; ERD requires it to be derived from payments vs. totals.
**Recommendation:** Compute `outstanding_balance` in `vw_invoice_totals` view (DB authoritative). Never store it as a redundant column. Backend reads from view.
**Impact:** M5 billing view; no stored balance column in any table; all APIs use the view value
**Approval required:** Yes
**Status:** PROPOSED

---

## GAP-03 — Payment Linked to Booking (SRS) vs. Invoice (ERD)

**Requirement:** Payment foreign key target
**Brief:** "Guests can make partial payments" (linked to booking)
**SRS:** `Payment.Booking_ID` FK → `Booking`
**ERD:** `payment.invoice_id` FK → `billing_summary`
**Lecture concept:** FK relationships (L02/L03)
**Conflict:** SRS links payment to booking; ERD links payment to invoice.
**Recommendation:** Follow ERD: `payment.invoice_id` → `billing_summary`. This is more correct because a payment clears an invoice, and `billing_summary` captures the tax snapshot. Invoices must be created before payments can be accepted.
**Impact:** M5 billing DDL; invoice must exist before first payment; API must create invoice on first billing action
**Approval required:** Yes
**Status:** PROPOSED

---

## GAP-04 — Missing Total Columns in billing_summary

**Requirement:** Bill totals (room charges, service charges, grand total)
**Brief:** "calculate the final bill, which includes room charges and service charges"
**SRS:** Totals stored on `Booking` (Total_Room_Charge, Total_Service_Charge, Outstanding_Balance)
**ERD:** `billing_summary` has only `invoice_date`, `tax_id`, `tax_percentage_applied`, `payment_status` — no stored total columns
**Lecture concept:** Derived attributes (L02), views for derived data (L05)
**Conflict:** Where are the financial totals stored?
**Recommendation:** Totals are computed (not stored) by `vw_invoice_totals` using `fn_calc_room_charges()` and `fn_calc_service_charges()`. Only `tax_percentage_applied` is snapshotted. This avoids update anomalies.
**Impact:** M4 writes charge functions; M5 writes billing view; no redundant stored totals
**Approval required:** Yes
**Status:** PROPOSED

---

## GAP-05 — Maintenance Room Status (SRS TBD-6)

**Requirement:** Room operational status
**Brief:** Rooms have `Available` and `Occupied` status
**SRS:** TBD-6 — "Determine whether a Maintenance or Out of Service room status is required"
**ERD:** `RoomStatus` enum includes `Available`, `Occupied`, `Maintenance`
**Lecture concept:** Domain/enum constraints (L05)
**Conflict:** SRS defers maintenance status; ERD defines it.
**Recommendation:** Retain `Maintenance` status (ERD is authoritative). Maintenance rooms excluded from availability results. Only Manager/Admin may set Maintenance.
**Impact:** M2 availability function must exclude Maintenance rooms; M2 room management API must check role
**Approval required:** Lecturer confirmation recommended
**Status:** PROPOSED

---

## GAP-06 — reservation.branch_id Redundancy

**Requirement:** Branch assignment in reservations
**Brief:** "three branches: Colombo, Kandy, and Galle"
**SRS:** No explicit `branch_id` on Booking
**ERD:** `reservation.branch_id` FK → `branch`, AND `room.branch_id` FK → `branch`
**Lecture concept:** Functional dependencies, redundancy (L04)
**Conflict:** If all rooms in a reservation belong to one branch, `reservation.branch_id` is technically derivable. Is it redundant?
**Recommendation:** Retain `reservation.branch_id` as a non-redundant invariant. It explicitly enforces single-branch scope, enables efficient branch-level queries (e.g., monthly revenue), and allows `EXPLAIN ANALYZE` to use it in index scans. Procedure must validate consistency.
**Impact:** Reservation creation procedure validates all rooms match branch_id
**Approval required:** No (team decision)
**Status:** PROPOSED

---

## GAP-07 — SRS Amenities as Text vs. ERD Normalized Tables

**Requirement:** Room type amenities
**Brief:** "Room types differ by capacity, daily rate, and amenities."
**SRS:** `Room_Type.Amenities` — text column (comma-separated or freeform)
**ERD:** Normalized `amenity` table + `room_type_amenity` junction table
**Lecture concept:** 1NF (no repeating groups / multi-valued attributes) (L04), ER multi-valued attributes (L02)
**Conflict:** SRS uses a text field (violates 1NF); ERD normalizes correctly.
**Recommendation:** Follow ERD normalized model. Eliminates 1NF violation, enables amenity-based search later.
**Impact:** M2 DDL (amenity + room_type_amenity tables), admin UI for amenity management
**Approval required:** No
**Status:** RESOLVED — ERD adopted

---

## GAP-08 — Tax Rate: Interim Assumption vs. Tax History Table

**Requirement:** Tax policy
**Brief:** "review materials related to hotel operations and make assumptions where necessary (e.g., tax rules)"
**SRS:** "A flat 8% government/tourism service tax is applied to the room-charge portion" — explicitly an interim assumption
**ERD:** `tax_policies` table with `tax_percentage`, `active`, and `tax_name` columns — supports history
**Lecture concept:** Historical data, effective-dated records
**Conflict:** SRS hard-codes 8%; ERD allows tax policy history.
**Recommendation:** Follow ERD — use `tax_policies` table. Seed with 8% as the active record. `billing_summary.tax_percentage_applied` stores the snapshot at invoice time.
**Impact:** M5 `tax_policies` DDL and seeding; invoice procedure reads active tax
**Approval required:** Confirm tax rate with lecturer/business
**Status:** PROPOSED (TBD-2 in SRS)

---

## GAP-09 — Discount Policy

**Requirement:** Discount
**Brief:** "make assumptions where necessary (e.g., discount policies)"
**SRS:** "No automatic discount policy is applied at the database level; a nullable Discount_Percentage field is reserved on the Booking table for future promotional use."
**ERD:** `reservation.discount_percentage` — nullable decimal column
**Lecture concept:** Nullable attributes (L03/L04)
**Conflict:** No real conflict — SRS and ERD are aligned (nullable, no automatic calculation yet).
**Recommendation:** Keep `reservation.discount_percentage` nullable. No automatic discount trigger. Apply discount in invoice calculation function if not null.
**Impact:** M3 DDL (already in reservation table); M5 invoice function handles discount
**Approval required:** Discount calculation formula needs approval when implemented
**Status:** PROPOSED (TBD-3 in SRS)

---

## GAP-10 — Overlap Prevention Implementation

**Requirement:** "The system must prevent double-booking of the same room during overlapping periods" (REQ-4.1.2)
**Brief:** Same
**SRS:** "via a database-level trigger or unique constraint on the Booking table"
**ERD:** No explicit overlap constraint defined
**Lecture concept:** Triggers (L08), transactions (L05), concurrency (L11)
**Conflict:** SRS suggests trigger or unique constraint; standard unique constraints cannot express range overlaps. The ERD does not define the mechanism.
**Recommendation:** Use `SELECT ... FOR UPDATE` inside `sp_create_reservation()` procedure. This acquires row-level locks on the relevant room records within a transaction, preventing concurrent inserts for the same room+dates. Document why a simple UNIQUE constraint is insufficient for range overlap.
**Impact:** M3 reservation creation procedure; concurrency test required
**Approval required:** Lecturer approval of mechanism recommended
**Status:** PROPOSED

---

## GAP-11 — User Account Model (ERD) vs. Three Actor Classes (SRS)

**Requirement:** User roles and authentication
**Brief:** "Guest, Hotel Staff, and Management"
**SRS:** Three actor classes without explicit user account model
**ERD:** `user_account` with `user_role` enum: Guest, Receptionist, Manager, Admin; separate `guest` and `employee` tables
**Lecture concept:** Specialization/generalization (L02), RBAC (L07)
**Conflict:** SRS has 3 actors; ERD has 4 roles with explicit account structure.
**Recommendation:** Follow ERD. Maps cleanly to RBAC: Guest self-registers; staff roles assigned by Admin; Manager ⊃ Receptionist in permissions; Admin ⊃ Manager.
**Impact:** M1 auth DDL and RBAC implementation; all route protection
**Approval required:** No
**Status:** RESOLVED — ERD adopted

---

## GAP-12 — Service Usage Timing Constraint

**Requirement:** Service usage only during checked-in stay
**Brief:** "During their stay, guests can request chargeable services" (implies checked-in)
**SRS:** REQ-4.4.1: "record its usage against a 'Checked-In' booking"
**ERD:** `service_usage` has no explicit trigger or constraint enforcing this
**Lecture concept:** Triggers (L08), CHECK constraints (L05)
**Conflict:** ERD does not define the enforcement mechanism for this business rule.
**Recommendation:** Validate in `sp_log_service_usage()` procedure: raise exception if reservation status ≠ `CheckedIn`. Optionally add a trigger as belt-and-suspenders. Document in `docs/09`.
**Impact:** M4 service usage procedure
**Approval required:** No
**Status:** PROPOSED
