# docs/13 — Workload Division

## Group 39 — Members and Contributions

| Member | SRS Reference | Primary Slice | Phases |
|---|---|---|---|
| M1 — Leeman K.A.R. | 240386C | Auth, RBAC, foundation, shared infrastructure | P0, P1 |
| M2 — Karunarathna W.P. | 240331F | Room inventory, availability, room management | P1, P2, P5 (report UI) |
| M3 — Hiripitiya S.K. | 240238C | Guest portal, reservations, online booking | P3, P5 (report) |
| M4 — Bandaranayaka I.B.W.D. | 240061C | Service catalogue, check-in, service usage | P4, P5 (report UI) |
| M5 — Kabilraj K. | 240304C | Billing, payments, checkout, reports | P4 (billing), P5 |

## Division Rationale

Each member owns a full vertical slice:
- Database DDL and migrations for their tables
- PostgreSQL routines (functions, procedures, views) for their domain
- API route handlers for their endpoints
- UI pages for their workflows
- Tests for their features

This ensures each member demonstrates competency in all layers of the stack and the full range of academic database concepts.

## Shared Responsibilities (M1 coordinates)

| Shared Item | Owner | Phase |
|---|---|---|
| AGENTS.md | M1 | P0 |
| Shared contracts (docs/21) | M1 | P0 |
| RBAC middleware | M1 | P1 |
| DB pool + transaction helper | M1 | P1 |
| UI shell (navbar, layout) | M1 | P1 |
| Migration manifest | All (append) | All |
| Integration testing | Integration owner per phase | P6 |
| Final documentation | All | P6 |

## Course Concept Coverage by Member

| Concept | L# | Member |
|---|---|---|
| ER diagram / relational mapping | L02/L06 | All (documented in docs/05, docs/06) |
| Normalization (FDs, BCNF) | L04 | M1 (documents), all apply |
| SQL DDL (tables, constraints, enums) | L05 | M1 (foundation) + each member (own tables) |
| SQL DML (queries, joins, aggregates) | L03/L05 | Each member (own repositories) |
| Views | L05 | M4 (service usage view), M5 (billing, revenue, occupancy) |
| Transactions | L05 | M3 (reservation), M4 (check-in), M5 (payment, checkout) |
| Stored functions | L08 | M2 (availability), M4 (charges) |
| Stored procedures | L08 | M3 (reservation), M4 (check-in, service), M5 (invoice, payment, checkout) |
| Triggers | L08 | M5 (audit trigger) |
| Indexing | L10 | M2 (availability index), M5 (report indexes) |
| EXPLAIN ANALYZE | L11 | M2 (availability), M5 (reports) |
| Concurrency / locking | L12 | M3 (SELECT FOR UPDATE in sp_create_reservation) |
| Parameterized SQL / injection prevention | L07 | M1 (establishes pattern), all apply |
| RBAC | L07 | M1 |
| Aggregate functions | L03 | M4/M5 (billing functions) |
| GROUP BY, HAVING | L03 | M5 (revenue report) |
