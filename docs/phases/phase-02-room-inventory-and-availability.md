# Phase 2 — Room Inventory and Availability

## Integration Owner: Member 2 (M2)
## Dependency (DB layer): SP1.2 tables executed on real DB
## Parallel start: SP2.3 + SP2.4 begin Day 1 with mock data

## Parallelism Strategy
- **SP2.1** — `room` DDL. Needs branch + room_type tables to exist. Write + run after SP1.2 is merged.
- **SP2.2** — `fn_get_available_rooms` references `reservation_rooms`. Write the SQL now; execute after P03-M03-T02 is merged.
- **SP2.3 + SP2.4** — Room API and UI. Write fully against mock data from Day 1. Swap mocks for real SQL when SP2.1 is executed.

## Subphases

### SP2.1 — Room Schema _(DB serial, after SP1.2 executed)_

| Task | Title | Type | Depends On |
|---|---|---|---|
| P02-M02-T01 | `room` table DDL + RoomStatus enum | 🔴 SERIAL | P01-M01-T07, P01-M02-T01 DB done |
| P02-M02-T02 | Seed 15 rooms across 3 branches | 🔴 SERIAL | T01 |

---

### SP2.2 — Availability DB _(DB serial — needs reservation_rooms from P3)_

| Task | Title | Type | Depends On |
|---|---|---|---|
| P02-M02-T03 | `fn_get_available_rooms(branch_id, check_in, check_out)` | 🔴 SERIAL | SP2.1 + P03-M03-T02 DB done |
| P02-M02-T04 | Composite index on `reservation_rooms` (room_id, check_in, check_out) | 🔴 SERIAL | P03-M03-T02 DB done |

> **Cross-phase note:** Write T03 SQL now (it can reference the table name); execute it after P03-M03-T02 is merged. Coordinate with M3.

Date overlap formula used in function:
```sql
existing_checkin < p_check_out AND existing_checkout > p_check_in
```

---

### SP2.3 — Room API _(mock-first — start Day 1)_

| Task | Title | Type | Files |
|---|---|---|---|
| P02-M02-T05 | Room repository — CRUD queries | 🟡 MOCK-FIRST | `repositories/room.repository.ts` |
| P02-M02-T06 | Room service — business logic | 🟡 MOCK-FIRST | `services/room.service.ts` |
| P02-M02-T07 | Availability repository (wraps fn_get_available_rooms) | 🟡 MOCK-FIRST | `repositories/availability.repository.ts` |
| P02-M02-T08 | Availability service — search orchestration | 🟡 MOCK-FIRST | `services/availability.service.ts` |
| P02-M02-T09 | GET `/api/availability` — public availability search | 🟡 MOCK-FIRST | `app/api/availability/route.ts` |
| P02-M02-T10 | GET `/api/staff/rooms` — list rooms (with filters) | 🟡 MOCK-FIRST | `app/api/staff/rooms/route.ts` |
| P02-M02-T11 | POST `/api/staff/rooms` — create room | 🟡 MOCK-FIRST | `app/api/staff/rooms/route.ts` |
| P02-M02-T12 | PATCH `/api/staff/rooms/[id]` — update room status | 🟡 MOCK-FIRST | `app/api/staff/rooms/[id]/route.ts` |

---

### SP2.4 — Room UI _(mock-first — start Day 1)_

| Task | Title | Type | Files |
|---|---|---|---|
| P02-M02-T13 | Public availability search page | 🟡 MOCK-FIRST | `app/search/page.tsx` |
| P02-M02-T14 | Room card component | 🟢 PARALLEL | `components/RoomCard.tsx` |
| P02-M02-T15 | Staff rooms list + management page | 🟡 MOCK-FIRST | `app/staff/rooms/page.tsx` |
| P02-M02-T16 | Staff room form/edit component | 🟢 PARALLEL | `components/RoomForm.tsx` |

---

### SP2.5 — Tests _(serial, after SP2.2 executed)_

| Task | Title | Type | Files |
|---|---|---|---|
| P02-M02-T17 | Availability function tests (maintenance excluded, overlap excluded) | 🔴 SERIAL | `database/tests/test_availability.sql` |
| P02-M02-T18 | EXPLAIN ANALYZE for availability query + file result | 🔴 SERIAL | `docs/09_database-routines-triggers-views-indexes.md` |

## Key DB Deliverables
- `room` table (FK to `branch`, `room_type`)
- `fn_get_available_rooms(branch_id BIGINT, check_in DATE, check_out DATE) RETURNS TABLE(...)`
- Composite index: `idx_reservation_rooms_dates`

## Completion Criteria
- Availability search returns correct rooms for Scenario 1 (docs/10)
- Maintenance rooms excluded from results
- Only Manager/Admin can set room status to Maintenance
- EXPLAIN ANALYZE result filed in docs/09
