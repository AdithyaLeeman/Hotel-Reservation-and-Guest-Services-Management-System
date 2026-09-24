/**
 * TypeScript mirrors of PostgreSQL enum types.
 *
 * These must stay in sync with the DB enum definitions in:
 * database/migrations/P01-M01-T02-01_create_enums.sql
 *
 * See docs/21_shared-contracts.md Section 5 for the enum contract.
 * Never use raw string literals for these values in business logic — import from here.
 *
 * Lecture alignment: L05 (user-defined types, enum constraints)
 */

export type UserRole = 'Guest' | 'Receptionist' | 'Manager' | 'Admin';

export type AccountStatus = 'Active' | 'Inactive' | 'Suspended';

export type BookingSource = 'Online' | 'Reception' | 'Phone';

export type ReservationStatus =
  | 'Booked'
  | 'CheckedIn'
  | 'CheckedOut'
  | 'Cancelled';

export type RoomStatus = 'Available' | 'Occupied' | 'Maintenance';

export type ServiceCatalogueStatus = 'Active' | 'Inactive';

export type PaymentStatus = 'Unpaid' | 'PartiallyPaid' | 'Paid';

/**
 * Staff roles — subset of UserRole for type narrowing in RBAC checks.
 */
export type StaffRole = Exclude<UserRole, 'Guest'>;

/**
 * Manager-and-above roles — for report and admin access checks.
 */
export type ManagerRole = 'Manager' | 'Admin';

/**
 * SQLSTATE codes used by HRGSMS stored procedures.
 * Document new codes here when adding procedures.
 *
 * See docs/09_database-routines-triggers-views-indexes.md for full procedure SQLSTATE list.
 */
export const SQLSTATE = {
  UNIQUE_VIOLATION: '23505',
  ROOM_OVERLAP: '45001',
  ROOM_BRANCH_MISMATCH: '45002',
  ROOM_IN_MAINTENANCE: '45003',
  NOT_BOOKED_STATUS: '45010',
  NOT_CHECKED_IN: '45011',
  OUTSTANDING_BALANCE: '45030',
  NOT_CHECKED_IN_FOR_CHECKOUT: '45031',
} as const;
