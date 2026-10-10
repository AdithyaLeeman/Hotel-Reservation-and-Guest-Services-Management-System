# docs/10 — Seed Data and Expected Results

## Seed Strategy
Seed data is applied in order after migrations. Files in `database/seeds/`. Each file is named with the task that created it.

## Required Seed Data

### Branches (P01-M01-T03)
| branch_id | location_name |
|---|---|
| 1 | Colombo |
| 2 | Kandy |
| 3 | Galle |

### Room Types (P01-M02-T01)
| type_id | type_name | capacity | daily_rate |
|---|---|---|---|
| 1 | Single | 1 | 5000.00 |
| 2 | Double | 2 | 8000.00 |
| 3 | Suite | 4 | 15000.00 |

### Amenities (P01-M02-T02)
| amenity_id | amenity_name |
|---|---|
| 1 | Wi-Fi |
| 2 | Air Conditioning |
| 3 | Mini Bar |
| 4 | Ocean View |
| 5 | Jacuzzi |

### Room Type Amenities (P01-M02-T02)
- Single: Wi-Fi, Air Conditioning
- Double: Wi-Fi, Air Conditioning, Mini Bar
- Suite: Wi-Fi, Air Conditioning, Mini Bar, Ocean View, Jacuzzi

### Rooms — 15 rooms across 3 branches (P02-M02-T02)

| room_id | room_number | branch_id | type_id | status |
|---|---|---|---|---|
| 1 | 101 | 1 (Colombo) | 1 (Single) | Available |
| 2 | 102 | 1 | 1 | Available |
| 3 | 103 | 1 | 2 (Double) | Available |
| 4 | 104 | 1 | 2 | Available |
| 5 | 201 | 1 | 3 (Suite) | Available |
| 6 | 101 | 2 (Kandy) | 1 | Available |
| 7 | 102 | 2 | 2 | Available |
| 8 | 103 | 2 | 3 | Available |
| 9 | 201 | 2 | 1 | Available |
| 10 | 202 | 2 | 2 | Maintenance |
| 11 | 101 | 3 (Galle) | 1 | Available |
| 12 | 102 | 3 | 2 | Available |
| 13 | 103 | 3 | 3 | Available |
| 14 | 201 | 3 | 1 | Available |
| 15 | 202 | 3 | 2 | Available |

### Service Catalogue (P04-M04-T01)

| service_id | service_name | current_price | status |
|---|---|---|---|
| 1 | Room Service | 500.00 | Active |
| 2 | Spa Treatment | 3000.00 | Active |
| 3 | Laundry | 200.00 | Active |
| 4 | Minibar Usage | 100.00 | Active |
| 5 | Airport Transfer | 2500.00 | Active |
| 6 | Late Checkout | 0.00 | Active |

> Note: Late Checkout `current_price` = 0 because the actual charge is computed as 50% × rate_per_night by the checkout procedure. `service_id = 6` is a reserved system constant.

### Tax Policies (P04-M05-T02)

| tax_id | tax_name | tax_percentage | active |
|---|---|---|---|
| 1 | Government Tourism Tax | 8.00 | true |

### Admin User (P01-M01-T02 seed)
A system admin user must be seeded for the first login. Credentials provided separately (not committed to source).

## Expected Test Scenarios

### Scenario 1: Availability Query
- Guest searches Colombo, 2025-12-01 to 2025-12-03
- Room 10 (Kandy, Maintenance) must never appear
- All 5 Colombo rooms start as Available → all 5 returned

### Scenario 2: Reservation + Overlap Prevention
- Create reservation for room 1 (Colombo Single), 2025-12-01–2025-12-03
- Attempt second reservation for same room, same dates → must fail
- Attempt for overlapping dates (2025-12-02–2025-12-04) → must fail
- Attempt for non-overlapping dates (2025-12-04–2025-12-06) → must succeed

### Scenario 3: Billing Verification
- Reservation: room 3 (Double, LKR 8000/night) × 3 nights = LKR 24000 room charge
- Tax: 24000 × 8% = LKR 1920
- Service: 2 × Room Service (500) = LKR 1000
- Grand total: 24000 + 1920 + 1000 = LKR 26920
- vw_invoice_totals must return outstanding_balance = 26920 before any payment
- After payment of LKR 10000: outstanding_balance = 16920
- After second payment of LKR 16920: outstanding_balance = 0 → checkout unblocked

### Scenario 4: Checkout Block
- Attempt checkout with outstanding_balance > 0 → HTTP 409 returned

### Scenario 5: Reports
- Monthly revenue view for Colombo December 2025 includes Scenario 3 grand total
