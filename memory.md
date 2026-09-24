# memory.md — HRGSMS Project State

_Updated at every session boundary. Keep concise. Do not turn into a transcript._

## Current Phase
Phase 1 — Foundation, Security, and Master Data (NEXT — awaiting human develop branch push)

## Current Status
**Phase 0 COMPLETE.** All scaffold, docs, stubs, and the development contract are committed (locally uncommitted — see human action below).

## Completed Work
- `AGENTS.md` — full 19-section development contract
- `CLAUDE.md` — updated pointer
- `memory.md`, `ui-registry.md`, `.env.example` — created
- `context/01–08` — all 8 working context files
- `.agent/` — README, current-state, open-questions, ownership-map, decisions (D001–D006), handoffs, checkpoints, member-1 through member-5
- `docs/00–21` — all 22 documentation files
- `docs/phases/` — 7 phase files (phase-00 through phase-06)
- `docs/member-prompts/` — 5 member session prompt files
- `database/` — migrations manifest + 7 subdirectory stubs
- `lib/db/` — pool.ts, transaction.ts, migrate.ts, seed.ts, reset.ts
- `lib/auth/` — password.ts, session.ts, rbac.ts
- `lib/validation/` — auth, reservation, payment Zod schemas
- `services/` — 8 stubs (auth, availability, billing, checkin, payment, reservation, room, service-usage)
- `repositories/` — 8 stubs
- `types/` — api.ts, domain.ts, enums.ts, session.ts
- `components/` — GuestNav.tsx, StaffNav.tsx
- `package.json` — scripts: migrate, seed, db:reset, test; tsx added

## Human Action Required
```bash
git add -A
git commit -m "feat: Phase 0 — scaffold, docs, stubs, development contract"
git checkout -b develop
git push origin main develop
```
See `.agent/handoffs/phase-0-completion-handoff.md` for full details.

## Active Problems
None. All Phase 0 tasks complete.

## Key Approved Decisions
- ERD multi-room reservation model (reservation + reservation_rooms) — D001
- Database-first computation rule: all authoritative calculations in PostgreSQL — D002
- Antigravity skills used instead of JSM skills — D003
- No cross-branch reservations — D004
- Tax applies to room charges only (PROPOSED, confirm with lecturer) — D005
- `billing_summary` is a stored table; `vw_invoice_totals` computes running totals — D006
- Tailwind CSS retained
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

**M2: P01-M02-T01 COMPLETED (REVIEW)** — `room_type` table DDL on branch `room-type-ddl`
- Prior completed: SP2.3 (Room API: T05..T12) & SP2.4 (Room UI: T13..T16)
- Next for M2: `P01-M02-T02` — `amenity` table DDL (`database/migrations/P01-M02-T02-01_create_amenity.sql`) & `P01-M02-T03` (`room_type_amenity`)

## Integration Checkpoints
- P0 → P1: Phase 0 DONE. Human push needed.
- P1 integration owner: Member 1
- P2 integration owner: Member 2
- P3 integration owner: Member 3
- P4 integration owner: Member 4
- P5 integration owner: Member 5
- P6 integration owner: All (M1 coordinates)

