# Member 3 — Session Prompt Template

_Copy-paste this prompt at the start of every Claude session as Member 3._

---

## Session Start Prompt

```
You are working on the HRGSMS project (Hotel Reservation and Guest Services Management System) for SkyNest Hotels, Group 39.

You are Member 3 (Hiripitiya S.K., 240238C).
Your primary slice: Guest self-service portal, online booking, My Reservations, staff reservations, overlap prevention, cancellation.

Development model: MOCK-FIRST PARALLEL.
- SP3.3 (Guest Booking API), SP3.4 (Guest UI), SP3.5 (Staff Reservation): start Day 1 with mock data.
- SP3.1 DDL (reservation, reservation_rooms): run after SP1.2 (guest/branch/employee) + SP2.1 (room) are executed.
- SP3.2 DB procedures: write SQL files now; execute after SP3.1 + SP2.2 are done.
- After P03-M03-T02 merges: notify M2 so M2 can execute fn_get_available_rooms.
- Phase 5 contributions (vw_top_services, report API): mock-first from Day 1.
- 🟡 tasks use mock returns; swap to real SQL when your DB tables land in Phase 6.

Start by reading in this exact order:
1. AGENTS.md
2. context/01-project-overview.md
3. context/02-architecture.md
4. context/03-build-plan.md  ← READ — explains parallel development model
5. context/04-code-standards.md
6. context/05-library-patterns.md
7. context/08-progress-tracker.md
8. .agent/current-state.md
9. .agent/ownership-map.md
10. .agent/members/member-3.md
11. docs/14_task-tracker.md (M3 tasks only)
12. docs/phases/phase-03-guests-and-reservations.md
13. memory.md

Then load:
- docs/05_current-erd-and-schema.md (reservation, reservation_rooms tables)
- docs/09_database-routines-triggers-views-indexes.md (sp_create_reservation)
- docs/08_business-rules-and-enforcement.md (BR-01 through BR-03, BR-13)
- docs/11_security-and-rbac.md (guest ownership rules)
- docs/21_shared-contracts.md

CRITICAL rules for Member 3:
1. sp_create_reservation() is your most important deliverable. It MUST:
   - Use SELECT ... FOR UPDATE before checking overlaps (concurrency lock)
   - Validate all rooms belong to the reservation's branch_id
   - Snapshot rate_per_night from room_type.daily_rate at booking time (store in reservation_rooms)
   - COMMIT / ROLLBACK atomically — no partial state
2. Guest ownership: ALWAYS derive guest_id from session.guestId — NEVER from URL/body
3. Use the ERD multi-room reservation model (reservation + reservation_rooms junction)
4. Availability check and overlap prevention live entirely in sp_create_reservation() — not TypeScript

After P03-M03-T02 (reservation_rooms DDL) merges: notify M2 so they can execute fn_get_available_rooms (SP2.2-T03).

Current task: [TASK_ID]
```

---

## Quick Reference: M3 Owned Files

```
app/guest/reservations/           app/guest/book/
app/api/guest/reservations/       app/staff/reservations/
app/api/staff/reservations/       services/reservation.service.ts
repositories/reservation.repository.ts
database/migrations/P03-M03-*/
database/routines/reservations/   database/seeds/P03-M03-*/
database/views/vw_active_reservations.sql
database/tests/test_ownership.sql database/tests/test_concurrency.sql
(Phase 5) database/views/vw_top_services.sql
(Phase 5) app/api/staff/reports/top-services/
```

## Subphase Quick Reference
| Subphase | Type | Tasks | Start When |
|---|---|---|---|
| SP3.1 Reservation Schema | 🔴 | T01–T02 | After SP1.2 + SP2.1 executed |
| SP3.2 Reservation DB | 🔴 | T03–T06 | After SP3.1 |
| SP3.3 Guest Booking API | 🟡 | T07–T13 | **Day 1 — mock-first** |
| SP3.4 Guest Booking UI | 🟡 | T14–T17 | **Day 1 — mock-first** |
| SP3.5 Staff Reservation | 🟡 | T18–T22 | **Day 1 — mock-first** |
| SP3.6 Tests | 🔴 | T23–T24 | After SP3.1/SP3.2 |

## Branch Naming
`feat/P03-M03-T{number}-{short-description}`
