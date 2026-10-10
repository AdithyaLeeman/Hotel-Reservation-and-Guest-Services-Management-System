# context/01 — Project Overview

## Product
Hotel Reservation and Guest Services Management System (HRGSMS) for SkyNest Hotels.
Replaces an outdated desktop booking system that caused overbookings, billing delays, and manual errors.

## Branches
- Colombo, Kandy, Galle

## Actors and Portals

| Actor | Role (ERD) | Entry Point | Capabilities |
|---|---|---|---|
| Public visitor | — | `/`, `/search` | Browse hotel info, search availability |
| Guest | `Guest` | `/guest/login`, `/guest/register` | Book rooms, view own reservations, pay, view bill |
| Receptionist | `Receptionist` | `/staff/login` | Check-in/out, log services, manage reservations |
| Manager | `Manager` | `/staff/login` | All receptionist actions + reports |
| Admin | `Admin` | `/staff/login` | All manager actions + user/employee admin |

## Core Workflows (16 Required)
1. Public availability search
2. Guest self-registration
3. Authenticated guest online reservation (atomic, concurrency-safe)
4. Guest `My Reservations`: list, detail, bill, payment history
5. Staff reservation creation and management
6. Staff authentication with role and branch scope enforcement
7. Atomic check-in + room status update
8. Service usage logging (checked-in only, price snapshot)
9. Historical service price preservation
10. DB-authoritative billing (room charges, tax, service charges, discounts)
11. Partial and full payment acceptance
12. Checkout blocked if balance > 0
13. Atomic checkout + room release
14. Cancellation per approved policy
15. Master-data administration (branches, rooms, services, users)
16. Five mandatory reports via DB views/functions

## Required Reports
1. Room occupancy by date/period
2. Guest billing summary with unpaid balances
3. Service usage breakdown per room and service type
4. Monthly revenue per branch (room charges + services)
5. Top-used services and customer preference trends

## Academic Objective
The database is the primary deliverable. All authoritative calculations and business rules live in PostgreSQL using syllabus-covered mechanisms (constraints, functions, procedures, triggers, views, transactions, indexes).

## In Scope
Everything described in the project brief, SRS, and ERD, with ERD taking precedence over SRS for schema structure.

## Out of Scope
- External payment gateway (deferred, mock internally)
- Real-time push notifications
- Mobile native app
- NoSQL, big data, distributed systems
- Data mining or ML features

## Success Criteria
- Database rebuilds cleanly from migrations
- All 16 workflows demonstrably work
- All 5 reports produce correct results with seed data
- Concurrent double-booking rejected
- Checkout blocked on positive balance
- All role/branch restrictions enforced server-side
- SQL injection tests pass
- EXPLAIN ANALYZE captured for key queries
