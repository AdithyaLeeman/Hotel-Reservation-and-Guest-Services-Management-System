# Member 4 — Session Prompt Template

_Copy-paste this prompt at the start of every Claude session as Member 4._

---

## Session Start Prompt

```
You are working on the HRGSMS project (Hotel Reservation and Guest Services Management System) for SkyNest Hotels, Group 39.

You are Member 4 (Bandaranayaka I.B.W.D., 240061C).
Your primary slice: Service catalogue, check-in (atomic), service usage logging, room + service charge calculation functions, billing inputs.

Development model: MOCK-FIRST PARALLEL.
- SP4.3 (Service API) and SP4.4 (Service UI): start Day 1 with mock data — no waiting.
- SP4.1 DDL (service_catalogue, service_usage): run after SP3.1 (reservation tables) is executed.
- SP4.2 DB procedures/functions: write SQL files now; execute after SP4.1 is done.
- M4 and M5 run simultaneously — their DB schemas have no FK dependency on each other.
- IMPORTANT: After fn_calc_room_charges + fn_calc_service_charges (T06/T07) are DONE, share function signatures with M5 so M5 can implement sp_finalize_invoice.
- Phase 5 contribution (report UI): mock-first from Day 1.
- 🟡 tasks use mock returns; swap to real SQL in Phase 6.

Start by reading in this exact order:
1. AGENTS.md
2. context/01-project-overview.md
3. context/02-architecture.md
4. context/03-build-plan.md  ← READ — parallel model + M4/M5 coordination
5. context/04-code-standards.md
6. context/05-library-patterns.md
7. context/08-progress-tracker.md
8. .agent/current-state.md
9. .agent/ownership-map.md
10. .agent/members/member-4.md
11. docs/14_task-tracker.md (M4 tasks only)
12. docs/phases/phase-04-services-and-billing.md
13. memory.md

Then load:
- docs/05_current-erd-and-schema.md (service_catalogue, service_usage tables)
- docs/09_database-routines-triggers-views-indexes.md (fn_calc_room_charges, fn_calc_service_charges, sp_check_in signatures)
- docs/08_business-rules-and-enforcement.md (BR-03 through BR-11)
- docs/21_shared-contracts.md

CRITICAL rules for Member 4:
1. fn_calc_room_charges(p_reservation_id): SUM(rate_per_night_snapshot * nights) from reservation_rooms. Uses SNAPSHOTTED rate — NOT current room_type.daily_rate.
2. fn_calc_service_charges(p_reservation_id): SUM(charged_price * quantity) from service_usage. charged_price is the snapshot, not current catalogue price.
3. sp_log_service_usage(): MUST read service_catalogue.current_price at time of logging and snapshot it to service_usage.charged_price. Never compute historical charges from current catalogue price.
4. sp_check_in(): atomically sets reservation status to CheckedIn AND all rooms in reservation_rooms to RoomStatus=Occupied in ONE transaction. ROLLBACK on any failure.
5. Service usage only allowed when reservation_status = 'CheckedIn' — enforce in procedure.
6. Late Checkout service (id = 6) is system-reserved — document its stable service_id.
7. Communicate fn_calc_room_charges and fn_calc_service_charges SIGNATURES to M5 before M5 implements sp_finalize_invoice.

All financial calculations are in PostgreSQL. TypeScript receives results — never computes them.

Current task: [TASK_ID]
```

---

## Quick Reference: M4 Owned Files

```
app/staff/checkin/                  app/api/staff/reservations/[id]/checkin/
app/api/staff/reservations/[id]/services/
app/api/staff/services/             app/staff/reservations/[id]/services/
services/checkin.service.ts         services/service-usage.service.ts
repositories/service-usage.repository.ts
database/migrations/P04-M04-*/      database/seeds/P04-M04-*/
database/routines/checkin/          database/routines/billing-inputs/
database/views/vw_service_usage_breakdown.sql
(Phase 5) app/staff/reports/service-usage/
```

## Subphase Quick Reference
| Subphase | Type | Tasks | Start When |
|---|---|---|---|
| SP4.1 Service Schema | 🔴 | T01–T03 | After SP3.1 executed |
| SP4.2 Service DB | 🔴 | T04–T08 | After SP4.1 |
| SP4.3 Service API | 🟡 | T09–T15 | **Day 1 — mock-first** |
| SP4.4 Service UI | 🟡 | T16–T17 | **Day 1 — mock-first** |

## Branch Naming
`feat/P04-M04-T{number}-{short-description}`
