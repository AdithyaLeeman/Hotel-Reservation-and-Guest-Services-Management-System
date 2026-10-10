# docs/20 — Approved Libraries and Patterns

_Every third-party dependency used in the project. All additions must be recorded here._
_See `context/05-library-patterns.md` for usage patterns._

## Currently Installed (package.json)

| Package | Version | Type | Purpose | Approved By |
|---|---|---|---|---|
| `next` | `16.3.5` | prod | App framework | Core requirement |
| `react` | `19.2.8` | prod | UI library | Core requirement |
| `react-dom` | `19.2.8` | prod | DOM rendering | Core requirement |
| `typescript` | `^5` | dev | Type safety | Core requirement |
| `tailwindcss` | `^4` | dev | Styling | Retained from scaffold |
| `@tailwindcss/postcss` | `^4` | dev | PostCSS integration | Retained from scaffold |
| `eslint` | `^9` | dev | Linting | Core requirement |
| `eslint-config-next` | `16.3.5` | dev | Next.js lint rules | Core requirement |
| `@types/node` | `^20` | dev | Node types | Standard |
| `@types/react` | `^19` | dev | React types | Standard |
| `@types/react-dom` | `^19` | dev | ReactDOM types | Standard |

## To Be Installed (Phase 1)

| Package | Version | Purpose | Owner | Status |
|---|---|---|---|---|
| `pg` | `^8` | PostgreSQL client | M1 | APPROVED (P01-M01-T01) |
| `@types/pg` | `^8` | pg TypeScript types | M1 | APPROVED |
| `iron-session` | `^8` | Encrypted sessions | M1 | APPROVED (P01-M01-T07) |
| `bcryptjs` | `^2` | Password hashing | M1 | APPROVED (P01-M01-T06) |
| `@types/bcryptjs` | `^2` | bcryptjs types | M1 | APPROVED |
| `zod` | `^3` | Input validation | M1 | APPROVED |

## Testing Libraries (Phase 1 — Confirm)

| Package | Purpose | Status |
|---|---|---|
| `vitest` | Unit/integration tests | PROPOSED — team to confirm |
| `@testing-library/react` | Component tests | PROPOSED |
| `@vitejs/plugin-react` | Vitest React support | PROPOSED |

_Update to APPROVED and record version when confirmed._

## Explicitly Prohibited

| Package | Reason |
|---|---|
| `prisma` | ORM banned by project rules |
| `@prisma/client` | ORM banned |
| `drizzle-orm` | ORM banned |
| `typeorm` | ORM banned |
| `sequelize` | ORM banned |
| `@supabase/supabase-js` | Database-as-a-service banned |
| `firebase` | Database-as-a-service banned |
| `axios` | Use native `fetch` instead |
| `moment` | Deprecated; use `date-fns` or native `Date` |
| `lodash` | Too heavy; use native equivalents |

## Package Addition Checklist
Before adding any new package:
- [ ] Not on the prohibited list
- [ ] No ORM capability
- [ ] No database-as-a-service connection
- [ ] Actively maintained (< 6 months since last release)
- [ ] No known critical CVEs (check snyk.io or npm audit)
- [ ] Add to this file with version, purpose, and owner
- [ ] Team agreement obtained
