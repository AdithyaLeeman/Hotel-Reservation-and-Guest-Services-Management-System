# docs/17 — System Operation Guide

## Starting the System

```bash
# 1. Ensure PostgreSQL is running
# 2. Start the Next.js dev server
npm run dev
# Available at: http://localhost:3000
```

## First-Time Setup
```bash
npm install
cp .env.example .env.local
# Edit .env.local with your database credentials
npm run migrate
npm run seed
npm run dev
```

## Portal Entry Points

| Portal | URL | Use |
|---|---|---|
| Public / home | http://localhost:3000 | Hotel info, availability search |
| Guest register | http://localhost:3000/guest/register | New guest signup |
| Guest login | http://localhost:3000/guest/login | Guest session |
| Staff login | http://localhost:3000/staff/login | Staff/management session |

## Seeded Users (Development Only)

After running `npm run seed`:

| Role | Username | Password | Branch |
|---|---|---|---|
| Admin | admin | (see .env.local or team lead) | All |
| Manager | manager_cmb | (see team lead) | Colombo |
| Receptionist | recep_cmb | (see team lead) | Colombo |
| Guest | guest_demo | (see team lead) | — |

## Common Operations

### Create a Reservation (Staff)
1. Log in as Receptionist or Manager
2. Navigate to Staff → Reservations → New Reservation
3. Select branch, check-in/out dates
4. Select available rooms
5. Submit — system calls `sp_create_reservation()` atomically

### Check In
1. Staff → Reservations → Find reservation (status: Booked)
2. Click Check In
3. System calls `sp_check_in()` — room(s) become Occupied

### Log Service Usage
1. Staff → Reservations → Checked-in reservation
2. Navigate to Services tab
3. Select service, quantity → Submit
4. System calls `sp_log_service_usage()` — price snapshot captured

### Process Payment
1. Guest: My Reservations → Reservation Detail → Pay
2. Or Staff: Reservations → [id] → Process Payment
3. Enter amount and payment method
4. System calls `sp_post_payment()` — idempotency checked

### Checkout
1. Staff → Reservations → [id] → Checkout
2. System calls `sp_checkout()` — fails if outstanding_balance > 0
3. On success: room(s) become Available, reservation status = CheckedOut

### View Reports
1. Log in as Manager or Admin
2. Staff → Reports
3. Select report type and date range

## Resetting the Database

```bash
npm run db:reset
# Drops and recreates hrgsms database, runs all migrations and seeds
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| 409 on checkout | Outstanding balance > 0 | Process remaining payment first |
| 409 on booking | Room already booked for those dates | Choose different room or dates |
| 401 on staff page | Staff session expired | Re-login at /staff/login |
| 500 on any route | DB not running or migration missing | Check pg status, run npm run migrate |
