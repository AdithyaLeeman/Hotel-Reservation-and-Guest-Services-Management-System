

import { describe, it, expect, beforeEach } from 'vitest';
import { paymentRepository } from './payment.repository';

describe('Payment Repository (Mock)', () => {
  beforeEach(() => {
    paymentRepository._resetMockStore();
  });

  describe('postPayment', () => {
    it('successfully records a payment with all fields and auto-generated ID', async () => {
      const payment = await paymentRepository.postPayment({
        invoice_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        amount_paid: '5000.00',
        payment_method: 'Credit Card',
        processed_by_employee_id: 1,
        paid_by_user_id: 'user-001',
        transaction_reference: 'TXN-123456',
      });

      expect(payment.payment_id).toBe(1);
      expect(payment.invoice_id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(payment.amount_paid).toBe('5000.00');
      expect(payment.payment_method).toBe('Credit Card');
      expect(payment.processed_by_employee_id).toBe(1);
      expect(payment.paid_by_user_id).toBe('user-001');
      expect(payment.transaction_reference).toBe('TXN-123456');
      expect(new Date(payment.payment_date).getTime()).not.toBeNaN();
    });

    it('increments payment_id for subsequent payments', async () => {
      const p1 = await paymentRepository.postPayment({
        invoice_id: 'inv-1',
        amount_paid: '1000.00',
        payment_method: 'Cash',
        processed_by_employee_id: null,
        paid_by_user_id: 'user-001',
      });
      const p2 = await paymentRepository.postPayment({
        invoice_id: 'inv-1',
        amount_paid: '2000.00',
        payment_method: 'Cash',
        processed_by_employee_id: null,
        paid_by_user_id: 'user-001',
      });

      expect(p1.payment_id).toBe(1);
      expect(p2.payment_id).toBe(2);
    });

    it('enforces idempotency: throws error code 23505 for duplicate transaction_reference', async () => {
      await paymentRepository.postPayment({
        invoice_id: 'inv-1',
        amount_paid: '5000.00',
        payment_method: 'Credit Card',
        processed_by_employee_id: null,
        paid_by_user_id: 'user-001',
        transaction_reference: 'UNIQUE-REF-001',
      });

      await expect(
        paymentRepository.postPayment({
          invoice_id: 'inv-2',
          amount_paid: '3000.00',
          payment_method: 'Credit Card',
          processed_by_employee_id: null,
          paid_by_user_id: 'user-002',
          transaction_reference: 'UNIQUE-REF-001',
        })
      ).rejects.toMatchObject({
        code: '23505',
        message: 'Duplicate transaction_reference',
      });
    });

    it('allows multiple payments without transaction_reference', async () => {
      const p1 = await paymentRepository.postPayment({
        invoice_id: 'inv-1',
        amount_paid: '1000.00',
        payment_method: 'Cash',
        processed_by_employee_id: 2,
        paid_by_user_id: 'user-001',
        transaction_reference: null,
      });

      const p2 = await paymentRepository.postPayment({
        invoice_id: 'inv-1',
        amount_paid: '1500.00',
        payment_method: 'Cash',
        processed_by_employee_id: 2,
        paid_by_user_id: 'user-001',
        transaction_reference: null,
      });

      expect(p1.payment_id).toBe(1);
      expect(p2.payment_id).toBe(2);
    });

    it('rejects payments with zero or negative amounts (BR-14)', async () => {
      await expect(
        paymentRepository.postPayment({
          invoice_id: 'inv-1',
          amount_paid: '0.00',
          payment_method: 'Cash',
          processed_by_employee_id: null,
          paid_by_user_id: 'user-001',
        })
      ).rejects.toMatchObject({
        code: '23514',
      });

      await expect(
        paymentRepository.postPayment({
          invoice_id: 'inv-1',
          amount_paid: '-50.00',
          payment_method: 'Cash',
          processed_by_employee_id: null,
          paid_by_user_id: 'user-001',
        })
      ).rejects.toMatchObject({
        code: '23514',
      });
    });
  });

  describe('callPostPayment alias', () => {
    it('delegates to postPayment and returns recorded payment', async () => {
      const payment = await paymentRepository.callPostPayment({
        invoice_id: 'inv-alias',
        amount_paid: '2500.00',
        payment_method: 'Debit Card',
        processed_by_employee_id: null,
        paid_by_user_id: 'user-001',
        transaction_reference: 'ALIAS-REF',
      });

      expect(payment.payment_id).toBe(1);
      expect(payment.amount_paid).toBe('2500.00');
    });
  });

  describe('listByInvoiceId', () => {
    it('returns empty array when no payments exist for an invoice', async () => {
      const payments = await paymentRepository.listByInvoiceId('inv-empty');
      expect(payments).toEqual([]);
    });

    it('returns only payments matching the invoice_id sorted by payment_date', async () => {
      await paymentRepository.postPayment({
        invoice_id: 'inv-target',
        amount_paid: '1000.00',
        payment_method: 'Cash',
        processed_by_employee_id: null,
        paid_by_user_id: 'user-1',
      });
      await paymentRepository.postPayment({
        invoice_id: 'inv-other',
        amount_paid: '500.00',
        payment_method: 'Cash',
        processed_by_employee_id: null,
        paid_by_user_id: 'user-2',
      });
      await paymentRepository.postPayment({
        invoice_id: 'inv-target',
        amount_paid: '2000.00',
        payment_method: 'Credit Card',
        processed_by_employee_id: null,
        paid_by_user_id: 'user-1',
      });

      const results = await paymentRepository.listByInvoiceId('inv-target');
      expect(results).toHaveLength(2);
      expect(results.every((p) => p.invoice_id === 'inv-target')).toBe(true);
      expect(results[0].amount_paid).toBe('1000.00');
      expect(results[1].amount_paid).toBe('2000.00');
    });
  });

  describe('callCheckout', () => {
    it('resolves without error for valid checkout arguments', async () => {
      await expect(paymentRepository.callCheckout('res-123', 1)).resolves.toBeUndefined();
    });
  });

  describe('mock store helpers', () => {
    it('resets store properly', async () => {
      await paymentRepository.postPayment({
        invoice_id: 'inv-reset',
        amount_paid: '100.00',
        payment_method: 'Cash',
        processed_by_employee_id: null,
        paid_by_user_id: 'user-1',
      });
      expect(paymentRepository._getMockStore()).toHaveLength(1);

      paymentRepository._resetMockStore();
      expect(paymentRepository._getMockStore()).toHaveLength(0);

      const next = await paymentRepository.postPayment({
        invoice_id: 'inv-reset-2',
        amount_paid: '200.00',
        payment_method: 'Cash',
        processed_by_employee_id: null,
        paid_by_user_id: 'user-1',
      });
      expect(next.payment_id).toBe(1);
    });

    it('seeds payments and updates next payment ID', () => {
      paymentRepository._seedPayments([
        {
          payment_id: 10,
          invoice_id: 'inv-seed',
          amount_paid: '750.00',
          payment_date: new Date().toISOString(),
          payment_method: 'Bank Transfer',
          processed_by_employee_id: 3,
          paid_by_user_id: 'user-seed',
          transaction_reference: 'SEED-REF',
        },
      ]);

      const stored = paymentRepository._getMockStore();
      expect(stored).toHaveLength(1);
      expect(stored[0].payment_id).toBe(10);
    });
  });
});
