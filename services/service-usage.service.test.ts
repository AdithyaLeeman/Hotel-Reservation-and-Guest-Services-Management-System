import { describe, it, expect } from 'vitest';
import { serviceUsageService } from './service-usage.service';

describe('Service Usage Service (Stub)', () => {
  it('throws not yet implemented error for logUsage', async () => {
    await expect(serviceUsageService.logUsage({}, 1)).rejects.toThrow(
      'serviceUsageService.logUsage not yet implemented — P04-M04-T05'
    );
  });

  it('throws not yet implemented error for listCatalogue', async () => {
    await expect(serviceUsageService.listCatalogue()).rejects.toThrow(
      'serviceUsageService.listCatalogue not yet implemented — P04-M04-T06'
    );
  });
});
