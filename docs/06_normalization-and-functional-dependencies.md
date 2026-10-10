# docs/06 — Normalization and Functional Dependencies

_Academic analysis of the schema against 1NF, 2NF, 3NF, BCNF. Required for the database deliverable._

## Methodology
For each table, we identify the primary key, list functional dependencies (FDs), and verify normalization up to BCNF. Gap-analysis deviations from the SRS (e.g., text fields) are noted.

---

## `user_account`
**PK:** `user_id`

**Functional Dependencies:**
- `user_id → username, password_hash, role, status`
- `username → user_id` (candidate key)

**1NF:** ✅ — all attributes atomic, no repeating groups
**2NF:** ✅ — single-attribute PK, no partial dependency
**3NF:** ✅ — no transitive dependency
**BCNF:** ✅ — every determinant is a superkey

---

## `guest`
**PK:** `guest_id`

**Functional Dependencies:**
- `guest_id → user_id, email, phone, identification, full_name`
- `user_id → guest_id` (candidate key)
- `email → guest_id` (candidate key)

**1NF:** ✅
**2NF:** ✅
**3NF:** ✅
**BCNF:** ✅

---

## `employee`
**PK:** `employee_id`

**FDs:**
- `employee_id → user_id, employee_number, full_name, email, phone, department, position`
- `user_id → employee_id`
- `employee_number → employee_id`
- `email → employee_id`

**3NF:** ✅ | **BCNF:** ✅

---

## `branch`
**PK:** `branch_id`
**FD:** `branch_id → location_name`; `location_name → branch_id`
**BCNF:** ✅

---

## `room_type`
**PK:** `type_id`
**FDs:** `type_id → type_name, capacity, daily_rate`; `type_name → type_id`

**1NF note:** SRS stored amenities as a text field on `room_type` — this would violate 1NF (multi-valued attribute). The ERD correctly separates this into `amenity` + `room_type_amenity` (see GAP-07). Our design is 1NF-compliant.

**BCNF:** ✅

---

## `amenity`
**PK:** `amenity_id`
**FD:** `amenity_id → amenity_name`; `amenity_name → amenity_id`
**BCNF:** ✅

---

## `room_type_amenity`
**PK:** `(type_id, amenity_id)` — composite

**FDs:**
- `(type_id, amenity_id) → (both attributes)` — trivial
- No non-trivial FDs (no non-key attributes)

**1NF:** ✅ — pure junction table
**BCNF:** ✅ — only key is the full composite key

---

## `room`
**PK:** `room_id`
**CK:** `(branch_id, room_number)` — composite unique key per branch

**FDs:**
- `room_id → room_number, branch_id, type_id, status`
- `(branch_id, room_number) → room_id` (candidate key)
- `type_id → ...` (no: type_id determines room_type attributes, but room has no room_type attributes — only type_id FK)

**2NF:** ✅ — single-attribute PK
**3NF:** ✅ — no transitive dependency (`type_id` is a FK, not an attribute that determines another non-key attribute on this table)
**BCNF:** ✅

---

## `reservation`
**PK:** `reservation_id`

**FDs:**
- `reservation_id → guest_id, branch_id, check_in_date, check_out_date, reservation_status, discount_percentage, processed_by_employee_id, created_by_user_id, booking_source, created_at`

**Derived attribute analysis:**
- `nights = check_out_date - check_in_date` is a derived attribute — NOT stored (computed by `fn_calc_room_charges()`)
- `branch_id` could theoretically be derived from the rooms, but is retained as an invariant for query efficiency (documented in GAP-06)

**2NF:** ✅ — single-attribute PK
**3NF:** ✅ — no non-key attribute depends on another non-key attribute
**BCNF:** ✅

---

## `reservation_rooms`
**PK:** `(reservation_id, room_id)` — composite

**FDs:**
- `(reservation_id, room_id) → rate_per_night`
- `rate_per_night` does NOT depend on `reservation_id` alone (partial dependency would violate 2NF) — but `rate_per_night` here is a historical snapshot depending on the full PK ✅

**2NF:** ✅ — `rate_per_night` depends on the full composite key, not a partial key
**3NF:** ✅ — no transitive FD
**BCNF:** ✅

---

## `service_catalogue`
**PK:** `service_id`
**FDs:** `service_id → service_name, current_price, status`; `service_name → service_id`
**BCNF:** ✅

---

## `service_usage`
**PK:** `usage_id`
**FK:** `(reservation_id, room_id)` → `reservation_rooms`

**FDs:**
- `usage_id → reservation_id, room_id, service_id, usage_date, quantity, charged_price, logged_by_employee_id, request_channel`

**Historical price note:** `charged_price` depends on `usage_id`, not `service_id` — it is a snapshot, not derivable from current catalogue. This is intentional (not a violation; historical data).

**2NF:** ✅ — single surrogate PK (`usage_id`); all attributes depend on the full key
**3NF:** ✅
**BCNF:** ✅

---

## `tax_policies`
**PK:** `tax_id`
**BCNF:** ✅

---

## `billing_summary`
**PK:** `invoice_id`
**CK:** `reservation_id` — UNIQUE (one invoice per reservation)

**FDs:**
- `invoice_id → reservation_id, invoice_date, tax_id, tax_percentage_applied, payment_status`
- `reservation_id → invoice_id`

**Note on stored totals:** Monetary totals are NOT stored here (derived in `vw_invoice_totals`). `tax_percentage_applied` is a snapshot for historical accuracy — not derivable from the current tax_policies record in the future. This is intentional.

**BCNF:** ✅

---

## `payment`
**PK:** `payment_id`
**CK (partial):** `transaction_reference` — UNIQUE where not null

**FDs:**
- `payment_id → invoice_id, amount_paid, payment_date, payment_method, processed_by_employee_id, paid_by_user_id, transaction_reference`

**BCNF:** ✅

---

## Summary: Normalization Status

| Table | 1NF | 2NF | 3NF | BCNF |
|---|---|---|---|---|
| user_account | ✅ | ✅ | ✅ | ✅ |
| guest | ✅ | ✅ | ✅ | ✅ |
| employee | ✅ | ✅ | ✅ | ✅ |
| branch | ✅ | ✅ | ✅ | ✅ |
| room_type | ✅ | ✅ | ✅ | ✅ |
| amenity | ✅ | ✅ | ✅ | ✅ |
| room_type_amenity | ✅ | ✅ | ✅ | ✅ |
| room | ✅ | ✅ | ✅ | ✅ |
| reservation | ✅ | ✅ | ✅ | ✅ |
| reservation_rooms | ✅ | ✅ | ✅ | ✅ |
| service_catalogue | ✅ | ✅ | ✅ | ✅ |
| service_usage | ✅ | ✅ | ✅ | ✅ |
| tax_policies | ✅ | ✅ | ✅ | ✅ |
| billing_summary | ✅ | ✅ | ✅ | ✅ |
| payment | ✅ | ✅ | ✅ | ✅ |

**All tables are in BCNF.** The SRS amenity text field (1NF violation) was corrected by the ERD's normalized design.
