// ─────────────────────────────────────────────────────────────────────────────
// FORECAST METHODS — the statistical parts of REQ-E14-07 (METHOD-SPEC D2, D3).
//
// Pure functions over plain number arrays: a series in, a forecast and the
// one-step in-sample fit out. No clock, no store, no randomness (X-01). The
// pipeline that picks a method per SKU is `demandForecast.ts`; reconciling
// SKU, brand and total is `reconcile.ts`.
//
// ── D2 · THE FALLBACK: "COMB" AND THETA (M4 benchmark code) ─────────────────
//   · Seasonality test: seasonal when |r_m| > 1.645 · √((1 + 2·Σ_{k<m} r_k²) / n),
//     r_k the autocorrelation at lag k, m the periods per year (52 weeks).
//     Tested only with at least two full seasons (n ≥ 2m): the classical
//     decomposition needs two to place one ratio at every position.
//   · Seasonal → classical multiplicative decomposition: a centred 2×m moving
//     average, ratio y ÷ MA, the mean ratio per position, normalised to mean 1.
//     The methods run on y ÷ index and the index is put back on the forecast.
//   · SES:     ŷ_t = ℓ_{t−1};              ℓ_t = α·y_t + (1−α)·ℓ_{t−1}
//   · Holt:    ŷ_t = ℓ_{t−1} + b_{t−1};    ℓ_t = α·y_t + (1−α)(ℓ_{t−1}+b_{t−1})
//                                           b_t = β(ℓ_t−ℓ_{t−1}) + (1−β)·b_{t−1}
//   · Damped:  as Holt with φ·b in place of b; h steps ahead ℓ + (φ+…+φ^h)·b
//   · Starting values: ℓ₀ = y₀, b₀ = y₁ − y₀. Parameters are chosen by the
//     smallest one-step in-sample squared error over a FIXED GRID (α and β in
//     steps of 0.05, β ≤ α; φ ∈ {0.80, 0.85, 0.90, 0.95, 0.98}); a tie keeps
//     the first in grid order. A grid rather than a numerical optimiser so the
//     result is exact, repeatable and portable (ENG-B61).
//   · Comb = (SES + Holt + Damped) ÷ 3.
//   · A calendar index of PTI's demand events (`eventCalendar.ts`), when given,
//     is divided out of the history before the seasonality test and
//     multiplied back onto the forecast (owner, 2026-09-29; ENG-B61, B73).
//   · Theta (classic): 0.5·L0 + 0.5·SES(L2), L0 the least-squares line on
//     time, L2 = 2·y − L0.
//
// ── D3 · SLOW AND INTERMITTENT DEMAND ───────────────────────────────────────
//   · Croston: updated only in weeks with a sale — size ẑ ← ẑ + α(y − ẑ),
//     interval p̂ ← p̂ + α(q − p̂), q the weeks since the last sale; forecast
//     ẑ ÷ p̂. Starts at the first sale: ẑ = its size, p̂ = its week number
//     (weeks up to and including it). α = 0.1.
//   · SBA: Croston × (1 − α/2) — 0.95 at α = 0.1 (removes Croston's bias).
//   · TSB: updated EVERY week — probability D̂ ← D̂ + β(1{y>0} − D̂); size
//     Ẑ ← Ẑ + α(y − Ẑ) only in weeks with a sale; forecast D̂·Ẑ. Starts at
//     the share of weeks with a sale and the mean sale size.
//   · Kostenko–Hyndman (JORS 2006): SBA whenever v > 2 − 3p/2, v the squared
//     coefficient of variation of the sale sizes and p the mean interval;
//     otherwise Croston. (Not the popular 1.32 / 0.49.)
//
// Worked examples (REQ-E14-07 "Calculation"): SBA 500 then 400 four weeks
// later → size 490, gap 3.1, 0.95 × 490 ÷ 3.1 = 150 a week; TSB 0.30 × 450 =
// 135, after a week with no sale 0.27 × 450 = 121.5. `forecastMethods.test.ts`
// runs both verbatim.
// ─────────────────────────────────────────────────────────────────────────────

/** Weeks per year: the seasonal period for weekly sell-in. */
export const SEASON_WEEKS = 52;

/** One method's result: the forecast for h = 1…H and the one-step in-sample fit. */
export interface MethodFit {
  /** forecast[h − 1] is the forecast h weeks past the last observation. */
  readonly forecast: readonly number[];
  /**
   * fitted[t] is the forecast of y[t] made one week earlier; NaN where none
   * exists (the first week, or before the first sale for Croston/SBA).
   */
  readonly fitted: readonly number[];
}

// ── Seasonality (D2) ─────────────────────────────────────────────────────────

/** Autocorrelation of `y` at lag `k` (the M4 benchmark's acf). */
export function acf(y: readonly number[], k: number): number {
  const n = y.length;
  const mean = y.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let t = 0; t < n; t += 1) {
    den += (y[t] - mean) ** 2;
    if (t >= k) num += (y[t] - mean) * (y[t - k] - mean);
  }
  return den === 0 ? 0 : num / den;
}

/** The M4 seasonality test at period `m`. False below two full seasons. */
export function isSeasonal(y: readonly number[], m: number = SEASON_WEEKS): boolean {
  const n = y.length;
  if (m < 2 || n < 2 * m) return false;
  let s = 0;
  for (let k = 1; k < m; k += 1) s += acf(y, k) ** 2;
  const limit = 1.645 * Math.sqrt((1 + 2 * s) / n);
  return Math.abs(acf(y, m)) > limit;
}

/**
 * Classical multiplicative seasonal indices, one per position t mod m, mean 1.
 * Needs n ≥ 2m; a position with no usable ratio gets 1.
 */
export function seasonalIndices(y: readonly number[], m: number = SEASON_WEEKS): number[] {
  const n = y.length;
  const half = Math.floor(m / 2);
  const sums = new Array<number>(m).fill(0);
  const counts = new Array<number>(m).fill(0);
  for (let t = half; t < n - half; t += 1) {
    let ma: number;
    if (m % 2 === 0) {
      let s = 0.5 * y[t - half] + 0.5 * y[t + half];
      for (let j = -half + 1; j <= half - 1; j += 1) s += y[t + j];
      ma = s / m;
    } else {
      let s = 0;
      for (let j = -half; j <= half; j += 1) s += y[t + j];
      ma = s / m;
    }
    if (ma <= 0) continue;
    sums[t % m] += y[t] / ma;
    counts[t % m] += 1;
  }
  const raw = sums.map((s, p) => (counts[p] > 0 ? s / counts[p] : 1));
  const norm = raw.reduce((s, v) => s + v, 0) / m;
  return raw.map((v) => (norm > 0 ? v / norm : 1));
}

// ── Exponential smoothing (D2) ───────────────────────────────────────────────

/** α grid (and β grid, bounded by α): 0.05, 0.10, …, 0.95. */
export const ALPHA_GRID: readonly number[] = Array.from({ length: 19 }, (_, i) => Math.round((i + 1) * 5) / 100);
/** φ grid for the damped trend. */
export const PHI_GRID: readonly number[] = [0.8, 0.85, 0.9, 0.95, 0.98];

export interface SesParams {
  readonly alpha: number;
}
export interface HoltParams {
  readonly alpha: number;
  readonly beta: number;
  /** 1 = Holt's linear trend; below 1 = damped. */
  readonly phi: number;
}

/** SES with a given α. */
export function sesWith(y: readonly number[], horizon: number, p: SesParams): MethodFit {
  const fitted: number[] = [NaN];
  let level = y[0];
  for (let t = 1; t < y.length; t += 1) {
    fitted.push(level);
    level = p.alpha * y[t] + (1 - p.alpha) * level;
  }
  return { forecast: new Array<number>(horizon).fill(level), fitted };
}

/** Holt's trend (φ = 1) or damped trend (φ < 1) with given parameters. Needs n ≥ 2. */
export function holtWith(y: readonly number[], horizon: number, p: HoltParams): MethodFit {
  const fitted: number[] = [NaN];
  let level = y[0];
  let trend = y.length > 1 ? y[1] - y[0] : 0;
  for (let t = 1; t < y.length; t += 1) {
    fitted.push(level + p.phi * trend);
    const prev = level;
    level = p.alpha * y[t] + (1 - p.alpha) * (level + p.phi * trend);
    trend = p.beta * (level - prev) + (1 - p.beta) * p.phi * trend;
  }
  const forecast: number[] = [];
  let damp = 0;
  for (let h = 1; h <= horizon; h += 1) {
    damp += p.phi ** h;
    forecast.push(level + damp * trend);
  }
  return { forecast, fitted };
}

/**
 * The one-step in-sample squared error of SES (φ = 0 trend-free) or Holt / damped
 * with given parameters, without building the fit — the same arithmetic, in the
 * same order, as summing (y[t] − fitted[t])² over `holtWith`'s (or `sesWith`'s) fit, so the grid
 * search picks exactly the parameters it picked before (E14-09 replay speed).
 */
function sesSse(y: readonly number[], alpha: number): number {
  let level = y[0];
  let s = 0;
  for (let t = 1; t < y.length; t += 1) {
    s += (y[t] - level) ** 2;
    level = alpha * y[t] + (1 - alpha) * level;
  }
  return s;
}

function holtSse(y: readonly number[], p: HoltParams): number {
  let level = y[0];
  let trend = y.length > 1 ? y[1] - y[0] : 0;
  let s = 0;
  for (let t = 1; t < y.length; t += 1) {
    s += (y[t] - (level + p.phi * trend)) ** 2;
    const prev = level;
    level = p.alpha * y[t] + (1 - p.alpha) * (level + p.phi * trend);
    trend = p.beta * (level - prev) + (1 - p.beta) * p.phi * trend;
  }
  return s;
}

export interface FittedMethod<P> extends MethodFit {
  readonly params: P;
}

/** SES with α chosen on the grid. */
export function ses(y: readonly number[], horizon: number): FittedMethod<SesParams> {
  let best: SesParams | null = null;
  let bestErr = Infinity;
  for (const alpha of ALPHA_GRID) {
    const err = sesSse(y, alpha);
    if (err < bestErr) {
      bestErr = err;
      best = { alpha };
    }
  }
  return { ...sesWith(y, horizon, best!), params: best! };
}

/** Holt (damped = false) or damped trend, parameters chosen on the grid. */
export function holt(y: readonly number[], horizon: number, damped: boolean): FittedMethod<HoltParams> {
  let best: HoltParams | null = null;
  let bestErr = Infinity;
  for (const phi of damped ? PHI_GRID : [1]) {
    for (const alpha of ALPHA_GRID) {
      for (const beta of ALPHA_GRID) {
        if (beta > alpha) break;
        const params = { alpha, beta, phi };
        const err = holtSse(y, params);
        if (err < bestErr) {
          bestErr = err;
          best = params;
        }
      }
    }
  }
  return { ...holtWith(y, horizon, best!), params: best! };
}

export interface CombFit extends MethodFit {
  readonly seasonal: boolean;
  readonly ses: SesParams;
  readonly holt: HoltParams;
  readonly damped: HoltParams;
}

/**
 * A multiplicative index per week (`eventCalendar.ts`): one per history week
 * and one per forecast week. The history is divided by it before fitting and
 * the forecast multiplied by it.
 */
export interface CalendarIndex {
  readonly history: readonly number[];
  readonly horizon: readonly number[];
}

/** Deseasonalise (when the test says so), run the three methods, average, reseasonalise. */
function withSeasonality<T extends MethodFit>(
  y: readonly number[],
  run: (x: readonly number[]) => T,
  allowSeasonal: boolean,
  index: CalendarIndex | undefined,
  /** Replay (E14-09): the seasonality decided at the last retraining, not re-tested. */
  seasonalDecided?: boolean,
): { fit: T; seasonal: boolean; forecast: number[]; fitted: number[] } {
  // The calendar index first (PTI's known events), then the M4 test on what is left.
  const ev = (t: number) => {
    const v = index ? (t < y.length ? index.history[t] : index.horizon[t - y.length]) : 1;
    return v > 0 ? v : 1;
  };
  const z = y.map((v, t) => v / ev(t));
  const seasonal =
    seasonalDecided !== undefined ? seasonalDecided && z.length >= 2 * SEASON_WEEKS : allowSeasonal && isSeasonal(z);
  const si = seasonal ? seasonalIndices(z) : null;
  // A position whose index is 0 (no sale there in any season) is left as is.
  const at = (t: number) => (si && si[t % SEASON_WEEKS] > 0 ? si[t % SEASON_WEEKS] : 1) * ev(t);
  const n = y.length;
  const x = y.map((v, t) => v / at(t));
  const fit = run(x);
  const forecast = fit.forecast.map((v, i) => v * at(n + i));
  const fitted = fit.fitted.map((v, t) => v * at(t));
  return { fit, seasonal, forecast, fitted };
}

/**
 * The Comb benchmark (D2): mean of SES, Holt and damped trend on the
 * deseasonalised series. `allowSeasonal` false skips the seasonality test
 * (a short history cannot carry one).
 */
export function comb(y: readonly number[], horizon: number, allowSeasonal = true, index?: CalendarIndex): CombFit {
  if (y.length < 2) {
    const v = y.length === 1 ? y[0] : 0;
    const flat = { alpha: 0, beta: 0, phi: 1 };
    return { forecast: new Array<number>(horizon).fill(v), fitted: y.map(() => NaN), seasonal: false, ses: { alpha: 0 }, holt: flat, damped: flat };
  }
  let parts: { s: FittedMethod<SesParams>; h: FittedMethod<HoltParams>; d: FittedMethod<HoltParams> } | null = null;
  const r = withSeasonality(
    y,
    (x) => {
      const s = ses(x, horizon);
      const h = holt(x, horizon, false);
      const d = holt(x, horizon, true);
      parts = { s, h, d };
      return {
        forecast: s.forecast.map((v, i) => (v + h.forecast[i] + d.forecast[i]) / 3),
        fitted: s.fitted.map((v, t) => (v + h.fitted[t] + d.fitted[t]) / 3),
      };
    },
    allowSeasonal,
    index,
  );
  const p = parts!;
  return { forecast: r.forecast, fitted: r.fitted, seasonal: r.seasonal, ses: p.s.params, holt: p.h.params, damped: p.d.params };
}

/** The Comb's parameters and seasonality as chosen at a (re)training. */
export interface CombParams {
  readonly ses: SesParams;
  readonly holt: HoltParams;
  readonly damped: HoltParams;
  readonly seasonal: boolean;
}

/**
 * The Comb with its parameters and seasonality held as they were chosen at the
 * last retraining (E14-09 replay, ENG-B90): the three methods' states roll
 * forward over `y` with no grid search. Held at the parameters `comb` chose on
 * the same `y`, it returns exactly `comb`'s forecast (tested).
 */
export function combWith(y: readonly number[], horizon: number, params: CombParams, index?: CalendarIndex): MethodFit {
  if (y.length < 2) {
    const v = y.length === 1 ? y[0] : 0;
    return { forecast: new Array<number>(horizon).fill(v), fitted: y.map(() => NaN) };
  }
  const r = withSeasonality(
    y,
    (x) => {
      const s = sesWith(x, horizon, params.ses);
      const h = holtWith(x, horizon, params.holt);
      const d = holtWith(x, horizon, params.damped);
      return {
        forecast: s.forecast.map((v, i) => (v + h.forecast[i] + d.forecast[i]) / 3),
        fitted: s.fitted.map((v, t) => (v + h.fitted[t] + d.fitted[t]) / 3),
      };
    },
    params.seasonal,
    index,
    params.seasonal,
  );
  return { forecast: r.forecast, fitted: r.fitted };
}

/** Least-squares line a + b·t over t = 0…n−1. */
export function linearTrend(y: readonly number[]): { a: number; b: number } {
  const n = y.length;
  if (n < 2) return { a: n === 1 ? y[0] : 0, b: 0 };
  const tMean = (n - 1) / 2;
  const yMean = y.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let t = 0; t < n; t += 1) {
    num += (t - tMean) * (y[t] - yMean);
    den += (t - tMean) ** 2;
  }
  const b = num / den;
  return { a: yMean - b * tMean, b };
}

export interface ThetaFit extends MethodFit {
  readonly seasonal: boolean;
  readonly alpha: number;
  readonly line: { readonly a: number; readonly b: number };
}

/** Classic Theta (D2): 0.5·L0 + 0.5·SES(L2), on the deseasonalised series. */
export function theta(y: readonly number[], horizon: number, allowSeasonal = true, index?: CalendarIndex): ThetaFit {
  if (y.length < 2) {
    const v = y.length === 1 ? y[0] : 0;
    return { forecast: new Array<number>(horizon).fill(v), fitted: y.map(() => NaN), seasonal: false, alpha: 0, line: { a: v, b: 0 } };
  }
  let meta: { alpha: number; line: { a: number; b: number } } | null = null;
  const r = withSeasonality(
    y,
    (x) => {
      const line = linearTrend(x);
      const n = x.length;
      const l2 = x.map((v, t) => 2 * v - (line.a + line.b * t));
      const s = ses(l2, horizon);
      meta = { alpha: s.params.alpha, line };
      return {
        forecast: s.forecast.map((v, i) => 0.5 * (line.a + line.b * (n + i)) + 0.5 * v),
        fitted: s.fitted.map((v, t) => 0.5 * (line.a + line.b * t) + 0.5 * v),
      };
    },
    allowSeasonal,
    index,
  );
  const m = meta!;
  return { forecast: r.forecast, fitted: r.fitted, seasonal: r.seasonal, alpha: m.alpha, line: m.line };
}

// ── Intermittent demand (D3) ─────────────────────────────────────────────────

/** Default smoothing weight for Croston, SBA and TSB (METHOD-SPEC D3). */
export const INTERMITTENT_ALPHA = 0.1;

export interface Intermittency {
  /** Mean interval between sales: weeks ÷ weeks with a sale (∞ when none). */
  readonly p: number;
  /** Squared coefficient of variation of the sale sizes (0 with fewer than 2). */
  readonly v: number;
  readonly weeksWithSale: number;
}

/** p and v of a series (the Kostenko–Hyndman inputs). */
export function intermittency(y: readonly number[]): Intermittency {
  const sizes = y.filter((v) => v > 0);
  const k = sizes.length;
  if (k === 0) return { p: Infinity, v: 0, weeksWithSale: 0 };
  const mean = sizes.reduce((s, v) => s + v, 0) / k;
  const variance = sizes.reduce((s, v) => s + (v - mean) ** 2, 0) / k;
  return { p: y.length / k, v: k < 2 || mean === 0 ? 0 : variance / (mean * mean), weeksWithSale: k };
}

export type IntermittentMethod = 'croston' | 'sba';

/** Kostenko–Hyndman: SBA whenever v > 2 − 3p/2, otherwise Croston. */
export function khChoice(p: number, v: number): IntermittentMethod {
  return v > 2 - 1.5 * p ? 'sba' : 'croston';
}

/** Croston (factor 1) or SBA (factor 1 − α/2). A series with no sale forecasts 0. */
export function croston(y: readonly number[], horizon: number, sba: boolean, alpha: number = INTERMITTENT_ALPHA): MethodFit & { size: number; interval: number } {
  const factor = sba ? 1 - alpha / 2 : 1;
  const fitted: number[] = [];
  let size = NaN;
  let interval = NaN;
  let since = 0;
  for (let t = 0; t < y.length; t += 1) {
    fitted.push(Number.isNaN(size) ? NaN : (factor * size) / interval);
    since += 1;
    if (y[t] > 0) {
      if (Number.isNaN(size)) {
        size = y[t];
        interval = since;
      } else {
        size += alpha * (y[t] - size);
        interval += alpha * (since - interval);
      }
      since = 0;
    }
  }
  const f = Number.isNaN(size) ? 0 : (factor * size) / interval;
  return { forecast: new Array<number>(horizon).fill(f), fitted, size: Number.isNaN(size) ? 0 : size, interval: Number.isNaN(interval) ? 0 : interval };
}

export interface TsbState {
  /** Probability of a sale in a week. */
  readonly probability: number;
  /** Typical size of a sale. */
  readonly size: number;
}

/** One TSB week: probability updated every week, size only when there is a sale. */
export function tsbStep(s: TsbState, y: number, alpha: number = INTERMITTENT_ALPHA, beta: number = INTERMITTENT_ALPHA): TsbState {
  return y > 0
    ? { probability: s.probability + beta * (1 - s.probability), size: s.size + alpha * (y - s.size) }
    : { probability: s.probability + beta * (0 - s.probability), size: s.size };
}

/** TSB over a series, starting at the share of weeks with a sale and the mean sale size. */
export function tsb(y: readonly number[], horizon: number, alpha: number = INTERMITTENT_ALPHA, beta: number = INTERMITTENT_ALPHA): MethodFit & TsbState {
  const sizes = y.filter((v) => v > 0);
  let s: TsbState = {
    probability: y.length ? sizes.length / y.length : 0,
    size: sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0,
  };
  const fitted: number[] = [];
  for (const v of y) {
    fitted.push(s.probability * s.size);
    s = tsbStep(s, v, alpha, beta);
  }
  return { forecast: new Array<number>(horizon).fill(s.probability * s.size), fitted, ...s };
}
