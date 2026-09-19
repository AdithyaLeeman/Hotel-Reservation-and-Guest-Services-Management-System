# docs/21 — Shared Contracts

_Controlled cross-slice contracts that parallel tasks depend on._
_Changes require a documented decision, affected-task review, and coordinated migration/API plan._
_Owner: M1. Status moves to ACCEPTED after team review at Phase 1 start._

---

## 1. Canonical Terminology

| Use This | Not This | Source |
|---|---|---|
| `reservation` | `booking` (internally in DB/code) | ERD |
| `reservation_id` | `booking_id` | ERD |
| `reservation_status` | `booking_status` | ERD |
| `Booking` | Acceptable in UI/user-facing labels only | SRS user language |
| `check_in_date` / `check_out_date` | `checkin` / `checkout` | ERD |

**Status:** PROPOSED | **Owner:** M1

---

## 2. Identifier Types

| Table | PK Type | Notes |
|---|---|---|
| `user_account` | `uuid` | `gen_random_uuid()` |
| `guest` | `uuid` | `gen_random_uuid()` |
| `reservation` | `uuid` | `gen_random_uuid()` |
| `billing_summary` | `uuid` | `gen_random_uuid()` |
| `employee` | `bigint` | `GENERATED ALWAYS AS IDENTITY` |
| `branch` | `bigint` | `GENERATED ALWAYS AS IDENTITY` |
| `room_type` | `bigint` | `GENERATED ALWAYS AS IDENTITY` |
| `amenity` | `bigint` | `GENERATED ALWAYS AS IDENTITY` |
| `room` | `bigint` | `GENERATED ALWAYS AS IDENTITY` |
| `service_catalogue` | `bigint` | `GENERATED ALWAYS AS IDENTITY` |
| `service_usage` | `bigint` | `GENERATED ALWAYS AS IDENTITY` |
| `tax_policies` | `bigint` | `GENERATED ALWAYS AS IDENTITY` |
| `payment` | `bigint` | `GENERATED ALWAYS AS IDENTITY` |

**Status:** PROPOSED | **Owner:** M1

---

## 3. Money Type

All monetary values in PostgreSQL use `NUMERIC(12,2)`.
All monetary values in TypeScript are received as strings from `pg` and kept as strings or converted with `parseFloat()` for display only.
Never use `number` arithmetic for authoritative financial totals in TypeScript.

**Status:** PROPOSED | **Owner:** M1

---

## 4. Date and Time Contract

| Data | DB Type | Notes |
|---|---|---|
| Check-in date | `DATE` | No time component |
| Check-out date | `DATE` | No time component |
| Reservation created_at | `TIMESTAMP WITH TIME ZONE` | Default now() |
| Service usage_date | `TIMESTAMP WITH TIME ZONE` | Default now() |
| Payment payment_date | `TIMESTAMP WITH TIME ZONE` | Default now() |
| Invoice invoice_date | `TIMESTAMP WITH TIME ZONE` | Default now() |

Application timezone: Asia/Colombo (UTC+5:30). Store in UTC. Display in local time in the UI.
Date inputs from API: ISO 8601 strings (`YYYY-MM-DD` for dates, `YYYY-MM-DDTHH:mm:ssZ` for timestamps).

**Status:** PROPOSED | **Owner:** M1

---

## 5. Enum Names and Values

Enums must match the ERD exactly. See `docs/05_current-erd-and-schema.md` for the full list.
Never use raw string literals in TypeScript — import from `types/enums.ts`.

**Status:** PROPOSED | **Owner:** M1

---

## 6. API Success/Error Format

**Success response:**
```json
{
  "data": { ... },
  "meta": { "requestId": "uuid" }
}
```

**Error response:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "fields": { "fieldName": "error message" }
  }
}
```

**HTTP Status Codes:**
| Code | Use |
|---|---|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 204 | No content (DELETE) |
| 400 | Validation error (include `fields`) |
| 401 | Not authenticated |
| 403 | Not authorized (wrong role/branch) |
| 404 | Not found |
| 409 | Conflict (double booking, unpaid checkout) |
| 500 | Internal server error (never expose DB details) |

**Status:** PROPOSED | **Owner:** M1

---

## 7. Session Shape Contract

```typescript
// types/session.ts
export interface SessionData {
  userId: string;        // user_account.user_id (UUID)
  role: UserRole;        // 'Guest' | 'Receptionist' | 'Manager' | 'Admin'
  guestId?: string;      // guest.guest_id — present if role = 'Guest'
  employeeId?: number;   // employee.employee_id — present if staff role
  branchId?: number;     // employee's branch — present if Receptionist (scoped)
  // branchId is null for Manager/Admin (they see all branches)
}
```

**Never trust any of these values supplied from the client.** Always read from the server-side session.
Guest ownership: use `session.guestId` in all guest DB queries — never a URL/body `guest_id`.

**Status:** PROPOSED | **Owner:** M1

---

## 8. Branch Scope Contract

| Role | Branch Scope |
|---|---|
| Guest | No branch scope; queries by reservation ownership |
| Receptionist | Scoped to `session.branchId` only; cannot see other branches |
| Manager | Can query any branch (no filter); `branchId` in session may be set or null |
| Admin | Can query any branch |

Receptionists must not access reservations, rooms, or reports from other branches.
Branch scope enforced in DB query predicates AND in route handler authorization — not only in UI nav.

**Status:** PROPOSED | **Owner:** M1

---

## 9. Transaction Helper Contract

Wrapper for pg client transactions:

```typescript
// lib/db/transaction.ts
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

All multi-step DB operations use this helper. Services call stored procedures inside this wrapper when needed.

**Status:** PROPOSED | **Owner:** M1

---

## 10. Migration Rules

- Filename format: `P{phase}-M{member}-T{task}-{nn}_{description}.sql`
- Applied in manifest order (see `database/migrations/manifest.md`)
- Merged migrations are immutable — corrections use new migration files
- Every migration must be idempotent where possible (`CREATE TABLE IF NOT EXISTS`, etc.)
- Database must rebuild from empty in manifest order

**Status:** PROPOSED | **Owner:** M1

---

## 11. Invoice, Charge, Payment, Balance Definitions

| Term | Definition | Source |
|---|---|---|
| Room charge | `SUM(rate_per_night * (check_out_date - check_in_date))` over all reservation_rooms | DB: fn_calc_room_charges() |
| Tax amount | `room_charge * tax_percentage_applied / 100` | DB: vw_invoice_totals |
| Service charge | `SUM(charged_price * quantity)` over all service_usage for the reservation | DB: fn_calc_service_charges() |
| Grand total | `room_charge + tax_amount + service_charge - discount_amount` | DB: vw_invoice_totals |
| Total paid | `SUM(amount_paid)` from payment records for the invoice | DB: vw_invoice_totals |
| Outstanding balance | `grand_total - total_paid` | DB: vw_invoice_totals — NEVER in TypeScript |
| Revenue (monthly) | Grand total of finalized invoices grouped by `invoice_date` month and branch | DB: vw_monthly_revenue |

**Status:** PROPOSED | **Owner:** M5 (definitions), M1 (contract format)

---

## Contract Change Log

| Date | Contract | Change | Approved By | Affected Tasks |
|---|---|---|---|---|
| Phase 0 | All | Initial draft | M1 | All P1+ tasks |
