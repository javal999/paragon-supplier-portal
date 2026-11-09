// PEX-13 (BL-275) — the switch kinds, their reason rule, and the safety stock switch in the rules.
import { describe, expect, it } from 'vitest';
import {
  OSIP_PARAMS,
  SWITCH_REASON_MIN_LENGTH,
  osipParamKey,
  osipParamRefusal,
  osipReasonRefusal,
  parseOsipParamKey,
  switchIsOn
} from './osipParams';
import { osipSafety } from './osipSafetyRules';

describe('PEX-13 switch kinds', () => {
  it('are per material, yes/no, and need a reason', () => {
    for (const p of /** @type {const} */ (['safetyStockOn', 'protectionBufferOn'])) {
      expect(OSIP_PARAMS[p]).toMatchObject({
        scope: 'material',
        boolean: true,
        reasonRequired: true
      });
      expect(osipParamKey(p, { materialCode: 'RM-X' })).toBe(`${p}|RM-X`);
      expect(parseOsipParamKey(`${p}|RM-X`)).toEqual({
        param: p,
        supplierId: null,
        materialCode: 'RM-X'
      });
      expect(osipParamRefusal(p, false)).toBeNull();
      expect(osipParamRefusal(p, 0)).toMatch(/yes or no/);
    }
  });

  it('a reason needs 10 trimmed characters; other kinds need none', () => {
    expect(SWITCH_REASON_MIN_LENGTH).toBe(10);
    expect(osipReasonRefusal('safetyStockOn', 'x'.repeat(9))).toMatch(/OSIP_REASON_REQUIRED/);
    expect(osipReasonRefusal('safetyStockOn', '  ' + 'x'.repeat(9) + '  ')).toMatch(
      /OSIP_REASON_REQUIRED/
    );
    expect(osipReasonRefusal('safetyStockOn', 'x'.repeat(10))).toBeNull();
    expect(osipReasonRefusal('protectionBufferOn', undefined)).toMatch(/OSIP_REASON_REQUIRED/);
    expect(osipReasonRefusal('z', undefined)).toBeNull();
  });

  it('a switch is on unless its latest value is false', () => {
    expect(switchIsOn(null)).toBe(true);
    expect(switchIsOn(true)).toBe(true);
    expect(switchIsOn(false)).toBe(false);
  });
});

describe('PEX-13 safety stock off in the safety rules', () => {
  const input = /** @type {any} */ ({
    supplierId: 's',
    materialCode: 'm',
    ltp: [100, 160, 90, 150, 100, 170, 80, 140, 100, 160, 90, 150, 100, 170],
    leadTimeWeeks: 4,
    mpq: 10,
    moq: 10,
    koli: null,
    consumption: [90, 110, 95, 105, 100, 120],
    supplyArea: 'jabodetabek'
  });
  it('on (or unset) computes; off gives 0 for both and says so', () => {
    const on = osipSafety(input);
    expect(on.safetyOn).toBe(true);
    expect(on.safetyOrder.value).toBeGreaterThan(0);
    expect(osipSafety({ ...input, safetyOn: true })).toEqual(on);
    const off = osipSafety({ ...input, safetyOn: false });
    expect(off.safetyOn).toBe(false);
    expect(off.safetyOrder.value).toBe(0);
    expect(off.fisik.value).toBe(0);
    expect(off.safetyOrder.unavailable).toBeNull();
  });
  it('off needs none of the inputs the figure otherwise needs', () => {
    const off = osipSafety({ ...input, ltp: [], consumption: [], safetyOn: false });
    expect(off.safetyOrder.value).toBe(0);
    expect(off.fisik.unavailable).toBeNull();
  });
});
