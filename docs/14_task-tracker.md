# docs/14 — Task Tracker

_All tasks use ID format: `P{phase}-M{member}-T{task_number}`_
_Allowed statuses: `TODO` | `READY` | `IN_PROGRESS` | `BLOCKED` | `REVIEW` | `DONE`_

## Parallelism Key
- 🔴 **SERIAL** — DB migration; must run after its FK dependencies are executed on the real DB
- 🟡 **MOCK-FIRST** — can start Day 1 using mock returns; swap to real DB when dependencies land
- 🟢 **PARALLEL** — no DB dependency; can start immediately

> **Rule:** Every 🟡 task starts with mock data. When the DB dependency task moves to DONE, the member replaces mock data with real SQL calls and marks the task REVIEW.

---

## Phase 1 — Foundation, Security, and Master Data
**Integration Owner:** M1

---

### SP1.1 — DB Infrastructure _(M1 only — everyone else unblocked once this is DONE)_

| Task ID | Title | Type | Files | Status |
|---|---|---|---|---|
| P01-M01-T01 | Install pg + @types/pg | 🟢 PARALLEL | `package.json` | DONE |
| P01-M01-T02 | Implement real pg Pool | 🔴 SERIAL | `lib/db/pool.ts` | DONE |
| P01-M01-T03 | Implement migration runner | 🟢 PARALLEL | `lib/db/migrate.ts` | DONE |
| P01-M01-T04 | Publish shared contracts doc | 🟢 PARALLEL | `docs/21_shared-contracts.md` | DONE |

**Gate:** SP1.1 DONE ✅ → all members can start 🟡 MOCK-FIRST tasks. M1 proceeds to SP1.2.

---

### SP1.2 — Core Schema DDL _(M1 + M2 in parallel after SP1.1)_

| Task ID | Member | Title | Type | Files | Depends On | Status |
|---|---|---|---|---|---|---|
| P01-M01-T05 | M1 | Enums DDL (all PostgreSQL enums) | 🔴 SERIAL | `database/migrations/P01-M01-T05-01_create_enums.sql` | SP1.1 executed | DONE |
| P01-M01-T06 | M1 | `user_account` table DDL | 🔴 SERIAL | `database/migrations/P01-M01-T06-01_create_user_account.sql` | T05 | TODO |
| P01-M01-T07 | M1 | `branch` table DDL + seed 3 branches | 🔴 SERIAL | `database/migrations/P01-M01-T07-01_create_branch.sql`, `database/seeds/P01-M01-T07_seed_branches.sql` | T05 | TODO |
| P01-M01-T08 | M1 | `employee` table DDL | 🔴 SERIAL | `database/migrations/P01-M01-T08-01_create_employee.sql` | T06, T07 | TODO |
| P01-M01-T09 | M1 | `guest` table DDL | 🔴 SERIAL | `database/migrations/P01-M01-T09-01_create_guest.sql` | T06 | TODO |
| P01-M02-T01 | M2 | `room_type` table DDL | 🔴 SERIAL | `database/migrations/P01-M02-T01-01_create_room_type.sql` | T07 | REVIEW |
| P01-M02-T02 | M2 | `amenity` table DDL | 🔴 SERIAL | `database/migrations/P01-M02-T02-01_create_amenity.sql` | T07 | TODO |
| P01-M02-T03 | M2 | `room_type_amenity` junction DDL | 🔴 SERIAL | `database/migrations/P01-M02-T03-01_create_room_type_amenity.sql` | T01, T02 | TODO |
| P01-M02-T04 | M2 | Seed room types + amenities | 🔴 SERIAL | `database/seeds/P01-M02-T04_seed_room_types.sql` | P01-M02-T01, T02 | TODO |

---

### SP1.3 — Auth System _(M1, after SP1.2; others write mock auth in parallel)_

| Task ID | Title | Type | Files | Depends On | Status |
|---|---|---|---|---|---|
| P01-M01-T10 | bcrypt password hashing utility | 🟢 PARALLEL | `lib/auth/password.ts` | — | TODO |
| P01-M01-T11 | iron-session config + session types | 🟢 PARALLEL | `lib/auth/session.ts`, `types/session.ts` | — | TODO |
| P01-M01-T12 | User repository (find by email/username) | 🟡 MOCK-FIRST | `repositories/user.repository.ts` | SP1.2 DB executed | TODO |
| P01-M01-T13 | Auth service (register + login logic) | 🟡 MOCK-FIRST | `services/auth.service.ts` | T12 | TODO |
| P01-M01-T14 | Guest registration API route | 🟡 MOCK-FIRST | `app/api/guest/register/route.ts` | T13 | TODO |
| P01-M01-T15 | Guest login API route | 🟡 MOCK-FIRST | `app/api/guest/login/route.ts` | T13 | TODO |
| P01-M01-T16 | Guest logout API route | 🟢 PARALLEL | `app/api/guest/logout/route.ts` | T11 | TODO |
| P01-M01-T17 | Staff login API route | 🟡 MOCK-FIRST | `app/api/staff/login/route.ts` | T13 | TODO |
| P01-M01-T18 | Staff logout API route | 🟢 PARALLEL | `app/api/staff/logout/route.ts` | T11 | TODO |
| P01-M01-T19 | RBAC helpers (requireRole, requireBranchScope) | 🟢 PARALLEL | `lib/auth/rbac.ts` | T11 | TODO |
| P01-M01-T20 | Next.js middleware for route protection | 🟢 PARALLEL | `middleware.ts` | T19 | TODO |
| P01-M01-T21 | Zod auth validation schemas | 🟢 PARALLEL | `lib/validation/auth.schema.ts` | — | TODO |

---

### SP1.4 — UI Shell _(M1; others can write page stubs in parallel)_

| Task ID | Title | Type | Files | Depends On | Status |
|---|---|---|---|---|---|
| P01-M01-T22 | Global CSS design tokens + Tailwind config | 🟢 PARALLEL | `app/globals.css`, `tailwind.config.ts` | — | TODO |
| P01-M01-T23 | Root layout + metadata | 🟢 PARALLEL | `app/layout.tsx` | T22 | TODO |
| P01-M01-T24 | GuestNav component | 🟢 PARALLEL | `components/GuestNav.tsx` | T22 | TODO |
| P01-M01-T25 | StaffNav component | 🟢 PARALLEL | `components/StaffNav.tsx` | T22 | TODO |
| P01-M01-T26 | Guest register page UI | 🟡 MOCK-FIRST | `app/guest/register/page.tsx` | T14 | TODO |
| P01-M01-T27 | Guest login page UI | 🟡 MOCK-FIRST | `app/guest/login/page.tsx` | T15 | TODO |
| P01-M01-T28 | Staff login page UI | 🟡 MOCK-FIRST | `app/staff/login/page.tsx` | T17 | TODO |
| P01-M01-T29 | Staff dashboard skeleton | 🟡 MOCK-FIRST | `app/staff/dashboard/page.tsx` | T17 | TODO |

**Phase 1 Completion Criteria:**
- `npm run migrate` runs on empty DB, all tables + enums created
- 3 branches, 3 room types, 5 amenities seeded
- Guest can register, login, get session
- Staff can login with role + branchId in session
- Unauthenticated → 401; wrong role → 403

---

## Phase 2 — Room Inventory and Availability
**Integration Owner:** M2
**Parallel from Day 1:** SP2.3 and SP2.4 use mock data and can start once shared contracts (SP1.1-T04) are published.

---

### SP2.1 — Room Schema _(M2, DB serial after SP1.2 DB executed)_

| Task ID | Title | Type | Files | Depends On | Status |
|---|---|---|---|---|---|
| P02-M02-T01 | `room` table DDL + RoomStatus enum | 🔴 SERIAL | `database/migrations/P02-M02-T01-01_create_room.sql` | P01-M01-T07, P01-M02-T01 DB done | TODO |
| P02-M02-T02 | Seed 15 rooms across 3 branches | 🔴 SERIAL | `database/seeds/P02-M02-T02_seed_rooms.sql` | T01 | TODO |

---

### SP2.2 — Availability DB _(M2, DB serial — needs room + reservation tables)_

| Task ID | Title | Type | Files | Depends On | Status |
|---|---|---|---|---|---|
| P02-M02-T03 | `fn_get_available_rooms()` PostgreSQL function | 🔴 SERIAL | `database/routines/availability/fn_get_available_rooms.sql` | SP2.1 + P03-M03-T02 DB done | TODO |
| P02-M02-T04 | Composite index on `reservation_rooms` dates | 🔴 SERIAL | `database/indexes/idx_reservation_rooms_dates.sql` | P03-M03-T02 DB done | TODO |

> **Note:** Write the SQL file now; execute after P03-M03-T02 is merged.

---

### SP2.3 — Room API _(M2, mock-first — start Day 1)_

| Task ID | Title | Type | Files | Status |
|---|---|---|---|---|
| P02-M02-T05 | Room repository — CRUD queries | 🟡 MOCK-FIRST | `repositories/room.repository.ts` | REVIEW |
| P02-M02-T06 | Room service — business logic layer | 🟡 MOCK-FIRST | `services/room.service.ts` | REVIEW |
| P02-M02-T07 | Availability repository (wraps fn_get_available_rooms) | 🟡 MOCK-FIRST | `repositories/availability.repository.ts` | REVIEW |
| P02-M02-T08 | Availability service — search orchestration | 🟡 MOCK-FIRST | `services/availability.service.ts` | REVIEW |
| P02-M02-T09 | GET `/api/availability` route handler (public) | 🟡 MOCK-FIRST | `app/api/availability/route.ts` | REVIEW |
| P02-M02-T10 | GET `/api/staff/rooms` route handler (list) | 🟡 MOCK-FIRST | `app/api/staff/rooms/route.ts` | REVIEW |
| P02-M02-T11 | POST `/api/staff/rooms` route handler (create) | 🟡 MOCK-FIRST | `app/api/staff/rooms/route.ts` | REVIEW |
| P02-M02-T12 | PATCH `/api/staff/rooms/[id]` route handler (update status) | 🟡 MOCK-FIRST | `app/api/staff/rooms/[id]/route.ts` | REVIEW |

---

### SP2.4 — Room UI _(M2, mock-first — start Day 1)_

| Task ID | Title | Type | Files | Status |
|---|---|---|---|---|
| P02-M02-T13 | Public availability search page | 🟡 MOCK-FIRST | `app/search/page.tsx` | TODO |
| P02-M02-T14 | Room card component (search result item) | 🟢 PARALLEL | `components/RoomCard.tsx` | TODO |
| P02-M02-T15 | Staff rooms list page | 🟡 MOCK-FIRST | `app/staff/rooms/page.tsx` | TODO |
| P02-M02-T16 | Staff room form/edit component | 🟢 PARALLEL | `components/RoomForm.tsx` | TODO |

---

### SP2.5 — Tests (M2)

| Task ID | Title | Type | Files | Status |
|---|---|---|---|---|
| P02-M02-T17 | Availability function tests (maintenance excluded, overlap excluded) | 🔴 SERIAL | `database/tests/test_availability.sql` | SP2.2 done | TODO |
| P02-M02-T18 | EXPLAIN ANALYZE for availability query | 🔴 SERIAL | `docs/09_database-routines-triggers-views-indexes.md` (append) | SP2.2 done | TODO |

**Phase 2 Completion Criteria:**
- Availability search returns correct rooms for test scenarios
- Maintenance rooms excluded from search results
- Only Manager/Admin can set room to Maintenance
- EXPLAIN ANALYZE output filed in docs/09

---

## Phase 3 — Guests and Reservations
**Integration Owner:** M3
**Parallel from Day 1:** SP3.3, SP3.4, SP3.5 use mock data and start immediately.

---

### SP3.1 — Reservation Schema _(M3, DB serial after SP1.2 + SP2.1 DB executed)_

| Task ID | Title | Type | Files | Depends On | Status |
|---|---|---|---|---|---|
| P03-M03-T01 | `reservation` table DDL | 🔴 SERIAL | `database/migrations/P03-M03-T01-01_create_reservation.sql` | P01-M01-T09, P01-M01-T07, P01-M01-T08 DB done | TODO |
| P03-M03-T02 | `reservation_rooms` table DDL | 🔴 SERIAL | `database/migrations/P03-M03-T02-01_create_reservation_rooms.sql` | T01 + P02-M02-T01 DB done | TODO |

---

### SP3.2 — Reservation DB _(M3, DB serial after SP3.1)_

| Task ID | Title | Type | Files | Depends On | Status |
|---|---|---|---|---|---|
| P03-M03-T03 | `sp_create_reservation()` atomic procedure | 🔴 SERIAL | `database/routines/reservations/sp_create_reservation.sql` | SP3.1 + SP2.2 done | TODO |
| P03-M03-T04 | `fn_get_reservation_detail()` function | 🔴 SERIAL | `database/routines/reservations/fn_get_reservation_detail.sql` | SP3.1 done | TODO |
| P03-M03-T05 | `sp_cancel_reservation()` stored procedure | 🔴 SERIAL | `database/routines/reservations/sp_cancel_reservation.sql` | SP3.1 done | TODO |
| P03-M03-T06 | `vw_active_reservations` DB view | 🔴 SERIAL | `database/views/vw_active_reservations.sql` | SP3.1 done | TODO |

---

### SP3.3 — Guest Booking API _(M3, mock-first — start Day 1)_

| Task ID | Title | Type | Files | Status |
|---|---|---|---|---|
| P03-M03-T07 | Reservation repository — create (calls sp) | 🟡 MOCK-FIRST | `repositories/reservation.repository.ts` | TODO |
| P03-M03-T08 | Reservation repository — list by guest | 🟡 MOCK-FIRST | `repositories/reservation.repository.ts` | TODO |
| P03-M03-T09 | Reservation repository — get detail by ID | 🟡 MOCK-FIRST | `repositories/reservation.repository.ts` | TODO |
| P03-M03-T10 | Reservation service — orchestration layer | 🟡 MOCK-FIRST | `services/reservation.service.ts` | TODO |
| P03-M03-T11 | POST `/api/guest/reservations` route handler | 🟡 MOCK-FIRST | `app/api/guest/reservations/route.ts` | TODO |
| P03-M03-T12 | GET `/api/guest/reservations` route handler (list) | 🟡 MOCK-FIRST | `app/api/guest/reservations/route.ts` | TODO |
| P03-M03-T13 | GET `/api/guest/reservations/[id]` route handler | 🟡 MOCK-FIRST | `app/api/guest/reservations/[id]/route.ts` | TODO |

---

### SP3.4 — Guest Booking UI _(M3, mock-first — start Day 1)_

| Task ID | Title | Type | Files | Status |
|---|---|---|---|---|
| P03-M03-T14 | Guest booking form page | 🟡 MOCK-FIRST | `app/guest/book/page.tsx` | TODO |
| P03-M03-T15 | Booking confirmation page | 🟡 MOCK-FIRST | `app/guest/book/confirm/page.tsx` | TODO |
| P03-M03-T16 | My reservations list page | 🟡 MOCK-FIRST | `app/guest/reservations/page.tsx` | TODO |
| P03-M03-T17 | Reservation detail page | 🟡 MOCK-FIRST | `app/guest/reservations/[id]/page.tsx` | TODO |

---

### SP3.5 — Staff Reservation _(M3, mock-first — start Day 1)_

| Task ID | Title | Type | Files | Status |
|---|---|---|---|---|
| P03-M03-T18 | POST `/api/staff/reservations` route handler | 🟡 MOCK-FIRST | `app/api/staff/reservations/route.ts` | TODO |
| P03-M03-T19 | GET `/api/staff/reservations` route handler (list + filters) | 🟡 MOCK-FIRST | `app/api/staff/reservations/route.ts` | TODO |
| P03-M03-T20 | PATCH `/api/staff/reservations/[id]/cancel` route handler | 🟡 MOCK-FIRST | `app/api/staff/reservations/[id]/cancel/route.ts` | TODO |
| P03-M03-T21 | Staff reservations list page | 🟡 MOCK-FIRST | `app/staff/reservations/page.tsx` | TODO |
| P03-M03-T22 | Staff reservation detail page | 🟡 MOCK-FIRST | `app/staff/reservations/[id]/page.tsx` | TODO |

---

### SP3.6 — Tests (M3)

| Task ID | Title | Type | Files | Status |
|---|---|---|---|---|
| P03-M03-T23 | Ownership enforcement tests | 🔴 SERIAL | `database/tests/test_ownership.sql` | SP3.1 done | TODO |
| P03-M03-T24 | Concurrent double-booking prevention test | 🔴 SERIAL | `database/tests/test_concurrency.sql` | SP3.2 done | TODO |

**Phase 3 Completion Criteria:**
- Booking creates both `reservation` and `reservation_rooms` atomically
- Overlap → 409; cross-branch rooms → 422
- Guest A cannot view Guest B's reservations
- Concurrent test: exactly one winner, one 409

---

## Phase 4 — Stay Services and Billing
**Integration Owners:** M4 (services) + M5 (billing, runs in parallel)
**Parallel:** SP4.3, SP4.4, SP4.7 are mock-first from Day 1.

---

### SP4.1 — Service Schema _(M4, DB serial after SP3.1 DB executed)_

| Task ID | Title | Type | Files | Depends On | Status |
|---|---|---|---|---|---|
| P04-M04-T01 | `service_catalogue` table DDL | 🔴 SERIAL | `database/migrations/P04-M04-T01-01_create_service_catalogue.sql` | SP3.1 done | TODO |
| P04-M04-T02 | Seed 6 service catalogue items | 🔴 SERIAL | `database/seeds/P04-M04-T02_seed_services.sql` | T01 | TODO |
| P04-M04-T03 | `service_usage` table DDL | 🔴 SERIAL | `database/migrations/P04-M04-T03-01_create_service_usage.sql` | T01, SP3.1 done | TODO |

---

### SP4.2 — Service DB _(M4, DB serial after SP4.1)_

| Task ID | Title | Type | Files | Depends On | Status |
|---|---|---|---|---|---|
| P04-M04-T04 | `sp_check_in()` atomic procedure | 🔴 SERIAL | `database/routines/checkin/sp_check_in.sql` | SP4.1 done | TODO |
| P04-M04-T05 | `sp_log_service_usage()` procedure (price snapshot) | 🔴 SERIAL | `database/routines/billing-inputs/sp_log_service_usage.sql` | SP4.1 done | TODO |
| P04-M04-T06 | `fn_calc_room_charges()` function | 🔴 SERIAL | `database/routines/billing-inputs/fn_calc_room_charges.sql` | SP3.1 done | TODO |
| P04-M04-T07 | `fn_calc_service_charges()` function | 🔴 SERIAL | `database/routines/billing-inputs/fn_calc_service_charges.sql` | SP4.1 done | TODO |
| P04-M04-T08 | `vw_service_usage_breakdown` view | 🔴 SERIAL | `database/views/vw_service_usage_breakdown.sql` | SP4.1 done | TODO |

---

### SP4.3 — Service API _(M4, mock-first — start Day 1)_

| Task ID | Title | Type | Files | Status |
|---|---|---|---|---|
| P04-M04-T09 | Service usage repository | 🟡 MOCK-FIRST | `repositories/service-usage.repository.ts` | TODO |
| P04-M04-T10 | Check-in service layer | 🟡 MOCK-FIRST | `services/checkin.service.ts` | TODO |
| P04-M04-T11 | Service usage service layer | 🟡 MOCK-FIRST | `services/service-usage.service.ts` | TODO |
| P04-M04-T12 | POST `/api/staff/reservations/[id]/checkin` route handler | 🟡 MOCK-FIRST | `app/api/staff/reservations/[id]/checkin/route.ts` | TODO |
| P04-M04-T13 | POST `/api/staff/reservations/[id]/services` route handler | 🟡 MOCK-FIRST | `app/api/staff/reservations/[id]/services/route.ts` | TODO |
| P04-M04-T14 | GET `/api/staff/services` route handler (catalogue list) | 🟡 MOCK-FIRST | `app/api/staff/services/route.ts` | TODO |
| P04-M04-T15 | POST `/api/staff/services` route handler (add item) | 🟡 MOCK-FIRST | `app/api/staff/services/route.ts` | TODO |

---

### SP4.4 — Service UI _(M4, mock-first — start Day 1)_

| Task ID | Title | Type | Files | Status |
|---|---|---|---|---|
| P04-M04-T16 | Staff check-in page | 🟡 MOCK-FIRST | `app/staff/checkin/page.tsx` | TODO |
| P04-M04-T17 | Service usage logging page (per reservation) | 🟡 MOCK-FIRST | `app/staff/reservations/[id]/services/page.tsx` | TODO |

---

### SP4.5 — Billing Schema _(M5, DB serial after SP3.1 — parallel with M4 SP4.1+)_

| Task ID | Title | Type | Files | Depends On | Status |
|---|---|---|---|---|---|
| P04-M05-T01 | `tax_policies` table DDL + seed 8% rate | 🔴 SERIAL | `database/migrations/P04-M05-T01-01_create_tax_policies.sql`, `database/seeds/P04-M05-T01_seed_tax.sql` | SP3.1 done | TODO |
| P04-M05-T02 | `billing_summary` table DDL | 🔴 SERIAL | `database/migrations/P04-M05-T02-01_create_billing_summary.sql` | SP3.1 done | TODO |

---

### SP4.6 — Invoice DB _(M5, DB serial after SP4.5 + SP4.2 M4 functions ready)_

| Task ID | Title | Type | Files | Depends On | Status |
|---|---|---|---|---|---|
| P04-M05-T03 | `sp_finalize_invoice()` stored procedure | 🔴 SERIAL | `database/routines/billing/sp_finalize_invoice.sql` | SP4.5 + P04-M04-T06/T07 done | TODO |
| P04-M05-T04 | `vw_invoice_totals` view (grand total + balance) | 🔴 SERIAL | `database/views/vw_invoice_totals.sql` | SP4.5 done | TODO |

---

### SP4.7 — Billing API _(M5, mock-first — start Day 1)_

| Task ID | Title | Type | Files | Status |
|---|---|---|---|---|
| P04-M05-T05 | Billing repository | 🟡 MOCK-FIRST | `repositories/billing.repository.ts` | TODO |
| P04-M05-T06 | Billing service layer | 🟡 MOCK-FIRST | `services/billing.service.ts` | TODO |
| P04-M05-T07 | GET `/api/guest/reservations/[id]/invoice` route handler | 🟡 MOCK-FIRST | `app/api/guest/reservations/[id]/invoice/route.ts` | TODO |

**Phase 4 Completion Criteria:**
- `vw_invoice_totals` returns LKR 26920 grand total for test scenario
- Service usage `charged_price` snapshot captured at logging time
- Check-in sets all reservation rooms to Occupied atomically
- `sp_check_in()` rollback on failure verified

---

## Phase 5 — Payments, Checkout, and Reports
**Integration Owner:** M5 (M2, M3, M4 contribute report tasks)
**Parallel:** SP5.4–SP5.7 are mock-first from Day 1.

---

### SP5.1 — Payment Schema _(M5, DB serial after SP4.5 DB executed)_

| Task ID | Title | Type | Files | Depends On | Status |
|---|---|---|---|---|---|
| P05-M05-T01 | `payment` table DDL | 🔴 SERIAL | `database/migrations/P05-M05-T01-01_create_payment.sql` | SP4.5 done | TODO |

---

### SP5.2 — Payment DB _(M5, DB serial after SP5.1)_

| Task ID | Title | Type | Files | Depends On | Status |
|---|---|---|---|---|---|
| P05-M05-T02 | `sp_post_payment()` procedure + idempotency check | 🔴 SERIAL | `database/routines/payments/sp_post_payment.sql` | SP5.1 done | TODO |
| P05-M05-T03 | `sp_checkout()` procedure (balance guard + room release) | 🔴 SERIAL | `database/routines/checkout/sp_checkout.sql` | SP5.1 done | TODO |

---

### SP5.3 — Report Views _(M5 + M2 + M3, DB serial after SP3-SP4 complete)_

| Task ID | Member | Title | Type | Files | Status |
|---|---|---|---|---|---|
| P05-M05-T04 | M5 | `vw_room_occupancy` view | 🔴 SERIAL | `database/views/vw_room_occupancy.sql` | SP3-SP4 done | TODO |
| P05-M05-T05 | M5 | `vw_guest_billing_summary` view | 🔴 SERIAL | `database/views/vw_guest_billing_summary.sql` | SP4-SP5 done | TODO |
| P05-M05-T06 | M5 | `vw_monthly_revenue` view | 🔴 SERIAL | `database/views/vw_monthly_revenue.sql` | SP4-SP5 done | TODO |
| P05-M03-T01 | M3 | `vw_top_services` view | 🔴 SERIAL | `database/views/vw_top_services.sql` | SP4.1 done | TODO |
| P05-M05-T07 | M5 | `vw_audit_log` view | 🔴 SERIAL | `database/views/vw_audit_log.sql` | All tables done | TODO |

---

### SP5.4 — Payment API _(M5, mock-first — start Day 1)_

| Task ID | Title | Type | Files | Status |
|---|---|---|---|---|
| P05-M05-T08 | Payment repository | 🟡 MOCK-FIRST | `repositories/payment.repository.ts` | TODO |
| P05-M05-T09 | Payment service layer | 🟡 MOCK-FIRST | `services/payment.service.ts` | TODO |
| P05-M05-T10 | POST `/api/guest/payments` route handler | 🟡 MOCK-FIRST | `app/api/guest/payments/route.ts` | TODO |
| P05-M05-T11 | POST `/api/staff/reservations/[id]/checkout` route handler | 🟡 MOCK-FIRST | `app/api/staff/reservations/[id]/checkout/route.ts` | TODO |

---

### SP5.5 — Reports API _(M5 + M2 + M3, mock-first — start Day 1)_

| Task ID | Member | Title | Type | Files | Status |
|---|---|---|---|---|---|
| P05-M02-T02 | M2 | GET `/api/staff/reports/occupancy` route handler | 🟡 MOCK-FIRST | `app/api/staff/reports/occupancy/route.ts` | TODO |
| P05-M05-T12 | M5 | GET `/api/staff/reports/billing` route handler | 🟡 MOCK-FIRST | `app/api/staff/reports/billing/route.ts` | TODO |
| P05-M05-T13 | M5 | GET `/api/staff/reports/revenue` route handler | 🟡 MOCK-FIRST | `app/api/staff/reports/revenue/route.ts` | TODO |
| P05-M03-T02 | M3 | GET `/api/staff/reports/top-services` route handler | 🟡 MOCK-FIRST | `app/api/staff/reports/top-services/route.ts` | TODO |

---

### SP5.6 — Payment UI _(M5, mock-first — start Day 1)_

| Task ID | Title | Type | Files | Status |
|---|---|---|---|---|
| P05-M05-T14 | Guest bill + pay form page | 🟡 MOCK-FIRST | `app/guest/reservations/[id]/pay/page.tsx` | TODO |
| P05-M05-T15 | Payment success/confirmation component | 🟢 PARALLEL | `components/PaymentConfirmation.tsx` | TODO |

---

### SP5.7 — Reports UI _(M2 + M4 + M5, mock-first — start Day 1)_

| Task ID | Member | Title | Type | Files | Status |
|---|---|---|---|---|---|
| P05-M05-T16 | M5 | Reports dashboard page | 🟡 MOCK-FIRST | `app/staff/reports/page.tsx` | TODO |
| P05-M02-T01 | M2 | Room occupancy report page | 🟡 MOCK-FIRST | `app/staff/reports/occupancy/page.tsx` | TODO |
| P05-M04-T01 | M4 | Service usage report page | 🟡 MOCK-FIRST | `app/staff/reports/service-usage/page.tsx` | TODO |
| P05-M05-T17 | M5 | Monthly revenue report page | 🟡 MOCK-FIRST | `app/staff/reports/revenue/page.tsx` | TODO |
| P05-M05-T18 | M5 | Guest billing summary report page | 🟡 MOCK-FIRST | `app/staff/reports/billing/page.tsx` | TODO |

**Phase 5 Completion Criteria:**
- Partial payment → balance decreases; full payment → balance = 0
- `sp_checkout()` fails with 409 on non-zero balance
- All 5 reports return correct results with seed data
- EXPLAIN ANALYZE results filed for revenue report

---

## Phase 6 — Integration, Testing, and Deployment Prep
**Coordinator:** M1
**Dependency:** All P1–P5 tasks in REVIEW or DONE

---

### SP6.1 — Mock→Real DB Wire-up _(all members)_

| Task ID | Member | Title | Status |
|---|---|---|---|
| P06-M01-T01 | M1 | Wire auth repositories to real DB; verify session flow end-to-end | TODO |
| P06-M02-T01 | M2 | Wire room + availability repositories to real DB | TODO |
| P06-M03-T01 | M3 | Wire reservation repository to real DB | TODO |
| P06-M04-T01 | M4 | Wire service-usage + checkin to real DB | TODO |
| P06-M05-T01 | M5 | Wire billing + payment to real DB | TODO |
| P06-M01-T02 | M1 | Clean DB rebuild from empty + full seed verify | TODO |

---

### SP6.2 — E2E Flows _(all members verify their slice)_

| Task ID | Member | Title | Status |
|---|---|---|---|
| P06-M01-T03 | M1 | Guest register → login → browse flow verified | TODO |
| P06-M02-T02 | M2 | Availability search returns correct results for all test scenarios | TODO |
| P06-M03-T02 | M3 | Full guest booking flow E2E (search → book → confirm → view) | TODO |
| P06-M04-T02 | M4 | Check-in + service usage flow E2E | TODO |
| P06-M05-T02 | M5 | Billing → payment → checkout flow E2E | TODO |

---

### SP6.3 — Security and Concurrency _(M1 + M3 + M5)_

| Task ID | Member | Title | Status |
|---|---|---|---|
| P06-M01-T04 | M1 | SQL injection tests (parameterized query coverage) | TODO |
| P06-M01-T05 | M1 | Auth bypass tests (session forgery, role escalation) | TODO |
| P06-M03-T03 | M3 | Concurrent double-booking test (two requests, one room, same dates) | TODO |
| P06-M03-T04 | M3 | Guest ownership enforcement tests (cross-guest access denied) | TODO |
| P06-M05-T03 | M5 | Transaction rollback tests (partial failures leave no partial state) | TODO |

---

### SP6.4 — Performance _(M2 + M5)_

| Task ID | Member | Title | Status |
|---|---|---|---|
| P06-M02-T03 | M2 | EXPLAIN ANALYZE for availability query + index impact | TODO |
| P06-M05-T04 | M5 | EXPLAIN ANALYZE for monthly revenue report query | TODO |

---

### SP6.5 — Final Polish _(M1 coordinates)_

| Task ID | Member | Title | Status |
|---|---|---|---|
| P06-M01-T06 | M1 | README update (setup, demo credentials, academic concept list) | TODO |
| P06-M01-T07 | M1 | Demo scenario script (walkthrough for lecturer demo) | TODO |
| P06-M01-T08 | M1 | Final docs review + context/08 progress tracker final update | TODO |

**Phase 6 Completion Criteria:**
- All 5 E2E flows pass end-to-end on real DB
- All security tests pass
- Concurrent booking: exactly one winner, one 409
- Both EXPLAIN ANALYZE results filed
- Clean rebuild confirmed from empty DB
- Final README updated

---

## Task Count Summary

| Phase | Subphases | Total Tasks | Serial (DB) | Mock-First | Parallel |
|---|---|---|---|---|---|
| P1 | SP1.1–SP1.4 | 29 | 9 | 12 | 8 |
| P2 | SP2.1–SP2.5 | 18 | 5 | 10 | 3 |
| P3 | SP3.1–SP3.6 | 24 | 8 | 14 | 2 |
| P4 | SP4.1–SP4.7 | 27 | 11 | 12 | 4 |
| P5 | SP5.1–SP5.7 | 22 | 7 | 13 | 2 |
| P6 | SP6.1–SP6.5 | 19 | 2 | 0 | 17 |
| **Total** | **25 subphases** | **139 tasks** | **42** | **61** | **36** |
