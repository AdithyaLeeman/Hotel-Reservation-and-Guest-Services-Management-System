import { describe, it, expect } from 'vitest';
import { billingRepository } from './billing.repository';

describe('Billing Repository (Stub)', () => {
  it('throws not implemented error for callFinalizeInvoice', async () => {
    await expect(billingRepository.callFinalizeInvoice('res-1')).rejects.toThrow(
      'billingRepository.callFinalizeInvoice not implemented — P04-M05-T03'
    );
  });

  it('throws not implemented error for getInvoiceTotals', async () => {
    await expect(billingRepository.getInvoiceTotals('res-1')).rejects.toThrow(
      'billingRepository.getInvoiceTotals not implemented — P04-M05-T04'
    );
  });
});
