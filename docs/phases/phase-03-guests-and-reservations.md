# Phase 3 — Guests and Reservations

## Integration Owner: Member 3 (M3)
## Dependency (DB layer): SP1.2 (guest/branch/employee tables) + SP2.1 (room table) executed
## Parallel start: SP3.3, SP3.4, SP3.5 begin Day 1 with mock data

## Parallelism Strategy
- **SP3.1** — `reservation` + `reservation_rooms` DDL. FK dependencies: guest, branch, employee, room. Write + run after SP1.2 + SP2.1 are merged.
- **SP3.2** — DB procedures. Write SQL any time; execute after SP3.1 is executed. `sp_create_reservation` needs `fn_get_available_rooms` from SP2.2.
- **SP3.3 / SP3.4 / SP3.5** — All API routes and UI pages. Develop against mock returns from Day 1.

## Subphases

### SP3.1 — Reservation Schema _(DB serial, after SP1.2 + SP2.1 executed)_

| Task | Title | Type | Depends On |
|---|---|---|---|
| P03-M03-T01 | `reservation` table DDL | 🔴 SERIAL | P01-M01-T09, P01-M01-T07, P01-M01-T08 DB done |
| P03-M03-T02 | `reservation_rooms` table DDL | 🔴 SERIAL | T01 + P02-M02-T01 DB done |

> **Note for M2:** Once T02 is merged, M2 can execute `fn_get_available_rooms` (SP2.2-T03).

---

### SP3.2 — Reservation DB _(DB serial, after SP3.1)_

| Task | Title | Type | Depends On |
|---|---|---|---|
| P03-M03-T03 | `sp_create_reservation()` atomic procedure | 🔴 SERIAL | SP3.1 + SP2.2 done |
| P03-M03-T04 | `fn_get_reservation_detail()` function | 🔴 SERIAL | SP3.1 done |
| P03-M03-T05 | `sp_cancel_reservation()` stored procedure | 🔴 SERIAL | SP3.1 done |
| P03-M03-T06 | `vw_active_reservations` DB view | 🔴 SERIAL | SP3.1 done |

#### sp_create_reservation() critical logic:
```sql
BEGIN
  SELECT room records FOR UPDATE   -- concurrency lock
  CHECK no active overlap for each requested room
  CHECK all rooms belong to p_branch_id
  INSERT INTO reservation ...
  INSERT INTO reservation_rooms ... (copy rate_per_night snapshot)
COMMIT -- or ROLLBACK + RAISE EXCEPTION on any failure
```

---

### SP3.3 — Guest Booking API _(mock-first — start Day 1)_

| Task | Title | Type | Files |
|---|---|---|---|
| P03-M03-T07 | Reservation repository — create (calls sp) | 🟡 MOCK-FIRST | `repositories/reservation.repository.ts` |
| P03-M03-T08 | Reservation repository — list by guest | 🟡 MOCK-FIRST | `repositories/reservation.repository.ts` |
| P03-M03-T09 | Reservation repository — get detail by ID | 🟡 MOCK-FIRST | `repositories/reservation.repository.ts` |
| P03-M03-T10 | Reservation service — orchestration layer | 🟡 MOCK-FIRST | `services/reservation.service.ts` |
| P03-M03-T11 | POST `/api/guest/reservations` — create booking | 🟡 MOCK-FIRST | `app/api/guest/reservations/route.ts` |
| P03-M03-T12 | GET `/api/guest/reservations` — my reservations list | 🟡 MOCK-FIRST | `app/api/guest/reservations/route.ts` |
| P03-M03-T13 | GET `/api/guest/reservations/[id]` — reservation detail | 🟡 MOCK-FIRST | `app/api/guest/reservations/[id]/route.ts` |

Security rule: `guest_id` is always read from session, never from request body.

---

### SP3.4 — Guest Booking UI _(mock-first — start Day 1)_

| Task | Title | Type | Files |
|---|---|---|---|
| P03-M03-T14 | Guest booking form page | 🟡 MOCK-FIRST | `app/guest/book/page.tsx` |
| P03-M03-T15 | Booking confirmation page | 🟡 MOCK-FIRST | `app/guest/book/confirm/page.tsx` |
| P03-M03-T16 | My reservations list page | 🟡 MOCK-FIRST | `app/guest/reservations/page.tsx` |
| P03-M03-T17 | Reservation detail page | 🟡 MOCK-FIRST | `app/guest/reservations/[id]/page.tsx` |

---

### SP3.5 — Staff Reservation _(mock-first — start Day 1)_

| Task | Title | Type | Files |
|---|---|---|---|
| P03-M03-T18 | POST `/api/staff/reservations` — create reservation (staff) | 🟡 MOCK-FIRST | `app/api/staff/reservations/route.ts` |
| P03-M03-T19 | GET `/api/staff/reservations` — list with filters | 🟡 MOCK-FIRST | `app/api/staff/reservations/route.ts` |
| P03-M03-T20 | PATCH `/api/staff/reservations/[id]/cancel` | 🟡 MOCK-FIRST | `app/api/staff/reservations/[id]/cancel/route.ts` |
| P03-M03-T21 | Staff reservations list page | 🟡 MOCK-FIRST | `app/staff/reservations/page.tsx` |
| P03-M03-T22 | Staff reservation detail page | 🟡 MOCK-FIRST | `app/staff/reservations/[id]/page.tsx` |

---

### SP3.6 — Tests _(serial, after SP3.1 / SP3.2 executed)_

| Task | Title | Type | Files |
|---|---|---|---|
| P03-M03-T23 | Ownership enforcement tests (guest A cannot see guest B) | 🔴 SERIAL | `database/tests/test_ownership.sql` |
| P03-M03-T24 | Concurrent double-booking prevention test | 🔴 SERIAL | `database/tests/test_concurrency.sql` |

## Key DB Deliverables
- `reservation` table (FK to guest, branch, employee)
- `reservation_rooms` table (FK to reservation, room)
- `sp_create_reservation()` — atomic, overlap-safe, branch-scoped
- `fn_get_reservation_detail()` — full join for UI display
- `sp_cancel_reservation()` — lifecycle state guard
- `vw_active_reservations` — filtered view for dashboard

## Completion Criteria
- Booking atomically creates reservation + reservation_rooms
- Overlap → 409 from stored procedure
- Cross-branch rooms → 422
- Guest A cannot view Guest B's reservations (ownership enforced in SQL predicate)
- Concurrent double-booking test: exactly one winner, one 409
