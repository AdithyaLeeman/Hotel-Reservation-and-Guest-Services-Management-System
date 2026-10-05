/**
 * GET /api/guest/reservations/[id]/invoice
 *
 * Returns authoritative billing totals and payment history for one reservation.
 *
 * DB-first rule (AGENTS.md §5):
 *   All monetary values (room_charges, tax_amount, service_charges, grand_total,
 *   total_paid, outstanding_balance) come exclusively from vw_invoice_totals via
 *   billingService.getInvoiceTotals(). TypeScript NEVER computes any financial value.
 *
 * P06-M05-T01 — Wire billing to real DB
 *
 * Flow:
 *   1. Authenticate guest session (iron-session)
 *   2. Verify reservation belongs to this guest (ownership enforcement)
 *   3. Call sp_finalize_invoice() via billingService.finalizeInvoice() — idempotent
 *   4. Read vw_invoice_totals via billingService.getInvoiceTotals()
 *   5. Read payment history via paymentService.listPaymentsByInvoice()
 *   6. Return combined response
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { reservationService } from '@/services/reservation.service';
import { billingService } from '@/services/billing.service';
import { paymentService } from '@/services/payment.service';
import { ERROR_CODES } from '@/types/api';
import type { SessionData } from '@/types/session';

// ── Session helpers ──────────────────────────────────────────────────────────

async function resolveSession(): Promise<Partial<SessionData>> {
  try {
    const session = await getSession();
    if (session.userId && session.role) {
      return session;
    }
  } catch {
    // Cookie absent or malformed — fall through
  }
  return {};
}

// ── Response helpers ─────────────────────────────────────────────────────────

function ok<T>(data: T): NextResponse {
  return NextResponse.json(
    { data, meta: { requestId: crypto.randomUUID() } },
    { status: 200 }
  );
}

function err(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

// ── SQLSTATE helpers ─────────────────────────────────────────────────────────

function isSqlState(error: unknown, sqlstate: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === sqlstate
  );
}

const SQLSTATE_RESERVATION_NOT_FOUND  = '45040';
const SQLSTATE_RESERVATION_CANCELLED  = '45041';
const SQLSTATE_NO_ACTIVE_TAX_POLICY   = '45042';

// ── Route context type ───────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const session = await resolveSession();

  if (!session.userId || !session.role) {
    return err(401, ERROR_CODES.NOT_AUTHENTICATED, 'Not authenticated.');
  }

  if (session.role !== 'Guest') {
    return err(
      403,
      ERROR_CODES.INSUFFICIENT_ROLE,
      `Access requires Guest role. Your role: ${session.role}`
    );
  }

  if (!session.guestId) {
    return err(403, ERROR_CODES.INSUFFICIENT_ROLE, 'Guest profile not found in session.');
  }

  const { id: reservationId } = await context.params;

  try {
    // 1. Verify reservation exists and is owned by this guest
    const reservation = await reservationService.getReservationDetail(
      reservationId,
      session.guestId
    );

    if (!reservation) {
      return err(404, ERROR_CODES.NOT_FOUND, `Reservation ${reservationId} not found.`);
    }

    // 2. Finalize the invoice if it does not exist yet (idempotent).
    //    sp_finalize_invoice() returns the existing invoice_id on repeat calls.
    await billingService.finalizeInvoice(reservationId);

    // 3. Read authoritative totals from vw_invoice_totals (DB-first, AGENTS.md §5).
    //    outstanding_balance is NEVER computed in TypeScript.
    const totals = await billingService.getInvoiceTotals(reservationId);

    if (!totals) {
      // Should not happen after finalizeInvoice, but guard defensively.
      return err(
        404,
        ERROR_CODES.NOT_FOUND,
        `Invoice totals not found for reservation ${reservationId} after finalization.`
      );
    }

    // 4. Fetch payment history for this invoice
    const payments = await paymentService.listPaymentsByInvoice(totals.invoice_id);

    return ok({
      invoice: {
        invoice_id:              totals.invoice_id,
        reservation_id:          totals.reservation_id,
        payment_status:          totals.payment_status ?? 'Unpaid',
        room_charges:            totals.room_charges,
        service_charges:         totals.service_charges,
        tax_amount:              totals.tax_amount,
        grand_total:             totals.grand_total,
        total_paid:              totals.total_paid,
        outstanding_balance:     totals.outstanding_balance, // authoritative from DB
      },
      payments,
      reservation: {
        reservation_id:       reservation.reservation_id,
        guest_id:             reservation.guest_id,
        guest_name:           reservation.guest_full_name,
        guest_email:          reservation.guest_email,
        branch_id:            reservation.branch_id,
        branch_name:          reservation.branch_location_name,
        check_in_date:        reservation.check_in_date,
        check_out_date:       reservation.check_out_date,
        reservation_status:   reservation.reservation_status,
        booking_source:       reservation.booking_source,
        discount_percentage:  reservation.discount_percentage,
        rooms:                reservation.rooms,
      },
    });

  } catch (error) {
    console.error(`[GET /api/guest/reservations/${reservationId}/invoice]`, error);

    if (isSqlState(error, SQLSTATE_RESERVATION_NOT_FOUND)) {
      return err(404, ERROR_CODES.NOT_FOUND, `Reservation ${reservationId} not found.`);
    }
    if (isSqlState(error, SQLSTATE_RESERVATION_CANCELLED)) {
      return err(409, ERROR_CODES.CONFLICT, `Cannot invoice a cancelled reservation.`);
    }
    if (isSqlState(error, SQLSTATE_NO_ACTIVE_TAX_POLICY)) {
      return err(500, ERROR_CODES.INTERNAL_ERROR, 'No active tax policy configured. Contact an administrator.');
    }

    return err(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
  }
}