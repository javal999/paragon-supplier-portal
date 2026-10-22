// ─────────────────────────────────────────────────────────────────────────────
// BL-208 (DRC-19) [Proposed] — the suggested OSIP level, every rule path:
// a tag maps to its XLS order method; with no tag, CV decides (stable → 4,
// fluctuative → 3); JIT (6) is never suggested without pallet-mix data; every
// missing input is named.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { OSIP_RULES } from './osipRules';
import {
  LEVEL_SUGGESTION_RULES,
  ORDER_TAG_METHOD,
  levelSuggestionInput,
  suggestOsipLevel
} from './osipLevelSuggestion';
/** @import { MaterialCv } from './osipSafetyRules' */

/**
 * @param {number | null} value
 * @returns {MaterialCv}
 */
const cvOf = (value) => ({
  cv: value,
  category: value === null ? null : value < 0.5 ? 'stable' : 'fluctuative',
  skus: [],
  noBom: false
});

// 70 a week = 10 a day.
const steady = Array.from({ length: 13 }, () => 70);

describe('BL-208 · the order-method tag, where the hub holds one', () => {
  it.each(
    /** @type {const} */ ([
      ['pipo', 1, 'manualOrder'],
      ['oneShot', 2, 'projectOrder'],
      ['festive', null, 'exceptionBased'],
      ['commodity', 5, 'fixedOrder']
    ])
  )('%s → level %s (%s), whatever the CV', (orderTag, level, method) => {
    const s = suggestOsipLevel({ orderTag, cv: cvOf(0.9), mpq: 10, consumption: steady });
    expect(s).toMatchObject({ level, method, basis: 'tag', missing: [] });
  });

  it('the map holds exactly the four XLS tags', () => {
    expect(Object.keys(ORDER_TAG_METHOD).sort()).toEqual(
      ['commodity', 'festive', 'oneShot', 'pipo'].sort()
    );
  });
});

describe('BL-208 · with no tag, the demand pattern decides (DRC-11 CV)', () => {
  it('stable (CV < 0.5) → Periodic Review, level 4; the missing tag is named', () => {
    const s = suggestOsipLevel({ cv: cvOf(0.3), mpq: 700, consumption: steady });
    expect(s).toMatchObject({ level: 4, method: 'periodicReview', basis: 'cvStable', cv: 0.3 });
    expect(s.missing).toEqual(['NO_TAG']);
    expect(s.mpqRate).toBe(70);
    expect(s.jit).toBe('batching');
  });

  it('fluctuative (CV ≥ 0.5, the threshold itself included) → Continuous Review, level 3', () => {
    for (const v of [0.5, 1.2])
      expect(suggestOsipLevel({ cv: cvOf(v), mpq: 10, consumption: steady })).toMatchObject({
        level: 3,
        method: 'continuousReview',
        basis: 'cvFluctuative',
        missing: ['NO_TAG']
      });
  });

  it('reads the threshold from the rules passed in [Default C1]', () => {
    const input = { cv: cvOf(0.3), mpq: 700, consumption: steady };
    expect(suggestOsipLevel(input, { ...OSIP_RULES, cvThreshold: 0.2 }).level).toBe(3);
    expect(suggestOsipLevel(input).level).toBe(4);
  });
});

describe('BL-208 · JIT (6) needs pallet-mix data the hub does not hold', () => {
  it('MPQ rate ≤ 6 days (continuous, [Default F5]) still suggests 4, and names the pallet-mix gap', () => {
    // MPQ 60 ÷ 10 a day = 6 days: the threshold itself is continuous.
    const s = suggestOsipLevel({ cv: cvOf(0.1), mpq: 60, consumption: steady });
    expect(s.level).toBe(4);
    expect(s.mpqRate).toBe(LEVEL_SUGGESTION_RULES.jitMpqRateMax);
    expect(s.jit).toBe('needsPalletMix');
    expect(s.missing).toEqual(['NO_TAG', 'NO_PALLET_MIX']);
  });

  it('no input combination ever suggests 6', () => {
    for (const orderTag of [null, 'pipo', 'oneShot', 'festive', 'commodity'])
      for (const v of [null, 0, 0.1, 0.49, 0.5, 2])
        for (const mpq of [null, 1, 60, 1000])
          expect(
            suggestOsipLevel({
              orderTag: /** @type {any} */ (orderTag),
              cv: cvOf(v),
              mpq,
              consumption: steady
            }).level
          ).not.toBe(6);
  });
});

describe('BL-208 · a missing input is named, never defaulted', () => {
  it('no CV → no level, NO_CV', () => {
    expect(suggestOsipLevel({ cv: cvOf(null), mpq: 10, consumption: steady })).toMatchObject({
      level: null,
      method: null,
      missing: ['NO_TAG', 'NO_CV']
    });
    expect(suggestOsipLevel({ cv: null, mpq: 10, consumption: steady }).missing).toEqual([
      'NO_TAG',
      'NO_CV'
    ]);
  });

  it('no recorded consumption → level 4 by CV, JIT not checked, NO_CONSUMPTION', () => {
    const s = suggestOsipLevel({ cv: cvOf(0.2), mpq: 10, consumption: [] });
    expect(s).toMatchObject({ level: 4, mpqRate: null, jit: null });
    expect(s.missing).toEqual(['NO_TAG', 'NO_CONSUMPTION']);
    expect(suggestOsipLevel({ cv: cvOf(0.2), mpq: 10, consumption: [0, 0] }).missing).toContain(
      'NO_CONSUMPTION'
    );
  });

  it('no source → NO_SOURCE', () => {
    expect(
      suggestOsipLevel(levelSuggestionInput({ cv: cvOf(0.2), suppliers: [] })).missing
    ).toEqual(['NO_TAG', 'NO_SOURCE']);
  });

  it('the read takes the main (first) source and no tag', () => {
    expect(
      levelSuggestionInput({
        cv: cvOf(0.2),
        suppliers: [
          { mpq: 25, consumption: [7] },
          { mpq: 99, consumption: [1] }
        ]
      })
    ).toEqual({ orderTag: null, cv: cvOf(0.2), mpq: 25, consumption: [7] });
  });
});
