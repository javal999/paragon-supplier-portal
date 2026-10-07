import { describe, it, expect } from 'vitest';
/** @import { RangePair } from './demandRange' */
import {
  BASE_RANGE_LEVELS,
  DEFAULT_DEMAND_RANGE_OPTIONS,
  applyRange,
  calibrateSeries,
  demandRange,
  rangeLevels,
  replayAsPlanSnapshots,
  replayForecasts,
  safetyStockOnEngineForecast,
  trackQuantile
} from './demandRange';
/** @import { DemandForecastInput } from './demandForecast' */
import { demandForecast } from './demandForecast';
import { DEFAULT_SAFETY_STOCK_OPTIONS, empiricalQuantile, safetyStockRun } from './safetyStock';
import { addDays, dayOf } from './dates';
/** @import { BomLine, EngineMaterial, FinishedGood, SalesWeek } from './types' */
import { engineDataset } from '../data/mock/fixtures/engineDataset';
import { sdcClock } from '../sdc/clock';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-09 — the demand range: calibration on hand-built series (coverage
// near 90%), widening where history shows under-coverage, the online
// correction, determinism, the material level through the BOM, and what the
// synthetic dataset shows.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A low-discrepancy sequence on [0, 1): evenly spread, deterministic.
 * @param {number} t
 */
const spread = (t) => (t * 0.6180339887498949) % 1;
const OPTS = {
  minCalibration: DEFAULT_DEMAND_RANGE_OPTIONS.minCalibration,
  step: DEFAULT_DEMAND_RANGE_OPTIONS.step
};

/**
 * K origins × H horizons of forecast 1,000; what sold in week t is 1,000 × ratio(t).
 * @param {number} K
 * @param {number} H
 * @param {(t: number) => number} ratio
 * @returns {RangePair[]}
 */
function pairsFor(K, H, ratio) {
  /** @type {RangePair[]} */
  const out = [];
  for (let k = 0; k < K; k += 1)
    for (let h = 1; h <= H; h += 1) {
      const t = k + h - 1;
      out.push({ k, h, forecast: 1000, actual: t < K ? 1000 * ratio(t) : null });
    }
  return out;
}
/**
 * @param {number} part
 * @param {number} whole
 */
const share = (part, whole) => part / whole;

describe('the levels (BR-01, X-05)', () => {
  it('P50 and P90 always; the administrator adds one (95 → P95); 0, or 50 and 90 again, add none', () => {
    expect(BASE_RANGE_LEVELS).toEqual([0.5, 0.9]);
    expect(rangeLevels(0)).toEqual([0.5, 0.9]);
    expect(rangeLevels(95)).toEqual([0.5, 0.9, 0.95]);
    expect(rangeLevels(10)).toEqual([0.1, 0.5, 0.9]);
    expect(rangeLevels(90)).toEqual([0.5, 0.9]);
    expect(rangeLevels(50)).toEqual([0.5, 0.9]);
  });
});

describe('calibration on a hand-built series (BR-02)', () => {
  // Sales spread evenly between 80% and 120% of the forecast: the true P90 is 1.16 × 1,000.
  const cal = calibrateSeries(
    pairsFor(80, 4, (t) => 0.8 + 0.4 * spread(t)),
    80,
    4,
    [0.5, 0.9],
    OPTS
  );

  it('P90 lands near 1,160 and P50 near 1,000; the weekly correction moves them by at most about one step (5% of 1,000)', () => {
    const plain = applyRange(
      [1000, 1000, 1000, 1000],
      { ...cal, offsets: [0, 0] },
      [0.5, 0.9],
      OPTS.minCalibration
    );
    expect(plain.source).toEqual(['own', 'own', 'own', 'own']);
    for (const v of plain.bands[1].values)
      expect(Math.abs(/** @type {NonNullable<typeof v>} */ (v) - 1160)).toBeLessThanOrEqual(15);
    for (const v of plain.bands[0].values)
      expect(Math.abs(/** @type {NonNullable<typeof v>} */ (v) - 1000)).toBeLessThanOrEqual(15);
    const { bands } = applyRange([1000, 1000, 1000, 1000], cal, [0.5, 0.9], OPTS.minCalibration);
    for (const v of bands[1].values)
      expect(Math.abs(/** @type {NonNullable<typeof v>} */ (v) - 1160)).toBeLessThanOrEqual(
        15 + 1000 * OPTS.step
      );
  });

  it('checked honestly week by week, actuals exceed P90 in about 10% of weeks (coverage ≈ 90%) and P50 in about half', () => {
    const e = cal.experience;
    expect(e.checked).toBeGreaterThan(200);
    expect(share(e.above[1], e.checked)).toBeGreaterThan(0.06);
    expect(share(e.above[1], e.checked)).toBeLessThan(0.14);
    expect(share(e.above[0], e.checked)).toBeGreaterThan(0.42);
    expect(share(e.above[0], e.checked)).toBeLessThan(0.58);
  });

  it('the quantile is E14-04’s nearest rank, per horizon, on the ratios known now', () => {
    const scores = cal.scores[0];
    expect(scores).toHaveLength(80);
    const { bands } = applyRange(
      [1000],
      { ...cal, offsets: [0, 0] },
      [0.5, 0.9],
      OPTS.minCalibration
    );
    expect(bands[1].values[0]).toBe(
      Math.round(
        1000 *
          /** @type {NonNullable<ReturnType<typeof empiricalQuantile>>} */ (
            empiricalQuantile(scores, 0.9)
          )
      )
    );
  });

  it('WIDENS where history shows more misses: 18% of weeks above a forecast-based band pulls P90 up until history misses it 10% of the time', () => {
    // A band of forecast × 1.10 is exceeded in 18% of weeks.
    /** @param {number} t */
    const ratio = (t) =>
      spread(t) < 0.18 ? 1.1 + 0.3 * spread(t * 7 + 3) + 0.01 : 0.85 + 0.25 * spread(t * 5 + 1);
    const c = calibrateSeries(pairsFor(100, 1, ratio), 100, 1, [0.9], OPTS);
    const scores = c.scores[0];
    expect(share(scores.filter((r) => r > 1.1).length, scores.length)).toBeCloseTo(0.18, 2);
    const q = /** @type {NonNullable<ReturnType<typeof empiricalQuantile>>} */ (
      empiricalQuantile(scores, 0.9)
    );
    expect(q).toBeGreaterThan(1.1);
    expect(share(scores.filter((r) => r > q).length, scores.length)).toBeLessThanOrEqual(0.1);
  });

  it('too few past ratios at a horizon: the group’s, marked; none there either: no range', () => {
    const few = calibrateSeries(
      pairsFor(6, 2, () => 1),
      6,
      2,
      [0.5, 0.9],
      OPTS
    );
    const group = [Array.from({ length: 20 }, (_, i) => 0.9 + i / 100), []];
    const { bands, source } = applyRange([1000, 1000], few, [0.5, 0.9], OPTS.minCalibration, group);
    expect(source).toEqual(['group', 'none']);
    expect(bands[1].values[0]).toBe(
      Math.round(
        1000 *
          /** @type {NonNullable<ReturnType<typeof empiricalQuantile>>} */ (
            empiricalQuantile(group[0], 0.9)
          )
      )
    );
    expect(bands[1].values[1]).toBeNull();
  });

  it('quantiles never cross and are never negative', () => {
    const c = calibrateSeries(
      pairsFor(40, 1, (t) => spread(t) * 0.1),
      40,
      1,
      [0.5, 0.9],
      OPTS
    );
    const { bands } = applyRange(
      [1000],
      { ...c, offsets: [-0.5, -0.9] },
      [0.5, 0.9],
      OPTS.minCalibration
    );
    expect(bands[0].values[0]).toBe(0);
    expect(
      /** @type {NonNullable<(((typeof bands)[number])['values'])[number]>} */ (bands[1].values[0])
    ).toBeGreaterThanOrEqual(
      /** @type {NonNullable<(((typeof bands)[number])['values'])[number]>} */ (bands[0].values[0])
    );
  });
});

describe('the online correction (BR-03)', () => {
  it('the requirement’s worked example: step 50 → +45 after a miss of P90, −5 after a week inside it', () => {
    expect(trackQuantile(0, true, 0.9, 50)).toBeCloseTo(45, 9);
    expect(trackQuantile(0, false, 0.9, 50)).toBeCloseTo(-5, 9);
  });

  it('when sales jump above the old pattern, each week’s miss moves P90 up by 0.9 × step, and the correction cuts later misses', () => {
    // 40 calm weeks at 0.9–1.1, then sales climbing 2% of the forecast a week: the past ratios lag behind.
    /** @param {number} t */
    const ratio = (t) => (t < 40 ? 0.9 + 0.2 * spread(t) : 1.1 + 0.02 * (t - 39));
    const c = calibrateSeries(pairsFor(60, 1, ratio), 60, 1, [0.9], OPTS);
    expect(c.offsets[0]).toBeGreaterThan(0);
    expect(c.experience.above[0]).toBeLessThan(c.experience.aboveUncorrected[0]);
    // Exactly: calm weeks checked (30, from week 10) move it by −0.1 × step or +0.9 × step; the jump adds +0.9 × step per miss.
    const e = c.experience;
    const expected = OPTS.step * (e.aboveNext[0] - 0.1 * e.checkedNext);
    expect(c.offsets[0]).toBeCloseTo(expected, 9);
  });

  it('the range for a week is built only from what was known at its origin (no look-ahead)', () => {
    // Identical history, except the last week sold 10×: nothing checked before it changes.
    const base = calibrateSeries(
      pairsFor(40, 1, (t) => 0.9 + 0.2 * spread(t)),
      40,
      1,
      [0.9],
      OPTS
    );
    const spike = calibrateSeries(
      pairsFor(40, 1, (t) => (t === 39 ? 10 : 0.9 + 0.2 * spread(t))),
      40,
      1,
      [0.9],
      OPTS
    );
    expect(spike.experience.checked).toBe(base.experience.checked);
    expect(spike.experience.above[0]).toBe(base.experience.above[0] + 1);
  });
});

// ── A small dataset: one SKU and its BOM ────────────────────────────────────

const AS_OF = '2026-08-31';
/** @type {FinishedGood[]} */
const FG = [
  {
    skuCode: 'A',
    name: 'A (test)',
    brand: 'Wardah',
    category: 'Skincare',
    launchDate: '2024-01-01'
  }
];
/** @type {SalesWeek[]} */
const SALES = Array.from({ length: 100 }, (_, i) => ({
  skuCode: 'A',
  weekStart: addDays(AS_OF, -(100 - i) * 7),
  quantity: Math.round(1000 * (0.85 + 0.3 * spread(i))),
  stockout: false
}));
/** @type {BomLine[]} */
const BOM = [
  {
    parentCode: 'A',
    componentCode: 'M-1',
    qtyPer: 2,
    uom: 'PCS',
    scrapPct: 0,
    yieldPct: 1,
    validFrom: '2020-01-01'
  }
];
/** @type {EngineMaterial[]} */
const MATERIALS = [{ materialCode: 'M-1', kind: 'packaging', uom: 'PCS' }];
/** @type {DemandForecastInput} */
const INPUT = { finishedGoods: FG, sales: SALES, asOf: AS_OF, horizonWeeks: 8 };
const SMALL = { ...DEFAULT_DEMAND_RANGE_OPTIONS, originWeeks: 30, retrainWeeks: 8 };

describe('the replay (ENG-B90) and the material level (ENG-B95)', () => {
  const run = demandForecast(INPUT);
  const replay = replayForecasts(INPUT, SMALL);
  const r = demandRange({ ...INPUT, bom: BOM, materials: MATERIALS }, run, SMALL, replay);

  it('origins are the last 30 Mondays; the model is retrained every 8 weeks from the first', () => {
    expect(replay.origins).toHaveLength(30);
    expect(replay.origins[29]).toBe(addDays(AS_OF, -7));
    expect(replay.retrains).toEqual([0, 8, 16, 24].map((k) => replay.origins[k]));
  });

  it('at a retraining the replayed forecast IS the pipeline’s own forecast as of that Monday', () => {
    const o = replay.retrains[1];
    const then = demandForecast({ ...INPUT, asOf: o });
    expect(
      /** @type {NonNullable<ReturnType<typeof replay.forecasts.get>>} */ (
        replay.forecasts.get('A')
      )[8]
    ).toEqual(then.skus[0].base);
  });

  it('a material with 2 per SKU carries twice the SKU’s range (ratios are unchanged by the BOM)', () => {
    const sku = r.skus[0];
    const mat = /** @type {import('./demandRange').MaterialRange} */ (
      r.materials.find((m) => m.key === 'M-1')
    );
    expect(mat.forecast).toEqual(sku.forecast.map((v) => 2 * v));
    for (let j = 0; j < 2; j += 1)
      mat.bands[j].values.forEach((v, i) =>
        expect(
          Math.abs(
            /** @type {NonNullable<typeof v>} */ (v) -
              2 *
                /** @type {NonNullable<(((typeof sku.bands)[number])['values'])[number]>} */ (
                  sku.bands[j].values[i]
                )
          )
        ).toBeLessThanOrEqual(1)
      );
    expect(mat.experience.checked).toBe(sku.experience.checked);
  });

  it('with one SKU the brand and the total are that SKU', () => {
    expect(r.total.bands).toEqual(r.skus[0].bands);
    expect(r.brands[0].bands).toEqual(r.skus[0].bands);
  });

  it('deterministic: the same inputs give the same range, bit for bit', () => {
    const again = demandRange(
      { ...INPUT, bom: BOM, materials: MATERIALS },
      demandForecast(INPUT),
      SMALL
    );
    expect(JSON.stringify(again)).toBe(JSON.stringify(r));
  });

  it('the replay as past plan snapshots: one per origin × week, made on the origin', () => {
    const snaps = replayAsPlanSnapshots(replay);
    expect(snaps).toHaveLength(30 * 8);
    expect(snaps[0]).toEqual({
      skuCode: 'A',
      madeAt: replay.origins[0],
      weekStart: replay.origins[0],
      quantity: /** @type {NonNullable<ReturnType<typeof replay.forecasts.get>>} */ (
        replay.forecasts.get('A')
      )[0][0]
    });
  });
});

// ── The synthetic dataset ───────────────────────────────────────────────────

describe('on the synthetic dataset (ENG-B94, ENG-B97)', () => {
  const data = engineDataset();
  const asOf = dayOf(sdcClock.now());
  const run = demandForecast({
    finishedGoods: data.finishedGoods,
    sales: data.sales,
    fgPlan: data.fgPlan,
    asOf
  });
  const replay = replayForecasts({ ...data, asOf });
  const r = demandRange({ ...data, asOf }, run, DEFAULT_DEMAND_RANGE_OPTIONS, replay);

  it('AC-01: every SKU with a forecast has a P50 and a P90 in every week, P50 ≤ P90', () => {
    expect(r.skus.map((s) => s.key)).toEqual(
      run.skus.filter((s) => s.method !== 'discontinued').map((s) => s.skuCode)
    );
    for (const s of r.skus) {
      s.bands[0].values.forEach((p50, i) => {
        expect(p50, `${s.key} week ${i}`).not.toBeNull();
        expect(
          /** @type {NonNullable<(((typeof s.bands)[number])['values'])[number]>} */ (
            s.bands[1].values[i]
          )
        ).toBeGreaterThanOrEqual(/** @type {NonNullable<typeof p50>} */ (p50));
      });
    }
    // The discontinued SKU has none (named, not counted).
    expect(r.skus.some((s) => s.key === 'SYN-FG-008')).toBe(false);
  });

  it('new SKUs on SAP’s plan are calibrated on SAP’s plan’s errors (ENG-B96)', () => {
    const fresh = r.skus.filter((s) => s.method === 'newSkuSap').map((s) => [s.key, s.basis]);
    expect(fresh).toEqual([
      ['SYN-FG-005', 'sapPlan'],
      ['SYN-FG-010', 'sapPlan'],
      ['SYN-FG-015', 'sapPlan'],
      ['SYN-FG-020', 'sapPlan']
    ]);
  });

  it('52 weekly origins, retrained 7 times; the honest miss rate of P90 over all SKUs is 7.2% against 10%', () => {
    expect(r.origins.count).toBe(52);
    expect(r.retrains).toHaveLength(7);
    const all = /** @type {NonNullable<ReturnType<typeof r.skuExperience.find>>} */ (
      r.skuExperience.find((x) => x.key === 'total')
    ).experience;
    expect(all.checked).toBe(7494);
    expect(Math.round((all.above[1] / all.checked) * 1000) / 10).toBe(7.2);
    expect(Math.round((all.aboveUncorrected[1] / all.checked) * 1000) / 10).toBe(6.8);
  });

  it('E14-04 on the engine’s forecast is only reported: the plan in force for safety stock stays SAP’s', () => {
    const opts = { ...DEFAULT_SAFETY_STOCK_OPTIONS, asOf };
    const today = safetyStockRun(data, opts);
    const engine = safetyStockOnEngineForecast(data, run, replay, opts);
    expect(engine.planMadeAt).toBe(run.weeks[0]);
    // The expected demand differs because the plan differs: the engine's, not SAP's.
    expect(
      engine.materials.some(
        (m, i) =>
          Math.round(m.expectedDemandOverRisk) !==
          Math.round(today.materials[i].expectedDemandOverRisk)
      )
    ).toBe(true);
    // The errors behind it are the replay's origins, not SAP's snapshots.
    const withErrors = /** @type {import('./safetyStock').MaterialSafetyStock} */ (
      engine.materials.find((m) => m.errors.length > 0)
    );
    expect(replay.origins).toContain(withErrors.errors[0].origin);
    expect(engine.materials.map((m) => m.materialCode)).toEqual(
      today.materials.map((m) => m.materialCode)
    );
  });
});
