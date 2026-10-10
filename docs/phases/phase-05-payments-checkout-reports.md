# Phase 5 — Payments, Checkout, and Reports

## Integration Owner: Member 5 (M5)
## Contributing: M2 (occupancy UI), M3 (top-services), M4 (service usage UI)
## Dependency (DB layer): SP4.5 (billing_summary) executed
## Parallel start: SP5.4, SP5.5, SP5.6, SP5.7 begin Day 1 with mock data

## Parallelism Strategy
- **SP5.1 / SP5.2** — `payment` DDL + procedures. DB serial, run after SP4.5 executed.
- **SP5.3** — Report views. DB serial, need SP3–SP4 tables. Write SQL anytime; execute last.
- **SP5.4 / SP5.5 / SP5.6 / SP5.7** — All APIs and UI pages. Mock-first from Day 1. M2, M3, M4 work on their report pages simultaneously.

## Subphases

### SP5.1 — Payment Schema _(M5, DB serial after SP4.5 executed)_

| Task | Title | Type | Depends On |
|---|---|---|---|
| P05-M05-T01 | `payment` table DDL | 🔴 SERIAL | SP4.5 done |

---

### SP5.2 — Payment DB _(M5, DB serial after SP5.1)_

| Task | Title | Type | Depends On |
|---|---|---|---|
| P05-M05-T02 | `sp_post_payment()` procedure + idempotency check | 🔴 SERIAL | SP5.1 done |
| P05-M05-T03 | `sp_checkout()` procedure (balance = 0 guard + room release) | 🔴 SERIAL | SP5.1 done |

---

### SP5.3 — Report Views _(M5 + M2 + M3, DB serial after SP3–SP4 complete)_

| Task | Member | Title | Type | Files |
|---|---|---|---|---|
| P05-M05-T04 | M5 | `vw_room_occupancy` view | 🔴 SERIAL | `database/views/vw_room_occupancy.sql` |
| P05-M05-T05 | M5 | `vw_guest_billing_summary` view | 🔴 SERIAL | `database/views/vw_guest_billing_summary.sql` |
| P05-M05-T06 | M5 | `vw_monthly_revenue` view | 🔴 SERIAL | `database/views/vw_monthly_revenue.sql` |
| P05-M03-T01 | M3 | `vw_top_services` view | 🔴 SERIAL | `database/views/vw_top_services.sql` |
| P05-M05-T07 | M5 | `vw_audit_log` view | 🔴 SERIAL | `database/views/vw_audit_log.sql` |

---

### SP5.4 — Payment API _(M5, mock-first — start Day 1)_

| Task | Title | Type | Files |
|---|---|---|---|
| P05-M05-T08 | Payment repository | 🟡 MOCK-FIRST | `repositories/payment.repository.ts` |
| P05-M05-T09 | Payment service layer | 🟡 MOCK-FIRST | `services/payment.service.ts` |
| P05-M05-T10 | POST `/api/guest/payments` — submit payment | 🟡 MOCK-FIRST | `app/api/guest/payments/route.ts` |
| P05-M05-T11 | POST `/api/staff/reservations/[id]/checkout` | 🟡 MOCK-FIRST | `app/api/staff/reservations/[id]/checkout/route.ts` |

---

### SP5.5 — Reports API _(M5 + M2 + M3, mock-first — all start Day 1)_

| Task | Member | Title | Type | Files |
|---|---|---|---|---|
| P05-M02-T02 | M2 | GET `/api/staff/reports/occupancy` | 🟡 MOCK-FIRST | `app/api/staff/reports/occupancy/route.ts` |
| P05-M05-T12 | M5 | GET `/api/staff/reports/billing` | 🟡 MOCK-FIRST | `app/api/staff/reports/billing/route.ts` |
| P05-M05-T13 | M5 | GET `/api/staff/reports/revenue` | 🟡 MOCK-FIRST | `app/api/staff/reports/revenue/route.ts` |
| P05-M03-T02 | M3 | GET `/api/staff/reports/top-services` | 🟡 MOCK-FIRST | `app/api/staff/reports/top-services/route.ts` |

---

### SP5.6 — Payment UI _(M5, mock-first — start Day 1)_

| Task | Title | Type | Files |
|---|---|---|---|
| P05-M05-T14 | Guest bill + pay form page | 🟡 MOCK-FIRST | `app/guest/reservations/[id]/pay/page.tsx` |
| P05-M05-T15 | Payment confirmation component | 🟢 PARALLEL | `components/PaymentConfirmation.tsx` |

---

### SP5.7 — Reports UI _(M2 + M4 + M5, mock-first — all start Day 1)_

| Task | Member | Title | Type | Files |
|---|---|---|---|---|
| P05-M05-T16 | M5 | Reports dashboard page (navigation hub) | 🟡 MOCK-FIRST | `app/staff/reports/page.tsx` |
| P05-M02-T01 | M2 | Room occupancy report page | 🟡 MOCK-FIRST | `app/staff/reports/occupancy/page.tsx` |
| P05-M04-T01 | M4 | Service usage report page | 🟡 MOCK-FIRST | `app/staff/reports/service-usage/page.tsx` |
| P05-M05-T17 | M5 | Monthly revenue report page | 🟡 MOCK-FIRST | `app/staff/reports/revenue/page.tsx` |
| P05-M05-T18 | M5 | Guest billing summary report page | 🟡 MOCK-FIRST | `app/staff/reports/billing/page.tsx` |

## Key DB Deliverables
- `payment` table (FK to billing_summary)
- `sp_post_payment()` — idempotent, records each payment atomically
- `sp_checkout()` — balance = 0 guard; sets rooms to Available on success
- 5 report views: occupancy, guest billing, monthly revenue, top services, audit log

## Completion Criteria
- Partial payment → outstanding balance decreases
- Full payment → `sp_checkout()` succeeds, rooms released to Available
- `sp_checkout()` with non-zero balance → 409
- All 5 report views return correct results against seed data
- EXPLAIN ANALYZE for revenue report filed in docs/09
