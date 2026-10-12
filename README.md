# 🏨 SkyNest Hotels — Hotel Reservation & Guest Services Management System (HRGSMS)

> **University Database Systems Project — Group 39**  
> A mission-critical, database-first enterprise web system built for SkyNest Hotels across its branches in **Colombo**, **Kandy**, and **Galle**.

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Passing-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

---

## 📖 Overview

The **HRGSMS** replaces legacy manual systems with a modern, high-concurrency reservation and guest services platform. Designed with **PostgreSQL as the primary academic and architectural deliverable**, the application enforces strict business rules, ACID transactions, row-level concurrency locking, and audit integrity directly inside the database engine.

### Core System Pillars
- **Strict Database-First Computation**: Financial calculations, night counts, taxes, service additions, and outstanding balances are executed strictly in PostgreSQL routines and views (`NUMERIC(12,2)`) — never in JavaScript floating-point arithmetic.
- **Zero Double-Booking Guarantee**: Concurrency protection utilizing pessimistic row-level locking (`SELECT ... FOR UPDATE`) in atomic procedures.
- **Full Role-Based Access Control (RBAC)**: Distinct, scoped access for **Admin**, **Manager**, **Receptionist**, and **Guest** users.
- **Automated Audit Logging**: Trigger-based state-transition history for every reservation modification.

---

## 👥 Project Contributors (Group 39)

| Contributor | Academic Reference | GitHub Profile(s) | Primary Vertical Slice |
|---|---|---|---|
| **Leeman K.A.R.** | 240386C | [@AdithyaLeeman](https://github.com/AdithyaLeeman) | Authentication, RBAC, Core Schema, Branch Administration |
| **Karunarathna W.P.** | 240331F | [@Pasindu-333](https://github.com/Pasindu-333) | Room Inventory, Availability Search, Occupancy Reports |
| **Hiripitiya S.K.** | 240238C | Personal: [@Senugihiripitiya](https://github.com/Senugihiripitiya)<br>University: [@HiripitiyaSK](https://github.com/HiripitiyaSK) | Guest Portal, Online Booking, Reservation Engine, Overlap Prevention |
| **Bandaranayaka I.B.W.D.** | 240061C | [@wanujadilneth-glitch](https://github.com/wanujadilneth-glitch) | Service Catalogue, Atomic Check-In, Service Usage Logging |
| **Kabilraj K.** | 240304C | [@KabilrajKanesaths](https://github.com/KabilrajKanesaths) | Billing & Invoicing, Payment Processing, Atomic Checkout, Reports Engine |

---

## 🚀 Quick Start & Installation

### Option 1: Docker (Recommended — Instant Setup)

The entire system — including PostgreSQL 16, automatic schema migrations, stored procedures, triggers, views, demo seed data, and the Next.js web application — can be launched with a single Docker command.

```bash
# 1. Clone the repository
git clone https://github.com/AdithyaLeeman/Hotel-Reservation-and-Guest-Services-Management-System.git
cd hotel-management

# 2. Build and launch all containers in detached mode
docker compose up --build -d
```

> **Note**: If your local directory is named `Hotel-Reservation-and-Guest-Services-Management-System`, simply navigate into that folder before running `docker compose up --build -d`.

#### What Docker Automatically Handles:
- 🐘 **PostgreSQL Container**: Runs on port `5433` (preventing conflicts with any local PostgreSQL instance on port `5432`).
- 🔄 **Automated Migrations & Routines**: Runs schema DDL, triggers, stored procedures, and views on startup.
- 🌱 **Database Seeding**: Injects branches, rooms, rates, demo guests, staff accounts, and active reservations.
- 🌐 **Web Server**: Next.js production build served at **[http://localhost:3000](http://localhost:3000)**.

To stop the Docker containers:
```bash
docker compose down
```

---

### Option 2: Local Manual Setup

If you prefer running directly on your host environment:

#### Prerequisites
* **Node.js**: v20+ (LTS)
* **PostgreSQL**: v15+ running locally on port 5432

#### 1. Clone & Install Dependencies
```bash
git clone https://github.com/AdithyaLeeman/Hotel-Reservation-and-Guest-Services-Management-System.git
cd hotel-management
npm install
```

#### 2. Environment Configuration
Create a `.env.local` file from `.env.example`:
```bash
cp .env.example .env.local
```

Ensure `.env.local` contains valid database credentials:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hrgsms
POSTGRES_ADMIN_URL=postgresql://postgres:postgres@localhost:5432/postgres
SESSION_SECRET=replace_with_at_least_32_random_characters_here
APP_URL=http://localhost:3000
NODE_ENV=development
```

#### 3. Database Initialization
```bash
# Run migrations (schema, tables, constraints, enums)
npm run migrate

# Apply stored procedures, functions, triggers, and views
npm run db:routines

# Seed comprehensive master and demo data
npm run seed
```

#### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Demo Accounts & Credentials

All seeded demo accounts share the password: **`SkyNest@2026`**

| Role | Username | Email | Branch Scope | Primary Capabilities |
|---|---|---|---|---|
| **Admin** | `admin` | `admin@skynest.com` | All Branches | System configuration, user administration, global oversight |
| **Manager** | `manager` | `manager@skynest.com` | Colombo (HQ) | Branch operational oversight + all 5 analytical reports |
| **Receptionist** | `reception_colombo` | `reception.cmb@skynest.com` | Colombo | Guest check-in, checkout, bill settlement, service logging |
| **Receptionist** | `reception_kandy` | `reception.kdy@skynest.com` | Kandy | Front-desk operations for Kandy branch |
| **Guest 1** | `john.doe` | `john.doe@gmail.com` | — | Historical completed stay (CheckedOut, fully paid) |
| **Guest 2** | `jane.smith` | `jane.smith@gmail.com` | — | Currently staying (CheckedIn in Suite 201, partial deposit) |
| **Guest 3** | `kamal.perera` | `kamal.perera@gmail.com` | — | Currently staying (CheckedIn in Kandy Room 102) |
| **Guest 4** | `anura.silva` | `anura.silva@gmail.com` | — | Upcoming booking (Galle Suite 103, deposit paid) |
| **Guest 5** | `sarah.williams` | `sarah.williams@gmail.com` | — | Upcoming booking (Colombo Single 101, unpaid) |

---

## 📊 The 5 Mandatory Management Reports

Managers and Admins can access all 5 required analytical reports under **`/staff/reports`**:

1. **Room Occupancy Report** (`/staff/reports/occupancy`)
   - **DB Source**: `vw_room_occupancy`
   - **Metrics**: Computes monthly room occupancy rates, total occupied nights, and realized room revenue per room category.
2. **Guest Billing Summary** (`/staff/reports/billing`)
   - **DB Source**: `vw_guest_billing_summary`
   - **Metrics**: Detailed financial ledger displaying invoices, room charges, service charges, tax levies, total payments, and outstanding balances.
3. **Service Usage Breakdown** (`/staff/reports/service-usage`)
   - **DB Source**: `vw_service_usage_breakdown`
   - **Metrics**: Service consumption audit showing room number, service name, quantity, servicing employee, and historical snapshot prices.
4. **Monthly Revenue per Branch** (`/staff/reports/revenue`)
   - **DB Source**: `vw_monthly_revenue`
   - **Metrics**: Accrual revenue breakdown comparing room revenue, auxiliary service revenue, collected taxes, and branch performance.
5. **Top-Used Services** (`/staff/reports/top-services`)
   - **DB Source**: `vw_top_services`
   - **Metrics**: Analytical ranking using `RANK() OVER (ORDER BY SUM(quantity) DESC)` showing highest demand services and revenue generation.

---

## 🎓 Academic Concept Mapping (L01–L14)

| Lecture Concept | Academic Requirement | Implementation Details |
|---|---|---|
| **L02/L06: Conceptual to Relational** | 3NF / BCNF Normalization | Decomposed schema eliminating redundancy; junction table `room_type_amenity` eliminates multi-valued repeating groups. |
| **L03: Integrity Constraints** | Domain & Referential Integrity | UUID & serial primary keys, foreign keys with `ON DELETE RESTRICT`, CHECK constraints on date windows and non-negative financial values. |
| **L05/L08: Stored Routines** | Atomic Business Transactions | `sp_create_reservation`, `sp_check_in`, `sp_checkout`, and `sp_post_payment` execute core business logic inside PostgreSQL. |
| **L08: Database Triggers** | Automated Audit Trail | Trigger `trg_audit_reservation_status` records every reservation status transition into `reservation_audit_log`. |
| **L10/L11: Indexing & Query Plans** | High Performance Retrieval | Composite indexes on reservation dates; performance validation using `EXPLAIN ANALYZE`. |
| **L12: Concurrency & Isolation** | Double-Booking Prevention | Pessimistic locking using `SELECT ... FOR UPDATE` on overlapping room date intervals. |
| **Database-First Financials** | Precision Financial Computation | All rate calculations (`rate × nights`), tax calculations, and balance tracking (`total - paid`) use `NUMERIC(12,2)` routines. |

---

## 🧪 Verification & Testing

The system is validated by an extensive automated test suite covering unit, integration, RBAC authorization, and concurrency workflows:

```bash
# Run all automated test suites
npm test

# Run TypeScript compilation check
npx tsc --noEmit

# Run code style & linting checks
npm run lint
```


