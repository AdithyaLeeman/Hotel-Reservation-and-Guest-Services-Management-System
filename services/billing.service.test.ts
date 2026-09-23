import { describe, it, expect } from 'vitest';
import { billingService } from './billing.service';

describe('Billing Service (Stub)', () => {
  it('throws not yet implemented error for finalizeInvoice', async () => {
    await expect(billingService.finalizeInvoice('res-1')).rejects.toThrow(
      'billingService.finalizeInvoice not yet implemented — P04-M05-T03'
    );
  });

  it('throws not yet implemented error for getInvoiceTotals', async () => {
    await expect(billingService.getInvoiceTotals('res-1')).rejects.toThrow(
      'billingService.getInvoiceTotals not yet implemented — P04-M05-T04'
    );
  });
});
