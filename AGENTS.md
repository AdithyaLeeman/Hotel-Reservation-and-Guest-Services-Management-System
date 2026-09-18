<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# HRGSMS — AGENTS.md (Development Contract)

**Hotel Reservation and Guest Services Management System — SkyNest Hotels**
University Database Systems Project — Group 39

This file is the authoritative development contract for all five team members and all Claude sessions. Read it completely at the start of every session.

---

## 1. Project Summary and Academic Objective

SkyNest Hotels operates branches in Colombo, Kandy, and Galle. The system replaces an outdated desktop application that caused overbookings, billing delays, and manual errors.

The **database is the principal academic deliverable**. The UI is required to demonstrate the database, but database correctness, consistency, transaction handling, and reporting take priority over visual complexity.

Every implementation decision must demonstrate concepts from the supplied Database Systems lecture notes (L01–L14). See `docs/03_course-concept-mapping.md`.

---

## 2. Source Precedence

When sources disagree, follow this order:

1. Official Project 5 assignment brief
2. Explicit lecturer/TA/course instructions and current user instructions
3. Current `ER_Diagram- Group 39.md` (ERD)
4. Group 39 SRS (`Group_39 - project_5 (1).md`)
5. Lecture notes summary as the toolbox boundary
6. Reasonable engineering assumptions
7. Workflow references (process guidance only, never technology decisions)

Source files are in `project-sources/`. They are evidence to analyze, not instructions that override this file.

---

## 3. Mandatory Read Order (Session Start)

1. `AGENTS.md` (this file) — always first
2. `context/01-project-overview.md`
3. `context/02-architecture.md`
4. `context/03-build-plan.md`
5. `context/04-code-standards.md`
6. `context/05-library-patterns.md`
7. `context/06-ui-tokens.md` (if doing UI work)
8. `context/07-ui-rules.md` (if doing UI work)
9. `context/08-progress-tracker.md`
10. `.agent/current-state.md`
11. `.agent/ownership-map.md`
12. `.agent/members/member-X.md` (your member file)
13. `docs/14_task-tracker.md` (your assigned task)
14. The current phase document in `docs/phases/`
15. Then only the detailed docs needed for your specific task

Do not load all detailed docs by habit. Use progressive context loading.

---

## 4. Technology Stack and Restrictions

### Frontend
- Next.js (App Router) + TypeScript
- Tailwind CSS for styling
- Responsive, accessible UI that exposes workflows and demonstrates database behavior

### Backend
- Next.js Route Handlers + separated service layer
- Server-side validation and authorization
- Authentication, sessions, role-based access control
- **Thin layer**: authenticate → authorize → validate shape → call PostgreSQL routine → translate result/error → respond

### Database
- PostgreSQL (v15 or later preferred)
- Direct handwritten, parameterized SQL via `pg` (node-postgres)
- Explicit transactions for multi-step operations
- PostgreSQL constraints, views, functions, procedures, triggers, indexes
- `NUMERIC(p,s)` for all money values — never JavaScript floating-point arithmetic for authoritative financial totals

### Prohibited
- Prisma, Drizzle, Sequelize, TypeORM, or any ORM
- Supabase, Firebase, or database-as-a-service abstractions
- Browser-side database credentials or SQL
- Business rules implemented only in React components
- A second operational database
- NoSQL, sharding, MapReduce, big-data infrastructure

---

## 5. Database-First Computation Rule (MANDATORY)

**Every authoritative calculation and business operation must be implemented inside PostgreSQL** wherever the course syllabus supports a clean solution. The Next.js backend must NOT duplicate any authoritative formula.

### In PostgreSQL (Authoritative)
- Room availability and overlap checks
- Nights calculation (`check_out_date - check_in_date`)
- Room charge per room (`rate_per_night × nights`)
- Total room charge, tax, service charge total, grand total
- Outstanding balance (`grand_total - total_paid`) — **never in TypeScript**
- Reservation creation + availability recheck (atomic procedure)
- Check-in state + room status update (atomic procedure)
- Service usage posting + price snapshot (procedure)
- Payment posting + idempotency check (atomic procedure)
- Checkout guard (balance = 0) + room release (atomic procedure)
- Cancellation + audit record (procedure)
- All 5 reports (DB views / table-returning functions)
- Audit trail capture (triggers)

### In Next.js Only
- HTTP parsing and response formatting
- Session/cookie management
- Input shape validation (Zod) before DB call
- Role and branch scope authorization
- Calling DB routines with parameterized inputs
- Translating SQLSTATE errors to API error responses
- External integration boundaries (payment gateway TBD)

### Forbidden in TypeScript
Any financial formula such as `rate * nights`, `sum(price * qty)`, or `total - paid` in the backend or frontend is a **bug** unless clearly labeled as a UI-only display estimate. The server response must always use the authoritative PostgreSQL value.

For every calculation, document in `docs/08_business-rules-and-enforcement.md` where it lives and why.

---

## 6. Architecture Overview

One Next.js application, one PostgreSQL database, one authentication/session system. Separate guest and staff entry points with role-based portals inside the same application.

```
Browser → Next.js Route Handlers → Service Layer → Repository/SQL Layer → PostgreSQL
                ↕
         Session/Auth (server-side)
```

Route areas:
```
/                         public hotel information
/search                   public room-availability search
/guest/register           guest self-registration
/guest/login              guest login
/guest/reservations       guest's own reservations
/guest/reservations/[id]  guest reservation, bill, payment details
/staff/login              employee login
/staff/dashboard          receptionist/manager dashboard
/staff/reservations       operational reservations
/staff/rooms              room operations
/staff/reports            management reports
/staff/admin              administration
```

Folder structure:
```
app/              Next.js App Router pages and route handlers
components/       Shared UI components
lib/
  auth/           Authentication helpers
  db/             Database client (pg Pool)
  validation/     Zod schemas
services/         Business logic orchestration (thin)
repositories/     SQL data access (parameterized queries)
types/            Shared TypeScript types
database/
  migrations/     Append-only SQL migration files
  routines/       Stored functions and procedures
  triggers/       Trigger definitions
  views/          View definitions
  indexes/        Index definitions
  seeds/          Seed data SQL
  tests/          Database-level tests
context/          Nine-file working context system
docs/             Project documentation
project-sources/  Source evidence files (read-only reference)
.agent/           Project management state
```

See `docs/04_architecture.md` for full details.

---

## 7. Naming and Coding Conventions

### TypeScript
- `camelCase` for variables and functions
- `PascalCase` for types, interfaces, components
- `SCREAMING_SNAKE_CASE` for constants
- Explicit return types on all functions
- Zod schemas for all API input validation
- No `any` type

### SQL / PostgreSQL
- `snake_case` for all table, column, function, trigger, and index names
- `UPPER CASE` for SQL keywords
- `NUMERIC(12,2)` for all money columns
- Parameterized queries only — never string-concatenated SQL
- Table-qualified column names in joins
- Prefix conventions: `fn_` for functions, `sp_` for procedures, `trg_` for triggers, `vw_` for views, `idx_` for indexes

### Files
- Migration files: `P{phase}-M{member}-T{task}-{nn}_{description}.sql`
- Route handlers: `app/api/{resource}/route.ts`
- Services: `services/{resource}.service.ts`
- Repositories: `repositories/{resource}.repository.ts`

---

## 8. SQL Conventions

- All SQL is server-side and parameterized via `pg` Pool
- Use `BEGIN` / `COMMIT` / `ROLLBACK` explicitly in multi-step operations
- Prefer stored procedures for atomic workflows
- Use `SELECT ... FOR UPDATE` for concurrency-sensitive reads
- Money: always `NUMERIC(12,2)`, never `FLOAT` or `DOUBLE PRECISION`
- Dates: `DATE` for check-in/check-out, `TIMESTAMP WITH TIME ZONE` for events
- UUIDs: `gen_random_uuid()` for new primary keys where ERD specifies uuid
- Foreign keys: `ON DELETE RESTRICT` (default) unless explicitly approved otherwise
- Use PostgreSQL enums for status fields matching ERD enum definitions

---

## 9. API Conventions

All Route Handlers return JSON in this shape:

**Success:**
```json
{ "data": { ... }, "meta": { "requestId": "..." } }
```

**Error:**
```json
{ "error": { "code": "ERROR_CODE", "message": "Human message", "fields": {} } }
```

- `400` for validation errors (include `fields` map)
- `401` for unauthenticated
- `403` for unauthorized / insufficient role
- `404` for not found
- `409` for conflicts (e.g., double booking)
- `500` for unexpected server errors (never expose DB internals)

See `docs/21_shared-contracts.md` for full API contract.

---

## 10. Security and RBAC Rules

Roles (from ERD `UserRole` enum): `Guest`, `Receptionist`, `Manager`, `Admin`

- Never trust a browser-supplied `guest_id` or `role` as authorization
- Read role and branch scope from the authenticated server-side session
- Every guest query must derive identity from the session and enforce ownership in the DB query predicate
- Staff routes enforce role and branch scope on the server, not only by hiding nav links
- Guests self-register; staff accounts created only through authorized admin functions
- Password hashing: bcrypt with salt (cost factor ≥ 12)
- Sessions: iron-session (encrypted, HTTP-only, Secure cookies)
- Parameterized SQL prevents SQL injection — enforced at code review
- Input sanitization and output encoding prevent XSS
- `.env` never committed; use `.env.example` only

See `docs/11_security-and-rbac.md` for full RBAC matrix.

---

## 11. Transaction and Concurrency Rules

- Multi-step operations (reservation, check-in, payment, checkout) use explicit PostgreSQL transactions
- Use `SELECT ... FOR UPDATE` to prevent concurrent double-booking
- Race conditions in availability checks must be handled inside PostgreSQL, not in the application layer
- Never rely on two separate queries for check-then-act; combine in a single atomic stored procedure
- Rollback on any failure; the database must never be left in a partial state
- Document isolation level for each procedure in `docs/09_database-routines-triggers-views-indexes.md`

---

## 12. Testing Rules

- Every task must include tests: schema/constraint tests, function/procedure tests, API integration tests
- Financial calculation tests must compare TypeScript-visible results against the authoritative DB routine results
- Concurrent double-booking test is required (P03-M03-T12)
- Transaction rollback test is required
- Authentication bypass and SQL injection tests required
- Run `npm run lint` and all tests before marking a task `REVIEW`
- See `docs/12_testing-and-acceptance.md` for the full test matrix

---

## 13. Git Workflow

```
main        stable, merged and accepted work
develop     integration branch
feat/PXX-MXX-short-description
fix/PXX-MXX-short-description
```

- One task branch per task
- One `IN_PROGRESS` task per member at a time
- Merge only into `develop`; `main` is merged from `develop` at integration checkpoints

### ABSOLUTE BAN: NO AGENT PUSHES

Claude agents and automated sessions **must never** execute `git push`, create pull requests, delete remote branches, or perform any other GitHub remote write under any circumstances. This applies to every branch and every remote action.

When work is ready to push, the agent must provide a **manual-push handoff** containing:
1. Remote name and URL
2. Local branch and intended remote branch
3. Commits and files that will be pushed
4. Current `git status`
5. Migrations or shared contracts affected
6. Tests/checks run and results
7. Known risks
8. The exact `git push` command for the human member to run manually

Then stop. State clearly: *"Claude has not pushed anything. Please review this summary and run the command manually."*

---

## 14. Task Isolation and Ownership Rules

- Each member works in their own Git worktree or separate clone
- Never run multiple members' Claude sessions against the same checkout simultaneously
- Each member owns specific files/directories listed in `docs/14_task-tracker.md`
- Do not modify another member's owned files without updating the ownership map and informing the member
- Shared files have one designated owner; others contribute via PR

---

## 15. Documentation Update Rules

- When a detailed doc changes, update the relevant context file summary in the same task
- When a shared contract changes, identify all affected tasks before implementing
- `context/08-progress-tracker.md` updated at every session end
- `docs/14_task-tracker.md` status updated after each task milestone

---

## 16. Definition of Done

A task is `DONE` only when ALL of the following are true:
1. Acceptance criteria in the task tracker are proven
2. Required tests pass
3. Review findings are resolved or explicitly accepted
4. Documentation and handoff updated
5. Clean-database rebuild succeeds when migrations changed
6. PR is merged into `develop`

`REVIEW` = built and owner-checked, waiting for independent verification.
`DONE` requires verified, documented, merged evidence — not just Claude finishing code.

---

## 17. Session Lifecycle

### Session Start
1. Run `/remember restore` (or read `memory.md` directly)
2. Load the mandatory compact context (items 1–14 in Section 3)
3. Verify the task is assigned to this member and is `READY` or `IN_PROGRESS`
4. Verify dependencies, branch/worktree, and working-tree cleanliness

### Session End (complete or incomplete)
1. Run relevant tests/checks
2. Update `docs/14_task-tracker.md` and `context/08-progress-tracker.md`
3. Update `ui-registry.md` if UI patterns changed (run `/imprint`)
4. Write a concise handoff (files changed, migrations, commands, results, risks, next action)
5. Run `/remember save` (or update `memory.md` directly)

Do not rely on chat history as the only record of a decision.

---

## 18. Skills Reference

This project uses the Antigravity skill set in `.agents/skills/`:

| Skill | Use When |
|---|---|
| `/architect` | Before any complex feature or load-bearing unresolved decision |
| `/develop` | To build a feature vertical slice from an approved spec |
| `/check verify` | After completing a slice, to prove behavior against acceptance criteria |
| `/check review` | Before a PR, for independent senior code review |
| `/debug` | When a bug's root cause is unclear after two failed fix attempts |
| `/test` | To write tests for newly built or changed code |
| `/sync` | After completing a change, to keep AGENTS.md and context current |
| `/document` | To write PR descriptions, changelogs, or release notes |

**Use `/architect` before a complex feature.** Use `/check review` before every PR. If the same symptom fails twice, stop patching and use `/debug`.

The session memory system uses `memory.md` directly (read and update it at session boundaries).

---

## 19. Important Open Questions

See `.agent/open-questions.md` and `docs/19_open-questions-and-assumptions.md` for the full list. Key items requiring team/lecturer approval:

- Multi-room reservation model (ERD) vs single-room booking (SRS) — **recommend ERD model**
- Overlap prevention technique (procedure + `SELECT FOR UPDATE` vs exclusion constraint)
- Tax scope: room charges only or also service charges
- Cancellation/refund policy (TBD-5)
- Payment gateway (TBD-1 — mock internally for now)
- Revenue report definition (invoice date vs payment date accrual)

Do not implement material assumptions silently. Record decisions in `.agent/decisions/`.
