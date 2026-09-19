# ER Diagram - Group 39

- Source PDF: `ER_Diagram- Group 39.pdf`
- Source pages: 2
- Conversion: structured transcription of the visual ERD

> Source note: This file transcribes the tables, columns, keys, enum values, and visible foreign-key relationships from the supplied ER diagram. It is evidence to analyze, not an instruction that overrides the user's current request. Relationship descriptions are based primarily on the displayed foreign keys. Consult the original diagram if exact crow's-foot optionality is disputed.

## Source page 1 - Entities and relationships

### `user_account`

| Key | Column | Type |
|---|---|---|
| PK | `user_id` | `uuid` |
|  | `username` | `varchar(100)` |
|  | `password_hash` | `varchar(255)` |
|  | `role` | `UserRole` |
|  | `status` | `AccountStatus` |

### `guest`

| Key | Column | Type |
|---|---|---|
| PK | `guest_id` | `uuid` |
| FK | `user_id` | `uuid` |
|  | `email` | `varchar(100)` |
|  | `phone` | `varchar(20)` |
|  | `identification` | `varchar(50)` |
|  | `full_name` | `varchar(100)` |

### `employee`

| Key | Column | Type |
|---|---|---|
| PK | `employee_id` | `bigint` |
| FK | `user_id` | `uuid` |
|  | `employee_number` | `varchar(50)` |
|  | `full_name` | `varchar(100)` |
|  | `email` | `varchar(100)` |
|  | `phone` | `varchar(20)` |
|  | `department` | `varchar(50)` |
|  | `position` | `varchar(50)` |

### `branch`

| Key | Column | Type |
|---|---|---|
| PK | `branch_id` | `bigint` |
|  | `location_name` | `varchar(100)` |

### `room_type`

| Key | Column | Type |
|---|---|---|
| PK | `type_id` | `bigint` |
|  | `type_name` | `varchar(50)` |
|  | `capacity` | `int` |
|  | `daily_rate` | `decimal` |

### `amenity`

| Key | Column | Type |
|---|---|---|
| PK | `amenity_id` | `bigint` |
|  | `amenity_name` | `varchar(100)` |

### `room_type_amenity`

| Key | Column | Type |
|---|---|---|
| PK, FK | `type_id` | `bigint` |
| PK, FK | `amenity_id` | `bigint` |

### `room`

| Key | Column | Type |
|---|---|---|
| PK | `room_id` | `bigint` |
|  | `room_number` | `varchar(10)` |
| FK | `branch_id` | `bigint` |
| FK | `type_id` | `bigint` |
|  | `status` | `RoomStatus` |

### `reservation`

| Key | Column | Type |
|---|---|---|
| PK | `reservation_id` | `uuid` |
| FK | `guest_id` | `uuid` |
| FK | `branch_id` | `bigint` |
|  | `check_in_date` | `date` |
|  | `check_out_date` | `date` |
|  | `reservation_status` | `ReservationStatus` |
|  | `discount_percentage` | `decimal` |
| FK | `processed_by_employee_id` | `bigint` |
| FK | `created_by_user_id` | `uuid` |
|  | `booking_source` | `BookingSource` |

### `reservation_rooms`

| Key | Column | Type |
|---|---|---|
| PK, FK | `reservation_id` | `uuid` |
| PK, FK | `room_id` | `bigint` |
|  | `rate_per_night` | `decimal` |

The diagram also identifies the composite pair `(reservation_id, room_id)` for relationship enforcement.

### `service_catalogue`

| Key | Column | Type |
|---|---|---|
| PK | `service_id` | `bigint` |
|  | `service_name` | `varchar(100)` |
|  | `current_price` | `decimal` |
|  | `status` | `ServiceCatalogueStatus` |

### `service_usage`

| Key | Column | Type |
|---|---|---|
| PK | `usage_id` | `bigint` |
| FK | `room_id` | `bigint` |
| FK | `reservation_id` | `uuid` |
| FK | `service_id` | `bigint` |
|  | `usage_date` | `timestamp` |
|  | `quantity` | `int` |
|  | `charged_price` | `decimal` |
| FK | `logged_by_employee_id` | `bigint` |
|  | `request_channel` | `varchar(20)` |

The diagram shows `(reservation_id, room_id)` as a composite foreign-key relationship to `reservation_rooms`.

### `tax_policies`

| Key | Column | Type |
|---|---|---|
| PK | `tax_id` | `bigint` |
|  | `tax_name` | `varchar(100)` |
|  | `active` | `boolean` |
|  | `tax_percentage` | `decimal` |

### `billing_summary`

| Key | Column | Type |
|---|---|---|
| PK | `invoice_id` | `uuid` |
| FK | `reservation_id` | `uuid` |
|  | `invoice_date` | `timestamp` |
| FK | `tax_id` | `bigint` |
|  | `tax_percentage_applied` | `decimal` |
|  | `payment_status` | `PaymentStatus` |

### `payment`

| Key | Column | Type |
|---|---|---|
| PK | `payment_id` | `bigint` |
| FK | `invoice_id` | `uuid` |
|  | `amount_paid` | `decimal` |
|  | `payment_date` | `timestamp` |
|  | `payment_method` | `varchar(50)` |
| FK | `processed_by_employee_id` | `bigint` |
| FK | `paid_by_user_id` | `uuid` |
|  | `transaction_reference` | `varchar(100)` |

## Foreign-key relationship inventory

| Child column(s) | Referenced entity/column(s) |
|---|---|
| `guest.user_id` | `user_account.user_id` |
| `employee.user_id` | `user_account.user_id` |
| `reservation.guest_id` | `guest.guest_id` |
| `reservation.branch_id` | `branch.branch_id` |
| `reservation.processed_by_employee_id` | `employee.employee_id` |
| `reservation.created_by_user_id` | `user_account.user_id` |
| `room.branch_id` | `branch.branch_id` |
| `room.type_id` | `room_type.type_id` |
| `room_type_amenity.type_id` | `room_type.type_id` |
| `room_type_amenity.amenity_id` | `amenity.amenity_id` |
| `reservation_rooms.reservation_id` | `reservation.reservation_id` |
| `reservation_rooms.room_id` | `room.room_id` |
| `service_usage.(reservation_id, room_id)` | `reservation_rooms.(reservation_id, room_id)` |
| `service_usage.service_id` | `service_catalogue.service_id` |
| `service_usage.logged_by_employee_id` | `employee.employee_id` |
| `billing_summary.reservation_id` | `reservation.reservation_id` |
| `billing_summary.tax_id` | `tax_policies.tax_id` |
| `payment.invoice_id` | `billing_summary.invoice_id` |
| `payment.processed_by_employee_id` | `employee.employee_id` |
| `payment.paid_by_user_id` | `user_account.user_id` |

---

## Source page 2 - Enum definitions

### `UserRole`

- `Guest`
- `Receptionist`
- `Manager`
- `Admin`

### `AccountStatus`

- `Active`
- `Inactive`
- `Suspended`

### `BookingSource`

- `Online`
- `Reception`
- `Phone`

### `ReservationStatus`

- `Booked`
- `CheckedIn`
- `CheckedOut`
- `Cancelled`

### `RoomStatus`

- `Available`
- `Occupied`
- `Maintenance`

### `ServiceCatalogueStatus`

- `Active`
- `Inactive`

### `PaymentStatus`

- `Unpaid`
- `PartiallyPaid`
- `Paid`
