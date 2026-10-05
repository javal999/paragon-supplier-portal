// ─────────────────────────────────────────────────────────────────────────────
// SAFETY STOCK, SAFETY LEAD TIME AND REORDER POINT — REQ-E14-04
// (METHOD-SPEC M3, M7).
//
// Pure functions over the engine input contract. The present, the service
// targets and the percentile are ARGUMENTS (X-01, X-05: the administrator owns
// the values; the Hub passes the ones in force).
//
// ── 1 · THE ERRORS (M3 step 1, BR-01) ───────────────────────────────────────
//   The plan in use is SAP's finished-goods plan (until E14-07). At each past
//   origin o — a Monday on which a plan snapshot was made — it is exploded
//   through the BOM (scrap included, the version valid in each week) to
//   material level and compared with the material requirement of what actually
//   sold, over the risk window of W = ⌈lead time ÷ 7⌉ + R weeks (R = the review
//   period, 1 week by default):
//
//        E_o = Σ_{w = o}^{o + W − 1} ( actual_w − planned_{w | o} )
//
//   Positive E_o is a SHORTFALL (more was needed than planned). An origin is
//   used only when its whole window has happened (every week before the
//   present) and something was planned or needed in it — an origin before a
//   material was ever used carries no information about its error.
//
// ── 2 · THE SAFETY STOCK: A FILL-RATE TARGET, SOLVED EMPIRICALLY (M3, BR-02) ─
//   The target β is a FILL RATE — the share of demand filled from stock
//   (ENG-D5) — not a cycle service level. With the errors as they happened
//   (distribution-free, M3 step 3), the expected units short per replenishment
//   cycle at safety stock SS is
//
//        ESC(SS) = (1/n) Σ_o max(0, E_o − SS)
//
//   and the fill rate is 1 − ESC(SS) ÷ Q, where Q is the expected order
//   quantity per cycle. The safety stock is the SMALLEST SS ≥ 0 with
//
//        ESC(SS) ÷ Q ≤ 1 − β
//
//   ESC is continuous, non-increasing and piecewise linear in SS, so the
//   smallest such SS is found exactly on the segment where ESC crosses
//   (1 − β)·Q, then rounded UP to a whole unit.
//   Q (the expected order quantity per cycle) = the interim order size (at
//   least the MOQ, rounded up to the order multiple) of the mean weekly
//   requirement of the CURRENT plan over the risk window × R — what one review
//   period's order is expected to be. A large MOQ-driven Q lifts the fill rate
//   at a low safety stock, which is why a fill-rate target does not over-buffer
//   where a cycle-service target would (M3, "Choosing the service target").
//
//   With no expected order at all (Q = 0) the condition reads ESC(SS) ≤ 0: the
//   safety stock is the largest shortfall on record.
//
//   For comparison the page and the tests also carry the QUANTILE reading the
//   requirement's worked example uses: the β-quantile of E_o, nearest rank
//   (the value that ⌈β·n⌉ of the n errors are at or below).
//
// ── 3 · TIERS (BR-02, ENG-D5, ENG-D14 open) ─────────────────────────────────
//   Until the Material Planner names the materials in each tier, the default
//   by volume, MARKED as a default: volume = pallets of actual requirement over
//   the last 52 weeks (units ÷ units per pallet, so PCS and KG compare). The
//   top 20% of materials (⌈0.2·n⌉) → the high target (95%); otherwise a SLOW
//   MOVER → the slow target (85%); otherwise the standard target (90%).
//   Slow mover = intermittent: average demand interval (52 ÷ weeks with any
//   requirement) of 4/3 or more — the corrected Syntetos–Boylan cut-off in
//   METHOD-SPEC D3; no requirement at all is a slow mover.
//
// ── 4 · TOO LITTLE HISTORY (BR-05) ──────────────────────────────────────────
//   Fewer than 30 usable origins: SAP's safety stock is used, and marked.
//
// ── 5 · SAFETY LEAD TIME (M7, BR-03) ────────────────────────────────────────
//   Per supplier × material group: the p-quantile (nearest rank; p is the
//   administrator's, 80% by default) of (receipt date − the confirmed date in
//   force when it arrived), in days, over the supplier's receipts in the
//   trailing window (26 weeks). An early receipt is a negative delay; the
//   safety lead time is never below 0. Fewer than 5 receipts: the material
//   group's default — the same quantile over every supplier's receipts in the
//   group — and marked; a group with fewer than 5 too has 0, marked.
//
// ── 6 · REORDER POINT (BR-04) ───────────────────────────────────────────────
//        ROP = expected demand over (lead time + review period) + SS
//   with the expected demand read from the CURRENT plan over the risk window.
//
// Worked examples (REQ-E14-04): the 10 errors at a 90% quantile → 1,500; the
// fill-rate rule on the same errors with Q = 5,000 → 200; delays 0,0,0,1,1,2,
// 2,3,5,9 at 80% → 3 days; ROP 5,000 × 5 + 1,500 = 26,500.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { RequirementSeries } from './bom' */
import { grossRequirement } from './bom';
import { addDays, daysBetween, mondayOf } from './dates';
import { lineHistories } from './lines';
/** @import { SafetyLeadTimeInput, SafetyStockInput } from './requirement' */
import { interimOrderSize, offsetWeeks, planInForce, primarySource, slKey } from './requirement';
/** @import { EngineDataset, EngineMaterial, IsoDate, WarehouseKind } from './types' */
/** @import { Uom } from '../sdc/types' */

// ── Parameters ──────────────────────────────────────────────────────────────

/** ENG-D5 fill-rate targets, as fractions. The administrator owns them (X-05). */
/**
 * @typedef {object} ServiceTargets
 * @property {number} high
 * @property {number} standard
 * @property {number} slow
 */

/** @type {ServiceTargets} */
export const DEFAULT_SERVICE_TARGETS = Object.freeze({ high: 0.95, standard: 0.9, slow: 0.85 });

/** @typedef {keyof ServiceTargets} ServiceTier */

/**
 * @typedef {object} SafetyStockOptions
 * @property {IsoDate} asOf -  The present, as a day.
 * @property {ServiceTargets} targets
 * @property {number} safetyLeadTimePercentile -  BR-03 — the safety-lead-time percentile, as a fraction (0.8).
 * @property {number} reviewWeeks -  The review period, in weeks.
 * @property {number} minOrigins -  BR-05 — fewer usable origins than this: SAP's value.
 * @property {number} minReceipts -  BR-03 edge case — fewer receipts than this: the group default.
 * @property {number} receiptWindowWeeks -  Receipts counted for the safety lead time, trailing weeks.
 * @property {number} highVolumeShare -  BR-02 default tiering: the top share of materials by volume.
 * @property {number} slowMoverAdi -  BR-02 default tiering: slow mover at or above this average demand interval.
 */

/** @type {Omit<SafetyStockOptions, 'asOf'>} */
export const DEFAULT_SAFETY_STOCK_OPTIONS = Object.freeze({
  targets: DEFAULT_SERVICE_TARGETS,
  safetyLeadTimePercentile: 0.8,
  reviewWeeks: 1,
  minOrigins: 30,
  minReceipts: 5,
  receiptWindowWeeks: 26,
  highVolumeShare: 0.2,
  slowMoverAdi: 4 / 3
});

// ── The arithmetic ──────────────────────────────────────────────────────────

/**
 * Nearest-rank quantile: the value ⌈p·n⌉ of the sorted n are at or below. Null for none.
 * @param {readonly number[]} values
 * @param {number} p
 * @returns {number | null}
 */
export function empiricalQuantile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil(p * sorted.length - 1e-9)));
  return sorted[rank - 1];
}

/**
 * ESC(SS) = mean over origins of max(0, E − SS).
 * @param {readonly number[]} errors
 * @param {number} safetyStock
 * @returns {number}
 */
export function expectedShortPerCycle(errors, safetyStock) {
  if (errors.length === 0) return 0;
  return errors.reduce((s, e) => s + Math.max(0, e - safetyStock), 0) / errors.length;
}

/**
 * The fill rate the errors would have had: 1 − ESC(SS) ÷ Q (null without a Q).
 * @param {readonly number[]} errors
 * @param {number} safetyStock
 * @param {number} orderQtyPerCycle
 * @returns {number | null}
 */
export function fillRateAt(errors, safetyStock, orderQtyPerCycle) {
  if (orderQtyPerCycle <= 0) return null;
  return 1 - expectedShortPerCycle(errors, safetyStock) / orderQtyPerCycle;
}

/**
 * The smallest safety stock ≥ 0 whose expected units short per cycle, ÷ the
 * order quantity per cycle, is at most 1 − target (see header §2). Exact on
 * the piecewise-linear ESC, then rounded up to a whole unit.
 * @param {readonly number[]} errors
 * @param {number} orderQtyPerCycle
 * @param {number} target
 * @returns {number}
 */
export function fillRateSafetyStock(errors, orderQtyPerCycle, target) {
  if (errors.length === 0) return 0;
  const allowed = (1 - target) * Math.max(0, orderQtyPerCycle);
  if (expectedShortPerCycle(errors, 0) <= allowed) return 0;
  // ESC is linear between consecutive positive errors. Walk down from the top.
  const n = errors.length;
  const pos = errors.filter((e) => e > 0).sort((a, b) => b - a);
  // For SS in [pos[k+1], pos[k]], ESC(SS) = (Σ_{i≤k} pos[i] − (k+1)·SS) ÷ n.
  let sum = 0;
  for (let k = 0; k < pos.length; k += 1) {
    sum += pos[k];
    const lower = k + 1 < pos.length ? pos[k + 1] : 0;
    const escAtLower = (sum - (k + 1) * lower) / n;
    if (escAtLower > allowed) {
      const ss = (sum - allowed * n) / (k + 1);
      return Math.max(0, Math.ceil(ss - 1e-9));
    }
  }
  return 0; // unreachable: ESC(0) > allowed is caught at k = last
}

/**
 * BR-04 — expected demand over (lead time + review) + safety stock.
 * @param {number} expectedDemandOverRisk
 * @param {number} safetyStock
 * @returns {number}
 */
export const reorderPoint = (expectedDemandOverRisk, safetyStock) =>
  expectedDemandOverRisk + safetyStock;

// ── The errors of the plan in use (M3 step 1) ───────────────────────────────

/**
 * @typedef {object} OriginError
 * @property {IsoDate} origin -  The Monday the plan snapshot was made.
 * @property {number} planned
 * @property {number} actual
 * @property {number} error -  actual − planned: positive is a shortfall.
 */

/**
 * @param {ReadonlyMap<IsoDate, number> | undefined} series
 * @param {IsoDate} from
 * @param {number} weeks
 * @returns {number}
 */
const sumOver = (series, from, weeks) => {
  if (!series) return 0;
  let s = 0;
  for (let i = 0; i < weeks; i += 1) s += series.get(addDays(from, 7 * i)) ?? 0;
  return s;
};

/**
 * The plan snapshot made at `madeAt`, exploded to material level.
 * @param {Pick<EngineDataset, 'fgPlan' | 'bom'>} data
 * @param {IsoDate} madeAt
 * @returns {RequirementSeries}
 */
function explodedPlan(data, madeAt) {
  const rows = data.fgPlan
    .filter((p) => p.madeAt === madeAt)
    .map((p) => ({
      skuCode: p.skuCode,
      weekStart: p.weekStart,
      quantity: p.quantity,
      stockout: false
    }));
  return grossRequirement(rows, data.bom);
}

/**
 * Every material's cumulative plan error at every usable past origin, over a
 * window of `riskWeeks(material)` weeks. The actual requirement is the sales
 * history through the BOM.
 * @param {Pick<EngineDataset, 'fgPlan' | 'bom' | 'sales' | 'materials'>} data
 * @param {IsoDate} asOf
 * @param {(materialCode: string) => number} riskWeeks
 * @returns {Map<string, OriginError[]>}
 */
export function planErrors(data, asOf, riskWeeks) {
  const currentWeek = mondayOf(asOf);
  const actual = grossRequirement(data.sales, data.bom);
  const origins = [...new Set(data.fgPlan.map((p) => p.madeAt))]
    .filter((o) => o < currentWeek)
    .sort();
  const out = /** @type {Map<string, OriginError[]>} */ (
    new Map(data.materials.map((m) => [m.materialCode, []]))
  );
  for (const o of origins) {
    const plan = explodedPlan(data, o);
    for (const m of data.materials) {
      const w = riskWeeks(m.materialCode);
      // The whole window must have happened.
      if (addDays(o, 7 * (w - 1)) >= currentWeek) continue;
      const planned = sumOver(plan.get(m.materialCode), o, w);
      const act = sumOver(actual.get(m.materialCode), o, w);
      if (planned === 0 && act === 0) continue;
      /** @type {NonNullable<ReturnType<typeof out.get>>} */ (out.get(m.materialCode)).push({
        origin: o,
        planned,
        actual: act,
        error: act - planned
      });
    }
  }
  return out;
}

// ── Tiers (BR-02 default) ───────────────────────────────────────────────────

/**
 * @typedef {object} TierAssignment
 * @property {ServiceTier} tier
 * @property {number} volumePallets -  Pallets of actual requirement over the last 52 weeks.
 * @property {number} averageDemandInterval -  52 ÷ weeks with any requirement (Infinity when none).
 * @property {'defaultByVolume'} source -  Always the default until the Material Planner lists tiers (ENG-D14).
 */

/**
 * @param {Pick<EngineDataset, 'sales' | 'bom' | 'materials' | 'volumes'>} data
 * @param {IsoDate} asOf
 * @param {Pick<SafetyStockOptions, 'highVolumeShare' | 'slowMoverAdi'>} options
 * @returns {Map<string, TierAssignment>}
 */
export function defaultTiers(data, asOf, options) {
  const currentWeek = mondayOf(asOf);
  const from = addDays(currentWeek, -52 * 7);
  const actual = grossRequirement(
    data.sales.filter((s) => s.weekStart >= from && s.weekStart < currentWeek),
    data.bom
  );
  const perPallet = new Map(data.volumes.map((v) => [v.materialCode, v.unitsPerPallet]));
  const stats = data.materials.map((m) => {
    const series = actual.get(m.materialCode) ?? /** @type {Map<IsoDate, number>} */ (new Map());
    const units = [...series.values()].reduce((s, q) => s + q, 0);
    const active = [...series.values()].filter((q) => q > 0).length;
    const upp = perPallet.get(m.materialCode) ?? 0;
    return {
      code: m.materialCode,
      volumePallets: upp > 0 ? units / upp : 0,
      averageDemandInterval: active > 0 ? 52 / active : Number.POSITIVE_INFINITY
    };
  });
  const ranked = [...stats].sort(
    (a, b) => b.volumePallets - a.volumePallets || a.code.localeCompare(b.code)
  );
  const topN = Math.ceil(options.highVolumeShare * stats.length - 1e-9);
  const top = new Set(
    ranked
      .slice(0, topN)
      .filter((s) => s.volumePallets > 0)
      .map((s) => s.code)
  );
  return new Map(
    stats.map((s) => [
      s.code,
      {
        tier: top.has(s.code)
          ? 'high'
          : s.averageDemandInterval >= options.slowMoverAdi - 1e-9
            ? 'slow'
            : 'standard',
        volumePallets: s.volumePallets,
        averageDemandInterval: s.averageDemandInterval,
        source: 'defaultByVolume'
      }
    ])
  );
}

// ── Safety lead time (M7, BR-03) ────────────────────────────────────────────

/**
 * @typedef {object} SafetyLeadTime
 * @property {string} supplierId
 * @property {string} materialGroup
 * @property {number} days
 * @property {'supplier' | 'groupDefault'} source
 * @property {number} receipts -  The supplier's own receipts in the window (what the quantile would read).
 * @property {readonly number[]} delays -  The delays it was read from, in days, oldest receipt first.
 */

/**
 * A material's group, or the material itself when the feed carries none.
 * @param {Pick<EngineMaterial, 'materialCode' | 'materialGroup'>} m
 * @returns {string}
 */
export const groupOf = (m) => m.materialGroup ?? m.materialCode;

/**
 * Delay in days of every receipt in the window, per supplier × group.
 * @param {Pick<EngineDataset, 'poLines' | 'scheduleChanges' | 'confirmations' | 'receipts' | 'materials'>} data
 * @param {IsoDate} asOf
 * @param {number} windowWeeks
 * @returns {Map<string, number[]>}
 */
export function receiptDelays(data, asOf, windowWeeks) {
  const group = new Map(data.materials.map((m) => [m.materialCode, groupOf(m)]));
  const from = addDays(asOf, -7 * windowWeeks);
  const out = /** @type {Map<string, number[]>} */ (new Map());
  for (const h of lineHistories(data)) {
    const g = group.get(h.line.materialCode);
    if (g === undefined) continue;
    for (const r of h.receipts) {
      if (r.receivedDate > asOf || r.receivedDate < from) continue;
      // The commitment in force when it arrived: the latest confirmation made by then.
      const inForce = h.confirmations
        .filter((c) => c.confirmedAt.slice(0, 10) <= r.receivedDate)
        .pop();
      if (!inForce) continue;
      const k = `${h.line.supplierId}|${g}`;
      out.set(k, [...(out.get(k) ?? []), daysBetween(inForce.confirmedDate, r.receivedDate)]);
    }
  }
  return out;
}

/**
 * BR-03 — per supplier × group, with the group default where a supplier has too few receipts.
 * @param {ReadonlyMap<string, readonly number[]>} delays
 * @param {readonly { supplierId: string; materialGroup: string }[]} pairs
 * @param {number} percentile
 * @param {number} minReceipts
 * @returns {SafetyLeadTime[]}
 */
export function safetyLeadTimes(delays, pairs, percentile, minReceipts) {
  const pooled = /** @type {Map<string, number[]>} */ (new Map());
  for (const [k, ds] of delays) {
    const g = k.slice(k.indexOf('|') + 1);
    pooled.set(g, [...(pooled.get(g) ?? []), ...ds]);
  }
  /** @param {number | null} q */
  const clamp = (q) => Math.max(0, q ?? 0);
  return pairs.map(({ supplierId, materialGroup }) => {
    const own = delays.get(`${supplierId}|${materialGroup}`) ?? [];
    if (own.length >= minReceipts) {
      return {
        supplierId,
        materialGroup,
        days: clamp(empiricalQuantile(own, percentile)),
        source: 'supplier',
        receipts: own.length,
        delays: own
      };
    }
    const all = pooled.get(materialGroup) ?? [];
    const days = all.length >= minReceipts ? clamp(empiricalQuantile(all, percentile)) : 0;
    return {
      supplierId,
      materialGroup,
      days,
      source: 'groupDefault',
      receipts: own.length,
      delays: own
    };
  });
}

// ── The run over a dataset ──────────────────────────────────────────────────

/**
 * @typedef {object} MaterialSafetyStock
 * @property {string} materialCode
 * @property {WarehouseKind} kind
 * @property {Uom} uom
 * @property {string} materialGroup
 * @property {string | null} supplierId
 * @property {number} leadTimeDays
 * @property {number} riskWeeks -  W = ⌈lead time ÷ 7⌉ + review weeks.
 * @property {ServiceTier} tier
 * @property {TierAssignment['source']} tierSource
 * @property {number} target
 * @property {number} volumePallets
 * @property {number} averageDemandInterval
 * @property {readonly OriginError[]} errors -  The errors behind the figure (AC-03: recalculable from these).
 * @property {IsoDate | null} firstOrigin
 * @property {IsoDate | null} lastOrigin
 * @property {number} orderQtyPerCycle
 * @property {number} engineSafetyStock -  The fill-rate result on the history — computed even where the fallback is used.
 * @property {number | null} quantileSafetyStock -  The β-quantile reading of the same errors, for comparison.
 * @property {number | null} historicalFillRate -  The fill rate the history would have had at the safety stock used.
 * @property {number} safetyStock -  The figure in force.
 * @property {'empiricalFillRate' | 'sapFallback'} method
 * @property {'engine' | 'sap'} source
 * @property {number} sapSafetyStock
 * @property {number} freedUnits -  SAP's safety stock − the figure in force (positive frees space).
 * @property {number | null} sapPallets -  The same three in pallets (null when the material has no volume record).
 * @property {number | null} safetyStockPallets
 * @property {number | null} freedPallets
 * @property {number} safetyLeadTimeDays
 * @property {'supplier' | 'groupDefault' | 'none'} safetyLeadTimeSource
 * @property {number} safetyLeadTimeReceipts
 * @property {number} expectedDemandOverRisk
 * @property {number} reorderPoint
 * @property {boolean} oneSidedErrors -  Every error the same sign: E14-11 raises a bias alarm (edge case).
 * @property {boolean} reliesOnOrderLot The engine's safety stock is zero while an order is expected: the fill-rate
 *   target is met by the MOQ-sized order lot alone. Flagged for the planner to
 *   review rather than floored (owner, 2026-09-23 — a floor of demand over the
 *   safety lead time would double-count the earlier release E14-03 applies).
 */

/**
 * @typedef {object} SafetyStockRun
 * @property {IsoDate} asOf
 * @property {IsoDate | null} planMadeAt
 * @property {{ readonly name: 'empirical fill-rate safety stock'; readonly spec: 'METHOD-SPEC M3, M7'; readonly version: 1 }} method
 * @property {Omit<SafetyStockOptions, 'asOf'>} parameters
 * @property {readonly MaterialSafetyStock[]} materials
 * @property {readonly SafetyLeadTime[]} safetyLeadTimes
 */

/**
 * @param {EngineDataset} data
 * @param {SafetyStockOptions} options
 * @returns {SafetyStockRun}
 */
export function safetyStockRun(data, options) {
  const currentWeek = mondayOf(options.asOf);
  const source = new Map(
    data.materials.map((m) => [m.materialCode, primarySource(data.sources, m.materialCode)])
  );
  /** @param {string} code */
  const risk = (code) => offsetWeeks(source.get(code)?.leadTimeDays ?? 0, 0) + options.reviewWeeks;
  const errors = planErrors(data, options.asOf, risk);
  const tiers = defaultTiers(data, options.asOf, options);
  const planMadeAt = planInForce(data, options.asOf);
  const current = planMadeAt
    ? explodedPlan(data, planMadeAt)
    : /** @type {Map<string, Map<IsoDate, number>>} */ (new Map());
  const sap = new Map(data.sapSafetyStock.map((s) => [s.materialCode, s.quantity]));
  const perPallet = new Map(data.volumes.map((v) => [v.materialCode, v.unitsPerPallet]));

  const delays = receiptDelays(data, options.asOf, options.receiptWindowWeeks);
  const pairs = [
    ...new Map(
      data.sources.map((s) => {
        const m = data.materials.find((x) => x.materialCode === s.materialCode);
        const g = m ? groupOf(m) : s.materialCode;
        return /** @type {const} */ ([
          `${s.supplierId}|${g}`,
          { supplierId: s.supplierId, materialGroup: g }
        ]);
      })
    ).values()
  ].sort(
    (a, b) =>
      a.supplierId.localeCompare(b.supplierId) || a.materialGroup.localeCompare(b.materialGroup)
  );
  const slts = safetyLeadTimes(
    delays,
    pairs,
    options.safetyLeadTimePercentile,
    options.minReceipts
  );
  const sltBy = new Map(slts.map((s) => [`${s.supplierId}|${s.materialGroup}`, s]));

  const materials = [...data.materials]
    .sort((a, b) => a.materialCode.localeCompare(b.materialCode))
    .map(
      /** @returns {MaterialSafetyStock} */ (m) => {
        const src = source.get(m.materialCode) ?? null;
        const w = risk(m.materialCode);
        const errs = errors.get(m.materialCode) ?? [];
        const values = errs.map((e) => e.error);
        const tier = /** @type {TierAssignment} */ (tiers.get(m.materialCode));
        const target = options.targets[tier.tier];
        const expectedDemandOverRisk = sumOver(current.get(m.materialCode), currentWeek, w);
        const orderQtyPerCycle = interimOrderSize(
          (expectedDemandOverRisk / w) * options.reviewWeeks,
          src?.moq ?? 0,
          src?.orderMultiple ?? 1
        );
        const engineSafetyStock = fillRateSafetyStock(values, orderQtyPerCycle, target);
        const enough = errs.length >= options.minOrigins;
        const sapValue = sap.get(m.materialCode) ?? 0;
        const safetyStock = enough ? engineSafetyStock : sapValue;
        const upp = perPallet.get(m.materialCode);
        const slt = src ? sltBy.get(`${src.supplierId}|${groupOf(m)}`) : undefined;
        return {
          materialCode: m.materialCode,
          kind: m.kind,
          uom: m.uom,
          materialGroup: groupOf(m),
          supplierId: src?.supplierId ?? null,
          leadTimeDays: src?.leadTimeDays ?? 0,
          riskWeeks: w,
          tier: tier.tier,
          tierSource: tier.source,
          target,
          volumePallets: tier.volumePallets,
          averageDemandInterval: tier.averageDemandInterval,
          errors: errs,
          firstOrigin: errs[0]?.origin ?? null,
          lastOrigin: errs[errs.length - 1]?.origin ?? null,
          orderQtyPerCycle,
          engineSafetyStock,
          quantileSafetyStock:
            values.length > 0
              ? Math.max(
                  0,
                  /** @type {NonNullable<ReturnType<typeof empiricalQuantile>>} */ (
                    empiricalQuantile(values, target)
                  )
                )
              : null,
          historicalFillRate: fillRateAt(values, safetyStock, orderQtyPerCycle),
          safetyStock,
          method: enough ? 'empiricalFillRate' : 'sapFallback',
          source: enough ? 'engine' : 'sap',
          sapSafetyStock: sapValue,
          freedUnits: sapValue - safetyStock,
          sapPallets: upp ? sapValue / upp : null,
          safetyStockPallets: upp ? safetyStock / upp : null,
          freedPallets: upp ? (sapValue - safetyStock) / upp : null,
          safetyLeadTimeDays: slt?.days ?? 0,
          safetyLeadTimeSource: slt?.source ?? 'none',
          safetyLeadTimeReceipts: slt?.receipts ?? 0,
          expectedDemandOverRisk,
          reorderPoint: reorderPoint(expectedDemandOverRisk, safetyStock),
          oneSidedErrors:
            values.length > 0 && (values.every((e) => e > 0) || values.every((e) => e < 0)),
          reliesOnOrderLot: enough && safetyStock === 0 && orderQtyPerCycle > 0
        };
      }
    );

  const { asOf: _asOf, ...parameters } = options;
  void _asOf;
  return {
    asOf: options.asOf,
    planMadeAt,
    method: { name: 'empirical fill-rate safety stock', spec: 'METHOD-SPEC M3, M7', version: 1 },
    parameters,
    materials,
    safetyLeadTimes: slts
  };
}

/**
 * E14-04 → E14-03: the safety stock and safety lead time the netting reads.
 * @param {SafetyStockRun} run
 * @returns {{ safetyStock: Map<string, SafetyStockInput>; safetyLeadTime: Map<string, SafetyLeadTimeInput>; }}
 */
export function requirementInputs(run) {
  const safetyStock = /** @type {Map<string, SafetyStockInput>} */ (new Map());
  const safetyLeadTime = /** @type {Map<string, SafetyLeadTimeInput>} */ (new Map());
  for (const m of run.materials) {
    safetyStock.set(m.materialCode, { quantity: m.safetyStock, source: m.source });
    if (m.supplierId) {
      safetyLeadTime.set(slKey(m.supplierId, m.materialCode), {
        days: m.safetyLeadTimeDays,
        source: m.safetyLeadTimeSource
      });
    }
  }
  return { safetyStock, safetyLeadTime };
}

// ── BR-06 · the change since the last run (BL-116) ──────────────────────────
//
// "Safety stock and ROP are recalculated each run, and the change from the
// last run is shown." The engine computes at read on the hub clock and stores
// no run (X-01, X-02 by recomputation), so THE LAST RUN IS THIS SAME PURE
// FUNCTION AT THE PREVIOUS RUN DATE OF THE CADENCE (X-04; ENG-B52):
//   · packaging runs weekly — the last run is 7 days before;
//   · raw material runs monthly — the last run is 28 days before (four weekly
//     buckets: the engine is bucketed by week, so a calendar month would land
//     on a different weekday each time and move the bucket boundaries).
// ⚠️ Recomputed, not stored — the same trade ENG-B17 made for E14-05's
// previous plan: a receipt or confirmation the dataset gained since then is
// not unwound, and an administrator's target change is not seen (both runs
// use the values in force). The previous run is the one the last run date's
// inputs would give on today's record of them.
//
// The CAUSE is read off the two runs' own inputs, per material — never
// inferred from the size of the change. SS = f(errors, Q, target) on the
// engine method, or SAP's value on the fallback; ROP = SS + expected demand
// over the risk window. So:
//   history   — the method switched (enough history reached, or lost)
//   tier      — the default tier moved (volume ranking or slow-mover test)
//   target    — same tier, a different fill-rate target
//   errors    — past plans entered or left the error history, or one changed
//   orderLot  — the expected order per cycle (Q) changed
//   window    — the risk window (lead time + review) changed
//   sapValue  — on the fallback both times, SAP's value changed
//   plan      — ROP only: the expected demand over the window changed
//   new       — the material was not in the last run
// A change is a change in WHOLE UNITS (the figures are shown rounded); a
// material whose figures did not move lists no cause, even if an input did.

/**
 * @typedef {| 'historyReached'
 *   | 'historyLost'
 *   | 'tier'
 *   | 'target'
 *   | 'errors'
 *   | 'orderLot'
 *   | 'window'
 *   | 'sapValue'
 *   | 'plan'
 *   | 'new'} SafetyStockChangeCause
 */

/**
 * Days back to the last run, per stream (X-04 cadence; ENG-B52).
 * @type {Readonly<Record<WarehouseKind, number>>}
 */
export const RUN_INTERVAL_DAYS = Object.freeze({ packaging: 7, rawMaterial: 28 });

/**
 * The previous run date of a stream's cadence.
 * @param {WarehouseKind} kind
 * @param {IsoDate} asOf
 * @returns {IsoDate}
 */
export const previousRunDate = (kind, asOf) => addDays(asOf, -RUN_INTERVAL_DAYS[kind]);

/**
 * @typedef {object} SafetyStockChange
 * @property {IsoDate} previousAsOf
 * @property {Pick< MaterialSafetyStock, 'safetyStock' | 'reorderPoint' | 'tier' | 'target' | 'orderQtyPerCycle' | 'riskWeeks' | 'source' | 'expectedDemandOverRisk' > | null} previous -  The last run's figures (null: the material was not in it).
 * @property {number} safetyStockDelta -  Now − last run, in whole units (0 when unchanged).
 * @property {number} reorderPointDelta
 * @property {number} originsAdded -  Past plans that entered, and left, the error history since the last run.
 * @property {number} originsDropped
 * @property {readonly SafetyStockChangeCause[]} causes -  Why, in the order above; empty when neither figure moved.
 */

/**
 * BR-06 — each material's change against the last run of its own stream.
 * @param {SafetyStockRun} current
 * @param {Readonly<Record<WarehouseKind, SafetyStockRun>>} previousByKind
 * @returns {Map<string, SafetyStockChange>}
 */
export function safetyStockChanges(current, previousByKind) {
  const out = /** @type {Map<string, SafetyStockChange>} */ (new Map());
  for (const m of current.materials) {
    const prevRun = previousByKind[m.kind];
    const p = prevRun.materials.find((x) => x.materialCode === m.materialCode) ?? null;
    if (!p) {
      out.set(m.materialCode, {
        previousAsOf: prevRun.asOf,
        previous: null,
        safetyStockDelta: Math.round(m.safetyStock),
        reorderPointDelta: Math.round(m.reorderPoint),
        originsAdded: m.errors.length,
        originsDropped: 0,
        causes: ['new']
      });
      continue;
    }
    const ssDelta = Math.round(m.safetyStock) - Math.round(p.safetyStock);
    const ropDelta = Math.round(m.reorderPoint) - Math.round(p.reorderPoint);
    const before = new Map(p.errors.map((e) => [e.origin, e.error]));
    const now = new Map(m.errors.map((e) => [e.origin, e.error]));
    const originsAdded = [...now.keys()].filter((o) => !before.has(o)).length;
    const originsDropped = [...before.keys()].filter((o) => !now.has(o)).length;
    const errorsMoved =
      originsAdded > 0 || originsDropped > 0 || [...now].some(([o, e]) => before.get(o) !== e);

    /** @type {SafetyStockChangeCause[]} */
    const ssCauses = [];
    if (ssDelta !== 0) {
      if (p.source !== m.source)
        ssCauses.push(m.source === 'engine' ? 'historyReached' : 'historyLost');
      else if (m.source === 'sap') {
        if (p.sapSafetyStock !== m.sapSafetyStock) ssCauses.push('sapValue');
      } else {
        if (p.tier !== m.tier) ssCauses.push('tier');
        else if (p.target !== m.target) ssCauses.push('target');
        if (errorsMoved) ssCauses.push('errors');
        if (p.orderQtyPerCycle !== m.orderQtyPerCycle) ssCauses.push('orderLot');
        if (p.riskWeeks !== m.riskWeeks) ssCauses.push('window');
      }
    }
    const causes = [...ssCauses];
    if (
      ropDelta !== 0 &&
      Math.round(p.expectedDemandOverRisk) !== Math.round(m.expectedDemandOverRisk)
    ) {
      if (p.riskWeeks !== m.riskWeeks && !causes.includes('window')) causes.push('window');
      causes.push('plan');
    }
    out.set(m.materialCode, {
      previousAsOf: prevRun.asOf,
      previous: {
        safetyStock: p.safetyStock,
        reorderPoint: p.reorderPoint,
        tier: p.tier,
        target: p.target,
        orderQtyPerCycle: p.orderQtyPerCycle,
        riskWeeks: p.riskWeeks,
        source: p.source,
        expectedDemandOverRisk: p.expectedDemandOverRisk
      },
      safetyStockDelta: ssDelta,
      reorderPointDelta: ropDelta,
      originsAdded,
      originsDropped,
      causes
    });
  }
  return out;
}
