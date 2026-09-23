import { describe, it, expect } from 'vitest';
import { paymentService } from './payment.service';

describe('Payment Service (Stub)', () => {
  it('throws not yet implemented error for postPayment', async () => {
    await expect(paymentService.postPayment({}, 'user-1', 1)).rejects.toThrow(
      'paymentService.postPayment not yet implemented — P05-M05-T02'
    );
  });

  it('throws not yet implemented error for checkout', async () => {
    await expect(paymentService.checkout('res-1', 1)).rejects.toThrow(
      'paymentService.checkout not yet implemented — P05-M05-T05'
    );
  });
});
