// PEX-12 [Proposed] — the recommended action: pure rule, no numbers invented.
import { describe, expect, it } from 'vitest';
import { onHoldSharePct, recommendAction } from './poOnHoldRecommendation';
import { osipParamKey, osipParamRefusal, parseOsipParamKey } from './osipParams';

const NONE = { fsOnly: false, fsSpread: false, fg: false };
const base = {
  qty: 100,
  ospo: 1000,
  conditions: NONE,
  cap: null,
  absorbMaxPct: null,
  carryMaxPct: null
};

describe('recommendAction', () => {
  it('with no threshold set it is manual: no threshold set, whatever the line', () => {
    expect(
      recommendAction({ ...base, conditions: { fsOnly: true, fsSpread: true, fg: true }, cap: 500 })
    ).toEqual({ action: 'manual', reason: 'noThreshold', sharePct: null });
  });

  it('auto absorb: FG conditions hold, cap covers the quantity, share within the threshold', () => {
    const r = recommendAction({
      ...base,
      conditions: { ...NONE, fg: true },
      cap: 400,
      absorbMaxPct: 10
    });
    expect(r).toEqual({ action: 'autoAbsorb', reason: 'withinAbsorb', sharePct: 10 });
  });

  it('absorb falls back to manual when the cap is unknown or too small, naming why', () => {
    const fg = { ...base, conditions: { ...NONE, fg: true }, absorbMaxPct: 50 };
    expect(recommendAction({ ...fg, cap: null }).reason).toBe('noCap');
    expect(recommendAction({ ...fg, cap: 50 }).reason).toBe('overCap');
    expect(recommendAction({ ...fg, cap: 50 }).action).toBe('manual');
  });

  it('auto carry-over: FS + spread holds and the share is within the carry threshold', () => {
    const r = recommendAction({
      ...base,
      conditions: { ...NONE, fsSpread: true },
      carryMaxPct: 10
    });
    expect(r).toMatchObject({ action: 'autoCarryOver', reason: 'withinCarry' });
  });

  it('above the threshold, or conditions not met: manual with the reason', () => {
    expect(
      recommendAction({ ...base, conditions: { ...NONE, fsSpread: true }, carryMaxPct: 5 })
    ).toMatchObject({ action: 'manual', reason: 'aboveThreshold' });
    expect(recommendAction({ ...base, carryMaxPct: 50 })).toMatchObject({
      action: 'manual',
      reason: 'conditionsNotMet'
    });
  });

  it('no open PO quantity: nothing to take a share of', () => {
    expect(recommendAction({ ...base, ospo: 0, carryMaxPct: 50 }).reason).toBe('noOspo');
    expect(onHoldSharePct(1, 0)).toBeNull();
  });
});

describe('the class threshold keys (t_osipparam_set)', () => {
  it('are per material class, 0-100 whole numbers, null resets', () => {
    expect(osipParamKey('autoAbsorbMaxPct', { materialClass: 'MG-03' })).toBe(
      'autoAbsorbMaxPct|MG-03'
    );
    expect(parseOsipParamKey('autoCarryMaxPct|MG-03')).toMatchObject({
      param: 'autoCarryMaxPct',
      materialClass: 'MG-03'
    });
    expect(parseOsipParamKey('autoCarryMaxPct|MG-03|x')).toBeNull();
    expect(osipParamRefusal('autoAbsorbMaxPct', 101)).not.toBeNull();
    expect(osipParamRefusal('autoAbsorbMaxPct', -1)).not.toBeNull();
    expect(osipParamRefusal('autoAbsorbMaxPct', 2.5)).not.toBeNull();
    expect(osipParamRefusal('autoAbsorbMaxPct', 0)).toBeNull();
    expect(osipParamRefusal('autoAbsorbMaxPct', null)).toBeNull();
  });
});
