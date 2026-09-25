# memory.md — HRGSMS Project State

_Updated at every session boundary. Keep concise. Do not turn into a transcript._

## Current Phase
Phases 1 & 2 Active (Parallel Development across Phase 1–5 in progress)

## Current Status
**42 of 139 tasks COMPLETE / IN REVIEW (30.2% overall project completion).** All 220 vitest tests across 23 test files are **PASSING**. Documentation and progress trackers fully synchronized (2026-09-24).

## Completed Work
- `AGENTS.md` — full 19-section development contract
- `lib/db/` — pool.ts (singleton pg Pool), transaction.ts, migrate.ts (migration runner)
- `database/migrations/` — 5 DDL migrations (`enums`, `user_account`, `branch`, `employee`, `guest`) + `P01-M01-T07_seed_branches.sql`
- `lib/auth/` — password.ts (bcryptjs), session.ts (iron-session config/types), rbac.ts helpers
- `lib/validation/` — auth, room, reservation, payment Zod validation schemas
- `repositories/` — user, guest, room, availability, reservation, service-usage, billing, payment repositories implemented with unit tests
- `services/` — auth, room, availability, reservation, checkin, service-usage, billing, payment services implemented with unit tests
- `app/api/` — GET `/api/availability`, GET/POST `/api/staff/rooms`, PATCH `/api/staff/rooms/[id]`, POST/GET `/api/guest/reservations`, POST/GET `/api/staff/reservations`, PATCH `/api/staff/reservations/[id]/cancel`
- `app/` & `components/` — `/search` availability search page (`RoomCard.tsx`), `/staff/rooms` management page (`RoomForm.tsx`)
- Documentation & Trackers — `docs/14_task-tracker.md`, `context/08-progress-tracker.md`, `.agent/current-state.md`, `.agent/members/member-1..5.md` fully synchronized!

## Human Action Required
```bash
git checkout -b develop
git push -u origin develop
```

## Active Problems
None. All 220 unit and integration tests passing.

## Key Approved Decisions
- ERD multi-room reservation model (reservation + reservation_rooms) — D001
- Database-first computation rule: all authoritative calculations in PostgreSQL — D002
- Antigravity skills used instead of JSM skills — D003
- No cross-branch reservations — D004
- Tax applies to room charges only (PROPOSED, confirm with lecturer) — D005
- `billing_summary` is a stored table; `vw_invoice_totals` computes running totals — D006
- Tailwind CSS v4 retained
- No ORM — direct parameterized SQL via `pg`

## Open Questions (Requiring Lecturer / Team Approval)
See `.agent/open-questions.md` and `docs/19_open-questions-and-assumptions.md`.
Priority: OQ-08 (overlap prevention technique), OQ-04 (tax scope), OQ-05 (cancellation policy), OQ-10 (revenue report accrual).

## Next Task
**M1: P01-M01-T01** — `feat/P01-M01-T01-db-pool`
- Install: `pg`, `iron-session`, `bcryptjs`, `zod`, `@types/pg`, `@types/bcryptjs`, `vitest`
- Implement real migration runner with `schema_migrations` tracking
- Write first SQL: `P01-M01-T02-01_create_enums.sql`
- Start prompt in `docs/member-prompts/member-1-prompt.md`

**M2: SP1.2 (T01..T04) DONE; SP2.1 (P02-M02-T01, T02) COMPLETED (REVIEW)** on branch `create-room`
- Prior completed: SP1.2 DDL/seeds (T01..T04), SP2.3 (Room API: T05..T12) & SP2.4 (Room UI: T13..T16)
- Created: `database/migrations/P02-M02-T01-01_create_room.sql` & `database/seeds/P02-M02-T02_seed_rooms.sql`
- Next for M2: `P02-M02-T03` — `fn_get_available_rooms` function (SP2.2) and `P02-M02-T04` (composite index)

## Integration Checkpoints
- P1 integration owner: Member 1
- P2 integration owner: Member 2
- P3 integration owner: Member 3
- P4 integration owner: Member 4
- P5 integration owner: Member 5
- P6 integration owner: All (M1 coordinates)
