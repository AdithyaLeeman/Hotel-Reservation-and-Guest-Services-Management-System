# context/04 — Code Standards

## TypeScript

- Strict mode enabled (`tsconfig.json`)
- No `any` type — use `unknown` and narrow explicitly
- Explicit return types on all exported functions
- Interfaces for data shapes; types for unions and aliases
- `PascalCase`: types, interfaces, React components
- `camelCase`: variables, functions, parameters
- `SCREAMING_SNAKE_CASE`: module-level constants
- `snake_case`: database column names (never used in TypeScript — map via repository layer)

## Next.js (App Router Conventions)

- Read `node_modules/next/dist/docs/` before writing any Next.js code
- Route handlers live in `app/api/**/route.ts`
- Export named functions: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Server Components by default; mark `'use client'` only when needed
- Never fetch directly from a database in a page — go through the service layer
- Use `NextRequest` and `NextResponse` for route handlers

## Input Validation

- All Route Handler inputs validated with Zod before any DB call
- Zod schemas live in `lib/validation/` (shared) or co-located with the route
- Return `400` with field-level errors for Zod failures
- Never trust client-supplied `guest_id`, `role`, or `branch_id` for authorization

## Error Handling

- All route handlers wrap logic in try/catch
- Map PostgreSQL SQLSTATE codes to HTTP status codes in the service layer
- Never expose raw SQL error messages to the client
- Log internally with structured context (requestId, userId, route, error)

## SQL / PostgreSQL Conventions

- `snake_case` for all DB identifiers (tables, columns, functions, triggers, views, indexes)
- `UPPER CASE` for SQL keywords
- `NUMERIC(12,2)` for all money columns — never `FLOAT` or `DOUBLE`
- Parameterized queries only: `pool.query('SELECT ... WHERE id = $1', [id])`
- Never build SQL with string concatenation
- Prefix conventions:
  - `fn_` — stored functions (return a value)
  - `sp_` — stored procedures (perform actions, may return via `INOUT`)
  - `trg_` — trigger functions and triggers
  - `vw_` — views
  - `idx_` — indexes
- Table-qualify all columns in multi-table queries
- Comment every stored function/procedure with: purpose, inputs, outputs, tables, transaction ownership, SQLSTATE codes

## Money Handling

- Use `NUMERIC(12,2)` in PostgreSQL
- Receive as string from `pg`, convert with `parseFloat()` or keep as string for display
- Never use JavaScript `*` or `+` for authoritative financial calculations
- All authoritative totals come from PostgreSQL functions/views

## Date and Time

- `DATE` type for check-in and check-out dates
- `TIMESTAMP WITH TIME ZONE` for event timestamps (created_at, usage_date, payment_date)
- Application timezone: Asia/Colombo (+05:30) — store in UTC, display in local time
- Never compute number-of-nights in TypeScript — use PostgreSQL date arithmetic

## Testing Conventions

- Database tests: plain SQL test scripts in `database/tests/`
- API integration tests: to be set up with Vitest or Jest (see `docs/20_approved-libraries-and-patterns.md`)
- Test files co-located with source when unit tests, or in `tests/` for integration
- Naming: `*.test.ts`, `*.spec.ts`
- Each task must include tests for: happy path, error path, authorization boundary, and rollback where applicable

## Migration Conventions

- Filename: `P{phase}-M{member}-T{task}-{nn}_{description}.sql`
- Example: `P03-M03-T01-01_create_reservation.sql`
- Append-only — never modify an already-merged migration
- Every migration must be tracked in `database/migrations/manifest.md`
- Migrations must apply cleanly to an empty PostgreSQL database in manifest order

## Linting

- `npm run lint` must pass before any task moves to `REVIEW`
- ESLint config at `eslint.config.mjs` — do not relax rules without team agreement
