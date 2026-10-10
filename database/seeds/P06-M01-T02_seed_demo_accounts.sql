-- =============================================================================
-- Seed:      P06-M01-T02_seed_demo_accounts.sql
-- Owner:     Member 1 (Leeman K.A.R., 240386C)
-- Phase:     Phase 6 Integration - Full Demo Seed Data
-- Purpose:   Seed staff accounts (Admin, Manager, Receptionists) and 5 Guests
-- Password:  SkyNest@2026 (for all seeded demo accounts)
-- =============================================================================

-- 1. Staff User Accounts (Clean short usernames)
INSERT INTO user_account (user_id, username, password_hash, role, status) VALUES
  ('11111111-1111-4111-8111-111111111101', 'admin', '$2b$12$8b0VmNdlFs.rmaP2kgAdAuNFu2tlSug1qjYh2AKBkXYhdjdJAVGYO', 'Admin', 'Active'),
  ('11111111-1111-4111-8111-111111111102', 'manager', '$2b$12$8b0VmNdlFs.rmaP2kgAdAuNFu2tlSug1qjYh2AKBkXYhdjdJAVGYO', 'Manager', 'Active'),
  ('11111111-1111-4111-8111-111111111103', 'reception_colombo', '$2b$12$8b0VmNdlFs.rmaP2kgAdAuNFu2tlSug1qjYh2AKBkXYhdjdJAVGYO', 'Receptionist', 'Active'),
  ('11111111-1111-4111-8111-111111111104', 'reception_kandy', '$2b$12$8b0VmNdlFs.rmaP2kgAdAuNFu2tlSug1qjYh2AKBkXYhdjdJAVGYO', 'Receptionist', 'Active')
ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, status = 'Active';

-- 2. Staff Employee Profiles
INSERT INTO employee (user_id, branch_id, employee_number, full_name, email, phone, department, position) VALUES
  ('11111111-1111-4111-8111-111111111101', 1, 'EMP-ADM-001', 'Kasun Perera', 'admin@skynest.com', '+94770000001', 'Management', 'System Administrator'),
  ('11111111-1111-4111-8111-111111111102', 1, 'EMP-MGR-001', 'Dilani Wickramasinghe', 'manager@skynest.com', '+94770000002', 'Operations', 'General Manager'),
  ('11111111-1111-4111-8111-111111111103', 1, 'EMP-REC-001', 'Nimal Fernando', 'reception.cmb@skynest.com', '+94770000003', 'Front Desk', 'Front Desk Officer'),
  ('11111111-1111-4111-8111-111111111104', 2, 'EMP-REC-002', 'Saman Bandara', 'reception.kdy@skynest.com', '+94770000004', 'Front Desk', 'Front Desk Officer')
ON CONFLICT (user_id) DO NOTHING;

-- 3. 5 Guest User Accounts (Clean short usernames)
INSERT INTO user_account (user_id, username, password_hash, role, status) VALUES
  ('22222222-2222-4222-8222-222222222201', 'john.doe', '$2b$12$8b0VmNdlFs.rmaP2kgAdAuNFu2tlSug1qjYh2AKBkXYhdjdJAVGYO', 'Guest', 'Active'),
  ('22222222-2222-4222-8222-222222222202', 'jane.smith', '$2b$12$8b0VmNdlFs.rmaP2kgAdAuNFu2tlSug1qjYh2AKBkXYhdjdJAVGYO', 'Guest', 'Active'),
  ('22222222-2222-4222-8222-222222222203', 'kamal.perera', '$2b$12$8b0VmNdlFs.rmaP2kgAdAuNFu2tlSug1qjYh2AKBkXYhdjdJAVGYO', 'Guest', 'Active'),
  ('22222222-2222-4222-8222-222222222204', 'anura.silva', '$2b$12$8b0VmNdlFs.rmaP2kgAdAuNFu2tlSug1qjYh2AKBkXYhdjdJAVGYO', 'Guest', 'Active'),
  ('22222222-2222-4222-8222-222222222205', 'sarah.williams', '$2b$12$8b0VmNdlFs.rmaP2kgAdAuNFu2tlSug1qjYh2AKBkXYhdjdJAVGYO', 'Guest', 'Active')
ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, status = 'Active';

-- 4. 5 Guest Profiles
INSERT INTO guest (guest_id, user_id, full_name, email, phone, identification) VALUES
  ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', 'John Doe', 'john.doe@gmail.com', '+94771234567', 'NIC198512345678'),
  ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222202', 'Jane Smith', 'jane.smith@gmail.com', '+94772345678', 'PASS-N8273641'),
  ('33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222203', 'Kamal Perera', 'kamal.perera@gmail.com', '+94773456789', 'NIC199034567890'),
  ('33333333-3333-4333-8333-333333333304', '22222222-2222-4222-8222-222222222204', 'Anura Silva', 'anura.silva@gmail.com', '+94774567890', 'NIC197845678901'),
  ('33333333-3333-4333-8333-333333333305', '22222222-2222-4222-8222-222222222205', 'Sarah Williams', 'sarah.williams@gmail.com', '+94775678901', 'PASS-G5491028')
ON CONFLICT (user_id) DO NOTHING;
