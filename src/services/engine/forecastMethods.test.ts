import { describe, it, expect } from 'vitest';
import {
  ALPHA_GRID,
  acf,
  comb,
  croston,
  holt,
  holtWith,
  intermittency,
  isSeasonal,
  khChoice,
  linearTrend,
  seasonalIndices,
  ses,
  sesWith,
  theta,
  tsb,
  tsbStep,
} from './forecastMethods';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-07 — the statistical methods on small series worked by hand.
// ─────────────────────────────────────────────────────────────────────────────

describe('exponential smoothing (D2), worked by hand', () => {
  it('SES α = 0.5 on 10, 20, 30: fitted 10, 15; forecast 22.5', () => {
    const f = sesWith([10, 20, 30], 2, { alpha: 0.5 });
    expect(f.fitted.slice(1)).toEqual([10, 15]);
    expect(f.forecast).toEqual([22.5, 22.5]);
  });

  it('Holt α = β = 0.5 on 10, 12, 15: level 14.5, trend 2.25, forecast 16.75 then 19', () => {
    const f = holtWith([10, 12, 15], 2, { alpha: 0.5, beta: 0.5, phi: 1 });
    expect(f.fitted.slice(1)).toEqual([12, 14]);
    expect(f.forecast[0]).toBeCloseTo(16.75, 10);
    expect(f.forecast[1]).toBeCloseTo(19, 10);
  });

  it('damped trend φ = 0.9 on 10, 12, 15: level 14.2825, trend 2.02375', () => {
    const f = holtWith([10, 12, 15], 2, { alpha: 0.5, beta: 0.5, phi: 0.9 });
    expect(f.fitted[1]).toBeCloseTo(11.8, 10);
    expect(f.fitted[2]).toBeCloseTo(13.565, 10);
    expect(f.forecast[0]).toBeCloseTo(14.2825 + 0.9 * 2.02375, 10);
    expect(f.forecast[1]).toBeCloseTo(14.2825 + (0.9 + 0.81) * 2.02375, 10);
  });

  it('the grid picks the smallest in-sample error and keeps the first on a tie', () => {
    // A flat series fits perfectly at every α: the first grid value is kept.
    expect(ses(new Array(10).fill(100), 3).params.alpha).toBe(ALPHA_GRID[0]);
    // A straight line is fitted exactly by Holt, so its forecast continues the line.
    const line = Array.from({ length: 10 }, (_, t) => 10 + 2 * t);
    const h = holt(line, 3, false);
    expect(h.forecast.map((v) => Math.round(v * 1e9) / 1e9)).toEqual([30, 32, 34]);
  });

  it('Comb is the mean of the three: a flat series forecasts its level', () => {
    const c = comb(new Array(12).fill(250), 4);
    expect(c.forecast).toEqual([250, 250, 250, 250]);
    expect(c.seasonal).toBe(false);
  });
});

describe('Theta (D2), worked by hand', () => {
  it('on 10, 12, 14, 16, 18: the line is exact, SES(α 0.95) level 17.8947375, forecast 18.94736875', () => {
    expect(linearTrend([10, 12, 14, 16, 18])).toEqual({ a: 10, b: 2 });
    const f = theta([10, 12, 14, 16, 18], 2, false);
    expect(f.alpha).toBe(0.95);
    expect(f.forecast[0]).toBeCloseTo(0.5 * 20 + 0.5 * 17.8947375, 9);
    expect(f.forecast[1]).toBeCloseTo(0.5 * 22 + 0.5 * 17.8947375, 9);
  });
});

describe('seasonality (M4 test, classical decomposition)', () => {
  const periodic = Array.from({ length: 24 }, (_, t) => [1, 2, 3, 4][t % 4]);

  it('a repeating pattern is seasonal; a straight line is not; fewer than two seasons is never tested', () => {
    expect(acf(periodic, 4)).toBeGreaterThan(0.8);
    expect(isSeasonal(periodic, 4)).toBe(true);
    expect(isSeasonal(Array.from({ length: 24 }, (_, t) => t + 1), 4)).toBe(false);
    expect(isSeasonal(periodic.slice(0, 7), 4)).toBe(false);
  });

  it('Comb on two seasons of weekly sales with a five-week peak at double: seasonal, and the peak comes back', () => {
    const y = Array.from({ length: 104 }, (_, t) => (t % 52 >= 10 && t % 52 < 15 ? 2000 : 1000));
    const c = comb(y, 26);
    expect(c.seasonal).toBe(true);
    expect(c.forecast[0]).toBeCloseTo(1000, 6);
    expect(c.forecast[12]).toBeCloseTo(2000, 6);
    // Known-bad control: with seasonality not allowed, the peak is averaged away.
    expect(comb(y, 26, false).forecast[12]).toBeLessThan(1500);
  });

  it('indices: the centred 2×4 average is 2.5 everywhere, so the ratios are 0.4, 0.8, 1.2, 1.6', () => {
    const si = seasonalIndices(periodic.slice(0, 12), 4);
    expect(si.map((v) => Math.round(v * 1e9) / 1e9)).toEqual([0.4, 0.8, 1.2, 1.6]);
  });
});

describe('slow and intermittent SKUs (D3), the requirement’s worked examples', () => {
  const series = [0, 0, 500, 0, 0, 0, 400];

  it('SBA: 500 in week 3, 400 four weeks later → size 490, gap 3.1, 0.95 × 490 ÷ 3.1 = 150 a week', () => {
    const f = croston(series, 3, true);
    expect(f.size).toBeCloseTo(490, 10);
    expect(f.interval).toBeCloseTo(3.1, 10);
    expect(f.forecast[0]).toBeCloseTo((0.95 * 490) / 3.1, 10);
    expect(Math.round(f.forecast[0])).toBe(150);
  });

  it('Croston is the same without the 0.95; nothing is fitted before the first sale', () => {
    const f = croston(series, 1, false);
    expect(f.forecast[0]).toBeCloseTo(490 / 3.1, 10);
    expect(f.fitted.slice(0, 3).every(Number.isNaN)).toBe(true);
    expect(f.fitted[3]).toBeCloseTo(500 / 3, 10);
    expect(croston([0, 0, 0], 2, true).forecast).toEqual([0, 0]);
  });

  it('TSB: 0.30 × 450 = 135; a week with no sale → 0.27 × 450 = 121.5; a sale of 500 → 0.37, 455', () => {
    const s = { probability: 0.3, size: 450 };
    expect(s.probability * s.size).toBeCloseTo(135, 10);
    const none = tsbStep(s, 0);
    expect(none.probability).toBeCloseTo(0.27, 10);
    expect(none.size).toBe(450);
    expect(none.probability * none.size).toBeCloseTo(121.5, 10);
    const sale = tsbStep(s, 500);
    expect(sale.probability).toBeCloseTo(0.37, 10);
    expect(sale.size).toBeCloseTo(455, 10);
  });

  it('TSB keeps falling while sales stay at zero (a dying SKU), unlike Croston', () => {
    const dying = [300, 0, 300, 300, 0, 0, 0, 0, 0, 0];
    expect(tsb(dying, 1).forecast[0]).toBeLessThan(tsb(dying.slice(0, 5), 1).forecast[0]);
    expect(croston(dying, 1, true).forecast[0]).toBe(croston(dying.slice(0, 5), 1, true).forecast[0]);
  });

  it('p and v: 7 weeks, 2 with a sale → p 3.5; sizes 500 and 400 → v = 2,500 ÷ 450² ', () => {
    const i = intermittency(series);
    expect(i.p).toBe(3.5);
    expect(i.v).toBeCloseTo(2500 / 202500, 12);
    expect(intermittency([0, 0]).p).toBe(Infinity);
  });
});

describe('Kostenko–Hyndman: SBA whenever v > 2 − 3p/2', () => {
  it('chooses on both sides of the line, Croston on it', () => {
    expect(khChoice(1.2, 0.1)).toBe('croston'); // 2 − 1.8 = 0.2
    expect(khChoice(1.2, 0.3)).toBe('sba');
    expect(khChoice(1.2, 0.2)).toBe('croston'); // on the line
    expect(khChoice(4 / 3, 0.01)).toBe('sba'); // from p = 4/3 any variation → SBA
    expect(khChoice(4 / 3, 0)).toBe('croston'); // identical sizes at exactly p = 4/3
  });

  it('is not the popular 1.32 / 0.49 cut-off: p 1.3, v 0.45 is SBA here', () => {
    expect(khChoice(1.3, 0.45)).toBe('sba');
  });
});
