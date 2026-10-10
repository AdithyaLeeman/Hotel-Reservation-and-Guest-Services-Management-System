# docs/03 — Course Concept Mapping

_Maps every required DB mechanism to the lecture slides that cover it. Required for academic alignment._
_When building any DB routine, cite the lecture here. Update after each task._

## Lecture Reference (L01–L14)

| L# | Topic |
|---|---|
| L01 | Introduction to Database Systems |
| L02 | Entity–Relationship Model (ER diagrams, cardinality) |
| L03 | Relational Model (domains, tuples, relations, relational algebra) |
| L04 | Normalization (1NF–3NF, BCNF, functional dependencies) |
| L05 | SQL: DDL, DML, views, integrity constraints, transactions |
| L06 | Database Design (mapping ER to relational) |
| L07 | Database Application Programming (JDBC-style, security) |
| L08 | Procedural SQL (PL/pgSQL, stored functions, stored procedures, triggers) |
| L09 | Database Administration (backup, recovery, user management) |
| L10 | Indexing and File Organization |
| L11 | Query Optimization (EXPLAIN, cost models) |
| L12 | Concurrency Control (isolation levels, locking, MVCC) |
| L13 | Recovery (UNDO/REDO logs, checkpoints, crash recovery) |
| L14 | Advanced Topics / Distributed Databases |

---

## Concept to Implementation Mapping

| DB Object / Concept | Lecture | Implementation Location | Status |
|---|---|---|---|
| ER diagram (entities, relationships, cardinality) | L02 | `docs/05_current-erd-and-schema.md`, ERD source | Documented |
| ER to relational mapping (junction tables, FKs) | L06 | `database/migrations/P01-P03` DDL | TODO |
| 1NF — no repeating groups | L04 | `amenity` + `room_type_amenity` tables (normalized from SRS text field) | Designed |
| 2NF — no partial dependencies | L04 | `reservation_rooms.rate_per_night` depends on full composite PK | Designed |
| 3NF — no transitive dependencies | L04 | Documented in `docs/06_normalization` | TODO |
| BCNF analysis | L04 | `docs/06_normalization` | TODO |
| Functional dependencies | L04 | `docs/06_normalization` | TODO |
| SQL DDL (CREATE TABLE, constraints) | L05 | All migration files | TODO |
| SQL DML (INSERT, UPDATE, DELETE) | L05 | All repository files | TODO |
| PRIMARY KEY constraints | L05 | All tables | TODO |
| FOREIGN KEY … ON DELETE RESTRICT | L05 | All FK relationships | TODO |
| CHECK constraints (e.g., check_out > check_in) | L05 | `reservation`, `payment`, `service_usage` | TODO |
| UNIQUE constraints (username, transaction_reference) | L05 | `user_account.username`, `payment.transaction_reference` | TODO |
| NOT NULL constraints | L05 | All tables | TODO |
| PostgreSQL ENUM types | L05 | `user_role`, `room_status`, `reservation_status`, etc. | TODO |
| Views (derived data, reporting) | L05 | `vw_invoice_totals`, `vw_room_occupancy`, `vw_monthly_revenue`, etc. | TODO |
| Transactions (BEGIN/COMMIT/ROLLBACK) | L05 | All stored procedures | TODO |
| ACID properties | L05 | Documented in `docs/09` per procedure | TODO |
| SQL aggregate functions (SUM, COUNT, AVG) | L03 | `fn_calc_room_charges`, `fn_calc_service_charges`, reports | TODO |
| GROUP BY, HAVING | L03 | Monthly revenue report, usage breakdown | TODO |
| INNER JOIN, LEFT OUTER JOIN | L05 | Availability query, billing views, reports | TODO |
| Subqueries and correlated subqueries | L05 | Availability overlap check | TODO |
| NUMERIC(p,s) — exact decimal | L03 | All money columns | TODO |
| DATE, TIMESTAMP WITH TIME ZONE | L03 | check_in_date, usage_date, etc. | TODO |
| PL/pgSQL stored functions | L08 | `fn_calc_room_charges`, `fn_calc_service_charges`, `fn_get_available_rooms` | TODO |
| PL/pgSQL stored procedures | L08 | `sp_create_reservation`, `sp_check_in`, `sp_log_service_usage`, `sp_finalize_invoice`, `sp_post_payment`, `sp_checkout` | TODO |
| PL/pgSQL exception handling (RAISE EXCEPTION, SQLSTATE) | L08 | All stored procedures | TODO |
| Triggers (FOR EACH ROW, BEFORE/AFTER) | L08 | Audit trail trigger, possibly room status sync | TODO |
| Row-level locking (SELECT FOR UPDATE) | L12 | `sp_create_reservation` overlap prevention | TODO |
| Isolation levels | L12 | Documented per procedure in `docs/09` | TODO |
| Composite indexes | L10 | `idx_reservation_rooms_room_dates`, `idx_reservation_guest_id` | TODO |
| EXPLAIN ANALYZE | L11 | Availability query (P02-M02-T09), report queries (P06-ALL-T10) | TODO |
| Parameterized queries (SQL injection prevention) | L07 | All repository SQL via `pg` | TODO |
| Role-based access control | L07 | RBAC middleware, session enforcement | TODO |
| Prepared statements | L07 | `pg` parameterized queries | TODO |
| gen_random_uuid() | L05 | UUID primary keys | TODO |
| GENERATED ALWAYS AS IDENTITY | L05 | bigint primary keys | TODO |
| Idempotency / duplicate prevention | L05 | `payment.transaction_reference` UNIQUE | TODO |

---

## DB Routine Lecture Citation Map

| Routine | Lecture Concepts Demonstrated |
|---|---|
| `fn_get_available_rooms()` | L05 (subquery, date range overlap), L08 (PL/pgSQL function), L10 (index usage), L11 (EXPLAIN) |
| `sp_create_reservation()` | L08 (procedure, exception handling), L12 (SELECT FOR UPDATE, isolation), L05 (transaction, FK) |
| `sp_check_in()` | L08 (procedure), L05 (transaction, status transition), L12 (atomicity) |
| `sp_log_service_usage()` | L08 (procedure, price snapshot), L05 (constraint enforcement) |
| `fn_calc_room_charges()` | L08 (function), L03 (SUM, arithmetic), L05 (join) |
| `fn_calc_service_charges()` | L08 (function), L03 (SUM, arithmetic), L05 (join) |
| `sp_finalize_invoice()` | L08 (procedure), L05 (transaction, snapshot) |
| `vw_invoice_totals` | L05 (view, derived data), L03 (aggregation) |
| `sp_post_payment()` | L08 (procedure), L05 (UNIQUE idempotency), L12 (transaction) |
| `sp_checkout()` | L08 (procedure), L05 (transaction, guard), L12 (balance check atomicity) |
| `vw_monthly_revenue` | L05 (view), L03 (GROUP BY, SUM, date truncation) |
| `vw_room_occupancy` | L05 (view), L03 (aggregation, join) |
| Audit trigger | L08 (trigger, FOR EACH ROW) |
