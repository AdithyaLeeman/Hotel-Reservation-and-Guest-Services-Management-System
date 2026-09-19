# docs/11 — Security and RBAC

## Role Definitions (ERD `user_role` enum)

| Role | Description | Created By |
|---|---|---|
| `Guest` | Registered hotel guest | Self-registration |
| `Receptionist` | Front-desk staff (branch-scoped) | Admin |
| `Manager` | Hotel manager (all branches) | Admin |
| `Admin` | System administrator | System seed |

## RBAC Matrix

| Resource / Action | Public | Guest | Receptionist | Manager | Admin |
|---|---|---|---|---|---|
| View hotel info | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search availability | ✅ | ✅ | ✅ | ✅ | ✅ |
| Guest self-register | ✅ | — | — | — | — |
| Guest login/logout | ✅ | ✅ | — | — | — |
| Staff login/logout | — | — | ✅ | ✅ | ✅ |
| Create own reservation | ❌ | ✅ | — | — | — |
| View own reservations | ❌ | ✅ | — | — | — |
| View own bill | ❌ | ✅ | — | — | — |
| Make own payment | ❌ | ✅ | — | — | — |
| Create reservation (staff) | ❌ | ❌ | ✅ (own branch) | ✅ | ✅ |
| View all reservations | ❌ | ❌ | ✅ (own branch) | ✅ | ✅ |
| Check-in guest | ❌ | ❌ | ✅ (own branch) | ✅ | ✅ |
| Log service usage | ❌ | ❌ | ✅ (own branch) | ✅ | ✅ |
| Process payment (staff) | ❌ | ❌ | ✅ (own branch) | ✅ | ✅ |
| Check-out guest | ❌ | ❌ | ✅ (own branch) | ✅ | ✅ |
| Cancel reservation | ❌ | ✅ (own, Booked only) | ✅ (own branch) | ✅ | ✅ |
| View room list | ❌ | ❌ | ✅ (own branch) | ✅ | ✅ |
| Set room Maintenance | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage rooms (CRUD) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage service catalogue | ❌ | ❌ | ❌ | ✅ | ✅ |
| View reports | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage employees | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create staff accounts | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage branches | ❌ | ❌ | ❌ | ❌ | ✅ |

## Branch Scope Rules

| Role | Branch Scope | Enforcement |
|---|---|---|
| Guest | None (owns reservations by guest_id) | session.guestId in all predicates |
| Receptionist | Own branch only | session.branchId filter in all staff queries |
| Manager | All branches | No branch filter; branchId in session may be null |
| Admin | All branches | No branch filter |

**Enforcement:** Branch scope enforced at the DB query predicate level, not only in UI navigation. A Receptionist must not be able to query data for another branch even via a crafted API call.

## Authentication Design

- One `user_account` table for all roles
- Separate login endpoints: `/api/guest/login`, `/api/staff/login`
- Staff login endpoint checks `role NOT IN ('Guest')` — guests cannot login via staff endpoint
- Sessions: iron-session (AES-256-CBC encrypted, HTTP-only cookies, `Secure` in production)
- Session stores: `{ userId, role, guestId?, employeeId?, branchId? }` (see `docs/21_shared-contracts.md`)
- Never trust client-supplied role or ID for authorization

## Password Rules
- Minimum 8 characters (validate with Zod on registration/change)
- bcrypt hash with cost factor ≥ 12
- Hash stored in `user_account.password_hash`
- Never log or return the password hash

## Common Attack Mitigations

| Attack | Mitigation |
|---|---|
| SQL Injection | Parameterized SQL only (`pg` with `$1, $2` placeholders); never string concatenation |
| XSS | React auto-escapes output; no `dangerouslySetInnerHTML` without sanitization |
| CSRF | iron-session uses encrypted signed cookies; SameSite=Lax |
| Broken Object Access | Guest ownership enforced at DB predicate; session guestId only |
| Privilege Escalation | Role read from session (server-side), never from request body/query |
| Insecure Direct Object Reference | Branch scope enforced at query level; UUIDs not guessable |

## Security Testing Requirements (P06)

- SQL injection: attempt `'; DROP TABLE reservation; --` in reservation ID field
- Auth bypass: attempt to access `/staff/*` without staff session → expect 401
- IDOR: Guest A attempting to view Guest B's reservation by ID → expect 403
- Role escalation: Receptionist attempting to access `/staff/admin` → expect 403
- Branch scope violation: Receptionist attempting to query another branch's rooms → expect 403
