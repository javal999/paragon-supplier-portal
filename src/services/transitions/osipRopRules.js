// ─────────────────────────────────────────────────────────────────────────────
// OSIP ROPS AND MAX — BL-196 (DRC-10, DRC-D11) — AND THE NPD TAG — BL-198
// (DRC-12a), SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.
//
// The read side of one supplier × material's reorder points. Every formula the
// calculation module holds is the module's (`osipRules.js`, BL-187), called,
// never re-derived here:
//   · ROP Order  = `ropOrder({ cycleStock, safetyOrder })`        [Default B9]
//   · ROP Fisik  = `ropFisik` by the material's level (3–6)       DRC-10, DRC-B3–B5
//   · Max        = `maxStock` on ROP Fisik                        [Default B8]
// The safety figures come from wave 2's `osipSafety` (BL-193), so the safety
// order and ROP Fisik safety shown beside these columns are the ones inside them.
//
// What the module does NOT hold, and this file reads, each one key of
// `OSIP_ROP_READ` with its question ID, reported as a build decision:
//   · MDQ (level 5): the master has no MDQ field — MDQ = MOQ [Default].
//   · JIT days covered (level 6): 1 day, "at least 1 call-off a day" (DRC-B5).
//   · ROP Supplier, ROP FS and ROP to principal [Owner B10; XLS "ROP Fisik Non
//     stc" columns "ROP PM in Supplier", "ROP FS in Supplier", "ROP order to
//     principal"]. The sheet's formulas are not in this repository, so each is
//     READ as the ROP Fisik demand over one leg of the supplier's lead time
//     (DRC-6 steps), rounded up to the MPQ like every other OSIP figure. A leg
//     the source's steps do not carry shows "Not available" naming the missing
//     input; nothing is invented.
//   · NPD (DRC-12a) [Default D1]: three variants, the default on.
//
// Pure: plain data in, plain data out. No clock, no store. Computed at read,
// never stored, so no figure here carries a stamp (DRC-D16 applies to stored
// figures); the NPD observation ledger stamps what it stores.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { OsipRules, SupplyArea } from './osipRules' */
/** @import { OsipSafetyFigures, OsipSafetyInput } from './osipSafetyRules' */
/** @import { LeadTimeStep, LeadTimeStepId } from '../engine/types' */
import { OSIP_RULES, ceilingTo, cycleStock, maxStock, ropFisik, ropOrder } from './osipRules';

/** @typedef {'firstOrderFulfilled' | 'oneYearAfterLaunch' | '52WeeksHistory'} NpdRule */

/** @typedef {'ropSupplier' | 'ropFs' | 'ropToPrincipal'} SupplierRopKey */

/**
 * The readings this file makes where the sources leave a gap, one key each,
 * with the question ID it waits on.
 */
export const OSIP_ROP_READ = Object.freeze({
  /** [Default, DRC-B5] MDQ = MOQ until the master data feed carries MDQ (level 5, fixed order). */
  mdqSource: /** @type {'moq'} */ ('moq'),
  /** [Default, DRC-B5] level 6 (JIT): the days one call-off covers — at least 1 call-off a day. */
  jitDays: 1,
  /**
   * [Owner B10] the lead-time steps (DRC-6) each supplier-side ROP covers:
   *   ropSupplier    — "ROP PM in Supplier": finished stock the supplier holds
   *                    while it produces again = machine queue + production.
   *   ropFs          — "ROP FS in Supplier": feedstock the supplier holds while
   *                    it orders its own material = ordering material.
   *   ropToPrincipal — "ROP order to principal" = order to principal.
   */
  supplierRopLegs: Object.freeze(
    /** @type {Readonly<Record<SupplierRopKey, readonly LeadTimeStepId[]>>} */ ({
      ropSupplier: Object.freeze(/** @type {LeadTimeStepId[]} */ (['machineQueue', 'production'])),
      ropFs: Object.freeze(/** @type {LeadTimeStepId[]} */ (['orderingMaterial'])),
      ropToPrincipal: Object.freeze(/** @type {LeadTimeStepId[]} */ (['orderToPrincipal']))
    })
  ),
  /** [Default D1] DRC-12a — when a material stops being NPD. */
  npdRule: /** @type {NpdRule} */ ('firstOrderFulfilled'),
  /** [Default D1] the `'oneYearAfterLaunch'` variant (XLS): days after the earliest parent SKU's launch. */
  npdLaunchDays: 365,
  /** [Default D1] the `'52WeeksHistory'` variant (engine, ENG-B63): weeks of sales history. */
  npdHistoryWeeks: 52
});

/**
 * [Default B5] DRC-10 "highest LTP over the next 3 months", in weeks: the same
 * 3 months as [Default A11] (`consumptionMovingAvgWeeks`, 13 weeks). BL-212 —
 * read from the rules in use at call time, not fixed at load, so a rules
 * variant (the sandbox's window switch) moves the NPD demand.
 * @param {OsipRules} [rules]
 * @returns {number}
 */
export const npdLtpWeeks = (rules = OSIP_RULES) => rules.consumptionMovingAvgWeeks;

/** The three NPD variants, the default first. @type {readonly NpdRule[]} */
export const NPD_RULES = Object.freeze(
  /** @type {NpdRule[]} */ (['firstOrderFulfilled', 'oneYearAfterLaunch', '52WeeksHistory'])
);

/** The supplier-side ROPs, in display order. @type {readonly SupplierRopKey[]} */
export const SUPPLIER_ROP_KEYS = Object.freeze(
  /** @type {SupplierRopKey[]} */ (['ropSupplier', 'ropFs', 'ropToPrincipal'])
);

/** The OSIP levels a planner may set (DRC-D11). The module calculates 3–6; 1 and 2 use level 4, flagged. */
export const OSIP_LEVELS = Object.freeze([1, 2, 3, 4, 5, 6]);

/**
 * The question IDs each figure rests on, for its "Provisional" label (design
 * rule 5). `MPQ` / `MDQ` name the master-data defaults.
 */
export const OSIP_ROP_QUESTIONS = Object.freeze({
  level: Object.freeze(['C2']),
  npd: Object.freeze(['D1']),
  ropOrder: Object.freeze(['B2', 'B3', 'B4', 'B9', 'MPQ']),
  ropFisik: Object.freeze(['B1', 'B5', 'B6', 'B7', 'C2', 'MPQ', 'MDQ']),
  max: Object.freeze(['B8']),
  supplierRops: Object.freeze(['B10', 'MPQ'])
});

// ─── Level (DRC-D11) ─────────────────────────────────────────────────────────

/**
 * `source`: how the level was set — the planner's own pick, or the planner
 * confirming the suggested level (`classification`, BL-208 / DRC-19
 * [Proposed]). Both come through `t_osiplevel_set`; nothing sets a level
 * automatically.
 * @typedef {'planner' | 'classification'} OsipLevelSource
 */

/**
 * The level in force for a material: the latest ledger row, or [Default C2].
 * @typedef {{ readonly level: number; readonly source: OsipLevelSource | 'default'; readonly setAt: string | null }} OsipLevelInForce
 */

/**
 * DRC-D11 — why a level would be refused, or null when it is acceptable.
 * @param {unknown} level
 * @returns {string | null}
 */
export function osipLevelRefusal(level) {
  if (typeof level !== 'number' || !Number.isInteger(level))
    return 'OSIP_LEVEL_INVALID: level must be a whole number';
  if (!OSIP_LEVELS.includes(level))
    return `OSIP_LEVEL_INVALID: level must be one of ${OSIP_LEVELS.join(', ')}`;
  return null;
}

/**
 * DRC-D11 [Default C2] — the level in force from a material's ledger rows
 * (oldest first): the latest row, or the default level when none.
 * @param {readonly { readonly level: number; readonly source: OsipLevelSource; readonly setAt: string }[]} rows
 * @param {OsipRules} [rules]
 * @returns {OsipLevelInForce}
 */
export function osipLevelInForce(rows, rules = OSIP_RULES) {
  const last = rows[rows.length - 1];
  return last
    ? { level: last.level, source: last.source, setAt: last.setAt }
    : { level: rules.defaultLevel, source: 'default', setAt: null };
}

// ─── ROPs and Max (DRC-10) ───────────────────────────────────────────────────

/**
 * Why a figure is not shown. Each names the input the hub does not hold.
 * @typedef {| 'NO_SAFETY_ORDER'
 *   | 'NO_FISIK_SAFETY'
 *   | 'NO_SUPPLY_AREA'
 *   | 'NO_LTP'
 *   | 'NO_DEMAND'
 *   | 'NO_LEAD_TIME_STEPS'
 *   | 'NOT_ON_ROUTE'} RopUnavailable
 */

/**
 * @typedef {'LEVEL_FALLBACK' | 'NO_MDQ' | 'NO_PALLET_SIZE' | 'NO_MAX_ROUNDING'} RopFlag
 */

/**
 * A figure, or why not.
 * `missing`: for `NOT_ON_ROUTE`, the steps the source's route does not carry.
 * @typedef {{
 *   readonly value: number | null;
 *   readonly unavailable: RopUnavailable | null;
 *   readonly missing?: readonly LeadTimeStepId[];
 *   readonly days?: number;
 * }} RopFigure
 */

/**
 * One supplier × material's ROPs and Max under `rules`.
 * `level`: the level the formula used (`levelFallback` when the asked level has none).
 * @typedef {{
 *   readonly ropOrder: RopFigure & { readonly cycleStock: number | null };
 *   readonly ropFisik: RopFigure & { readonly cycle: number | null; readonly level: number; readonly levelFallback: boolean };
 *   readonly max: RopFigure;
 *   readonly supplier: Readonly<Record<SupplierRopKey, RopFigure>>;
 *   readonly flags: readonly RopFlag[];
 * }} OsipRopFigures
 */

/**
 * The supplier × material inputs this file reads beyond wave 2's safety inputs.
 * `leadTimeSteps`: DRC-6 steps of the source, empty when the feed carries none.
 * @typedef {OsipSafetyInput & { readonly leadTimeSteps?: readonly LeadTimeStep[] }} OsipRopInput
 */

/**
 * @param {number | null} value
 * @param {RopUnavailable | null} unavailable
 * @returns {RopFigure}
 */
const figure = (value, unavailable) => ({
  value: unavailable === null ? value : null,
  unavailable
});

/**
 * DRC-10 — ROP Order, ROP Fisik (by level), Max and the supplier-side ROPs of
 * one supplier × material.
 *
 *   ROP Order  = cycle stock (Σ LTP over the lead-time weeks) + safety order
 *                (`osipSafety`'s), by `cycleStock` and `ropOrder` [Default B9].
 *   ROP Fisik  = `ropFisik` at the level in force [Default C2]:
 *                3, 4: CEILING(demand × f, MPQ) + safety;
 *                5:    CEILING(demand × f, MDQ) + safety, MDQ = MOQ [Default];
 *                6:    CEILING(daily LTP × 1 day, pallet), no safety (DRC-B5);
 *                demand, f and safety are `osipSafety`'s ROP Fisik figures, so
 *                an NPD material's demand is the NPD branch (BL-198).
 *   Max        = `maxStock` on ROP Fisik [Default B8]: local CEILING(ROP,
 *                koli), import CEILING(ROP, MOQ); koli = units per pallet.
 *   ROP Supplier / FS / to principal = CEILING(demand × Σ leg days, MPQ),
 *                the leg per `supplierRopLegs` [Owner B10, reading].
 *
 * @param {OsipRopInput} input
 * @param {OsipSafetyFigures} safety  `osipSafety(input, rules)`.
 * @param {number} level  The level in force (DRC-D11).
 * @param {OsipRules} [rules]
 * @returns {OsipRopFigures}
 */
export function osipRops(input, safety, level, rules = OSIP_RULES) {
  /** @type {RopFlag[]} */
  const flags = [];

  // ── ROP Order [Default B9] ──
  const cycle = cycleStock(input.ltp, input.leadTimeWeeks);
  const so = safety.safetyOrder.value;
  const ropOrderFig =
    so === null
      ? { ...figure(null, 'NO_SAFETY_ORDER'), cycleStock: null }
      : { ...figure(ropOrder({ cycleStock: cycle, safetyOrder: so }), null), cycleStock: cycle };

  // ── ROP Fisik by level (DRC-10, DRC-B3 to B5) ──
  const fis = safety.fisik;
  const mdq = input.moq; // [Default] MDQ = MOQ until the master data feed carries MDQ.
  const pallet = input.koli ?? 0;
  const fis6 = ropFisik(
    {
      level,
      demand: fis.demandPerDay ?? 0,
      f: fis.f ?? 0,
      mpq: input.mpq,
      safety: fis.value ?? 0,
      mdq,
      jitRate: fis.ltpPerDay ?? 0,
      jitDays: OSIP_ROP_READ.jitDays,
      palletQty: pallet
    },
    rules
  );
  if (fis6.levelFallback) flags.push('LEVEL_FALLBACK');
  /** @type {RopUnavailable | null} */
  let fisikGap = null;
  if (fis6.level === 6) {
    if (fis.ltpPerDay === null) fisikGap = 'NO_LTP';
    else if (!(pallet > 0)) flags.push('NO_PALLET_SIZE');
  } else {
    if (fis.value === null) fisikGap = 'NO_FISIK_SAFETY';
    else if (fis.f === null) fisikGap = 'NO_SUPPLY_AREA';
    if (fis6.level === 5 && !(mdq > 0)) flags.push('NO_MDQ');
  }
  const ropFisikFig = {
    ...figure(fis6.value, fisikGap),
    cycle: fisikGap === null ? fis6.cycle : null,
    level: fis6.level,
    levelFallback: fis6.levelFallback
  };

  // ── Max [Default B8] ──
  /** @type {RopUnavailable | null} */
  const maxGap =
    ropFisikFig.value === null
      ? (fisikGap ?? 'NO_FISIK_SAFETY')
      : input.supplyArea === null
        ? 'NO_SUPPLY_AREA'
        : null;
  const area = /** @type {SupplyArea} */ (input.supplyArea);
  const roundBy = area === 'import' ? input.moq : pallet;
  if (maxGap === null && rules.maxRule === 'deck' && !(roundBy > 0)) flags.push('NO_MAX_ROUNDING');
  const maxFig =
    maxGap === null
      ? figure(
          maxStock(
            {
              rop: /** @type {number} */ (ropFisikFig.value),
              area,
              koli: pallet,
              moq: input.moq,
              cycleStock: ropFisikFig.cycle ?? 0
            },
            rules
          ),
          null
        )
      : figure(null, maxGap);

  // ── ROP Supplier, ROP FS, ROP to principal [Owner B10, reading] ──
  const steps = input.leadTimeSteps ?? [];
  /** @type {Record<SupplierRopKey, RopFigure>} */
  const supplier = /** @type {Record<SupplierRopKey, RopFigure>} */ ({});
  for (const key of SUPPLIER_ROP_KEYS) {
    const leg = OSIP_ROP_READ.supplierRopLegs[key];
    const held = leg.filter((id) => steps.some((s) => s.step === id));
    const missing = leg.filter((id) => !held.includes(id));
    if (steps.length === 0) supplier[key] = figure(null, 'NO_LEAD_TIME_STEPS');
    else if (missing.length > 0) supplier[key] = { ...figure(null, 'NOT_ON_ROUTE'), missing };
    else if (fis.demandPerDay === null) supplier[key] = figure(null, 'NO_DEMAND');
    else {
      const days = steps.filter((s) => leg.includes(s.step)).reduce((n, s) => n + s.days, 0);
      supplier[key] = { ...figure(ceilingTo(fis.demandPerDay * days, input.mpq), null), days };
    }
  }

  return { ropOrder: ropOrderFig, ropFisik: ropFisikFig, max: maxFig, supplier, flags };
}

// ─── NPD (DRC-12a, BL-198) ───────────────────────────────────────────────────

/**
 * A PO line of the material, as the first-order rule reads it.
 * @typedef {{
 *   readonly poNumber: string;
 *   readonly orderDate: string;
 *   readonly status: string;
 *   readonly quantity: number;
 *   readonly valueOnly: boolean;
 * }} NpdPoLine
 */

/**
 * A goods receipt line of the material against a PO.
 * @typedef {{
 *   readonly poNumber: string;
 *   readonly receivedDate: string;
 *   readonly status: string;
 *   readonly qtyAccepted: number;
 * }} NpdReceiptLine
 */

/**
 * GR states whose accepted quantity counts as received [Default D1 reading]:
 * the inspection decided and the quantity was accepted.
 */
export const NPD_RECEIVED_GR_STATES = Object.freeze([
  'Approved',
  'Partially Approved',
  'Posting to SAP',
  'Posted to SAP'
]);

/** PO states that end an order as fulfilled when its line carries no quantity (a value-limit line). */
export const NPD_FULFILLED_PO_STATES = Object.freeze(['Delivered', 'Closed']);

/**
 * `firstPo`: the material's first standing PO (earliest order date), or null.
 * `ordered` / `received`: that PO's quantity of the material and the accepted
 * quantity received against it.
 * `fulfilledOn`: the receipt date at which it was fully received, or null.
 * @typedef {{
 *   readonly firstPo: string | null;
 *   readonly ordered: number;
 *   readonly received: number;
 *   readonly fulfilledOn: string | null;
 *   readonly valueOnly: boolean;
 * }} FirstOrder
 */

/**
 * DRC-12a [Default D1] — the material's first order and whether it was
 * fulfilled: the first PO (earliest order date, then PO number) among the POs
 * still standing (a REJECTED PO never stood, as DRC-15a reads it) is fully
 * received when the accepted quantity on its goods receipts for the material
 * reaches the PO's quantity. A value-limit line carries no quantity: it is
 * fulfilled when the PO reads Delivered or Closed.
 * @param {readonly NpdPoLine[]} poLines  The material's PO lines.
 * @param {readonly NpdReceiptLine[]} receipts  The material's GR lines.
 * @returns {FirstOrder}
 */
export function firstOrder(poLines, receipts) {
  const standing = poLines
    .filter((l) => l.status !== 'Rejected')
    .sort((a, b) => a.orderDate.localeCompare(b.orderDate) || a.poNumber.localeCompare(b.poNumber));
  if (standing.length === 0)
    return { firstPo: null, ordered: 0, received: 0, fulfilledOn: null, valueOnly: false };
  const po = standing[0].poNumber;
  const lines = standing.filter((l) => l.poNumber === po);
  const ordered = lines.reduce((n, l) => n + l.quantity, 0);
  const valueOnly = ordered === 0 && lines.some((l) => l.valueOnly);
  const counted = receipts
    .filter((r) => r.poNumber === po && NPD_RECEIVED_GR_STATES.includes(r.status))
    .sort((a, b) => a.receivedDate.localeCompare(b.receivedDate));
  let received = 0;
  /** @type {string | null} */
  let fulfilledOn = null;
  for (const r of counted) {
    received += r.qtyAccepted;
    if (fulfilledOn === null && ordered > 0 && received >= ordered) fulfilledOn = r.receivedDate;
  }
  if (valueOnly && NPD_FULFILLED_PO_STATES.includes(lines[0].status))
    fulfilledOn = counted[counted.length - 1]?.receivedDate ?? lines[0].orderDate;
  return { firstPo: po, ordered, received, fulfilledOn, valueOnly };
}

/**
 * Why a tag reads as it does.
 * @typedef {| 'FIRST_ORDER_OPEN'
 *   | 'NO_ORDER'
 *   | 'FIRST_ORDER_FULFILLED'
 *   | 'WITHIN_LAUNCH_YEAR'
 *   | 'LAUNCH_YEAR_PASSED'
 *   | 'SHORT_HISTORY'
 *   | 'NO_HISTORY'
 *   | 'FULL_HISTORY'
 *   | 'NO_BOM'} NpdBasis
 */

/**
 * One variant's NPD tag. `until`: the day the tag dropped (or will drop, for
 * the dated variants); null when no date is known.
 * @typedef {{ readonly npd: boolean; readonly basis: NpdBasis; readonly until: string | null }} NpdTag
 */

/**
 * @typedef {Readonly<Record<NpdRule, NpdTag>>} NpdTags
 */

/**
 * The material-level ROP inputs as served on the Safety stock targets page.
 * `npd`: every variant's tag; the page shows the one its switch names.
 * `firstOrder`: the first order behind the default variant.
 * @typedef {{
 *   readonly level: OsipLevelInForce;
 *   readonly npd: NpdTags;
 *   readonly firstOrder: FirstOrder;
 * }} MaterialRopInputs
 */

/**
 * DRC-12a — the material's NPD tag under every variant [Default D1]:
 *   firstOrderFulfilled (default, MoM 4C): NPD until its first order is fully
 *     received; with no order on record it is NPD (nothing was fulfilled).
 *   oneYearAfterLaunch (XLS): NPD until `npdLaunchDays` after the earliest
 *     launch of the SKUs whose current BOM uses it.
 *   52WeeksHistory (engine, ENG-B63): NPD while the longest sales history of
 *     those SKUs is under `npdHistoryWeeks` weeks; no sales = no history.
 * A material no current BOM line names has no launch and no history: not NPD
 * under those two variants, basis `NO_BOM`. Transition products are not told
 * apart: the data carries no transition flag (reported, BL-198).
 * @param {{
 *   readonly today: string;
 *   readonly firstOrder: FirstOrder;
 *   readonly parentLaunches: readonly string[];
 *   readonly parentFirstSales: readonly (string | null)[];
 * }} input  `parentFirstSales`: each parent SKU's first sales week, or null with none.
 * @returns {NpdTags}
 */
export function npdTags({ today, firstOrder: fo, parentLaunches, parentFirstSales }) {
  /** @type {NpdTag} */
  const byOrder =
    fo.firstPo === null
      ? { npd: true, basis: 'NO_ORDER', until: null }
      : fo.fulfilledOn !== null && fo.fulfilledOn <= today
        ? { npd: false, basis: 'FIRST_ORDER_FULFILLED', until: fo.fulfilledOn }
        : { npd: true, basis: 'FIRST_ORDER_OPEN', until: null };

  /** @type {NpdTag} */
  let byLaunch = { npd: false, basis: 'NO_BOM', until: null };
  if (parentLaunches.length > 0) {
    const launch = [...parentLaunches].sort()[0];
    const until = addDaysIso(launch, OSIP_ROP_READ.npdLaunchDays);
    byLaunch =
      today < until
        ? { npd: true, basis: 'WITHIN_LAUNCH_YEAR', until }
        : { npd: false, basis: 'LAUNCH_YEAR_PASSED', until };
  }

  /** @type {NpdTag} */
  let byHistory = { npd: false, basis: 'NO_BOM', until: null };
  if (parentFirstSales.length > 0) {
    const first = /** @type {string[]} */ (parentFirstSales.filter((d) => d !== null)).sort()[0];
    if (first === undefined) byHistory = { npd: true, basis: 'NO_HISTORY', until: null };
    else {
      const until = addDaysIso(first, OSIP_ROP_READ.npdHistoryWeeks * 7);
      byHistory =
        today < until
          ? { npd: true, basis: 'SHORT_HISTORY', until }
          : { npd: false, basis: 'FULL_HISTORY', until };
    }
  }

  return {
    firstOrderFulfilled: byOrder,
    oneYearAfterLaunch: byLaunch,
    '52WeeksHistory': byHistory
  };
}

/**
 * `d` (YYYY-MM-DD) plus `n` days, UTC.
 * @param {string} d
 * @param {number} n
 * @returns {string}
 */
function addDaysIso(d, n) {
  return new Date(Date.parse(`${d.slice(0, 10)}T00:00:00.000Z`) + n * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

// ─── The NPD observation ledger and the review task (DRC-12a) ────────────────

/**
 * One observation of a material's tag under the rule in force, stored with the
 * rule, its inputs and `RULES_VERSION` (DRC-D16). `dropped`: this row records
 * the tag dropping (NPD → not NPD) — the moment the review task is raised.
 * `levelRowsSeen`: how many planner level rows the material had then; a later
 * one closes the review (a count, not a time: the hub clock can stand still).
 * @typedef {{
 *   readonly materialCode: string;
 *   readonly npd: boolean;
 *   readonly rule: NpdRule;
 *   readonly dropped: boolean;
 *   readonly observedAt: string;
 *   readonly levelRowsSeen: number;
 *   readonly tag: import('./osipRules').Stamped<NpdTag>;
 * }} NpdObservation
 */

/**
 * DRC-12a — the rows an observation appends: a material seen for the first
 * time gets a baseline row (no task: a tag already dropped before the hub
 * watched it was never seen to drop); a material whose tag changed since its
 * last row gets a row, and a change from NPD to not NPD is a DROP. An
 * unchanged tag appends nothing, so one drop is one row however often the hub
 * looks.
 * @param {readonly NpdObservation[]} ledger
 * @param {ReadonlyMap<string, NpdTag>} current  The tag in force per material.
 * @param {NpdRule} rule
 * @param {string} at
 * @param {(materialCode: string, tag: NpdTag) => import('./osipRules').Stamped<NpdTag>} stampTag
 * @param {(materialCode: string) => number} levelRows  Planner level rows the material has now.
 * @returns {NpdObservation[]}
 */
export function npdObservations(ledger, current, rule, at, stampTag, levelRows) {
  /** @type {Map<string, NpdObservation>} */
  const last = new Map();
  for (const row of ledger) last.set(row.materialCode, row);
  /** @type {NpdObservation[]} */
  const out = [];
  for (const [materialCode, tag] of [...current.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const prev = last.get(materialCode);
    if (prev && prev.npd === tag.npd && prev.rule === rule) continue;
    out.push({
      materialCode,
      npd: tag.npd,
      rule,
      dropped: prev !== undefined && prev.npd && !tag.npd,
      observedAt: at,
      levelRowsSeen: levelRows(materialCode),
      tag: stampTag(materialCode, tag)
    });
  }
  return out;
}

/**
 * An open "Review ROP after first order" task.
 * @typedef {{ readonly materialCode: string; readonly droppedAt: string; readonly until: string | null }} NpdReview
 */

/**
 * DRC-12a — the open review tasks: each material's latest DROP row, closed by
 * a level row the planner recorded after it (setting or confirming the level
 * is the review's outcome, DRC-D11). A material whose tag rose again after the
 * drop has no open task.
 * @param {readonly NpdObservation[]} ledger
 * @param {(materialCode: string) => number} levelRows  Planner level rows the material has now.
 * @returns {NpdReview[]}
 */
export function openNpdReviews(ledger, levelRows) {
  /** @type {Map<string, NpdObservation>} */
  const last = new Map();
  for (const row of ledger) last.set(row.materialCode, row);
  return [...last.values()]
    .filter((row) => row.dropped)
    .filter((row) => levelRows(row.materialCode) <= row.levelRowsSeen)
    .map((row) => ({
      materialCode: row.materialCode,
      droppedAt: row.observedAt,
      until: row.tag.value.until
    }))
    .sort(
      (a, b) =>
        a.droppedAt.localeCompare(b.droppedAt) || a.materialCode.localeCompare(b.materialCode)
    );
}
