# docs/22 - Lecturer Demo Scenario Script

**Project:** Hotel Reservation and Guest Services Management System (HRGSMS) – SkyNest Hotels  
**Group:** 39 | **Course:** University Database Systems  
**Coordinator:** Member 1 (Leeman K.A.R., 240386C)  
**Task:** `P06-M01-T07`

---

## 1. Executive Demo Overview

This script guides the team through a live, end-to-end evaluation with the lecturer. Every step demonstrates a core database requirement from the **Project 5 Brief**, **ERD**, **SRS**, and the **Database Systems syllabus (L01–L14)**.

### Demo Credentials (All passwords: `SkyNest@2026`)

| Role | Username | Email | Branch Scope | Primary Capabilities |
|---|---|---|---|---|
| **System Admin** | `admin` | `admin@skynest.com` | All Branches (HQ) | User admin, database oversight, configuration |
| **General Manager** | `manager` | `manager@skynest.com` | Colombo (Branch 1) | All staff actions + full access to all 5 reports |
| **Receptionist (Colombo)**| `reception_colombo` | `reception.cmb@skynest.com`| Colombo (Branch 1) | Check-in, check-out, log services, view branch bookings |
| **Receptionist (Kandy)** | `reception_kandy` | `reception.kdy@skynest.com`| Kandy (Branch 2) | Branch 2 front-desk actions (branch-scoped RBAC) |
| **Guest 1** | `john.doe` | `john.doe@gmail.com` | - | CheckedOut historical stays & invoice receipts |
| **Guest 2** | `jane.smith` | `jane.smith@gmail.com` | - | Currently staying (CheckedIn, Suite 201, Partial Payment) |
| **Guest 3** | `kamal.perera` | `kamal.perera@gmail.com` | - | Currently staying (CheckedIn, Kandy Room 102) |
| **Guest 4** | `anura.silva` | `anura.silva@gmail.com` | - | Upcoming booking (Galle Suite 103, deposit paid) |
| **Guest 5** | `sarah.williams`| `sarah.williams@gmail.com`| - | Upcoming booking (Colombo Single 101, unpaid) |

---

## 2. Step-by-Step Live Walkthrough

### Scene 1: Public Room Search & Availability Filtering
* **URL:** [`http://localhost:3000/search`](http://localhost:3000/search)
* **Goal:** Prove availability logic and room status constraints without logging in.
1. Select **Kandy Branch**, choose dates (e.g. today for 2 nights), and search.
2. **Observe:** Room `202` does NOT appear in search results.
   * **Lecturer Explanation:** Room 202 is under `Maintenance` status. Our SQL availability function (`fn_get_available_rooms`) excludes maintenance rooms and existing active reservations using non-overlapping date logic.
3. Switch to **Colombo Branch** and search. Available Single, Double, and Suite options are displayed with dynamically fetched amenities and daily rates.

---

### Scene 2: Guest Portal & Online Reservation
* **URL:** [`http://localhost:3000/guest/login`](http://localhost:3000/guest/login)
* **Goal:** Demonstrate authentication, session handling, and concurrency-safe booking.
1. Log in as Guest:
   * **Email:** `sarah.williams@gmail.com`
   * **Password:** `SkyNest@2026`
2. Navigate to **Book a Room** or **Search**. Select Colombo, choose dates in December (e.g. `2026-12-10` to `2026-12-13`), select Room `101`, and confirm reservation.
3. **Database Proof:**
   * Explain the atomic execution of `sp_create_reservation`.
   * It uses `SELECT ... FOR UPDATE` row locks to prevent simultaneous double-booking during overlapping intervals.
   * Rate is snapshotted into `reservation_rooms.rate_per_night` to guarantee historical immutability.
4. View **My Reservations** ([`/guest/reservations`](http://localhost:3000/guest/reservations)) to show the newly created booking in `Booked` status with its calculated total.

---

### Scene 3: Staff Front-Desk Check-In & Room State Synchronization
* **URL:** [`http://localhost:3000/staff/login`](http://localhost:3000/staff/login)
* **Goal:** Demonstrate role-based access, atomic check-in, and synchronization between `reservation_status` and `room.status`.
1. Log in as Receptionist:
   * **Username:** `reception.cmb@skynest.com`
   * **Password:** `SkyNest@2026`
2. Open the **Staff Dashboard** ([`/staff/dashboard`](http://localhost:3000/staff/dashboard)) or **Reservations** ([`/staff/reservations`](http://localhost:3000/staff/reservations)).
3. Find an active `Booked` reservation (or Sarah Williams' reservation) and click **Check In Guest** ([`/staff/checkin`](http://localhost:3000/staff/checkin)).
4. Complete check-in.
5. **Database Proof:**
   * Explain stored procedure `sp_check_in`:
   * Within a single ACID transaction, `reservation.reservation_status` updates to `CheckedIn` AND the assigned `room.status` updates to `Occupied`.
   * Neither field can ever desynchronize.

---

### Scene 4: Logging Chargeable Guest Services
* **URL:** [`http://localhost:3000/staff/reservations`](http://localhost:3000/staff/reservations)
* **Goal:** Demonstrate service tracking and historical price snapshot preservation.
1. Select the currently checked-in reservation (e.g. Jane Smith, Suite 201 in Colombo).
2. Click **Log Service Usage** ([`/staff/reservations/[id]/services`](http://localhost:3000/staff/reservations)).
3. Select **Room Service** (quantity: 2) or **Spa Treatment**, choose request channel (e.g., `Room Intercom`), and click **Log Service**.
4. **Database Proof:**
   * Procedure `sp_log_service_usage` records the entry in `service_usage`.
   * Crucially, it captures `charged_price` from `service_catalogue.current_price` at the instant of usage. If management later alters the catalogue price, historical guest bills remain unmodified.

---

### Scene 5: Billing, Partial Payments & Checkout Guard
* **URL:** [`http://localhost:3000/guest/reservations`](http://localhost:3000/guest/reservations) and [`http://localhost:3000/staff/reservations`](http://localhost:3000/staff/reservations)
* **Goal:** Demonstrate dynamic balance computation, partial payments, and the zero-balance checkout gatekeeper.
1. Log in as guest `jane.smith@gmail.com` (Suite 201).
2. Go to reservation details & view the bill ([`/guest/reservations/[id]/pay`](http://localhost:3000/guest/reservations)):
   * **Room Charge:** LKR 45,000.00 (3 nights $\times$ 15,000)
   * **Tax (8%):** LKR 3,600.00
   * **Service Charges:** Dynamically summed from `service_usage`
   * **Total Paid:** LKR 25,000.00 (shows previous partial payment)
   * **Outstanding Balance:** Displays remaining balance (> 0).
3. **Attempt Checkout as Staff:**
   * Switch to staff portal and attempt to mark this reservation as `CheckedOut`.
   * **Observe:** The system **blocks checkout** with an error: *"Reservation has outstanding balance; checkout blocked."*
   * **Database Proof:** Procedure `sp_checkout` executes a state guard reading `outstanding_balance` from `vw_invoice_totals`. If $> 0$, it raises SQLSTATE `45030`.
4. **Make Final Payment:**
   * Post payment for the exact remaining balance.
   * `vw_invoice_totals.outstanding_balance` becomes `0.00`, and `payment_status` becomes `Paid`.
5. **Complete Checkout:**
   * Check out the guest now.
   * Procedure `sp_checkout` sets reservation to `CheckedOut` and releases the room status back to `Available`.

---

### Scene 6: The 5 Mandatory Management Reports
* **URL:** [`http://localhost:3000/staff/login`](http://localhost:3000/staff/login)
* Log in as Manager:
  * **Username:** `manager@skynest.com`
  * **Password:** `SkyNest@2026`
* Navigate to **Reports Dashboard** ([`/staff/reports`](http://localhost:3000/staff/reports)):

1. **Room Occupancy Report** ([`/staff/reports/occupancy`](http://localhost:3000/staff/reports/occupancy)):
   * Backed by `vw_room_occupancy`.
   * Shows monthly occupancy percentage, occupied nights, and room revenue per room.
2. **Guest Billing Summary** ([`/staff/reports/billing`](http://localhost:3000/staff/reports/billing)):
   * Backed by `vw_guest_billing_summary`.
   * Shows every guest's invoice, total room charges, service charges, taxes, paid amount, and flags unpaid/partially paid balances.
3. **Service Usage Breakdown** ([`/staff/reports/service-usage`](http://localhost:3000/staff/reports/service-usage)):
   * Backed by `vw_service_usage_breakdown`.
   * Per-line audit of every service consumed, timestamp, employee attribution, and line total.
4. **Monthly Revenue per Branch** ([`/staff/reports/revenue`](http://localhost:3000/staff/reports/revenue)):
   * Backed by `vw_monthly_revenue`.
   * Accrual revenue breakdown for Colombo, Kandy, and Galle (room vs service revenue, tax collected, total paid, and outstanding).
5. **Top-Used Services & Trends** ([`/staff/reports/top-services`](http://localhost:3000/staff/reports/top-services)):
   * Backed by `vw_top_services`.
   * Uses `RANK() OVER (ORDER BY SUM(quantity) DESC)` to display the most requested guest services and revenue generated.

---

## 3. Academic Concept Defense (L01–L14 Syllabus Q&A)

| Question / Concept | Architectural Answer to Give the Lecturer |
|---|---|
| **Why not compute bill totals in Node.js?** | *Database-First Rule (L05/L08):* Financial computations must have a single source of truth to avoid race conditions and float rounding errors. Totals and balances are computed inside PostgreSQL via `vw_invoice_totals` and stored procedures using exact `NUMERIC(12,2)`. |
| **How did you normalize the ERD?** | *Normalization (L04):* The initial SRS had amenities as a comma-separated text string. We normalized this into `amenity` and junction table `room_type_amenity` (eliminating 1NF violation). All tables satisfy 3NF/BCNF. |
| **How is double-booking prevented concurrently?** | *Concurrency Control (L11/L12):* We use `SELECT ... FOR UPDATE` inside `sp_create_reservation` to acquire row-level locks on the requested room before checking for overlapping date ranges. |
| **Why are prices copied to `service_usage`?** | *Historical Preservation (L02/L03):* Catalog prices change over time. By storing `charged_price` on `service_usage`, old invoices remain historically accurate regardless of future price hikes. |
| **How is referential integrity preserved?** | *Integrity Constraints (L03):* Foreign keys use `ON DELETE RESTRICT` so historical records, invoices, or reservations can never be accidentally orphaned. |
