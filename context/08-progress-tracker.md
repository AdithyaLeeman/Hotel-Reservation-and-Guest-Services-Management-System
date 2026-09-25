# context/08 — Progress Tracker

_Living snapshot. Updated at every session end._
<<<<<<< HEAD
_Last updated: 42 tasks complete / reviewed across Phase 1–5. 220 tests passing. 2026-09-24._

## Current Phase: 1 (Foundation & Security) & 2 (Room Inventory & Availability) — Active Parallel Development
=======
_Last updated: M4 SP4.3 (Service API) + SP4.4 (Service UI) mock-first REVIEW — 2026-09-25._

## Current Phase: 1 — Foundation, Security, and Master Data (SP1.1 is the immediate next step)
>>>>>>> feat/service-usage-mock

## Overall Progress

| Phase | Subphases | Tasks | Status | Integration Owner |
|---|---|---|---|---|
| P0 — Initialization | — | — | **DONE** | — |
<<<<<<< HEAD
| P1 — Foundation | SP1.1–SP1.4 | 29 | **IN_PROGRESS** (SP1.1 DONE, SP1.2/SP1.3 DDL & Auth logic DONE/REVIEW) | M1 |
| P2 — Rooms & Availability | SP2.1–SP2.5 | 18 | 🟢 **IN_PROGRESS** (SP2.3 API & SP2.4 UI pages in REVIEW) | M2 |
| P3 — Reservations | SP3.1–SP3.6 | 24 | 🟢 **IN_PROGRESS** (SP3.3 API & SP3.5 Staff routes in REVIEW) | M3 |
| P4 — Services & Billing | SP4.1–SP4.7 | 27 | 🟢 **IN_PROGRESS** (SP4.3 Service repo & SP4.7 Billing repo in REVIEW) | M4 + M5 |
| P5 — Payments & Reports | SP5.1–SP5.7 | 22 | 🟢 **IN_PROGRESS** (SP5.4 Payment repo in REVIEW) | M5 |
| P6 — Integration & Testing | SP6.1–SP6.5 | 19 | TODO | All |

> **Status Summary:** 42 of 139 tasks implemented in code (30.2% overall completion). All 220 vitest unit/integration tests are PASSING.
=======
| P1 — Foundation | SP1.1–SP1.4 | 29 | **READY** (SP1.1 unblocked) | M1 |
| P2 — Rooms & Availability | SP2.1–SP2.5 | 18 | 🟡 SP2.3/SP2.4 start Day 1 | M2 |
| P3 — Reservations | SP3.1–SP3.6 | 24 | 🟡 SP3.3–SP3.5 start Day 1 | M3 |
| P4 — Services & Billing | SP4.1–SP4.7 | 27 | 🟡 SP4.3/SP4.4/SP4.7 start Day 1 | M4 + M5 |
| P5 — Payments & Reports | SP5.1–SP5.7 | 22 | 🟡 SP5.4–SP5.7 start Day 1 | M5 |
| P6 — Integration & Testing | SP6.1–SP6.5 | 19 | TODO | All |

> **Key change:** 🟡 MOCK-FIRST subphases across all phases can begin as soon as SP1.1 (shared contracts) is published. Only 🔴 SERIAL (DB migration) subphases must wait for their FK dependencies.
>>>>>>> feat/service-usage-mock

## Phase 0 — Completed Tasks

| Task | Status | Notes |
|---|---|---|
| Source docs → project-sources/ | DONE | |
| AGENTS.md full contract | DONE | 19-section contract |
| CLAUDE.md update | DONE | |
| memory.md | DONE | |
| ui-registry.md | DONE | |
| .env.example | DONE | |
| context/01–08 | DONE | All 8 files complete |
| .agent/ directory structure | DONE | All member files + decisions + handoffs |
| docs/ 22 documents | DONE | docs/00–21 |
<<<<<<< HEAD
| docs/phases/ 7 files | DONE | Rewritten with subphases |
=======
| docs/phases/ 7 files | DONE | Rewritten with subphases (this session) |
>>>>>>> feat/service-usage-mock
| docs/member-prompts/ 5 files | DONE | |
| database/ scaffold | DONE | 7 subdirs |
| lib/ stubs | DONE | pool, transaction, migrate, seed, reset, auth, validation |
| services/ stubs | DONE | 8 service stubs |
| repositories/ stubs | DONE | 8 repository stubs |
| types/ stubs | DONE | api, domain, enums, session |
| components/ stubs | DONE | GuestNav, StaffNav |
| package.json scripts | DONE | migrate, seed, db:reset, test |
| Plan restructured (parallel + subphases) | DONE | 139 tasks across 25 subphases |
| develop branch created | PENDING HUMAN | Requires manual `git push` |

<<<<<<< HEAD
## Current Subphase Status — Phase 1 & 2
=======
## Current Subphase Status — Phase 1
>>>>>>> feat/service-usage-mock

| Subphase | Tasks | Status |
|---|---|---|
| SP1.1 — DB Infrastructure | T01–T04 | **DONE** (M1) |
<<<<<<< HEAD
| SP1.2 — Core Schema DDL | T05–T09 (M1), T01–T04 (M2) | **IN_PROGRESS** (M1 DDLs T05–T09 & seed DONE) |
| SP1.3 — Auth System | T10–T21 | **IN_PROGRESS** (T10, T11, T19, T21 DONE; T12, T13 in REVIEW) |
| SP1.4 — UI Shell | T22–T29 | IN_PROGRESS |
| SP2.3 — Room API | T05–T12 | **REVIEW** (M2 repository, services, API routes) |
| SP2.4 — Room UI | T13–T16 | **REVIEW** (M2 availability search page, staff rooms page, cards/forms) |
| SP3.3 / SP3.5 — Reservation API | T07–T13, T18–T20 | **REVIEW** (M3 repository, services, API handlers) |
| SP4.3 / SP4.7 — Service & Billing API | T09–T11 (M4), T05–T06 (M5) | **REVIEW** (M4 & M5 repositories and services) |
| SP5.4 — Payment API | T08–T09 (M5) | **REVIEW** (M5 payment repository & service) |
=======
| SP1.2 — Core Schema DDL | T05–T09 (M1), T01–T04 (M2) | **IN_PROGRESS** (M1 DDLs & seed DONE) |
| SP1.3 — Auth System | T10–T21 | **IN_PROGRESS** (M1 password, session, RBAC, Zod schemas DONE) |
| SP1.4 — UI Shell | T22–T29 | TODO (Next step) |
>>>>>>> feat/service-usage-mock

## Blocked Items
- `develop` branch creation — **BLOCKED on human manual push.**
  ```bash
  git checkout -b develop
  git push -u origin develop
  ```

## Next Up for Each Member
| Member | Immediate Next Task | Can Start? |
|---|---|---|
<<<<<<< HEAD
| M1 | P01-M01-T14 — Guest registration API route & auth middleware (T20) | ✅ Now |
| M2 | P01-M02-T01 — `room_type` table DDL (serial DB execution) | ✅ Branch table DONE |
| M3 | P03-M03-T14 — Guest booking form page UI | ✅ Now |
| M4 | P04-M04-T12 — POST `/api/staff/reservations/[id]/checkin` API handler | ✅ Now |
| M5 | P05-M05-T10 — POST `/api/guest/payments` API route handler | ✅ Now |
=======
| M1 | P01-M01-T01 — Install pg + @types/pg | ✅ Now |
| M2 | P02-M02-T13 — Public availability search page [SP2.3 T05..T12 in REVIEW] | ✅ Mock work now |
| M3 | P03-M03-T07 — Reservation repository (mock) | ✅ Mock work now |
| M4 | P05-M04-T01 — Service usage report page (SP4.3+SP4.4 REVIEW) | ✅ Mock work now |
| M5 | P05-M05-T08 — Payment repository (mock) + P04-M05-T05 (billing, mock) | ✅ Mock work now |

> All members wait for M1 to publish `docs/21_shared-contracts.md` (P01-M01-T04) before writing any code, so names/types are agreed.
>>>>>>> feat/service-usage-mock

## Recent Decisions
- Adopt ERD multi-room reservation model (reservation + reservation_rooms)
- Database-first computation rule: all financial calculations in PostgreSQL
- Tailwind CSS retained
- Antigravity skill set used
- No ORM — direct pg SQL
<<<<<<< HEAD
- Mock-first parallel development strategy adopted
- Task tracker and progress context synchronized with merged codebase evidence (2026-09-24)
=======
- **Mock-first parallel development strategy adopted** (this session)
- Task granularity reduced to commit-sized (one file, one focused change per task)
>>>>>>> feat/service-usage-mock

## Pending Approvals
- Overlap prevention technique (SELECT FOR UPDATE vs exclusion constraint)
- Tax scope (room charges only vs. also service charges)
- Cancellation/refund policy (TBD-5)
- Payment gateway (TBD-1 — mock for now)
- Revenue report definition (invoice date vs payment date accrual)
<<<<<<< HEAD

=======
>>>>>>> feat/service-usage-mock
