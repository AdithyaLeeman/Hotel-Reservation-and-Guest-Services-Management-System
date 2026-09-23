import { describe, it, expect } from 'vitest';
import { checkinService } from './checkin.service';

describe('Checkin Service (Stub)', () => {
  it('throws not yet implemented error for checkIn', async () => {
    await expect(checkinService.checkIn('res-1', 1)).rejects.toThrow(
      'checkinService.checkIn not yet implemented — P04-M04-T04'
    );
  });
});
