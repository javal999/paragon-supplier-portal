// ─────────────────────────────────────────────────────────────────────────────
// DEMAND RANGE — REQ-E14-09 (METHOD-SPEC D5), BL-111.
//
// P50 and P90 (and any quantile the administrator adds, X-05) per SKU, brand,
// total and material, around the forecast BL-110 builds (E14-07). Pure: the
// dataset, the forecast run and the hub's date in, the range out (X-01).
//
// ── 1 · THE PAST FORECASTS: A REPLAY (ENG-B90) ──────────────────────────────
//   The engine has published no forecast yet, so the forecasts it WOULD have
//   made are replayed. Origins: the Mondays of the last `originWeeks` (52)
//   weeks, the first no earlier than one full season (52 weeks) after the first
//   sales week. The model is RETRAINED every `retrainWeeks` (8, E14-06 BR-07)
//   from the first origin: at a retraining the whole E14-07 pipeline runs as of
//   that Monday on the sales before it (`demandForecast`: method per SKU, the
//   Comb's parameters and seasonality, the demand-event factors per brand).
//   Between retrainings each weekly origin keeps those choices and rolls the
//   method's state forward over the new weeks (`combWith`; Croston, SBA and
//   TSB have no fitted parameter and simply run on the longer history). A SKU
//   on SAP's plan (ENG-B63) takes the SAP plan in force at the origin. The
//   replay is per SKU, before reconciliation (ENG-B91).
//
// ── 2 · CALIBRATION: EMPIRICAL QUANTILE PER HORIZON (D5 layer 2, BR-02) ─────
//   A past forecast's error is kept as a RATIO, actual ÷ forecast (ENG-B92),
//   per horizon h (h = 1 is the first forecast week). For level u the range is
//        Q_u(h) = forecast(h) × ( q_u(h) + δ_u )
//   where q_u(h) is the u-quantile of the n past ratios at horizon h, read as
//   E14-04 reads its errors (`empiricalQuantile`, nearest rank: the ⌈u·n⌉-th
//   smallest). So P90 sits where 9 in 10 past forecasts at that horizon sold at
//   or below it: when history shows actuals above a forecast-based P90 more
//   often, q rises — the range WIDENS until the miss rate on history is 10%
//   (BR-02). (Split-conformal's ⌈(n + 1)·u⌉-th was measured too: wider, with
//   P90 exceeded 5.2% of the time on the synthetic data against 7.2%; ENG-B92.)
//   Too few ratios at a horizon (< `minCalibration`, 10): the group's pooled
//   ratios at that horizon (the brand's SKUs; the materials of the same
//   warehouse kind), marked (the edge case). Too few there too: no range.
//
// ── 3 · ONLINE CORRECTION: QUANTILE TRACKING (D5 layer 3, BR-03) ────────────
//   Each week, once its actual is in, the offset of level u moves by
//        δ_u ← δ_u + η · ( 1{actual > Q_u} − (1 − u) )
//   on that week's newest range (horizon 1). A miss of P90 widens it by 0.9 η,
//   a week inside narrows it by 0.1 η, so P90 settles where it is exceeded 10%
//   of the time (conformal PID's P-term). η = `step` (0.05, as a ratio: 5% of
//   the forecast) (ENG-B93).
//
// ── 4 · HOW OFTEN ACTUALS FELL OUTSIDE (Experience; AC-02) ──────────────────
//   Walked forward in time, honestly: the range each past forecast would have
//   carried is built from the ratios known AT ITS ORIGIN (target week before
//   the origin) and the offset as it stood then, and compared with what sold.
//   Every (week, horizon) with at least `minCalibration` known ratios counts.
//   The share above P90 (target 10%) is reported with and without the online
//   correction, per series and aggregated (ENG-B94).
//
// ── 5 · LEVELS AND MATERIALS (ENG-B95) ──────────────────────────────────────
//   Brand and total: the level's forecast is the sum of its SKUs (as shown on
//   the page), and its range is calibrated on the level's own past errors (the
//   sum of the SKUs' replayed forecasts against the sum of what sold) — a
//   quantile of a sum is not the sum of the SKUs' quantiles. Materials: the
//   replayed and current forecasts are exploded through the BOM with E14-03's
//   `grossRequirement` (scrap, yield, the version valid each week) and
//   compared with the requirement of what sold, as E14-04 measures it.
//
// ── 6 · WHAT SAFETY STOCK WOULD BE (E14-04, not switched: ENG-B66, ENG-B97) ─
//   `safetyStockOnEngineForecast` runs E14-04's own `safetyStockRun` with the
//   replayed forecasts as the past plans and this run as the plan in force:
//   the fill-rate safety stock and the β-quantile reading (METHOD-SPEC M3 step
//   5: S = the upper quantile of lead-time demand, SS = S − the mean) on the
//   engine's errors. Nothing reads it: material planning stays on SAP's plan.
// ─────────────────────────────────────────────────────────────────────────────

import { grossRequirement, type RequirementSeries } from './bom';
import { addDays, daysBetween, mondayOf } from './dates';
import {
  FORECAST_HORIZON_WEEKS,
  MIN_HISTORY_WEEKS,
  demandForecast,
  fillStockouts,
  forecastAsPlanSnapshot,
  historyOf,
  type DemandForecastInput,
  type DemandForecastRun,
  type ForecastMethod,
} from './demandForecast';
import { RAMADAN_TABLE, calendarIndex } from './eventCalendar';
import { combWith, croston, tsb, type CalendarIndex } from './forecastMethods';
import { empiricalQuantile, safetyStockRun, type SafetyStockOptions, type SafetyStockRun } from './safetyStock';
import type { Brand, EngineDataset, FgPlanSnapshot, IsoDate, SalesWeek, WarehouseKind } from './types';
import type { Uom } from '../sdc/types';

// ── Parameters ──────────────────────────────────────────────────────────────

export interface DemandRangeOptions {
  /** The quantile levels, ascending (BR-01: at least 0.5 and 0.9; X-05 adds one). */
  readonly levels: readonly number[];
  /** Past origins replayed (weeks before the current week). */
  readonly originWeeks: number;
  /** Weeks between retrainings of the model in the replay (E14-06 BR-07). */
  readonly retrainWeeks: number;
  /** Fewer past ratios than this at a horizon: the group's. */
  readonly minCalibration: number;
  /** η — the online correction's step, as a ratio of the forecast. */
  readonly step: number;
}

/** BR-01 — the levels always produced. */
export const BASE_RANGE_LEVELS: readonly number[] = Object.freeze([0.5, 0.9]);

export const DEFAULT_DEMAND_RANGE_OPTIONS: DemandRangeOptions = Object.freeze({
  levels: BASE_RANGE_LEVELS,
  originWeeks: 52,
  retrainWeeks: 8,
  minCalibration: 10,
  step: 0.05,
});

/**
 * The levels in force: P50 and P90 plus the administrator's extra quantile
 * (`engine.rangeExtraQuantilePct`, 0 = none), ascending, without duplicates.
 */
export function rangeLevels(extraPct: number): number[] {
  const out = new Set<number>(BASE_RANGE_LEVELS);
  if (extraPct > 0 && extraPct < 100) out.add(Math.round(extraPct) / 100);
  return [...out].sort((a, b) => a - b);
}

// ── The arithmetic ──────────────────────────────────────────────────────────

/**
 * `empiricalQuantile` (E14-04's nearest rank, the ⌈u·n⌉-th smallest) on scores
 * already sorted ascending — the same rule, without sorting again.
 */
function quantileOfSorted(sorted: readonly number[], u: number): number | null {
  const n = sorted.length;
  if (n === 0) return null;
  const rank = Math.min(n, Math.max(1, Math.ceil(u * n - 1e-9)));
  return sorted[rank - 1];
}

/** Insert into an ascending array, after any equal value. */
function insertSorted(sorted: number[], v: number): void {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= v) lo = mid + 1;
    else hi = mid;
  }
  sorted.splice(lo, 0, v);
}

/** BR-03 — one week of quantile tracking: offset + step × (1{missed} − (1 − u)). */
export const trackQuantile = (offset: number, missed: boolean, u: number, step: number): number =>
  offset + step * ((missed ? 1 : 0) - (1 - u));

/** One past forecast of a series: origin index k (0 = the first origin), horizon h ≥ 1. */
export interface RangePair {
  readonly k: number;
  readonly h: number;
  readonly forecast: number;
  /** What sold in the target week; null when it has not happened or is not demand (a stock-out). */
  readonly actual: number | null;
}

export interface RangeExperience {
  /** Past (week, horizon) ranges checked against what sold. */
  readonly checked: number;
  /** Per level: how many sold ABOVE the level. */
  readonly above: readonly number[];
  /** The same without the online correction (BR-03's effect). */
  readonly aboveUncorrected: readonly number[];
  /** Horizon-1 checks only (the newest range for each week). */
  readonly checkedNext: number;
  readonly aboveNext: readonly number[];
}

export interface Calibration {
  /** Ratios per horizon (index h − 1) known now: the calibration set. */
  readonly scores: readonly (readonly number[])[];
  /** δ per level after the last week in. */
  readonly offsets: readonly number[];
  readonly experience: RangeExperience;
}

/**
 * Sections 2 to 4 for one series: the calibration set, the online offsets and
 * the honest record of misses. `originCount` = K: pairs have k < K; the target
 * week of (k, h) is week k + h − 1 of the origin axis, and only targets before
 * week K (the current week) have an actual.
 */
export function calibrateSeries(pairs: readonly RangePair[], originCount: number, horizon: number, levels: readonly number[], options: Pick<DemandRangeOptions, 'minCalibration' | 'step'>): Calibration {
  const K = originCount;
  const L = levels.length;
  const at = new Map<number, RangePair>();
  const key = (k: number, h: number) => k * (horizon + 1) + h;
  // Per horizon, the (target, ratio) of every usable pair, in target order.
  const known: { target: number; ratio: number }[][] = Array.from({ length: horizon }, () => []);
  for (const p of pairs) {
    if (p.h < 1 || p.h > horizon) continue;
    at.set(key(p.k, p.h), p);
    const target = p.k + p.h - 1;
    if (p.actual !== null && p.forecast > 0 && target < K) known[p.h - 1].push({ target, ratio: p.actual / p.forecast });
  }
  for (const list of known) list.sort((a, b) => a.target - b.target);
  // The ratios known at origin k (target before k), per horizon. For a fixed h
  // the origins checked only move forward in time, so each set only grows.
  const prefix: number[][] = known.map(() => []);
  const taken = known.map(() => 0);
  const before = (h: number, k: number): readonly number[] => {
    const list = known[h - 1];
    while (taken[h - 1] < list.length && list[taken[h - 1]].target < k) insertSorted(prefix[h - 1], list[taken[h - 1]++].ratio);
    return prefix[h - 1];
  };

  // δ per level; `offsetAt[k]` is δ in force at origin k (after the updates of
  // the weeks before k). One offset per level, at every horizon (BR-03).
  const offsets = new Array<number>(L).fill(0);
  const offsetAt: number[][] = [[...offsets]];
  const above = new Array<number>(L).fill(0);
  const aboveUncorrected = new Array<number>(L).fill(0);
  const aboveNext = new Array<number>(L).fill(0);
  let checked = 0;
  let checkedNext = 0;
  for (let t = 0; t < K; t += 1) {
    let next: boolean[] | null = null;
    for (let h = 1; h <= horizon && t - h + 1 >= 0; h += 1) {
      const k = t - h + 1;
      const p = at.get(key(k, h));
      if (!p || p.actual === null || p.forecast <= 0) continue;
      const cal = before(h, k);
      if (cal.length < options.minCalibration) continue;
      checked += 1;
      const misses = levels.map((u, i) => {
        const q = quantileOfSorted(cal, u)!;
        const raw = p.actual! > p.forecast * Math.max(0, q);
        const corrected = p.actual! > p.forecast * Math.max(0, q + offsetAt[k][i]);
        if (raw) aboveUncorrected[i] += 1;
        if (corrected) above[i] += 1;
        return corrected;
      });
      if (h === 1) {
        next = misses;
        checkedNext += 1;
        misses.forEach((m, i) => (aboveNext[i] += m ? 1 : 0));
      }
    }
    // BR-03: the week's actual is in; each level's offset moves on the week's newest range.
    if (next) next.forEach((m, i) => (offsets[i] = trackQuantile(offsets[i], m, levels[i], options.step)));
    offsetAt.push([...offsets]);
  }
  return {
    scores: known.map((list) => list.map((x) => x.ratio)),
    offsets: [...offsets],
    experience: { checked, above, aboveUncorrected, checkedNext, aboveNext },
  };
}

export type RangeSource = 'own' | 'group' | 'none';

export interface RangeBand {
  readonly level: number;
  /** Per forecast week; null where no range could be calibrated. */
  readonly values: readonly (number | null)[];
}

/**
 * The range for the forecast weeks: per level Q_u(h) = forecast × (q_u(h) + δ_u),
 * never below 0, and never below a lower level's value (quantiles do not cross).
 */
export function applyRange(
  forecast: readonly number[],
  cal: Calibration,
  levels: readonly number[],
  minCalibration: number,
  groupScores?: readonly (readonly number[])[],
): { bands: RangeBand[]; source: RangeSource[] } {
  const source: RangeSource[] = [];
  const cols: (number | null)[][] = levels.map(() => []);
  forecast.forEach((f, i) => {
    const own = cal.scores[i] ?? [];
    const group = groupScores?.[i] ?? [];
    const scores = own.length >= minCalibration ? own : group.length >= minCalibration ? group : null;
    source.push(scores === null ? 'none' : scores === own ? 'own' : 'group');
    let floor = 0;
    levels.forEach((u, j) => {
      if (scores === null) {
        cols[j].push(null);
        return;
      }
      const v = Math.max(floor, Math.round(f * Math.max(0, empiricalQuantile(scores, u)! + cal.offsets[j])));
      floor = v;
      cols[j].push(v);
    });
  });
  return { bands: levels.map((level, j) => ({ level, values: cols[j] })), source };
}

// ── 1 · The replay ──────────────────────────────────────────────────────────

export interface Replay {
  /** The origin Mondays, oldest first (k = index). */
  readonly origins: readonly IsoDate[];
  /** The retraining Mondays. */
  readonly retrains: readonly IsoDate[];
  readonly horizon: number;
  /** skuCode → per origin, the H weekly forecasts (never negative). */
  readonly forecasts: ReadonlyMap<string, readonly (readonly number[])[]>;
  /** skuCode → per origin, the method in force (chosen at the last retraining). */
  readonly methods: ReadonlyMap<string, readonly ForecastMethod[]>;
}

export type ReplayInput = Pick<DemandForecastInput, 'finishedGoods' | 'sales' | 'fgPlan' | 'asOf' | 'horizonWeeks' | 'ramadanTable'>;

const zeros = (n: number): number[] => new Array<number>(n).fill(0);

/** Section 1 — the forecasts the engine would have made at each past origin. */
export function replayForecasts(input: ReplayInput, options: Pick<DemandRangeOptions, 'originWeeks' | 'retrainWeeks'> = DEFAULT_DEMAND_RANGE_OPTIONS): Replay {
  const H = input.horizonWeeks ?? FORECAST_HORIZON_WEEKS;
  const table = input.ramadanTable ?? RAMADAN_TABLE;
  const current = mondayOf(input.asOf);
  const fgs = [...input.finishedGoods].filter((f) => f.oem !== true).sort((a, b) => a.skuCode.localeCompare(b.skuCode));
  const codes = new Set(fgs.map((f) => f.skuCode));
  const own = input.sales.filter((s) => codes.has(s.skuCode));
  const firstSale = own.reduce<IsoDate | null>((m, s) => (m === null || s.weekStart < m ? s.weekStart : m), null);
  const empty: Replay = { origins: [], retrains: [], horizon: H, forecasts: new Map(), methods: new Map() };
  if (firstSale === null) return empty;
  let first = addDays(current, -7 * options.originWeeks);
  const earliest = addDays(mondayOf(firstSale), 7 * MIN_HISTORY_WEEKS);
  if (first < earliest) first = earliest;
  const origins: IsoDate[] = [];
  for (let o = first; o < current; o = addDays(o, 7)) origins.push(o);
  if (origins.length === 0) return empty;

  const rowsBySku = new Map<string, SalesWeek[]>();
  for (const s of own) rowsBySku.set(s.skuCode, [...(rowsBySku.get(s.skuCode) ?? []), s]);
  const full = new Map(fgs.map((f) => [f.skuCode, historyOf(rowsBySku.get(f.skuCode) ?? [], current)] as const));

  // SAP's plan by snapshot (ENG-B63 SKUs replay on the plan in force at the origin).
  const snapshots = [...new Set((input.fgPlan ?? []).map((p) => p.madeAt))].sort();
  const sapAt = new Map<string, number>();
  for (const p of input.fgPlan ?? []) sapAt.set(`${p.madeAt}|${p.skuCode}|${p.weekStart}`, p.quantity);
  const inForce = (o: IsoDate): IsoDate | null => {
    let m: IsoDate | null = null;
    for (const s of snapshots) if (s <= o) m = s;
    return m;
  };

  const forecasts = new Map<string, number[][]>(fgs.map((f) => [f.skuCode, []]));
  const methods = new Map<string, ForecastMethod[]>(fgs.map((f) => [f.skuCode, []]));
  const retrains: IsoDate[] = [];
  let run: DemandForecastRun | null = null;
  const indexCache = new Map<string, number>();

  origins.forEach((o, k) => {
    if (k % options.retrainWeeks === 0) {
      run = demandForecast({ finishedGoods: fgs, sales: own, fgPlan: input.fgPlan, asOf: o, horizonWeeks: H, ramadanTable: table });
      retrains.push(o);
      indexCache.clear();
    }
    const r = run!;
    const weeks = Array.from({ length: H }, (_, i) => addDays(o, 7 * i));
    for (const fg of fgs) {
      const s = r.skus.find((x) => x.skuCode === fg.skuCode)!;
      const hist = full.get(fg.skuCode) ?? null;
      const n = hist ? Math.max(0, Math.min(hist.qty.length, daysBetween(hist.start, o) / 7)) : 0;
      const qty = hist ? hist.qty.slice(0, n) : [];
      const stockout = hist ? hist.stockout.slice(0, n) : [];
      const ended = (w: IsoDate) => fg.discontinueDate !== undefined && w >= fg.discontinueDate;
      let f: number[];
      if (s.method === 'discontinued') {
        f = zeros(H);
      } else if (s.method === 'newSkuSap') {
        const m = inForce(o);
        f = weeks.map((w) => (m === null ? 0 : sapAt.get(`${m}|${fg.skuCode}|${w}`) ?? 0));
      } else if (s.method === 'sba' || s.method === 'croston' || s.method === 'tsb') {
        const inStock = qty.filter((_, t) => !stockout[t]);
        f = [...(s.method === 'tsb' ? tsb(inStock, H) : croston(inStock, H, s.method === 'sba')).forecast];
      } else {
        // 'comb' (the main model is not built: ENG-B60; a supplied one is not replayed).
        const d = s.detail;
        const factors = r.events.brands.find((b) => b.brand === fg.brand)?.factors ?? [];
        const idx = (w: IsoDate) => {
          const c = `${fg.brand}|${w}`;
          let v = indexCache.get(c);
          if (v === undefined) {
            v = calendarIndex(w, factors, r.events.lead, table);
            indexCache.set(c, v);
          }
          return v;
        };
        const index: CalendarIndex = {
          history: qty.map((_, t) => idx(addDays(hist!.start, 7 * t))),
          horizon: weeks.map(idx),
        };
        f = [...combWith(fillStockouts(qty, stockout), H, { ses: d.ses!, holt: d.holt!, damped: d.damped!, seasonal: d.seasonal ?? false }, index).forecast];
      }
      forecasts.get(fg.skuCode)!.push(f.map((v, i) => (ended(weeks[i]) || !(v > 0) ? 0 : v)));
      methods.get(fg.skuCode)!.push(s.method);
    }
  });
  return { origins, retrains, horizon: H, forecasts, methods };
}

/** The replay as past plan snapshots (made on each origin) — the shape E14-04 reads. */
export function replayAsPlanSnapshots(replay: Replay): FgPlanSnapshot[] {
  const out: FgPlanSnapshot[] = [];
  replay.origins.forEach((o, k) => {
    for (const [skuCode, rows] of replay.forecasts) {
      rows[k].forEach((quantity, i) => out.push({ skuCode, madeAt: o, weekStart: addDays(o, 7 * i), quantity }));
    }
  });
  return out;
}

// ── The run ─────────────────────────────────────────────────────────────────

export interface SeriesRange {
  /** SKU code, brand, 'total', or material code. */
  readonly key: string;
  /** Whose past errors calibrate it: the engine's replay, or SAP's plan (a new SKU, ENG-B96). */
  readonly basis: 'engine' | 'sapPlan';
  /** The forecast the range is built around (the page's figure). */
  readonly forecast: readonly number[];
  readonly bands: readonly RangeBand[];
  /** Per week: own history, the group's, or none. */
  readonly source: readonly RangeSource[];
  /** Past ratios at horizon 1 and at the last horizon (the calibration set's size). */
  readonly calibrationNext: number;
  readonly calibrationLast: number;
  /** δ per level now. */
  readonly offsets: readonly number[];
  readonly experience: RangeExperience;
}

export interface SkuRange extends SeriesRange {
  readonly brand: Brand;
  readonly method: ForecastMethod;
}

export interface MaterialRange extends SeriesRange {
  readonly kind: WarehouseKind;
  readonly uom: Uom;
}

export interface DemandRangeRun {
  readonly asOf: IsoDate;
  readonly weeks: readonly IsoDate[];
  readonly levels: readonly number[];
  readonly options: Omit<DemandRangeOptions, 'levels'>;
  readonly origins: { readonly first: IsoDate | null; readonly last: IsoDate | null; readonly count: number };
  readonly retrains: readonly IsoDate[];
  readonly total: SeriesRange;
  readonly brands: readonly (SeriesRange & { readonly brand: Brand })[];
  /** Every SKU with a forecast (a SKU discontinued before the horizon has none). */
  readonly skus: readonly SkuRange[];
  /** Every material with an engine requirement in the horizon (not in use: ENG-B66). */
  readonly materials: readonly MaterialRange[];
  /** Summed over every SKU's own checks, per brand and in all (Experience). */
  readonly skuExperience: readonly { readonly key: string; readonly experience: RangeExperience }[];
}

export type DemandRangeInput = ReplayInput & Pick<EngineDataset, 'bom' | 'materials'>;

const addExperience = (a: RangeExperience, b: RangeExperience): RangeExperience => ({
  checked: a.checked + b.checked,
  above: a.above.map((x, i) => x + b.above[i]),
  aboveUncorrected: a.aboveUncorrected.map((x, i) => x + b.aboveUncorrected[i]),
  checkedNext: a.checkedNext + b.checkedNext,
  aboveNext: a.aboveNext.map((x, i) => x + b.aboveNext[i]),
});

const noExperience = (L: number): RangeExperience => ({
  checked: 0,
  above: zeros(L),
  aboveUncorrected: zeros(L),
  checkedNext: 0,
  aboveNext: zeros(L),
});

/** Pool the calibration sets of a group, per horizon. */
const pool = (cals: readonly Calibration[], H: number): number[][] =>
  Array.from({ length: H }, (_, i) => cals.flatMap((c) => [...(c.scores[i] ?? [])]));

/** REQ-E14-09 — the range around a forecast run (sections 1 to 5). */
export function demandRange(input: DemandRangeInput, run: DemandForecastRun, options: DemandRangeOptions = DEFAULT_DEMAND_RANGE_OPTIONS, replayed?: Replay): DemandRangeRun {
  const levels = [...options.levels].sort((a, b) => a - b);
  const L = levels.length;
  const H = run.weeks.length;
  const current = run.weeks[0];
  const replay = replayed ?? replayForecasts({ ...input, horizonWeeks: H }, options);
  const K = replay.origins.length;
  const target = (k: number, h: number) => addDays(replay.origins[k], 7 * (h - 1));

  // What sold, per SKU and week (a stock-out week is not demand for the SKU's own ratios).
  const sold = new Map<string, SalesWeek>();
  for (const s of input.sales) sold.set(`${s.skuCode}|${s.weekStart}`, s);
  const skuActual = (sku: string, w: IsoDate): number | null => {
    if (w >= current) return null;
    const r = sold.get(`${sku}|${w}`);
    return r ? (r.stockout ? null : r.quantity) : 0;
  };
  const recorded = (sku: string, w: IsoDate): number => sold.get(`${sku}|${w}`)?.quantity ?? 0;

  const pairsOf = (fc: readonly (readonly number[])[], actual: (w: IsoDate) => number | null): RangePair[] => {
    const out: RangePair[] = [];
    fc.forEach((row, k) =>
      row.forEach((f, i) => {
        const w = target(k, i + 1);
        out.push({ k, h: i + 1, forecast: f, actual: w < current ? actual(w) : null });
      }),
    );
    return out;
  };
  const opts = { minCalibration: options.minCalibration, step: options.step };
  const cal = (pairs: readonly RangePair[]) => calibrateSeries(pairs, K, H, levels, opts);
  const series = (key: string, basis: SeriesRange['basis'], forecast: readonly number[], c: Calibration, group?: number[][]): SeriesRange => {
    const { bands, source } = applyRange(forecast, c, levels, options.minCalibration, group);
    return {
      key,
      basis,
      forecast,
      bands,
      source,
      calibrationNext: c.scores[0]?.length ?? 0,
      calibrationLast: c.scores[H - 1]?.length ?? 0,
      offsets: c.offsets,
      experience: c.experience,
    };
  };

  // ── SKUs
  const brandOf = new Map(input.finishedGoods.map((f) => [f.skuCode, f.brand] as const));
  const live = run.skus.filter((s) => s.method !== 'discontinued');
  const skuCal = new Map(
    live.map((s) => {
      const fc = replay.forecasts.get(s.skuCode) ?? [];
      return [s.skuCode, cal(pairsOf(fc, (w) => skuActual(s.skuCode, w)))] as const;
    }),
  );
  const basisOf = (m: ForecastMethod): SeriesRange['basis'] => (m === 'newSkuSap' ? 'sapPlan' : 'engine');
  const skus: SkuRange[] = live.map((s) => {
    const basis = basisOf(s.method);
    const group = pool(
      live.filter((x) => x.brand === s.brand && basisOf(x.method) === basis && x.skuCode !== s.skuCode).map((x) => skuCal.get(x.skuCode)!),
      H,
    );
    return { ...series(s.skuCode, basis, s.forecast, skuCal.get(s.skuCode)!, group), brand: s.brand, method: s.method };
  });

  // ── Brands and total: the sum of every replayed SKU against the sum of what sold.
  const levelPairs = (members: readonly string[]): RangePair[] => {
    const fc: number[][] = replay.origins.map((_, k) => Array.from({ length: H }, (_, i) => members.reduce((a, c) => a + (replay.forecasts.get(c)?.[k][i] ?? 0), 0)));
    return pairsOf(fc, (w) => members.reduce((a, c) => a + recorded(c, w), 0));
  };
  const allSkus = [...replay.forecasts.keys()];
  const brands = run.brands.map((b) => ({
    ...series(b.key, 'engine', b.forecast, cal(levelPairs(allSkus.filter((c) => brandOf.get(c) === b.key)))),
    brand: b.key as Brand,
  }));
  const total = series('total', 'engine', run.total.forecast, cal(levelPairs(allSkus)));

  // ── Materials: through the BOM (E14-03's grossRequirement), against what sold.
  const toRows = (skuRows: Iterable<[string, readonly number[]]>, o: IsoDate): SalesWeek[] => {
    const rows: SalesWeek[] = [];
    for (const [skuCode, f] of skuRows) f.forEach((q, i) => q > 0 && rows.push({ skuCode, weekStart: addDays(o, 7 * i), quantity: q, stockout: false }));
    return rows;
  };
  const explodedAt: RequirementSeries[] = replay.origins.map((o, k) =>
    grossRequirement(toRows([...replay.forecasts].map(([c, rows]) => [c, rows[k]] as [string, readonly number[]]), o), input.bom),
  );
  const soldReq = grossRequirement(input.sales.filter((s) => s.weekStart < current), input.bom);
  const nowReq = grossRequirement(
    forecastAsPlanSnapshot(run).map((p) => ({ skuCode: p.skuCode, weekStart: p.weekStart, quantity: p.quantity, stockout: false })),
    input.bom,
  );
  const matCal = new Map<string, Calibration>();
  const matInfo = [...input.materials].sort((a, b) => a.materialCode.localeCompare(b.materialCode));
  for (const m of matInfo) {
    const code = m.materialCode;
    const fc = replay.origins.map((_, k) => Array.from({ length: H }, (_, i) => explodedAt[k].get(code)?.get(target(k, i + 1)) ?? 0));
    matCal.set(code, cal(pairsOf(fc, (w) => soldReq.get(code)?.get(w) ?? 0)));
  }
  const materials: MaterialRange[] = matInfo
    .filter((m) => run.weeks.some((w) => (nowReq.get(m.materialCode)?.get(w) ?? 0) > 0))
    .map((m) => {
      const group = pool(
        matInfo.filter((x) => x.kind === m.kind && x.materialCode !== m.materialCode).map((x) => matCal.get(x.materialCode)!),
        H,
      );
      const forecast = run.weeks.map((w) => Math.round(nowReq.get(m.materialCode)?.get(w) ?? 0));
      return { ...series(m.materialCode, 'engine', forecast, matCal.get(m.materialCode)!, group), kind: m.kind, uom: m.uom };
    });

  const skuExperience = [
    ...run.brands.map((b) => ({ key: b.key, experience: skus.filter((s) => s.brand === b.key).reduce((a, s) => addExperience(a, s.experience), noExperience(L)) })),
    { key: 'total', experience: skus.reduce((a, s) => addExperience(a, s.experience), noExperience(L)) },
  ];

  const { levels: _l, ...rest } = options;
  void _l;
  return {
    asOf: run.asOf,
    weeks: run.weeks,
    levels,
    options: rest,
    origins: { first: replay.origins[0] ?? null, last: replay.origins[K - 1] ?? null, count: K },
    retrains: replay.retrains,
    total,
    brands,
    skus,
    materials,
    skuExperience,
  };
}

// ── 6 · What safety stock would be on the engine's forecast (not switched) ──

/**
 * E14-04's `safetyStockRun` on the engine's forecast instead of SAP's plan: the
 * replayed forecasts are the past plans (their errors are the range's error
 * distribution) and this run is the plan in force. Reported, never applied:
 * material planning stays on SAP's plan until the switch is decided (ENG-B66).
 */
export function safetyStockOnEngineForecast(data: EngineDataset, run: DemandForecastRun, replay: Replay, options: SafetyStockOptions): SafetyStockRun {
  const fgPlan = [...replayAsPlanSnapshots(replay), ...forecastAsPlanSnapshot(run)];
  return safetyStockRun({ ...data, fgPlan }, options);
}
