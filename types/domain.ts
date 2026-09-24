/**
 * Domain model types — TypeScript representations of DB row shapes.
 *
 * Convention:
 * - Types here match DB column names (snake_case mapped from pg result rows)
 * - Use string for NUMERIC(12,2) money values received from pg
 * - Use string for UUID values
 * - Use string for DATE values (ISO 8601 format from pg)
 * - Use string for TIMESTAMP WITH TIME ZONE values
 *
 * See docs/21_shared-contracts.md Section 3 (money) and Section 4 (dates).
 *
 * TODO: Add domain types as each member builds their domain layer.
 * Place complex domain types in types/domain/ subdirectory.
 */

import type {
  UserRole,
  AccountStatus,
  BookingSource,
  ReservationStatus,
  RoomStatus,
  ServiceCatalogueStatus,
  PaymentStatus,
} from './enums';

// --- Auth / User ---

export interface UserAccount {
  user_id: string;
  username: string;
  role: UserRole;
  status: AccountStatus;
  // password_hash is never returned from queries — excluded here
}

export interface Guest {
  guest_id: string;
  user_id: string;
  email: string;
  phone: string | null;
  identification: string | null;
  full_name: string;
}

export interface Employee {
  employee_id: number;
  user_id: string;
  employee_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  position: string | null;
}

// --- Hotel Structure ---

export interface Branch {
  branch_id: number;
  location_name: string;
}

export interface RoomType {
  type_id: number;
  type_name: string;
  capacity: number;
  daily_rate: string; // NUMERIC(12,2) → string from pg
}

export interface Amenity {
  amenity_id: number;
  amenity_name: string;
}

export interface Room {
  room_id: number;
  room_number: string;
  branch_id: number;
  type_id: number;
  status: RoomStatus;
}

// --- Reservations ---

export interface Reservation {
  reservation_id: string;
  guest_id: string;
  branch_id: number;
  check_in_date: string; // DATE → ISO string
  check_out_date: string; // DATE → ISO string
  reservation_status: ReservationStatus;
  discount_percentage: string | null; // NUMERIC(5,2) → string or null
  processed_by_employee_id: number | null;
  created_by_user_id: string;
  booking_source: BookingSource;
  created_at: string; // TIMESTAMP WITH TIME ZONE → ISO string
}

export interface ReservationRoom {
  reservation_id: string;
  room_id: number;
  rate_per_night: string; // NUMERIC(12,2) — historical snapshot
}

// --- Services ---

export interface ServiceCatalogue {
  service_id: number;
  service_name: string;
  current_price: string; // NUMERIC(12,2)
  status: ServiceCatalogueStatus;
}

export interface ServiceUsage {
  usage_id: number;
  room_id: number;
  reservation_id: string;
  service_id: number;
  usage_date: string;
  quantity: number;
  charged_price: string; // NUMERIC(12,2) — price snapshot, immutable
  logged_by_employee_id: number;
  request_channel: string | null;
}

// --- Billing ---

export interface TaxPolicy {
  tax_id: number;
  tax_name: string;
  tax_percentage: string; // NUMERIC(5,2)
  active: boolean;
}

export interface BillingSummary {
  invoice_id: string;
  reservation_id: string;
  invoice_date: string;
  tax_id: number;
  tax_percentage_applied: string; // NUMERIC(5,2) — snapshot
  payment_status: PaymentStatus;
}

/**
 * The authoritative billing view result.
 * All values come from vw_invoice_totals — NEVER recomputed in TypeScript.
 *
 * See docs/08_business-rules-and-enforcement.md — Calculation Placement Matrix.
 */
export interface InvoiceTotals {
  invoice_id: string;
  reservation_id: string;
  room_charges: string;      // fn_calc_room_charges() result
  tax_amount: string;        // room_charges × tax_percentage_applied / 100
  service_charges: string;   // fn_calc_service_charges() result
  grand_total: string;       // room + tax + service
  total_paid: string;        // SUM(payment.amount_paid)
  outstanding_balance: string; // grand_total - total_paid — NEVER computed in TS
}

// --- Payments ---

export interface Payment {
  payment_id: number;
  invoice_id: string;
  amount_paid: string; // NUMERIC(12,2)
  payment_date: string;
  payment_method: string;
  processed_by_employee_id: number | null;
  paid_by_user_id: string;
  transaction_reference: string | null;
}
