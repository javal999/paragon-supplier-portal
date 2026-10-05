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

/** @import { RequirementSeries } from './bom' */
import { grossRequirement } from './bom';
import { addDays, daysBetween, mondayOf } from './dates';
/** @import { DemandForecastInput, DemandForecastRun, ForecastMethod } from './demandForecast' */
import {
  FORECAST_HORIZON_WEEKS,
  MIN_HISTORY_WEEKS,
  demandForecast,
  fillStockouts,
  forecastAsPlanSnapshot,
  historyOf
} from './demandForecast';
import { RAMADAN_TABLE, calendarIndex } from './eventCalendar';
/** @import { CalendarIndex } from './forecastMethods' */
import { combWith, croston, tsb } from './forecastMethods';
/** @import { SafetyStockOptions, SafetyStockRun } from './safetyStock' */
import { empiricalQuantile, safetyStockRun } from './safetyStock';
/** @import { Brand, EngineDataset, FgPlanSnapshot, IsoDate, SalesWeek, WarehouseKind } from './types' */
/** @import { Uom } from '../sdc/types' */

// ── Parameters ──────────────────────────────────────────────────────────────

/**
 * @typedef {object} DemandRangeOptions
 * @property {readonly number[]} levels -  The quantile levels, ascending (BR-01: at least 0.5 and 0.9; X-05 adds one).
 * @property {number} originWeeks -  Past origins replayed (weeks before the current week).
 * @property {number} retrainWeeks -  Weeks between retrainings of the model in the replay (E14-06 BR-07).
 * @property {number} minCalibration -  Fewer past ratios than this at a horizon: the group's.
 * @property {number} step -  η — the online correction's step, as a ratio of the forecast.
 */

/**
 * BR-01 — the levels always produced.
 * @type {readonly number[]}
 */
export const BASE_RANGE_LEVELS = Object.freeze([0.5, 0.9]);

/** @type {DemandRangeOptions} */
export const DEFAULT_DEMAND_RANGE_OPTIONS = Object.freeze({
  levels: BASE_RANGE_LEVELS,
  originWeeks: 52,
  retrainWeeks: 8,
  minCalibration: 10,
  step: 0.05
});

/**
 * The levels in force: P50 and P90 plus the administrator's extra quantile
 * (`engine.rangeExtraQuantilePct`, 0 = none), ascending, without duplicates.
 * @param {number} extraPct
 * @returns {number[]}
 */
export function rangeLevels(extraPct) {
  const out = /** @type {Set<number>} */ (new Set(BASE_RANGE_LEVELS));
  if (extraPct > 0 && extraPct < 100) out.add(Math.round(extraPct) / 100);
  return [...out].sort((a, b) => a - b);
}

// ── The arithmetic ──────────────────────────────────────────────────────────

/**
 * `empiricalQuantile` (E14-04's nearest rank, the ⌈u·n⌉-th smallest) on scores
 * already sorted ascending — the same rule, without sorting again.
 * @param {readonly number[]} sorted
 * @param {number} u
 * @returns {number | null}
 */
function quantileOfSorted(sorted, u) {
  const n = sorted.length;
  if (n === 0) return null;
  const rank = Math.min(n, Math.max(1, Math.ceil(u * n - 1e-9)));
  return sorted[rank - 1];
}

/**
 * Insert into an ascending array, after any equal value.
 * @param {number[]} sorted
 * @param {number} v
 * @returns {void}
 */
function insertSorted(sorted, v) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= v) lo = mid + 1;
    else hi = mid;
  }
  sorted.splice(lo, 0, v);
}

/**
 * BR-03 — one week of quantile tracking: offset + step × (1{missed} − (1 − u)).
 * @param {number} offset
 * @param {boolean} missed
 * @param {number} u
 * @param {number} step
 * @returns {number}
 */
export const trackQuantile = (offset, missed, u, step) =>
  offset + step * ((missed ? 1 : 0) - (1 - u));

/** One past forecast of a series: origin index k (0 = the first origin), horizon h ≥ 1. */
/**
 * @typedef {object} RangePair
 * @property {number} k
 * @property {number} h
 * @property {number} forecast
 * @property {number | null} actual -  What sold in the target week; null when it has not happened or is not demand (a stock-out).
 */

/**
 * @typedef {object} RangeExperience
 * @property {number} checked -  Past (week, horizon) ranges checked against what sold.
 * @property {readonly number[]} above -  Per level: how many sold ABOVE the level.
 * @property {readonly number[]} aboveUncorrected -  The same without the online correction (BR-03's effect).
 * @property {number} checkedNext -  Horizon-1 checks only (the newest range for each week).
 * @property {readonly number[]} aboveNext
 */

/**
 * @typedef {object} Calibration
 * @property {readonly (readonly number[])[]} scores -  Ratios per horizon (index h − 1) known now: the calibration set.
 * @property {readonly number[]} offsets -  δ per level after the last week in.
 * @property {RangeExperience} experience
 */

/**
 * Sections 2 to 4 for one series: the calibration set, the online offsets and
 * the honest record of misses. `originCount` = K: pairs have k < K; the target
 * week of (k, h) is week k + h − 1 of the origin axis, and only targets before
 * week K (the current week) have an actual.
 * @param {readonly RangePair[]} pairs
 * @param {number} originCount
 * @param {number} horizon
 * @param {readonly number[]} levels
 * @param {Pick<DemandRangeOptions, 'minCalibration' | 'step'>} options
 * @returns {Calibration}
 */
export function calibrateSeries(pairs, originCount, horizon, levels, options) {
  const K = originCount;
  const L = levels.length;
  const at = /** @type {Map<number, RangePair>} */ (new Map());
  /**
   * @param {number} k
   * @param {number} h
   */
  const key = (k, h) => k * (horizon + 1) + h;
  // Per horizon, the (target, ratio) of every usable pair, in target order.
  /** @type {{ target: number; ratio: number }[][]} */
  const known = Array.from({ length: horizon }, () => []);
  for (const p of pairs) {
    if (p.h < 1 || p.h > horizon) continue;
    at.set(key(p.k, p.h), p);
    const target = p.k + p.h - 1;
    if (p.actual !== null && p.forecast > 0 && target < K)
      known[p.h - 1].push({ target, ratio: p.actual / p.forecast });
  }
  for (const list of known) list.sort((a, b) => a.target - b.target);
  // The ratios known at origin k (target before k), per horizon. For a fixed h
  // the origins checked only move forward in time, so each set only grows.
  /** @type {number[][]} */
  const prefix = known.map(() => []);
  const taken = known.map(() => 0);
  /**
   * @param {number} h
   * @param {number} k
   * @returns {readonly number[]}
   */
  const before = (h, k) => {
    const list = known[h - 1];
    while (taken[h - 1] < list.length && list[taken[h - 1]].target < k)
      insertSorted(prefix[h - 1], list[taken[h - 1]++].ratio);
    return prefix[h - 1];
  };

  // δ per level; `offsetAt[k]` is δ in force at origin k (after the updates of
  // the weeks before k). One offset per level, at every horizon (BR-03).
  const offsets = /** @type {Array<number>} */ (new Array(L)).fill(0);
  /** @type {number[][]} */
  const offsetAt = [[...offsets]];
  const above = /** @type {Array<number>} */ (new Array(L)).fill(0);
  const aboveUncorrected = /** @type {Array<number>} */ (new Array(L)).fill(0);
  const aboveNext = /** @type {Array<number>} */ (new Array(L)).fill(0);
  let checked = 0;
  let checkedNext = 0;
  for (let t = 0; t < K; t += 1) {
    /** @type {boolean[] | null} */
    let next = null;
    for (let h = 1; h <= horizon && t - h + 1 >= 0; h += 1) {
      const k = t - h + 1;
      const p = at.get(key(k, h));
      if (!p || p.actual === null || p.forecast <= 0) continue;
      const cal = before(h, k);
      if (cal.length < options.minCalibration) continue;
      checked += 1;
      const misses = levels.map((u, i) => {
        const q = /** @type {NonNullable<ReturnType<typeof quantileOfSorted>>} */ (
          quantileOfSorted(cal, u)
        );
        const raw =
          /** @type {NonNullable<typeof p.actual>} */ (p.actual) > p.forecast * Math.max(0, q);
        const corrected =
          /** @type {NonNullable<typeof p.actual>} */ (p.actual) >
          p.forecast * Math.max(0, q + offsetAt[k][i]);
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
    if (next)
      next.forEach((m, i) => (offsets[i] = trackQuantile(offsets[i], m, levels[i], options.step)));
    offsetAt.push([...offsets]);
  }
  return {
    scores: known.map((list) => list.map((x) => x.ratio)),
    offsets: [...offsets],
    experience: { checked, above, aboveUncorrected, checkedNext, aboveNext }
  };
}

/** @typedef {'own' | 'group' | 'none'} RangeSource */

/**
 * @typedef {object} RangeBand
 * @property {number} level
 * @property {readonly (number | null)[]} values -  Per forecast week; null where no range could be calibrated.
 */

/**
 * The range for the forecast weeks: per level Q_u(h) = forecast × (q_u(h) + δ_u),
 * never below 0, and never below a lower level's value (quantiles do not cross).
 * @param {readonly number[]} forecast
 * @param {Calibration} cal
 * @param {readonly number[]} levels
 * @param {number} minCalibration
 * @param {readonly (readonly number[])[]} [groupScores]
 * @returns {{ bands: RangeBand[]; source: RangeSource[] }}
 */
export function applyRange(forecast, cal, levels, minCalibration, groupScores) {
  /** @type {RangeSource[]} */
  const source = [];
  /** @type {(number | null)[][]} */
  const cols = levels.map(() => []);
  forecast.forEach((f, i) => {
    const own = cal.scores[i] ?? [];
    const group = groupScores?.[i] ?? [];
    const scores =
      own.length >= minCalibration ? own : group.length >= minCalibration ? group : null;
    source.push(scores === null ? 'none' : scores === own ? 'own' : 'group');
    let floor = 0;
    levels.forEach((u, j) => {
      if (scores === null) {
        cols[j].push(null);
        return;
      }
      const v = Math.max(
        floor,
        Math.round(
          f *
            Math.max(
              0,
              /** @type {NonNullable<ReturnType<typeof empiricalQuantile>>} */ (
                empiricalQuantile(scores, u)
              ) + cal.offsets[j]
            )
        )
      );
      floor = v;
      cols[j].push(v);
    });
  });
  return { bands: levels.map((level, j) => ({ level, values: cols[j] })), source };
}

// ── 1 · The replay ──────────────────────────────────────────────────────────

/**
 * @typedef {object} Replay
 * @property {readonly IsoDate[]} origins -  The origin Mondays, oldest first (k = index).
 * @property {readonly IsoDate[]} retrains -  The retraining Mondays.
 * @property {number} horizon
 * @property {ReadonlyMap<string, readonly (readonly number[])[]>} forecasts -  skuCode → per origin, the H weekly forecasts (never negative).
 * @property {ReadonlyMap<string, readonly ForecastMethod[]>} methods -  skuCode → per origin, the method in force (chosen at the last retraining).
 */

/** @typedef {Pick<DemandForecastInput, 'finishedGoods' | 'sales' | 'fgPlan' | 'asOf' | 'horizonWeeks' | 'ramadanTable'>} ReplayInput */

/**
 * @param {number} n
 * @returns {number[]}
 */
const zeros = (n) => /** @type {Array<number>} */ (new Array(n)).fill(0);

/**
 * Section 1 — the forecasts the engine would have made at each past origin.
 * @param {ReplayInput} input
 * @param {Pick<DemandRangeOptions, 'originWeeks' | 'retrainWeeks'>} [options]
 * @returns {Replay}
 */
export function replayForecasts(input, options = DEFAULT_DEMAND_RANGE_OPTIONS) {
  const H = input.horizonWeeks ?? FORECAST_HORIZON_WEEKS;
  const table = input.ramadanTable ?? RAMADAN_TABLE;
  const current = mondayOf(input.asOf);
  const fgs = [...input.finishedGoods]
    .filter((f) => f.oem !== true)
    .sort((a, b) => a.skuCode.localeCompare(b.skuCode));
  const codes = new Set(fgs.map((f) => f.skuCode));
  const own = input.sales.filter((s) => codes.has(s.skuCode));
  const firstSale = own.reduce(
    (m, s) => (m === null || s.weekStart < m ? s.weekStart : m),
    /** @type {IsoDate | null} */ (null)
  );
  /** @type {Replay} */
  const empty = { origins: [], retrains: [], horizon: H, forecasts: new Map(), methods: new Map() };
  if (firstSale === null) return empty;
  let first = addDays(current, -7 * options.originWeeks);
  const earliest = addDays(mondayOf(firstSale), 7 * MIN_HISTORY_WEEKS);
  if (first < earliest) first = earliest;
  /** @type {IsoDate[]} */
  const origins = [];
  for (let o = first; o < current; o = addDays(o, 7)) origins.push(o);
  if (origins.length === 0) return empty;

  const rowsBySku = /** @type {Map<string, SalesWeek[]>} */ (new Map());
  for (const s of own) rowsBySku.set(s.skuCode, [...(rowsBySku.get(s.skuCode) ?? []), s]);
  const full = new Map(
    fgs.map(
      (f) => /** @type {const} */ ([f.skuCode, historyOf(rowsBySku.get(f.skuCode) ?? [], current)])
    )
  );

  // SAP's plan by snapshot (ENG-B63 SKUs replay on the plan in force at the origin).
  const snapshots = [...new Set((input.fgPlan ?? []).map((p) => p.madeAt))].sort();
  const sapAt = /** @type {Map<string, number>} */ (new Map());
  for (const p of input.fgPlan ?? [])
    sapAt.set(`${p.madeAt}|${p.skuCode}|${p.weekStart}`, p.quantity);
  /**
   * @param {IsoDate} o
   * @returns {IsoDate | null}
   */
  const inForce = (o) => {
    /** @type {IsoDate | null} */
    let m = null;
    for (const s of snapshots) if (s <= o) m = s;
    return m;
  };

  const forecasts = /** @type {Map<string, number[][]>} */ (
    new Map(fgs.map((f) => [f.skuCode, []]))
  );
  const methods = /** @type {Map<string, ForecastMethod[]>} */ (
    new Map(fgs.map((f) => [f.skuCode, []]))
  );
  /** @type {IsoDate[]} */
  const retrains = [];
  /** @type {DemandForecastRun | null} */
  let run = null;
  const indexCache = /** @type {Map<string, number>} */ (new Map());

  origins.forEach((o, k) => {
    if (k % options.retrainWeeks === 0) {
      run = demandForecast({
        finishedGoods: fgs,
        sales: own,
        fgPlan: input.fgPlan,
        asOf: o,
        horizonWeeks: H,
        ramadanTable: table
      });
      retrains.push(o);
      indexCache.clear();
    }
    const r = /** @type {DemandForecastRun} */ (run);
    const weeks = Array.from({ length: H }, (_, i) => addDays(o, 7 * i));
    for (const fg of fgs) {
      const s = /** @type {import('./demandForecast').SkuForecast} */ (
        r.skus.find((x) => x.skuCode === fg.skuCode)
      );
      const hist = full.get(fg.skuCode) ?? null;
      const n = hist ? Math.max(0, Math.min(hist.qty.length, daysBetween(hist.start, o) / 7)) : 0;
      const qty = hist ? hist.qty.slice(0, n) : [];
      const stockout = hist ? hist.stockout.slice(0, n) : [];
      /** @param {IsoDate} w */
      const ended = (w) => fg.discontinueDate !== undefined && w >= fg.discontinueDate;
      /** @type {number[]} */
      let f;
      if (s.method === 'discontinued') {
        f = zeros(H);
      } else if (s.method === 'newSkuSap') {
        const m = inForce(o);
        f = weeks.map((w) => (m === null ? 0 : (sapAt.get(`${m}|${fg.skuCode}|${w}`) ?? 0)));
      } else if (s.method === 'sba' || s.method === 'croston' || s.method === 'tsb') {
        const inStock = qty.filter((_, t) => !stockout[t]);
        f = [
          ...(s.method === 'tsb' ? tsb(inStock, H) : croston(inStock, H, s.method === 'sba'))
            .forecast
        ];
      } else {
        // 'comb' (the main model is not built: ENG-B60; a supplied one is not replayed).
        const d = s.detail;
        const factors = r.events.brands.find((b) => b.brand === fg.brand)?.factors ?? [];
        /** @param {IsoDate} w */
        const idx = (w) => {
          const c = `${fg.brand}|${w}`;
          let v = indexCache.get(c);
          if (v === undefined) {
            v = calendarIndex(w, factors, r.events.lead, table);
            indexCache.set(c, v);
          }
          return v;
        };
        /** @type {CalendarIndex} */
        const index = {
          history: qty.map((_, t) =>
            idx(addDays(/** @type {NonNullable<typeof hist>} */ (hist).start, 7 * t))
          ),
          horizon: weeks.map(idx)
        };
        f = [
          ...combWith(
            fillStockouts(qty, stockout),
            H,
            {
              ses: /** @type {import('./forecastMethods').SesParams} */ (d.ses),
              holt: /** @type {import('./forecastMethods').HoltParams} */ (d.holt),
              damped: /** @type {import('./forecastMethods').HoltParams} */ (d.damped),
              seasonal: d.seasonal ?? false
            },
            index
          ).forecast
        ];
      }
      /** @type {NonNullable<ReturnType<typeof forecasts.get>>} */ (forecasts.get(fg.skuCode)).push(
        f.map((v, i) => (ended(weeks[i]) || !(v > 0) ? 0 : v))
      );
      /** @type {NonNullable<ReturnType<typeof methods.get>>} */ (methods.get(fg.skuCode)).push(
        s.method
      );
    }
  });
  return { origins, retrains, horizon: H, forecasts, methods };
}

/**
 * The replay as past plan snapshots (made on each origin) — the shape E14-04 reads.
 * @param {Replay} replay
 * @returns {FgPlanSnapshot[]}
 */
export function replayAsPlanSnapshots(replay) {
  /** @type {FgPlanSnapshot[]} */
  const out = [];
  replay.origins.forEach((o, k) => {
    for (const [skuCode, rows] of replay.forecasts) {
      rows[k].forEach((quantity, i) =>
        out.push({ skuCode, madeAt: o, weekStart: addDays(o, 7 * i), quantity })
      );
    }
  });
  return out;
}

// ── The run ─────────────────────────────────────────────────────────────────

/**
 * @typedef {object} SeriesRange
 * @property {string} key -  SKU code, brand, 'total', or material code.
 * @property {'engine' | 'sapPlan'} basis -  Whose past errors calibrate it: the engine's replay, or SAP's plan (a new SKU, ENG-B96).
 * @property {readonly number[]} forecast -  The forecast the range is built around (the page's figure).
 * @property {readonly RangeBand[]} bands
 * @property {readonly RangeSource[]} source -  Per week: own history, the group's, or none.
 * @property {number} calibrationNext -  Past ratios at horizon 1 and at the last horizon (the calibration set's size).
 * @property {number} calibrationLast
 * @property {readonly number[]} offsets -  δ per level now.
 * @property {RangeExperience} experience
 */

/**
 * @typedef {SeriesRange & {
 *     readonly brand: Brand;
 *     readonly method: ForecastMethod;
 *   }} SkuRange
 */

/**
 * @typedef {SeriesRange & {
 *     readonly kind: WarehouseKind;
 *     readonly uom: Uom;
 *   }} MaterialRange
 */

/**
 * @typedef {object} DemandRangeRun
 * @property {IsoDate} asOf
 * @property {readonly IsoDate[]} weeks
 * @property {readonly number[]} levels
 * @property {Omit<DemandRangeOptions, 'levels'>} options
 * @property {{ readonly first: IsoDate | null; readonly last: IsoDate | null; readonly count: number }} origins
 * @property {readonly IsoDate[]} retrains
 * @property {SeriesRange} total
 * @property {readonly (SeriesRange & { readonly brand: Brand })[]} brands
 * @property {readonly SkuRange[]} skus -  Every SKU with a forecast (a SKU discontinued before the horizon has none).
 * @property {readonly MaterialRange[]} materials -  Every material with an engine requirement in the horizon (not in use: ENG-B66).
 * @property {readonly { readonly key: string; readonly experience: RangeExperience }[]} skuExperience -  Summed over every SKU's own checks, per brand and in all (Experience).
 */

/** @typedef {ReplayInput & Pick<EngineDataset, 'bom' | 'materials'>} DemandRangeInput */

/**
 * @param {RangeExperience} a
 * @param {RangeExperience} b
 * @returns {RangeExperience}
 */
const addExperience = (a, b) => ({
  checked: a.checked + b.checked,
  above: a.above.map((x, i) => x + b.above[i]),
  aboveUncorrected: a.aboveUncorrected.map((x, i) => x + b.aboveUncorrected[i]),
  checkedNext: a.checkedNext + b.checkedNext,
  aboveNext: a.aboveNext.map((x, i) => x + b.aboveNext[i])
});

/**
 * @param {number} L
 * @returns {RangeExperience}
 */
const noExperience = (L) => ({
  checked: 0,
  above: zeros(L),
  aboveUncorrected: zeros(L),
  checkedNext: 0,
  aboveNext: zeros(L)
});

/**
 * Pool the calibration sets of a group, per horizon.
 * @param {readonly Calibration[]} cals
 * @param {number} H
 * @returns {number[][]}
 */
const pool = (cals, H) =>
  Array.from({ length: H }, (_, i) => cals.flatMap((c) => [...(c.scores[i] ?? [])]));

/**
 * REQ-E14-09 — the range around a forecast run (sections 1 to 5).
 * @param {DemandRangeInput} input
 * @param {DemandForecastRun} run
 * @param {DemandRangeOptions} [options]
 * @param {Replay} [replayed]
 * @returns {DemandRangeRun}
 */
export function demandRange(input, run, options = DEFAULT_DEMAND_RANGE_OPTIONS, replayed) {
  const levels = [...options.levels].sort((a, b) => a - b);
  const L = levels.length;
  const H = run.weeks.length;
  const current = run.weeks[0];
  const replay = replayed ?? replayForecasts({ ...input, horizonWeeks: H }, options);
  const K = replay.origins.length;
  /**
   * @param {number} k
   * @param {number} h
   */
  const target = (k, h) => addDays(replay.origins[k], 7 * (h - 1));

  // What sold, per SKU and week (a stock-out week is not demand for the SKU's own ratios).
  const sold = /** @type {Map<string, SalesWeek>} */ (new Map());
  for (const s of input.sales) sold.set(`${s.skuCode}|${s.weekStart}`, s);
  /**
   * @param {string} sku
   * @param {IsoDate} w
   * @returns {number | null}
   */
  const skuActual = (sku, w) => {
    if (w >= current) return null;
    const r = sold.get(`${sku}|${w}`);
    return r ? (r.stockout ? null : r.quantity) : 0;
  };
  /**
   * @param {string} sku
   * @param {IsoDate} w
   * @returns {number}
   */
  const recorded = (sku, w) => sold.get(`${sku}|${w}`)?.quantity ?? 0;

  /**
   * @param {readonly (readonly number[])[]} fc
   * @param {(w: IsoDate) => number | null} actual
   * @returns {RangePair[]}
   */
  const pairsOf = (fc, actual) => {
    /** @type {RangePair[]} */
    const out = [];
    fc.forEach((row, k) =>
      row.forEach((f, i) => {
        const w = target(k, i + 1);
        out.push({ k, h: i + 1, forecast: f, actual: w < current ? actual(w) : null });
      })
    );
    return out;
  };
  const opts = { minCalibration: options.minCalibration, step: options.step };
  /** @param {readonly RangePair[]} pairs */
  const cal = (pairs) => calibrateSeries(pairs, K, H, levels, opts);
  /**
   * @param {string} key
   * @param {SeriesRange['basis']} basis
   * @param {readonly number[]} forecast
   * @param {Calibration} c
   * @param {number[][]} [group]
   * @returns {SeriesRange}
   */
  const series = (key, basis, forecast, c, group) => {
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
      experience: c.experience
    };
  };

  // ── SKUs
  const brandOf = new Map(
    input.finishedGoods.map((f) => /** @type {const} */ ([f.skuCode, f.brand]))
  );
  const live = run.skus.filter((s) => s.method !== 'discontinued');
  const skuCal = new Map(
    live.map((s) => {
      const fc = replay.forecasts.get(s.skuCode) ?? [];
      return /** @type {const} */ ([s.skuCode, cal(pairsOf(fc, (w) => skuActual(s.skuCode, w)))]);
    })
  );
  /**
   * @param {ForecastMethod} m
   * @returns {SeriesRange['basis']}
   */
  const basisOf = (m) => (m === 'newSkuSap' ? 'sapPlan' : 'engine');
  /** @type {SkuRange[]} */
  const skus = live.map((s) => {
    const basis = basisOf(s.method);
    const group = pool(
      live
        .filter(
          (x) => x.brand === s.brand && basisOf(x.method) === basis && x.skuCode !== s.skuCode
        )
        .map((x) => /** @type {Calibration} */ (skuCal.get(x.skuCode))),
      H
    );
    return {
      ...series(
        s.skuCode,
        basis,
        s.forecast,
        /** @type {Calibration} */ (skuCal.get(s.skuCode)),
        group
      ),
      brand: s.brand,
      method: s.method
    };
  });

  // ── Brands and total: the sum of every replayed SKU against the sum of what sold.
  /**
   * @param {readonly string[]} members
   * @returns {RangePair[]}
   */
  const levelPairs = (members) => {
    /** @type {number[][]} */
    const fc = replay.origins.map((_, k) =>
      Array.from({ length: H }, (_, i) =>
        members.reduce((a, c) => a + (replay.forecasts.get(c)?.[k][i] ?? 0), 0)
      )
    );
    return pairsOf(fc, (w) => members.reduce((a, c) => a + recorded(c, w), 0));
  };
  const allSkus = [...replay.forecasts.keys()];
  const brands = run.brands.map((b) => ({
    ...series(
      b.key,
      'engine',
      b.forecast,
      cal(levelPairs(allSkus.filter((c) => brandOf.get(c) === b.key)))
    ),
    brand: /** @type {Brand} */ (b.key)
  }));
  const total = series('total', 'engine', run.total.forecast, cal(levelPairs(allSkus)));

  // ── Materials: through the BOM (E14-03's grossRequirement), against what sold.
  /**
   * @param {Iterable<[string, readonly number[]]>} skuRows
   * @param {IsoDate} o
   * @returns {SalesWeek[]}
   */
  const toRows = (skuRows, o) => {
    /** @type {SalesWeek[]} */
    const rows = [];
    for (const [skuCode, f] of skuRows)
      f.forEach(
        (q, i) =>
          q > 0 &&
          rows.push({ skuCode, weekStart: addDays(o, 7 * i), quantity: q, stockout: false })
      );
    return rows;
  };
  /** @type {RequirementSeries[]} */
  const explodedAt = replay.origins.map((o, k) =>
    grossRequirement(
      toRows(
        [...replay.forecasts].map(
          ([c, rows]) => /** @type {[string, readonly number[]]} */ ([c, rows[k]])
        ),
        o
      ),
      input.bom
    )
  );
  const soldReq = grossRequirement(
    input.sales.filter((s) => s.weekStart < current),
    input.bom
  );
  const nowReq = grossRequirement(
    forecastAsPlanSnapshot(run).map((p) => ({
      skuCode: p.skuCode,
      weekStart: p.weekStart,
      quantity: p.quantity,
      stockout: false
    })),
    input.bom
  );
  const matCal = /** @type {Map<string, Calibration>} */ (new Map());
  const matInfo = [...input.materials].sort((a, b) => a.materialCode.localeCompare(b.materialCode));
  for (const m of matInfo) {
    const code = m.materialCode;
    const fc = replay.origins.map((_, k) =>
      Array.from({ length: H }, (_, i) => explodedAt[k].get(code)?.get(target(k, i + 1)) ?? 0)
    );
    matCal.set(code, cal(pairsOf(fc, (w) => soldReq.get(code)?.get(w) ?? 0)));
  }
  /** @type {MaterialRange[]} */
  const materials = matInfo
    .filter((m) => run.weeks.some((w) => (nowReq.get(m.materialCode)?.get(w) ?? 0) > 0))
    .map((m) => {
      const group = pool(
        matInfo
          .filter((x) => x.kind === m.kind && x.materialCode !== m.materialCode)
          .map((x) => /** @type {Calibration} */ (matCal.get(x.materialCode))),
        H
      );
      const forecast = run.weeks.map((w) => Math.round(nowReq.get(m.materialCode)?.get(w) ?? 0));
      return {
        ...series(
          m.materialCode,
          'engine',
          forecast,
          /** @type {Calibration} */ (matCal.get(m.materialCode)),
          group
        ),
        kind: m.kind,
        uom: m.uom
      };
    });

  const skuExperience = [
    ...run.brands.map((b) => ({
      key: b.key,
      experience: skus
        .filter((s) => s.brand === b.key)
        .reduce((a, s) => addExperience(a, s.experience), noExperience(L))
    })),
    {
      key: 'total',
      experience: skus.reduce((a, s) => addExperience(a, s.experience), noExperience(L))
    }
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
    skuExperience
  };
}

// ── 6 · What safety stock would be on the engine's forecast (not switched) ──

/**
 * E14-04's `safetyStockRun` on the engine's forecast instead of SAP's plan: the
 * replayed forecasts are the past plans (their errors are the range's error
 * distribution) and this run is the plan in force. Reported, never applied:
 * material planning stays on SAP's plan until the switch is decided (ENG-B66).
 * @param {EngineDataset} data
 * @param {DemandForecastRun} run
 * @param {Replay} replay
 * @param {SafetyStockOptions} options
 * @returns {SafetyStockRun}
 */
export function safetyStockOnEngineForecast(data, run, replay, options) {
  const fgPlan = [...replayAsPlanSnapshots(replay), ...forecastAsPlanSnapshot(run)];
  return safetyStockRun({ ...data, fgPlan }, options);
}
