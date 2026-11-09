// ─────────────────────────────────────────────────────────────────────────────
// OSIP SAFETY AND CV ON THE SAFETY STOCK PAGE — BL-193 (DRC-7) and BL-197
// (DRC-11), SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.
//
// The read side of one supplier × material: it hands the OSIP calculation
// module (`osipRules.js`, BL-187) its inputs and says when an input is
// missing. Every formula is the module's; nothing is re-derived here:
//   · safety order (ROP Order)   `safetyOrder`   DRC-7 BR-01 [Default B2–B4]
//   · ROP Fisik safety           `fisikDemand` + `fisikSafety`
//                                DRC-7 BR-02 [Default B1, B5, B7], DRC-B4
//   · replenishment cycle f      the supplier's own (`osipParams`), else
//                                `replenishmentCycleDays` by `supplyAreaOf` [Team B6]
//   · Z and g                    the material's own (`osipParams`), else the
//                                rules' [Team B3, B7]
//   · CV per component           `cv`, `componentCv`, `cvCategory`
//                                DRC-11 [Default C1]
//
// The rules are an ARGUMENT, defaulting to `OSIP_RULES`, so the page can
// recompute the view under a switch variant without storing anything. The
// figures are computed at read and never stored, so they carry no stamp
// (DRC-D16 applies to stored figures only).
//
// Pure: plain data in, plain data out. No clock, no store.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { OsipRules, SupplyArea } from './osipRules' */
import {
  OSIP_RULES,
  componentCv,
  cv,
  cvCategory,
  fisikDemand,
  fisikSafety,
  horizonWeeksOf,
  mean,
  monthlyBuckets,
  safetyOrder
} from './osipRules';
import { cycleDaysOf, rulesForMaterial } from './osipParams';

/**
 * Wave 2 readings of inputs the sources do not name, one key each.
 *   · mpqSource: MPQ = orderMultiple until the master data feed carries MPQ
 *     (wave 2 default). The material master has no MPQ field; the read model
 *     passes `MaterialSource.orderMultiple` as `mpq`.
 *   · daysPerWeek: DRC-B4 — f and g are days, so every weekly figure is
 *     divided by 7 before it enters ROP Fisik.
 * The ROP Fisik consumption window is `fisikConsumptionWeeks(rules)`, read
 * from the rules passed in at call time (BL-210), not fixed here at load.
 */
export const OSIP_SAFETY_READ = Object.freeze({
  /** [Default, wave 2] MPQ = orderMultiple until the master data feed carries MPQ (wave 2 default). */
  mpqSource: /** @type {'orderMultiple'} */ ('orderMultiple'),
  /** DRC-B4 — weekly → daily. */
  daysPerWeek: 7
});

/**
 * DRC-10 "highest of the last 3 months' consumption", read as the highest
 * recorded week of the last `consumptionMovingAvgWeeks` weekly buckets, the
 * same 3 months as [Default A11]. BL-210 — read from the rules in use, so the
 * sandbox's consumption-window switch moves ROP Fisik.
 * @param {OsipRules} [rules]
 * @returns {number}
 */
export const fisikConsumptionWeeks = (rules = OSIP_RULES) => rules.consumptionMovingAvgWeeks;

/**
 * The question IDs each figure rests on, for its "Provisional" label
 * (design rule 5). `MPQ` names the wave 2 MPQ default. Left on 2026-10-28
 * [Team; owner ruling]: B2, B3, B6, B7 (answered or confirmed), B5 (levels
 * 1–5 and NPD confirmed; level 6 is held, labelled on its own rows) and C1.
 * An empty list shows no label.
 */
export const OSIP_SAFETY_QUESTIONS = Object.freeze({
  safetyOrder: Object.freeze(['B4', 'MPQ']),
  fisikSafety: Object.freeze(['B1', 'MPQ']),
  cv: Object.freeze(/** @type {string[]} */ ([]))
});

/**
 * One supplier × material's inputs, gathered by the read model.
 * `ltp`:  Weekly LTP of this supplier × material from the current hub week,
 *   at least `leadTimeWeeks` long (0 where no LTP is published).
 * `leadTimeWeeks`:  `leadTimeBreakdown(source).totalWeeks` (DRC-6).
 * `mpq`:  [Default, wave 2] `MaterialSource.orderMultiple`.
 * `koli`:  Units per pallet, or null (the `'koli'` rounding variant, B4/B8).
 * `consumption`:  The supplier's share of the material's recorded weekly
 *   consumption, oldest first, ending at the current hub week; weeks with no
 *   record are left out (DRC-B11). Covers at least the longest window read.
 * `supplyArea`:  From the supplier's country and city (DRC-B8), or null.
 * `leadTimeSteps`:  BL-196 — the source's lead time by step (DRC-6), empty when the feed carries
 *   none; the supplier-side ROPs read them (`osipRopRules`).
 * `ltpNext3m`:  BL-198 — weekly LTP of this supplier × material over the next 3 months
 *   (`npdLtpWeeks(rules)` weeks from the current hub week).
 * `npd`:  BL-198 (DRC-12a) — the material is NPD under the NPD rule in force: ROP Fisik demand
 *   takes `fisikDemand`'s NPD branch, min(highest LTP over the next 3 months, capacity).
 * `sd`:  BL-210 — a typed SD for the safety order (the sandbox's); absent or
 *   null, the safety order computes it per `sdSource`. ROP Fisik's sheet
 *   variant keeps the SD of daily consumption.
 * `z` / `g`:  [Team B3, B7] the material's own service-level factor and fixed
 *   safety days (`osipParams`); absent or null, the rules' values apply.
 * `safetyOn`:  PEX-13 (BL-275) — the material's safety stock switch; absent or true, on. Off, the
 *   safety order and the ROP Fisik safety are 0 and the figures say `safetyOn: false`.
 * `fDays`:  [Team B6] the supplier's own replenishment cycle f; absent or
 *   null, its supply area's default.
 * `bottleneckLeadTimeDays`:  [Team B10] the supplier's bottleneck production
 *   lead time for the material, queueing included; ROP Supplier reads it.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly ltp: readonly number[];
 *   readonly leadTimeWeeks: number;
 *   readonly mpq: number;
 *   readonly moq: number;
 *   readonly koli: number | null;
 *   readonly consumption: readonly number[];
 *   readonly supplyArea: SupplyArea | null;
 *   readonly leadTimeSteps?: readonly import('../engine/types').LeadTimeStep[];
 *   readonly ltpNext3m?: readonly number[];
 *   readonly npd?: boolean;
 *   readonly sd?: number | null;
 *   readonly z?: number | null;
 *   readonly g?: number | null;
 *   readonly safetyOn?: boolean;
 *   readonly fDays?: number | null;
 *   readonly bottleneckLeadTimeDays?: number | null;
 * }} OsipSafetyInput
 */

/**
 * One supplier × material's inputs, with the supplier's name for the page and
 * [Team E2] whether the supplier is on a pull agreement.
 * PEX-13: `protectionOn` is the material's protection buffer switch and `switchNotes` the latest
 * ledger row of each switch, for the page.
 * @typedef {OsipSafetyInput & {
 *   readonly supplierName: string;
 *   readonly pullAgreement?: boolean;
 *   readonly protectionOn?: boolean;
 *   readonly switchNotes?: Partial<Record<'safetyStockOn' | 'protectionBufferOn', { readonly reason: string | null; readonly setAt: string; readonly on: boolean }>>;
 * }} OsipSupplierInput
 */

/**
 * @typedef {'NO_LTP' | 'NO_CONSUMPTION' | 'NO_SUPPLY_AREA'} OsipUnavailable
 */

/**
 * @typedef {'PRODUCTION_CAPACITY_NOT_AVAILABLE' | 'LTP_NOT_AVAILABLE' | 'NO_ROUNDING_SIZE'} OsipSafetyFlag
 */

/**
 * The figures for one supplier × material under `rules`.
 * `safetyOrder.value` / `fisik.value`: null when `unavailable` is set.
 * `fisik.demandPerDay`: min(a, b, c) per `fisikDemand`, a daily rate.
 * `fisik.consumptionPerDay` / `fisik.ltpPerDay`: the terms of the min that
 *   exist (production capacity never does in the hub, flagged).
 *
 * @typedef {{
 *   readonly safetyOn: boolean;
 *   readonly safetyOrder: {
 *     readonly value: number | null;
 *     readonly sd: number | null;
 *     readonly roundTo: number;
 *     readonly unavailable: OsipUnavailable | null;
 *   };
 *   readonly fisik: {
 *     readonly value: number | null;
 *     readonly demandPerDay: number | null;
 *     readonly consumptionPerDay: number | null;
 *     readonly ltpPerDay: number | null;
 *     readonly f: number | null;
 *     readonly unavailable: OsipUnavailable | null;
 *   };
 *   readonly flags: readonly OsipSafetyFlag[];
 * }} OsipSafetyFigures
 */

/**
 * DRC-7 — the safety order and the ROP Fisik safety of one supplier ×
 * material, by the module's own functions, under `rules`.
 *
 * Safety order (BR-01): `safetyOrder` over the LTP of the lead-time weeks
 * (`sdSource: 'ltp'`) or the last `consumptionSdWeeks` recorded weeks
 * (`'consumption12w'`), rounded per `safetyRounding` (MPQ, koli or MOQ).
 * Unavailable with no LTP over the horizon, or fewer than two recorded weeks,
 * unless an SD is typed (`sd`, BL-210), which replaces the computed one.
 *
 * ROP Fisik safety (BR-02), every input a daily rate (DRC-B4):
 *   a = highest recorded week of the last `fisikConsumptionWeeks(rules)` ÷ 7
 *   b = production capacity — NOT IN THE HUB: left out of the min, flagged
 *   c = mean weekly LTP over the lead-time weeks ÷ 7; left out (flagged) when
 *       the supplier has no LTP; dropped by `fisikDemandIncludesLtp: false`
 *   deck:  CEILING(g × min, MPQ); sheet: Z × √f × SD(daily consumption)
 *          + g × average daily consumption, f by supply area.
 * Unavailable with no consumption recorded in the window, or (sheet only) no
 * supply area for f.
 *
 * BL-198 (DRC-12a) — an NPD material (`npd`) takes `fisikDemand`'s NPD branch:
 * min(highest weekly LTP of the next 3 months ÷ 7, production capacity), the
 * capacity left out as above. It needs no consumption under the deck rule, and
 * is unavailable (`NO_LTP`) with no LTP over those weeks.
 *
 * @param {OsipSafetyInput} input
 * @param {OsipRules} [ruleBlock]
 * @returns {OsipSafetyFigures}
 */
export function osipSafety(input, ruleBlock = OSIP_RULES) {
  // PEX-13 BR-01 — switched off for the material: no safety stock, whatever the inputs.
  if (input.safetyOn === false) {
    return {
      safetyOn: false,
      safetyOrder: { value: 0, sd: null, roundTo: 0, unavailable: null },
      fisik: {
        value: 0,
        demandPerDay: null,
        consumptionPerDay: null,
        ltpPerDay: null,
        f: null,
        unavailable: null
      },
      flags: []
    };
  }
  // [Team B3, B7] the material's own Z and g, when set, over the block's.
  const rules = rulesForMaterial(ruleBlock, input);
  /** @type {OsipSafetyFlag[]} */
  const flags = ['PRODUCTION_CAPACITY_NOT_AVAILABLE'];
  const perDay = OSIP_SAFETY_READ.daysPerWeek;
  const horizon = input.ltp.slice(0, horizonWeeksOf(input.leadTimeWeeks));
  const hasLtp = horizon.some((q) => q > 0);
  if (!hasLtp) flags.push('LTP_NOT_AVAILABLE');

  // ── Safety order (DRC-7 BR-01) ──
  // `safetyOrder` reads the last `consumptionSdWeeks` recorded weeks.
  const sdWeeks = Math.min(input.consumption.length, rules.consumptionSdWeeks);
  // BL-210 — a typed SD needs no series behind it.
  const typedSd = typeof input.sd === 'number';
  /** @type {OsipUnavailable | null} */
  const orderGap = typedSd
    ? null
    : rules.sdSource === 'consumption12w'
      ? sdWeeks < 2
        ? 'NO_CONSUMPTION'
        : null
      : hasLtp
        ? null
        : 'NO_LTP';
  const so = safetyOrder(
    {
      ltp: input.ltp,
      leadTimeWeeks: input.leadTimeWeeks,
      mpq: input.mpq,
      moq: input.moq,
      koli: input.koli ?? undefined,
      consumption: input.consumption,
      ...(typedSd ? { sd: input.sd } : {})
    },
    rules
  );
  if (so.roundTo <= 0) flags.push('NO_ROUNDING_SIZE');

  // ── ROP Fisik safety (DRC-7 BR-02, DRC-B4) ──
  // BL-210 — the window from the rules in use, not fixed at load.
  const window = input.consumption.slice(-fisikConsumptionWeeks(rules));
  const daily = window.map((q) => q / perDay);
  const consumptionPerDay = daily.length === 0 ? null : Math.max(...daily);
  const ltpPerDay = hasLtp ? mean(horizon) / perDay : null;
  // [Team B6] the supplier's own f, else its area's.
  const f = cycleDaysOf(input.fDays, input.supplyArea, rules);
  /** @type {OsipUnavailable | null} */
  const fisikGap =
    consumptionPerDay === null
      ? 'NO_CONSUMPTION'
      : rules.fisikSafety === 'sheet' && f === null
        ? 'NO_SUPPLY_AREA'
        : null;
  // BL-198 — the NPD branch of the demand (DRC-10 [Default B5]).
  const next3m = input.ltpNext3m ?? [];
  const npdDemand =
    input.npd && next3m.some((q) => q > 0)
      ? fisikDemand(
          {
            npd: true,
            highestLtpNext3m: Math.max(...next3m) / perDay,
            productionCapacity: Infinity
          },
          rules
        )
      : null;
  /** @type {OsipUnavailable | null} */
  const npdGap = !input.npd
    ? null
    : npdDemand === null
      ? 'NO_LTP'
      : rules.fisikSafety === 'sheet' && consumptionPerDay === null
        ? 'NO_CONSUMPTION'
        : rules.fisikSafety === 'sheet' && f === null
          ? 'NO_SUPPLY_AREA'
          : null;
  const existingDemand =
    consumptionPerDay === null
      ? null
      : fisikDemand(
          {
            highestConsumption3m: consumptionPerDay,
            // No PTI production-capacity figure exists in the hub: the term
            // leaves the min (Infinity never wins it), and the flag says so.
            productionCapacity: Infinity,
            ...(ltpPerDay === null ? {} : { ltp: ltpPerDay })
          },
          rules
        );
  const demandPerDay = input.npd ? npdDemand : existingDemand;
  const gap = input.npd ? npdGap : fisikGap;
  const fisikValue =
    gap !== null || demandPerDay === null
      ? null
      : fisikSafety(
          {
            demand: demandPerDay,
            mpq: input.mpq,
            f: f ?? 0,
            consumption: daily,
            averageDemand: mean(daily)
          },
          rules
        );

  return {
    safetyOn: true,
    safetyOrder: {
      value: orderGap === null ? so.value : null,
      sd: orderGap === null ? so.sd : null,
      roundTo: so.roundTo,
      unavailable: orderGap
    },
    fisik: {
      value: fisikValue,
      demandPerDay,
      consumptionPerDay,
      ltpPerDay,
      f,
      unavailable: gap
    },
    flags
  };
}

// ─── CV (DRC-11, BL-197) ─────────────────────────────────────────────────────

/**
 * One SKU behind a component's CV. Each SKU is its own variant: the engine's
 * finished goods carry no variant grouping.
 * @typedef {{ readonly skuCode: string; readonly cv: number; readonly avgDemand: number }} SkuCv
 */

/**
 * `cv`:  The demand-weighted CV, or null when no SKU behind it has demand.
 * `category`:  Stable below `cvThreshold`, fluctuative at or above; null with no CV.
 * `skus`:  The SKUs counted (a SKU with no demand in the window has no CV and is left out).
 * `noBom`:  No BOM line valid this week names the component.
 *
 * @typedef {{
 *   readonly cv: number | null;
 *   readonly category: 'stable' | 'fluctuative' | null;
 *   readonly skus: readonly SkuCv[];
 *   readonly noBom: boolean;
 * }} MaterialCv
 */

/**
 * DRC-11 [Team C1] — CV per component: each parent SKU's CV (the FG-variant
 * CV, "CV Comp FG Var") over the window in force (`cv`): the last
 * `cvWindowMonths` full calendar months (`monthlyBuckets`), or the last
 * `cvWindowWeeks` weeks (`cvBucket: 'week'`); weighted by the SKU's average
 * demand over the same buckets (`componentCv`), then `cvCategory`. Under the
 * monthly buckets a SKU with fewer full months than the window has no CV and
 * is left out ([Proposed], owner 2026-10-28: not calculated).
 * @param {{
 *   readonly skuWeekly: ReadonlyMap<string, readonly number[]>;
 *   readonly bomLinks: readonly { readonly parentCode: string; readonly componentCode: string }[];
 *   readonly materialCodes: readonly string[];
 *   readonly asOfWeek?: string;
 * }} input  `skuWeekly`: each SKU's weekly demand, oldest first, ending the
 *   week before `asOfWeek` (the Monday of the current week, needed for the
 *   monthly buckets); `bomLinks`: the BOM lines valid in the current week.
 * @param {OsipRules} [rules]
 * @returns {Map<string, MaterialCv>}
 */
export function materialCvs({ skuWeekly, bomLinks, materialCodes, asOfWeek }, rules = OSIP_RULES) {
  if (rules.cvBucket === 'month' && asOfWeek === undefined)
    throw new RangeError('materialCvs: asOfWeek is needed for monthly buckets');
  /** @type {Map<string, SkuCv | null>} */
  const bySku = new Map();
  /** @param {string} sku */
  const skuCv = (sku) => {
    if (bySku.has(sku)) return bySku.get(sku) ?? null;
    const weekly = skuWeekly.get(sku) ?? [];
    /** @type {readonly number[] | null} */
    let series = weekly.slice(-rules.cvWindowWeeks);
    if (rules.cvBucket === 'month') {
      const first = new Date(
        Date.parse(`${asOfWeek}T00:00:00.000Z`) - weekly.length * 7 * 86_400_000
      )
        .toISOString()
        .slice(0, 10);
      const months = monthlyBuckets(weekly, first).map((m) => m.qty);
      series = months.length < rules.cvWindowMonths ? null : months.slice(-rules.cvWindowMonths);
    }
    const value = series === null ? null : cv(series, rules);
    if (series === null || value === null) {
      bySku.set(sku, null);
      return null;
    }
    const out = { skuCode: sku, cv: value, avgDemand: mean(series) };
    bySku.set(sku, out);
    return out;
  };
  /** @type {Map<string, MaterialCv>} */
  const out = new Map();
  for (const code of materialCodes) {
    const parents = [
      ...new Set(bomLinks.filter((b) => b.componentCode === code).map((b) => b.parentCode))
    ].sort();
    const skus = /** @type {SkuCv[]} */ (parents.map(skuCv).filter((s) => s !== null));
    const value = componentCv(skus);
    out.set(code, {
      cv: value,
      category: value === null ? null : cvCategory(value, rules),
      skus,
      noBom: parents.length === 0
    });
  }
  return out;
}

/**
 * The OSIP part of one material on the Safety stock targets page (served
 * beside REQ-E14-04's figures).
 * `suppliers`:  Every source of the material, the primary one (largest share) first.
 * `cv`:  DRC-11 — the component's CV.
 *
 * @typedef {{
 *   readonly suppliers: readonly OsipSupplierInput[];
 *   readonly cv: MaterialCv;
 * }} MaterialOsipInputs
 */
