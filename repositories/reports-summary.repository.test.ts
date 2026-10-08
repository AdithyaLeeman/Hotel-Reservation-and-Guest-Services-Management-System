import { describe, it, expect, beforeEach } from 'vitest';
import { reportsSummaryRepository } from './reports-summary.repository';

describe('reportsSummaryRepository', () => {
  beforeEach(() => {
    reportsSummaryRepository._resetMockStore();
  });

  it('returns default mock summary in test environment', async () => {
    const summary = await reportsSummaryRepository.getSummary();
    expect(summary).toEqual({
      branch_count: 3,
      total_revenue: '202300.00',
      total_outstanding: '65520.00',
      avg_occupancy_rate: '73.2',
      services_count: 6,
    });
  });

  it('updates store via _setMockSummary and resets via _resetMockStore', async () => {
    reportsSummaryRepository._setMockSummary({
      total_revenue: '500000.00',
      branch_count: 5,
    });

    let summary = await reportsSummaryRepository.getSummary();
    expect(summary.total_revenue).toBe('500000.00');
    expect(summary.branch_count).toBe(5);

    reportsSummaryRepository._resetMockStore();
    summary = await reportsSummaryRepository.getSummary();
    expect(summary.total_revenue).toBe('202300.00');
    expect(summary.branch_count).toBe(3);
  });
});
