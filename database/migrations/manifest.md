# database/migrations/manifest.md — Migration Manifest

_All migration files applied in this order. Append-only. Never modify or reorder committed entries._
_Apply with: `npm run migrate`_

## Format
`P{phase}-M{member}-T{task}-{nn}_{description}.sql`

> **Task ID note:** Task IDs reflect the restructured plan (SP1.1–SP1.4). T01–T04 are infrastructure tasks; DDL tasks start at T05.

## Apply Order

```
# Phase 1 — Foundation
P01-M01-T05-01_create_enums.sql
P01-M01-T06-01_create_user_account.sql
P01-M01-T07-01_create_branch.sql
P01-M01-T08-01_create_employee.sql
P01-M01-T09-01_create_guest.sql
P01-M02-T01-01_create_room_type.sql
# P01-M02-T02-01_create_amenity.sql
# P01-M02-T03-01_create_room_type_amenity.sql

# Phase 2 — Rooms
# P02-M02-T01-01_create_room.sql

# Phase 3 — Reservations
# P03-M03-T01-01_create_reservation.sql
# P03-M03-T02-01_create_reservation_rooms.sql

# Phase 4 — Services and Billing
# P04-M04-T01-01_create_service_catalogue.sql
# P04-M04-T03-01_create_service_usage.sql
# P04-M05-T01-01_create_tax_policies.sql
# P04-M05-T02-01_create_billing_summary.sql

# Phase 5 — Payments
# P05-M05-T01-01_create_payment.sql
```

## Merge Conflict Rules
- If two members created sequential migrations independently, the integration owner decides the order
- Add a conflict resolution note below the affected entries
- Never edit a migration already applied to any shared environment

## Notes
- All migrations must be idempotent where possible (`CREATE TABLE IF NOT EXISTS`, `CREATE TYPE IF NOT EXISTS`)
- Extensions required: `pgcrypto` for `gen_random_uuid()` — add in first migration
- Ensure `CREATE EXTENSION IF NOT EXISTS pgcrypto;` is the first statement in `P01-M01-T05-01_create_enums.sql`
