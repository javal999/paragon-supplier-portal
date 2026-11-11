import { describe, expect, it } from 'vitest';
import { switchAdvice } from './osipSwitchAdvice';

const none = [{ ltp: [0, 0], consumption: [0] }];
const ltpOnly = [{ ltp: [5], consumption: [] }];
const usedOnly = [{ ltp: [], consumption: [3] }];

describe('PEX-13 BR-04 switch advice [Proposed]', () => {
  it('suggests off when a switch is on and there is no demand', () => {
    expect(switchAdvice('safetyStockOn', true, none)).toEqual({
      param: 'safetyStockOn',
      suggested: false,
      reason: 'noDemand'
    });
    expect(switchAdvice('protectionBufferOn', true, [])?.suggested).toBe(false);
  });
  it('suggests on when a switch is off and demand is back', () => {
    expect(switchAdvice('safetyStockOn', false, usedOnly)).toMatchObject({
      suggested: true,
      reason: 'demandBack'
    });
    expect(switchAdvice('protectionBufferOn', false, ltpOnly)?.suggested).toBe(true);
  });
  it('gives no advice when the switch already stands where it would go', () => {
    expect(switchAdvice('safetyStockOn', true, ltpOnly)).toBeNull();
    expect(switchAdvice('safetyStockOn', false, none)).toBeNull();
  });
  it('protection buffer reads LTP only; safety stock also reads consumption', () => {
    expect(switchAdvice('protectionBufferOn', true, usedOnly)?.suggested).toBe(false);
    expect(switchAdvice('safetyStockOn', true, usedOnly)).toBeNull();
  });
  it('ignores non-finite figures', () => {
    expect(switchAdvice('safetyStockOn', true, [{ ltp: [NaN], consumption: [] }])?.suggested).toBe(
      false
    );
  });
});
