# docs/05 — Current ERD and Schema

> **Source note:** Transcribed from `project-sources/ER_Diagram- Group 39.md`. Original PDF not available for visual verification. Cardinalities described based on FK relationships. Flag any visual ambiguity.

## Tables and Enums

### Enums

```sql
CREATE TYPE user_role AS ENUM ('Guest', 'Receptionist', 'Manager', 'Admin');
CREATE TYPE account_status AS ENUM ('Active', 'Inactive', 'Suspended');
CREATE TYPE booking_source AS ENUM ('Online', 'Reception', 'Phone');
CREATE TYPE reservation_status AS ENUM ('Booked', 'CheckedIn', 'CheckedOut', 'Cancelled');
CREATE TYPE room_status AS ENUM ('Available', 'Occupied', 'Maintenance');
CREATE TYPE service_catalogue_status AS ENUM ('Active', 'Inactive');
CREATE TYPE payment_status AS ENUM ('Unpaid', 'PartiallyPaid', 'Paid');
```

---

### `user_account`
Central authentication table for all users (guests and staff).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `user_id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `username` | `varchar(100)` | NOT NULL, UNIQUE | |
| `password_hash` | `varchar(255)` | NOT NULL | bcrypt hash |
| `role` | `user_role` | NOT NULL | ERD enum |
| `status` | `account_status` | NOT NULL, DEFAULT 'Active' | |

**Candidate keys:** `user_id`, `username`
**Invariants:** username must be unique; role may not be changed by the user themselves.

---

### `guest`
Guest profile linked to a user account.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `guest_id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `user_id` | `uuid` | NOT NULL, UNIQUE, FK → user_account | |
| `email` | `varchar(100)` | NOT NULL, UNIQUE | |
| `phone` | `varchar(20)` | | |
| `identification` | `varchar(50)` | | NIC or Passport |
| `full_name` | `varchar(100)` | NOT NULL | |

**Candidate keys:** `guest_id`, `user_id`, `email`
**Invariants:** `user_id` must have `role = 'Guest'`.

---

### `employee`
Employee profile linked to a user account.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `employee_id` | `bigint` | PK, GENERATED ALWAYS AS IDENTITY | |
| `user_id` | `uuid` | NOT NULL, UNIQUE, FK → user_account | |
| `employee_number` | `varchar(50)` | NOT NULL, UNIQUE | |
| `full_name` | `varchar(100)` | NOT NULL | |
| `email` | `varchar(100)` | NOT NULL, UNIQUE | |
| `phone` | `varchar(20)` | | |
| `department` | `varchar(50)` | | |
| `position` | `varchar(50)` | | |

**Invariants:** `user_id` must have `role` in `('Receptionist', 'Manager', 'Admin')`.

---

### `branch`
SkyNest hotel branches.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `branch_id` | `bigint` | PK, GENERATED ALWAYS AS IDENTITY | |
| `location_name` | `varchar(100)` | NOT NULL, UNIQUE | e.g., 'Colombo' |

**Seed data:** 3 branches — Colombo, Kandy, Galle.

---

### `room_type`
Categories of rooms (Single, Double, Suite).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `type_id` | `bigint` | PK, GENERATED ALWAYS AS IDENTITY | |
| `type_name` | `varchar(50)` | NOT NULL, UNIQUE | |
| `capacity` | `int` | NOT NULL, CHECK (capacity > 0) | |
| `daily_rate` | `NUMERIC(12,2)` | NOT NULL, CHECK (daily_rate > 0) | Current rate |

**Note:** `daily_rate` is the current rate. Historical rates are captured in `reservation_rooms.rate_per_night` at booking time.

---

### `amenity`
Amenity catalogue entries.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `amenity_id` | `bigint` | PK, GENERATED ALWAYS AS IDENTITY | |
| `amenity_name` | `varchar(100)` | NOT NULL, UNIQUE | |

---

### `room_type_amenity`
Many-to-many: room types and their amenities.

| Column | Type | Constraints |
|---|---|---|
| `type_id` | `bigint` | PK, FK → room_type, ON DELETE RESTRICT |
| `amenity_id` | `bigint` | PK, FK → amenity, ON DELETE RESTRICT |

**Note:** This normalizes the SRS `Amenities` text field into a proper junction table (ERD model, higher precedence).

---

### `room`
Individual hotel rooms.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `room_id` | `bigint` | PK, GENERATED ALWAYS AS IDENTITY | |
| `room_number` | `varchar(10)` | NOT NULL | Not globally unique; unique per branch |
| `branch_id` | `bigint` | NOT NULL, FK → branch | |
| `type_id` | `bigint` | NOT NULL, FK → room_type | |
| `status` | `room_status` | NOT NULL, DEFAULT 'Available' | |

**Candidate keys:** `(branch_id, room_number)` — UNIQUE per branch
**Invariants:** Room number must be unique within a branch.

---

### `reservation`
A guest's reservation (may include multiple rooms).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `reservation_id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `guest_id` | `uuid` | NOT NULL, FK → guest | |
| `branch_id` | `bigint` | NOT NULL, FK → branch | Invariant: all rooms must belong to this branch |
| `check_in_date` | `date` | NOT NULL | |
| `check_out_date` | `date` | NOT NULL, CHECK (check_out_date > check_in_date) | |
| `reservation_status` | `reservation_status` | NOT NULL, DEFAULT 'Booked' | |
| `discount_percentage` | `NUMERIC(5,2)` | CHECK (discount_percentage >= 0 AND discount_percentage < 100) | Nullable |
| `processed_by_employee_id` | `bigint` | FK → employee | Nullable (online bookings have no staff) |
| `created_by_user_id` | `uuid` | NOT NULL, FK → user_account | |
| `booking_source` | `booking_source` | NOT NULL | Online / Reception / Phone |
| `created_at` | `timestamp with time zone` | NOT NULL, DEFAULT now() | |

---

### `reservation_rooms`
Rooms allocated to a reservation (captures historical rate).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `reservation_id` | `uuid` | PK, FK → reservation | |
| `room_id` | `bigint` | PK, FK → room | |
| `rate_per_night` | `NUMERIC(12,2)` | NOT NULL, CHECK (rate_per_night > 0) | Snapshot at booking time |

**Invariants:** All `room_id` entries must belong to the same `branch_id` as the reservation.
**Overlap rule:** No two active reservations may share the same `room_id` with overlapping date ranges.

---

### `service_catalogue`
Catalogue of chargeable hotel services.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `service_id` | `bigint` | PK, GENERATED ALWAYS AS IDENTITY | |
| `service_name` | `varchar(100)` | NOT NULL, UNIQUE | |
| `current_price` | `NUMERIC(12,2)` | NOT NULL, CHECK (current_price >= 0) | May change; not used for historical billing |
| `status` | `service_catalogue_status` | NOT NULL, DEFAULT 'Active' | |

**Seed data:** Room Service, Spa Treatment, Laundry, Minibar Usage, Airport Transfer, Late Checkout

---

### `service_usage`
Records of chargeable services consumed during a stay.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `usage_id` | `bigint` | PK, GENERATED ALWAYS AS IDENTITY | |
| `room_id` | `bigint` | NOT NULL, composite FK | Part of → reservation_rooms |
| `reservation_id` | `uuid` | NOT NULL, composite FK | Part of → reservation_rooms |
| `service_id` | `bigint` | NOT NULL, FK → service_catalogue | |
| `usage_date` | `timestamp with time zone` | NOT NULL, DEFAULT now() | |
| `quantity` | `int` | NOT NULL, CHECK (quantity > 0) | |
| `charged_price` | `NUMERIC(12,2)` | NOT NULL, CHECK (charged_price >= 0) | Snapshot at time of use |
| `logged_by_employee_id` | `bigint` | NOT NULL, FK → employee | |
| `request_channel` | `varchar(20)` | | e.g., 'Phone', 'InRoom', 'Reception' |

**FK:** `(reservation_id, room_id)` → `reservation_rooms(reservation_id, room_id)`
**Invariants:** Service usage only allowed when reservation status = `CheckedIn`.

---

### `tax_policies`
Tax policy history.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `tax_id` | `bigint` | PK, GENERATED ALWAYS AS IDENTITY | |
| `tax_name` | `varchar(100)` | NOT NULL | e.g., 'Government Tourism Tax' |
| `tax_percentage` | `NUMERIC(5,2)` | NOT NULL, CHECK (tax_percentage >= 0) | |
| `active` | `boolean` | NOT NULL, DEFAULT true | |

**Seed:** One record: 'Government Tourism Tax', 8.00%, active=true.
**Note:** Tax applies to room charges only (D005 decision).

---

### `billing_summary`
Stored invoice per reservation. Created/finalized by `sp_finalize_invoice()`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `invoice_id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `reservation_id` | `uuid` | NOT NULL, UNIQUE, FK → reservation | One invoice per reservation |
| `invoice_date` | `timestamp with time zone` | NOT NULL, DEFAULT now() | |
| `tax_id` | `bigint` | NOT NULL, FK → tax_policies | |
| `tax_percentage_applied` | `NUMERIC(5,2)` | NOT NULL | Snapshot at invoice time |
| `payment_status` | `payment_status` | NOT NULL, DEFAULT 'Unpaid' | |

**Note:** Monetary totals are NOT stored here — they are computed by `vw_invoice_totals`. `tax_percentage_applied` is the snapshot for historical accuracy.

---

### `payment`
Individual payment records against an invoice.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `payment_id` | `bigint` | PK, GENERATED ALWAYS AS IDENTITY | |
| `invoice_id` | `uuid` | NOT NULL, FK → billing_summary | |
| `amount_paid` | `NUMERIC(12,2)` | NOT NULL, CHECK (amount_paid > 0) | |
| `payment_date` | `timestamp with time zone` | NOT NULL, DEFAULT now() | |
| `payment_method` | `varchar(50)` | NOT NULL | e.g., 'Cash', 'Credit Card' |
| `processed_by_employee_id` | `bigint` | FK → employee | Nullable for online payments |
| `paid_by_user_id` | `uuid` | NOT NULL, FK → user_account | |
| `transaction_reference` | `varchar(100)` | UNIQUE | Idempotency key |

**Invariants:** `transaction_reference` unique — prevents duplicate payment processing.

---

## Foreign Key Summary

| Child | References | ON DELETE |
|---|---|---|
| `guest.user_id` | `user_account.user_id` | RESTRICT |
| `employee.user_id` | `user_account.user_id` | RESTRICT |
| `reservation.guest_id` | `guest.guest_id` | RESTRICT |
| `reservation.branch_id` | `branch.branch_id` | RESTRICT |
| `reservation.processed_by_employee_id` | `employee.employee_id` | RESTRICT |
| `reservation.created_by_user_id` | `user_account.user_id` | RESTRICT |
| `room.branch_id` | `branch.branch_id` | RESTRICT |
| `room.type_id` | `room_type.type_id` | RESTRICT |
| `room_type_amenity.type_id` | `room_type.type_id` | RESTRICT |
| `room_type_amenity.amenity_id` | `amenity.amenity_id` | RESTRICT |
| `reservation_rooms.reservation_id` | `reservation.reservation_id` | RESTRICT |
| `reservation_rooms.room_id` | `room.room_id` | RESTRICT |
| `service_usage.(reservation_id, room_id)` | `reservation_rooms.(reservation_id, room_id)` | RESTRICT |
| `service_usage.service_id` | `service_catalogue.service_id` | RESTRICT |
| `service_usage.logged_by_employee_id` | `employee.employee_id` | RESTRICT |
| `billing_summary.reservation_id` | `reservation.reservation_id` | RESTRICT |
| `billing_summary.tax_id` | `tax_policies.tax_id` | RESTRICT |
| `payment.invoice_id` | `billing_summary.invoice_id` | RESTRICT |
| `payment.processed_by_employee_id` | `employee.employee_id` | RESTRICT |
| `payment.paid_by_user_id` | `user_account.user_id` | RESTRICT |

## Proposed Schema Changes from ERD Baseline

| Change | Reason | Status |
|---|---|---|
| `NUMERIC(12,2)` for all decimal money columns | Precision requirement | APPROVED |
| Add `created_at TIMESTAMP WITH TIME ZONE` to `reservation` | Audit trail | PROPOSED |
| Add `(branch_id, room_number)` UNIQUE to `room` | Natural key | PROPOSED |
| `reservation.discount_percentage` nullable by default | SRS: no automatic discount | APPROVED |
| `billing_summary.reservation_id` UNIQUE | One invoice per reservation | PROPOSED |

All schema changes from the ERD baseline are logged here. Implementations must not silently deviate.
