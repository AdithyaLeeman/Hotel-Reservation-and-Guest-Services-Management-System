# SkyNest Hotels - Hotel Reservation and Guest Services Management System (HRGSMS)

**University Database Systems Project - Group 39**

SkyNest Hotels is a regional hotel chain in Sri Lanka operating branches in **Colombo**, **Kandy**, and **Galle**. The HRGSMS is a unified web application and relational database system replacing an outdated desktop booking tool to eliminate overbookings, billing delays, and manual errors.

The **PostgreSQL database is the primary academic deliverable**, demonstrating ACID compliance, normalization (3NF/BCNF), row-level concurrency locking, database-first financial computation, and report views.

---

## 🛠️ Technology Stack

* **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
* **Backend**: Next.js Route Handlers + Thin Service/Repository Layer
* **Database**: PostgreSQL 15+ (Direct parameterized queries via `pg` Pool — **strictly no ORM**)
* **Authentication**: Bcrypt password hashing (cost factor 12) + `iron-session` (encrypted HTTP-only cookies)
* **Validation**: Zod schema validation
* **Testing**: Vitest (670 automated unit, integration, and security tests)

---

## 🚀 Quick Start & Setup

### Prerequisites
* **Node.js**: v20+ (LTS)
* **PostgreSQL**: v15+ installed and running locally on port 5432

### 1. Installation
```bash
git clone <repository-url>
cd Hotel-Reservation-and-Guest-Services-Management-System
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local` and configure your database connection string and session secret:
```bash
cp .env.example .env.local
```
Ensure `.env.local` contains:
```env
DATABASE_URL=postgresql://postgres@localhost:5432/hrgsms
POSTGRES_ADMIN_URL=postgresql://postgres@localhost:5432/postgres
SESSION_SECRET=replace_with_at_least_32_random_characters_here
APP_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Database Initialization (Migrations, Routines & Seeds)
Create the PostgreSQL database and run the automated migration and seed pipeline:
```bash
# In psql: CREATE DATABASE hrgsms;

# 1. Run migrations (tables, enums, constraints, foreign keys)
npm run migrate

# 2. Apply stored procedures, functions, triggers, and views
npm run db:routines

# 3. Seed comprehensive master and demo data (branches, rooms, services, users, reservations)
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Demo Accounts & Credentials

All demo accounts share the password: **`SkyNest@2026`**

| Role | Username | Email | Branch Scope | Description |
|---|---|---|---|---|
| **Admin** | `admin` | `admin@skynest.com` | All Branches | Full administrative access & configuration |
| **Manager** | `manager` | `manager@skynest.com` | Colombo (HQ) | Operational oversight + all 5 reports |
| **Receptionist** | `reception_colombo` | `reception.cmb@skynest.com` | Colombo | Front-desk check-in, check-out, service logging |
| **Receptionist** | `reception_kandy` | `reception.kdy@skynest.com` | Kandy | Front-desk operations for Kandy branch |
| **Guest 1** | `john.doe` | `john.doe@gmail.com` | - | Historical completed stays (CheckedOut) |
| **Guest 2** | `jane.smith` | `jane.smith@gmail.com` | - | Currently staying (CheckedIn in Suite 201, Partial Payment) |
| **Guest 3** | `kamal.perera` | `kamal.perera@gmail.com` | - | Currently staying (CheckedIn in Kandy Room 102) |
| **Guest 4** | `anura.silva` | `anura.silva@gmail.com` | - | Upcoming stay (Galle Suite 103, deposit paid) |
| **Guest 5** | `sarah.williams`| `sarah.williams@gmail.com`| - | Upcoming booking (Colombo Single 101, unpaid) |

---

## 📊 The 5 Mandatory Management Reports

Management can access all 5 required reports at **`/staff/reports`**:

1. **Room Occupancy Report** (`/staff/reports/occupancy`): Backed by `vw_room_occupancy`. Computes monthly room occupancy rates, occupied nights, and room revenue.
2. **Guest Billing Summary** (`/staff/reports/billing`): Backed by `vw_guest_billing_summary`. Displays invoices, room charges, service charges, taxes, paid totals, and flags unpaid/partial balances.
3. **Service Usage Breakdown** (`/staff/reports/service-usage`): Backed by `vw_service_usage_breakdown`. Per-usage detail showing room number, service name, quantity, employee attribution, and snapshot prices.
4. **Monthly Revenue per Branch** (`/staff/reports/revenue`): Backed by `vw_monthly_revenue`. Accrual breakdown of room revenue, service revenue, tax collected, and outstanding balances per branch.
5. **Top-Used Services** (`/staff/reports/top-services`): Backed by `vw_top_services`. Uses `RANK() OVER (ORDER BY SUM(quantity) DESC)` to display the most requested guest services and revenues.

---

## 🎓 Academic Concept Mapping (L01–L14)

* **Relational Normalization (L04)**: Normalized into 3NF/BCNF. Amenities separated into `amenity` and junction table `room_type_amenity` (eliminating 1NF repeating group violations).
* **Integrity Constraints (L03)**: Primary keys, UUID identifiers, CHECK constraints (dates, positive amounts), and foreign keys with `ON DELETE RESTRICT` prevent orphaned records.
* **ACID Transactions & Stored Routines (L05, L08, L11)**:
  - `sp_create_reservation`: Atomic reservation creation and room allocation.
  - `sp_check_in`: Atomically updates reservation to `CheckedIn` and room status to `Occupied`.
  - `sp_checkout`: Releases rooms to `Available` and checks that `outstanding_balance = 0`.
  - `sp_post_payment`: Idempotent payment recording against invoices.
* **Concurrency Control (L12)**: Double-booking overlap prevention uses row-level locking with `SELECT ... FOR UPDATE` on room rows during the date range check.
* **Audit Trail (L08)**: Trigger `trg_audit_reservation_status` records every state transition into `reservation_audit_log`.
* **Database-First Computation**: All financial totals, night counts, taxes, and balances are computed inside PostgreSQL routines and views using `NUMERIC(12,2)`.

---

## 🧪 Verification & Testing

Run all 670 automated tests:
```bash
npm test
```

Run static analysis and linting:
```bash
npx tsc --noEmit
npm run lint
```

For the step-by-step presentation script to show the lecturer, see **[`docs/22_lecturer-demo-script.md`](file:///home/leeman/Projects/db/Hotel-Reservation-and-Guest-Services-Management-System/docs/22_lecturer-demo-script.md)**.
