# Review - All REVIEW-Status Tasks - 2026-10-02

**Reviewed by**: independent senior pass (inline)
**Scope**: 24 files - Phase 3 (M3, P03-M03-T01 to T24) + Phase 5 partial (P05-M02-T01, P05-M03-T01, P05-M03-T02)
**Verdict**: Changes requested

---

## Summary

The Phase 3 reservation system and Phase 5 partial tasks are well-structured and correct in the
areas that matter most: DB-first financial computation (AGENTS.md §5), parameterized SQL (§8),
RBAC and branch scoping (§10), and API response contracts (§9) are all honored.
The concurrency model in `sp_create_reservation` (SELECT FOR UPDATE) is correct and the
mock-first pattern is consistent throughout. Two issues require changes before tasks can close.
All 632 tests pass across 52 suites.

---

## Major

### MAJOR-01 · Contradictory transaction-ownership comment, `database/routines/reservations/sp_create_reservation.sql:39-41`

**Problem**: The header comment says "This procedure owns its transaction. Caller must NOT wrap
in an outer BEGIN/COMMIT." The procedure body has no COMMIT call. In PostgreSQL, a PL/pgSQL
procedure without COMMIT runs entirely inside the caller's transaction. The comment is wrong.
Contrast with `sp_cancel_reservation.sql:26-27` which correctly says "Caller must wrap in
BEGIN/COMMIT if needed. This procedure does NOT issue COMMIT/ROLLBACK." - the same pattern,
opposite (correct) documentation.

**Why it matters**: A Phase 6 developer following the comment verbatim may omit a transaction
wrapper when combining this call with surrounding operations, producing partial commits. The
real-DB repository path (commented out at line 248) uses pool.query directly without BEGIN/COMMIT,
which works only because autocommit applies to the single CALL statement - but the comment
misdirects future developers about the reason.

**Fix**: Replace lines 39-41 with:
```sql
-- TRANSACTION: This procedure does NOT issue COMMIT/ROLLBACK.
--   Single-call pattern: pool.query() (autocommit applies to the CALL).
--   Multi-op pattern: wrap in BEGIN/COMMIT via pool.connect().
--   Never issue COMMIT inside this procedure - SELECT FOR UPDATE holds the
--   lock until the caller's transaction ends.
```

---

## Minor

### MINOR-01 · Rate double-fetch creates a READ COMMITTED phantom window, `sp_create_reservation.sql:158-168`

**Problem**: `v_rate_per_night` is fetched in the validation FOREACH loop (Step 1, line 82)
then discarded, and re-fetched in a second FOREACH loop at Step 3 (line 162). Under PostgreSQL
READ COMMITTED (the default), a concurrent admin UPDATE to `room_type.daily_rate` between the
two loops produces a different rate in `reservation_rooms.rate_per_night` than what was
validated. The redundant SELECT is also a performance cost on every room in the reservation.

**Fix**: Accumulate `(room_id, rate)` pairs in an array or temp variable during the validation
loop and iterate that in Step 3 - eliminate the second SELECT entirely.

### MINOR-02 · No `NODE_ENV` production guard on dev session in P3 guest routes

**Problem**: `app/api/guest/reservations/route.ts` and `app/api/guest/reservations/[id]/route.ts`
return the hardcoded mock session from `getDevSession()` in all environments, with no
`process.env.NODE_ENV !== 'production'` guard. If deployed before Phase 6 wire-up, every
unauthenticated request is served as `guest-mock-001`, exposing their reservations to any caller.
The P5 routes (`top-services`, `occupancy`) correctly use the `NODE_ENV !== 'production'` guard.

**Fix**: Add `if (process.env.NODE_ENV !== 'production') { return getDevSession(); } return {};`
around the fallback in both files. Three files (route.ts, [id]/route.ts, staff/reservations/route.ts).

### MINOR-03 · `DO`-block type creation swallows schema changes, `fn_get_reservation_detail.sql:1-15`

**Problem**: `reservation_detail_row` is created via `DO $$ ... EXCEPTION WHEN duplicate_object
THEN NULL; END $$`. Re-running the file when the type definition changes silently does nothing -
the old type remains. Functions depending on it then fail or use the stale definition.

**Fix**: Use `DROP TYPE IF EXISTS reservation_detail_row CASCADE` before `CREATE TYPE` in the
migration, or document explicitly in the file header that type changes require a dedicated DROP migration.

---

## Nits

- `sp_create_reservation.sql:158` comment acknowledges the redundant re-fetch but does not fix it. Either fix it or add a TODO with the risk noted.
- `vw_top_services.sql`: `RANK()` produces gaps for ties (1, 1, 3). `DENSE_RANK()` may be more intuitive for a "Top N services" UI. Author's call.
- `test_concurrency.sql:22`: sequential-only nature is already noted. Add a one-line acceptance criterion in the task tracker clarifying this limitation so future reviewers don't mark it incomplete.
- `app/api/staff/reservations/route.ts` (staff POST): `guest_id` in request body has UUID format validation only - no existence check in the mock path. The real DB FK constraint will enforce existence. Low risk; note for Phase 6.

---

## Strengths

- `sp_create_reservation` correctly scopes `SELECT FOR UPDATE OF rr` to `reservation_rooms`, the right locking target.
- `sp_cancel_reservation` and `fn_get_reservation_detail` both use the same-error pattern for ownership-mismatch vs not-found, preventing guest-ID enumeration.
- `fn_get_reservation_detail` uses `INTO STRICT` + `NO_DATA_FOUND` - correct and clean.
- `vw_active_reservations` defers branch scoping to the query layer with an explicit explanatory comment.
- Mock-first pattern is consistent and makes Phase 6 wire-up straightforward: real DB SQL is commented-in, not missing.
- `app/api/staff/reports/top-services/route.ts` uses `resolveSession()` + `getSession()` + `NODE_ENV` guard correctly.
- Occupancy page test (287 lines) covers KPI cards, filters, table, sorting, empty state, error handling.
- Zero financial arithmetic in TypeScript across all 24 reviewed files.

---

## Per-task verdict

| Task | File | Verdict | Note |
|---|---|---|---|
| P03-M03-T01 | reservation DDL | ✅ DONE | Schema and constraints correct |
| P03-M03-T02 | reservation_rooms DDL | ✅ DONE | rate_per_night snapshot correct |
| P03-M03-T03 | sp_create_reservation | ⚠️ REVIEW | Fix MAJOR-01 + MINOR-01 |
| P03-M03-T04 | fn_get_reservation_detail | ⚠️ REVIEW | Fix MINOR-03 |
| P03-M03-T05 | sp_cancel_reservation | ✅ DONE | |
| P03-M03-T06 | vw_active_reservations | ✅ DONE | |
| P03-M03-T07 | reservation.repository (create) | ✅ DONE | |
| P03-M03-T08 | reservation.repository (list + detail) | ✅ DONE | |
| P03-M03-T09 | reservation.repository (cancel) | ✅ DONE | BEGIN/COMMIT wrapper in real DB path |
| P03-M03-T10 | reservation.service | ✅ DONE | |
| P03-M03-T11 | GET /api/guest/reservations | ⚠️ REVIEW | Fix MINOR-02 |
| P03-M03-T12 | POST /api/guest/reservations | ⚠️ REVIEW | Fix MINOR-02 |
| P03-M03-T13 | GET+DELETE /api/guest/reservations/[id] | ⚠️ REVIEW | Fix MINOR-02 |
| P03-M03-T14 | guest/reservations/new/page.tsx | ✅ DONE | |
| P03-M03-T15 | guest/book/confirm/page.tsx | ✅ DONE | |
| P03-M03-T16 | guest/reservations/page.tsx | ✅ DONE | |
| P03-M03-T17 | guest/reservations/[id]/page.tsx | ✅ DONE | |
| P03-M03-T18 | GET /api/staff/reservations | ✅ DONE | Branch scoping correct |
| P03-M03-T19 | POST /api/staff/reservations | ✅ DONE | employee_id from session |
| P03-M03-T20 | PATCH …/cancel | ✅ DONE | Branch check before cancel |
| P03-M03-T21 | staff/reservations/page.tsx | ✅ DONE | |
| P03-M03-T22 | staff/reservations/[id]/page.tsx | ✅ DONE | Receptionist branch scope correct |
| P03-M03-T23 | test_ownership.sql | ✅ DONE | 5 tests, skip-on-no-seed correct |
| P03-M03-T24 | test_concurrency.sql | ✅ DONE | Sequential-only noted in file |
| P05-M03-T01 | vw_top_services | ✅ DONE | Correct aggregation |
| P05-M03-T02 | /api/staff/reports/top-services | ✅ DONE | resolveSession + RBAC correct |
| P05-M02-T01 | occupancy page + test | ✅ DONE | 287-line test thorough |

---

## Required actions before marking remaining tasks DONE

Tasks that must stay in REVIEW:

1. **P03-M03-T03** - fix MAJOR-01 (transaction comment) and MINOR-01 (rate double-fetch) in `sp_create_reservation.sql`
2. **P03-M03-T04** - fix MINOR-03 (DO-block type handling) in `fn_get_reservation_detail.sql`
3. **P03-M03-T11, T12, T13** - add `NODE_ENV !== 'production'` guard per MINOR-02 in the three guest route files

Tasks approved to close: T01, T02, T05, T06, T07, T08, T09, T10, T14-T22, T23, T24, P05-M03-T01, P05-M03-T02, P05-M02-T01 (19 tasks → DONE)

---

## Test coverage

Test signal: configured (vitest, 632 tests, 52 suites - all passing).

Application mock logic is thoroughly covered. DB-level scripts (`test_ownership.sql`,
`test_concurrency.sql`) are manual scripts for real-DB execution - correct for the
academic context. Occupancy page component test is thorough. The rate phantom-read
window in MINOR-01 is not covered by any current test (mock does not simulate concurrent
rate changes) and will need a real-DB integration test or a code review note during
Phase 6 wire-up.
