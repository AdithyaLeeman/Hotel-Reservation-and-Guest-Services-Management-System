# docs/19 — Open Questions and Assumptions

_All open decisions requiring team or lecturer approval. Matches `.agent/open-questions.md`._
_Add a row when a new question is identified. Move to RESOLVED when approved._

| ID | Question | Recommendation | Impact | Owner | Status |
|---|---|---|---|---|---|
| OQ-01 | Multi-room reservation (ERD) vs single-room booking (SRS)? | ERD multi-room model | All reservation code | M1 | PROPOSED |
| OQ-02 | Can one reservation span multiple branches? | NO — branch_id invariant | Reservation procedure | M1 | PROPOSED |
| OQ-03 | Is billing_summary a stored table or a view? | Stored table; totals derived by view | M5 DDL | M5 | PROPOSED |
| OQ-04 | Tax applies to room charges only, or also services? | Room charges only (SRS says so) | Invoice function | M5 | PROPOSED |
| OQ-05 | Late checkout cutoff time and fee? | 12:00 PM local, 50% of one night (SRS TBD-4) | Service catalogue, checkout procedure | M4 | PROPOSED |
| OQ-06 | Cancellation and refund policy? | Status → Cancelled, no auto refund now (TBD-5) | M3 cancellation, M5 refund if approved | M3 | OPEN |
| OQ-07 | Which payment gateway? | Mock internally for now (TBD-1) | M5 payment API design | M5 | OPEN |
| OQ-08 | Overlap prevention: SELECT FOR UPDATE vs exclusion constraint? | SELECT FOR UPDATE in stored procedure | M3 reservation procedure | M3 | PROPOSED |
| OQ-09 | Is Maintenance a valid room status? | YES, from ERD — Maintenance rooms excluded from availability | M2 availability function, room management | M2 | PROPOSED |
| OQ-10 | Revenue definition: payment date vs invoice date? | Invoice-date accrual | M5 monthly revenue view | M5 | PROPOSED |

## Resolved Questions

| ID | Question | Resolution | Date | Approver |
|---|---|---|---|---|
| — | No resolutions yet | | | |

## Assumptions Made Without Approval
These must be validated by the team and/or lecturer:

1. **8% tax rate** — SRS explicitly labels this as an interim assumption (SRS Section 2.5). Implemented via `tax_policies` table (not hardcoded). Rate can be changed by updating the active tax policy record.

2. **Late checkout service ID** — A stable `service_id` for "Late Checkout" must be established in the seed data and never changed. Its `service_id` will be hardcoded as a constant in the checkout procedure. This assumption is provisional.

3. **No promotional discount codes** — `reservation.discount_percentage` is nullable and manually set by staff. No automatic promotional code system is implemented.

4. **Mock payment recording** — Real card/payment gateway integration is deferred. Payments are recorded with `payment_method` and `transaction_reference` fields. A stub in the service layer simulates gateway response.
