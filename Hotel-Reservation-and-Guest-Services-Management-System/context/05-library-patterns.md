# context/05 — Library Patterns

## Approved Libraries

**Read this file before adding, replacing, or using any third-party package in a new way.**
A new dependency requires: justification, version, security check, and documentation update before implementation.

---

### Core Framework

| Package | Version | Purpose | Docs |
|---|---|---|---|
| `next` | `16.3.5` | App framework | `node_modules/next/dist/docs/` |
| `react` | `19.2.8` | UI library | https://react.dev |
| `react-dom` | `19.2.8` | DOM rendering | https://react.dev |
| `typescript` | `^5` | Type safety | https://www.typescriptlang.org |

### Database

| Package | Version | Purpose | Pattern |
|---|---|---|---|
| `pg` | TBD (to install) | PostgreSQL client | Pool per process, parameterized queries only |
| `@types/pg` | TBD | TypeScript types for pg | Dev dependency |

**Pattern for pg:**
```typescript
// lib/db/pool.ts
import { Pool } from 'pg';
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});
```

**Query pattern:**
```typescript
const result = await pool.query<MyType>(
  'SELECT * FROM reservation WHERE reservation_id = $1',
  [reservationId]
);
return result.rows[0];
```

**Transaction pattern:**
```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... queries ...
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

### Authentication and Sessions

| Package | Version | Purpose |
|---|---|---|
| `iron-session` | TBD (to install) | Encrypted HTTP-only sessions |
| `bcryptjs` | TBD (to install) | Password hashing |
| `@types/bcryptjs` | TBD | TypeScript types |

**bcryptjs pattern:**
```typescript
// Hash: cost factor 12 minimum
const hash = await bcrypt.hash(password, 12);
// Verify:
const valid = await bcrypt.compare(password, storedHash);
```

### Validation

| Package | Version | Purpose |
|---|---|---|
| `zod` | TBD (to install) | Request shape validation |

**Zod pattern:**
```typescript
const CreateReservationSchema = z.object({
  roomIds: z.array(z.number().int().positive()),
  checkInDate: z.string().date(),
  checkOutDate: z.string().date(),
}).refine(data => data.checkOutDate > data.checkInDate, {
  message: 'Check-out must be after check-in',
});
```

### Testing (TBD — to confirm with team)

| Package | Candidate | Purpose |
|---|---|---|
| `vitest` | Preferred | Unit and integration tests |
| `@testing-library/react` | Preferred | Component tests |

**Confirm and record in `docs/20_approved-libraries-and-patterns.md` before installing.**

---

## Prohibited Alternatives

| Prohibited | Use Instead | Reason |
|---|---|---|
| Prisma, Drizzle, TypeORM, Sequelize | `pg` direct SQL | ORM banned by project rules |
| Supabase, Firebase | `pg` + PostgreSQL | Database-as-a-service banned |
| `jsonwebtoken` for sessions | `iron-session` | Approved session library |
| `axios` for API calls | `fetch` (built-in) | No need for extra HTTP client |
| `moment.js` | `date-fns` or native `Date` | Deprecated |

---

## Before Adding a New Package

1. Check if an approved library already covers the need
2. Verify package is actively maintained (recent commits, no known CVEs)
3. Record in `docs/20_approved-libraries-and-patterns.md` with: name, version, justification, owner
4. Get team agreement before adding to `package.json`
