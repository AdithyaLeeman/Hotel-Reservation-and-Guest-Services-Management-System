# Phase 6 — Integration, Testing, and Deployment Prep

## Coordinator: Member 1 (M1)
## Dependency: All P1–P5 tasks in REVIEW or DONE

## Goal
Wire all mock-first code to the real database, verify every E2E flow, run all security and concurrency tests, capture performance data, and finalize documentation for the lecturer demo.

## Subphases

### SP6.1 — Mock→Real DB Wire-up _(all members, after their DB tables are executed)_
Each member replaces all mock return values in their repository files with real parameterized SQL.

| Task | Member | Title | Status |
|---|---|---|---|
| P06-M01-T01 | M1 | Wire auth repositories to real DB; verify session round-trip | TODO |
| P06-M02-T01 | M2 | Wire room + availability repositories to real DB | TODO |
| P06-M03-T01 | M3 | Wire reservation repository to real DB | TODO |
| P06-M04-T01 | M4 | Wire service-usage + checkin to real DB | TODO |
| P06-M05-T01 | M5 | Wire billing + payment to real DB | TODO |
| P06-M01-T02 | M1 | Clean DB rebuild from empty + full seed verify (`npm run migrate && npm run seed`) | TODO |

---

### SP6.2 — E2E Flow Verification _(all members verify their slice on real DB)_

| Task | Member | Title | Status |
|---|---|---|---|
| P06-M01-T03 | M1 | Guest register → login → browse → logout flow verified | TODO |
| P06-M02-T02 | M2 | Availability search returns correct rooms for Scenarios 1+2 (docs/10) | TODO |
| P06-M03-T02 | M3 | Full guest booking flow: search → book → confirm → view detail | TODO |
| P06-M04-T02 | M4 | Check-in + service usage logging flow E2E | TODO |
| P06-M05-T02 | M5 | Invoice → payment → checkout flow E2E | TODO |

---

### SP6.3 — Security and Concurrency Tests _(M1 + M3 + M5)_

| Task | Member | Title | Status |
|---|---|---|---|
| P06-M01-T04 | M1 | SQL injection tests (every query is parameterized, no string concat) | TODO |
| P06-M01-T05 | M1 | Auth bypass tests (forge session cookie, role escalation attempt) | TODO |
| P06-M03-T03 | M3 | Concurrent double-booking test: two simultaneous requests, same room + dates | TODO |
| P06-M03-T04 | M3 | Cross-guest ownership test: guest A requests guest B's reservation → 403 | TODO |
| P06-M05-T03 | M5 | Transaction rollback tests: simulate failures mid-procedure, verify no partial state | TODO |

---

### SP6.4 — Performance _(M2 + M5)_

| Task | Member | Title | Status |
|---|---|---|---|
| P06-M02-T03 | M2 | EXPLAIN ANALYZE for availability query before/after index | TODO |
| P06-M05-T04 | M5 | EXPLAIN ANALYZE for monthly revenue report query | TODO |

Results filed in `docs/09_database-routines-triggers-views-indexes.md`.

---

### SP6.5 — Final Polish _(M1 coordinates, all members contribute)_

| Task | Member | Title | Status |
|---|---|---|---|
| P06-M01-T06 | M1 | README update (local setup steps, demo credentials, academic concept index) | TODO |
| P06-M01-T07 | M1 | Demo scenario script (step-by-step walkthrough for lecturer demo) | TODO |
| P06-M01-T08 | M1 | Final context/08 + docs/14 progress tracker update to all DONE | TODO |

## Completion Criteria
- All 5 E2E flows pass end-to-end on real PostgreSQL DB
- All security tests pass with no injection vulnerabilities
- Concurrent booking test: exactly one success, one 409
- Both EXPLAIN ANALYZE results filed with analysis notes
- Clean DB rebuild succeeds from empty database using `npm run migrate && npm run seed`
- Final README includes: setup, environment variables, demo credentials, academic concept list (L01–L14 mapped to features)
