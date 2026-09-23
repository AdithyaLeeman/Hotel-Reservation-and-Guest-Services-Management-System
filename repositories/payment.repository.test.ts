import { describe, it, expect } from 'vitest';
import { paymentRepository } from './payment.repository';

describe('Payment Repository (Stub)', () => {
  it('throws not implemented error for callPostPayment', async () => {
    await expect(paymentRepository.callPostPayment({})).rejects.toThrow(
      'paymentRepository.callPostPayment not implemented — P05-M05-T02'
    );
  });

  it('throws not implemented error for callCheckout', async () => {
    await expect(paymentRepository.callCheckout('res-1', 1)).rejects.toThrow(
      'paymentRepository.callCheckout not implemented — P05-M05-T05'
    );
  });

  it('throws not implemented error for listByInvoiceId', async () => {
    await expect(paymentRepository.listByInvoiceId('inv-1')).rejects.toThrow(
      'paymentRepository.listByInvoiceId not implemented — P05-M05-T03'
    );
  });
});
