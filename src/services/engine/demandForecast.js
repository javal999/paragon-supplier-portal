// ─────────────────────────────────────────────────────────────────────────────
// FINISHED-GOODS DEMAND FORECAST — REQ-E14-07 (METHOD-SPEC D1–D4), BL-110.
//
// Weekly sell-in per SKU (ENG-D10: PTI's shipments to its DCs and
// distributors, own brands only) for the next 26 weeks, the method that made
// each SKU's forecast, and SKU, brand and total reconciled so they add up.
// Pure: the dataset and the hub's date in, the run out (X-01).
//
// ── WHICH METHOD, PER SKU (first that applies) ──────────────────────────────
//   1. OEM (`FinishedGood.oem`) — NOT FORECAST. Its demand is the brand's POs,
//      exploded as firm orders (ENG-D20). Listed, left out of every level.
//   2. Discontinued on or before the first forecast week — zero, left out of
//      the reconciliation (edge case: a discontinued range forecasts 0).
//   3. Less than 52 weeks of history (E14-01 BR-04) — the launch method
//      (E14-08) applies, and it is NOT BUILT. The SKU keeps SAP's plan in
//      force until it is (owner, 2026-09-29; ENG-B63), labelled so, and is
//      held at that value in the reconciliation.
//   4. The main model (BR-01, gradient-boosted trees across SKUs) — NOT
//      BUILT (ENG-B60). The pipeline takes one (`MainModel`) and uses it for a
//      SKU only where it beat the fallback in the backtest (AC-03, E14-10).
//      No model is passed today, so no SKU is labelled "main model".
//   5. Slow: sold in fewer than 3 of the last 4 in-stock weeks over the last
//      52 (mean interval p ≥ 4/3, the ENG-B6 slow mover the E14-04 tiers
//      read). TSB when the SKU is flagged for discontinuation (a future
//      discontinue date); otherwise Kostenko–Hyndman chooses SBA or Croston
//      (BR-03). With p ≥ 4/3 the rule always chooses SBA (2 − 3p/2 ≤ 0).
//   6. Otherwise the fallback: the Comb benchmark (BR-02), with Theta
//      computed beside it; the choice between the two is E14-10's (BR-05).
//      Both apply the brand's calendar index of PTI's demand events (payday,
//      double-date, Christmas, Ramadan and the weeks before it), each event's
//      factor estimated from history (`eventCalendar.js`, ENG-B70 to B74).
//
// ── STOCK-OUTS (BR-06) ──────────────────────────────────────────────────────
//   A week flagged out of stock is not demand. For the smoothing methods its
//   value is filled by straight-line interpolation between the nearest
//   in-stock weeks (the seasonal position must be kept); for the slow-mover
//   test and the intermittent methods the week is skipped. Its residual is
//   left out of the reconciliation weights (ENG-B62).
//
// ── LEVELS (BR-04) ──────────────────────────────────────────────────────────
//   Each brand and the total are forecast on their own (Comb on the sum of
//   their SKUs' cleaned history, current SKU → brand map), then MinT-shrink
//   reconciles (`reconcile.js`). A SKU discontinued inside the horizon is out
//   of the hierarchy from that week, and a new SKU on SAP's plan is held at
//   it: what the level's base carried for such a SKU (its unconstrained
//   forecast, or SAP's plan) is taken off its brand's and the total's base
//   before reconciling, and its fixed value is added back. SKU values are
//   rounded to whole units and every level is the sum of the SKUs beneath it,
//   so AC-02 holds exactly.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays, daysBetween, mondayOf } from './dates';
/** @import { DemandEvent, EventFactor, RamadanDates } from './eventCalendar' */
import {
  RAMADAN_TABLE,
  calendarIndex,
  estimateEventFactors,
  estimateLead,
  ramadanTableCoversUntil,
  tagWeek
} from './eventCalendar';
/** @import { CalendarIndex, HoltParams, MethodFit, SesParams } from './forecastMethods' */
import { comb, croston, intermittency, khChoice, theta, tsb } from './forecastMethods';
/** @import { Hierarchy, ReconciliationMethod, Reconciler } from './reconcile' */
import { buildReconciler, reconcileWeek } from './reconcile';
/** @import { Brand, FgPlanSnapshot, FinishedGood, IsoDate, SalesWeek } from './types' */

/** Weeks forecast: the E14-03 horizon and the SAP plan snapshot's. */
export const FORECAST_HORIZON_WEEKS = 26;
/** One full season of history (E14-01 BR-04). */
export const MIN_HISTORY_WEEKS = 52;
/** The slow-mover window and boundary (ENG-B6): p ≥ 4/3 over the last 52 weeks. */
export const SLOW_WINDOW_WEEKS = 52;
export const SLOW_INTERVAL = 4 / 3;

/** @typedef {'main' | 'comb' | 'sba' | 'croston' | 'tsb' | 'newSkuSap' | 'discontinued'} ForecastMethod */

/**
 * The methods in display order.
 * @type {readonly ForecastMethod[]}
 */
export const FORECAST_METHODS = [
  'main',
  'comb',
  'sba',
  'croston',
  'tsb',
  'newSkuSap',
  'discontinued'
];

/**
 * The gradient-boosted main model's slot (BR-01). Trained elsewhere (Python,
 * LightGBM — the spec's build notes) and scored here; not built (ENG-B60).
 */
/**
 * @typedef {object} MainModel
 * @property {(skuCode: string) => boolean} beatsFallback -  AC-03: true only where the model beat the fallback in the latest backtest (E14-10).
 * @property {(skuCode: string, history: readonly number[], horizon: number) => MethodFit | null} forecast -  The forecast for h = 1…horizon and the one-step in-sample fit, or null.
 */

/**
 * `fgPlan`:  SAP's plan, for the side-by-side comparison only (it is not an input to the forecast).
 * `asOf`:  The hub's date. The first forecast week is its Monday.
 * `ramadanTable`:  Ramadan and Eid dates (default: the approximate `RAMADAN_TABLE`, ENG-B71).
 *
 * @typedef {{
 *     readonly finishedGoods: readonly FinishedGood[];
 *     readonly sales: readonly SalesWeek[];
 *     readonly fgPlan?: readonly FgPlanSnapshot[];
 *     readonly asOf: IsoDate;
 *     readonly horizonWeeks?: number;
 *     readonly mainModel?: MainModel;
 *     readonly ramadanTable?: readonly RamadanDates[];
 *   }} DemandForecastInput
 */

/**
 * `seasonal`:  Seasonality found by the M4 test (Comb, Theta).
 * `p`:  Kostenko–Hyndman inputs (slow SKUs).
 *
 * @typedef {{
 *     readonly seasonal?: boolean;
 *     readonly ses?: SesParams;
 *     readonly holt?: HoltParams;
 *     readonly damped?: HoltParams;
 *     readonly p?: number;
 *     readonly v?: number;
 *   }} MethodDetail
 */

/**
 * `historyWeeks`:  Weeks of sales history before the first forecast week.
 * `stockoutWeeks`:  Of those, weeks flagged out of stock (not read as demand).
 * `meanInterval`:  Mean interval between sales over the slow-mover window (p).
 * `base`:  The method's own forecast, one per week, never negative.
 * `forecast`:  After reconciliation, whole units. What the SKU plans on.
 * `theta`:  Theta beside the Comb, for E14-10 to choose between (BR-05); null otherwise.
 * `endsOn`:  The discontinue date when it falls inside the horizon (zero from then); null otherwise.
 * `sapPlan`:  SAP's plan in force for the same weeks (the stand-in E14-03 runs on); null when none.
 *
 * @typedef {{
 *     readonly skuCode: string;
 *     readonly name: string;
 *     readonly brand: Brand;
 *     readonly category: string;
 *     readonly method: ForecastMethod;
 *     readonly detail: MethodDetail;
 *     readonly historyWeeks: number;
 *     readonly stockoutWeeks: number;
 *     readonly meanInterval: number;
 *     readonly base: readonly number[];
 *     readonly forecast: readonly number[];
 *     readonly theta: readonly number[] | null;
 *     readonly endsOn: IsoDate | null;
 *     readonly sapPlan: readonly (number | null)[] | null;
 *   }} SkuForecast
 */

/**
 * `key`:  The brand, or 'total'.
 * `base`:  The level's own forecast before reconciliation.
 * `forecast`:  The sum of its SKUs' reconciled forecasts.
 * `sapPlan`:  Σ of its SKUs' SAP plan, where every SKU has one.
 *
 * @typedef {{
 *     readonly level: 'total' | 'brand';
 *     readonly key: string;
 *     readonly skuCodes: readonly string[];
 *     readonly base: readonly number[];
 *     readonly forecast: readonly number[];
 *     readonly sapPlan: readonly number[] | null;
 *   }} LevelForecast
 */

/**
 * @typedef {{
 *     readonly skuCode: string;
 *     readonly name: string;
 *     readonly brand: Brand;
 *   }} ExcludedSku
 */

/**
 * `sapPlanMadeAt`:  SAP's plan snapshot compared against (made on this Monday), or null.
 * `excludedOem`:  OEM products: not forecast (ENG-D20).
 * `reconciliation`:  MinT-shrink intensity; null on WLS_struct.  Why MinT-shrink fell back to WLS_struct; null when it did not.  SKU × week cells whose reconciled value was negative and set to 0.
 * `events`:  PTI's demand events and their factors (owner, 2026-09-29; ENG-B70 to ENG-B74).  Pre-Ramadan weeks, estimated on the total's history.  The horizon runs past the Ramadan table's last date (events there cannot be tagged).  Per brand: the factors its SKUs' Comb and Theta apply.  The events in each forecast week.
 * `mainModel`:  BR-01 — the main model's state.
 *
 * @typedef {{
 *     readonly asOf: IsoDate;
 *     readonly weeks: readonly IsoDate[];
 *     readonly sapPlanMadeAt: IsoDate | null;
 *     readonly skus: readonly SkuForecast[];
 *     readonly brands: readonly LevelForecast[];
 *     readonly total: LevelForecast;
 *     readonly excludedOem: readonly ExcludedSku[];
 *     readonly methodCounts: Readonly<Record<ForecastMethod, number>>;
 *     readonly reconciliation: { readonly method: ReconciliationMethod; readonly lambda: number | null; readonly fallback: Reconciler['fallback']; readonly clippedCells: number; };
 *     readonly events: { readonly lead: number; readonly ramadan: readonly RamadanDates[]; readonly tableCoversUntil: IsoDate; readonly horizonBeyondTable: boolean; readonly total: readonly EventFactor[]; readonly brands: readonly { readonly brand: Brand; readonly factors: readonly EventFactor[] }[]; readonly horizon: readonly { readonly weekStart: IsoDate; readonly events: readonly DemandEvent[] }[]; };
 *     readonly mainModel: 'notBuilt' | 'supplied';
 *   }} DemandForecastRun
 */

// ── History ─────────────────────────────────────────────────────────────────

/**
 * `start`:  Monday of the first week.
 *
 * @typedef {{
 *     readonly start: IsoDate;
 *     readonly qty: readonly number[];
 *     readonly stockout: readonly boolean[];
 *   }} History
 */

/**
 * A SKU's weekly history before `before`, contiguous from its first row (a missing week is 0).
 * @param {readonly SalesWeek[]} rows
 * @param {IsoDate} before
 * @returns {History | null}
 */
export function historyOf(rows, before) {
  const past = rows
    .filter((r) => r.weekStart < before)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  if (past.length === 0) return null;
  const byWeek = new Map(past.map((r) => /** @type {const} */ ([r.weekStart, r])));
  /** @type {number[]} */
  const qty = [];
  /** @type {boolean[]} */
  const stockout = [];
  for (let w = past[0].weekStart; w < before; w = addDays(w, 7)) {
    const r = byWeek.get(w);
    qty.push(r ? r.quantity : 0);
    stockout.push(r ? r.stockout : false);
  }
  return { start: past[0].weekStart, qty, stockout };
}

/**
 * Stock-out weeks filled by interpolation between the nearest in-stock weeks (ENG-B62).
 * @param {readonly number[]} qty
 * @param {readonly boolean[]} stockout
 * @returns {number[]}
 */
export function fillStockouts(qty, stockout) {
  const out = [...qty];
  const inStock = qty.map((_, t) => t).filter((t) => !stockout[t]);
  if (inStock.length === 0) return out;
  for (let t = 0; t < qty.length; t += 1) {
    if (!stockout[t]) continue;
    const prev = [...inStock].reverse().find((i) => i < t);
    const next = inStock.find((i) => i > t);
    if (prev === undefined) out[t] = qty[/** @type {NonNullable<typeof next>} */ (next)];
    else if (next === undefined) out[t] = qty[prev];
    else out[t] = qty[prev] + ((qty[next] - qty[prev]) * (t - prev)) / (next - prev);
  }
  return out;
}

/**
 * @param {number} n
 * @returns {number[]}
 */
const zeros = (n) => /** @type {Array<number>} */ (new Array(n)).fill(0);
/**
 * @param {readonly number[]} xs
 * @returns {number[]}
 */
const nonNeg = (xs) => xs.map((v) => (v > 0 ? v : 0));

// ── The run ─────────────────────────────────────────────────────────────────

/**
 * `clean`:  Stock-outs filled (ENG-B62).
 * `inStock`:  In-stock weeks only.
 *
 * @typedef {{
 *     readonly fg: FinishedGood;
 *     readonly history: History | null;
 *     readonly qty: readonly number[];
 *     readonly stockout: readonly boolean[];
 *     readonly clean: number[];
 *     readonly inStock: number[];
 *     readonly p: number;
 *     readonly v: number;
 *   }} Prepared
 */

/**
 * `unconstrained`:  Before the discontinue date is applied.
 * `residuals`:  One-step residual per history week (NaN where none, or a stock-out).
 *
 * @typedef {Prepared & {
 *     readonly method: ForecastMethod;
 *     readonly detail: MethodDetail;
 *     readonly unconstrained: number[];
 *     readonly base: number[];
 *     readonly theta: number[] | null;
 *     readonly residuals: number[];
 *   }} Working
 */

/**
 * @param {FinishedGood} fg
 * @param {readonly SalesWeek[]} rows
 * @param {IsoDate} start
 * @returns {Prepared}
 */
function prepare(fg, rows, start) {
  const history = historyOf(rows, start);
  const qty = history?.qty ?? [];
  const stockout = history?.stockout ?? [];
  const inStock = qty.filter((_, t) => !stockout[t]);
  const { p, v } = intermittency(inStock.slice(-SLOW_WINDOW_WEEKS));
  return { fg, history, qty, stockout, clean: fillStockouts(qty, stockout), inStock, p, v };
}

/**
 * @param {Prepared} x
 * @param {readonly IsoDate[]} weeks
 * @param {MainModel | undefined} mainModel
 * @param {readonly (number | null)[] | null} sapPlan
 * @param {CalendarIndex} index
 * @returns {Working}
 */
function forecastSku(x, weeks, mainModel, sapPlan, index) {
  const H = weeks.length;
  const { fg, qty, stockout, clean, inStock, p, v } = x;
  /** @param {IsoDate} w */
  const ended = (w) => fg.discontinueDate !== undefined && w >= fg.discontinueDate;
  /** @param {readonly number[]} fitted */
  const residualsFrom = (fitted) =>
    clean.map((y, t) => (stockout[t] || Number.isNaN(fitted[t]) ? NaN : y - fitted[t]));
  /**
   * @param {ForecastMethod} method
   * @param {MethodDetail} detail
   * @param {MethodFit} fit
   * @param {number[]} residuals
   * @param {number[] | null} th
   * @returns {Working}
   */
  const done = (method, detail, fit, residuals, th) => {
    const unconstrained = nonNeg(fit.forecast);
    return {
      ...x,
      method,
      detail,
      unconstrained,
      base: unconstrained.map((u, i) => (ended(weeks[i]) ? 0 : u)),
      theta: th ? th.map((u, i) => (ended(weeks[i]) ? 0 : u)) : null,
      residuals
    };
  };

  if (fg.discontinueDate !== undefined && fg.discontinueDate <= weeks[0]) {
    return done(
      'discontinued',
      {},
      { forecast: zeros(H), fitted: [] },
      clean.map(() => NaN),
      null
    );
  }
  if (qty.length < MIN_HISTORY_WEEKS) {
    // E14-08 is not built: SAP's plan stands until it is (owner, 2026-09-29; ENG-B63).
    const plan = weeks.map((_, i) => sapPlan?.[i] ?? 0);
    return done(
      'newSkuSap',
      {},
      { forecast: plan, fitted: [] },
      clean.map(() => NaN),
      null
    );
  }
  if (mainModel && mainModel.beatsFallback(fg.skuCode)) {
    const m = mainModel.forecast(fg.skuCode, clean, H);
    if (m) return done('main', {}, m, residualsFrom(m.fitted), null);
  }
  if (p >= SLOW_INTERVAL) {
    // Intermittent methods run on the in-stock weeks only; map their fit back.
    const positions = qty.map((_, t) => t).filter((t) => !stockout[t]);
    /** @param {readonly number[]} fitted */
    const toResiduals = (fitted) => {
      const r = clean.map(() => NaN);
      positions.forEach((t, i) => {
        if (!Number.isNaN(fitted[i])) r[t] = qty[t] - fitted[i];
      });
      return r;
    };
    if (fg.discontinueDate !== undefined) {
      const f = tsb(inStock, H);
      return done('tsb', { p, v }, f, toResiduals(f.fitted), null);
    }
    const choice = khChoice(p, v);
    const f = croston(inStock, H, choice === 'sba');
    return done(choice, { p, v }, f, toResiduals(f.fitted), null);
  }
  const c = comb(clean, H, true, index);
  return done(
    'comb',
    { seasonal: c.seasonal, ses: c.ses, holt: c.holt, damped: c.damped },
    c,
    residualsFrom(c.fitted),
    nonNeg(theta(clean, H, true, index).forecast)
  );
}

/**
 * SAP's plan in force at `asOf` for the forecast weeks, per SKU.
 * @param {readonly FgPlanSnapshot[] | undefined} fgPlan
 * @param {IsoDate} asOf
 * @param {readonly IsoDate[]} weeks
 */
function sapPlanFor(fgPlan, asOf, weeks) {
  if (!fgPlan || fgPlan.length === 0)
    return { madeAt: null, bySku: /** @type {Map<string, (number | null)[]>} */ (new Map()) };
  /** @type {IsoDate | null} */
  let madeAt = null;
  for (const p of fgPlan)
    if (p.madeAt <= asOf && (madeAt === null || p.madeAt > madeAt)) madeAt = p.madeAt;
  const index = new Map(weeks.map((w, i) => /** @type {const} */ ([w, i])));
  const bySku = /** @type {Map<string, (number | null)[]>} */ (new Map());
  for (const p of fgPlan) {
    if (p.madeAt !== madeAt) continue;
    const i = index.get(p.weekStart);
    if (i === undefined) continue;
    const row = bySku.get(p.skuCode) ?? weeks.map(() => null);
    row[i] = p.quantity;
    bySku.set(p.skuCode, row);
  }
  return { madeAt, bySku };
}

/**
 * The finished-goods demand forecast (REQ-E14-07).
 * @param {DemandForecastInput} input
 * @returns {DemandForecastRun}
 */
export function demandForecast(input) {
  const H = input.horizonWeeks ?? FORECAST_HORIZON_WEEKS;
  const table = input.ramadanTable ?? RAMADAN_TABLE;
  const start = mondayOf(input.asOf);
  const weeks = Array.from({ length: H }, (_, i) => addDays(start, i * 7));
  const rowsBySku = /** @type {Map<string, SalesWeek[]>} */ (new Map());
  for (const s of input.sales) rowsBySku.set(s.skuCode, [...(rowsBySku.get(s.skuCode) ?? []), s]);
  const fgs = [...input.finishedGoods].sort((a, b) => a.skuCode.localeCompare(b.skuCode));
  const sap = sapPlanFor(input.fgPlan, input.asOf, weeks);

  /** @type {ExcludedSku[]} */
  const excludedOem = fgs
    .filter((f) => f.oem === true)
    .map((f) => ({ skuCode: f.skuCode, name: f.name, brand: f.brand }));
  const prepared = fgs
    .filter((f) => f.oem !== true)
    .map((f) => prepare(f, rowsBySku.get(f.skuCode) ?? [], start));
  /** @param {Prepared} x */
  const endedBefore = (x) => x.fg.discontinueDate !== undefined && x.fg.discontinueDate <= start;
  const inTreePrep = prepared.filter((x) => !endedBefore(x));
  const brands = [...new Set(inTreePrep.map((x) => x.fg.brand))].sort();

  // A common week axis for the level series, the event factors and the residuals.
  const origin =
    inTreePrep.reduce(
      (m, x) => (x.history && (m === null || x.history.start < m) ? x.history.start : m),
      /** @type {IsoDate | null} */ (null)
    ) ?? start;
  const T = Math.max(0, daysBetween(origin, start) / 7);
  const axis = Array.from({ length: T }, (_, t) => addDays(origin, t * 7));
  /** @param {Prepared} x */
  const offset = (x) => (x.history ? daysBetween(origin, x.history.start) / 7 : T);
  /**
   * @param {Prepared} x
   * @param {readonly number[]} xs
   * @param {number} fill
   */
  const onAxis = (x, xs, fill) => {
    const out = /** @type {Array<number>} */ (new Array(T)).fill(fill);
    const o = offset(x);
    xs.forEach((v, t) => {
      if (o + t < T) out[o + t] = v;
    });
    return out;
  };
  /** @param {readonly Prepared[]} members */
  const levelSeries = (members) => {
    const first = members.length ? Math.min(...members.map(offset)) : T;
    const series = /** @type {Array<number>} */ (new Array(T)).fill(0);
    for (const x of members) onAxis(x, x.clean, 0).forEach((v, t) => (series[t] += v));
    return { first, own: series.slice(first), weeks: axis.slice(first) };
  };

  // ── PTI's demand events (owner, 2026-09-29): the lead on the total, factors per level.
  const totalSeries = levelSeries(inTreePrep);
  const lead = estimateLead(totalSeries.own, totalSeries.weeks, table);
  const totalFactors = estimateEventFactors(totalSeries.own, totalSeries.weeks, lead, table);
  const brandSeries = brands.map((b) => levelSeries(inTreePrep.filter((x) => x.fg.brand === b)));
  const brandFactors = brandSeries.map((s) => estimateEventFactors(s.own, s.weeks, lead, table));
  /**
   * @param {readonly EventFactor[]} factors
   * @param {readonly IsoDate[]} histWeeks
   * @returns {CalendarIndex}
   */
  const indexFor = (factors, histWeeks) => ({
    history: histWeeks.map((w) => calendarIndex(w, factors, lead, table)),
    horizon: weeks.map((w) => calendarIndex(w, factors, lead, table))
  });
  /** @param {Prepared} x */
  const skuHistWeeks = (x) =>
    x.history ? x.qty.map((_, t) => addDays(/** @type {History} */ (x.history).start, t * 7)) : [];

  const work = prepared.map((x) => {
    const b = brands.indexOf(x.fg.brand);
    const factors = b >= 0 ? brandFactors[b] : [];
    return forecastSku(
      x,
      weeks,
      input.mainModel,
      sap.bySku.get(x.fg.skuCode) ?? null,
      indexFor(factors, skuHistWeeks(x))
    );
  });
  const inTree = work.filter((w) => w.method !== 'discontinued');

  /**
   * @param {{ first: number; own: number[]; weeks: IsoDate[] }} series
   * @param {readonly EventFactor[]} factors
   */
  const levelBase = (series, factors) => {
    const c = comb(series.own, H, true, indexFor(factors, series.weeks));
    const residuals = /** @type {Array<number>} */ (new Array(T)).fill(NaN);
    series.own.forEach((y, t) => {
      if (!Number.isNaN(c.fitted[t])) residuals[series.first + t] = y - c.fitted[t];
    });
    return { base: nonNeg(c.forecast), residuals };
  };
  const totalLevel = inTree.length
    ? levelBase(totalSeries, totalFactors)
    : { base: zeros(H), residuals: /** @type {number[]} */ ([]) };
  const brandLevels = brandSeries.map((s, k) => levelBase(s, brandFactors[k]));
  const brandMembers = brands.map((b) => inTree.filter((w) => w.fg.brand === b));

  // Node order: total, brands, SKUs. `members` index SKU columns in `inTree`.
  /** @type {number[][]} */
  const nodeMembers = [
    inTree.map((_, j) => j),
    ...brandMembers.map((m) => m.map((w) => inTree.indexOf(w))),
    ...inTree.map((_, j) => [j])
  ];
  /** @type {number[][]} */
  const nodeResiduals = [
    totalLevel.residuals,
    ...brandLevels.map((l) => l.residuals),
    ...inTree.map((w) => onAxis(w, w.residuals, NaN))
  ];

  // A SKU is FIXED in a week when it is ended (0) or new on SAP's plan; it is
  // left out of the reconciliation that week and its value is taken off its
  // levels' base first (ENG-B63). `implied` is what the level base carried for it.
  /**
   * @param {Working} w
   * @param {number} i
   * @returns {{ value: number; implied: number } | null}
   */
  const fixedAt = (w, i) => {
    if (w.method === 'newSkuSap') return { value: w.base[i], implied: w.base[i] };
    if (w.fg.discontinueDate !== undefined && weeks[i] >= w.fg.discontinueDate)
      return { value: 0, implied: w.unconstrained[i] };
    return null;
  };

  // One reconciler per set of SKUs active in a week (usually one set).
  const reconcilers =
    /** @type {Map<string, { h: Hierarchy; r: Reconciler; nodes: number[]; cols: number[] }>} */ (
      new Map()
    );
  /** @param {readonly boolean[]} active */
  const reconcilerFor = (active) => {
    const key = active.map((a) => (a ? '1' : '0')).join('');
    const hit = reconcilers.get(key);
    if (hit) return hit;
    const cols = inTree.map((_, j) => j).filter((j) => active[j]);
    const colIndex = new Map(cols.map((c, i) => /** @type {const} */ ([c, i])));
    const nodes = nodeMembers.map((_, i) => i).filter((i) => nodeMembers[i].some((j) => active[j]));
    /** @type {Hierarchy} */
    const h = {
      nodes: nodes.length,
      skus: cols.length,
      members: nodes.map((i) =>
        nodeMembers[i]
          .filter((j) => active[j])
          .map((j) => /** @type {NonNullable<ReturnType<typeof colIndex.get>>} */ (colIndex.get(j)))
      )
    };
    const entry = {
      h,
      r: buildReconciler(
        h,
        nodes.map((i) => nodeResiduals[i])
      ),
      nodes,
      cols
    };
    reconcilers.set(key, entry);
    return entry;
  };

  /** @type {number[][]} */
  const reconciled = inTree.map(() => zeros(H));
  let clippedCells = 0;
  /** @type {Reconciler | null} */
  let firstReconciler = null;
  for (let i = 0; i < H; i += 1) {
    const fixed = inTree.map((w) => fixedAt(w, i));
    fixed.forEach((f, j) => {
      if (f) reconciled[j][i] = Math.round(f.value);
    });
    const active = fixed.map((f) => f === null);
    if (!active.some(Boolean)) continue;
    const { h, r, nodes, cols } = reconcilerFor(active);
    firstReconciler ??= r;
    /** @param {readonly number[]} members */
    const impliedOf = (members) => members.reduce((s, j) => s + (fixed[j]?.implied ?? 0), 0);
    /**
     * @param {number} n
     * @returns {number}
     */
    const nodeBase = (n) => {
      if (n === 0) return Math.max(0, totalLevel.base[i] - impliedOf(nodeMembers[0]));
      if (n <= brands.length)
        return Math.max(0, brandLevels[n - 1].base[i] - impliedOf(nodeMembers[n]));
      return inTree[n - 1 - brands.length].base[i];
    };
    const week = reconcileWeek(h, r.projection, nodes.map(nodeBase));
    clippedCells += week.clipped;
    cols.forEach((j, k) => (reconciled[j][i] = Math.round(week.skus[k])));
  }

  /** @type {SkuForecast[]} */
  const skus = work.map((w) => {
    const j = inTree.indexOf(w);
    return {
      skuCode: w.fg.skuCode,
      name: w.fg.name,
      brand: w.fg.brand,
      category: w.fg.category,
      method: w.method,
      detail: w.detail,
      historyWeeks: w.history?.qty.length ?? 0,
      stockoutWeeks: w.history?.stockout.filter(Boolean).length ?? 0,
      meanInterval: w.p,
      base: w.base,
      forecast: j >= 0 ? reconciled[j] : zeros(H),
      theta: w.theta,
      endsOn:
        w.fg.discontinueDate !== undefined &&
        w.fg.discontinueDate > weeks[0] &&
        w.fg.discontinueDate <= weeks[H - 1]
          ? w.fg.discontinueDate
          : null,
      sapPlan: sap.bySku.get(w.fg.skuCode) ?? null
    };
  });

  /**
   * @param {readonly SkuForecast[]} list
   * @param {(s: SkuForecast) => readonly number[]} pick
   */
  const sumOf = (list, pick) => weeks.map((_, i) => list.reduce((s, x) => s + pick(x)[i], 0));
  /**
   * @param {readonly SkuForecast[]} list
   * @returns {number[] | null}
   */
  const sapSum = (list) => {
    const withPlan = list.filter((s) => s.method !== 'discontinued');
    if (withPlan.some((s) => s.sapPlan === null)) return null;
    return weeks.map((_, i) =>
      withPlan.reduce((s, x) => {
        // A local, not an inline cast: Prettier moves a JSDoc cast that opens a
        // parenthesised expression outside it (playbook step 4). `sapPlan` is
        // non-null here — the guard above returned on any null plan.
        const plan = /** @type {NonNullable<typeof x.sapPlan>} */ (x.sapPlan);
        return s + (plan[i] ?? 0);
      }, 0)
    );
  };
  /** @type {LevelForecast[]} */
  const brandForecasts = brands.map((b, k) => {
    const list = skus.filter((s) => s.brand === b);
    return {
      level: 'brand',
      key: b,
      skuCodes: list.map((s) => s.skuCode),
      base: brandLevels[k].base,
      forecast: sumOf(list, (s) => s.forecast),
      sapPlan: sapSum(list)
    };
  });
  /** @type {LevelForecast} */
  const total = {
    level: 'total',
    key: 'total',
    skuCodes: skus.map((s) => s.skuCode),
    base: totalLevel.base,
    forecast: sumOf(skus, (s) => s.forecast),
    sapPlan: sapSum(skus)
  };

  const methodCounts = /** @type {Record<ForecastMethod, number>} */ (
    Object.fromEntries(FORECAST_METHODS.map((m) => [m, skus.filter((s) => s.method === m).length]))
  );
  return {
    asOf: input.asOf,
    weeks,
    sapPlanMadeAt: sap.madeAt,
    skus,
    brands: brandForecasts,
    total,
    excludedOem,
    methodCounts,
    reconciliation: {
      method: firstReconciler?.method ?? 'mintShrink',
      lambda: firstReconciler?.lambda ?? null,
      fallback: firstReconciler?.fallback ?? null,
      clippedCells
    },
    events: {
      lead,
      ramadan: table,
      tableCoversUntil: ramadanTableCoversUntil(table),
      horizonBeyondTable: weeks[H - 1] > ramadanTableCoversUntil(table),
      total: totalFactors,
      brands: brands.map((b, k) => ({ brand: b, factors: brandFactors[k] })),
      horizon: weeks.map((w) => ({ weekStart: w, events: tagWeek(w, lead, table).events }))
    },
    mainModel: input.mainModel ? 'supplied' : 'notBuilt'
  };
}

/**
 * The run as a finished-goods plan snapshot made on the first forecast week —
 * the shape E14-03 reads (`FgPlanSnapshot`). Not wired: SAP's plan stays
 * E14-03's input until the backtest (E14-10) exists (ENG-B66). Tested so the
 * switch is a substitution, not a rebuild.
 * @param {DemandForecastRun} run
 * @returns {FgPlanSnapshot[]}
 */
export function forecastAsPlanSnapshot(run) {
  const madeAt = run.weeks[0];
  return run.skus
    .filter((s) => s.method !== 'discontinued')
    .flatMap((s) =>
      run.weeks.map((w, i) => ({
        skuCode: s.skuCode,
        madeAt,
        weekStart: w,
        quantity: s.forecast[i]
      }))
    );
}
