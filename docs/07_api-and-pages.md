# docs/07 — API and Pages

_All route handlers and pages. Detailed contracts in `docs/21_shared-contracts.md`._

## Public Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | None | Public hotel home page |
| GET | `/search` | None | Availability search page |
| GET | `/api/availability?branch_id=&check_in=&check_out=` | None | Returns available rooms |

## Guest API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/guest/register` | None | Guest self-registration |
| POST | `/api/guest/login` | None | Guest login |
| POST | `/api/guest/logout` | Guest | Destroy session |
| GET | `/api/guest/reservations` | Guest | List own reservations |
| POST | `/api/guest/reservations` | Guest | Create reservation |
| GET | `/api/guest/reservations/[id]` | Guest + Owner | Reservation detail + bill |
| DELETE | `/api/guest/reservations/[id]` | Guest + Owner | Cancel reservation |
| GET | `/api/guest/reservations/[id]/invoice` | Guest + Owner | Invoice and payment history |
| POST | `/api/guest/payments` | Guest | Post a payment |

## Staff API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/staff/login` | None | Staff login |
| POST | `/api/staff/logout` | Staff | Destroy session |
| GET | `/api/staff/reservations` | Receptionist+ | List reservations (branch-scoped) |
| POST | `/api/staff/reservations` | Receptionist+ | Create reservation |
| GET | `/api/staff/reservations/[id]` | Receptionist+ | Reservation detail |
| PATCH | `/api/staff/reservations/[id]` | Receptionist+ | Update reservation |
| DELETE | `/api/staff/reservations/[id]` | Receptionist+ | Cancel reservation |
| POST | `/api/staff/checkin` | Receptionist+ | Check in a reservation |
| POST | `/api/staff/checkout` | Receptionist+ | Check out a reservation |
| POST | `/api/staff/services/usage` | Receptionist+ | Log service usage |
| GET | `/api/staff/rooms` | Receptionist+ | List rooms (branch-scoped) |
| POST | `/api/staff/rooms` | Manager+ | Create room |
| PATCH | `/api/staff/rooms/[id]` | Manager+ | Update room (incl. Maintenance) |
| DELETE | `/api/staff/rooms/[id]` | Admin | Delete room |
| GET | `/api/staff/services` | Receptionist+ | List service catalogue |
| POST | `/api/staff/services` | Manager+ | Create service |
| PATCH | `/api/staff/services/[id]` | Manager+ | Update service |
| GET | `/api/staff/reports/occupancy` | Manager+ | Room occupancy report |
| GET | `/api/staff/reports/billing` | Manager+ | Guest billing summary |
| GET | `/api/staff/reports/service-usage` | Manager+ | Service usage breakdown |
| GET | `/api/staff/reports/revenue` | Manager+ | Monthly revenue per branch |
| GET | `/api/staff/reports/top-services` | Manager+ | Top-used services |
| GET | `/api/staff/admin/employees` | Admin | List employees |
| POST | `/api/staff/admin/employees` | Admin | Create employee + user account |
| PATCH | `/api/staff/admin/employees/[id]` | Admin | Update employee |
| GET | `/api/staff/admin/branches` | Admin | List branches |
| POST | `/api/staff/admin/branches` | Admin | Create branch |

## Pages

| Page | Route | Auth | Owner |
|---|---|---|---|
| Home | `/` | Public | M1 |
| Availability Search | `/search` | Public | M2 |
| Guest Register | `/guest/register` | Public | M1 |
| Guest Login | `/guest/login` | Public | M1 |
| My Reservations | `/guest/reservations` | Guest | M3 |
| Reservation Detail | `/guest/reservations/[id]` | Guest + Owner | M3 |
| Staff Login | `/staff/login` | Public | M1 |
| Staff Dashboard | `/staff/dashboard` | Receptionist+ | M1 |
| Staff Reservations | `/staff/reservations` | Receptionist+ | M3 |
| Staff Reservation Detail | `/staff/reservations/[id]` | Receptionist+ | M3 |
| Rooms Management | `/staff/rooms` | Receptionist+ | M2 |
| Reports Dashboard | `/staff/reports` | Manager+ | M5 |
| Admin Panel | `/staff/admin` | Admin | M1 |
