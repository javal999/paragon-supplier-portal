// ─────────────────────────────────────────────────────────────────────────────
// CHOOSING MODELS BY SERVICE, NOT ACCURACY — REQ-E14-10 (METHOD-SPEC E), BL-112.
//
// A rolling-origin backtest. At each past origin every candidate forecasts
// each SKU as if it were that day; PTI's own ordering policy is then REPLAYED
// on each candidate's forecast against what actually sold, and the SKU's
// model is chosen by the service the replay gives — fill rate and warehouse
// space — not by forecast accuracy (Chin, Cheng, Gunawan 2026: accuracy rank
// and service rank correlated at −0.555). Pure: the dataset, the hub's date
// and the administrator's values in, the result out (X-01).
//
// ── ORIGINS (BR-01) ─────────────────────────────────────────────────────────
//   The first origin is the first Monday on which (a) SAP's plan has a
//   snapshot — the benchmark must exist at every origin — and (b) at least
//   one SKU has a full season (52 weeks) of history. Then one origin every
//   ORIGIN_SPACING_WEEKS while the origin leaves MIN_EVAL_WEEKS of actual
//   sales after it. Each origin's forecast is the plan in force until the
//   next origin. On the synthetic history (2024-09-02 to 2026-08-24, SAP's
//   snapshots from 2025-09-01) that is 12 origins, 2025-09-01 to 2026-07-06,
//   four weeks apart: the 2025-10-27 version is in force for 11.11; 2026-01-19
//   forecasts Ramadan 1447 and Lebaran from before them; 2026-02-16 and
//   2026-03-16 sit inside Ramadan. Ramadan 1446 (March 2025) and 11.11 in 2024
//   cannot be origins: no SKU had 52 weeks of history before them and SAP's
//   plan has no snapshot then (ENG-B80).
//
// ── CANDIDATES, PER SKU ─────────────────────────────────────────────────────
//   The SKU's class is read at the LAST origin with E14-07's own rule.
//     · regular — Comb with the event index (the floor, E14-07 BR-02),
//                 Theta with the same index;
//     · slow    — E14-07 BR-03's method (SBA, or Croston where Kostenko–
//                 Hyndman picks it, or TSB for a SKU being discontinued) is the
//                 floor; the other of {SBA/Croston, TSB} is the alternative;
//     · both    — the main model (ENG-B60) when one is supplied; SAP's plan as
//                 the BENCHMARK (shown and compared, never chosen: switching to
//                 it is not a model choice, ENG-B66).
//   Eligible: own brand (OEM is not forecast, ENG-D20), 52 weeks of history at
//   the first origin (a newer SKU stays on SAP's plan, ENG-B63), not
//   discontinued by the first origin. Forecasts are each method's own
//   (before reconciliation), so the candidates are compared like for like.
//
// ── THE REPLAY: PTI'S ORDERING POLICY, WEEK BY WEEK (BR-02) ─────────────────
//   Per material (or a SKU's part of it), from the first origin to the last
//   week of sales, every week t:
//     1. E14-04 (`fillRateSafetyStock`): the safety stock is the smallest
//        stock whose expected units short per cycle ÷ Q is at most 1 − the
//        material's fill-rate target (the ENG-D5 tier by volume), over the
//        cumulative errors E_u = Σ (actual − plan in force at u) across the
//        risk window W = lead + review of every past week u whose window has
//        closed. Q = E14-03's interim size of one review's mean forecast.
//        With fewer than MIN_ERRORS such errors, SAP's safety stock (BR-05).
//     2. E14-03 (`grossRequirement`, `netMaterial`): the plan in force is
//        exploded through the BOM valid in each week; the projected stock at
//        the first week an order released now can arrive (t + lead) nets the
//        stock on hand, the receipts already on the way and the forecast.
//     3. E14-05 (`wagnerWhitinPlan`, the single-material sizing, BR-02): the
//        next PLAN_WEEKS from that week are sized to the MOQ and multiple,
//        trading the order cost against holding; the first week's lot is
//        released and arrives after the lead time.
//     4. The week's ACTUAL requirement (sales through the BOM, stock-out weeks
//        filled as E14-07 reads them) is served from stock; what cannot be
//        served is lost (not back-ordered).
//   The first lead-time weeks are covered by a pipeline equal to what was
//   actually needed and the replay starts at SAP's safety stock, the same for
//   every candidate; only weeks a replayed order could reach are measured.
//
// ── WHAT IS RECORDED (BR-02, BR-03) ─────────────────────────────────────────
//   · fill rate        — weeks fully served ÷ weeks with demand (the spec's
//                        fill proxy), over the SKU's (material, week) lines;
//   · order-complete   — weeks in which every one of the SKU's materials was
//                        fully served ÷ weeks with any demand (the PO-level
//                        measure, like CFOT);
//   · unit fill        — units served ÷ units needed (shown);
//   · pallet-weeks     — Σ end-of-week stock ÷ units per pallet (warehouse
//                        space); per warehouse, the peak against capacity and
//                        the pallet-weeks above it;
//   · MASC (G1)        — the mean absolute change between consecutive
//                        versions (origins) over the weeks both carry, ÷ the
//                        SKU's in-sample seasonal-naive error (`reliability.ts`);
//   · WAPE and bias    — over the weeks each version was in force. SHOWN, NOT
//                        USED TO CHOOSE (BR-03).
//
// ── SELECTION (BR-03, BR-04, AC-02) ─────────────────────────────────────────
//   A candidate BEATS THE FLOOR when its fill rate is at least the floor's and
//   it is better on fill rate or on pallet-weeks. Among those within the MASC
//   limit (ENG-D13; none set = not enforced), the best fill rate wins, then
//   the fewest pallet-weeks, then the candidate order. None: the floor. So the
//   chosen model never has a lower simulated fill rate than the fallback.
//
// ── WHY A SKU'S "PART" OF A MATERIAL ────────────────────────────────────────
//   Materials are shared (one bottle by up to 11 SKUs), so a SKU's method is
//   judged on its OWN part of each of its materials: its own requirement, the
//   material's lead time and target, and the MOQ, multiple and SAP safety
//   stock scaled to its share of the material's requirement over the history.
//   The material-level answer — every SKU on SAP's plan, on the floor, or on
//   its chosen method — is replayed as well (`portfolio`); that is the one
//   the switch of material planning (ENG-B66) turns on.
// ─────────────────────────────────────────────────────────────────────────────

import { grossRequirement } from './bom';
import { addDays, daysBetween, mondayOf } from './dates';
import { fillStockouts, MIN_HISTORY_WEEKS, SLOW_INTERVAL, SLOW_WINDOW_WEEKS, type MainModel } from './demandForecast';
import {
  RAMADAN_TABLE,
  calendarIndex,
  estimateEventFactors,
  estimateLead,
  tagWeek,
  type DemandEvent,
  type EventFactor,
  type RamadanDates,
} from './eventCalendar';
import { comb, croston, intermittency, khChoice, theta, tsb, type CalendarIndex } from './forecastMethods';
import { masc, seasonalNaiveScale } from './reliability';
import { interimOrderSize, netMaterial, offsetWeeks, primarySource } from './requirement';
import { wagnerWhitinPlan, type SizingItem } from './orderSizing';
import { DEFAULT_SAFETY_STOCK_OPTIONS, defaultTiers, fillRateSafetyStock, type ServiceTargets } from './safetyStock';
import type { Brand, EngineDataset, FinishedGood, IsoDate, SalesWeek, WarehouseKind } from './types';

// ── Parameters (ENG-B80 to ENG-B89) ─────────────────────────────────────────

/** Weeks between origins: four, about a month (ENG-B80). */
export const ORIGIN_SPACING_WEEKS = 4;
/** Weeks of actual sales an origin must leave after it. */
export const MIN_EVAL_WEEKS = 6;
/** Weeks each version forecasts. */
export const BACKTEST_HORIZON_WEEKS = 26;
/** Weeks E14-05 sizes ahead of the first week an order can reach. */
export const PLAN_WEEKS = 4;
/** E14-04's review period (its default). */
export const REVIEW_WEEKS = DEFAULT_SAFETY_STOCK_OPTIONS.reviewWeeks;
/** Closed error windows needed before a candidate's own safety stock is used (ENG-B83). */
export const MIN_ERRORS = 8;

const EPS = 1e-9;

export type BacktestCandidate = 'main' | 'comb' | 'theta' | 'sba' | 'croston' | 'tsb' | 'sapPlan';
export const BACKTEST_CANDIDATES: readonly BacktestCandidate[] = ['main', 'comb', 'theta', 'sba', 'croston', 'tsb', 'sapPlan'];

export type SkuClass = 'regular' | 'slow';

export interface BacktestCosts {
  /** K — rupiah per order (ENG-D6). */
  readonly orderCostIdr: number;
  /** Holding cost as a fraction of value per year (ENG-D6). */
  readonly holdingRatePerYear: number;
}

export interface BacktestInput {
  readonly data: Pick<
    EngineDataset,
    'finishedGoods' | 'sales' | 'fgPlan' | 'bom' | 'sources' | 'volumes' | 'materials' | 'materialValues' | 'sapSafetyStock' | 'warehouses'
  >;
  /** The hub's date. Only sales weeks before its Monday have happened. */
  readonly asOf: IsoDate;
  readonly targets: ServiceTargets;
  readonly costs: BacktestCosts;
  readonly mainModel?: MainModel;
  readonly ramadanTable?: readonly RamadanDates[];
}

// ── The replay of one item ──────────────────────────────────────────────────

/** One replayed flow: a material, or one SKU's part of it. */
export interface ReplayItem {
  readonly materialCode: string;
  readonly kind: WarehouseKind;
  /** The replay weeks (Mondays). */
  readonly weeks: readonly IsoDate[];
  /** The actual requirement per replay week. */
  readonly actual: readonly number[];
  readonly leadTimeDays: number;
  readonly moq: number;
  readonly orderMultiple: number;
  readonly palletsPerUnit: number;
  readonly holdingPerUnitWeek: number;
  /** The ENG-D5 fill-rate target of the material's tier. */
  readonly target: number;
  /** SAP's safety stock (BR-05), and the stock the replay starts at. */
  readonly fallbackSafetyStock: number;
}

export interface ReplayWeek {
  readonly weekStart: IsoDate;
  readonly safetyStock: number;
  readonly safetyStockSource: 'errors' | 'sap';
  /** The lot released this week (arrives after the lead time). */
  readonly released: number;
  readonly received: number;
  readonly demand: number;
  readonly served: number;
  readonly endStock: number;
  /** A week a replayed order could reach (t ≥ lead). */
  readonly measured: boolean;
}

export interface ReplayResult {
  readonly leadWeeks: number;
  readonly weeksWithDemand: number;
  readonly weeksFullyServed: number;
  readonly unitsNeeded: number;
  readonly unitsServed: number;
  readonly palletWeeks: number;
  /** End-of-week pallets per replay week (0 before measuring starts). */
  readonly pallets: readonly number[];
  /** Per week: null (not measured or no demand), true (fully served), false. */
  readonly full: readonly (boolean | null)[];
  readonly trace: readonly ReplayWeek[];
}

/**
 * Replays PTI's ordering policy on one item. `versions[k][j]` is the plan
 * made at origin k for replay week j (j may run past the replay's end);
 * `origins[k]` the replay-week index of origin k, ascending, `origins[0]` = 0.
 */
export function replayItem(
  item: ReplayItem,
  versions: readonly (readonly number[])[],
  origins: readonly number[],
  orderCostIdr: number,
): ReplayResult {
  const N = item.weeks.length;
  const L = offsetWeeks(item.leadTimeDays, 0);
  const W = L + REVIEW_WEEKS;
  const kAt = (t: number) => {
    let k = 0;
    while (k + 1 < origins.length && origins[k + 1] <= t) k += 1;
    return k;
  };
  const plan = (t: number, w: number) => versions[kAt(t)][w] ?? 0;
  const pipeline = new Array<number>(N).fill(0);
  for (let j = 0; j < Math.min(L, N); j += 1) pipeline[j] = item.actual[j];
  let onHand = item.fallbackSafetyStock;
  const errors: number[] = [];
  const trace: ReplayWeek[] = [];
  const pallets = new Array<number>(N).fill(0);
  const full: (boolean | null)[] = new Array(N).fill(null);
  let weeksWithDemand = 0;
  let weeksFullyServed = 0;
  let unitsNeeded = 0;
  let unitsServed = 0;
  let palletWeeks = 0;
  for (let t = 0; t < N; t += 1) {
    // 1 · E14-04 — the error of the plan in force at u over its risk window, once closed.
    const u = t - W;
    if (u >= 0) {
      let e = 0;
      for (let i = 0; i < W; i += 1) e += item.actual[u + i] - plan(u, u + i);
      errors.push(e);
    }
    let riskForecast = 0;
    for (let i = 0; i < W; i += 1) riskForecast += plan(t, t + i);
    const q = interimOrderSize((riskForecast / W) * REVIEW_WEEKS, item.moq, item.orderMultiple);
    const own = errors.length >= MIN_ERRORS;
    const ss = own ? fillRateSafetyStock(errors, q, item.target) : item.fallbackSafetyStock;
    // 2 · E14-03 — the projected stock at the first week an order released now can reach.
    let released = 0;
    const a = t + L;
    if (a < N) {
      let projected = onHand;
      if (L > 0) {
        const span = item.weeks.slice(t, a);
        const netted = netMaterial({
          weeks: span,
          currentWeek: item.weeks[t],
          startStock: onHand,
          gross: new Map(span.map((w, i) => [w, plan(t, t + i)])),
          receipts: new Map(span.map((w, i) => [w, pipeline[t + i]])),
          safetyStock: ss,
          leadTimeDays: item.leadTimeDays,
          safetyLeadTimeDays: 0,
          moq: item.moq,
          orderMultiple: item.orderMultiple,
          plannedReceipts: new Map(),
        });
        projected = netted[netted.length - 1].projectedEnd;
      }
      // 3 · E14-05 — size the next PLAN_WEEKS; release the first week's lot.
      const sizing: SizingItem = {
        materialCode: item.materialCode,
        startStock: projected,
        gross: Array.from({ length: PLAN_WEEKS }, (_, i) => plan(t, a + i)),
        receipts: new Array<number>(PLAN_WEEKS).fill(0),
        safetyStock: ss,
        moq: item.moq,
        orderMultiple: item.orderMultiple,
        offsetWeeks: 0,
        palletsPerUnit: item.palletsPerUnit,
        holdingPerUnitWeek: item.holdingPerUnitWeek,
      };
      released = wagnerWhitinPlan(sizing, orderCostIdr)[0] ?? 0;
      pipeline[a] += released;
    }
    // 4 · Serve what was actually needed; the rest is lost.
    const received = pipeline[t];
    const available = onHand + received;
    const demand = item.actual[t];
    const served = Math.min(available, demand);
    onHand = available - served;
    const measured = t >= L;
    if (measured) {
      pallets[t] = onHand * item.palletsPerUnit;
      palletWeeks += pallets[t];
      if (demand > EPS) {
        const ok = served >= demand - 1e-6;
        full[t] = ok;
        weeksWithDemand += 1;
        if (ok) weeksFullyServed += 1;
        unitsNeeded += demand;
        unitsServed += served;
      }
    }
    trace.push({ weekStart: item.weeks[t], safetyStock: ss, safetyStockSource: own ? 'errors' : 'sap', released, received, demand, served, endStock: onHand, measured });
  }
  return { leadWeeks: L, weeksWithDemand, weeksFullyServed, unitsNeeded, unitsServed, palletWeeks, pallets, full, trace };
}

// ── Measures ────────────────────────────────────────────────────────────────

export interface ServiceMeasures {
  /** Weeks fully served ÷ weeks with demand; null with no demand. */
  readonly fillRate: number | null;
  /** Weeks with every material fully served ÷ weeks with any demand; null with none. */
  readonly orderCompleteRate: number | null;
  /** Units served ÷ units needed; null with none needed. */
  readonly unitFillRate: number | null;
  readonly palletWeeks: number;
  /** The counts behind the rates, so they can be pooled. */
  readonly counts: { readonly lines: number; readonly fullLines: number; readonly orderWeeks: number; readonly completeWeeks: number };
}

/** A SKU's service from the replays of its parts of each material. */
export function skuService(parts: readonly ReplayResult[]): ServiceMeasures {
  const sum = (f: (r: ReplayResult) => number) => parts.reduce((s, r) => s + f(r), 0);
  const withDemand = sum((r) => r.weeksWithDemand);
  const needed = sum((r) => r.unitsNeeded);
  const N = parts.length ? parts[0].full.length : 0;
  let weeks = 0;
  let complete = 0;
  for (let t = 0; t < N; t += 1) {
    const cells = parts.map((r) => r.full[t]).filter((c): c is boolean => c !== null);
    if (cells.length === 0) continue;
    weeks += 1;
    if (cells.every(Boolean)) complete += 1;
  }
  return {
    fillRate: withDemand > 0 ? sum((r) => r.weeksFullyServed) / withDemand : null,
    orderCompleteRate: weeks > 0 ? complete / weeks : null,
    unitFillRate: needed > 0 ? sum((r) => r.unitsServed) / needed : null,
    palletWeeks: sum((r) => r.palletWeeks),
    counts: { lines: withDemand, fullLines: sum((r) => r.weeksFullyServed), orderWeeks: weeks, completeWeeks: complete },
  };
}

/** WAPE Σ|a − f| ÷ Σa and bias Σ(f − a) ÷ Σa over matched weeks; null with no actual. */
export function accuracy(actual: readonly number[], forecast: readonly number[]): { wape: number | null; bias: number | null } {
  let abs = 0;
  let signed = 0;
  let total = 0;
  actual.forEach((a, i) => {
    abs += Math.abs(a - forecast[i]);
    signed += forecast[i] - a;
    total += a;
  });
  return total > 0 ? { wape: abs / total, bias: signed / total } : { wape: null, bias: null };
}

/** MASC (G1) of a candidate's versions: the mean over consecutive pairs; null when none scales. */
export function versionMasc(versions: readonly ReadonlyMap<IsoDate, number>[], scale: number | null): number | null {
  const values: number[] = [];
  for (let k = 1; k < versions.length; k += 1) {
    const v = masc(versions[k - 1], versions[k], scale);
    if (v !== null) values.push(v);
  }
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
}

// ── Selection ───────────────────────────────────────────────────────────────

export interface CandidateScore extends ServiceMeasures {
  readonly candidate: BacktestCandidate;
  readonly masc: number | null;
  /** Diagnostics only (BR-03). */
  readonly wape: number | null;
  readonly bias: number | null;
}

export type SelectionReason = 'floor' | 'beatsFloor' | 'mascLimit';

export interface Selection {
  readonly chosen: BacktestCandidate;
  readonly reason: SelectionReason;
  /** Candidates that beat the floor (before the MASC limit). */
  readonly beatsFloor: readonly BacktestCandidate[];
  /** Candidates the MASC limit excluded. */
  readonly overMascLimit: readonly BacktestCandidate[];
}

const fillOf = (s: ServiceMeasures) => s.fillRate ?? 0;

/** BR-04 — at least the floor's fill rate, and better on fill rate or on pallet-weeks. */
export function beatsFloor(c: ServiceMeasures, floor: ServiceMeasures): boolean {
  if (fillOf(c) < fillOf(floor) - EPS) return false;
  return fillOf(c) > fillOf(floor) + EPS || c.palletWeeks < floor.palletWeeks - EPS;
}

/** BR-03 — within the administrator's MASC limit. No limit (null): always. No MASC: not excluded. */
export const withinMascLimit = (c: Pick<CandidateScore, 'masc'>, limit: number | null): boolean =>
  limit === null || c.masc === null || c.masc <= limit + EPS;

/**
 * BR-03, BR-04 — the model for one SKU. SAP's plan is the benchmark and is
 * never chosen (ENG-B66). The floor stays when nothing beats it.
 */
export function selectModel(scores: readonly CandidateScore[], floor: BacktestCandidate, mascLimit: number | null): Selection {
  const f = scores.find((s) => s.candidate === floor);
  if (!f) throw new Error(`selectModel: the floor '${floor}' has no score`);
  const beating = scores.filter((s) => s.candidate !== floor && s.candidate !== 'sapPlan' && beatsFloor(s, f));
  const allowed = beating.filter((s) => withinMascLimit(s, mascLimit));
  const over = beating.filter((s) => !withinMascLimit(s, mascLimit)).map((s) => s.candidate);
  const order = (c: BacktestCandidate) => BACKTEST_CANDIDATES.indexOf(c);
  const best = [...allowed].sort((a, b) => fillOf(b) - fillOf(a) || a.palletWeeks - b.palletWeeks || order(a.candidate) - order(b.candidate))[0];
  return {
    chosen: best ? best.candidate : floor,
    reason: best ? 'beatsFloor' : over.length ? 'mascLimit' : 'floor',
    beatsFloor: beating.map((s) => s.candidate),
    overMascLimit: over,
  };
}

/** How a candidate compares with SAP's plan on fill rate and pallet-weeks. */
export type VersusSap = 'better' | 'worse' | 'equal' | 'mixed';

export function versusSap(c: ServiceMeasures, sap: ServiceMeasures): VersusSap {
  const df = fillOf(c) - fillOf(sap);
  const dp = sap.palletWeeks - c.palletWeeks;
  const fillUp = df > EPS;
  const fillDown = df < -EPS;
  const spaceUp = dp > EPS;
  const spaceDown = dp < -EPS;
  if (!fillDown && !spaceDown && (fillUp || spaceUp)) return 'better';
  if (!fillUp && !spaceUp && (fillDown || spaceDown)) return 'worse';
  if (!fillUp && !fillDown && !spaceUp && !spaceDown) return 'equal';
  return 'mixed';
}

// ── The run ─────────────────────────────────────────────────────────────────

export interface BacktestOrigin {
  readonly weekStart: IsoDate;
  /** The demand events in the weeks this version was the plan in force. */
  readonly events: readonly DemandEvent[];
  /** The Ramadan year when the version's weeks hold Ramadan. */
  readonly ramadan: string | null;
  /** Weeks this version was in force. */
  readonly weeksInForce: number;
}

export interface SkuBacktest {
  readonly skuCode: string;
  readonly name: string;
  readonly brand: Brand;
  readonly skuClass: SkuClass;
  readonly floor: BacktestCandidate;
  /** Every candidate's result, the benchmark (SAP's plan) last. */
  readonly scores: readonly CandidateScore[];
  readonly selection: Selection;
  readonly chosenVersusSap: VersusSap;
  readonly floorVersusSap: VersusSap;
  /** The materials the SKU's parts were replayed on. */
  readonly materials: readonly string[];
}

export type ExclusionReason = 'oem' | 'newSku' | 'discontinued' | 'noHistory';

export interface ExcludedFromBacktest {
  readonly skuCode: string;
  readonly name: string;
  readonly reason: ExclusionReason;
}

/** The material-level replays: every SKU on SAP's plan, on its floor, or on its chosen model. */
export type PortfolioScenario = 'sapPlan' | 'floor' | 'chosen';
export const PORTFOLIO_SCENARIOS: readonly PortfolioScenario[] = ['sapPlan', 'floor', 'chosen'];

export interface MaterialScenario extends ServiceMeasures {
  readonly scenario: PortfolioScenario;
}

export interface MaterialBacktest {
  readonly materialCode: string;
  readonly kind: WarehouseKind;
  readonly leadWeeks: number;
  readonly scenarios: readonly MaterialScenario[];
  readonly floorVersusSap: VersusSap;
  readonly chosenVersusSap: VersusSap;
}

export interface WarehouseScenario {
  readonly kind: WarehouseKind;
  readonly capacityPallets: number | null;
  /** The highest week's pallets of the replayed flows. */
  readonly peakPallets: number;
  /** Σ pallets above capacity over the measured weeks. */
  readonly overCapacityPalletWeeks: number;
}

export interface PortfolioResult extends ServiceMeasures {
  readonly scenario: PortfolioScenario;
  readonly warehouses: readonly WarehouseScenario[];
  /** Fill rate of the weeks whose orders were released under each origin's version. */
  readonly perOrigin: readonly { readonly origin: IsoDate; readonly fillRate: number | null }[];
}

export interface MethodSummary {
  readonly candidate: BacktestCandidate;
  readonly skus: number;
  /** Pooled over the SKUs' lines. */
  readonly fillRate: number | null;
  readonly orderCompleteRate: number | null;
  readonly palletWeeks: number;
  readonly medianMasc: number | null;
  readonly medianWape: number | null;
  /** SKUs this candidate was chosen for (never for SAP's plan). */
  readonly chosenFor: number;
}

export interface MascSpread {
  readonly candidate: BacktestCandidate;
  readonly values: number;
  readonly min: number | null;
  readonly p25: number | null;
  readonly median: number | null;
  readonly p75: number | null;
  readonly max: number | null;
}

export interface ModelBacktestResult {
  readonly asOf: IsoDate;
  readonly origins: readonly BacktestOrigin[];
  /** The replay: first and last week, and the weeks of sales history before the first origin. */
  readonly replay: { readonly from: IsoDate; readonly to: IsoDate; readonly weeks: number; readonly historyFrom: IsoDate | null };
  readonly skus: readonly SkuBacktest[];
  readonly excluded: readonly ExcludedFromBacktest[];
  readonly materials: readonly MaterialBacktest[];
  /** Materials with no source (cannot be ordered) — not replayed. */
  readonly unreplayedMaterials: readonly string[];
  readonly portfolio: readonly PortfolioResult[];
  readonly methods: readonly MethodSummary[];
  readonly mascSpread: readonly MascSpread[];
  /** ENG-D13 — the limit applied; null = not set, not enforced. */
  readonly mascLimit: number | null;
  readonly summary: {
    readonly skusCompared: number;
    readonly chosenBeatsSap: number;
    readonly chosenWorseThanSap: number;
    /** Chosen model with a higher fill rate than SAP's plan (space aside). */
    readonly chosenHigherFillThanSap: number;
    /** Chosen model with fewer pallet-weeks than SAP's plan (fill aside). */
    readonly chosenLessSpaceThanSap: number;
    readonly floorBeatsSap: number;
    readonly materialsCompared: number;
    readonly materialsChosenBeatsSap: number;
    readonly materialsFloorBeatsSap: number;
    readonly chosenCounts: Readonly<Record<BacktestCandidate, number>>;
  };
  readonly mainModel: 'notBuilt' | 'supplied';
}

// ── Preparation (the heavy part, done once per hub date) ────────────────────

interface Hist {
  readonly start: IsoDate;
  readonly qty: number[];
  readonly stockout: boolean[];
}

/** A SKU's weekly history before `before`, contiguous from its first row (as E14-07 reads it). */
function historyBefore(rows: readonly SalesWeek[], before: IsoDate): Hist | null {
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

const nonNeg = (xs: readonly number[]) => xs.map((v) => (v > 0 ? v : 0));

/** Every candidate's forecast per SKU made at one origin (E14-07's methods, as of that day). */
function forecastsAt(
  fgs: readonly FinishedGood[],
  rowsBySku: ReadonlyMap<string, SalesWeek[]>,
  origin: IsoDate,
  fgPlan: BacktestInput['data']['fgPlan'],
  table: readonly RamadanDates[],
  candidatesOf: ReadonlyMap<string, readonly BacktestCandidate[]>,
  mainModel: MainModel | undefined,
): Map<string, Map<BacktestCandidate, number[]>> {
  const H = BACKTEST_HORIZON_WEEKS;
  const weeks = Array.from({ length: H }, (_, i) => addDays(origin, 7 * i));
  // E14-07's levels, to estimate the event index as of the origin (ENG-B70 to B74).
  const prepared = fgs
    .filter((f) => f.oem !== true && !(f.discontinueDate !== undefined && f.discontinueDate <= origin))
    .map((f) => {
      const h = historyBefore(rowsBySku.get(f.skuCode) ?? [], origin);
      return { fg: f, h, clean: h ? fillStockouts(h.qty, h.stockout) : [] };
    });
  const axisStart = prepared.reduce<IsoDate | null>((m, x) => (x.h && (m === null || x.h.start < m) ? x.h.start : m), null) ?? origin;
  const T = Math.max(0, daysBetween(axisStart, origin) / 7);
  const axis = Array.from({ length: T }, (_, t) => addDays(axisStart, 7 * t));
  const offset = (x: (typeof prepared)[number]) => (x.h ? daysBetween(axisStart, x.h.start) / 7 : T);
  const levelSeries = (members: typeof prepared) => {
    const first = members.length ? Math.min(...members.map(offset)) : T;
    const series = new Array<number>(T).fill(0);
    for (const x of members) x.clean.forEach((v, t) => (series[offset(x) + t] += v));
    return { own: series.slice(first), weeks: axis.slice(first) };
  };
  const total = levelSeries(prepared);
  const lead = estimateLead(total.own, total.weeks, table);
  const brandFactors = new Map<Brand, EventFactor[]>();
  for (const b of [...new Set(prepared.map((x) => x.fg.brand))].sort()) {
    const s = levelSeries(prepared.filter((x) => x.fg.brand === b));
    brandFactors.set(b, estimateEventFactors(s.own, s.weeks, lead, table));
  }
  const sapAt = new Map<string, number[]>();
  for (const p of fgPlan) {
    if (p.madeAt !== origin) continue;
    const i = daysBetween(origin, p.weekStart) / 7;
    if (i < 0 || i >= H) continue;
    const row = sapAt.get(p.skuCode) ?? new Array<number>(H).fill(0);
    row[i] = p.quantity;
    sapAt.set(p.skuCode, row);
  }
  const out = new Map<string, Map<BacktestCandidate, number[]>>();
  const indexMemo = new Map<Brand, Map<IsoDate, number>>();
  for (const x of prepared) {
    const wanted = candidatesOf.get(x.fg.skuCode);
    if (!wanted || !x.h) continue;
    const ended = (i: number) => x.fg.discontinueDate !== undefined && weeks[i] >= x.fg.discontinueDate;
    const cut = (f: readonly number[]) => nonNeg(f).map((v, i) => (ended(i) ? 0 : v));
    const factors = brandFactors.get(x.fg.brand) ?? [];
    // The index of a week depends only on the brand's factors: SKUs of a brand share their weeks' values.
    const memo = indexMemo.get(x.fg.brand) ?? new Map<IsoDate, number>();
    indexMemo.set(x.fg.brand, memo);
    const at = (w: IsoDate) => {
      let v = memo.get(w);
      if (v === undefined) memo.set(w, (v = calendarIndex(w, factors, lead, table)));
      return v;
    };
    const histWeeks = x.h.qty.map((_, t) => addDays(x.h!.start, 7 * t));
    const index: CalendarIndex = { history: histWeeks.map(at), horizon: weeks.map(at) };
    // The intermittent methods run on the in-stock weeks only, as E14-07 runs them.
    const inStock = x.h.qty.filter((_, t) => !x.h!.stockout[t]);
    const m = new Map<BacktestCandidate, number[]>();
    for (const c of wanted) {
      if (c === 'comb') m.set(c, cut(comb(x.clean, H, true, index).forecast));
      else if (c === 'theta') m.set(c, cut(theta(x.clean, H, true, index).forecast));
      else if (c === 'sba' || c === 'croston') m.set(c, cut(croston(inStock, H, c === 'sba').forecast));
      else if (c === 'tsb') m.set(c, cut(tsb(inStock, H).forecast));
      else if (c === 'main' && mainModel) {
        const f = mainModel.forecast(x.fg.skuCode, x.clean, H);
        if (f) m.set(c, cut(f.forecast));
      } else if (c === 'sapPlan') m.set(c, sapAt.get(x.fg.skuCode) ?? new Array<number>(H).fill(0));
    }
    out.set(x.fg.skuCode, m);
  }
  // A compared SKU discontinued by this origin forecasts zero under every candidate.
  for (const [sku, wanted] of candidatesOf) {
    if (out.has(sku)) continue;
    out.set(sku, new Map(wanted.map((c) => [c, new Array<number>(H).fill(0)] as const)));
  }
  return out;
}

interface MaterialTerms {
  readonly materialCode: string;
  readonly kind: WarehouseKind;
  readonly leadTimeDays: number;
  readonly moq: number;
  readonly orderMultiple: number;
  readonly palletsPerUnit: number;
  readonly holdingPerUnitWeek: number;
  readonly target: number;
  readonly sapSafetyStock: number;
}

/** Everything the selection needs; computed once per hub date and cost rates. */
export interface PreparedBacktest {
  readonly input: BacktestInput;
  readonly originWeeks: readonly IsoDate[];
  readonly replayWeeks: readonly IsoDate[];
  readonly originIdx: readonly number[];
  readonly historyFrom: IsoDate | null;
  readonly eligible: readonly { readonly fg: FinishedGood; readonly skuClass: SkuClass; readonly floor: BacktestCandidate; readonly candidates: readonly BacktestCandidate[] }[];
  readonly excluded: readonly ExcludedFromBacktest[];
  readonly terms: ReadonlyMap<string, MaterialTerms>;
  readonly unreplayedMaterials: readonly string[];
  /** Per SKU, per candidate: the scores before selection. */
  readonly scores: ReadonlyMap<string, readonly CandidateScore[]>;
  readonly skuMaterials: ReadonlyMap<string, readonly string[]>;
  /** Per SKU, per candidate: the SKU forecast per origin (26 weeks from it). */
  readonly skuVersions: ReadonlyMap<string, ReadonlyMap<BacktestCandidate, readonly (readonly number[])[]>>;
  /** Per SKU not eligible but sold: SAP's plan per origin (new SKUs, ENG-B63) or the actual (OEM, firm orders). */
  readonly fixedVersions: ReadonlyMap<string, readonly (readonly number[])[]>;
  /** Cleaned actual sales per SKU per replay week (and the origin-relative forecast weeks). */
  readonly actualRows: readonly SalesWeek[];
  readonly portfolioFixed: ReadonlyMap<PortfolioScenario, PortfolioRun>;
}

interface PortfolioRun {
  readonly results: ReadonlyMap<string, ReplayResult>;
}

/** The origins the history allows (BR-01, ENG-B80). */
export function backtestOrigins(data: Pick<EngineDataset, 'sales' | 'fgPlan'>, asOf: IsoDate): IsoDate[] {
  const current = mondayOf(asOf);
  const weeks = [...new Set(data.sales.filter((s) => s.weekStart < current).map((s) => s.weekStart))].sort();
  if (weeks.length === 0) return [];
  const firstSale = weeks[0];
  const lastSale = weeks[weeks.length - 1];
  const planOrigins = [...new Set(data.fgPlan.map((p) => p.madeAt))].filter((d) => d < current).sort();
  const earliest = addDays(firstSale, 7 * MIN_HISTORY_WEEKS);
  const first = planOrigins.find((d) => d >= earliest);
  if (!first) return [];
  const planSet = new Set(planOrigins);
  const out: IsoDate[] = [];
  for (let o = first; addDays(o, 7 * (MIN_EVAL_WEEKS - 1)) <= lastSale; o = addDays(o, 7 * ORIGIN_SPACING_WEEKS)) {
    if (planSet.has(o)) out.push(o);
  }
  return out;
}

const quantile = (sorted: readonly number[], p: number): number | null => {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

/** Actual rows, stock-out weeks filled as E14-07 reads them (ENG-B62). */
function cleanedActuals(data: BacktestInput['data'], current: IsoDate): SalesWeek[] {
  const rowsBySku = new Map<string, SalesWeek[]>();
  for (const s of data.sales) rowsBySku.set(s.skuCode, [...(rowsBySku.get(s.skuCode) ?? []), s]);
  const out: SalesWeek[] = [];
  for (const [sku, rows] of [...rowsBySku.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const h = historyBefore(rows, current);
    if (!h) continue;
    fillStockouts(h.qty, h.stockout).forEach((q, t) => out.push({ skuCode: sku, weekStart: addDays(h.start, 7 * t), quantity: q, stockout: false }));
  }
  return out;
}

/** Per material, a series over the replay weeks (0 where none). */
const onWeeks = (series: ReadonlyMap<IsoDate, number> | undefined, weeks: readonly IsoDate[]): number[] => weeks.map((w) => series?.get(w) ?? 0);

/**
 * Material requirement per version: each origin's SKU forecasts exploded
 * through the BOM (E14-03), as arrays over the replay weeks plus the horizon.
 */
function explodeVersions(
  perSku: ReadonlyMap<string, readonly (readonly number[])[]>,
  originWeeks: readonly IsoDate[],
  bom: BacktestInput['data']['bom'],
  axis: readonly IsoDate[],
): Map<string, number[][]> {
  const out = new Map<string, number[][]>();
  originWeeks.forEach((o, k) => {
    const rows: SalesWeek[] = [];
    for (const [sku, versions] of perSku) {
      versions[k].forEach((q, i) => {
        if (q !== 0) rows.push({ skuCode: sku, weekStart: addDays(o, 7 * i), quantity: q, stockout: false });
      });
    }
    for (const [m, series] of grossRequirement(rows, bom)) {
      const list = out.get(m) ?? originWeeks.map(() => new Array<number>(axis.length).fill(0));
      list[k] = onWeeks(series, axis);
      out.set(m, list);
    }
  });
  return out;
}

function replayPortfolio(
  prep: Pick<PreparedBacktest, 'input' | 'originWeeks' | 'replayWeeks' | 'originIdx' | 'terms' | 'actualRows'>,
  perSku: ReadonlyMap<string, readonly (readonly number[])[]>,
): PortfolioRun {
  const { input, originWeeks, replayWeeks, originIdx, terms } = prep;
  const axis = Array.from({ length: replayWeeks.length + BACKTEST_HORIZON_WEEKS }, (_, j) => addDays(replayWeeks[0], 7 * j));
  const versions = explodeVersions(perSku, originWeeks, input.data.bom, axis);
  const actual = grossRequirement(prep.actualRows, input.data.bom);
  const results = new Map<string, ReplayResult>();
  for (const t of [...terms.values()]) {
    const v = versions.get(t.materialCode) ?? originWeeks.map(() => new Array<number>(axis.length).fill(0));
    const item: ReplayItem = {
      materialCode: t.materialCode,
      kind: t.kind,
      weeks: replayWeeks,
      actual: onWeeks(actual.get(t.materialCode), replayWeeks),
      leadTimeDays: t.leadTimeDays,
      moq: t.moq,
      orderMultiple: t.orderMultiple,
      palletsPerUnit: t.palletsPerUnit,
      holdingPerUnitWeek: t.holdingPerUnitWeek,
      target: t.target,
      fallbackSafetyStock: t.sapSafetyStock,
    };
    results.set(t.materialCode, replayItem(item, v, originIdx, input.costs.orderCostIdr));
  }
  return { results };
}

/** REQ-E14-10 — the heavy half: forecasts at every origin and every replay. */
export function prepareBacktest(input: BacktestInput): PreparedBacktest {
  const { data } = input;
  const table = input.ramadanTable ?? RAMADAN_TABLE;
  const current = mondayOf(input.asOf);
  const originWeeks = backtestOrigins(data, input.asOf);
  const lastSale = [...new Set(data.sales.filter((s) => s.weekStart < current).map((s) => s.weekStart))].sort().pop() ?? current;
  const replayWeeks: IsoDate[] = [];
  if (originWeeks.length) for (let w = originWeeks[0]; w <= lastSale; w = addDays(w, 7)) replayWeeks.push(w);
  const originIdx = originWeeks.map((o) => daysBetween(originWeeks[0] ?? o, o) / 7);
  const rowsBySku = new Map<string, SalesWeek[]>();
  for (const s of data.sales) rowsBySku.set(s.skuCode, [...(rowsBySku.get(s.skuCode) ?? []), s]);
  const fgs = [...data.finishedGoods].sort((a, b) => a.skuCode.localeCompare(b.skuCode));
  const firstOrigin = originWeeks[0] ?? current;
  const lastOrigin = originWeeks[originWeeks.length - 1] ?? current;

  // ── Who is compared, and on what.
  const excluded: ExcludedFromBacktest[] = [];
  const eligible: PreparedBacktest['eligible'][number][] = [];
  for (const fg of fgs) {
    if (fg.oem === true) {
      excluded.push({ skuCode: fg.skuCode, name: fg.name, reason: 'oem' });
      continue;
    }
    if (fg.discontinueDate !== undefined && fg.discontinueDate <= firstOrigin) {
      excluded.push({ skuCode: fg.skuCode, name: fg.name, reason: 'discontinued' });
      continue;
    }
    const first = historyBefore(rowsBySku.get(fg.skuCode) ?? [], firstOrigin);
    if (!first) {
      excluded.push({ skuCode: fg.skuCode, name: fg.name, reason: rowsBySku.has(fg.skuCode) ? 'newSku' : 'noHistory' });
      continue;
    }
    if (first.qty.length < MIN_HISTORY_WEEKS) {
      excluded.push({ skuCode: fg.skuCode, name: fg.name, reason: 'newSku' });
      continue;
    }
    // The class at the last origin, by E14-07's rule (ENG-B81).
    const last = historyBefore(rowsBySku.get(fg.skuCode) ?? [], lastOrigin)!;
    const inStock = last.qty.filter((_, t) => !last.stockout[t]);
    const { p, v } = intermittency(inStock.slice(-SLOW_WINDOW_WEEKS));
    const slow = p >= SLOW_INTERVAL;
    const future = fg.discontinueDate !== undefined && fg.discontinueDate > lastOrigin;
    const floor: BacktestCandidate = slow ? (future ? 'tsb' : khChoice(p, v)) : 'comb';
    const alternatives: BacktestCandidate[] = slow ? [floor === 'tsb' ? khChoice(p, v) : 'tsb'] : ['theta'];
    eligible.push({
      fg,
      skuClass: slow ? 'slow' : 'regular',
      floor,
      candidates: ([...(input.mainModel ? ['main'] : []), floor, ...alternatives, 'sapPlan'] as BacktestCandidate[]).sort(
        (a, b) => BACKTEST_CANDIDATES.indexOf(a) - BACKTEST_CANDIDATES.indexOf(b),
      ),
    });
  }

  // ── Forecasts at every origin.
  const candidatesOf = new Map(eligible.map((e) => [e.fg.skuCode, e.candidates] as const));
  const byOrigin = originWeeks.map((o) => forecastsAt(fgs, rowsBySku, o, data.fgPlan, table, candidatesOf, input.mainModel));
  const skuVersions = new Map<string, Map<BacktestCandidate, number[][]>>();
  for (const e of eligible) {
    const m = new Map<BacktestCandidate, number[][]>();
    for (const c of e.candidates) {
      const list = byOrigin.map((f) => f.get(e.fg.skuCode)?.get(c) ?? null);
      if (list.every((x) => x !== null)) m.set(c, list as number[][]);
    }
    skuVersions.set(e.fg.skuCode, m);
  }
  // A candidate that could not forecast at every origin (a main model returning null) is dropped.
  const eligibleFinal = eligible.map((e) => ({ ...e, candidates: e.candidates.filter((c) => skuVersions.get(e.fg.skuCode)!.has(c)) }));

  const actualRows = cleanedActuals(data, current);
  const actualBySku = new Map<string, Map<IsoDate, number>>();
  for (const r of actualRows) {
    const m = actualBySku.get(r.skuCode) ?? new Map<IsoDate, number>();
    m.set(r.weekStart, r.quantity);
    actualBySku.set(r.skuCode, m);
  }

  // SKUs not compared keep what they plan on in every scenario: SAP's plan (new SKUs, ENG-B63), or
  // their firm orders (OEM, ENG-D20 — the actual, as the brand's POs are known).
  const eligibleCodes = new Set(eligibleFinal.map((e) => e.fg.skuCode));
  const planIndex = new Map(data.fgPlan.map((p) => [`${p.madeAt}|${p.skuCode}|${p.weekStart}`, p.quantity] as const));
  const fixedVersions = new Map<string, number[][]>();
  for (const fg of fgs) {
    if (eligibleCodes.has(fg.skuCode) || !rowsBySku.has(fg.skuCode)) continue;
    fixedVersions.set(
      fg.skuCode,
      originWeeks.map((o) =>
        Array.from({ length: BACKTEST_HORIZON_WEEKS }, (_, i) => {
          const w = addDays(o, 7 * i);
          if (fg.oem === true) return actualBySku.get(fg.skuCode)?.get(w) ?? 0;
          return planIndex.get(`${o}|${fg.skuCode}|${w}`) ?? 0;
        }),
      ),
    );
  }

  // ── Material terms (E14-03's primary source, E14-04's tier, E14-05's pallets and value).
  const tiers = defaultTiers(data, firstOrigin, DEFAULT_SAFETY_STOCK_OPTIONS);
  const perPallet = new Map(data.volumes.map((v) => [v.materialCode, v.unitsPerPallet]));
  const value = new Map(data.materialValues.map((v) => [v.materialCode, v.unitValueIdr]));
  const sapSs = new Map(data.sapSafetyStock.map((s) => [s.materialCode, s.quantity]));
  const used = new Set(data.bom.map((b) => b.componentCode));
  const terms = new Map<string, MaterialTerms>();
  const unreplayedMaterials: string[] = [];
  for (const m of [...data.materials].sort((a, b) => a.materialCode.localeCompare(b.materialCode))) {
    if (!used.has(m.materialCode)) continue;
    const src = primarySource(data.sources, m.materialCode);
    if (!src) {
      unreplayedMaterials.push(m.materialCode);
      continue;
    }
    const upp = perPallet.get(m.materialCode) ?? 0;
    const tier = tiers.get(m.materialCode)?.tier ?? 'standard';
    terms.set(m.materialCode, {
      materialCode: m.materialCode,
      kind: m.kind,
      leadTimeDays: src.leadTimeDays,
      moq: src.moq,
      orderMultiple: src.orderMultiple,
      palletsPerUnit: upp > 0 ? 1 / upp : 0,
      holdingPerUnitWeek: ((value.get(m.materialCode) ?? 0) * input.costs.holdingRatePerYear) / 52,
      target: input.targets[tier],
      sapSafetyStock: sapSs.get(m.materialCode) ?? 0,
    });
  }

  // ── Each SKU's part of each material (ENG-B82): its share over the history.
  const axis = Array.from({ length: replayWeeks.length + BACKTEST_HORIZON_WEEKS }, (_, j) => addDays(replayWeeks[0] ?? current, 7 * j));
  const materialActual = grossRequirement(actualRows, data.bom);
  const materialTotal = new Map([...materialActual].map(([m, s]) => [m, [...s.values()].reduce((a, b) => a + b, 0)]));
  const scores = new Map<string, CandidateScore[]>();
  const skuMaterials = new Map<string, string[]>();
  for (const e of eligibleFinal) {
    const sku = e.fg.skuCode;
    const ownRows = actualRows.filter((r) => r.skuCode === sku);
    const ownActual = grossRequirement(ownRows, data.bom);
    const parts = [...ownActual.keys()].filter((m) => terms.has(m)).sort();
    skuMaterials.set(sku, parts);
    const history = actualBySku.get(sku)!;
    const lastHist = [...history.entries()].filter(([w]) => w < lastOrigin).sort((a, b) => a[0].localeCompare(b[0])).map(([, q]) => q);
    const scale = seasonalNaiveScale(lastHist);
    const list: CandidateScore[] = [];
    for (const c of e.candidates) {
      const versions = skuVersions.get(sku)!.get(c)!;
      const exploded = explodeVersions(new Map([[sku, versions]]), originWeeks, data.bom, axis);
      const results = parts.map((m) => {
        const t = terms.get(m)!;
        const own = [...ownActual.get(m)!.values()].reduce((a, b) => a + b, 0);
        const share = (materialTotal.get(m) ?? 0) > 0 ? own / materialTotal.get(m)! : 1;
        const item: ReplayItem = {
          materialCode: m,
          kind: t.kind,
          weeks: replayWeeks,
          actual: onWeeks(ownActual.get(m), replayWeeks),
          leadTimeDays: t.leadTimeDays,
          moq: Math.max(1, Math.round(t.moq * share)),
          orderMultiple: Math.max(1, Math.round(t.orderMultiple * share)),
          palletsPerUnit: t.palletsPerUnit,
          holdingPerUnitWeek: t.holdingPerUnitWeek,
          target: t.target,
          fallbackSafetyStock: Math.round(t.sapSafetyStock * share),
        };
        return replayItem(item, exploded.get(m) ?? originWeeks.map(() => new Array<number>(axis.length).fill(0)), originIdx, input.costs.orderCostIdr);
      });
      // Accuracy over the weeks each version was in force; MASC over consecutive versions.
      const a: number[] = [];
      const f: number[] = [];
      originWeeks.forEach((o, k) => {
        const next = originWeeks[k + 1] ?? addDays(lastSale, 7);
        for (let i = 0; addDays(o, 7 * i) < next && i < BACKTEST_HORIZON_WEEKS; i += 1) {
          const w = addDays(o, 7 * i);
          if (w > lastSale) break;
          a.push(history.get(w) ?? 0);
          f.push(versions[k][i]);
        }
      });
      const maps = originWeeks.map((o, k) => new Map(versions[k].map((q, i) => [addDays(o, 7 * i), q] as const)));
      list.push({ candidate: c, ...skuService(results), masc: versionMasc(maps, scale), ...accuracy(a, f) });
    }
    scores.set(sku, list);
  }

  const base = { input, originWeeks, replayWeeks, originIdx, terms, actualRows };
  const scenarioVersions = (pick: (e: (typeof eligibleFinal)[number]) => BacktestCandidate) => {
    const m = new Map<string, readonly (readonly number[])[]>(fixedVersions);
    for (const e of eligibleFinal) m.set(e.fg.skuCode, skuVersions.get(e.fg.skuCode)!.get(pick(e))!);
    return m;
  };
  const portfolioFixed = new Map<PortfolioScenario, PortfolioRun>([
    ['sapPlan', replayPortfolio(base, scenarioVersions(() => 'sapPlan'))],
    ['floor', replayPortfolio(base, scenarioVersions((e) => e.floor))],
  ]);

  const historyFrom = [...new Set(data.sales.map((s) => s.weekStart))].sort()[0] ?? null;
  return {
    input,
    originWeeks,
    replayWeeks,
    originIdx,
    historyFrom,
    eligible: eligibleFinal,
    excluded,
    terms,
    unreplayedMaterials,
    scores,
    skuMaterials,
    skuVersions,
    fixedVersions,
    actualRows,
    portfolioFixed,
  };
}

// ── Selection and the result (cheap: at read, with the limit in force) ─────

function portfolioResult(prep: PreparedBacktest, scenario: PortfolioScenario, run: PortfolioRun): PortfolioResult {
  const results = [...run.results.values()];
  const N = prep.replayWeeks.length;
  const maxLead = Math.max(0, ...results.map((r) => r.leadWeeks));
  const warehouses: WarehouseScenario[] = (['packaging', 'rawMaterial'] as const).map((kind) => {
    const mine = [...run.results.entries()].filter(([m]) => prep.terms.get(m)!.kind === kind).map(([, r]) => r);
    const cap = prep.input.data.warehouses.find((w) => w.kind === kind)?.capacityPallets ?? null;
    let peak = 0;
    let over = 0;
    for (let t = maxLead; t < N; t += 1) {
      const p = mine.reduce((s, r) => s + r.pallets[t], 0);
      peak = Math.max(peak, p);
      if (cap !== null) over += Math.max(0, p - cap);
    }
    return { kind, capacityPallets: cap, peakPallets: peak, overCapacityPalletWeeks: over };
  });
  // Per origin: the weeks whose orders were released under that origin's version.
  const perOrigin = prep.originWeeks.map((o, k) => {
    let withDemand = 0;
    let full = 0;
    for (const r of results) {
      r.full.forEach((f, t) => {
        if (f === null) return;
        const decided = t - r.leadWeeks;
        const kk = prep.originIdx.reduce((best, idx, i) => (idx <= decided ? i : best), 0);
        if (kk !== k) return;
        withDemand += 1;
        if (f) full += 1;
      });
    }
    return { origin: o, fillRate: withDemand > 0 ? full / withDemand : null };
  });
  const sum = (f: (r: ReplayResult) => number) => results.reduce((s, r) => s + f(r), 0);
  const wd = sum((r) => r.weeksWithDemand);
  const un = sum((r) => r.unitsNeeded);
  return {
    scenario,
    fillRate: wd > 0 ? sum((r) => r.weeksFullyServed) / wd : null,
    orderCompleteRate: null,
    unitFillRate: un > 0 ? sum((r) => r.unitsServed) / un : null,
    palletWeeks: sum((r) => r.palletWeeks),
    counts: { lines: wd, fullLines: sum((r) => r.weeksFullyServed), orderWeeks: 0, completeWeeks: 0 },
    warehouses,
    perOrigin,
  };
}

const materialMeasures = (r: ReplayResult): ServiceMeasures => ({
  fillRate: r.weeksWithDemand > 0 ? r.weeksFullyServed / r.weeksWithDemand : null,
  orderCompleteRate: null,
  unitFillRate: r.unitsNeeded > 0 ? r.unitsServed / r.unitsNeeded : null,
  palletWeeks: r.palletWeeks,
  counts: { lines: r.weeksWithDemand, fullLines: r.weeksFullyServed, orderWeeks: 0, completeWeeks: 0 },
});

/** REQ-E14-10 — selection per SKU under the MASC limit in force (ENG-D13; null = not enforced). */
export function modelBacktest(prep: PreparedBacktest, mascLimit: number | null): ModelBacktestResult {
  const skus: SkuBacktest[] = prep.eligible.map((e) => {
    const scores = prep.scores.get(e.fg.skuCode)!;
    const selection = selectModel(scores, e.floor, mascLimit);
    const pick = (c: BacktestCandidate) => scores.find((s) => s.candidate === c)!;
    const sap = pick('sapPlan');
    return {
      skuCode: e.fg.skuCode,
      name: e.fg.name,
      brand: e.fg.brand,
      skuClass: e.skuClass,
      floor: e.floor,
      scores,
      selection,
      chosenVersusSap: versusSap(pick(selection.chosen), sap),
      floorVersusSap: versusSap(pick(e.floor), sap),
      materials: prep.skuMaterials.get(e.fg.skuCode) ?? [],
    };
  });
  const chosenOf = new Map(skus.map((s) => [s.skuCode, s.selection.chosen] as const));
  const chosenVersions = new Map<string, readonly (readonly number[])[]>(prep.fixedVersions);
  for (const e of prep.eligible) chosenVersions.set(e.fg.skuCode, prep.skuVersions.get(e.fg.skuCode)!.get(chosenOf.get(e.fg.skuCode)!)!);
  const runs = new Map<PortfolioScenario, PortfolioRun>([...prep.portfolioFixed, ['chosen', replayPortfolio(prep, chosenVersions)]]);
  const portfolio = PORTFOLIO_SCENARIOS.map((s) => portfolioResult(prep, s, runs.get(s)!));

  const materials: MaterialBacktest[] = [...prep.terms.values()].map((t) => {
    const of = (s: PortfolioScenario) => materialMeasures(runs.get(s)!.results.get(t.materialCode)!);
    const sap = of('sapPlan');
    return {
      materialCode: t.materialCode,
      kind: t.kind,
      leadWeeks: offsetWeeks(t.leadTimeDays, 0),
      scenarios: PORTFOLIO_SCENARIOS.map((s) => ({ scenario: s, ...of(s) })),
      floorVersusSap: versusSap(of('floor'), sap),
      chosenVersusSap: versusSap(of('chosen'), sap),
    };
  });
  const measured = materials.filter((m) => m.scenarios[0].fillRate !== null);

  const candidatesSeen = BACKTEST_CANDIDATES.filter((c) => skus.some((s) => s.scores.some((x) => x.candidate === c)));
  const median = (xs: number[]) => quantile([...xs].sort((a, b) => a - b), 0.5);
  const methods: MethodSummary[] = candidatesSeen.map((c) => {
    const rows = skus.map((s) => s.scores.find((x) => x.candidate === c)).filter((x): x is CandidateScore => x !== undefined);
    // Pooled over the SKUs' lines and order weeks.
    const lines = rows.reduce((s, r) => s + r.counts.lines, 0);
    const orderWeeks = rows.reduce((s, r) => s + r.counts.orderWeeks, 0);
    return {
      candidate: c,
      skus: rows.length,
      fillRate: lines > 0 ? rows.reduce((s, r) => s + r.counts.fullLines, 0) / lines : null,
      orderCompleteRate: orderWeeks > 0 ? rows.reduce((s, r) => s + r.counts.completeWeeks, 0) / orderWeeks : null,
      palletWeeks: rows.reduce((s, r) => s + r.palletWeeks, 0),
      medianMasc: median(rows.map((r) => r.masc).filter((m): m is number => m !== null)),
      medianWape: median(rows.map((r) => r.wape).filter((m): m is number => m !== null)),
      chosenFor: c === 'sapPlan' ? 0 : skus.filter((s) => s.selection.chosen === c).length,
    };
  });
  const mascSpread: MascSpread[] = candidatesSeen.map((c) => {
    const values = skus
      .map((s) => s.scores.find((x) => x.candidate === c)?.masc)
      .filter((m): m is number => m !== null && m !== undefined)
      .sort((a, b) => a - b);
    return {
      candidate: c,
      values: values.length,
      min: values[0] ?? null,
      p25: quantile(values, 0.25),
      median: quantile(values, 0.5),
      p75: quantile(values, 0.75),
      max: values[values.length - 1] ?? null,
    };
  });

  const origins: BacktestOrigin[] = prep.originWeeks.map((o, k) => {
    const end = k + 1 < prep.originIdx.length ? prep.originIdx[k + 1] : prep.replayWeeks.length;
    const weeks = prep.replayWeeks.slice(prep.originIdx[k], end);
    const events = new Set<DemandEvent>();
    let ramadan: string | null = null;
    for (const w of weeks) {
      const tag = tagWeek(w, 0, prep.input.ramadanTable ?? RAMADAN_TABLE);
      tag.events.forEach((e) => events.add(e));
      if (tag.occurrence.ramadan) ramadan = tag.occurrence.ramadan;
    }
    return { weekStart: o, events: [...events], ramadan, weeksInForce: weeks.length };
  });

  const chosenCounts = Object.fromEntries(BACKTEST_CANDIDATES.map((c) => [c, skus.filter((s) => s.selection.chosen === c).length])) as Record<BacktestCandidate, number>;
  return {
    asOf: prep.input.asOf,
    origins,
    replay: {
      from: prep.replayWeeks[0] ?? prep.input.asOf,
      to: prep.replayWeeks[prep.replayWeeks.length - 1] ?? prep.input.asOf,
      weeks: prep.replayWeeks.length,
      historyFrom: prep.historyFrom,
    },
    skus,
    excluded: prep.excluded,
    materials,
    unreplayedMaterials: prep.unreplayedMaterials,
    portfolio,
    methods,
    mascSpread,
    mascLimit,
    summary: {
      skusCompared: skus.length,
      chosenBeatsSap: skus.filter((s) => s.chosenVersusSap === 'better').length,
      chosenWorseThanSap: skus.filter((s) => s.chosenVersusSap === 'worse').length,
      chosenHigherFillThanSap: skus.filter((s) => {
        const pick = (c: BacktestCandidate) => s.scores.find((x) => x.candidate === c)!;
        return fillOf(pick(s.selection.chosen)) > fillOf(pick('sapPlan')) + EPS;
      }).length,
      chosenLessSpaceThanSap: skus.filter((s) => {
        const pick = (c: BacktestCandidate) => s.scores.find((x) => x.candidate === c)!;
        return pick(s.selection.chosen).palletWeeks < pick('sapPlan').palletWeeks - EPS;
      }).length,
      floorBeatsSap: skus.filter((s) => s.floorVersusSap === 'better').length,
      materialsCompared: measured.length,
      materialsChosenBeatsSap: measured.filter((m) => m.chosenVersusSap === 'better').length,
      materialsFloorBeatsSap: measured.filter((m) => m.floorVersusSap === 'better').length,
      chosenCounts,
    },
    mainModel: prep.input.mainModel ? 'supplied' : 'notBuilt',
  };
}

/**
 * AC-03 — the main-model verdicts the backtest produced, in the shape E14-07's
 * `MainModel.beatsFallback` reads: true only where the main model was chosen.
 */
export function mainModelVerdicts(result: ModelBacktestResult): ReadonlyMap<string, boolean> {
  return new Map(result.skus.map((s) => [s.skuCode, s.selection.chosen === 'main'] as const));
}
