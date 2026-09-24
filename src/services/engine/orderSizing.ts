// ─────────────────────────────────────────────────────────────────────────────
// ORDER SIZING WITHIN MOQ AND WAREHOUSE SPACE — REQ-E14-05 (METHOD-SPEC M5;
// M6 for the change penalty).
//
// Pure functions. The costs, the previous plan and the requirement run are
// ARGUMENTS (X-01, X-05: the administrator owns the rates; the Hub passes the
// values in force). Nothing here reads a clock or a store.
//
// ── THE PROBLEM (M5, BR-01) ─────────────────────────────────────────────────
//   For all materials sharing a warehouse, choose the planned receipt x_it of
//   material i in week t to minimise
//
//     Σ_i,t ( K·[x_it > 0] + h_i·I_it + λ·v_i·|x_it − x_it^prev|·[t inside LT] )
//       + Σ_t p·O_t
//
//   subject to
//     · I_it = I_i,t−1 + SR_it + x_it − GR_it   (stock balance)
//     · I_it ≥ SS_i                              (demand met each week, and
//                                                 the E14-04 safety stock held)
//     · x_it = 0, or x_it ≥ MOQ_i and a whole multiple of m_i
//     · Σ_i v_i·I_it ≤ Cap + O_t, O_t ≥ 0        (owned pallets; overflow rented)
//     · O_t ≤ R                                   (the most rented space, BL-117)
//
//   K = cost per order, h_i = value_i × holding rate ÷ 52, v_i = pallets per
//   unit (1 ÷ units per pallet), p = rented space per pallet-week, λ = the
//   change penalty per pallet changed (BR-03). Stock is counted at the END of
//   the week, the same point E14-03's projected stock and the requirement's
//   worked example use. Warehouses are SEPARATE (ENG-D7): packaging and raw
//   material are planned independently, each against its own capacity.
//
// ── HOW IT IS SOLVED: THE M5 HEURISTIC, NOT HiGHS ───────────────────────────
//   M5 names HiGHS (WebAssembly) as the default solver and the Boonphakdee et
//   al. (2025) heuristic as the alternative. The heuristic is built here; the
//   reason is measured, not assumed (recorded in the build report): HiGHS
//   1.15.3 solved the requirement's worked example exactly under Node, but a
//   random instance of PTI's size (35 materials × 26 weeks with MOQ and
//   integer multiples) hit a 30-second limit without proving optimality — too
//   slow for a plan computed when the page is read, on the browser's one
//   thread — and it would add a 3.5 MB WebAssembly file to the bundle.
//
//   1. SINGLE-ITEM PLANS, EXACT. Each material's plan is found by dynamic
//      programming over (week, cumulative planned receipts). At a week whose
//      stock would fall below the safety stock an order MUST be placed; its
//      candidate sizes are "cover through week j" for every later j, rounded
//      up to the multiple and at least the MOQ. Ordering in a week that does
//      not need it is never cheaper (moving it later lowers stock every week
//      in between) — except to KEEP last run's order inside the lead time,
//      which is offered as its own candidate. With the other materials' pallets
//      held fixed, the rent a material causes is a convex cost of its own
//      stock, so the dynamic program is that material's exact best response.
//   2. JOINT, BY COORDINATE DESCENT. Start from every material's plan without
//      space limits (and, separately, from the interim round-up plan); then,
//      material by material, replace its plan with its best response to the
//      others' pallets, keeping a change only when the TOTAL cost falls. This
//      pushes quantities later / splits lots where rented space costs more
//      than an extra order (Boonphakdee et al., Computation 2025). The cheaper
//      of the two starts is kept, so the result is never worse than the
//      interim round-up on the same costs.
//
// ── THE CAP ON RENTED SPACE (edge case, BL-117) ─────────────────────────────
//   R = owned capacity × the administrator's maximum rented share (X-05). The
//   cap is HARD: plans are compared first on pallet-weeks beyond Cap + R, then
//   on cost — so the engine never rents past R to save money, and with no cap
//   (or a cap that does not bind) every figure is exactly as before. A week
//   still beyond Cap + R after that is a week where NO PLAN FITS: it is shown
//   with its shortfall and the planner's two ways out — rent the shortfall
//   beyond the cap (at the rate), or have deliveries arriving by that week
//   come later (each listed with whether moving it keeps the safety stock).
//   "Unavoidable" marks a week where even the lowest possible stock (each
//   week's need exactly, no MOQ or multiple) is beyond Cap + R.
//
// ── FALLBACKS (BR-02) ───────────────────────────────────────────────────────
//   When the joint calculation cannot run for a warehouse (no capacity record,
//   a material with no pallet conversion, or `joint: false`), each material is
//   sized alone by Wagner–Whitin (1958) on its lot-for-lot net requirement,
//   then rounded up to MOQ and multiple. A material with no value cannot be
//   weighed at all (no holding cost), so it keeps E14-03's interim round-up.
//   Every material and warehouse says which method sized it, and why.
//
// ── WHY EACH ORDER (BR-04) ──────────────────────────────────────────────────
//   At each order the dynamic program knows the cost of every size it could
//   have chosen (with the best plan after it). The recommendation carries the
//   cost it saved against the next-best size, and the constraint that bound
//   it: the MOQ, the order multiple, warehouse space (smaller than the same
//   material would order with unlimited space), the change penalty (kept as
//   last run planned it, inside the lead time), or the ordering-vs-holding
//   balance.
//
// Worked example (REQ-E14-05): 1,000 a week for 3 weeks, K = 500, h = 0.2 →
// one order of 3,000 costs 1,100, two orders 1,200, weekly 1,500. With room
// for 1,500 and rented space at 1.0 a unit-week the single order costs 1,600
// and the two-order plan (1,200) wins. `orderSizing.test.ts` runs it verbatim.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays } from './dates';
import {
  interimOrderSize,
  materialRequirement,
  offsetWeeks,
  type MaterialRequirementOptions,
  type MaterialRequirementRun,
} from './requirement';
import type { EngineDataset, IsoDate, MaterialValue, MaterialVolume, Warehouse, WarehouseKind } from './types';
import type { Uom } from '../sdc/types';

// ── Parameters ──────────────────────────────────────────────────────────────

/** The cost rates (ENG-D6: Finance and the 3PL invoices; placeholders meanwhile). */
export interface SizingCosts {
  /** K — rupiah per order placed. */
  readonly orderCostIdr: number;
  /** Holding cost as a fraction of value per year (0.25 = 25%). */
  readonly holdingRatePerYear: number;
  /** p — rented space, rupiah per pallet per week. */
  readonly rentIdrPerPalletWeek: number;
  /** λ — BR-03, rupiah per pallet by which an order inside the lead time changes. */
  readonly changePenaltyIdrPerPallet: number;
  /**
   * The most rented space the plan may use, as a share of owned capacity
   * (0.25 = up to 25% above capacity; X-05, BL-117). Absent: no cap — every
   * figure is exactly what it was before the cap existed.
   */
  readonly maxRentedShare?: number;
}

const EPS = 1e-6;
/** Coordinate-descent rounds. Each round visits every material once. */
export const MAX_DESCENT_ROUNDS = 25;

/** Round UP to a multiple, guarding float noise (as `interimOrderSize` does). */
const ceilTo = (y: number, step: number): number => Math.ceil(y / step - 1e-9) * step;

// ── One material, as the sizing sees it ─────────────────────────────────────

export interface SizingItem {
  readonly materialCode: string;
  /** Stock at the start of the first week. */
  readonly startStock: number;
  /** Per week index: gross requirement and confirmed receipts (E14-03). */
  readonly gross: readonly number[];
  readonly receipts: readonly number[];
  readonly safetyStock: number;
  readonly moq: number;
  readonly orderMultiple: number;
  /** Whole weeks between release and receipt: the lead time (+ safety lead time). */
  readonly offsetWeeks: number;
  /** v — pallet positions per base unit (1 ÷ units per pallet). */
  readonly palletsPerUnit: number;
  /** h — rupiah per unit per week. */
  readonly holdingPerUnitWeek: number;
  /** Last run's planned receipts per week index (BR-03); absent: no previous plan. */
  readonly previous?: readonly number[];
}

/** The week's pallets held by everything else in the warehouse, and the space terms. */
export interface SpaceTerms {
  readonly capacityPallets: number;
  readonly rentIdrPerPalletWeek: number;
  /**
   * Owned capacity + the most rented space allowed (BL-117). Pallets above it
   * fit nowhere: the plan first minimises them, then the cost (lexicographic,
   * see `better`). Absent: no cap.
   */
  readonly limitPallets?: number;
}

/**
 * BL-117 — the cap on rented space is a HARD limit, not a price: a plan that
 * puts fewer pallet-weeks beyond it always wins, and cost decides only
 * between plans equally beyond it (usually both at zero). Compared as a pair
 * rather than priced with a big number, so no rupiah figure moves when the cap
 * does not bind and no float rounding can reorder two plans (ENG-B55).
 */
interface Scored {
  /** Pallet-weeks beyond owned capacity + the rented-space cap. */
  readonly beyond: number;
  readonly cost: number;
}

const better = (a: Scored, b: Scored): boolean =>
  a.beyond < b.beyond - EPS || (Math.abs(a.beyond - b.beyond) <= EPS && a.cost < b.cost - EPS);

const stepOf = (item: Pick<SizingItem, 'orderMultiple'>) => (item.orderMultiple > 0 ? item.orderMultiple : 1);
/** The smallest order allowed: at least the MOQ, a whole multiple, above zero. */
export const minimumOrder = (item: Pick<SizingItem, 'moq' | 'orderMultiple'>): number =>
  Math.max(stepOf(item), ceilTo(item.moq, stepOf(item)));

/**
 * CN_t — the cumulative planned receipts needed by the END of week t so stock
 * stays at the safety stock: Σ_{s≤t}(GR_s − SR_s) + SS − start stock. The
 * netting's net requirement is positive exactly when planned receipts so far
 * are below it.
 */
export function cumulativeNeed(item: Pick<SizingItem, 'startStock' | 'gross' | 'receipts' | 'safetyStock'>): number[] {
  let c = item.safetyStock - item.startStock;
  return item.gross.map((g, t) => (c += g - (item.receipts[t] ?? 0)));
}

/** End-of-week stock under a plan of planned receipts. */
export function projectedStock(item: Pick<SizingItem, 'startStock' | 'gross' | 'receipts'>, plan: readonly number[]): number[] {
  let s = item.startStock;
  return item.gross.map((g, t) => (s += (item.receipts[t] ?? 0) + (plan[t] ?? 0) - g));
}

/** Is week t inside the lead time (BR-03): an order there should already have been released. */
const insideLeadTime = (item: SizingItem, t: number) => item.previous !== undefined && t < item.offsetWeeks;

/** The change penalty an order of `x` in week t costs against last run's plan. */
export function changePenalty(item: SizingItem, t: number, x: number, lambda: number): number {
  if (!insideLeadTime(item, t)) return 0;
  return lambda * item.palletsPerUnit * Math.abs(x - (item.previous![t] ?? 0));
}

// ── The interim, lot-for-lot and Wagner–Whitin plans ────────────────────────

/** E14-03's interim sizing: each week's shortfall rounded up to the multiple, at least the MOQ. */
export function interimPlan(item: SizingItem): number[] {
  const cn = cumulativeNeed(item);
  let q = 0;
  return cn.map((need) => {
    const x = need - q > EPS ? interimOrderSize(need - q, item.moq, item.orderMultiple) : 0;
    q += x;
    return x;
  });
}

/** The lowest stock any plan can hold: each week's shortfall exactly, no MOQ, no multiple. */
export function lotForLotPlan(item: SizingItem): number[] {
  const cn = cumulativeNeed(item);
  let q = 0;
  return cn.map((need) => {
    const x = Math.max(0, need - q);
    q += x;
    return x;
  });
}

/**
 * BR-02 — the single-material fallback: Wagner–Whitin (1958) on the
 * lot-for-lot net requirement with K and h, then each lot rounded up to the
 * MOQ and multiple (a rounded lot that already covers the next lot's weeks
 * absorbs it).
 *   θ_t = min_{t < s ≤ T} { K + h·Σ_{i=t}^{s−1} (i − t)·N_i + θ_s },  θ_T = 0
 */
export function wagnerWhitinPlan(item: SizingItem, orderCost: number): number[] {
  const n = lotForLotPlan(item);
  const T = n.length;
  const theta = new Array<number>(T + 1).fill(0);
  const next = new Array<number>(T).fill(T);
  for (let t = T - 1; t >= 0; t -= 1) {
    if (n[t] <= EPS) {
      theta[t] = theta[t + 1];
      next[t] = t + 1;
      continue;
    }
    let best = Infinity;
    let hold = 0;
    for (let s = t + 1; s <= T; s += 1) {
      hold += item.holdingPerUnitWeek * (s - 1 - t) * n[s - 1];
      const c = orderCost + hold + theta[s];
      if (c < best - EPS) {
        best = c;
        next[t] = s;
      }
    }
    theta[t] = best;
  }
  const cn = cumulativeNeed(item);
  const plan = new Array<number>(T).fill(0);
  let q = 0;
  for (let t = 0; t < T; ) {
    if (n[t] <= EPS) {
      t += 1;
      continue;
    }
    const s = next[t];
    const target = Math.max(...cn.slice(t, s));
    if (target - q > EPS) {
      plan[t] = interimOrderSize(target - q, item.moq, item.orderMultiple);
      q += plan[t];
    }
    t = s;
  }
  return plan;
}

// ── The exact single-item best response (dynamic program) ───────────────────

export interface OrderOption {
  /** The planned receipt this week. */
  readonly quantity: number;
  /** This week's cost of it plus the cheapest plan after it. */
  readonly total: number;
  /** Pallet-weeks beyond the rented-space cap from this week on, under it (BL-117; 0 with no cap). */
  readonly beyond: number;
}

interface Solver {
  /** The cheapest cost from week t on, given `q` planned so far. */
  readonly best: (t: number, q: number) => number;
  /** Every size the program weighs at (t, q), with its total. */
  readonly options: (t: number, q: number) => OrderOption[];
  /** The cheapest plan from week 0. */
  readonly plan: () => number[];
}

/**
 * The exact plan for ONE material given the pallets everything else holds
 * each week (`others`). Costs: K per order, h per unit-week, the rent this
 * material's stock adds above capacity, and the change penalty.
 */
export function singleItemSolver(
  item: SizingItem,
  others: readonly number[],
  space: SpaceTerms,
  costs: Pick<SizingCosts, 'orderCostIdr' | 'changePenaltyIdrPerPallet'>,
): Solver {
  const T = item.gross.length;
  const cn = cumulativeNeed(item);
  const step = stepOf(item);
  const xmin = minimumOrder(item);
  const limit = space.limitPallets ?? Infinity;
  const weekCost = (t: number, stock: number) => {
    const over = Math.max(0, (others[t] ?? 0) + stock * item.palletsPerUnit - space.capacityPallets);
    return item.holdingPerUnitWeek * stock + space.rentIdrPerPalletWeek * over;
  };
  const weekBeyond = (t: number, stock: number) =>
    limit === Infinity ? 0 : Math.max(0, (others[t] ?? 0) + stock * item.palletsPerUnit - limit);
  const memo = new Map<string, { beyond: number; cost: number; x: number }>();

  const candidates = (t: number, q: number): number[] => {
    const out: number[] = [];
    const add = (x: number) => {
      if (!out.some((y) => Math.abs(y - x) < EPS)) out.push(x);
    };
    const needed = q < cn[t] - EPS;
    if (!needed) add(0);
    if (needed) {
      // Cover through week j, for every j — the largest lot first, so a tie
      // keeps the plan with fewer orders.
      const coverTo: number[] = [];
      let m = -Infinity;
      for (let j = t; j < T; j += 1) coverTo.push((m = Math.max(m, cn[j])));
      for (let j = T - 1; j >= t; j -= 1) add(Math.max(xmin, ceilTo(coverTo[j - t] - q, step)));
    }
    // BR-03: keeping last run's order inside the lead time is always a candidate.
    if (insideLeadTime(item, t)) {
      const prev = item.previous![t] ?? 0;
      if (prev > 0 && q + prev >= cn[t] - EPS) add(prev);
    }
    return out;
  };

  const stepCost = (t: number, q: number, x: number) =>
    (x > 0 ? costs.orderCostIdr : 0) +
    changePenalty(item, t, x, costs.changePenaltyIdrPerPallet) +
    weekCost(t, q + x - cn[t] + item.safetyStock);

  const stepBeyond = (t: number, q: number, x: number) => weekBeyond(t, q + x - cn[t] + item.safetyStock);

  const solve = (t: number, q: number): { beyond: number; cost: number; x: number } => {
    if (t >= T) return { beyond: 0, cost: 0, x: 0 };
    const key = `${t}|${q}`;
    const hit = memo.get(key);
    if (hit) return hit;
    let best = { beyond: Infinity, cost: Infinity, x: 0 };
    for (const x of candidates(t, q)) {
      const next = solve(t + 1, q + x);
      const c = { beyond: stepBeyond(t, q, x) + next.beyond, cost: stepCost(t, q, x) + next.cost, x };
      if (better(c, best)) best = c;
    }
    memo.set(key, best);
    return best;
  };

  return {
    best: (t, q) => solve(t, q).cost,
    options: (t, q) =>
      candidates(t, q).map((x) => {
        const next = solve(t + 1, q + x);
        return { quantity: x, total: stepCost(t, q, x) + next.cost, beyond: stepBeyond(t, q, x) + next.beyond };
      }),
    plan: () => {
      const out: number[] = [];
      let q = 0;
      for (let t = 0; t < T; t += 1) {
        const { x } = solve(t, q);
        out.push(x);
        q += x;
      }
      return out;
    },
  };
}

// ── The joint plan ──────────────────────────────────────────────────────────

/** Pallets per week of one material under a plan. */
export const palletsOf = (item: SizingItem, plan: readonly number[]): number[] =>
  projectedStock(item, plan).map((s) => s * item.palletsPerUnit);

export interface CostBreakdown {
  readonly orders: number;
  readonly orderingIdr: number;
  readonly holdingIdr: number;
  readonly changePenaltyIdr: number;
}

/** A material's own cost under a plan (rent is the warehouse's). */
export function itemCost(item: SizingItem, plan: readonly number[], costs: SizingCosts): CostBreakdown {
  const stock = projectedStock(item, plan);
  const orders = plan.filter((x) => x > 0).length;
  return {
    orders,
    orderingIdr: orders * costs.orderCostIdr,
    holdingIdr: stock.reduce((s, i) => s + item.holdingPerUnitWeek * i, 0),
    changePenaltyIdr: plan.reduce((s, x, t) => s + changePenalty(item, t, x, costs.changePenaltyIdrPerPallet), 0),
  };
}

/** Pallets above capacity each week, given the total pallets. */
export const overflowOf = (pallets: readonly number[], capacity: number): number[] =>
  pallets.map((p) => Math.max(0, p - capacity));

export interface JointResult {
  readonly plans: readonly (readonly number[])[];
  readonly totalIdr: number;
  /** Pallet-weeks beyond owned capacity + the rented-space cap (BL-117; 0 with no cap). */
  readonly beyondPalletWeeks: number;
  readonly rounds: number;
  readonly start: 'unconstrained' | 'interim';
}

/**
 * BR-01 — plan every material of one warehouse together. `fixedPallets` are
 * the pallets each week of materials sized elsewhere (a fallback), which
 * count against the same capacity.
 */
export function jointPlan(
  items: readonly SizingItem[],
  fixedPallets: readonly number[],
  capacityPallets: number,
  costs: SizingCosts,
): JointResult {
  const T = fixedPallets.length;
  const limitPallets = rentedSpaceLimit(capacityPallets, costs);
  const space: SpaceTerms = {
    capacityPallets,
    rentIdrPerPalletWeek: costs.rentIdrPerPalletWeek,
    ...(limitPallets !== null ? { limitPallets } : {}),
  };
  const total = (plans: readonly (readonly number[])[]): Scored => {
    const pallets = [...fixedPallets];
    let c = 0;
    items.forEach((it, i) => {
      palletsOf(it, plans[i]).forEach((p, t) => (pallets[t] += p));
      const b = itemCost(it, plans[i], costs);
      c += b.orderingIdr + b.holdingIdr + b.changePenaltyIdr;
    });
    return {
      beyond: limitPallets === null ? 0 : overflowOf(pallets, limitPallets).reduce((s, o) => s + o, 0),
      cost: c + overflowOf(pallets, capacityPallets).reduce((s, o) => s + o * costs.rentIdrPerPalletWeek, 0),
    };
  };
  const descend = (start: number[][]) => {
    let plans = start;
    let score = total(plans);
    let rounds = 0;
    for (; rounds < MAX_DESCENT_ROUNDS; rounds += 1) {
      let improved = false;
      for (let i = 0; i < items.length; i += 1) {
        const others = [...fixedPallets];
        items.forEach((it, k) => {
          if (k !== i) palletsOf(it, plans[k]).forEach((p, t) => (others[t] += p));
        });
        const candidate = singleItemSolver(items[i], others, space, costs).plan();
        const next = plans.map((p, k) => (k === i ? candidate : p));
        const c = total(next);
        if (better(c, score)) {
          plans = next;
          score = c;
          improved = true;
        }
      }
      if (!improved) break;
    }
    return { plans, score, rounds: rounds + 1 };
  };
  const zero = new Array<number>(T).fill(0);
  const free = descend(items.map((it) => singleItemSolver(it, zero, { capacityPallets: Infinity, rentIdrPerPalletWeek: 0 }, costs).plan()));
  const interim = descend(items.map((it) => interimPlan(it)));
  const pick = better(interim.score, free.score) ? { ...interim, start: 'interim' as const } : { ...free, start: 'unconstrained' as const };
  return { plans: pick.plans, totalIdr: pick.score.cost, beyondPalletWeeks: pick.score.beyond, rounds: pick.rounds, start: pick.start };
}

/** Owned capacity + the rented-space cap, in pallets (BL-117); null with no cap. */
export const rentedSpaceLimit = (capacityPallets: number, costs: Pick<SizingCosts, 'maxRentedShare'>): number | null =>
  costs.maxRentedShare === undefined ? null : capacityPallets + capacityPallets * costs.maxRentedShare;

// ── The run over a material requirement ─────────────────────────────────────

/** Which calculation sized a material (BR-02: the fallback is marked). */
export type SizingMethod = 'joint' | 'wagnerWhitin' | 'interim';

/** The constraint that bound an order (BR-04). */
export type BindingConstraint = 'moq' | 'orderMultiple' | 'warehouse' | 'changePenalty' | 'costBalance' | 'demand';

export interface Recommendation {
  readonly materialCode: string;
  readonly supplierId: string | null;
  /** The week the order is received (a Monday). */
  readonly weekStart: IsoDate;
  readonly releaseWeek: IsoDate;
  readonly lateToRelease: boolean;
  readonly quantity: number;
  readonly pallets: number;
  /** Weeks of need the order covers, counting its own. */
  readonly coverWeeks: number;
  readonly binding: BindingConstraint;
  /**
   * Rupiah this size saves against `alternativeQuantity` (joint sizing only;
   * null for a fallback, or where no other size was possible). When warehouse
   * space bound the order, the alternative is the size unlimited space would
   * have chosen; otherwise it is the next-best size (a tie reads 0).
   */
  readonly savedIdr: number | null;
  readonly alternativeQuantity: number | null;
  /** Inside the supplier lead time (BR-03 applies). */
  readonly insideLeadTime: boolean;
  /** Last run's planned receipt for the same week (null: no previous plan). */
  readonly previousQuantity: number | null;
  readonly changePenaltyIdr: number;
  readonly method: SizingMethod;
}

export interface CostSummary extends CostBreakdown {
  readonly rentedPalletWeeks: number;
  readonly rentIdr: number;
  readonly totalIdr: number;
}

export interface MaterialOrderPlan {
  readonly materialCode: string;
  readonly supplierId: string | null;
  readonly kind: WarehouseKind;
  readonly uom: Uom;
  readonly method: SizingMethod;
  /** Why a fallback sized it (BR-02), e.g. `NO_VALUE`. */
  readonly fallbackReason: string | null;
  readonly unitsPerPallet: number | null;
  readonly unitValueIdr: number | null;
  readonly moq: number;
  readonly orderMultiple: number;
  /** Planned receipts per week index: E14-05, and the interim round-up it replaces. */
  readonly plannedReceipts: readonly number[];
  readonly interimReceipts: readonly number[];
  readonly projectedStock: readonly number[];
  readonly recommendations: readonly Recommendation[];
  readonly before: CostBreakdown;
  readonly after: CostBreakdown;
  /** Edge case: an MOQ larger than the horizon's whole demand — a sourcing issue for the buyer. */
  readonly moqExceedsHorizonDemand: boolean;
}

export interface WarehouseWeek {
  readonly weekStart: IsoDate;
  /** End-of-week pallets under E14-05, and under the interim round-up. */
  readonly pallets: number;
  readonly interimPallets: number;
  /** The lowest any plan can reach: each week's shortfall exactly, no MOQ or multiple. */
  readonly lowestPallets: number;
  /** pallets ÷ owned capacity (1.21 = 121%); null with no capacity record. */
  readonly fill: number | null;
  readonly interimFill: number | null;
  readonly lowestFill: number | null;
  readonly rentedPallets: number;
  readonly interimRentedPallets: number;
  readonly rentIdr: number;
  /** Pallets beyond owned capacity + the rented-space cap: they fit nowhere (BL-117; 0 with no cap). */
  readonly beyondCapPallets: number;
}

/** A delivery that arrives by a shortfall week and could be moved after it (BL-117). */
export interface LaterDelivery {
  readonly materialCode: string;
  readonly supplierId: string | null;
  /** `planned`: an order-plan recommendation; `confirmed`: an open PO line at its confirmed date (E14-03). */
  readonly source: 'planned' | 'confirmed';
  /** The week it is received now (a Monday). */
  readonly weekStart: IsoDate;
  readonly quantity: number;
  readonly pallets: number;
  /**
   * Moved to the week after the shortfall week, the material's stock stays at
   * or above its safety stock every week in between (each delivery judged on
   * its own — moving two of the same material is not judged together).
   */
  readonly keepsSafetyStock: boolean;
}

/**
 * REQ-E14-05 edge case (BL-117): a week where no plan fits the warehouse even
 * with the maximum rented space. Shown with the shortfall and the planner's two
 * ways out, each with what it costs — rent beyond the cap, or a later delivery.
 */
export interface ShortfallWeek {
  readonly weekStart: IsoDate;
  readonly pallets: number;
  /** Owned capacity + the rented-space cap. */
  readonly limitPallets: number;
  /** Pallets beyond the limit. */
  readonly shortfallPallets: number;
  /**
   * Even the lowest any plan could hold (each week's need exactly, no MOQ or
   * multiple) is beyond the limit: no re-sizing of orders can fix it — stock
   * already on hand or already confirmed fills the space.
   */
  readonly unavoidable: boolean;
  /** Option 1 — rent the shortfall beyond the cap, at the rented-space rate. */
  readonly rent: { readonly pallets: number; readonly costIdr: number };
  /** Option 2 — deliver later: what arrives by this week, and how much could move without breaking safety stock. */
  readonly later: {
    readonly deliveries: readonly LaterDelivery[];
    readonly movablePallets: number;
    /** The movable deliveries free at least the shortfall. */
    readonly enough: boolean;
  };
}

export interface WarehousePlan {
  readonly warehouseId: string | null;
  readonly kind: WarehouseKind;
  readonly capacityPallets: number | null;
  readonly method: 'joint' | 'fallback';
  readonly fallbackReason: string | null;
  readonly rounds: number;
  readonly weeks: readonly WarehouseWeek[];
  readonly materials: readonly MaterialOrderPlan[];
  readonly before: CostSummary;
  readonly after: CostSummary;
  /** The most rented space allowed, in pallets (X-05, BL-117); null with no cap or no capacity record. */
  readonly maxRentedPallets: number | null;
  /** Weeks where no plan fits even with the maximum rented space (edge case, BL-117). */
  readonly shortfallWeeks: readonly ShortfallWeek[];
}

export interface OrderPlanRun {
  readonly asOf: IsoDate;
  readonly weeks: readonly IsoDate[];
  readonly method: { readonly name: 'joint lot sizing by coordinate descent'; readonly spec: 'METHOD-SPEC M5, M6'; readonly version: 1 };
  readonly costs: SizingCosts;
  /** A previous plan was supplied, so BR-03's change penalty applied. */
  readonly hasPreviousPlan: boolean;
  readonly warehouses: readonly WarehousePlan[];
}

export interface OrderPlanMaster {
  readonly warehouses: readonly Warehouse[];
  readonly volumes: readonly MaterialVolume[];
  readonly materialValues: readonly MaterialValue[];
}

export interface OrderPlanOptions {
  readonly costs: SizingCosts;
  /** Last run's planned receipts, material → week → quantity (BR-03). */
  readonly previous?: ReadonlyMap<string, ReadonlyMap<IsoDate, number>>;
  /** false: skip the joint calculation — every material by the BR-02 fallback. */
  readonly joint?: boolean;
}

const KINDS: readonly WarehouseKind[] = ['packaging', 'rawMaterial'];

/** How many weeks of need an order of `x` at (t, q) covers. */
function coverWeeksOf(cn: readonly number[], t: number, q: number, x: number): number {
  let j = t;
  while (j + 1 < cn.length && q + x >= cn[j + 1] - EPS) j += 1;
  return j - t + 1;
}

/** REQ-E14-05 over a material requirement run: every warehouse, every material. */
export function orderPlan(run: MaterialRequirementRun, master: OrderPlanMaster, options: OrderPlanOptions): OrderPlanRun {
  const { costs } = options;
  const T = run.weeks.length;
  const perPallet = new Map(master.volumes.map((v) => [v.materialCode, v.unitsPerPallet]));
  const value = new Map(master.materialValues.map((v) => [v.materialCode, v.unitValueIdr]));
  const currentWeek = run.weeks[0];

  const warehouses = KINDS.filter((k) => run.materials.some((m) => m.kind === k)).map((kind): WarehousePlan => {
    const mats = run.materials.filter((m) => m.kind === kind);
    const houses = master.warehouses.filter((w) => w.kind === kind);
    const wh = houses.length === 1 ? houses[0] : null;
    const noVolume = mats.filter((m) => !((perPallet.get(m.materialCode) ?? 0) > 0)).map((m) => m.materialCode);
    const fallbackReason =
      options.joint === false
        ? 'JOINT_OFF'
        : houses.length === 0
          ? `NO_WAREHOUSE: no ${kind} warehouse`
          : houses.length > 1
            ? `MULTIPLE_WAREHOUSES: ${houses.map((h) => h.warehouseId).join(', ')} (the engine is single-plant, ENG-D4)`
            : !(houses[0].capacityPallets > 0)
              ? `NO_CAPACITY: ${houses[0].warehouseId}`
              : noVolume.length > 0
                ? `NO_VOLUME: ${noVolume.join(', ')}`
                : null;
    const capacity = wh && wh.capacityPallets > 0 ? wh.capacityPallets : null;

    const items = mats.map((m): SizingItem => {
      const upp = perPallet.get(m.materialCode);
      const val = value.get(m.materialCode);
      const prev = options.previous?.get(m.materialCode);
      return {
        materialCode: m.materialCode,
        startStock: m.startStock,
        gross: m.weeks.map((w) => w.gross),
        receipts: m.weeks.map((w) => w.receipts),
        safetyStock: m.safetyStock,
        moq: m.moq,
        orderMultiple: m.orderMultiple,
        offsetWeeks: offsetWeeks(m.leadTimeDays, m.safetyLeadTimeDays),
        palletsPerUnit: upp && upp > 0 ? 1 / upp : 0,
        holdingPerUnitWeek: val !== undefined ? (val * costs.holdingRatePerYear) / 52 : 0,
        ...(options.previous ? { previous: run.weeks.map((w) => prev?.get(w) ?? 0) } : {}),
      };
    });

    // Which method sizes each material.
    const methodOf = (i: number): { method: SizingMethod; reason: string | null } => {
      if (!value.has(mats[i].materialCode)) return { method: 'interim', reason: `NO_VALUE: ${mats[i].materialCode}` };
      return fallbackReason === null ? { method: 'joint', reason: null } : { method: 'wagnerWhitin', reason: fallbackReason };
    };
    const methods = items.map((_, i) => methodOf(i));
    const plans: number[][] = items.map((it, i) =>
      methods[i].method === 'interim' ? interimPlan(it) : methods[i].method === 'wagnerWhitin' ? wagnerWhitinPlan(it, costs.orderCostIdr) : [],
    );
    const jointIdx = items.map((_, i) => i).filter((i) => methods[i].method === 'joint');
    const fixed = new Array<number>(T).fill(0);
    items.forEach((it, i) => {
      if (methods[i].method !== 'joint') palletsOf(it, plans[i]).forEach((p, t) => (fixed[t] += p));
    });
    let rounds = 0;
    if (jointIdx.length > 0 && capacity !== null) {
      const res = jointPlan(jointIdx.map((i) => items[i]), fixed, capacity, costs);
      jointIdx.forEach((i, k) => (plans[i] = [...res.plans[k]]));
      rounds = res.rounds;
    }

    const interims = items.map((it) => interimPlan(it));
    const sumPallets = (ps: readonly (readonly number[])[]) => {
      const out = new Array<number>(T).fill(0);
      items.forEach((it, i) => palletsOf(it, ps[i]).forEach((p, t) => (out[t] += p)));
      return out;
    };
    const after = sumPallets(plans);
    const before = sumPallets(interims);
    const lowest = sumPallets(items.map((it) => lotForLotPlan(it)));
    const cap = capacity ?? Infinity;
    const overAfter = overflowOf(after, cap);
    const overBefore = overflowOf(before, cap);
    const fillOf = (p: number) => (capacity !== null ? p / capacity : null);
    const limit = capacity !== null ? rentedSpaceLimit(capacity, costs) : null;
    const beyondAfter = limit === null ? after.map(() => 0) : overflowOf(after, limit);

    const materials = items.map((it, i): MaterialOrderPlan => {
      const m = mats[i];
      const plan = plans[i];
      const cn = cumulativeNeed(it);
      const stock = projectedStock(it, plan);
      const method = methods[i].method;
      // BR-04 — the reason at each order, from the program's own options.
      let solver: Solver | null = null;
      let free: Solver | null = null;
      if (method === 'joint') {
        const others = after.map((p, t) => p - stock[t] * it.palletsPerUnit);
        solver = singleItemSolver(
          it,
          others,
          { capacityPallets: cap, rentIdrPerPalletWeek: costs.rentIdrPerPalletWeek, ...(limit !== null ? { limitPallets: limit } : {}) },
          costs,
        );
        free = singleItemSolver(it, new Array<number>(T).fill(0), { capacityPallets: Infinity, rentIdrPerPalletWeek: 0 }, costs);
      }
      const recs: Recommendation[] = [];
      let q = 0;
      plan.forEach((x, t) => {
        if (x > 0) {
          const inside = t < it.offsetWeeks;
          const prevQty = it.previous ? it.previous[t] : null;
          const shortfall = ceilTo(Math.max(0, cn[t] - q), stepOf(it));
          const cover = coverWeeksOf(cn, t, q, x);
          let saved: number | null = null;
          let alternative: number | null = null;
          let binding: BindingConstraint;
          if (solver && free) {
            const opts = solver.options(t, q);
            const mine = opts.find((o) => Math.abs(o.quantity - x) < EPS);
            const others = opts.filter((o) => Math.abs(o.quantity - x) >= EPS).sort((a, b) => a.total - b.total);
            // What unlimited space would order here: its own cheapest, ties to the larger lot.
            const unconstrained = free.options(t, q).sort((a, b) => a.total - b.total || b.quantity - a.quantity)[0];
            if (inside && prevQty !== null && prevQty > 0 && Math.abs(x - prevQty) < EPS) binding = 'changePenalty';
            else if (shortfall < minimumOrder(it) && Math.abs(x - minimumOrder(it)) < EPS) binding = 'moq';
            else if (unconstrained && unconstrained.quantity > x + EPS) binding = 'warehouse';
            else if (cover > 1) binding = 'costBalance';
            else binding = x > cn[t] - q + EPS ? 'orderMultiple' : 'demand';
            const against =
              binding === 'warehouse' ? opts.find((o) => Math.abs(o.quantity - unconstrained!.quantity) < EPS) : others[0];
            if (mine && against) {
              saved = Math.max(0, against.total - mine.total);
              alternative = against.quantity;
            }
          } else {
            if (shortfall < minimumOrder(it) && Math.abs(x - minimumOrder(it)) < EPS) binding = 'moq';
            else if (cover > 1) binding = 'costBalance';
            else binding = x > cn[t] - q + EPS ? 'orderMultiple' : 'demand';
          }
          const releaseWeek = addDays(run.weeks[t], -7 * it.offsetWeeks);
          recs.push({
            materialCode: m.materialCode,
            supplierId: m.supplierId,
            weekStart: run.weeks[t],
            releaseWeek,
            lateToRelease: releaseWeek < currentWeek,
            quantity: x,
            pallets: x * it.palletsPerUnit,
            coverWeeks: cover,
            binding,
            savedIdr: saved,
            alternativeQuantity: alternative,
            insideLeadTime: inside,
            previousQuantity: prevQty,
            changePenaltyIdr: changePenalty(it, t, x, costs.changePenaltyIdrPerPallet),
            method,
          });
        }
        q += x;
      });
      const totalGross = it.gross.reduce((s, g) => s + g, 0);
      return {
        materialCode: m.materialCode,
        supplierId: m.supplierId,
        kind,
        uom: m.uom,
        method,
        fallbackReason: methods[i].reason,
        unitsPerPallet: perPallet.get(m.materialCode) ?? null,
        unitValueIdr: value.get(m.materialCode) ?? null,
        moq: m.moq,
        orderMultiple: m.orderMultiple,
        plannedReceipts: plan,
        interimReceipts: interims[i],
        projectedStock: stock,
        recommendations: recs,
        before: itemCost(it, interims[i], costs),
        after: itemCost(it, plan, costs),
        moqExceedsHorizonDemand: m.moq > totalGross + EPS,
      };
    });

    const summary = (side: 'before' | 'after', over: readonly number[]): CostSummary => {
      const sum = (f: (b: CostBreakdown) => number) => materials.reduce((s, m) => s + f(m[side]), 0);
      const rentedPalletWeeks = over.reduce((s, o) => s + o, 0);
      const rentIdr = rentedPalletWeeks * costs.rentIdrPerPalletWeek;
      const orderingIdr = sum((b) => b.orderingIdr);
      const holdingIdr = sum((b) => b.holdingIdr);
      const changePenaltyIdr = sum((b) => b.changePenaltyIdr);
      return {
        orders: sum((b) => b.orders),
        orderingIdr,
        holdingIdr,
        changePenaltyIdr,
        rentedPalletWeeks,
        rentIdr,
        totalIdr: orderingIdr + holdingIdr + changePenaltyIdr + rentIdr,
      };
    };

    // BL-117 — weeks beyond owned capacity + the cap, each with the planner's
    // two ways out. A delivery counts when it arrives by that week; moving it
    // to the week after frees its pallets in every week between.
    const shortfallWeeks: ShortfallWeek[] = [];
    if (limit !== null) {
      run.weeks.forEach((w, t) => {
        if (beyondAfter[t] <= EPS) return;
        const deliveries: LaterDelivery[] = [];
        items.forEach((it, i) => {
          const stock = projectedStock(it, plans[i]);
          const keeps = (s: number, qty: number) => stock.slice(s, t + 1).every((v) => v - qty >= it.safetyStock - EPS);
          for (let s = 0; s <= t; s += 1) {
            for (const [source, qty] of [
              ['planned', plans[i][s] ?? 0],
              ['confirmed', it.receipts[s] ?? 0],
            ] as const) {
              if (qty <= EPS) continue;
              deliveries.push({
                materialCode: it.materialCode,
                supplierId: mats[i].supplierId,
                source,
                weekStart: run.weeks[s],
                quantity: qty,
                pallets: qty * it.palletsPerUnit,
                keepsSafetyStock: keeps(s, qty),
              });
            }
          }
        });
        deliveries.sort((a, b) => b.pallets - a.pallets || a.materialCode.localeCompare(b.materialCode) || a.weekStart.localeCompare(b.weekStart));
        const movablePallets = deliveries.filter((d) => d.keepsSafetyStock).reduce((sum, d) => sum + d.pallets, 0);
        shortfallWeeks.push({
          weekStart: w,
          pallets: after[t],
          limitPallets: limit,
          shortfallPallets: beyondAfter[t],
          unavoidable: lowest[t] > limit + EPS,
          rent: { pallets: beyondAfter[t], costIdr: beyondAfter[t] * costs.rentIdrPerPalletWeek },
          later: { deliveries, movablePallets, enough: movablePallets >= beyondAfter[t] - EPS },
        });
      });
    }

    return {
      warehouseId: wh?.warehouseId ?? null,
      kind,
      capacityPallets: capacity,
      method: fallbackReason === null ? 'joint' : 'fallback',
      fallbackReason,
      rounds,
      maxRentedPallets: limit !== null && capacity !== null && costs.maxRentedShare !== undefined ? capacity * costs.maxRentedShare : null,
      shortfallWeeks,
      weeks: run.weeks.map((w, t) => ({
        weekStart: w,
        pallets: after[t],
        interimPallets: before[t],
        lowestPallets: lowest[t],
        fill: fillOf(after[t]),
        interimFill: fillOf(before[t]),
        lowestFill: fillOf(lowest[t]),
        rentedPallets: overAfter[t],
        interimRentedPallets: overBefore[t],
        rentIdr: overAfter[t] * costs.rentIdrPerPalletWeek,
        beyondCapPallets: beyondAfter[t],
      })),
      materials,
      before: summary('before', overBefore),
      after: summary('after', overAfter),
    };
  });

  return {
    asOf: run.asOf,
    weeks: run.weeks,
    method: { name: 'joint lot sizing by coordinate descent', spec: 'METHOD-SPEC M5, M6', version: 1 },
    costs,
    hasPreviousPlan: options.previous !== undefined,
    warehouses,
  };
}

/** E14-05 → E14-03: every material's planned receipts, by week, for the netting to re-run on. */
export function plannedReceiptsOf(plan: OrderPlanRun): Map<string, Map<IsoDate, number>> {
  const out = new Map<string, Map<IsoDate, number>>();
  for (const w of plan.warehouses) {
    for (const m of w.materials) {
      out.set(m.materialCode, new Map(plan.weeks.map((wk, t) => [wk, m.plannedReceipts[t] ?? 0] as const).filter(([, x]) => x > 0)));
    }
  }
  return out;
}

/**
 * The chain E14-03 → E14-05 → E14-03: net on the interim sizing, size every
 * warehouse jointly, then net again on E14-05's planned receipts, so the
 * requirement a planner reads reconciles with the orders E14-05 chose. The
 * interim run is returned too — it is the "before" every comparison reads.
 */
export function sizedRequirement(
  data: EngineDataset,
  requirement: MaterialRequirementOptions,
  sizing: OrderPlanOptions,
): { readonly interim: MaterialRequirementRun; readonly plan: OrderPlanRun; readonly sized: MaterialRequirementRun } {
  const { plannedReceipts: _ignored, ...base } = requirement;
  void _ignored;
  const interim = materialRequirement(data, base);
  const plan = orderPlan(interim, data, sizing);
  const sized = materialRequirement(data, { ...base, plannedReceipts: plannedReceiptsOf(plan) });
  return { interim, plan, sized };
}
