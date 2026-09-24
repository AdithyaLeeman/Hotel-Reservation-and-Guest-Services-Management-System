# docs/04 — Architecture (Detailed)

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser                                │
│  Guest Portal (/guest/*)        Staff Portal (/staff/*)         │
└───────────────────────┬─────────────────────────────┬───────────┘
                        │ HTTPS                        │ HTTPS
┌───────────────────────▼─────────────────────────────▼───────────┐
│                    Next.js 16 App Router                        │
│                                                                 │
│  app/                    Route Handlers (app/api/**/route.ts)   │
│  ├── page.tsx             1. Parse request (Next.js)            │
│  ├── search/              2. Validate shape (Zod)               │
│  ├── guest/               3. Authenticate (iron-session)        │
│  │   ├── register/        4. Authorize (role + branch scope)    │
│  │   ├── login/           5. Call Service layer                 │
│  │   └── reservations/    6. Translate errors → HTTP response   │
│  └── staff/                                                     │
│      ├── login/         Services (services/*.service.ts)        │
│      ├── dashboard/      Orchestrate: validate → DB call        │
│      ├── reservations/                                          │
│      ├── rooms/          Repositories (repositories/*.ts)       │
│      ├── reports/         Parameterized SQL → pg Pool           │
│      └── admin/                                                 │
└───────────────────────────────────┬─────────────────────────────┘
                                    │ TCP (node-postgres)
┌───────────────────────────────────▼─────────────────────────────┐
│                        PostgreSQL 15+                           │
│                                                                 │
│  Tables: user_account, guest, employee, branch, room_type,      │
│          amenity, room_type_amenity, room, reservation,          │
│          reservation_rooms, service_catalogue, service_usage,   │
│          tax_policies, billing_summary, payment                 │
│                                                                 │
│  Functions: fn_get_available_rooms(), fn_calc_room_charges(),   │
│             fn_calc_service_charges()                           │
│                                                                 │
│  Procedures: sp_create_reservation(), sp_check_in(),            │
│              sp_log_service_usage(), sp_finalize_invoice(),      │
│              sp_post_payment(), sp_checkout()                   │
│                                                                 │
│  Views: vw_invoice_totals, vw_monthly_revenue,                  │
│         vw_room_occupancy, vw_guest_billing_summary,            │
│         vw_service_usage_breakdown                              │
│                                                                 │
│  Triggers: trg_audit_reservation_status (+ others TBD)         │
│  Indexes: idx_reservation_rooms_room_dates, + others            │
└─────────────────────────────────────────────────────────────────┘
```

## Layered Responsibilities

### Route Handler Layer (`app/api/**/route.ts`)
- Export named HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Parse `NextRequest`, validate body/query with Zod
- Read session from iron-session; enforce role and branch scope
- Call exactly one service function
- Return `NextResponse.json()` with standard success/error shape
- Catch errors; map SQLSTATE to HTTP status codes
- **Never:** touch a db pool directly; compute financial values; contain business logic

### Service Layer (`services/*.service.ts`)
- Orchestrate multi-step operations using `withTransaction()` helper
- Call repository methods with typed parameters
- Handle error types; re-throw as domain errors
- **Never:** directly use `pool.query()`; access session; format HTTP responses

### Repository Layer (`repositories/*.repository.ts`)
- Execute parameterized SQL statements using `pg.PoolClient` or `pool.query()`
- Map result rows to TypeScript types
- Call stored functions/procedures via `CALL sp_name($1, $2)` or `SELECT fn_name($1)`
- **Never:** contain business logic; format HTTP responses; access session

### Database Layer (PostgreSQL)
- All authoritative calculations (see `docs/08_business-rules-and-enforcement.md`)
- Enforce all constraints at the DB level
- Stored procedures handle atomic multi-step workflows
- Views provide derived data without recomputation in TypeScript

## File and Folder Structure

```
.
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Public home page
│   ├── layout.tsx                # Root layout (fonts, globals)
│   ├── globals.css               # Design tokens
│   ├── search/                   # Public availability search
│   ├── guest/
│   │   ├── login/
│   │   ├── register/
│   │   └── reservations/
│   │       └── [id]/
│   ├── staff/
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── reservations/
│   │   ├── rooms/
│   │   ├── reports/
│   │   └── admin/
│   └── api/
│       ├── guest/
│       │   ├── register/route.ts
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   └── reservations/route.ts, [id]/route.ts
│       ├── staff/
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   ├── reservations/route.ts, [id]/route.ts
│       │   ├── rooms/route.ts, [id]/route.ts
│       │   ├── checkin/route.ts
│       │   ├── checkout/route.ts
│       │   ├── services/route.ts
│       │   └── reports/*.ts
│       └── availability/route.ts
├── components/                   # Shared UI components
│   ├── GuestNav.tsx
│   ├── StaffNav.tsx
│   └── ui/                       # Low-level components
├── lib/
│   ├── db/
│   │   ├── pool.ts               # pg Pool singleton
│   │   └── transaction.ts        # withTransaction() helper
│   ├── auth/
│   │   ├── session.ts            # iron-session helpers
│   │   └── password.ts           # bcrypt helpers
│   └── validation/               # Shared Zod schemas
│       ├── reservation.schema.ts
│       └── guest.schema.ts
├── services/
│   ├── auth.service.ts
│   ├── availability.service.ts
│   ├── reservation.service.ts
│   ├── room.service.ts
│   ├── checkin.service.ts
│   ├── service-usage.service.ts
│   ├── billing.service.ts
│   └── payment.service.ts
├── repositories/
│   ├── user.repository.ts
│   ├── guest.repository.ts
│   ├── employee.repository.ts
│   ├── room.repository.ts
│   ├── availability.repository.ts
│   ├── reservation.repository.ts
│   ├── service-usage.repository.ts
│   ├── billing.repository.ts
│   └── payment.repository.ts
├── types/
│   ├── session.ts                # SessionData interface
│   ├── enums.ts                  # TypeScript mirrors of DB enums
│   ├── api.ts                    # API response types
│   └── domain/                   # Domain model types
├── database/
│   ├── migrations/               # Append-only SQL migration files
│   │   └── manifest.md
│   ├── routines/                 # Functions and procedures
│   ├── triggers/                 # Trigger definitions
│   ├── views/                    # View definitions
│   ├── indexes/                  # Index definitions
│   ├── seeds/                    # Seed data
│   └── tests/                    # DB-level SQL tests
├── context/                      # 8-file working context
├── docs/                         # Project documentation
├── project-sources/              # Read-only source evidence
├── .agent/                       # Project management state
└── ...config files
```

## Authentication Flow

```
Guest Registration:
Browser → POST /api/guest/register → Zod validate → hash password (bcrypt)
         → INSERT user_account + guest → return 201

Guest Login:
Browser → POST /api/guest/login → Zod validate → lookup user_account
         → verify password (bcrypt) → create iron-session {userId, role, guestId}
         → return 200

Staff Login:
Browser → POST /api/staff/login → check role NOT 'Guest'
         → lookup employee → create iron-session {userId, role, employeeId, branchId}
         → return 200

Protected Route:
Browser → GET /api/guest/reservations
         → getSession() → check session.role === 'Guest'
         → SELECT * FROM reservation WHERE guest_id = session.guestId
```

## Error Handling Flow

```
Route Handler:
try {
  const result = await someService.doSomething(input);
  return NextResponse.json({ data: result, meta: { requestId } });
} catch (err) {
  if (isZodError(err))  return 400 with field errors;
  if (isSQLState(err, '23505')) return 409 (unique violation);
  if (isSQLState(err, '45001')) return 409 (business rule violation);
  log error internally;
  return 500 (never expose SQL error to client);
}
```
