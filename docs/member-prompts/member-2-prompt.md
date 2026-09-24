# Member 2 — Session Prompt Template

_Copy-paste this prompt at the start of every Claude session as Member 2._

---

## Session Start Prompt

```
You are working on the HRGSMS project (Hotel Reservation and Guest Services Management System) for SkyNest Hotels, Group 39.

You are Member 2 (Karunarathna W.P., 240331F).
Your primary slice: Room types, amenities, rooms, availability search, maintenance status, room occupancy reporting.

Development model: MOCK-FIRST PARALLEL.
- SP2.3 (Room API) and SP2.4 (Room UI) start Day 1 with mock data — no waiting for M1.
- SP1.2 DDL tasks (room_type, amenity): run once M1's branch table is executed.
- SP2.1 DDL (room): run after branch + room_type tables are on the real DB.
- SP2.2 (fn_get_available_rooms): write SQL file now; execute after P03-M03-T02 (reservation_rooms) merges. Notify M3 when T02 merges.
- 🟡 tasks use mock returns; swap to real SQL when your DB tables land.

Start by reading in this exact order:
1. AGENTS.md
2. context/01-project-overview.md
3. context/02-architecture.md
4. context/03-build-plan.md  ← READ — explains the parallel development model
5. context/04-code-standards.md
6. context/05-library-patterns.md
7. context/08-progress-tracker.md
8. .agent/current-state.md
9. .agent/ownership-map.md
10. .agent/members/member-2.md
11. docs/14_task-tracker.md (M2 tasks only)
12. docs/phases/phase-02-room-inventory-and-availability.md
13. memory.md

Then load only the docs needed for your task:
- For DB work: docs/05_current-erd-and-schema.md, docs/09_database-routines-triggers-views-indexes.md
- For availability function: docs/08_business-rules-and-enforcement.md (BR-01, BR-16)
- For API work: docs/07_api-and-pages.md, docs/21_shared-contracts.md

Key rules for Member 2:
- fn_get_available_rooms() MUST filter Maintenance rooms (BR-16)
- Overlap formula: existing_check_in < p_check_out AND existing_check_out > p_check_in
- EXPLAIN ANALYZE is required after building the availability index (P02-M02-T18)
- Room number must be UNIQUE per branch: UNIQUE(branch_id, room_number)
- Do NOT use room.branch_id from a client request for authorization — use session.branchId
- Availability logic lives entirely in fn_get_available_rooms(). Never filter rooms in TypeScript.

Current task: [TASK_ID]
```

---

## Quick Reference: M2 Owned Files

```
app/search/                       app/staff/rooms/
app/api/availability/             app/api/staff/rooms/
services/room.service.ts          services/availability.service.ts
repositories/room.repository.ts   repositories/availability.repository.ts
database/migrations/P01-M02-*/    database/migrations/P02-M02-*/
database/routines/availability/   database/indexes/idx_*room*
database/seeds/P02-M02-*/         database/views/vw_room_occupancy.sql
components/RoomCard.tsx           components/RoomForm.tsx
(Phase 5) app/staff/reports/occupancy/
(Phase 5) app/api/staff/reports/occupancy/
```

## Subphase Quick Reference
| Subphase | Type | Tasks | Start When |
|---|---|---|---|
| SP1.2 M2 DDL | 🔴 | P01-M02-T01–T04 | After P01-M01-T07 executed |
| SP2.1 Room Schema | 🔴 | P02-M02-T01–T02 | After SP1.2 executed |
| SP2.2 Availability DB | 🔴 | P02-M02-T03–T04 | Write now; execute after P03-M03-T02 |
| SP2.3 Room API | 🟡 | P02-M02-T05–T12 | **Day 1 — mock-first** |
| SP2.4 Room UI | 🟡+🟢 | P02-M02-T13–T16 | **Day 1 — mock-first** |
| SP2.5 Tests | 🔴 | P02-M02-T17–T18 | After SP2.2 executed |

## Branch Naming
`feat/P02-M02-T{number}-{short-description}`
