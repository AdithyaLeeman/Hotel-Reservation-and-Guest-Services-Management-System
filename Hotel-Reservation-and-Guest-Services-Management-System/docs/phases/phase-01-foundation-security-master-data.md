# Phase 1 — Foundation, Security, and Master Data

## Integration Owner: Member 1 (M1)

## Goal
Establish the shared foundation all other phases depend on: DB connection, core table DDL, authentication, sessions, RBAC, and the UI shell. **M2 joins in SP1.2 to write room_type DDL in parallel.**

## Parallelism Strategy
- **SP1.1** (M1 only) — critical gate. All members can start 🟡 MOCK-FIRST tasks once SP1.1 is DONE.
- **SP1.2** — M1 and M2 run their DDL tasks in parallel (different tables, no FK conflict between them until room needs branch).
- **SP1.3 / SP1.4** — M1 builds auth + UI. All other members write their service/repo/UI code against mock data simultaneously.

## Subphases

### SP1.1 — DB Infrastructure _(serial gate, M1 only)_
Deliverables: pg installed, real Pool, migration runner working, shared contracts published.

| Task | Title | Type |
|---|---|---|
| P01-M01-T01 | Install `pg` + `@types/pg` | 🟢 PARALLEL |
| P01-M01-T02 | Implement real pg Pool (`lib/db/pool.ts`) | 🔴 SERIAL |
| P01-M01-T03 | Implement migration runner (`lib/db/migrate.ts`) | 🟢 PARALLEL |
| P01-M01-T04 | Publish shared contracts (`docs/21_shared-contracts.md`) | 🟢 PARALLEL |

**Gate: SP1.1 complete → all members begin their 🟡 MOCK-FIRST work.**

---

### SP1.2 — Core Schema DDL _(M1 + M2 parallel)_
Deliverables: all core tables created, 3 branches seeded, room_type + amenity tables ready.

| Task | Member | Title | Type |
|---|---|---|---|
| P01-M01-T05 | M1 | Enums DDL (all project enums in one migration) | 🔴 SERIAL |
| P01-M01-T06 | M1 | `user_account` table DDL | 🔴 SERIAL |
| P01-M01-T07 | M1 | `branch` table DDL + seed Colombo/Kandy/Galle | 🔴 SERIAL |
| P01-M01-T08 | M1 | `employee` table DDL | 🔴 SERIAL |
| P01-M01-T09 | M1 | `guest` table DDL | 🔴 SERIAL |
| P01-M02-T01 | M2 | `room_type` table DDL | 🔴 SERIAL |
| P01-M02-T02 | M2 | `amenity` table DDL | 🔴 SERIAL |
| P01-M02-T03 | M2 | `room_type_amenity` junction DDL | 🔴 SERIAL |
| P01-M02-T04 | M2 | Seed room types + amenities | 🔴 SERIAL |

---

### SP1.3 — Auth System _(M1; others write mock-authenticated code in parallel)_
Deliverables: bcrypt, iron-session, all auth API routes, RBAC middleware.

| Task | Title | Type |
|---|---|---|
| P01-M01-T10 | bcrypt password hashing utility (`lib/auth/password.ts`) | 🟢 PARALLEL |
| P01-M01-T11 | iron-session config + session types | 🟢 PARALLEL |
| P01-M01-T12 | User repository — find by email/username | 🟡 MOCK-FIRST |
| P01-M01-T13 | Auth service — register + login orchestration | 🟡 MOCK-FIRST |
| P01-M01-T14 | POST `/api/guest/register` route handler | 🟡 MOCK-FIRST |
| P01-M01-T15 | POST `/api/guest/login` route handler | 🟡 MOCK-FIRST |
| P01-M01-T16 | POST `/api/guest/logout` route handler | 🟢 PARALLEL |
| P01-M01-T17 | POST `/api/staff/login` route handler | 🟡 MOCK-FIRST |
| P01-M01-T18 | POST `/api/staff/logout` route handler | 🟢 PARALLEL |
| P01-M01-T19 | RBAC helpers (`requireRole`, `requireBranchScope`) | 🟢 PARALLEL |
| P01-M01-T20 | Next.js middleware for route protection | 🟢 PARALLEL |
| P01-M01-T21 | Zod auth validation schemas | 🟢 PARALLEL |

---

### SP1.4 — UI Shell _(M1; others write page stubs simultaneously)_
Deliverables: design tokens, layouts, navbars, auth pages.

| Task | Title | Type |
|---|---|---|
| P01-M01-T22 | Global CSS design tokens + Tailwind config | 🟢 PARALLEL |
| P01-M01-T23 | Root layout + metadata (`app/layout.tsx`) | 🟢 PARALLEL |
| P01-M01-T24 | GuestNav component | 🟢 PARALLEL |
| P01-M01-T25 | StaffNav component | 🟢 PARALLEL |
| P01-M01-T26 | Guest register page UI | 🟡 MOCK-FIRST |
| P01-M01-T27 | Guest login page UI | 🟡 MOCK-FIRST |
| P01-M01-T28 | Staff login page UI | 🟡 MOCK-FIRST |
| P01-M01-T29 | Staff dashboard skeleton | 🟡 MOCK-FIRST |

## Key DB Deliverables
- Enums: `user_role`, `account_status`, `booking_source`, `reservation_status`, `room_status`, `service_catalogue_status`, `payment_status`
- Tables: `user_account`, `branch`, `employee`, `guest`, `room_type`, `amenity`, `room_type_amenity`
- Seed: 3 branches, 1 admin user, 3 room types, 5 amenities

## Key Code Deliverables
- `lib/db/pool.ts` — real pg Pool
- `lib/db/migrate.ts` — migration runner
- `lib/auth/password.ts` — hashPassword, verifyPassword
- `lib/auth/session.ts` — getSession, destroySession
- `lib/auth/rbac.ts` — requireRole, requireBranchScope
- `middleware.ts` — Next.js route protection
- `types/session.ts`, `types/enums.ts`, `types/api.ts`

## Completion Criteria
- `npm run migrate` succeeds on empty DB
- 3 branches seeded
- Guest can register, login, get session, logout
- Staff can login with role + branchId in session
- Unauthenticated → 401; wrong role → 403
- RBAC middleware blocks Receptionist from Manager routes
