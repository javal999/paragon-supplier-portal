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

import { grossRequirement, type RequirementSeries } from './bom';
import { addDays, daysBetween, mondayOf } from './dates';
import { lineHistories } from './lines';
import { interimOrderSize, offsetWeeks, planInForce, primarySource, slKey, type SafetyLeadTimeInput, type SafetyStockInput } from './requirement';
import type { EngineDataset, EngineMaterial, IsoDate, WarehouseKind } from './types';
import type { Uom } from '../sdc/types';

// ── Parameters ──────────────────────────────────────────────────────────────

/** ENG-D5 fill-rate targets, as fractions. The administrator owns them (X-05). */
export interface ServiceTargets {
  readonly high: number;
  readonly standard: number;
  readonly slow: number;
}

export const DEFAULT_SERVICE_TARGETS: ServiceTargets = Object.freeze({ high: 0.95, standard: 0.9, slow: 0.85 });

export type ServiceTier = keyof ServiceTargets;

export interface SafetyStockOptions {
  /** The present, as a day. */
  readonly asOf: IsoDate;
  readonly targets: ServiceTargets;
  /** BR-03 — the safety-lead-time percentile, as a fraction (0.8). */
  readonly safetyLeadTimePercentile: number;
  /** The review period, in weeks. */
  readonly reviewWeeks: number;
  /** BR-05 — fewer usable origins than this: SAP's value. */
  readonly minOrigins: number;
  /** BR-03 edge case — fewer receipts than this: the group default. */
  readonly minReceipts: number;
  /** Receipts counted for the safety lead time, trailing weeks. */
  readonly receiptWindowWeeks: number;
  /** BR-02 default tiering: the top share of materials by volume. */
  readonly highVolumeShare: number;
  /** BR-02 default tiering: slow mover at or above this average demand interval. */
  readonly slowMoverAdi: number;
}

export const DEFAULT_SAFETY_STOCK_OPTIONS: Omit<SafetyStockOptions, 'asOf'> = Object.freeze({
  targets: DEFAULT_SERVICE_TARGETS,
  safetyLeadTimePercentile: 0.8,
  reviewWeeks: 1,
  minOrigins: 30,
  minReceipts: 5,
  receiptWindowWeeks: 26,
  highVolumeShare: 0.2,
  slowMoverAdi: 4 / 3,
});

// ── The arithmetic ──────────────────────────────────────────────────────────

/** Nearest-rank quantile: the value ⌈p·n⌉ of the sorted n are at or below. Null for none. */
export function empiricalQuantile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil(p * sorted.length - 1e-9)));
  return sorted[rank - 1];
}

/** ESC(SS) = mean over origins of max(0, E − SS). */
export function expectedShortPerCycle(errors: readonly number[], safetyStock: number): number {
  if (errors.length === 0) return 0;
  return errors.reduce((s, e) => s + Math.max(0, e - safetyStock), 0) / errors.length;
}

/** The fill rate the errors would have had: 1 − ESC(SS) ÷ Q (null without a Q). */
export function fillRateAt(errors: readonly number[], safetyStock: number, orderQtyPerCycle: number): number | null {
  if (orderQtyPerCycle <= 0) return null;
  return 1 - expectedShortPerCycle(errors, safetyStock) / orderQtyPerCycle;
}

/**
 * The smallest safety stock ≥ 0 whose expected units short per cycle, ÷ the
 * order quantity per cycle, is at most 1 − target (see header §2). Exact on
 * the piecewise-linear ESC, then rounded up to a whole unit.
 */
export function fillRateSafetyStock(errors: readonly number[], orderQtyPerCycle: number, target: number): number {
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

/** BR-04 — expected demand over (lead time + review) + safety stock. */
export const reorderPoint = (expectedDemandOverRisk: number, safetyStock: number): number => expectedDemandOverRisk + safetyStock;

// ── The errors of the plan in use (M3 step 1) ───────────────────────────────

export interface OriginError {
  /** The Monday the plan snapshot was made. */
  readonly origin: IsoDate;
  readonly planned: number;
  readonly actual: number;
  /** actual − planned: positive is a shortfall. */
  readonly error: number;
}

const sumOver = (series: ReadonlyMap<IsoDate, number> | undefined, from: IsoDate, weeks: number): number => {
  if (!series) return 0;
  let s = 0;
  for (let i = 0; i < weeks; i += 1) s += series.get(addDays(from, 7 * i)) ?? 0;
  return s;
};

/** The plan snapshot made at `madeAt`, exploded to material level. */
function explodedPlan(data: Pick<EngineDataset, 'fgPlan' | 'bom'>, madeAt: IsoDate): RequirementSeries {
  const rows = data.fgPlan
    .filter((p) => p.madeAt === madeAt)
    .map((p) => ({ skuCode: p.skuCode, weekStart: p.weekStart, quantity: p.quantity, stockout: false }));
  return grossRequirement(rows, data.bom);
}

/**
 * Every material's cumulative plan error at every usable past origin, over a
 * window of `riskWeeks(material)` weeks. The actual requirement is the sales
 * history through the BOM.
 */
export function planErrors(
  data: Pick<EngineDataset, 'fgPlan' | 'bom' | 'sales' | 'materials'>,
  asOf: IsoDate,
  riskWeeks: (materialCode: string) => number,
): Map<string, OriginError[]> {
  const currentWeek = mondayOf(asOf);
  const actual = grossRequirement(data.sales, data.bom);
  const origins = [...new Set(data.fgPlan.map((p) => p.madeAt))].filter((o) => o < currentWeek).sort();
  const out = new Map<string, OriginError[]>(data.materials.map((m) => [m.materialCode, []]));
  for (const o of origins) {
    const plan = explodedPlan(data, o);
    for (const m of data.materials) {
      const w = riskWeeks(m.materialCode);
      // The whole window must have happened.
      if (addDays(o, 7 * (w - 1)) >= currentWeek) continue;
      const planned = sumOver(plan.get(m.materialCode), o, w);
      const act = sumOver(actual.get(m.materialCode), o, w);
      if (planned === 0 && act === 0) continue;
      out.get(m.materialCode)!.push({ origin: o, planned, actual: act, error: act - planned });
    }
  }
  return out;
}

// ── Tiers (BR-02 default) ───────────────────────────────────────────────────

export interface TierAssignment {
  readonly tier: ServiceTier;
  /** Pallets of actual requirement over the last 52 weeks. */
  readonly volumePallets: number;
  /** 52 ÷ weeks with any requirement (Infinity when none). */
  readonly averageDemandInterval: number;
  /** Always the default until the Material Planner lists tiers (ENG-D14). */
  readonly source: 'defaultByVolume';
}

export function defaultTiers(
  data: Pick<EngineDataset, 'sales' | 'bom' | 'materials' | 'volumes'>,
  asOf: IsoDate,
  options: Pick<SafetyStockOptions, 'highVolumeShare' | 'slowMoverAdi'>,
): Map<string, TierAssignment> {
  const currentWeek = mondayOf(asOf);
  const from = addDays(currentWeek, -52 * 7);
  const actual = grossRequirement(
    data.sales.filter((s) => s.weekStart >= from && s.weekStart < currentWeek),
    data.bom,
  );
  const perPallet = new Map(data.volumes.map((v) => [v.materialCode, v.unitsPerPallet]));
  const stats = data.materials.map((m) => {
    const series = actual.get(m.materialCode) ?? new Map<IsoDate, number>();
    const units = [...series.values()].reduce((s, q) => s + q, 0);
    const active = [...series.values()].filter((q) => q > 0).length;
    const upp = perPallet.get(m.materialCode) ?? 0;
    return {
      code: m.materialCode,
      volumePallets: upp > 0 ? units / upp : 0,
      averageDemandInterval: active > 0 ? 52 / active : Number.POSITIVE_INFINITY,
    };
  });
  const ranked = [...stats].sort((a, b) => b.volumePallets - a.volumePallets || a.code.localeCompare(b.code));
  const topN = Math.ceil(options.highVolumeShare * stats.length - 1e-9);
  const top = new Set(ranked.slice(0, topN).filter((s) => s.volumePallets > 0).map((s) => s.code));
  return new Map(
    stats.map((s) => [
      s.code,
      {
        tier: top.has(s.code) ? 'high' : s.averageDemandInterval >= options.slowMoverAdi - 1e-9 ? 'slow' : 'standard',
        volumePallets: s.volumePallets,
        averageDemandInterval: s.averageDemandInterval,
        source: 'defaultByVolume',
      },
    ]),
  );
}

// ── Safety lead time (M7, BR-03) ────────────────────────────────────────────

export interface SafetyLeadTime {
  readonly supplierId: string;
  readonly materialGroup: string;
  readonly days: number;
  readonly source: 'supplier' | 'groupDefault';
  /** The supplier's own receipts in the window (what the quantile would read). */
  readonly receipts: number;
  /** The delays it was read from, in days, oldest receipt first. */
  readonly delays: readonly number[];
}

/** A material's group, or the material itself when the feed carries none. */
export const groupOf = (m: Pick<EngineMaterial, 'materialCode' | 'materialGroup'>): string => m.materialGroup ?? m.materialCode;

/** Delay in days of every receipt in the window, per supplier × group. */
export function receiptDelays(
  data: Pick<EngineDataset, 'poLines' | 'scheduleChanges' | 'confirmations' | 'receipts' | 'materials'>,
  asOf: IsoDate,
  windowWeeks: number,
): Map<string, number[]> {
  const group = new Map(data.materials.map((m) => [m.materialCode, groupOf(m)]));
  const from = addDays(asOf, -7 * windowWeeks);
  const out = new Map<string, number[]>();
  for (const h of lineHistories(data)) {
    const g = group.get(h.line.materialCode);
    if (g === undefined) continue;
    for (const r of h.receipts) {
      if (r.receivedDate > asOf || r.receivedDate < from) continue;
      // The commitment in force when it arrived: the latest confirmation made by then.
      const inForce = h.confirmations.filter((c) => c.confirmedAt.slice(0, 10) <= r.receivedDate).pop();
      if (!inForce) continue;
      const k = `${h.line.supplierId}|${g}`;
      out.set(k, [...(out.get(k) ?? []), daysBetween(inForce.confirmedDate, r.receivedDate)]);
    }
  }
  return out;
}

/** BR-03 — per supplier × group, with the group default where a supplier has too few receipts. */
export function safetyLeadTimes(
  delays: ReadonlyMap<string, readonly number[]>,
  pairs: readonly { supplierId: string; materialGroup: string }[],
  percentile: number,
  minReceipts: number,
): SafetyLeadTime[] {
  const pooled = new Map<string, number[]>();
  for (const [k, ds] of delays) {
    const g = k.slice(k.indexOf('|') + 1);
    pooled.set(g, [...(pooled.get(g) ?? []), ...ds]);
  }
  const clamp = (q: number | null) => Math.max(0, q ?? 0);
  return pairs.map(({ supplierId, materialGroup }) => {
    const own = delays.get(`${supplierId}|${materialGroup}`) ?? [];
    if (own.length >= minReceipts) {
      return { supplierId, materialGroup, days: clamp(empiricalQuantile(own, percentile)), source: 'supplier', receipts: own.length, delays: own };
    }
    const all = pooled.get(materialGroup) ?? [];
    const days = all.length >= minReceipts ? clamp(empiricalQuantile(all, percentile)) : 0;
    return { supplierId, materialGroup, days, source: 'groupDefault', receipts: own.length, delays: own };
  });
}

// ── The run over a dataset ──────────────────────────────────────────────────

export interface MaterialSafetyStock {
  readonly materialCode: string;
  readonly kind: WarehouseKind;
  readonly uom: Uom;
  readonly materialGroup: string;
  readonly supplierId: string | null;
  readonly leadTimeDays: number;
  /** W = ⌈lead time ÷ 7⌉ + review weeks. */
  readonly riskWeeks: number;
  readonly tier: ServiceTier;
  readonly tierSource: TierAssignment['source'];
  readonly target: number;
  readonly volumePallets: number;
  readonly averageDemandInterval: number;
  /** The errors behind the figure (AC-03: recalculable from these). */
  readonly errors: readonly OriginError[];
  readonly firstOrigin: IsoDate | null;
  readonly lastOrigin: IsoDate | null;
  readonly orderQtyPerCycle: number;
  /** The fill-rate result on the history — computed even where the fallback is used. */
  readonly engineSafetyStock: number;
  /** The β-quantile reading of the same errors, for comparison. */
  readonly quantileSafetyStock: number | null;
  /** The fill rate the history would have had at the safety stock used. */
  readonly historicalFillRate: number | null;
  /** The figure in force. */
  readonly safetyStock: number;
  readonly method: 'empiricalFillRate' | 'sapFallback';
  readonly source: 'engine' | 'sap';
  readonly sapSafetyStock: number;
  /** SAP's safety stock − the figure in force (positive frees space). */
  readonly freedUnits: number;
  /** The same three in pallets (null when the material has no volume record). */
  readonly sapPallets: number | null;
  readonly safetyStockPallets: number | null;
  readonly freedPallets: number | null;
  readonly safetyLeadTimeDays: number;
  readonly safetyLeadTimeSource: 'supplier' | 'groupDefault' | 'none';
  readonly safetyLeadTimeReceipts: number;
  readonly expectedDemandOverRisk: number;
  readonly reorderPoint: number;
  /** Every error the same sign: E14-11 raises a bias alarm (edge case). */
  readonly oneSidedErrors: boolean;
  /**
   * The engine's safety stock is zero while an order is expected: the fill-rate
   * target is met by the MOQ-sized order lot alone. Flagged for the planner to
   * review rather than floored (owner, 2026-09-23 — a floor of demand over the
   * safety lead time would double-count the earlier release E14-03 applies).
   */
  readonly reliesOnOrderLot: boolean;
}

export interface SafetyStockRun {
  readonly asOf: IsoDate;
  readonly planMadeAt: IsoDate | null;
  readonly method: { readonly name: 'empirical fill-rate safety stock'; readonly spec: 'METHOD-SPEC M3, M7'; readonly version: 1 };
  readonly parameters: Omit<SafetyStockOptions, 'asOf'>;
  readonly materials: readonly MaterialSafetyStock[];
  readonly safetyLeadTimes: readonly SafetyLeadTime[];
}

export function safetyStockRun(data: EngineDataset, options: SafetyStockOptions): SafetyStockRun {
  const currentWeek = mondayOf(options.asOf);
  const source = new Map(data.materials.map((m) => [m.materialCode, primarySource(data.sources, m.materialCode)]));
  const risk = (code: string) => offsetWeeks(source.get(code)?.leadTimeDays ?? 0, 0) + options.reviewWeeks;
  const errors = planErrors(data, options.asOf, risk);
  const tiers = defaultTiers(data, options.asOf, options);
  const planMadeAt = planInForce(data, options.asOf);
  const current = planMadeAt ? explodedPlan(data, planMadeAt) : new Map<string, Map<IsoDate, number>>();
  const sap = new Map(data.sapSafetyStock.map((s) => [s.materialCode, s.quantity]));
  const perPallet = new Map(data.volumes.map((v) => [v.materialCode, v.unitsPerPallet]));

  const delays = receiptDelays(data, options.asOf, options.receiptWindowWeeks);
  const pairs = [
    ...new Map(
      data.sources.map((s) => {
        const m = data.materials.find((x) => x.materialCode === s.materialCode);
        const g = m ? groupOf(m) : s.materialCode;
        return [`${s.supplierId}|${g}`, { supplierId: s.supplierId, materialGroup: g }] as const;
      }),
    ).values(),
  ].sort((a, b) => a.supplierId.localeCompare(b.supplierId) || a.materialGroup.localeCompare(b.materialGroup));
  const slts = safetyLeadTimes(delays, pairs, options.safetyLeadTimePercentile, options.minReceipts);
  const sltBy = new Map(slts.map((s) => [`${s.supplierId}|${s.materialGroup}`, s]));

  const materials = [...data.materials]
    .sort((a, b) => a.materialCode.localeCompare(b.materialCode))
    .map((m): MaterialSafetyStock => {
      const src = source.get(m.materialCode) ?? null;
      const w = risk(m.materialCode);
      const errs = errors.get(m.materialCode) ?? [];
      const values = errs.map((e) => e.error);
      const tier = tiers.get(m.materialCode)!;
      const target = options.targets[tier.tier];
      const expectedDemandOverRisk = sumOver(current.get(m.materialCode), currentWeek, w);
      const orderQtyPerCycle = interimOrderSize(
        (expectedDemandOverRisk / w) * options.reviewWeeks,
        src?.moq ?? 0,
        src?.orderMultiple ?? 1,
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
        quantileSafetyStock: values.length > 0 ? Math.max(0, empiricalQuantile(values, target)!) : null,
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
        oneSidedErrors: values.length > 0 && (values.every((e) => e > 0) || values.every((e) => e < 0)),
        reliesOnOrderLot: enough && safetyStock === 0 && orderQtyPerCycle > 0,
      };
    });

  const { asOf: _asOf, ...parameters } = options;
  void _asOf;
  return {
    asOf: options.asOf,
    planMadeAt,
    method: { name: 'empirical fill-rate safety stock', spec: 'METHOD-SPEC M3, M7', version: 1 },
    parameters,
    materials,
    safetyLeadTimes: slts,
  };
}

/** E14-04 → E14-03: the safety stock and safety lead time the netting reads. */
export function requirementInputs(run: SafetyStockRun): {
  safetyStock: Map<string, SafetyStockInput>;
  safetyLeadTime: Map<string, SafetyLeadTimeInput>;
} {
  const safetyStock = new Map<string, SafetyStockInput>();
  const safetyLeadTime = new Map<string, SafetyLeadTimeInput>();
  for (const m of run.materials) {
    safetyStock.set(m.materialCode, { quantity: m.safetyStock, source: m.source });
    if (m.supplierId) {
      safetyLeadTime.set(slKey(m.supplierId, m.materialCode), { days: m.safetyLeadTimeDays, source: m.safetyLeadTimeSource });
    }
  }
  return { safetyStock, safetyLeadTime };
}
