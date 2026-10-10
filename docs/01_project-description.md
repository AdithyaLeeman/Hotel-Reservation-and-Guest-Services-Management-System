# docs/01 — Project Description

## Scope
Hotel Reservation and Guest Services Management System (HRGSMS) for SkyNest Hotels. Replaces an outdated desktop booking system that caused overbookings, billing delays, and manual errors across three branches: Colombo, Kandy, and Galle.

## Actors

| Actor | ERD Role | Self-Register | Access |
|---|---|---|---|
| Public visitor | — | No login required | `/`, `/search` |
| Guest | `Guest` | Yes (self-register) | `/guest/*` |
| Receptionist | `Receptionist` | No (admin-created) | `/staff/*` (own branch) |
| Manager | `Manager` | No (admin-created) | `/staff/*` (all branches) |
| Admin | `Admin` | No (system-seeded) | `/staff/*` + `/staff/admin` |

## Core Workflows
1. Public room availability search (no login)
2. Guest self-registration and login
3. Authenticated guest online reservation (atomic, concurrency-safe, multi-room)
4. Guest My Reservations: list, detail, bill, payment history
5. Staff reservation creation and management
6. Staff authentication with role and branch scope
7. Atomic check-in + room status → Occupied
8. Service usage logging (checked-in only, price snapshot captured)
9. Historical service price preserved per usage record
10. DB-authoritative billing: room charges × nights + tax + service charges - discount
11. Partial and full payments; auditable payment history
12. Checkout blocked if outstanding_balance > 0
13. Atomic checkout + room → Available
14. Cancellation per approved policy
15. Master-data administration (branches, rooms, services, users, employees)
16. Five mandatory DB-backed reports

## Required Reports
1. Room occupancy report for a selected date or period
2. Guest billing summary including unpaid balances
3. Service usage breakdown per room and service type
4. Monthly revenue per branch (room charges + services)
5. Top-used services and customer preference trends

## In Scope
All features in the project brief, SRS, and ERD (ERD takes precedence for schema design).

## Out of Scope
- External payment gateway (deferred, mocked internally)
- Real-time push notifications
- Mobile native app
- NoSQL, big data, distributed systems, RAID, data mining

## Academic Objective
Database correctness, consistency, transaction handling, and reporting are the principal deliverables. The UI demonstrates the database. Every authoritative calculation and business operation must be in PostgreSQL using syllabus-covered mechanisms.
