// REQ-E14-11 X-06 / BR-02 / BR-03 — overrides applied to the forecast, the
// verb's rule, the override value (FVA) on injected overrides, and the 13-week
// review flag. No override history exists on the synthetic data; every record
// here is injected by the test.

import { describe, expect, it } from 'vitest';
/** @import { OverrideRecord } from './forecastOverrides' */
import {
  OVERRIDE_REVIEW_WEEKS,
  applyOverrides,
  directionOf,
  overrideRefusal,
  overrideValue,
  sizeBandOf
} from './forecastOverrides';
import { demandForecast } from './demandForecast';
import { addDays } from './dates';
/** @import { Brand, FinishedGood, SalesWeek } from './types' */

const AS_OF = '2026-08-31'; // a Monday
/**
 * @param {string} skuCode
 * @param {Brand} brand
 * @param {Partial<FinishedGood>} [extra]
 * @returns {FinishedGood}
 */
const fg = (skuCode, brand, extra = {}) => ({
  skuCode,
  name: `${skuCode} (test)`,
  brand,
  category: 'Skincare',
  launchDate: '2024-01-01',
  ...extra
});
/**
 * @param {string} skuCode
 * @param {number} weeks
 * @param {(i: number) => number} qty
 * @returns {SalesWeek[]}
 */
const rows = (skuCode, weeks, qty) =>
  Array.from({ length: weeks }, (_, i) => ({
    skuCode,
    weekStart: addDays(AS_OF, -(weeks - i) * 7),
    quantity: qty(i),
    stockout: false
  }));

const FGS = [
  fg('A', 'Wardah'),
  fg('B', 'Wardah'),
  fg('C', 'Emina'),
  fg('X', 'Emina', { discontinueDate: '2026-10-05' }),
  fg('OEM', 'Wardah', { oem: true })
];
const SALES = [
  ...rows('A', 80, (i) => 1000 + ((i * 37) % 11) * 20),
  ...rows('B', 80, (i) => 500 + ((i * 13) % 7) * 15),
  ...rows('C', 80, (i) => 800 + ((i * 5) % 9) * 10),
  ...rows('X', 80, (i) => 300 + ((i * 3) % 5) * 10),
  ...rows('OEM', 80, () => 100)
];
const run = demandForecast({ finishedGoods: FGS, sales: SALES, asOf: AS_OF });
const W0 = run.weeks[0];
const W1 = run.weeks[1];

let seq = 0;
/**
 * @param {Partial<OverrideRecord> & Pick<OverrideRecord, 'skuCode' | 'weekStart' | 'engineValue' | 'newValue'>} o
 * @returns {OverrideRecord}
 */
const rec = (o) => ({
  id: `t-${++seq}`,
  oldValue: o.engineValue,
  reasonCode: null,
  note: null,
  runWeek: W0,
  recordedAt: `${AS_OF}T08:00:00.000Z`,
  recordedBy: 'test',
  ...o
});
/** @param {string} code */
const skuOf = (code) =>
  /** @type {import('./demandForecast').SkuForecast} */ (run.skus.find((s) => s.skuCode === code));
const anyReason = () => true;

describe('X-06 — an override applied to the forecast shown (ENG-B103)', () => {
  it('the SKU week takes the new value; brand and total move by exactly the difference; other SKUs and weeks are untouched', () => {
    const a = skuOf('A');
    const o = rec({
      skuCode: 'A',
      weekStart: W1,
      engineValue: a.forecast[1],
      newValue: a.forecast[1] + 250,
      reasonCode: 'promotion'
    });
    const applied = applyOverrides(run, [o]);
    const A = /** @type {import('./forecastOverrides').OverriddenSku} */ (
      applied.skus.find((s) => s.skuCode === 'A')
    );
    expect(A.forecast[1]).toBe(a.forecast[1] + 250);
    expect(A.engineForecast[1]).toBe(a.forecast[1]);
    expect(A.overridden).toEqual([1]);
    expect(A.forecast.filter((_, i) => i !== 1)).toEqual(a.forecast.filter((_, i) => i !== 1));
    const wardah = /** @type {import('./demandForecast').LevelForecast} */ (
      run.brands.find((b) => b.key === 'Wardah')
    );
    const emina = /** @type {import('./demandForecast').LevelForecast} */ (
      run.brands.find((b) => b.key === 'Emina')
    );
    expect(
      /** @type {NonNullable<ReturnType<typeof applied.brands.find>>} */ (
        applied.brands.find((b) => b.key === 'Wardah')
      ).forecast[1]
    ).toBe(wardah.forecast[1] + 250);
    expect(
      /** @type {NonNullable<ReturnType<typeof applied.brands.find>>} */ (
        applied.brands.find((b) => b.key === 'Emina')
      ).forecast
    ).toEqual(emina.forecast);
    expect(applied.total[1]).toBe(run.total.forecast[1] + 250);
    expect(applied.total[0]).toBe(run.total.forecast[0]);
    expect(
      /** @type {import('./forecastOverrides').OverriddenSku} */ (
        applied.skus.find((s) => s.skuCode === 'B')
      ).forecast
    ).toEqual(skuOf('B').forecast);
    expect(applied.cells).toBe(1);
  });

  it('SKU, brand and total still add up with overrides in force (AC-02)', () => {
    const applied = applyOverrides(run, [
      rec({
        skuCode: 'A',
        weekStart: W0,
        engineValue: skuOf('A').forecast[0],
        newValue: 1,
        reasonCode: null
      }),
      rec({
        skuCode: 'C',
        weekStart: W1,
        engineValue: skuOf('C').forecast[1],
        newValue: 5000,
        reasonCode: 'customer-order'
      })
    ]);
    run.weeks.forEach((_, i) => {
      const skuSum = applied.skus.reduce((s, x) => s + x.forecast[i], 0);
      const brandSum = applied.brands.reduce((s, b) => s + b.forecast[i], 0);
      expect(applied.total[i]).toBe(skuSum);
      expect(brandSum).toBe(skuSum);
    });
  });

  it('the latest override of a cell is the one in force; without overrides the forecast is the engine’s', () => {
    const e = skuOf('B').forecast[0];
    const applied = applyOverrides(run, [
      rec({
        skuCode: 'B',
        weekStart: W0,
        engineValue: e,
        newValue: e + 100,
        reasonCode: 'promotion'
      }),
      rec({ skuCode: 'B', weekStart: W0, engineValue: e, oldValue: e + 100, newValue: e - 50 })
    ]);
    expect(
      /** @type {import('./forecastOverrides').OverriddenSku} */ (
        applied.skus.find((s) => s.skuCode === 'B')
      ).forecast[0]
    ).toBe(e - 50);
    expect(applyOverrides(run, []).total).toEqual(run.total.forecast);
  });
});

describe('the verb’s rule (X-06, BR-03)', () => {
  const a0 = () => skuOf('A').forecast[0];
  /**
   * @param {Record<string, unknown>} payload
   * @param {OverrideRecord[]} [records]
   */
  const refusalOf = (payload, records = []) => {
    const r = overrideRefusal(
      run,
      records,
      /** @type {never} */ ({ skuCode: 'A', weekStart: W0, ...payload }),
      anyReason
    );
    return 'refusal' in r ? r.refusal : null;
  };

  it('known-good: a downward override with no reason passes and lands on the engine’s value and the old value', () => {
    const r = overrideRefusal(
      run,
      [],
      { skuCode: 'A', weekStart: W0, newValue: a0() - 100 },
      anyReason
    );
    expect(r).toEqual({ cell: { skuCode: 'A', weekStart: W0, engineValue: a0(), oldValue: a0() } });
  });

  it('BR-03: an upward override without a reason code is refused by name; with one it passes', () => {
    expect(refusalOf({ newValue: a0() + 1 })).toMatch(/^REASON_REQUIRED:/);
    expect(refusalOf({ newValue: a0() + 1, reasonCode: '' })).toMatch(/^REASON_REQUIRED:/);
    expect(refusalOf({ newValue: a0() + 1, reasonCode: 'promotion' })).toBeNull();
  });

  it('upward is judged against the ENGINE’s value: lowering an earlier upward override that stays above the engine still needs a reason', () => {
    const up = rec({
      skuCode: 'A',
      weekStart: W0,
      engineValue: a0(),
      newValue: a0() + 500,
      reasonCode: 'promotion'
    });
    expect(refusalOf({ newValue: a0() + 200 }, [up])).toMatch(/^REASON_REQUIRED:/);
    const ok = overrideRefusal(
      run,
      [up],
      { skuCode: 'A', weekStart: W0, newValue: a0() },
      anyReason
    );
    expect(ok).toEqual({
      cell: { skuCode: 'A', weekStart: W0, engineValue: a0(), oldValue: a0() + 500 }
    });
  });

  it('refuses by name: unknown SKU, OEM, discontinued week, a week outside the horizon, a non-whole value, no change, an unoffered reason, other without a note', () => {
    expect(refusalOf({ skuCode: 'NOPE', newValue: 1 })).toMatch(/^UNKNOWN_SKU:/);
    expect(refusalOf({ skuCode: 'OEM', newValue: 1 })).toMatch(/^OEM_NOT_FORECAST:/);
    expect(refusalOf({ skuCode: 'X', weekStart: '2026-10-05', newValue: 1 })).toMatch(
      /^SKU_ENDED:/
    );
    expect(refusalOf({ skuCode: 'X', weekStart: W0, newValue: 1 })).toBeNull();
    expect(refusalOf({ weekStart: addDays(W0, -7), newValue: 1 })).toMatch(/^WEEK_NOT_IN_HORIZON:/);
    expect(refusalOf({ weekStart: addDays(W0, 1), newValue: 1 })).toMatch(/^WEEK_NOT_IN_HORIZON:/);
    expect(refusalOf({ newValue: 10.5 })).toMatch(/whole number/);
    expect(refusalOf({ newValue: -1 })).toMatch(/whole number/);
    expect(refusalOf({ newValue: '100' })).toMatch(/whole number/);
    expect(refusalOf({ newValue: a0() })).toMatch(/^NO_CHANGE:/);
    const r = overrideRefusal(
      run,
      [],
      { skuCode: 'A', weekStart: W0, newValue: a0() + 5, reasonCode: 'retired-one' },
      (c) => c === 'promotion'
    );
    expect('refusal' in r && r.refusal).toMatch(/^UNKNOWN_REASON:/);
    expect(refusalOf({ newValue: a0() + 5, reasonCode: 'other' })).toMatch(/^NOTE_REQUIRED:/);
    expect(
      refusalOf({ newValue: a0() + 5, reasonCode: 'other', note: 'Key account launch' })
    ).toBeNull();
  });

  it('a discontinued SKU cannot be overridden', () => {
    const ended = demandForecast({
      finishedGoods: [fg('Z', 'Wardah', { discontinueDate: '2026-08-01' }), fg('A', 'Wardah')],
      sales: SALES,
      asOf: AS_OF
    });
    const r = overrideRefusal(ended, [], { skuCode: 'Z', weekStart: W0, newValue: 5 }, anyReason);
    expect('refusal' in r && r.refusal).toMatch(/^SKU_DISCONTINUED:/);
  });
});

describe('BR-02 — override value (FVA) on injected overrides', () => {
  // Past weeks with known actuals; the override is judged against what sold.
  const NOW = '2026-09-28';
  const weeks = ['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24'];
  /** @type {Record<string, number>} */
  const actual = {};
  for (const w of weeks) {
    actual[`P|${w}`] = 1000;
    actual[`Q|${w}`] = 1000;
  }
  /**
   * @param {string} s
   * @param {string} w
   */
  const actualOf = (s, w) => actual[`${s}|${w}`] ?? null;

  it('an override that moved the forecast toward the actual: FVA positive; away from it: negative (by direction)', () => {
    const records = [
      // P: engine 800 → up to 950 (error 200 → 50): helps.
      ...weeks.map((w) =>
        rec({
          skuCode: 'P',
          weekStart: w,
          engineValue: 800,
          newValue: 950,
          reasonCode: 'promotion'
        })
      ),
      // Q: engine 1100 → down to 700 (error 100 → 300): hurts.
      rec({ skuCode: 'Q', weekStart: weeks[0], engineValue: 1100, newValue: 700 })
    ];
    const r = overrideValue(records, actualOf, NOW);
    expect(r.measured).toBe(5);
    const aug = /** @type {import('./forecastOverrides').FvaMonth} */ (
      r.months.find((m) => m.month === '2026-08')
    );
    const up = /** @type {import('./forecastOverrides').FvaGroup} */ (
      aug.byDirection.find((g) => g.key === 'up')
    );
    // One SKU: AvgRelMAE = 50 / 200 = 0.25 → FVA +75%.
    expect(up.avgRelMae).toBeCloseTo(0.25, 12);
    expect(up.fvaPct).toBeCloseTo(75, 10);
    expect(up.improved).toBe(4);
    const down = /** @type {import('./forecastOverrides').FvaGroup} */ (
      aug.byDirection.find((g) => g.key === 'down')
    );
    // Q: engine error 100, final 300 → 3 → FVA −200%.
    expect(down.fvaPct).toBeCloseTo(-200, 10);
    expect(down.improved).toBe(0);
    expect(aug.byReason.map((g) => g.key)).toEqual(['none', 'promotion']);
  });

  it('the Spec G2 example: engine error 1,000, after overrides 1,150 → FVA −15%', () => {
    const r = overrideValue(
      [
        rec({
          skuCode: 'P',
          weekStart: weeks[0],
          engineValue: 2000,
          newValue: 2150,
          reasonCode: 'promotion'
        })
      ],
      actualOf,
      NOW
    );
    expect(r.months[0].all.avgRelMae).toBeCloseTo(1.15, 12);
    expect(r.months[0].all.fvaPct).toBeCloseTo(-15, 10);
  });

  it('AvgRelMAE is the GEOMETRIC mean over SKUs, each SKU’s MAE over its own cells', () => {
    // P ratio 0.5 (engine 200 → 100), Q ratio 2 (engine 100 → 200): geometric mean 1, FVA 0.
    const r = overrideValue(
      [
        rec({
          skuCode: 'P',
          weekStart: weeks[0],
          engineValue: 800,
          newValue: 900,
          reasonCode: 'promotion'
        }),
        rec({
          skuCode: 'Q',
          weekStart: weeks[0],
          engineValue: 900,
          newValue: 1200,
          reasonCode: 'promotion'
        })
      ],
      actualOf,
      NOW
    );
    expect(r.months[0].all.avgRelMae).toBeCloseTo(1, 12);
    expect(r.months[0].all.fvaPct).toBeCloseTo(0, 10);
  });

  it('size bands and direction', () => {
    expect(directionOf(100, 101)).toBe('up');
    expect(directionOf(100, 99)).toBe('down');
    expect(directionOf(100, 100)).toBe('none');
    expect(sizeBandOf(100, 109)).toBe('lt10');
    expect(sizeBandOf(100, 110)).toBe('10to25');
    expect(sizeBandOf(100, 60)).toBe('25to50');
    expect(sizeBandOf(100, 200)).toBe('50to100');
    expect(sizeBandOf(100, 201)).toBe('gt100');
    expect(sizeBandOf(0, 5)).toBe('gt100');
  });

  it('a week that has not sold waits; a past week with no actual is not measured; a cell set back to the engine’s value is not an override to judge', () => {
    const r = overrideValue(
      [
        rec({
          skuCode: 'P',
          weekStart: '2026-10-05',
          engineValue: 800,
          newValue: 900,
          reasonCode: 'promotion'
        }),
        rec({
          skuCode: 'R',
          weekStart: weeks[1],
          engineValue: 800,
          newValue: 900,
          reasonCode: 'promotion'
        }),
        rec({ skuCode: 'P', weekStart: weeks[2], engineValue: 800, newValue: 800 })
      ],
      actualOf,
      NOW
    );
    expect(r).toMatchObject({ recorded: 3, measured: 0, waiting: 1, unmeasurable: 1, months: [] });
  });

  it('no overrides: the report is empty, not invented', () => {
    const r = overrideValue([], actualOf, NOW);
    expect(r).toMatchObject({ recorded: 0, measured: 0, waiting: 0, months: [] });
    expect(r.review.types).toEqual([]);
  });
});

describe(`BR-03 — an override type with negative value over ${OVERRIDE_REVIEW_WEEKS} weeks is flagged`, () => {
  const NOW = '2026-09-28'; // Monday; the window is 2026-06-29 … 2026-09-27
  const actualOf = () => 1000;

  it('negative FVA inside the window: flagged; positive: not; a bad override older than 13 weeks does not count', () => {
    const records = [
      // up:promotion — overshoots every time (engine 1000 → 1400): negative.
      rec({
        skuCode: 'P',
        weekStart: '2026-09-07',
        engineValue: 900,
        newValue: 1400,
        reasonCode: 'promotion'
      }),
      rec({
        skuCode: 'Q',
        weekStart: '2026-08-10',
        engineValue: 900,
        newValue: 1400,
        reasonCode: 'promotion'
      }),
      // down:listing-loss — moves toward 1000 (1300 → 1050): positive.
      rec({
        skuCode: 'P',
        weekStart: '2026-09-14',
        engineValue: 1300,
        newValue: 1050,
        reasonCode: 'listing-loss'
      }),
      // up:market-info — bad, but in week 2026-06-22, outside the window.
      rec({
        skuCode: 'Q',
        weekStart: '2026-06-22',
        engineValue: 900,
        newValue: 2000,
        reasonCode: 'market-info'
      })
    ];
    const r = overrideValue(records, actualOf, NOW);
    expect(r.review.from).toBe('2026-06-29');
    expect(r.review.to).toBe('2026-09-27');
    const byType = Object.fromEntries(r.review.types.map((t) => [t.type, t.flagged]));
    expect(byType).toEqual({ 'down:listing-loss': false, 'up:promotion': true });
    const promo = /** @type {import('./forecastOverrides').OverrideTypeReview} */ (
      r.review.types.find((t) => t.type === 'up:promotion')
    );
    expect(/** @type {NonNullable<typeof promo.group.fvaPct>} */ (promo.group.fvaPct)).toBeLessThan(
      0
    );
    expect(promo.group.skus).toBe(2);
  });

  it('the window’s first week counts; the week before it does not', () => {
    const inside = overrideValue(
      [
        rec({
          skuCode: 'P',
          weekStart: '2026-06-29',
          engineValue: 900,
          newValue: 1400,
          reasonCode: 'promotion'
        })
      ],
      actualOf,
      NOW
    );
    const outside = overrideValue(
      [
        rec({
          skuCode: 'P',
          weekStart: '2026-06-22',
          engineValue: 900,
          newValue: 1400,
          reasonCode: 'promotion'
        })
      ],
      actualOf,
      NOW
    );
    expect(inside.review.types.map((t) => [t.type, t.flagged])).toEqual([['up:promotion', true]]);
    expect(outside.review.types).toEqual([]);
  });
});
