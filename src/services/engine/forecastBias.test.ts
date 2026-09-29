// REQ-E14-11 BR-01 — Trigg's tracking signal, on hand-built series and on the
// synthetic dataset (engine against SAP's plan over the same past weeks).

import { describe, expect, it } from 'vitest';
import { TS_ALPHA, TS_LIMIT, TS_MIN_ERRORS, forecastBias, isBiasAlarm, trackingSignal } from './forecastBias';
import { engineDataset } from '../data/mock/fixtures/engineDataset';
import { sdcClock } from '../sdc/clock';
import { addDays, mondayOf } from './dates';

describe('the tracking signal (Spec G2)', () => {
  it('the constants are the spec’s: weight 0.1, alarm above 0.51', () => {
    expect(TS_ALPHA).toBe(0.1);
    expect(TS_LIMIT).toBe(0.51);
  });

  it('a forecast that is always low (biased series): the signal runs to +1 and the alarm fires, direction under', () => {
    // actual 100 every week, forecast 80 ± 5: every error positive.
    const errors = Array.from({ length: 20 }, (_, t) => 100 - (80 + (t % 2 === 0 ? 5 : -5)));
    const ts = trackingSignal(errors, errors.map(() => 100));
    expect(ts.signal).toBeCloseTo(1, 10);
    expect(ts.alarm).toBe(true);
    expect(ts.direction).toBe('under');
    expect(ts.meanErrorPct).toBeCloseTo(0.2, 10);
  });

  it('a forecast that is always high: the signal runs to −1, direction over', () => {
    const ts = trackingSignal(Array.from({ length: 20 }, () => -30));
    expect(ts.signal).toBeCloseTo(-1, 10);
    expect(ts.alarm).toBe(true);
    expect(ts.direction).toBe('over');
  });

  it('an unbiased series (errors that cancel): the signal stays near 0 and no alarm', () => {
    const errors = Array.from({ length: 40 }, (_, t) => (t % 2 === 0 ? 20 : -20));
    const ts = trackingSignal(errors);
    expect(Math.abs(ts.signal!)).toBeLessThan(0.11);
    expect(ts.alarm).toBe(false);
  });

  it('the smoothing is E = 0.1·e + 0.9·E and M = 0.1·|e| + 0.9·M, from 0 (worked by hand)', () => {
    const ts = trackingSignal([10, -10, 10]);
    // E: 1, 1 − 0.9 = −0.1 … computed: E1 = 1; E2 = −1 + 0.9 = −0.1; E3 = 1 − 0.09 = 0.91
    // M: 1; 1 + 0.9 = 1.9; 1 + 1.71 = 2.71
    expect(ts.smoothedError).toBeCloseTo(0.91, 10);
    expect(ts.smoothedAbsError).toBeCloseTo(2.71, 10);
    expect(ts.signal).toBeCloseTo(0.91 / 2.71, 10);
    expect(ts.errors).toBe(3);
  });

  it('the 0.51 boundary: exactly 0.51 does not alarm, just above does (both signs)', () => {
    expect(isBiasAlarm(0.51, 20)).toBe(false);
    expect(isBiasAlarm(-0.51, 20)).toBe(false);
    expect(isBiasAlarm(0.5100001, 20)).toBe(true);
    expect(isBiasAlarm(-0.5100001, 20)).toBe(true);
    expect(isBiasAlarm(0.5099999, 20)).toBe(false);
  });

  it('the boundary through the signal itself: a series landing just under and just over 0.51', () => {
    // Thirteen errors of +10 leave E = M = 10·(1 − 0.9¹³) = 7.458; a last error −n gives
    // T = (6.712 − 0.1n) ÷ (6.712 + 0.1n), which crosses 0.51 at n ≈ 21.78.
    const under = trackingSignal([...Array.from({ length: 13 }, () => 10), -21.9]);
    const over = trackingSignal([...Array.from({ length: 13 }, () => 10), -21.7]);
    expect(under.signal!).toBeLessThan(0.51);
    expect(over.signal!).toBeGreaterThan(0.51);
    expect(under.alarm).toBe(false);
    expect(over.alarm).toBe(true);
  });

  it(`fewer than ${TS_MIN_ERRORS} errors: the signal is shown but cannot alarm (ENG-B101)`, () => {
    const short = trackingSignal(Array.from({ length: TS_MIN_ERRORS - 1 }, () => 50));
    expect(short.signal).toBeCloseTo(1, 10);
    expect(short.alarm).toBe(false);
    expect(trackingSignal(Array.from({ length: TS_MIN_ERRORS }, () => 50)).alarm).toBe(true);
  });

  it('a week that does not count (null: no actual, a stock-out) leaves the signal where it was', () => {
    const a = trackingSignal([10, 10, -5]);
    const b = trackingSignal([10, null, 10, null, -5]);
    expect(b.signal).toBeCloseTo(a.signal!, 12);
    expect(b.errors).toBe(3);
    expect(trackingSignal([]).signal).toBeNull();
    expect(trackingSignal([0, 0]).signal).toBe(0);
  });
});

describe('BR-01 on the synthetic dataset — engine against SAP’s plan (seed 20260924)', () => {
  const data = engineDataset();
  const asOf = sdcClock.now().slice(0, 10);
  const run = forecastBias({ finishedGoods: data.finishedGoods, sales: data.sales, fgPlan: data.fgPlan, bom: data.bom, materials: data.materials, asOf });

  it('26 weekly origins, the last the Monday before this week', () => {
    expect(run.origins).toHaveLength(26);
    expect(run.origins[25]).toBe(addDays(mondayOf(asOf), -7));
    expect(run.origins[0]).toBe(addDays(mondayOf(asOf), -7 * 26));
  });

  it('the engine forecast at an origin is the first week of a run made as if it were that Monday (no look-ahead)', () => {
    const sku = run.skus.find((s) => s.method === 'comb')!;
    const p = sku.points[10];
    // A sale in the origin week itself must not change the forecast made that Monday.
    const bumped = data.sales.map((s) => (s.skuCode === sku.skuCode && s.weekStart === p.origin ? { ...s, quantity: s.quantity * 10 } : s));
    const again = forecastBias({ finishedGoods: data.finishedGoods, sales: bumped, fgPlan: data.fgPlan, bom: data.bom, materials: data.materials, asOf, origins: 26 - 10 });
    const q = again.skus.find((s) => s.skuCode === sku.skuCode)!.points[0];
    expect(q.origin).toBe(p.origin);
    expect(q.engine).toBe(p.engine);
    expect(q.actual).toBe(p.actual! * 10);
  });

  it('both signals are measured on the same cells', () => {
    for (const s of run.skus) expect(s.engine.errors).toBe(s.sap.errors);
  });

  it('what it shows (ENG-B107): alarms per SKU and material, engine and SAP’s plan', () => {
    const named = (pick: 'engine' | 'sap') => run.skus.filter((s) => s[pick].alarm).map((s) => s.skuCode);
    const summary = {
      skus: run.skus.length,
      engine: named('engine'),
      sap: named('sap'),
      skuAlarms: run.alarms.skus,
      materials: run.materials.length,
      materialAlarms: run.alarms.materials,
    };
    // Pinned by name: a replaced dataset changes these members (DATA-POPULATION pin).
    expect(summary).toMatchInlineSnapshot(`
      {
        "engine": [],
        "materialAlarms": {
          "engine": {
            "over": 0,
            "total": 0,
            "under": 0,
          },
          "sap": {
            "over": 6,
            "total": 19,
            "under": 13,
          },
        },
        "materials": 42,
        "sap": [
          "SYN-FG-001",
          "SYN-FG-006",
          "SYN-FG-008",
          "SYN-FG-011",
          "SYN-FG-012",
          "SYN-FG-013",
          "SYN-FG-016",
          "SYN-FG-017",
          "SYN-FG-018",
          "SYN-FG-019",
        ],
        "skuAlarms": {
          "engine": {
            "over": 0,
            "total": 0,
            "under": 0,
          },
          "sap": {
            "over": 4,
            "total": 10,
            "under": 6,
          },
        },
        "skus": 20,
      }
    `);
  });
});
