# Phase 4 — Stay Services and Billing

## Integration Owners: Member 4 (services) + Member 5 (billing, parallel)
## Dependency (DB layer): SP3.1 (reservation tables) executed
## Parallel start: SP4.3, SP4.4, SP4.7 begin Day 1 with mock data

## Parallelism Strategy
- **M4 and M5 run simultaneously** — their DB tables do not depend on each other within this phase.
- **SP4.1 / SP4.5** — DDL tables. Both need SP3.1 reservation tables to exist. M4 and M5 write + run these in parallel.
- **SP4.2** — Service DB procedures. M4 writes these after SP4.1.
- **SP4.6** — Invoice DB. M5 writes these after SP4.5; `sp_finalize_invoice` calls M4's charge functions — M4 must publish function signatures first.
- **SP4.3 / SP4.4 / SP4.7** — All API + UI. Mock-first from Day 1.

---

## M4 Subphases

### SP4.1 — Service Schema _(M4, DB serial after SP3.1 executed)_

| Task | Title | Type | Depends On |
|---|---|---|---|
| P04-M04-T01 | `service_catalogue` table DDL | 🔴 SERIAL | SP3.1 done |
| P04-M04-T02 | Seed 6 service catalogue items | 🔴 SERIAL | T01 |
| P04-M04-T03 | `service_usage` table DDL | 🔴 SERIAL | T01, SP3.1 done |

---

### SP4.2 — Service DB _(M4, DB serial after SP4.1)_

| Task | Title | Type | Depends On |
|---|---|---|---|
| P04-M04-T04 | `sp_check_in()` atomic procedure (sets rooms to Occupied) | 🔴 SERIAL | SP4.1 done |
| P04-M04-T05 | `sp_log_service_usage()` procedure (price snapshot) | 🔴 SERIAL | SP4.1 done |
| P04-M04-T06 | `fn_calc_room_charges()` function | 🔴 SERIAL | SP3.1 done |
| P04-M04-T07 | `fn_calc_service_charges()` function | 🔴 SERIAL | SP4.1 done |
| P04-M04-T08 | `vw_service_usage_breakdown` view | 🔴 SERIAL | SP4.1 done |

> **Coordination:** After T06/T07 are DONE, publish function signatures to M5 so M5 can implement `sp_finalize_invoice`.

---

### SP4.3 — Service API _(M4, mock-first — start Day 1)_

| Task | Title | Type | Files |
|---|---|---|---|
| P04-M04-T09 | Service usage repository | 🟡 MOCK-FIRST | `repositories/service-usage.repository.ts` |
| P04-M04-T10 | Check-in service layer | 🟡 MOCK-FIRST | `services/checkin.service.ts` |
| P04-M04-T11 | Service usage service layer | 🟡 MOCK-FIRST | `services/service-usage.service.ts` |
| P04-M04-T12 | POST `/api/staff/reservations/[id]/checkin` | 🟡 MOCK-FIRST | `app/api/staff/reservations/[id]/checkin/route.ts` |
| P04-M04-T13 | POST `/api/staff/reservations/[id]/services` (log usage) | 🟡 MOCK-FIRST | `app/api/staff/reservations/[id]/services/route.ts` |
| P04-M04-T14 | GET `/api/staff/services` (catalogue list) | 🟡 MOCK-FIRST | `app/api/staff/services/route.ts` |
| P04-M04-T15 | POST `/api/staff/services` (add catalogue item) | 🟡 MOCK-FIRST | `app/api/staff/services/route.ts` |

---

### SP4.4 — Service UI _(M4, mock-first — start Day 1)_

| Task | Title | Type | Files |
|---|---|---|---|
| P04-M04-T16 | Staff check-in page | 🟡 MOCK-FIRST | `app/staff/checkin/page.tsx` |
| P04-M04-T17 | Service usage logging page (per reservation) | 🟡 MOCK-FIRST | `app/staff/reservations/[id]/services/page.tsx` |

---

## M5 Subphases _(run in parallel with M4 above)_

### SP4.5 — Billing Schema _(M5, DB serial after SP3.1 executed — parallel with SP4.1)_

| Task | Title | Type | Depends On |
|---|---|---|---|
| P04-M05-T01 | `tax_policies` table DDL + seed 8% rate | 🔴 SERIAL | SP3.1 done |
| P04-M05-T02 | `billing_summary` table DDL | 🔴 SERIAL | SP3.1 done |

---

### SP4.6 — Invoice DB _(M5, DB serial after SP4.5 + M4 charge functions ready)_

| Task | Title | Type | Depends On |
|---|---|---|---|
| P04-M05-T03 | `sp_finalize_invoice()` stored procedure | 🔴 SERIAL | SP4.5 + P04-M04-T06/T07 DONE |
| P04-M05-T04 | `vw_invoice_totals` view (grand total + outstanding balance) | 🔴 SERIAL | SP4.5 done |

---

### SP4.7 — Billing API _(M5, mock-first — start Day 1)_

| Task | Title | Type | Files |
|---|---|---|---|
| P04-M05-T05 | Billing repository | 🟡 MOCK-FIRST | `repositories/billing.repository.ts` |
| P04-M05-T06 | Billing service layer | 🟡 MOCK-FIRST | `services/billing.service.ts` |
| P04-M05-T07 | GET `/api/guest/reservations/[id]/invoice` | 🟡 MOCK-FIRST | `app/api/guest/reservations/[id]/invoice/route.ts` |

## Completion Criteria
- `vw_invoice_totals` returns LKR 26920 grand total for Scenario 3 (docs/10)
- `charged_price` snapshot captured at service logging time (not recalculated)
- `sp_check_in()` sets all reservation rooms to Occupied in a single transaction
- `sp_check_in()` rollback on any failure — no partial state
- `sp_finalize_invoice()` uses `fn_calc_room_charges` + `fn_calc_service_charges` (never TypeScript formulas)
