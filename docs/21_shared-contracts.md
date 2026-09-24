# docs/21 — Shared Contracts

_Controlled cross-slice contracts that all parallel tasks depend on._
_Changes to any ACCEPTED section require a documented decision, affected-task review, and coordinated plan._
_Owner: M1. Published at Phase 1 start._

> **STATUS: ACCEPTED** — All sections below are locked for Phase 1–3 parallel development.
> Do not change any ACCEPTED section without raising a contract-change entry in Section 14
> and notifying the affected members listed under each section.

---

## How to consume these contracts

| You are building… | Read sections… |
|---|---|
| DB migrations (M1, M2) | 2 (IDs), 3 (money), 4 (dates), 5 (enums), 10 (migrations) |
| Auth / session (M1) | 7 (session shape), 8 (branch scope), 12 (RBAC) |
| Room API or service (M2) | 3, 4, 5, 6 (API shape), 9 (transactions), 13 (mock swap) |
| Reservation workflow (M3) | 3, 4, 5, 6, 9, 11 (billing terms) |
| Billing / reports (M4, M5) | 3, 4, 6, 9, 11 |
| Any route handler | 6 (API shape), 7 (session), 8 (branch scope), 12 (RBAC), 15 (SQLSTATE map) |

Import paths:
- Enums → `@/types/enums`
- Domain types → `@/types/domain`
- API types + helpers → `@/types/api`
- Session type → `@/types/session`
- Transaction helper → `@/lib/db/transaction`
- Pool → `@/lib/db/pool`

---

## 1. Canonical Terminology

| Use This | Not This | Source |
|---|---|---|
| `reservation` | `booking` (in DB/code) | ERD |
| `reservation_id` | `booking_id` | ERD |
| `reservation_status` | `booking_status` | ERD |
| `Booking` | Acceptable in UI / user-facing text only | SRS |
| `check_in_date` / `check_out_date` | `checkin` / `checkout` | ERD |
| `user_account` | `user`, `account` | ERD |
| `billing_summary` | `invoice` (except in UI labels) | ERD |
| `service_catalogue` | `services`, `menu` | ERD |
| `service_usage` | `service_order`, `usage` | ERD |

**Status:** ACCEPTED | **Owner:** M1 | **Affects:** All members

---

## 2. Identifier Types

| Table | PK Type | PostgreSQL default | TypeScript type |
|---|---|---|---|
| `user_account` | `uuid` | `gen_random_uuid()` | `string` |
| `guest` | `uuid` | `gen_random_uuid()` | `string` |
| `reservation` | `uuid` | `gen_random_uuid()` | `string` |
| `billing_summary` | `uuid` | `gen_random_uuid()` | `string` |
| `employee` | `bigint` | `GENERATED ALWAYS AS IDENTITY` | `number` |
| `branch` | `bigint` | `GENERATED ALWAYS AS IDENTITY` | `number` |
| `room_type` | `bigint` | `GENERATED ALWAYS AS IDENTITY` | `number` |
| `amenity` | `bigint` | `GENERATED ALWAYS AS IDENTITY` | `number` |
| `room` | `bigint` | `GENERATED ALWAYS AS IDENTITY` | `number` |
| `service_catalogue` | `bigint` | `GENERATED ALWAYS AS IDENTITY` | `number` |
| `service_usage` | `bigint` | `GENERATED ALWAYS AS IDENTITY` | `number` |
| `tax_policies` | `bigint` | `GENERATED ALWAYS AS IDENTITY` | `number` |
| `payment` | `bigint` | `GENERATED ALWAYS AS IDENTITY` | `number` |

All UUIDs are received from `pg` as plain strings. Never use `number` for UUID columns.
All `bigint` columns are received from `pg` as `number` (pg driver returns JS `number` for bigint within safe range).

**Status:** ACCEPTED | **Owner:** M1 | **Affects:** M1, M2, M3, M4, M5

---

## 3. Money Type

All monetary values in PostgreSQL use `NUMERIC(12,2)`. Never use `FLOAT` or `DOUBLE PRECISION` for money.

All monetary values in TypeScript:
- Are received from `pg` as **strings** (pg driver serialises NUMERIC as string).
- Stay as `string` in domain types and API responses.
- Are never subjected to arithmetic in TypeScript — all calculations run in PostgreSQL.
- May be converted with `parseFloat()` **for display only** (e.g., rendering a formatted amount in a React component). That display value must never be sent back to the server as authoritative.

```typescript
// Correct — received from pg, stored as string
const rate: string = row.rate_per_night; // e.g. "10000.00"

// Correct — display only
const display = parseFloat(rate).toLocaleString('en-LK', { style: 'currency', currency: 'LKR' });

// WRONG — arithmetic in TypeScript
const total = parseFloat(rate) * nights; // BUG — use DB fn_calc_room_charges() instead
```

**Status:** ACCEPTED | **Owner:** M1 | **Affects:** M1, M2, M3, M4, M5

---

## 4. Date and Time Contract

| Data | DB Type | Notes |
|---|---|---|
| Check-in date | `DATE` | No time component |
| Check-out date | `DATE` | No time component |
| Reservation `created_at` | `TIMESTAMP WITH TIME ZONE` | Default `now()` |
| Service `usage_date` | `TIMESTAMP WITH TIME ZONE` | Default `now()` |
| Payment `payment_date` | `TIMESTAMP WITH TIME ZONE` | Default `now()` |
| Invoice `invoice_date` | `TIMESTAMP WITH TIME ZONE` | Default `now()` |

- Application timezone: **Asia/Colombo (UTC+5:30)**. All timestamps stored in UTC.
- Dates received from `pg`: `DATE` columns arrive as ISO 8601 strings (`YYYY-MM-DD`).
  `TIMESTAMP WITH TIME ZONE` columns arrive as ISO 8601 strings with offset.
- Date inputs from the API: ISO 8601 strings only. Zod schemas validate format before the DB call.
- Display: convert UTC timestamps to local time in UI components only. Never convert server-side.

**Status:** ACCEPTED | **Owner:** M1 | **Affects:** M1, M2, M3, M4, M5

---

## 5. Enum Names and Values

All enums must match the ERD and `types/enums.ts` exactly.
Never use raw string literals for enum values in business logic — always import from `@/types/enums`.

```typescript
import type { RoomStatus, ReservationStatus, UserRole } from '@/types/enums';
```

| TypeScript type | Values | PostgreSQL enum name |
|---|---|---|
| `UserRole` | `'Guest' \| 'Receptionist' \| 'Manager' \| 'Admin'` | `user_role` |
| `AccountStatus` | `'Active' \| 'Inactive' \| 'Suspended'` | `account_status` |
| `BookingSource` | `'Online' \| 'Reception' \| 'Phone'` | `booking_source` |
| `ReservationStatus` | `'Booked' \| 'CheckedIn' \| 'CheckedOut' \| 'Cancelled'` | `reservation_status` |
| `RoomStatus` | `'Available' \| 'Occupied' \| 'Maintenance'` | `room_status` |
| `ServiceCatalogueStatus` | `'Active' \| 'Inactive'` | `service_catalogue_status` |
| `PaymentStatus` | `'Unpaid' \| 'PartiallyPaid' \| 'Paid'` | `payment_status` |

Utility types also available in `@/types/enums`:
- `StaffRole` = `Exclude<UserRole, 'Guest'>` — for staff-only gate checks
- `ManagerRole` = `'Manager' | 'Admin'` — for report/admin access checks

**Status:** ACCEPTED | **Owner:** M1 | **Affects:** All members

---

## 6. API Success / Error Format

All route handlers must return responses in exactly these shapes.
Use the helpers in `@/types/api`.

**Success response:**
```typescript
import type { ApiSuccess } from '@/types/api';

// Shape:
{ data: T, meta: { requestId: string } }

// Example:
return NextResponse.json<ApiSuccess<Room[]>>({
  data: rooms,
  meta: { requestId: crypto.randomUUID() },
});
```

**Error response:**
```typescript
import type { ApiError } from '@/types/api';
import { ERROR_CODES } from '@/types/api';

// Shape:
{ error: { code: string, message: string, fields?: { [field]: string } } }

// Example:
return NextResponse.json<ApiError>({
  error: {
    code: ERROR_CODES.NOT_FOUND,
    message: 'Room not found',
  },
}, { status: 404 });
```

**HTTP Status Codes:**
| Code | Use |
|---|---|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 204 | No content (DELETE) |
| 400 | Validation error — always include `fields` map |
| 401 | Not authenticated |
| 403 | Not authorised — wrong role or branch |
| 404 | Not found |
| 409 | Conflict — double booking, unpaid checkout |
| 500 | Internal server error — never expose DB internals in the message |

**Status:** ACCEPTED | **Owner:** M1 | **Affects:** All members

---

## 7. Session Shape Contract

```typescript
// @/types/session
export interface SessionData {
  userId: string;       // user_account.user_id (UUID)
  role: UserRole;       // 'Guest' | 'Receptionist' | 'Manager' | 'Admin'
  guestId?: string;     // guest.guest_id — present when role = 'Guest'
  employeeId?: number;  // employee.employee_id — present for staff roles
  branchId?: number;    // employee's branch — present for Receptionist (scoped)
                        // undefined for Manager / Admin (all-branch access)
}
```

Rules:
- **Never trust any session field from the client**. Always read from the server-side session.
- Guest ownership: use `session.guestId` in all guest DB queries, never a URL / body `guest_id`.
- Branch scope: use `session.branchId` to filter Receptionist queries in repository predicates.
- Reading session in a route handler:

```typescript
import { getSession } from '@/lib/auth/session';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  // session.role, session.guestId, session.branchId are now safe to use
}
```

**Status:** ACCEPTED | **Owner:** M1 | **Affects:** All members

---

## 8. Branch Scope Contract

| Role | Branch Scope Rule |
|---|---|
| `Guest` | No branch scope — queries filter by reservation ownership (`guest_id`) |
| `Receptionist` | Scoped to `session.branchId` only — cannot see or modify other branches |
| `Manager` | Can query any branch — `branchId` in session may be set or undefined |
| `Admin` | Can query any branch |

- Branch scope is enforced in **DB query predicates** (a `WHERE branch_id = $1` clause) AND in **route handler authorisation** — not only by hiding UI navigation.
- A Receptionist must never access reservations, rooms, or reports for another branch, even with a direct API call.

```typescript
// Correct pattern in a repository method
async function listRooms(branchId: number | undefined, role: UserRole) {
  if (role === 'Receptionist' && branchId === undefined) {
    throw new Error('Receptionist must have a branch scope');
  }
  const filter = branchId !== undefined ? 'WHERE r.branch_id = $1' : '';
  const params = branchId !== undefined ? [branchId] : [];
  const { rows } = await pool.query(`SELECT * FROM room ${filter}`, params);
  return rows;
}
```

**Status:** ACCEPTED | **Owner:** M1 | **Affects:** M2, M3, M4, M5

---

## 9. Transaction Helper Contract

All multi-step database operations use `withTransaction` from `@/lib/db/transaction`.

```typescript
// @/lib/db/transaction
import { pool } from '@/lib/db/pool';
import type { PoolClient } from 'pg';

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

Usage:
```typescript
import { withTransaction } from '@/lib/db/transaction';

const reservation = await withTransaction(async (client) => {
  // All queries here share the same transaction
  await client.query('CALL sp_create_reservation($1, $2)', [guestId, roomId]);
  const { rows } = await client.query('SELECT * FROM reservation WHERE ...', [...]);
  return rows[0];
});
```

Rules:
- Pass `client` from `withTransaction` into any repository method that must participate in the same transaction.
- Never call `pool.connect()` directly in service or repository code for transactional operations — use `withTransaction`.
- Stored procedures that handle their own atomicity (e.g., `sp_create_reservation`) must still be called inside `withTransaction` so the caller can roll back if post-call assertions fail.

**Status:** ACCEPTED | **Owner:** M1 | **Affects:** M1, M3, M4, M5

---

## 10. Migration Rules

- Filename format: `P{phase}-M{member}-T{task}-{nn}_{description}.sql`
- Applied in manifest order (see `database/migrations/manifest.md`)
- Applied migrations are immutable — corrections use new migration files, never edits
- Every migration must be idempotent where possible (`CREATE TABLE IF NOT EXISTS`, `DO $$ IF NOT EXISTS ... END $$`)
- Database must rebuild from empty by running migrations in manifest order
- Migration runner: `npm run migrate` (calls `lib/db/migrate.ts`)
- Enums must be created before any table that references them
- FK-dependency order: enums → `user_account` → `branch` → `employee` → `guest` → rooms → reservations → billing → payments

**Status:** ACCEPTED | **Owner:** M1 | **Affects:** M1, M2, M3, M4, M5

---

## 11. Invoice, Charge, Payment, Balance Definitions

These definitions are authoritative. All values in this table come from PostgreSQL. Never recompute them in TypeScript.

| Term | Formula | DB source |
|---|---|---|
| Nights | `check_out_date - check_in_date` | Computed in stored procedure |
| Room charge | `SUM(rate_per_night × nights)` over all `reservation_rooms` | `fn_calc_room_charges(reservation_id)` |
| Tax amount | `room_charge × tax_percentage_applied / 100` | `vw_invoice_totals` |
| Service charge | `SUM(charged_price × quantity)` over all `service_usage` for the reservation | `fn_calc_service_charges(reservation_id)` |
| Discount amount | `room_charge × discount_percentage / 100` (0 if no discount) | `vw_invoice_totals` |
| Grand total | `room_charge + tax_amount + service_charge - discount_amount` | `vw_invoice_totals` |
| Total paid | `SUM(amount_paid)` from `payment` records for the invoice | `vw_invoice_totals` |
| Outstanding balance | `grand_total - total_paid` | `vw_invoice_totals` — **NEVER computed in TypeScript** |
| Monthly revenue | Grand total of finalised invoices grouped by `invoice_date` month + branch | `vw_monthly_revenue` |

TypeScript representation: use `InvoiceTotals` from `@/types/domain`. All fields are `string` (NUMERIC from pg).

**Status:** ACCEPTED | **Owner:** M5 (definitions), M1 (contract format) | **Affects:** M3, M4, M5

---

## 12. RBAC — Route Handler Authorisation Pattern

Every route handler must follow this sequence. Skip no step.

```
1. getSession()              → 401 if no session
2. assertRole(session, [...allowed roles])  → 403 if role not allowed
3. assertBranchScope(session, branchId)    → 403 if Receptionist accessing wrong branch
4. validateInput(schema)     → 400 if Zod validation fails
5. call repository / service
6. return success response
```

```typescript
// Standard route handler skeleton
import { getSession } from '@/lib/auth/session';
import { z } from 'zod';
import { ERROR_CODES } from '@/types/api';

export async function POST(req: Request) {
  // Step 1 — Auth
  const session = await getSession();
  if (!session) {
    return Response.json({ error: { code: ERROR_CODES.NOT_AUTHENTICATED, message: 'Not authenticated' } }, { status: 401 });
  }

  // Step 2 — Role check
  if (!['Receptionist', 'Manager', 'Admin'].includes(session.role)) {
    return Response.json({ error: { code: ERROR_CODES.INSUFFICIENT_ROLE, message: 'Staff access required' } }, { status: 403 });
  }

  // Step 3 — Branch scope (Receptionist only)
  // (call assertBranchScope helper when built — see lib/auth/rbac.ts)

  // Step 4 — Input validation
  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return Response.json({
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Validation failed', fields: result.error.flatten().fieldErrors }
    }, { status: 400 });
  }

  // Step 5 — Business logic
  const data = await someService.doSomething(result.data, session);

  // Step 6 — Response
  return Response.json({ data, meta: { requestId: crypto.randomUUID() } }, { status: 200 });
}
```

**Status:** ACCEPTED | **Owner:** M1 | **Affects:** All members building route handlers

---

## 13. Mock-First Repository Swap Contract

During parallel development (Phase 1–5), repositories operate on in-memory mock stores.
When SP1.2 / SP2.1 migrations are executed on the real database, each mock is swapped to real pg queries.

**Rules for mock repositories:**

1. The **public function signatures must not change** at swap time. The real implementation is a drop-in.
2. Mock stores must be initialised to the canonical seed data (15 rooms, 3 branches, 3 room types, etc.).
3. Every mock repository must export a `_resetMockStore()` method for test suite `beforeEach` resets.
4. Mock constraint enforcement must match DB constraints (UNIQUE violations throw; FK violations throw; NOT NULL enforced).
5. Mock implementations must NOT use `pg`, `pool`, or `withTransaction` — they operate purely in memory.

**Swap trigger:** a migration has been applied and the schema is confirmed live for that member's domain.

**Swap process (per member):**
1. Replace mock implementation with parameterized `pool.query` or `withTransaction` calls.
2. Remove `_resetMockStore()` export (or keep as no-op for test compatibility).
3. Run the typecheck gate (`npm run typecheck`).
4. Update `docs/14_task-tracker.md` status.

**Status:** ACCEPTED | **Owner:** M1 | **Affects:** M2, M3, M4, M5

---

## 14. SQLSTATE to HTTP Error Code Mapping

Stored procedures raise custom SQLSTATE codes. Route handlers must map these to API error responses.
Use `isSqlState()` from `@/types/api`.

```typescript
import { isSqlState } from '@/types/api';
import { SQLSTATE } from '@/types/enums';

} catch (err) {
  if (isSqlState(err, SQLSTATE.UNIQUE_VIOLATION)) {
    return Response.json({ error: { code: 'CONFLICT', message: 'Already exists' } }, { status: 409 });
  }
  if (isSqlState(err, SQLSTATE.ROOM_OVERLAP)) {
    return Response.json({ error: { code: 'ROOM_OVERLAP', message: 'Room already booked for these dates' } }, { status: 409 });
  }
  if (isSqlState(err, SQLSTATE.OUTSTANDING_BALANCE)) {
    return Response.json({ error: { code: 'OUTSTANDING_BALANCE', message: 'Cannot check out with outstanding balance' } }, { status: 409 });
  }
  // fallthrough → 500
  return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } }, { status: 500 });
}
```

| SQLSTATE | Constant | HTTP | Error code |
|---|---|---|---|
| `23505` | `SQLSTATE.UNIQUE_VIOLATION` | 409 | `CONFLICT` |
| `45001` | `SQLSTATE.ROOM_OVERLAP` | 409 | `ROOM_OVERLAP` |
| `45002` | `SQLSTATE.ROOM_BRANCH_MISMATCH` | 403 | `BRANCH_SCOPE_VIOLATION` |
| `45003` | `SQLSTATE.ROOM_IN_MAINTENANCE` | 409 | `CONFLICT` |
| `45010` | `SQLSTATE.NOT_BOOKED_STATUS` | 409 | `INVALID_STATUS_TRANSITION` |
| `45011` | `SQLSTATE.NOT_CHECKED_IN` | 409 | `INVALID_STATUS_TRANSITION` |
| `45030` | `SQLSTATE.OUTSTANDING_BALANCE` | 409 | `OUTSTANDING_BALANCE` |
| `45031` | `SQLSTATE.NOT_CHECKED_IN_FOR_CHECKOUT` | 409 | `INVALID_STATUS_TRANSITION` |

**Status:** ACCEPTED | **Owner:** M1 | **Affects:** M3, M4, M5

---

## Contract Change Log

| Date | Contract | Change | Approved By | Affected Tasks |
|---|---|---|---|---|
| Phase 0 | All | Initial draft | M1 | All P1+ tasks |
| Phase 1 / 2026-09-19 | All | Published — all sections promoted to ACCEPTED; sections 12–14 added (RBAC pattern, mock swap contract, SQLSTATE map) | M1 (P01-M01-T04) | All P1+ tasks |
