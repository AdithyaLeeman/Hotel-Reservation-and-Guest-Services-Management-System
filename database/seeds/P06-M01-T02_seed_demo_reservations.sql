-- =============================================================================
-- Seed:      P06-M01-T02_seed_demo_reservations.sql
-- Owner:     Member 1 (Leeman K.A.R., 240386C)
-- Phase:     Phase 6 Integration - Full Demo Seed Data
-- Purpose:   Seed 8 realistic reservations, service usage, invoices, and payments
--            satisfying the project brief requirement:
--            "5 guests with 8 total bookings across varying check-in/check-out
--             periods and statuses, room availability records, service usage,
--             and at least 3 partial payments"
-- =============================================================================

-- Clean up any existing demo reservations first to ensure idempotency
DELETE FROM payment WHERE invoice_id IN (
  SELECT invoice_id FROM billing_summary WHERE reservation_id IN (
    '44444444-4444-4444-8444-444444444401',
    '44444444-4444-4444-8444-444444444402',
    '44444444-4444-4444-8444-444444444403',
    '44444444-4444-4444-8444-444444444404',
    '44444444-4444-4444-8444-444444444405',
    '44444444-4444-4444-8444-444444444406',
    '44444444-4444-4444-8444-444444444407',
    '44444444-4444-4444-8444-444444444408'
  )
);
DELETE FROM billing_summary WHERE reservation_id IN (
  '44444444-4444-4444-8444-444444444401',
  '44444444-4444-4444-8444-444444444402',
  '44444444-4444-4444-8444-444444444403',
  '44444444-4444-4444-8444-444444444404',
  '44444444-4444-4444-8444-444444444405',
  '44444444-4444-4444-8444-444444444406',
  '44444444-4444-4444-8444-444444444407',
  '44444444-4444-4444-8444-444444444408'
);
DELETE FROM service_usage WHERE reservation_id IN (
  '44444444-4444-4444-8444-444444444401',
  '44444444-4444-4444-8444-444444444402',
  '44444444-4444-4444-8444-444444444403',
  '44444444-4444-4444-8444-444444444404',
  '44444444-4444-4444-8444-444444444405',
  '44444444-4444-4444-8444-444444444406',
  '44444444-4444-4444-8444-444444444407',
  '44444444-4444-4444-8444-444444444408'
);
DELETE FROM reservation_rooms WHERE reservation_id IN (
  '44444444-4444-4444-8444-444444444401',
  '44444444-4444-4444-8444-444444444402',
  '44444444-4444-4444-8444-444444444403',
  '44444444-4444-4444-8444-444444444404',
  '44444444-4444-4444-8444-444444444405',
  '44444444-4444-4444-8444-444444444406',
  '44444444-4444-4444-8444-444444444407',
  '44444444-4444-4444-8444-444444444408'
);
DELETE FROM reservation_audit_log WHERE reservation_id IN (
  '44444444-4444-4444-8444-444444444401',
  '44444444-4444-4444-8444-444444444402',
  '44444444-4444-4444-8444-444444444403',
  '44444444-4444-4444-8444-444444444404',
  '44444444-4444-4444-8444-444444444405',
  '44444444-4444-4444-8444-444444444406',
  '44444444-4444-4444-8444-444444444407',
  '44444444-4444-4444-8444-444444444408'
);
DELETE FROM reservation WHERE reservation_id IN (
  '44444444-4444-4444-8444-444444444401',
  '44444444-4444-4444-8444-444444444402',
  '44444444-4444-4444-8444-444444444403',
  '44444444-4444-4444-8444-444444444404',
  '44444444-4444-4444-8444-444444444405',
  '44444444-4444-4444-8444-444444444406',
  '44444444-4444-4444-8444-444444444407',
  '44444444-4444-4444-8444-444444444408'
);

-- =============================================================================
-- 1. Insert 8 Reservations
-- =============================================================================
INSERT INTO reservation (
  reservation_id, guest_id, branch_id, check_in_date, check_out_date,
  reservation_status, discount_percentage, processed_by_employee_id, created_by_user_id, booking_source, created_at
) VALUES
  -- Res 1: John Doe, Colombo, CheckedOut
  ('44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333301', 1, '2026-09-10', '2026-09-12', 'CheckedOut', NULL, 1, '22222222-2222-4222-8222-222222222201', 'Online', '2026-09-01 10:00:00+00'),
  
  -- Res 2: Jane Smith, Colombo, CheckedIn (currently staying in Suite 201)
  ('44444444-4444-4444-8444-444444444402', '33333333-3333-4333-8333-333333333302', 1, CURRENT_DATE - 1, CURRENT_DATE + 2, 'CheckedIn', NULL, 1, '22222222-2222-4222-8222-222222222202', 'Online', CURRENT_TIMESTAMP - INTERVAL '2 days'),
  
  -- Res 3: Kamal Perera, Kandy, CheckedIn (currently staying in Room 102)
  ('44444444-4444-4444-8444-444444444403', '33333333-3333-4333-8333-333333333303', 2, CURRENT_DATE, CURRENT_DATE + 2, 'CheckedIn', NULL, 2, '22222222-2222-4222-8222-222222222203', 'Reception', CURRENT_TIMESTAMP - INTERVAL '1 day'),
  
  -- Res 4: Anura Silva, Galle, Booked (upcoming deposit paid)
  ('44444444-4444-4444-8444-444444444404', '33333333-3333-4333-8333-333333333304', 3, CURRENT_DATE + 10, CURRENT_DATE + 12, 'Booked', NULL, NULL, '22222222-2222-4222-8222-222222222204', 'Online', CURRENT_TIMESTAMP - INTERVAL '3 days'),
  
  -- Res 5: Sarah Williams, Colombo, Booked (upcoming, unpaid)
  ('44444444-4444-4444-8444-444444444405', '33333333-3333-4333-8333-333333333305', 1, CURRENT_DATE + 20, CURRENT_DATE + 23, 'Booked', NULL, NULL, '22222222-2222-4222-8222-222222222205', 'Online', CURRENT_TIMESTAMP - INTERVAL '4 days'),
  
  -- Res 6: John Doe, Kandy, CheckedOut (August historical stay)
  ('44444444-4444-4444-8444-444444444406', '33333333-3333-4333-8333-333333333301', 2, '2026-08-05', '2026-08-07', 'CheckedOut', NULL, 2, '22222222-2222-4222-8222-222222222201', 'Online', '2026-08-01 08:30:00+00'),
  
  -- Res 7: Jane Smith, Galle, CheckedOut (August historical stay)
  ('44444444-4444-4444-8444-444444444407', '33333333-3333-4333-8333-333333333302', 3, '2026-08-20', '2026-08-23', 'CheckedOut', NULL, 1, '22222222-2222-4222-8222-222222222202', 'Phone', '2026-08-15 14:00:00+00'),
  
  -- Res 8: Kamal Perera, Colombo, Cancelled (Cancelled prior to stay)
  ('44444444-4444-4444-8444-444444444408', '33333333-3333-4333-8333-333333333303', 1, '2026-09-01', '2026-09-03', 'Cancelled', NULL, 1, '22222222-2222-4222-8222-222222222203', 'Online', '2026-08-25 09:15:00+00');

-- =============================================================================
-- 2. Link Reservations to Rooms (reservation_rooms)
-- =============================================================================
-- Res 1: Colombo 103 (Double)
INSERT INTO reservation_rooms (reservation_id, room_id, rate_per_night)
SELECT '44444444-4444-4444-8444-444444444401', room_id, 8000.00 FROM room WHERE branch_id = 1 AND room_number = '103';

-- Res 2: Colombo 201 (Suite)
INSERT INTO reservation_rooms (reservation_id, room_id, rate_per_night)
SELECT '44444444-4444-4444-8444-444444444402', room_id, 15000.00 FROM room WHERE branch_id = 1 AND room_number = '201';

-- Res 3: Kandy 102 (Double)
INSERT INTO reservation_rooms (reservation_id, room_id, rate_per_night)
SELECT '44444444-4444-4444-8444-444444444403', room_id, 8000.00 FROM room WHERE branch_id = 2 AND room_number = '102';

-- Res 4: Galle 103 (Suite)
INSERT INTO reservation_rooms (reservation_id, room_id, rate_per_night)
SELECT '44444444-4444-4444-8444-444444444404', room_id, 15000.00 FROM room WHERE branch_id = 3 AND room_number = '103';

-- Res 5: Colombo 101 (Single)
INSERT INTO reservation_rooms (reservation_id, room_id, rate_per_night)
SELECT '44444444-4444-4444-8444-444444444405', room_id, 5000.00 FROM room WHERE branch_id = 1 AND room_number = '101';

-- Res 6: Kandy 101 (Single)
INSERT INTO reservation_rooms (reservation_id, room_id, rate_per_night)
SELECT '44444444-4444-4444-8444-444444444406', room_id, 5000.00 FROM room WHERE branch_id = 2 AND room_number = '101';

-- Res 7: Galle 102 (Double)
INSERT INTO reservation_rooms (reservation_id, room_id, rate_per_night)
SELECT '44444444-4444-4444-8444-444444444407', room_id, 8000.00 FROM room WHERE branch_id = 3 AND room_number = '102';

-- Res 8: Colombo 102 (Single)
INSERT INTO reservation_rooms (reservation_id, room_id, rate_per_night)
SELECT '44444444-4444-4444-8444-444444444408', room_id, 5000.00 FROM room WHERE branch_id = 1 AND room_number = '102';

-- =============================================================================
-- 3. Synchronize Physical Room Status for CheckedIn Reservations
-- =============================================================================
UPDATE room SET status = 'Occupied' WHERE branch_id = 1 AND room_number = '201';
UPDATE room SET status = 'Occupied' WHERE branch_id = 2 AND room_number = '102';

-- =============================================================================
-- 4. Service Usages (Historical Snapshot Pricing)
-- =============================================================================
-- Res 1: Room Service (1200.00)
INSERT INTO service_usage (room_id, reservation_id, service_id, usage_date, quantity, charged_price, logged_by_employee_id, request_channel)
SELECT r.room_id, '44444444-4444-4444-8444-444444444401', s.service_id, '2026-09-11 12:30:00+00', 1, 1200.00, 1, 'Room Intercom'
FROM room r, service_catalogue s
WHERE r.branch_id = 1 AND r.room_number = '103' AND s.service_name = 'Room Service';

-- Res 2: Spa Treatment (5000.00) + Minibar Usage (250.00)
INSERT INTO service_usage (room_id, reservation_id, service_id, usage_date, quantity, charged_price, logged_by_employee_id, request_channel)
SELECT r.room_id, '44444444-4444-4444-8444-444444444402', s.service_id, CURRENT_TIMESTAMP - INTERVAL '1 day', 1, 5000.00, 1, 'In Person'
FROM room r, service_catalogue s
WHERE r.branch_id = 1 AND r.room_number = '201' AND s.service_name = 'Spa Treatment';

INSERT INTO service_usage (room_id, reservation_id, service_id, usage_date, quantity, charged_price, logged_by_employee_id, request_channel)
SELECT r.room_id, '44444444-4444-4444-8444-444444444402', s.service_id, CURRENT_TIMESTAMP - INTERVAL '12 hours', 1, 250.00, 1, 'Housekeeping'
FROM room r, service_catalogue s
WHERE r.branch_id = 1 AND r.room_number = '201' AND s.service_name = 'Minibar Usage';

-- Res 3: Laundry (800.00)
INSERT INTO service_usage (room_id, reservation_id, service_id, usage_date, quantity, charged_price, logged_by_employee_id, request_channel)
SELECT r.room_id, '44444444-4444-4444-8444-444444444403', s.service_id, CURRENT_TIMESTAMP - INTERVAL '6 hours', 1, 800.00, 2, 'Front Desk'
FROM room r, service_catalogue s
WHERE r.branch_id = 2 AND r.room_number = '102' AND s.service_name = 'Laundry';

-- Res 6: Airport Transfer (3500.00)
INSERT INTO service_usage (room_id, reservation_id, service_id, usage_date, quantity, charged_price, logged_by_employee_id, request_channel)
SELECT r.room_id, '44444444-4444-4444-8444-444444444406', s.service_id, '2026-08-05 14:00:00+00', 1, 3500.00, 2, 'Concierge'
FROM room r, service_catalogue s
WHERE r.branch_id = 2 AND r.room_number = '101' AND s.service_name = 'Airport Transfer';

-- Res 7: Room Service (1200.00) + Minibar Usage (250.00)
INSERT INTO service_usage (room_id, reservation_id, service_id, usage_date, quantity, charged_price, logged_by_employee_id, request_channel)
SELECT r.room_id, '44444444-4444-4444-8444-444444444407', s.service_id, '2026-08-21 20:00:00+00', 1, 1200.00, 1, 'Room Intercom'
FROM room r, service_catalogue s
WHERE r.branch_id = 3 AND r.room_number = '102' AND s.service_name = 'Room Service';

INSERT INTO service_usage (room_id, reservation_id, service_id, usage_date, quantity, charged_price, logged_by_employee_id, request_channel)
SELECT r.room_id, '44444444-4444-4444-8444-444444444407', s.service_id, '2026-08-22 11:00:00+00', 1, 250.00, 1, 'Housekeeping'
FROM room r, service_catalogue s
WHERE r.branch_id = 3 AND r.room_number = '102' AND s.service_name = 'Minibar Usage';

-- =============================================================================
-- 5. Invoices (billing_summary with active tax snapshot)
-- =============================================================================
INSERT INTO billing_summary (invoice_id, reservation_id, invoice_date, tax_id, tax_percentage_applied, payment_status) VALUES
  ('55555555-5555-4555-8555-555555555501', '44444444-4444-4444-8444-444444444401', '2026-09-12 11:00:00+00', 1, 8.00, 'Paid'),
  ('55555555-5555-4555-8555-555555555502', '44444444-4444-4444-8444-444444444402', CURRENT_TIMESTAMP - INTERVAL '1 day', 1, 8.00, 'PartiallyPaid'),
  ('55555555-5555-4555-8555-555555555503', '44444444-4444-4444-8444-444444444403', CURRENT_TIMESTAMP, 1, 8.00, 'PartiallyPaid'),
  ('55555555-5555-4555-8555-555555555504', '44444444-4444-4444-8444-444444444404', CURRENT_TIMESTAMP - INTERVAL '3 days', 1, 8.00, 'PartiallyPaid'),
  ('55555555-5555-4555-8555-555555555505', '44444444-4444-4444-8444-444444444405', CURRENT_TIMESTAMP - INTERVAL '4 days', 1, 8.00, 'Unpaid'),
  ('55555555-5555-4555-8555-555555555506', '44444444-4444-4444-8444-444444444406', '2026-08-07 10:30:00+00', 1, 8.00, 'Paid'),
  ('55555555-5555-4555-8555-555555555507', '44444444-4444-4444-8444-444444444407', '2026-08-23 11:15:00+00', 1, 8.00, 'Paid');

-- =============================================================================
-- 6. Payments (including AT LEAST 3 partial payments)
-- =============================================================================
-- Res 1: Paid in full (10000.00 partial + 8480.00 final = 18480.00)
INSERT INTO payment (invoice_id, amount_paid, payment_date, payment_method, processed_by_employee_id, paid_by_user_id, transaction_reference) VALUES
  ('55555555-5555-4555-8555-555555555501', 10000.00, '2026-09-10 14:00:00+00', 'Cash', 1, '22222222-2222-4222-8222-222222222201', 'TXN-RES1-PARTIAL'),
  ('55555555-5555-4555-8555-555555555501', 8480.00,  '2026-09-12 10:45:00+00', 'Credit Card', 1, '22222222-2222-4222-8222-222222222201', 'TXN-RES1-FINAL');

-- Res 2: PARTIAL PAYMENT 1 (25000.00 paid out of 53850.00 -> balance 28850.00)
INSERT INTO payment (invoice_id, amount_paid, payment_date, payment_method, processed_by_employee_id, paid_by_user_id, transaction_reference) VALUES
  ('55555555-5555-4555-8555-555555555502', 25000.00, CURRENT_TIMESTAMP - INTERVAL '1 day', 'Credit Card', 1, '22222222-2222-4222-8222-222222222202', 'TXN-RES2-PARTIAL');

-- Res 3: PARTIAL PAYMENT 2 (10000.00 paid out of 18080.00 -> balance 8080.00)
INSERT INTO payment (invoice_id, amount_paid, payment_date, payment_method, processed_by_employee_id, paid_by_user_id, transaction_reference) VALUES
  ('55555555-5555-4555-8555-555555555503', 10000.00, CURRENT_TIMESTAMP, 'Bank Transfer', 2, '22222222-2222-4222-8222-222222222203', 'TXN-RES3-PARTIAL');

-- Res 4: PARTIAL PAYMENT 3 (15000.00 deposit paid out of 32400.00 -> balance 17400.00)
INSERT INTO payment (invoice_id, amount_paid, payment_date, payment_method, processed_by_employee_id, paid_by_user_id, transaction_reference) VALUES
  ('55555555-5555-4555-8555-555555555504', 15000.00, CURRENT_TIMESTAMP - INTERVAL '3 days', 'Online Card', NULL, '22222222-2222-4222-8222-222222222204', 'TXN-RES4-DEPOSIT');

-- Res 6: Paid in full (14300.00)
INSERT INTO payment (invoice_id, amount_paid, payment_date, payment_method, processed_by_employee_id, paid_by_user_id, transaction_reference) VALUES
  ('55555555-5555-4555-8555-555555555506', 14300.00, '2026-08-07 10:15:00+00', 'Credit Card', 2, '22222222-2222-4222-8222-222222222201', 'TXN-RES6-FULL');

-- Res 7: Paid in full (27370.00)
INSERT INTO payment (invoice_id, amount_paid, payment_date, payment_method, processed_by_employee_id, paid_by_user_id, transaction_reference) VALUES
  ('55555555-5555-4555-8555-555555555507', 27370.00, '2026-08-23 11:00:00+00', 'Credit Card', 1, '22222222-2222-4222-8222-222222222202', 'TXN-RES7-FULL');
