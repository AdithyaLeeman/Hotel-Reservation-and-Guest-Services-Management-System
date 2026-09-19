# context/03 — Build Plan

## Phase Overview

| Phase | Focus | Integration Owner |
|---|---|---|
| P0 | Initialization, docs, scaffold | — (done) |
| P1 | Foundation, auth, RBAC, master data | M1 |
| P2 | Room inventory, availability search | M2 |
| P3 | Guests, reservations, online booking | M3 |
| P4 | Check-in, services, billing inputs | M4 + M5 (parallel) |
| P5 | Payments, checkout, reports | M5 (M2/M3/M4 contribute) |
| P6 | Integration testing, deployment prep | All (M1 coordinates) |

---

## Parallel Development Strategy

### The Problem With Sequential Phases
FK constraints require DB migrations to execute in dependency order on the real database. But **only DB execution is sequential** — writing service, API, and UI code is not.

### Mock-First Parallel Development
Every member **starts their service/repository/API/UI work on Day 1** using mock data returns. When their DB dependency lands (another member's migrations are merged and executed), they replace mock returns with real parameterized SQL.

```
Day 1:  M1 publishes shared contracts → ALL members start 🟡 MOCK-FIRST work
        M1 writes real DB migrations (sequential, critical path)

Day 2+: M2/M3/M4/M5 write repository/service/API/UI code with mock returns
        M1 finishes enums → user_account → branch → employee → guest DDL

Week 2: SP1.2 merged → M2 can execute room_type/room DDL on real DB
        M3 can execute reservation DDL once SP1.2 + SP2.1 are executed
        M4/M5 can execute their DDL once SP3.1 is executed

Phase 6: All mock returns swapped for real SQL, E2E verified
```

### Task Type Labels
- 🔴 **SERIAL** — SQL DDL/procedure/view. Execute only after FK dependencies are on the real DB.
- 🟡 **MOCK-FIRST** — App layer code. Write from Day 1 with mock returns. Swap to real DB calls when dependency is DONE.
- 🟢 **PARALLEL** — No DB dependency at all. Start immediately.

---

## Subphase Structure (per phase)

Each phase is broken into 3–5 subphases:

| Pattern | Subphase | Contents |
|---|---|---|
| Schema | SP{N}.1 | DDL tables (serial) |
| DB Logic | SP{N}.2 | Functions, procedures, views (serial) |
| API | SP{N}.3 | Repository + service + route handlers (mock-first) |
| UI | SP{N}.4 | React pages + components (mock-first) |
| Tests | SP{N}.5 | DB-level tests + performance (serial) |

---

## Shared Contract Gate (SP1.1 — BEFORE ANYONE STARTS)

M1 must complete and publish `docs/21_shared-contracts.md` before any other member writes code. Contracts required:
- Canonical terminology (reservation vs booking)
- Identifier types per table (UUID vs bigint)
- Money type: `NUMERIC(12,2)`
- Date/time handling and timezone strategy
- Enum names and values (matching ERD)
- API success/error format
- Session shape (what is stored, what is never trusted from client)
- Branch scope contract for staff sessions
- Migration naming convention
- Transaction helper contract

**Gate owner: M1.** SP1.1 (T01–T04) must reach DONE before any 🟡 MOCK-FIRST task becomes READY.

---

## Phase Summaries

### Phase 1 — Foundation (M1 + M2 start)
Dependencies: P0 complete, `develop` branch exists

Subphases:
- SP1.1 — DB Infrastructure (M1): pg pool, migration runner, shared contracts
- SP1.2 — Core Schema DDL (M1 + M2): all core tables
- SP1.3 — Auth System (M1): bcrypt, iron-session, login/register APIs, RBAC
- SP1.4 — UI Shell (M1): layouts, navbars, auth pages

### Phase 2 — Rooms and Availability (M2)
Dependencies: SP1.2 executed (DB)

Subphases:
- SP2.1 — Room Schema (serial)
- SP2.2 — Availability DB: `fn_get_available_rooms` (needs reservation_rooms from P3 — coordinate)
- SP2.3 — Room API (mock-first)
- SP2.4 — Room UI (mock-first)
- SP2.5 — Tests + EXPLAIN ANALYZE (serial)

### Phase 3 — Reservations (M3)
Dependencies: SP1.2 + SP2.1 executed (DB)

Subphases:
- SP3.1 — Reservation Schema (serial)
- SP3.2 — Reservation DB: `sp_create_reservation`, cancel, detail fn, active view (serial)
- SP3.3 — Guest Booking API (mock-first)
- SP3.4 — Guest Booking UI (mock-first)
- SP3.5 — Staff Reservation API + UI (mock-first)
- SP3.6 — Ownership + concurrency tests (serial)

### Phase 4 — Services and Billing (M4 + M5 parallel)
Dependencies: SP3.1 executed (DB)

M4 subphases:
- SP4.1 — Service Schema (serial)
- SP4.2 — Service DB: check-in, usage, charge functions (serial)
- SP4.3 — Service API (mock-first)
- SP4.4 — Service UI (mock-first)

M5 subphases (run simultaneously):
- SP4.5 — Billing Schema (serial, same DB dependency as SP4.1)
- SP4.6 — Invoice DB: `sp_finalize_invoice`, `vw_invoice_totals` (serial, needs M4 charge fns)
- SP4.7 — Billing API (mock-first)

### Phase 5 — Payments and Reports (M5, M2/M3/M4 contribute)
Dependencies: SP4.5 executed (DB)

Subphases:
- SP5.1 — Payment Schema (serial)
- SP5.2 — Payment DB: `sp_post_payment`, `sp_checkout` (serial)
- SP5.3 — Report Views (serial, all tables needed)
- SP5.4 — Payment API (mock-first)
- SP5.5 — Reports API (mock-first, M2/M3 contribute)
- SP5.6 — Payment UI (mock-first)
- SP5.7 — Reports UI (mock-first, M2/M4 contribute)

### Phase 6 — Integration and Testing (All)
Dependencies: All features in REVIEW

Subphases:
- SP6.1 — Mock→Real DB wire-up (all members)
- SP6.2 — E2E flow verification (all members)
- SP6.3 — Security + concurrency tests (M1/M3/M5)
- SP6.4 — EXPLAIN ANALYZE (M2/M5)
- SP6.5 — Final polish + README (M1)

---

## Dependency Graph

```
               ┌──────────────────────────────────────────────────────┐
               │  SP1.1 (M1) — pg pool, shared contracts              │
               │  ← ALL members start 🟡 MOCK-FIRST work after this  │
               └────────────────────────┬─────────────────────────────┘
                                        │ DB execution required
                    ┌───────────────────┼───────────────────┐
                    ▼                                       ▼
           SP1.2 M1 DDL                              SP1.2 M2 DDL
      (user_account, branch,                    (room_type, amenity,
       employee, guest)                          room_type_amenity)
                    │                                       │
                    ▼                                       ▼
           SP3.1 M3 DDL ◄─────────────────── SP2.1 M2 DDL (room)
       (reservation,                                       │
        reservation_rooms) ─────────────────────────► SP2.2 M2 DB
                    │                             (fn_get_available_rooms)
          ┌─────────┴──────────┐
          ▼                   ▼
  SP4.1 M4 DDL         SP4.5 M5 DDL
 (service tables)     (tax, billing)
          │                   │
          ▼                   ▼
  SP4.2 M4 DB      SP4.6 M5 DB ◄── needs SP4.2 fns
  (check-in,sp)    (sp_finalize_invoice)
          │                   │
          └────────┬──────────┘
                   ▼
           SP5.1 M5 DDL (payment)
                   │
           SP5.2 M5 DB (sp_post_payment, sp_checkout)
                   │
           SP5.3 Report Views (all members)
                   │
                   ▼
           Phase 6 — Integration
```

## Work-in-Progress Limit
One `IN_PROGRESS` task per member at a time.

See `docs/14_task-tracker.md` for all 139 task IDs, types, dependencies, and statuses.
