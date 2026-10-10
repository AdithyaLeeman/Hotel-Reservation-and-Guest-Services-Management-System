# Verify: SP1.3 Auth Route Handlers · updated 2026-09-24

_Steps derived from SP1.3 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

---

## Commands

- [ ] `npm test` → all 220+ tests pass (pre-existing test suite)  → AC-baseline

## UI / Manual (via `curl` or API client against `npm run dev`)

### POST /api/guest/register — T14

- [ ] Valid body `{ username, password, email, full_name }` → 201, response has `data.guestId` and no `password_hash` field → AC-T14-1
- [ ] Missing `email` → 400, response has `error.fields.email` → AC-T14-2
- [ ] `password` shorter than 8 chars → 400 → AC-T14-2
- [ ] `username` with a space → 400 → AC-T14-2
- [ ] Duplicate `username` (register same username twice) → 409, code `CONFLICT` → AC-T14-3
- [ ] After successful register, `GET /guest/reservations` (protected) works without re-login → session was written → AC-T14-4

### POST /api/guest/login — T15

- [ ] Correct credentials for a Guest account → 200, response has `data.role = 'Guest'` and `data.guestId` → AC-T15-1
- [ ] Wrong password → 401, code `NOT_AUTHENTICATED` → AC-T15-2
- [ ] Unknown username → 401, code `NOT_AUTHENTICATED` (same error — no enumeration) → AC-T15-2
- [ ] Staff username + staff password at this endpoint → 401 (Guest endpoint rejects non-Guest role) → AC-T15-3
- [ ] Empty `username` → 400 → AC-T15-4

### POST /api/guest/logout — T16

- [ ] Logged-in guest calls POST /api/guest/logout → 200, `data.loggedOut = true` → AC-T16-1
- [ ] Subsequent `GET /guest/reservations` → redirected to `/guest/login` (session destroyed) → AC-T16-2
- [ ] Call logout when not logged in (no session) → 200 (idempotent, no error) → AC-T16-3

### POST /api/staff/login — T17

- [ ] Correct credentials for Receptionist → 200, `data.role = 'Receptionist'`, `data.branchId` is a number → AC-T17-1
- [ ] Correct credentials for Manager → 200, `data.role = 'Manager'`, `data.branchId` is undefined → AC-T17-2
- [ ] Guest username at /api/staff/login → 401 (Staff endpoint rejects Guest role) → AC-T17-3
- [ ] Wrong password → 401 → AC-T17-4

### POST /api/staff/logout — T18

- [ ] Logged-in staff calls POST /api/staff/logout → 200, `data.loggedOut = true` → AC-T18-1
- [ ] Subsequent `GET /staff/dashboard` → redirected to `/staff/login` → AC-T18-2

### Middleware — T20

- [ ] Unauthenticated `GET /guest/reservations` → 307 redirect to `/guest/login` → AC-T20-1
- [ ] Unauthenticated `GET /staff/dashboard` → 307 redirect to `/staff/login` → AC-T20-2
- [ ] Guest session `GET /staff/dashboard` → 307 redirect to `/staff/login` (wrong role) → AC-T20-3
- [ ] Receptionist session `GET /staff/reports/monthly` → 307 redirect to `/staff/login` (insufficient role) → AC-T20-4
- [ ] Manager session `GET /staff/reports/monthly` → passes through (200) → AC-T20-5
- [ ] `GET /search` unauthenticated → passes through (public) → AC-T20-6
- [ ] `POST /api/guest/register` unauthenticated → not intercepted by middleware (API excluded from matcher) → AC-T20-7

---

## Acceptance-criteria coverage

- AC-T14-1 … register returns 201 + guestId, no password_hash · covered by register step 1
- AC-T14-2 … 400 on bad input · covered by register steps 2–4
- AC-T14-3 … 409 on duplicate · covered by register step 5
- AC-T14-4 … session written on register · covered by register step 6
- AC-T15-1 … 200 + session on correct guest creds · covered by login step 1
- AC-T15-2 … 401 on wrong creds (no enumeration) · covered by login steps 2–3
- AC-T15-3 … Guest-only endpoint · covered by login step 4
- AC-T15-4 … 400 on empty input · covered by login step 5
- AC-T16-1 … 200 on logout · covered by logout step 1
- AC-T16-2 … session destroyed · covered by logout step 2
- AC-T16-3 … idempotent · covered by logout step 3
- AC-T17-1 … Receptionist session with branchId · covered by staff login step 1
- AC-T17-2 … Manager session without branchId · covered by staff login step 2
- AC-T17-3 … Guest rejected at staff endpoint · covered by staff login step 3
- AC-T17-4 … wrong creds 401 · covered by staff login step 4
- AC-T18-1,2 … staff logout destroys session · covered by staff logout steps 1–2
- AC-T20-1,2 … unauthenticated redirect · covered by middleware steps 1–2
- AC-T20-3 … wrong role for guest/staff crossing · covered by middleware step 3
- AC-T20-4,5 … Manager vs Receptionist on reports · covered by middleware steps 4–5
- AC-T20-6 … public paths pass through · covered by middleware step 6
- AC-T20-7 … API routes bypass middleware · covered by middleware step 7
