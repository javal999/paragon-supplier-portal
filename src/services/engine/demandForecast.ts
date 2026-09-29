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
//      factor estimated from history (`eventCalendar.ts`, ENG-B70 to B74).
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
//   reconciles (`reconcile.ts`). A SKU discontinued inside the horizon is out
//   of the hierarchy from that week, and a new SKU on SAP's plan is held at
//   it: what the level's base carried for such a SKU (its unconstrained
//   forecast, or SAP's plan) is taken off its brand's and the total's base
//   before reconciling, and its fixed value is added back. SKU values are
//   rounded to whole units and every level is the sum of the SKUs beneath it,
//   so AC-02 holds exactly.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays, daysBetween, mondayOf } from './dates';
import {
  RAMADAN_TABLE,
  calendarIndex,
  estimateEventFactors,
  estimateLead,
  ramadanTableCoversUntil,
  tagWeek,
  type DemandEvent,
  type EventFactor,
  type RamadanDates,
} from './eventCalendar';
import {
  comb,
  croston,
  intermittency,
  khChoice,
  theta,
  tsb,
  type CalendarIndex,
  type HoltParams,
  type MethodFit,
  type SesParams,
} from './forecastMethods';
import { buildReconciler, reconcileWeek, type Hierarchy, type ReconciliationMethod, type Reconciler } from './reconcile';
import type { Brand, FgPlanSnapshot, FinishedGood, IsoDate, SalesWeek } from './types';

/** Weeks forecast: the E14-03 horizon and the SAP plan snapshot's. */
export const FORECAST_HORIZON_WEEKS = 26;
/** One full season of history (E14-01 BR-04). */
export const MIN_HISTORY_WEEKS = 52;
/** The slow-mover window and boundary (ENG-B6): p ≥ 4/3 over the last 52 weeks. */
export const SLOW_WINDOW_WEEKS = 52;
export const SLOW_INTERVAL = 4 / 3;

export type ForecastMethod = 'main' | 'comb' | 'sba' | 'croston' | 'tsb' | 'newSkuSap' | 'discontinued';

/** The methods in display order. */
export const FORECAST_METHODS: readonly ForecastMethod[] = ['main', 'comb', 'sba', 'croston', 'tsb', 'newSkuSap', 'discontinued'];

/**
 * The gradient-boosted main model's slot (BR-01). Trained elsewhere (Python,
 * LightGBM — the spec's build notes) and scored here; not built (ENG-B60).
 */
export interface MainModel {
  /** AC-03: true only where the model beat the fallback in the latest backtest (E14-10). */
  beatsFallback(skuCode: string): boolean;
  /** The forecast for h = 1…horizon and the one-step in-sample fit, or null. */
  forecast(skuCode: string, history: readonly number[], horizon: number): MethodFit | null;
}

export interface DemandForecastInput {
  readonly finishedGoods: readonly FinishedGood[];
  readonly sales: readonly SalesWeek[];
  /** SAP's plan, for the side-by-side comparison only (it is not an input to the forecast). */
  readonly fgPlan?: readonly FgPlanSnapshot[];
  /** The hub's date. The first forecast week is its Monday. */
  readonly asOf: IsoDate;
  readonly horizonWeeks?: number;
  readonly mainModel?: MainModel;
  /** Ramadan and Eid dates (default: the approximate `RAMADAN_TABLE`, ENG-B71). */
  readonly ramadanTable?: readonly RamadanDates[];
}

export interface MethodDetail {
  /** Seasonality found by the M4 test (Comb, Theta). */
  readonly seasonal?: boolean;
  readonly ses?: SesParams;
  readonly holt?: HoltParams;
  readonly damped?: HoltParams;
  /** Kostenko–Hyndman inputs (slow SKUs). */
  readonly p?: number;
  readonly v?: number;
}

export interface SkuForecast {
  readonly skuCode: string;
  readonly name: string;
  readonly brand: Brand;
  readonly category: string;
  readonly method: ForecastMethod;
  readonly detail: MethodDetail;
  /** Weeks of sales history before the first forecast week. */
  readonly historyWeeks: number;
  /** Of those, weeks flagged out of stock (not read as demand). */
  readonly stockoutWeeks: number;
  /** Mean interval between sales over the slow-mover window (p). */
  readonly meanInterval: number;
  /** The method's own forecast, one per week, never negative. */
  readonly base: readonly number[];
  /** After reconciliation, whole units. What the SKU plans on. */
  readonly forecast: readonly number[];
  /** Theta beside the Comb, for E14-10 to choose between (BR-05); null otherwise. */
  readonly theta: readonly number[] | null;
  /** The discontinue date when it falls inside the horizon (zero from then); null otherwise. */
  readonly endsOn: IsoDate | null;
  /** SAP's plan in force for the same weeks (the stand-in E14-03 runs on); null when none. */
  readonly sapPlan: readonly (number | null)[] | null;
}

export interface LevelForecast {
  readonly level: 'total' | 'brand';
  /** The brand, or 'total'. */
  readonly key: string;
  readonly skuCodes: readonly string[];
  /** The level's own forecast before reconciliation. */
  readonly base: readonly number[];
  /** The sum of its SKUs' reconciled forecasts. */
  readonly forecast: readonly number[];
  /** Σ of its SKUs' SAP plan, where every SKU has one. */
  readonly sapPlan: readonly number[] | null;
}

export interface ExcludedSku {
  readonly skuCode: string;
  readonly name: string;
  readonly brand: Brand;
}

export interface DemandForecastRun {
  readonly asOf: IsoDate;
  readonly weeks: readonly IsoDate[];
  /** SAP's plan snapshot compared against (made on this Monday), or null. */
  readonly sapPlanMadeAt: IsoDate | null;
  readonly skus: readonly SkuForecast[];
  readonly brands: readonly LevelForecast[];
  readonly total: LevelForecast;
  /** OEM products: not forecast (ENG-D20). */
  readonly excludedOem: readonly ExcludedSku[];
  readonly methodCounts: Readonly<Record<ForecastMethod, number>>;
  readonly reconciliation: {
    readonly method: ReconciliationMethod;
    /** MinT-shrink intensity; null on WLS_struct. */
    readonly lambda: number | null;
    /** Why MinT-shrink fell back to WLS_struct; null when it did not. */
    readonly fallback: Reconciler['fallback'];
    /** SKU × week cells whose reconciled value was negative and set to 0. */
    readonly clippedCells: number;
  };
  /** PTI's demand events and their factors (owner, 2026-09-29; ENG-B70 to ENG-B74). */
  readonly events: {
    /** Pre-Ramadan weeks, estimated on the total's history. */
    readonly lead: number;
    readonly ramadan: readonly RamadanDates[];
    readonly tableCoversUntil: IsoDate;
    /** The horizon runs past the Ramadan table's last date (events there cannot be tagged). */
    readonly horizonBeyondTable: boolean;
    readonly total: readonly EventFactor[];
    /** Per brand: the factors its SKUs' Comb and Theta apply. */
    readonly brands: readonly { readonly brand: Brand; readonly factors: readonly EventFactor[] }[];
    /** The events in each forecast week. */
    readonly horizon: readonly { readonly weekStart: IsoDate; readonly events: readonly DemandEvent[] }[];
  };
  /** BR-01 — the main model's state. */
  readonly mainModel: 'notBuilt' | 'supplied';
}

// ── History ─────────────────────────────────────────────────────────────────

export interface History {
  /** Monday of the first week. */
  readonly start: IsoDate;
  readonly qty: readonly number[];
  readonly stockout: readonly boolean[];
}

/** A SKU's weekly history before `before`, contiguous from its first row (a missing week is 0). */
export function historyOf(rows: readonly SalesWeek[], before: IsoDate): History | null {
  const past = rows.filter((r) => r.weekStart < before).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  if (past.length === 0) return null;
  const byWeek = new Map(past.map((r) => [r.weekStart, r] as const));
  const qty: number[] = [];
  const stockout: boolean[] = [];
  for (let w = past[0].weekStart; w < before; w = addDays(w, 7)) {
    const r = byWeek.get(w);
    qty.push(r ? r.quantity : 0);
    stockout.push(r ? r.stockout : false);
  }
  return { start: past[0].weekStart, qty, stockout };
}

/** Stock-out weeks filled by interpolation between the nearest in-stock weeks (ENG-B62). */
export function fillStockouts(qty: readonly number[], stockout: readonly boolean[]): number[] {
  const out = [...qty];
  const inStock = qty.map((_, t) => t).filter((t) => !stockout[t]);
  if (inStock.length === 0) return out;
  for (let t = 0; t < qty.length; t += 1) {
    if (!stockout[t]) continue;
    const prev = [...inStock].reverse().find((i) => i < t);
    const next = inStock.find((i) => i > t);
    if (prev === undefined) out[t] = qty[next!];
    else if (next === undefined) out[t] = qty[prev];
    else out[t] = qty[prev] + ((qty[next] - qty[prev]) * (t - prev)) / (next - prev);
  }
  return out;
}

const zeros = (n: number): number[] => new Array<number>(n).fill(0);
const nonNeg = (xs: readonly number[]): number[] => xs.map((v) => (v > 0 ? v : 0));

// ── The run ─────────────────────────────────────────────────────────────────

interface Prepared {
  readonly fg: FinishedGood;
  readonly history: History | null;
  readonly qty: readonly number[];
  readonly stockout: readonly boolean[];
  /** Stock-outs filled (ENG-B62). */
  readonly clean: number[];
  /** In-stock weeks only. */
  readonly inStock: number[];
  readonly p: number;
  readonly v: number;
}

interface Working extends Prepared {
  readonly method: ForecastMethod;
  readonly detail: MethodDetail;
  /** Before the discontinue date is applied. */
  readonly unconstrained: number[];
  readonly base: number[];
  readonly theta: number[] | null;
  /** One-step residual per history week (NaN where none, or a stock-out). */
  readonly residuals: number[];
}

function prepare(fg: FinishedGood, rows: readonly SalesWeek[], start: IsoDate): Prepared {
  const history = historyOf(rows, start);
  const qty = history?.qty ?? [];
  const stockout = history?.stockout ?? [];
  const inStock = qty.filter((_, t) => !stockout[t]);
  const { p, v } = intermittency(inStock.slice(-SLOW_WINDOW_WEEKS));
  return { fg, history, qty, stockout, clean: fillStockouts(qty, stockout), inStock, p, v };
}

function forecastSku(
  x: Prepared,
  weeks: readonly IsoDate[],
  mainModel: MainModel | undefined,
  sapPlan: readonly (number | null)[] | null,
  index: CalendarIndex,
): Working {
  const H = weeks.length;
  const { fg, qty, stockout, clean, inStock, p, v } = x;
  const ended = (w: IsoDate) => fg.discontinueDate !== undefined && w >= fg.discontinueDate;
  const residualsFrom = (fitted: readonly number[]) => clean.map((y, t) => (stockout[t] || Number.isNaN(fitted[t]) ? NaN : y - fitted[t]));
  const done = (method: ForecastMethod, detail: MethodDetail, fit: MethodFit, residuals: number[], th: number[] | null): Working => {
    const unconstrained = nonNeg(fit.forecast);
    return {
      ...x,
      method,
      detail,
      unconstrained,
      base: unconstrained.map((u, i) => (ended(weeks[i]) ? 0 : u)),
      theta: th ? th.map((u, i) => (ended(weeks[i]) ? 0 : u)) : null,
      residuals,
    };
  };

  if (fg.discontinueDate !== undefined && fg.discontinueDate <= weeks[0]) {
    return done('discontinued', {}, { forecast: zeros(H), fitted: [] }, clean.map(() => NaN), null);
  }
  if (qty.length < MIN_HISTORY_WEEKS) {
    // E14-08 is not built: SAP's plan stands until it is (owner, 2026-09-29; ENG-B63).
    const plan = weeks.map((_, i) => sapPlan?.[i] ?? 0);
    return done('newSkuSap', {}, { forecast: plan, fitted: [] }, clean.map(() => NaN), null);
  }
  if (mainModel && mainModel.beatsFallback(fg.skuCode)) {
    const m = mainModel.forecast(fg.skuCode, clean, H);
    if (m) return done('main', {}, m, residualsFrom(m.fitted), null);
  }
  if (p >= SLOW_INTERVAL) {
    // Intermittent methods run on the in-stock weeks only; map their fit back.
    const positions = qty.map((_, t) => t).filter((t) => !stockout[t]);
    const toResiduals = (fitted: readonly number[]) => {
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
    nonNeg(theta(clean, H, true, index).forecast),
  );
}

/** SAP's plan in force at `asOf` for the forecast weeks, per SKU. */
function sapPlanFor(fgPlan: readonly FgPlanSnapshot[] | undefined, asOf: IsoDate, weeks: readonly IsoDate[]) {
  if (!fgPlan || fgPlan.length === 0) return { madeAt: null, bySku: new Map<string, (number | null)[]>() };
  let madeAt: IsoDate | null = null;
  for (const p of fgPlan) if (p.madeAt <= asOf && (madeAt === null || p.madeAt > madeAt)) madeAt = p.madeAt;
  const index = new Map(weeks.map((w, i) => [w, i] as const));
  const bySku = new Map<string, (number | null)[]>();
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

/** The finished-goods demand forecast (REQ-E14-07). */
export function demandForecast(input: DemandForecastInput): DemandForecastRun {
  const H = input.horizonWeeks ?? FORECAST_HORIZON_WEEKS;
  const table = input.ramadanTable ?? RAMADAN_TABLE;
  const start = mondayOf(input.asOf);
  const weeks = Array.from({ length: H }, (_, i) => addDays(start, i * 7));
  const rowsBySku = new Map<string, SalesWeek[]>();
  for (const s of input.sales) rowsBySku.set(s.skuCode, [...(rowsBySku.get(s.skuCode) ?? []), s]);
  const fgs = [...input.finishedGoods].sort((a, b) => a.skuCode.localeCompare(b.skuCode));
  const sap = sapPlanFor(input.fgPlan, input.asOf, weeks);

  const excludedOem: ExcludedSku[] = fgs.filter((f) => f.oem === true).map((f) => ({ skuCode: f.skuCode, name: f.name, brand: f.brand }));
  const prepared = fgs.filter((f) => f.oem !== true).map((f) => prepare(f, rowsBySku.get(f.skuCode) ?? [], start));
  const endedBefore = (x: Prepared) => x.fg.discontinueDate !== undefined && x.fg.discontinueDate <= start;
  const inTreePrep = prepared.filter((x) => !endedBefore(x));
  const brands = [...new Set(inTreePrep.map((x) => x.fg.brand))].sort();

  // A common week axis for the level series, the event factors and the residuals.
  const origin = inTreePrep.reduce<IsoDate | null>((m, x) => (x.history && (m === null || x.history.start < m) ? x.history.start : m), null) ?? start;
  const T = Math.max(0, daysBetween(origin, start) / 7);
  const axis = Array.from({ length: T }, (_, t) => addDays(origin, t * 7));
  const offset = (x: Prepared) => (x.history ? daysBetween(origin, x.history.start) / 7 : T);
  const onAxis = (x: Prepared, xs: readonly number[], fill: number) => {
    const out = new Array<number>(T).fill(fill);
    const o = offset(x);
    xs.forEach((v, t) => {
      if (o + t < T) out[o + t] = v;
    });
    return out;
  };
  const levelSeries = (members: readonly Prepared[]) => {
    const first = members.length ? Math.min(...members.map(offset)) : T;
    const series = new Array<number>(T).fill(0);
    for (const x of members) onAxis(x, x.clean, 0).forEach((v, t) => (series[t] += v));
    return { first, own: series.slice(first), weeks: axis.slice(first) };
  };

  // ── PTI's demand events (owner, 2026-09-29): the lead on the total, factors per level.
  const totalSeries = levelSeries(inTreePrep);
  const lead = estimateLead(totalSeries.own, totalSeries.weeks, table);
  const totalFactors = estimateEventFactors(totalSeries.own, totalSeries.weeks, lead, table);
  const brandSeries = brands.map((b) => levelSeries(inTreePrep.filter((x) => x.fg.brand === b)));
  const brandFactors = brandSeries.map((s) => estimateEventFactors(s.own, s.weeks, lead, table));
  const indexFor = (factors: readonly EventFactor[], histWeeks: readonly IsoDate[]): CalendarIndex => ({
    history: histWeeks.map((w) => calendarIndex(w, factors, lead, table)),
    horizon: weeks.map((w) => calendarIndex(w, factors, lead, table)),
  });
  const skuHistWeeks = (x: Prepared) => (x.history ? x.qty.map((_, t) => addDays(x.history!.start, t * 7)) : []);

  const work = prepared.map((x) => {
    const b = brands.indexOf(x.fg.brand);
    const factors = b >= 0 ? brandFactors[b] : [];
    return forecastSku(x, weeks, input.mainModel, sap.bySku.get(x.fg.skuCode) ?? null, indexFor(factors, skuHistWeeks(x)));
  });
  const inTree = work.filter((w) => w.method !== 'discontinued');

  const levelBase = (series: { first: number; own: number[]; weeks: IsoDate[] }, factors: readonly EventFactor[]) => {
    const c = comb(series.own, H, true, indexFor(factors, series.weeks));
    const residuals = new Array<number>(T).fill(NaN);
    series.own.forEach((y, t) => {
      if (!Number.isNaN(c.fitted[t])) residuals[series.first + t] = y - c.fitted[t];
    });
    return { base: nonNeg(c.forecast), residuals };
  };
  const totalLevel = inTree.length ? levelBase(totalSeries, totalFactors) : { base: zeros(H), residuals: [] as number[] };
  const brandLevels = brandSeries.map((s, k) => levelBase(s, brandFactors[k]));
  const brandMembers = brands.map((b) => inTree.filter((w) => w.fg.brand === b));

  // Node order: total, brands, SKUs. `members` index SKU columns in `inTree`.
  const nodeMembers: number[][] = [
    inTree.map((_, j) => j),
    ...brandMembers.map((m) => m.map((w) => inTree.indexOf(w))),
    ...inTree.map((_, j) => [j]),
  ];
  const nodeResiduals: number[][] = [totalLevel.residuals, ...brandLevels.map((l) => l.residuals), ...inTree.map((w) => onAxis(w, w.residuals, NaN))];

  // A SKU is FIXED in a week when it is ended (0) or new on SAP's plan; it is
  // left out of the reconciliation that week and its value is taken off its
  // levels' base first (ENG-B63). `implied` is what the level base carried for it.
  const fixedAt = (w: Working, i: number): { value: number; implied: number } | null => {
    if (w.method === 'newSkuSap') return { value: w.base[i], implied: w.base[i] };
    if (w.fg.discontinueDate !== undefined && weeks[i] >= w.fg.discontinueDate) return { value: 0, implied: w.unconstrained[i] };
    return null;
  };

  // One reconciler per set of SKUs active in a week (usually one set).
  const reconcilers = new Map<string, { h: Hierarchy; r: Reconciler; nodes: number[]; cols: number[] }>();
  const reconcilerFor = (active: readonly boolean[]) => {
    const key = active.map((a) => (a ? '1' : '0')).join('');
    const hit = reconcilers.get(key);
    if (hit) return hit;
    const cols = inTree.map((_, j) => j).filter((j) => active[j]);
    const colIndex = new Map(cols.map((c, i) => [c, i] as const));
    const nodes = nodeMembers.map((_, i) => i).filter((i) => nodeMembers[i].some((j) => active[j]));
    const h: Hierarchy = { nodes: nodes.length, skus: cols.length, members: nodes.map((i) => nodeMembers[i].filter((j) => active[j]).map((j) => colIndex.get(j)!)) };
    const entry = { h, r: buildReconciler(h, nodes.map((i) => nodeResiduals[i])), nodes, cols };
    reconcilers.set(key, entry);
    return entry;
  };

  const reconciled: number[][] = inTree.map(() => zeros(H));
  let clippedCells = 0;
  let firstReconciler: Reconciler | null = null;
  for (let i = 0; i < H; i += 1) {
    const fixed = inTree.map((w) => fixedAt(w, i));
    fixed.forEach((f, j) => {
      if (f) reconciled[j][i] = Math.round(f.value);
    });
    const active = fixed.map((f) => f === null);
    if (!active.some(Boolean)) continue;
    const { h, r, nodes, cols } = reconcilerFor(active);
    firstReconciler ??= r;
    const impliedOf = (members: readonly number[]) => members.reduce((s, j) => s + (fixed[j]?.implied ?? 0), 0);
    const nodeBase = (n: number): number => {
      if (n === 0) return Math.max(0, totalLevel.base[i] - impliedOf(nodeMembers[0]));
      if (n <= brands.length) return Math.max(0, brandLevels[n - 1].base[i] - impliedOf(nodeMembers[n]));
      return inTree[n - 1 - brands.length].base[i];
    };
    const week = reconcileWeek(h, r.projection, nodes.map(nodeBase));
    clippedCells += week.clipped;
    cols.forEach((j, k) => (reconciled[j][i] = Math.round(week.skus[k])));
  }

  const skus: SkuForecast[] = work.map((w) => {
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
      endsOn: w.fg.discontinueDate !== undefined && w.fg.discontinueDate > weeks[0] && w.fg.discontinueDate <= weeks[H - 1] ? w.fg.discontinueDate : null,
      sapPlan: sap.bySku.get(w.fg.skuCode) ?? null,
    };
  });

  const sumOf = (list: readonly SkuForecast[], pick: (s: SkuForecast) => readonly number[]) => weeks.map((_, i) => list.reduce((s, x) => s + pick(x)[i], 0));
  const sapSum = (list: readonly SkuForecast[]): number[] | null => {
    const withPlan = list.filter((s) => s.method !== 'discontinued');
    if (withPlan.some((s) => s.sapPlan === null)) return null;
    return weeks.map((_, i) => withPlan.reduce((s, x) => s + (x.sapPlan![i] ?? 0), 0));
  };
  const brandForecasts: LevelForecast[] = brands.map((b, k) => {
    const list = skus.filter((s) => s.brand === b);
    return { level: 'brand', key: b, skuCodes: list.map((s) => s.skuCode), base: brandLevels[k].base, forecast: sumOf(list, (s) => s.forecast), sapPlan: sapSum(list) };
  });
  const total: LevelForecast = {
    level: 'total',
    key: 'total',
    skuCodes: skus.map((s) => s.skuCode),
    base: totalLevel.base,
    forecast: sumOf(skus, (s) => s.forecast),
    sapPlan: sapSum(skus),
  };

  const methodCounts = Object.fromEntries(FORECAST_METHODS.map((m) => [m, skus.filter((s) => s.method === m).length])) as Record<ForecastMethod, number>;
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
      clippedCells,
    },
    events: {
      lead,
      ramadan: table,
      tableCoversUntil: ramadanTableCoversUntil(table),
      horizonBeyondTable: weeks[H - 1] > ramadanTableCoversUntil(table),
      total: totalFactors,
      brands: brands.map((b, k) => ({ brand: b, factors: brandFactors[k] })),
      horizon: weeks.map((w) => ({ weekStart: w, events: tagWeek(w, lead, table).events })),
    },
    mainModel: input.mainModel ? 'supplied' : 'notBuilt',
  };
}

/**
 * The run as a finished-goods plan snapshot made on the first forecast week —
 * the shape E14-03 reads (`FgPlanSnapshot`). Not wired: SAP's plan stays
 * E14-03's input until the backtest (E14-10) exists (ENG-B66). Tested so the
 * switch is a substitution, not a rebuild.
 */
export function forecastAsPlanSnapshot(run: DemandForecastRun): FgPlanSnapshot[] {
  const madeAt = run.weeks[0];
  return run.skus
    .filter((s) => s.method !== 'discontinued')
    .flatMap((s) => run.weeks.map((w, i) => ({ skuCode: s.skuCode, madeAt, weekStart: w, quantity: s.forecast[i] })));
}
