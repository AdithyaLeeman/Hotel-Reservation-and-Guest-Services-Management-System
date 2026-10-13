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

// Staff roles - subset of UserRole for type narrowing in RBAC checks.
export type StaffRole = Exclude<UserRole, 'Guest'>;

export function isStaffRole(role: string | undefined): role is StaffRole {
  return role === 'Receptionist' || role === 'Manager' || role === 'Admin';
}

// Manager-and-above roles - for report and admin access checks.
export type ManagerRole = 'Manager' | 'Admin';

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
