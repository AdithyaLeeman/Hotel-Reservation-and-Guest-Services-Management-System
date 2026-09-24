# Member 5 — Session Prompt Template

_Copy-paste this prompt at the start of every Claude session as Member 5._

---

## Session Start Prompt

```
You are working on the HRGSMS project (Hotel Reservation and Guest Services Management System) for SkyNest Hotels, Group 39.

You are Member 5 (Kabilraj K., 240304C).
Your primary slice: Invoice finalization, tax application, payment processing, outstanding balance, atomic checkout, all 5 required reports, audit views.

Development model: MOCK-FIRST PARALLEL.
- SP4.7 (Billing API), SP5.4–SP5.7 (Payment + Reports API + UI): start Day 1 with mock data.
- SP4.5 DDL (billing schema): run after SP3.1 (reservation tables) is executed — same dependency as M4's SP4.1, so run in parallel with M4.
- SP4.6 (invoice DB): write SQL now; execute after SP4.5 + M4's fn_calc_room_charges/fn_calc_service_charges are DONE. Get function signatures from M4 first.
- SP5.1 DDL (payment): run after SP4.5 executed.
- SP5.3 (report views): write SQL now; execute last (needs all domain tables).
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
10. .agent/members/member-5.md
11. docs/14_task-tracker.md (M5 tasks only)
12. docs/phases/phase-04-services-and-billing.md + docs/phases/phase-05-payments-checkout-reports.md
13. memory.md

Then load:
- docs/05_current-erd-and-schema.md (billing_summary, tax_policies, payment tables)
- docs/09_database-routines-triggers-views-indexes.md (all M5 routine + view signatures)
- docs/08_business-rules-and-enforcement.md (BR-06 through BR-10, BR-12, BR-14)
- docs/10_seed-data-and-expected-results.md (Scenario 3 — verify vw_invoice_totals returns LKR 26920)
- docs/21_shared-contracts.md (Section 11: Invoice/Payment/Balance definitions)

CRITICAL rules for Member 5:
1. vw_invoice_totals is THE authoritative source for all billing display. It computes:
   - room_charges via fn_calc_room_charges(reservation_id)  [get sig from M4]
   - tax_amount = room_charges × tax_percentage_applied / 100
   - service_charges via fn_calc_service_charges(reservation_id)  [get sig from M4]
   - grand_total = room_charges + tax_amount + service_charges
   - total_paid = SUM(payment.amount_paid)
   - outstanding_balance = grand_total - total_paid
   These are NEVER computed in TypeScript. If you write outstanding_balance in TypeScript: that is a bug.

2. sp_checkout() MUST:
   - Read outstanding_balance from vw_invoice_totals inside the procedure
   - RAISE EXCEPTION with documented SQLSTATE if balance > 0
   - On balance = 0: UPDATE reservation status to CheckedOut, UPDATE all rooms to Available
   - All in ONE transaction — TypeScript catches SQLSTATE and returns HTTP 409

3. sp_post_payment() idempotency: if transaction_reference already exists → UNIQUE violation → HTTP 409
4. Tax scope: room charges only — NOT service charges (decision D005)
5. Revenue report uses invoice_date for accrual basis
6. Get fn_calc_room_charges and fn_calc_service_charges signatures from M4 BEFORE implementing sp_finalize_invoice

EXPLAIN ANALYZE is required for the revenue report query. File result in docs/09.

Current task: [TASK_ID]
```

---

## Quick Reference: M5 Owned Files

```
app/guest/reservations/[id]/pay/      app/api/guest/payments/
app/api/guest/reservations/[id]/invoice/
app/api/staff/reservations/[id]/checkout/
app/staff/reports/                    services/billing.service.ts
services/payment.service.ts           repositories/billing.repository.ts
repositories/payment.repository.ts
database/migrations/P04-M05-*/        database/migrations/P05-M05-*/
database/routines/billing/            database/routines/payments/
database/routines/checkout/           database/views/vw_invoice_totals.sql
database/views/vw_monthly_revenue.sql database/views/vw_guest_billing_summary.sql
database/views/vw_room_occupancy.sql  database/views/vw_audit_log.sql
components/PaymentConfirmation.tsx
(provides views to M2 for occupancy UI)
```

## Subphase Quick Reference
| Subphase | Type | Tasks | Start When |
|---|---|---|---|
| SP4.5 Billing Schema | 🔴 | P04-M05-T01–T02 | After SP3.1 executed (parallel with M4 SP4.1) |
| SP4.6 Invoice DB | 🔴 | P04-M05-T03–T04 | After SP4.5 + M4 T06/T07 DONE |
| SP4.7 Billing API | 🟡 | P04-M05-T05–T07 | **Day 1 — mock-first** |
| SP5.1 Payment Schema | 🔴 | P05-M05-T01 | After SP4.5 executed |
| SP5.2 Payment DB | 🔴 | P05-M05-T02–T03 | After SP5.1 |
| SP5.3 Report Views | 🔴 | P05-M05-T04–T07 | After all tables exist |
| SP5.4 Payment API | 🟡 | P05-M05-T08–T11 | **Day 1 — mock-first** |
| SP5.5 Reports API | 🟡 | P05-M05-T12–T13 | **Day 1 — mock-first** |
| SP5.6 Payment UI | 🟡+🟢 | P05-M05-T14–T15 | **Day 1 — mock-first** |
| SP5.7 Reports UI | 🟡 | P05-M05-T16–T18 | **Day 1 — mock-first** |

## Branch Naming
`feat/P05-M05-T{number}-{short-description}`
