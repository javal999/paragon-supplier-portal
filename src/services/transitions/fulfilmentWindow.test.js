// PEX-10 (BL-273) — the fulfilment window on a supplier confirmation.
import { describe, expect, it } from 'vitest';
import { fulfilmentWindow, jakartaDay } from './fulfilmentWindow';

describe('PEX-10 — fulfilment window', () => {
  it('BR-02: confirmed 5 Nov 2026 with a 28-day lead time → fulfil by 3 Dec 2026', () => {
    expect(fulfilmentWindow('2026-11-05T03:00:00.000Z', 28)).toEqual({
      from: '2026-11-05',
      by: '2026-12-03',
      leadTimeDays: 28
    });
  });

  it('the confirmation day is the Jakarta day (WIB, UTC+7)', () => {
    // 18:00 UTC on 4 Nov is 01:00 on 5 Nov in Jakarta.
    expect(jakartaDay('2026-11-04T18:00:00.000Z')).toBe('2026-11-05');
    expect(jakartaDay('2026-11-04T16:59:00.000Z')).toBe('2026-11-04');
    expect(jakartaDay('2026-11-04')).toBe('2026-11-04');
  });

  it('a lead time of 0 days fulfils on the confirmation day', () => {
    expect(fulfilmentWindow('2026-11-05', 0)?.by).toBe('2026-11-05');
  });

  it('no lead time on record → no window (never a guessed date)', () => {
    expect(fulfilmentWindow('2026-11-05', null)).toBeNull();
    expect(fulfilmentWindow('2026-11-05', undefined)).toBeNull();
    expect(fulfilmentWindow('2026-11-05', Number.NaN)).toBeNull();
    expect(fulfilmentWindow('2026-11-05', -1)).toBeNull();
  });
});
