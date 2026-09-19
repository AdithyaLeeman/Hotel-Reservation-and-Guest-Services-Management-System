# docs/02 — Requirements Traceability Matrix

_Maps every functional requirement from the project brief and SRS to the DB table/routine, API endpoint, page, and task that implements it._

| Req ID | Requirement | DB Table / Routine | API Endpoint | Page | Task |
|---|---|---|---|---|---|
| REQ-1.1 | Guest self-registration | `user_account`, `guest` | POST /api/guest/register | /guest/register | P01-M01-T08 |
| REQ-1.2 | Guest login | `user_account` | POST /api/guest/login | /guest/login | P01-M01-T09 |
| REQ-1.3 | Staff login with role | `user_account`, `employee` | POST /api/staff/login | /staff/login | P01-M01-T10 |
| REQ-2.1 | Public availability search | `fn_get_available_rooms()` | GET /api/availability | /search | P02-M02-T03,T04,T05 |
| REQ-2.2 | Room type display with amenities | `room_type`, `amenity`, `room_type_amenity` | GET /api/availability | /search | P02-M02-T05 |
| REQ-3.1 | Guest online reservation (atomic, concurrency-safe) | `sp_create_reservation()` | POST /api/guest/reservations | /guest/reservations/new | P03-M03-T03,T04,T05 |
| REQ-3.2 | No double booking | `sp_create_reservation()` SELECT FOR UPDATE | POST /api/guest/reservations | — | P03-M03-T03,T12 |
| REQ-3.3 | Rate snapshot at booking | `reservation_rooms.rate_per_night` | POST /api/guest/reservations | — | P03-M03-T03 |
| REQ-3.4 | Guest view own reservations | `reservation`, `reservation_rooms` | GET /api/guest/reservations | /guest/reservations | P03-M03-T06 |
| REQ-3.5 | Guest view reservation detail and bill | `vw_invoice_totals` | GET /api/guest/reservations/[id] | /guest/reservations/[id] | P03-M03-T07 |
| REQ-3.6 | Guest cancellation | `sp_cancel_reservation()` | DELETE /api/guest/reservations/[id] | /guest/reservations | P03-M03-T10 |
| REQ-3.7 | Staff-assisted reservation creation | `sp_create_reservation()` | POST /api/staff/reservations | /staff/reservations/new | P03-M03-T08 |
| REQ-3.8 | Staff view all reservations (branch-scoped) | `reservation` | GET /api/staff/reservations | /staff/reservations | P03-M03-T09 |
| REQ-4.1 | Room management (CRUD) | `room` | /api/staff/rooms | /staff/rooms | P02-M02-T06,T07 |
| REQ-4.2 | Maintenance room status | `room.status` | PATCH /api/staff/rooms/[id] | /staff/rooms | P02-M02-T08 |
| REQ-4.3 | Check-in (atomic, room → Occupied) | `sp_check_in()` | POST /api/staff/checkin | /staff/reservations/[id] | P04-M04-T03,T04 |
| REQ-4.4.1 | Service usage logging (checked-in only) | `sp_log_service_usage()` | POST /api/staff/services/usage | /staff/rooms (service tab) | P04-M04-T05 |
| REQ-4.4.2 | Service price snapshot at usage time | `service_usage.charged_price` | POST /api/staff/services/usage | — | P04-M04-T05 |
| REQ-4.5.1 | Room charge calculation in DB | `fn_calc_room_charges()` | Called by invoice | — | P04-M04-T08 |
| REQ-4.5.2 | Service charge calculation in DB | `fn_calc_service_charges()` | Called by invoice | — | P04-M04-T09 |
| REQ-4.5.3 | Tax on room charges only | `vw_invoice_totals` (8% via tax_policies) | Called by billing API | — | P04-M05-T03,T04 |
| REQ-4.5.4 | Outstanding balance in DB (never TypeScript) | `vw_invoice_totals.outstanding_balance` | GET /api/guest/reservations/[id] | /guest/reservations/[id] | P04-M05-T04 |
| REQ-5.1 | Accept payment (partial or full) | `sp_post_payment()` | POST /api/guest/payments | /guest/reservations/[id] | P05-M05-T02,T03 |
| REQ-5.2 | Payment idempotency | `payment.transaction_reference` UNIQUE | POST /api/guest/payments | — | P05-M05-T02 |
| REQ-5.3 | Checkout blocked if balance > 0 | `sp_checkout()` guard | POST /api/staff/checkout | /staff/reservations/[id] | P05-M05-T05 |
| REQ-5.4 | Checkout: room → Available (atomic) | `sp_checkout()` | POST /api/staff/checkout | — | P05-M05-T05 |
| REQ-6.1 | Service catalogue management | `service_catalogue` | /api/staff/services | /staff/admin | P04-M04-T06 |
| REQ-6.2 | Branch management | `branch` | /api/staff/admin/branches | /staff/admin | P01-M01-T03 |
| REQ-6.3 | Employee management | `employee`, `user_account` | /api/staff/admin/employees | /staff/admin | P01-M01-T04 |
| REQ-7.1 | Room occupancy report | `vw_room_occupancy` | GET /api/staff/reports/occupancy | /staff/reports | P05-M05-T07 |
| REQ-7.2 | Guest billing summary report | `vw_guest_billing_summary` | GET /api/staff/reports/billing | /staff/reports | P05-M05-T08 |
| REQ-7.3 | Service usage breakdown report | `vw_service_usage_breakdown` | GET /api/staff/reports/service-usage | /staff/reports | P04-M04-T10 |
| REQ-7.4 | Monthly revenue per branch report | `vw_monthly_revenue` | GET /api/staff/reports/revenue | /staff/reports | P05-M05-T09 |
| REQ-7.5 | Top-used services report | `vw_top_services` | GET /api/staff/reports/top-services | /staff/reports | P05-M03-T01 |
| REQ-8.1 | RBAC enforcement (role + branch scope) | `user_account.role`, session | All `/api/staff/*` routes | — | P01-M01-T14 |
| REQ-8.2 | Guest ownership enforcement | `reservation.guest_id = session.guestId` | All `/api/guest/*` routes | — | P01-M01-T14 |
| REQ-8.3 | Audit trail for reservation changes | `trg_audit_reservation_status` | — | — | P05-M05-T11 |
