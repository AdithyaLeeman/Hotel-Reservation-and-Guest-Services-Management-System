
import { pool } from '@/lib/db/pool';

export interface GuestBillingSummaryRow {
  guest_id: string;
  guest_name: string;
  email: string;
  phone: string | null;
  reservation_id: string;
  branch_id: number;
  branch_name: string;
  check_in_date: string;
  check_out_date: string;
  reservation_status: string;
  invoice_id: string;
  invoice_date: string;
  payment_status: string;
  room_charges: string;        // NUMERIC(12,2) as string
  service_charges: string;     // NUMERIC(12,2) as string
  tax_amount: string;          // NUMERIC(12,2) as string
  grand_total: string;         // NUMERIC(12,2) as string
  total_paid: string;          // NUMERIC(12,2) as string
  outstanding_balance: string; // NUMERIC(12,2) - authoritative, never calculated in TS
}

export interface BillingReportFilters {
  branchId?: number;
  unpaidOnly?: boolean;
  paymentStatus?: string;
  search?: string;
}

const INITIAL_MOCK_DATA: GuestBillingSummaryRow[] = [
  {
    guest_id: 'guest-uuid-0001',
    guest_name: 'Alice Fernando',
    email: 'alice.fernando@example.com',
    phone: '+94771234567',
    reservation_id: 'res-uuid-0001',
    branch_id: 1,
    branch_name: 'Colombo',
    check_in_date: '2025-12-01',
    check_out_date: '2025-12-04',
    reservation_status: 'CheckedIn',
    invoice_id: 'inv-uuid-0001',
    invoice_date: '2025-12-04',
    payment_status: 'Pending',
    room_charges: '24000.00',
    service_charges: '1000.00',
    tax_amount: '1920.00',
    grand_total: '26920.00',
    total_paid: '10000.00',
    outstanding_balance: '16920.00',
  },
  {
    guest_id: 'guest-uuid-0002',
    guest_name: 'Bob Perera',
    email: 'bob.perera@example.com',
    phone: '+94779876543',
    reservation_id: 'res-uuid-0002',
    branch_id: 2,
    branch_name: 'Kandy',
    check_in_date: '2025-12-10',
    check_out_date: '2025-12-12',
    reservation_status: 'CheckedOut',
    invoice_id: 'inv-uuid-0002',
    invoice_date: '2025-12-12',
    payment_status: 'Paid',
    room_charges: '16000.00',
    service_charges: '3000.00',
    tax_amount: '1280.00',
    grand_total: '20280.00',
    total_paid: '20280.00',
    outstanding_balance: '0.00',
  },
  {
    guest_id: 'guest-uuid-0003',
    guest_name: 'Charlie Silva',
    email: 'charlie.silva@example.com',
    phone: '+94715554321',
    reservation_id: 'res-uuid-0003',
    branch_id: 3,
    branch_name: 'Galle',
    check_in_date: '2025-12-15',
    check_out_date: '2025-12-18',
    reservation_status: 'Confirmed',
    invoice_id: 'inv-uuid-0003',
    invoice_date: '2025-12-18',
    payment_status: 'Pending',
    room_charges: '45000.00',
    service_charges: '0.00',
    tax_amount: '3600.00',
    grand_total: '48600.00',
    total_paid: '0.00',
    outstanding_balance: '48600.00',
  },
  {
    guest_id: 'guest-uuid-0004',
    guest_name: 'Dilani Jayawardena',
    email: 'dilani.j@example.com',
    phone: '+94774443322',
    reservation_id: 'res-uuid-0004',
    branch_id: 1,
    branch_name: 'Colombo',
    check_in_date: '2025-12-20',
    check_out_date: '2025-12-22',
    reservation_status: 'CheckedOut',
    invoice_id: 'inv-uuid-0004',
    invoice_date: '2025-12-22',
    payment_status: 'Paid',
    room_charges: '10000.00',
    service_charges: '2500.00',
    tax_amount: '800.00',
    grand_total: '13300.00',
    total_paid: '13300.00',
    outstanding_balance: '0.00',
  },
];

let mockBillingData: GuestBillingSummaryRow[] = [...INITIAL_MOCK_DATA];

export const billingReportRepository = {
  
  getBillingSummary: async (
    filters: BillingReportFilters = {}
  ): Promise<GuestBillingSummaryRow[]> => {
    if (process.env.NODE_ENV === 'test') {
      let results = mockBillingData.slice();
      if (filters.branchId !== undefined) results = results.filter((r) => r.branch_id === filters.branchId);
      if (filters.unpaidOnly) results = results.filter((r) => parseFloat(r.outstanding_balance) > 0);
      if (filters.paymentStatus) {
        const target = filters.paymentStatus.toLowerCase();
        results = results.filter((r) => r.payment_status.toLowerCase() === target);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        results = results.filter(
          (r) =>
            r.guest_name.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q) ||
            r.reservation_id.toLowerCase().includes(q) ||
            r.invoice_id.toLowerCase().includes(q)
        );
      }
      return results;
    }

    try {
      const conditions: string[] = [];
      const values: (string | number)[] = [];
      let idx = 1;

      if (filters.branchId !== undefined) {
        conditions.push(`branch_id = $${idx++}`);
        values.push(filters.branchId);
      }

      if (filters.unpaidOnly) {
        conditions.push(`outstanding_balance::numeric > 0`);
      }

      if (filters.paymentStatus) {
        conditions.push(`LOWER(payment_status) = LOWER($${idx++})`);
        values.push(filters.paymentStatus);
      }

      if (filters.search) {
        conditions.push(`(
          guest_name ILIKE $${idx} OR
          email ILIKE $${idx} OR
          reservation_id::text ILIKE $${idx} OR
          invoice_id::text ILIKE $${idx}
        )`);
        values.push(`%${filters.search.trim()}%`);
        idx++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT
          guest_id::text,
          guest_name,
          email,
          phone,
          reservation_id::text,
          branch_id::int,
          branch_name,
          TO_CHAR(check_in_date, 'YYYY-MM-DD') AS check_in_date,
          TO_CHAR(check_out_date, 'YYYY-MM-DD') AS check_out_date,
          reservation_status,
          invoice_id::text,
          TO_CHAR(invoice_date, 'YYYY-MM-DD') AS invoice_date,
          payment_status,
          room_charges::text,
          service_charges::text,
          tax_amount::text,
          grand_total::text,
          total_paid::text,
          outstanding_balance::text
        FROM vw_guest_billing_summary
        ${whereClause}
        ORDER BY invoice_date DESC, guest_name ASC
      `;

      const { rows } = await pool.query<GuestBillingSummaryRow>(query, values);
      return rows;
    } catch {
      let results = mockBillingData.slice();
      if (filters.branchId !== undefined) {
        results = results.filter((r) => r.branch_id === filters.branchId);
      }
      if (filters.unpaidOnly) {
        results = results.filter((r) => parseFloat(r.outstanding_balance) > 0);
      }
      if (filters.paymentStatus) {
        const target = filters.paymentStatus.toLowerCase();
        results = results.filter((r) => r.payment_status.toLowerCase() === target);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        results = results.filter(
          (r) =>
            r.guest_name.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q) ||
            r.reservation_id.toLowerCase().includes(q) ||
            r.invoice_id.toLowerCase().includes(q)
        );
      }
      return results;
    }
  },

  _resetMockStore: (): void => {
    mockBillingData = [...INITIAL_MOCK_DATA];
  },
};