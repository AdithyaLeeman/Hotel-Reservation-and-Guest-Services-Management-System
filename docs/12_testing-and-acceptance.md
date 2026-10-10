# docs/12 — Testing and Acceptance

## Testing Layers

| Layer | Where | What |
|---|---|---|
| DB schema tests | `database/tests/` — SQL scripts | Constraints, FDs, enums, FK violations |
| DB function/procedure tests | `database/tests/` — SQL scripts | Happy paths, error paths, edge cases, SQLSTATE |
| API integration tests | `tests/` — Vitest | Route handler behavior, auth enforcement, error codes |
| Concurrency tests | `tests/` — parallel requests | Double-booking prevention |
| Security tests | `tests/` | SQL injection, auth bypass, IDOR, role escalation |
| E2E tests | Manual (Phase 6) | Full workflow verification |

## Mandatory Tests (Definition of Done requirement)

### Per Task (Minimum)
- [ ] Happy path: valid input → expected DB state + HTTP response
- [ ] Error path: invalid input → Zod error → 400 with field errors
- [ ] Auth path: unauthenticated → 401; wrong role → 403

### Financial Tests (M4, M5)
- [ ] `fn_calc_room_charges()` returns correct total for known seed data
- [ ] `fn_calc_service_charges()` returns correct total
- [ ] `vw_invoice_totals.outstanding_balance` matches expected in Scenario 3 (docs/10)
- [ ] TypeScript backend does NOT compute any of these values independently

### Concurrency Test (P03-M03-T12 — REQUIRED)
```
1. Begin two concurrent requests to create a reservation for room_id=1, same dates
2. Both hit the route handler simultaneously
3. Exactly one must succeed (201) and one must fail (409)
4. Database must have exactly ONE reservation for that room+dates
5. Document which technique (SELECT FOR UPDATE) prevented the race
```

### Transaction Rollback Test (P06-ALL-T08 — REQUIRED)
```
1. Start sp_create_reservation()
2. Inject a failure after the reservation INSERT but before reservation_rooms INSERT
3. Verify: no orphaned reservation record in DB
4. Verify: ROLLBACK was triggered
```

### Security Tests (P06-ALL-T06 — REQUIRED)
```
SQL Injection:
1. Send reservation_id = "'; DROP TABLE reservation; --" in API path
2. Expect: 404 or 400 — never a 500 from SQL execution of injected code
3. Verify: parameterized queries prevent execution

Auth Bypass:
1. Access /api/staff/reports without session → expect 401
2. Access with Guest role → expect 403
3. Access with Receptionist role (branch 1) and query branch 2 data → expect 403

IDOR:
1. Authenticated as Guest A; try GET /api/guest/reservations/[Guest_B_reservation_id]
2. Expect: 403 (not 200 or 404)
```

### Ownership Enforcement Test (P03-M03-T11 — REQUIRED)
- Guest A cannot view, modify, or pay against Guest B's reservation
- Verified at DB query level (session.guestId in predicate)

### Checkout Guard Test
- Outstanding balance > 0 → sp_checkout() raises exception → HTTP 409
- After full payment → sp_checkout() succeeds → HTTP 200

## Test Data
Use the seed data from `docs/10_seed-data-and-expected-results.md` (Scenario 1–5).

## Definition of Done (Per Task)
1. Happy/error/auth tests pass
2. `npm run lint` passes
3. DB rebuilds clean from empty + seed
4. Code reviewed (PR)
5. Docs updated
6. Status in `docs/14` updated to `DONE`

## Acceptance Criteria for Phase 6 Integration
- All 5 E2E workflows execute without error against a clean seeded database
- Concurrent booking test passes with exactly one winner
- Outstanding balance = 0 check enforced at checkout
- All 5 reports return data consistent with Scenario 3 seed data
- EXPLAIN ANALYZE captured for availability query and revenue report
