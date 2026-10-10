# context/02 — Architecture

## Stack
- **Frontend/Backend**: Next.js (App Router) + TypeScript
- **Database**: PostgreSQL v15+ — direct SQL via `pg` (node-postgres)
- **Auth/Session**: iron-session (encrypted HTTP-only cookies)
- **Styling**: Tailwind CSS
- **Validation**: Zod (request shape only; authoritative rules in DB)

## System Boundaries

```
Browser
  │ HTTPS
  ▼
Next.js App (app/)
  ├── Public pages: /, /search
  ├── Guest portal: /guest/*
  └── Staff portal: /staff/*
        │
        ├── Route Handlers (app/api/**/route.ts)
        │     ↕ iron-session
        │   1. Parse & validate request (Zod)
        │   2. Check auth + role/branch scope (session)
        │   3. Call Service layer
        │
        ├── Service Layer (services/*.service.ts)
        │   Orchestrate: call repository → handle errors → return result
        │
        └── Repository Layer (repositories/*.repository.ts)
              Parameterized SQL → pg Pool → PostgreSQL
```

## Database-First Boundary

**PostgreSQL computes:**
- All financial values (charges, tax, discounts, totals, balance)
- All availability and overlap checks
- All state transitions and their guards
- All 5 required reports

**Next.js handles:**
- HTTP, session, auth, input shape validation
- Calling DB routines and translating results/errors
- External integrations (payment gateway TBD)

**Never in TypeScript:** financial formulas, availability logic, state transition rules

## Authentication Design
- One auth system, two entry points: `/guest/login` and `/staff/login`
- Both use the same `user_account` table
- Session stores: `userId`, `role`, `branchId` (for staff), `guestId` (for guests)
- Role and branch scope read from session on every protected request
- Guest ownership: session `guestId` used in all DB queries — browser `guest_id` is never trusted

## Route Protection
- Public: no auth required
- `/guest/*`: session required, `role = 'Guest'`
- `/staff/*`: session required, `role` in `['Receptionist', 'Manager', 'Admin']`
- `/staff/reports`, `/staff/admin`: `role` in `['Manager', 'Admin']` or `['Admin']` only

## Folder Responsibilities

| Folder | Owner | Contents |
|---|---|---|
| `app/` | All | Pages, layouts, route handlers |
| `components/` | All (M1 owns shared shell) | Shared UI components |
| `lib/db/` | M1 | pg Pool client |
| `lib/auth/` | M1 | Session helpers, password hashing |
| `lib/validation/` | M1 (shared) | Common Zod schemas |
| `services/` | Feature member | Orchestration per domain |
| `repositories/` | Feature member | SQL per domain |
| `types/` | M1 (shared) | TypeScript type definitions |
| `database/migrations/` | Feature member | Append-only SQL migrations |
| `database/routines/` | Feature member | Functions and procedures |
| `database/triggers/` | Feature member | Trigger definitions |
| `database/views/` | Feature member | View definitions |
| `database/seeds/` | Feature member | Seed SQL |
| `context/` | M1 (update all) | Working context system |
| `docs/` | Feature member | Project documentation |
| `.agent/` | M1 (coordinates) | Project management state |

## Non-Negotiable Rules
1. No ORM — direct parameterized SQL only
2. No browser-side database credentials or SQL
3. `NUMERIC(12,2)` for all money values
4. `FOREIGN KEY ... ON DELETE RESTRICT` default
5. Every Claude agent session is isolated to one member's worktree
6. No agent performs GitHub remote writes — manual push handoff required

See `docs/04_architecture.md` for detailed Mermaid diagrams and full specifications.
