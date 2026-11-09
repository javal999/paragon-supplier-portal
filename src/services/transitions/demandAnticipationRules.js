// ─────────────────────────────────────────────────────────────────────────────
// ROLLING DEMAND ANTICIPATION — DRC-2 (BL-188) and the PLAN VS EXECUTION CHECK
// — DRC-4 (BL-190), SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10 §3, with build
// decisions DRC-B1, DRC-B6 and DRC-B7 (§6a). Reworks CAP-10 (BL-179) under
// DRC-D13: the publication store, the page and the consumption record are kept;
// the fixed 4-week horizons (CAP-D17), the LTP + ROP − SOH formula (CAP-D12)
// and absorbing over weeks 5 to 8 (CAP-11 BR-02/03) are superseded.
//
// Per supplier × material, for the planning week (the current hub week):
//
//   horizon   = the pair's lead time in weeks, rounded up (DRC-2 BR-01), read
//               from `leadTimeBreakdown` (DRC-6). It rolls: next week's
//               planning week starts one week later.
//   DA(w)     = LTP(w) + carried in, plus the safety order in week 1
//               [Default A1] — `rollingDaWeek` (BR-02 to BR-05).
//   OSPO      = chained from the previous planning week's publication [Default
//               A9, DRC-B1]; with no publication of that week, the chain starts
//               from the hub's open PO quantity not yet called off.
//   ROP Order = cycle stock + safety order [Default B9]; PR generated =
//               −(ROP Order − SOH − OSPO − OSPR) (DRC-4 AC-01).
//   check     = Total DA − (SOH + OSPO + OSPR + PR) [Default A2] — `planCheck`
//               (DRC-4 BR-01). A surplus is absorbed in the last week of the
//               horizon, never below 0 [DRC-B7]; a shortfall is a PR
//               recommendation the planner raises in SAP. The hub posts nothing.
//
// Every formula is `osipRules.js`'s (design rule 1): this module only gathers
// inputs, calls it, and shapes the result for the publication and the page.
//
// PUBLISHING. A publication is the record of what was sent for ONE planning
// week, each pair's figure stamped with its inputs and `RULES_VERSION`
// (DRC-D16). Publishing again in the same week appends a newer record that
// supersedes the earlier one at read; both stay stored (DRC-3 history). The
// next planning week's publication rolls forward: it chains OSPO and the new
// PO from this one and reads the remainders it carried.
//
// CARRY-OVER. A positive remainder goes to the last week of the horizon. It
// goes to the first week OUTSIDE the horizon only when the planner recorded the
// supplier's agreement for that pair and planning week [Owner A8]; the record
// is part of the publish act (its payload), so it has an actor, a time and an
// audit event. The carry-over limit [Default A8b] needs sales-order quantity per
// supplier × material, which the hub does not hold: no limit is applied, and
// every figure says so.
//
// Today's figures and "would be" are computed at read (law 0.5). Only a
// publication's figures are stored, because recording them is what a
// publication is.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { LtpLine } from './capacityRules' */
/** @import { PtiStockRecord } from './inventoryRules' */
/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { Carry, DaWeek, OsipRules, Stamped } from './osipRules' */
/** @import { DaCause, LedgerMark } from './daCauseRules' */
import { groupWeekLtp } from './capacityRules';
import { addDays, dayOf, mondayOf } from './inventoryRules';
import {
  OSIP_RULES,
  cycleStock,
  horizonWeeksOf,
  planCheck,
  prGenerated,
  ropOrder,
  rollingDaWeek,
  safetyOrder,
  stamp
} from './osipRules';
import { rulesForMaterial } from './osipParams';

/**
 * BL-211 — how a material's recorded consumption is split across its suppliers.
 * @typedef {'ltpShare' | 'demandAnticipation' | 'even'} ConsumptionSplit
 */

/**
 * The page's and the read model's own values. Every formula value is a key of
 * `OSIP_RULES` (osipRules.js); these are the ones that only say where an input
 * comes from or how much the page shows.
 *   · shareWindowWeeks: CAP-D11 (kept) — the weeks whose LTP decides each
 *                       supplier's share of PTI's stock on hand (the SOH share
 *                       the plan check reads).
 *   · shownWeeks:       how many weeks the page shows from the current week; it
 *                       grows to the horizon plus one when a lead time is longer.
 *   · consumptionSplit: BL-211 (owner ruling 2026-10-19) — how a material's
 *                       recorded consumption is shared across its suppliers:
 *                       `ltpShare` (in force) by each one's LTP share over the
 *                       share window (CAP-D11, `materialShares`), the split the
 *                       OSIP safety figures, DRC-18 and the sandbox use;
 *                       `demandAnticipation` by each one's demand anticipation
 *                       that week (CAP-D14); or `even`.
 *   · unabsorbedAlertMinQty: the smallest surplus the last week cannot take
 *                       (DRC-B7 "unabsorbed") that raises the planner's alert.
 *   · mpqField:         [Default, wave 2] MPQ = orderMultiple until the master
 *                       data feed carries MPQ (wave 2 default). The safety order
 *                       rounds up to it [Default B4].
 *   · fallbackHorizonWeeks: the horizon of a pair with no lead time on record,
 *                       flagged `LEAD_TIME_MISSING` on every figure.
 */
export const DEMAND_ANTICIPATION_RULES = Object.freeze({
  shareWindowWeeks: 4,
  shownWeeks: 13,
  // BL-211 owner ruling 2026-10-19: the LTP share everywhere (CAP-D11).
  consumptionSplit: /** @type {ConsumptionSplit} */ ('ltpShare'),
  unabsorbedAlertMinQty: 1,
  // MPQ = orderMultiple until the master data feed carries MPQ (wave 2 default).
  mpqField: /** @type {'orderMultiple'} */ ('orderMultiple'),
  fallbackHorizonWeeks: 4
});

/**
 * Design rule 5 — the [Default] questions a rolling figure is built on, for the
 * "Provisional" label: A8b (carry-over limit), A9 (OSPO chain). A1 (safety
 * order in week 1) is confirmed and A2 (the check against Total OSPO) answered
 * and ruled [Team, 2026-10-28; owner ruling 2026-10-28], so both left.
 */
export const DA_PROVISIONAL_QUESTIONS = Object.freeze(['A8b', 'A9']);

/**
 * The Mondays from the current hub week.
 * @param {string} nowIso
 * @param {number} count
 * @returns {string[]}
 */
export function hubWeeks(nowIso, count) {
  const first = mondayOf(dayOf(nowIso));
  return Array.from({ length: count }, (_, i) => addDays(first, i * 7));
}

/**
 * CAP-D11 — each supplier's share of one material's LTP over the share window.
 * A window with no LTP for the material splits it evenly.
 * @param {readonly LtpLine[]} ltpLines
 * @param {string} materialCode
 * @param {readonly string[]} suppliers
 * @param {readonly string[]} windowWeeks
 * @returns {Map<string, number>}
 */
export function materialShares(ltpLines, materialCode, suppliers, windowWeeks) {
  const sums = suppliers.map((s) =>
    windowWeeks.reduce((n, w) => n + groupWeekLtp(ltpLines, s, [materialCode], w), 0)
  );
  const total = sums.reduce((a, b) => a + b, 0);
  return new Map(suppliers.map((s, i) => [s, total > 0 ? sums[i] / total : 1 / suppliers.length]));
}

/**
 * One supplier × material the LTP names, with its weekly LTP from the current
 * hub week and its share of PTI's stock on hand.
 * `soh`:  share × PTI stock on hand (SAP), whole units; null with no stock record.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly share: number;
 *   readonly soh: number | null;
 *   readonly weeks: readonly string[];
 *   readonly ltp: readonly number[];
 * }} DemandAnticipationPair
 */

/**
 * Every supplier × material the LTP names, `count` weeks from the current week.
 * @param {{ readonly ltpLines: readonly LtpLine[]; readonly ptiStock: readonly PtiStockRecord[] }} input
 * @param {string} nowIso
 * @param {number} count
 * @returns {DemandAnticipationPair[]}
 */
export function demandAnticipationPairs({ ltpLines, ptiStock }, nowIso, count) {
  const weeks = hubWeeks(nowIso, Math.max(count, DEMAND_ANTICIPATION_RULES.shareWindowWeeks));
  const window = weeks.slice(0, DEMAND_ANTICIPATION_RULES.shareWindowWeeks);
  const shown = weeks.slice(0, count);
  /** @type {Map<string, string[]>} */
  const suppliersOf = new Map();
  for (const l of ltpLines) {
    const list = suppliersOf.get(l.materialCode) ?? [];
    if (!list.includes(l.supplierId)) suppliersOf.set(l.materialCode, [...list, l.supplierId]);
  }
  /** @type {DemandAnticipationPair[]} */
  const out = [];
  for (const materialCode of [...suppliersOf.keys()].sort()) {
    const suppliers = [...(suppliersOf.get(materialCode) ?? [])].sort();
    const shares = materialShares(ltpLines, materialCode, suppliers, window);
    const stock = ptiStock.find((s) => s.materialCode === materialCode);
    for (const supplierId of suppliers) {
      const share = shares.get(supplierId) ?? 0;
      out.push({
        supplierId,
        materialCode,
        share,
        soh: stock ? Math.round(share * stock.ptiSoh) : null,
        weeks: shown,
        ltp: shown.map((w) => groupWeekLtp(ltpLines, supplierId, [materialCode], w))
      });
    }
  }
  return out;
}

// ─── One pair's rolling figure (DRC-2) and check (DRC-4) ────────────────────

/**
 * Why a figure is not built on the data the rule names. Each one shows on the
 * page beside the figure.
 *   · LEAD_TIME_MISSING — no lead time on record: the horizon is the fallback.
 *   · NO_STOCK_RECORD — SAP holds no PTI stock for the material: SOH counts 0.
 *   · OSPO_FROM_STORE — no publication of the previous planning week: the
 *     OSPO chain starts from the open PO quantity not yet called off.
 *   · OSPR_NOT_AVAILABLE — the hub's PRs carry no material code: OSPR counts 0.
 *   · CARRY_LIMIT_NO_SALES_ORDERS — no sales-order quantity per supplier ×
 *     material: the carry-over limit [Default A8b] is not applied.
 * Plus `rollingDaWeek`'s own flags (CARRY_FIRST_OUTSIDE_NOT_AGREED,
 * CARRY_FIRST_OUTSIDE_WEEK_MISSING, CARRY_OVER_LIMIT).
 * @typedef {| 'LEAD_TIME_MISSING'
 *   | 'NO_STOCK_RECORD'
 *   | 'OSPO_FROM_STORE'
 *   | 'OSPR_NOT_AVAILABLE'
 *   | 'CARRY_LIMIT_NO_SALES_ORDERS'
 *   | string} RollingDaFlag
 */

/**
 * The inputs of one pair's figure, all of them stored with a publication.
 * `weeks` / `ltp`:  From the planning week, at least the horizon plus one week.
 * `leadTimeWeeks`:  `leadTimeBreakdown(...).totalWeeks`; null when no lead time is on record.
 * `mpq`:  The safety order's rounding size (`mpqField`).
 * `soh`:  PTI's SOH share; null with no stock record.
 * `ospoOpen`:  Open PO quantity not yet called off (the chain's start).
 * `previous`:  The previous planning week's published OSPO and additional PO, or null.
 * `callOffPrev`:  Released call-offs needed in the previous planning week.
 * `carries`:  Remainders earlier planning weeks moved forward.
 * `callOff`:  Released call-offs needed in the planning week.
 * `agreedFirstOutside`:  The planner recorded the supplier's agreement [Owner A8].
 * `salesOrderQty4w`:  Sales-order quantity of the last 4 weeks [Default A8b]; null when the hub holds none.
 * `ospr`:  Open PR quantity; null when the hub holds none.
 * `consumption` / `moq` / `koli`:  BL-210 — what ROP Order's safety order also
 *   reads (`osipSafetySizes`): the supplier's share of recorded weekly
 *   consumption (oldest first), MOQ and units per pallet. With them the
 *   week-1 safety order is ROP Order's under `sdSource: 'consumption12w'` and
 *   `safetyRounding: 'koli' | 'moq'`; absent, those variants read none.
 * `sd`:  BL-210 — a typed SD (the sandbox's); absent or null, it is computed.
 * `z`:  [Team B3] the material's own Z (`osipParams`); absent or null, the rules'.
 * `protectionBuffer`:  BL-267 (PEX-5 BR-06) — LTP B − LTP A summed over the horizon, added to ROP Order only; absent, 0.
 *
 * @typedef {{
 *   readonly weeks: readonly string[];
 *   readonly ltp: readonly number[];
 *   readonly leadTimeWeeks: number | null;
 *   readonly mpq: number;
 *   readonly soh: number | null;
 *   readonly ospoOpen: number;
 *   readonly previous: { readonly ospo: number; readonly additionalPo: number } | null;
 *   readonly callOffPrev: number;
 *   readonly carries: readonly Carry[];
 *   readonly callOff: number;
 *   readonly agreedFirstOutside: boolean;
 *   readonly salesOrderQty4w: number | null;
 *   readonly ospr: number | null;
 *   readonly consumption?: readonly number[];
 *   readonly moq?: number;
 *   readonly koli?: number | null;
 *   readonly sd?: number | null;
 *   readonly z?: number | null;
 *   readonly protectionBuffer?: number;
 * }} RollingDaInputs
 */

/**
 * One pair's rolling figure for the planning week, with the check.
 * `weeks`:  `rollingDaWeek`'s weeks (LTP, safety, carried in, DA) over the horizon.
 * `daInForce`:  DA per horizon week after the check absorbed a surplus in the last week (DRC-B7).
 * `carryTarget`:  Where the remainder went; `carry` is null when nothing was carried.
 * `pr`:  The PR quantity ZPE007 would generate from ROP Order (−PR generated, never below 0).
 *
 * @typedef {{
 *   readonly planningWeek: string;
 *   readonly horizonWeeks: readonly string[];
 *   readonly leadTimeWeeks: number;
 *   readonly weeks: readonly DaWeek[];
 *   readonly daInForce: readonly number[];
 *   readonly totalDa: number;
 *   readonly safetyOrder: number;
 *   readonly cycleStock: number;
 *   readonly ropOrder: number;
 *   readonly protectionBuffer: number;
 *   readonly soh: number;
 *   readonly ospo: number;
 *   readonly ospr: number;
 *   readonly pr: number;
 *   readonly supply: number;
 *   readonly supplyBasis: OsipRules['planCheckBasis'];
 *   readonly gap: number;
 *   readonly prRecommendation: number;
 *   readonly absorbedLastWeek: number;
 *   readonly unabsorbed: number;
 *   readonly additionalPo: number;
 *   readonly callOff: number;
 *   readonly remainder: number;
 *   readonly carry: Carry | null;
 *   readonly uncarried: number;
 *   readonly carries: readonly Carry[];
 *   readonly carryTarget: 'lastWeek' | 'firstOutside';
 *   readonly firstOutsideWeek: string | null;
 *   readonly flags: readonly RollingDaFlag[];
 * }} RollingDaFigure
 */

/**
 * DRC-2 + DRC-4 — one pair's figure for the planning week `weeks[0]`. Every
 * formula is `osipRules.js`'s; this only feeds it.
 * @param {RollingDaInputs} input
 * @param {OsipRules} [rules]
 * @returns {RollingDaFigure}
 */
export function rollingDaFigure(input, rules = OSIP_RULES) {
  /** @type {RollingDaFlag[]} */
  const flags = [];
  if (input.leadTimeWeeks === null) flags.push('LEAD_TIME_MISSING');
  // DRC-2 BR-01 — the horizon is the lead time in weeks.
  const n = horizonWeeksOf(input.leadTimeWeeks ?? DEMAND_ANTICIPATION_RULES.fallbackHorizonWeeks);
  const weeks = input.weeks.slice(0, n + 1);
  const ltp = input.ltp.slice(0, n + 1);
  // DRC-7 BR-01 — the safety order [Default B1–B4]; MPQ per `mpqField`.
  // BL-210 — with ROP Order's consumption, MOQ and koli (and a typed SD), so
  // every `sdSource` and `safetyRounding` variant gives ROP Order's figure.
  // [Team B2] the 13-week SD reads past the horizon, so the whole LTP goes in.
  const safety = safetyOrder(
    {
      ltp: input.ltp,
      leadTimeWeeks: n,
      mpq: input.mpq,
      ...(input.moq !== undefined ? { moq: input.moq } : {}),
      ...(input.koli !== undefined && input.koli !== null ? { koli: input.koli } : {}),
      ...(input.consumption !== undefined ? { consumption: input.consumption } : {}),
      ...(typeof input.sd === 'number' ? { sd: input.sd } : {})
    },
    // [Team B3] the material's own Z, when set.
    rulesForMaterial(rules, { z: input.z })
  ).value;
  if (input.soh === null) flags.push('NO_STOCK_RECORD');
  const soh = input.soh ?? 0;
  if (input.previous === null) flags.push('OSPO_FROM_STORE');
  if (input.ospr === null) flags.push('OSPR_NOT_AVAILABLE');
  const ospr = input.ospr ?? 0;
  if (input.salesOrderQty4w === null) flags.push('CARRY_LIMIT_NO_SALES_ORDERS');

  // DRC-2 BR-02 to BR-05 [Default A1, A9; Owner A8; DRC-B1, DRC-B6].
  const da = rollingDaWeek(
    {
      weeks,
      ltp,
      leadTimeWeeks: n,
      safetyOrder: safety,
      carries: input.carries,
      // The chain [Default A9]: from the previous planning week's publication,
      // else from the open PO quantity with nothing to subtract or add.
      ospoPrev: input.previous ? input.previous.ospo : input.ospoOpen,
      callOffPrev: input.previous ? input.callOffPrev : 0,
      newPoPrev: input.previous ? input.previous.additionalPo : 0,
      callOff: input.callOff,
      // [Owner A8] — outside the horizon only with the recorded agreement.
      carryTo: input.agreedFirstOutside ? 'firstOutside' : 'lastWeek',
      supplierAgreedFirstOutside: input.agreedFirstOutside,
      carryOverLimit: input.salesOrderQty4w ?? undefined
    },
    rules
  );
  flags.push(...da.flags);

  // DRC-10 / [Default B9] — ROP Order; DRC-4 AC-01 — PR generated.
  const cycle = cycleStock(ltp, n);
  const protection = input.protectionBuffer ?? 0;
  const rop = ropOrder({ cycleStock: cycle, safetyOrder: safety, protectionBuffer: protection });
  const pr = Math.max(0, -prGenerated({ ropOrder: rop, soh, ospo: da.ospo, ospr }));
  // DRC-4 BR-01 / BR-02 [Default A2; DRC-B7].
  const check = planCheck(
    { daWeeks: da.weeks.map((w) => w.da), soh, ospo: da.ospo, ospr, pr },
    rules
  );
  /** @type {'lastWeek' | 'firstOutside'} */
  const carryTarget =
    input.agreedFirstOutside && !da.flags.includes('CARRY_FIRST_OUTSIDE_WEEK_MISSING')
      ? 'firstOutside'
      : 'lastWeek';
  return {
    planningWeek: weeks[0],
    horizonWeeks: weeks.slice(0, n),
    leadTimeWeeks: n,
    weeks: da.weeks,
    daInForce: check.daWeeks,
    totalDa: check.totalDa,
    safetyOrder: safety,
    cycleStock: cycle,
    ropOrder: rop,
    protectionBuffer: protection,
    soh,
    ospo: da.ospo,
    ospr,
    pr,
    supply: check.supply,
    // [Team A2] what `supply` sums; SOH, OSPR and PR stay on the figure as context.
    supplyBasis: rules.planCheckBasis,
    gap: check.gap,
    prRecommendation: check.prRecommendation,
    absorbedLastWeek: check.absorbedLastWeek,
    unabsorbed: check.unabsorbed,
    additionalPo: da.additionalPo,
    callOff: da.callOff,
    remainder: da.remainder,
    carry: da.carry,
    uncarried: da.uncarried,
    carries: da.carries,
    carryTarget,
    firstOutsideWeek: weeks[n] ?? null,
    flags
  };
}

// ─── Publications ───────────────────────────────────────────────────────────

/**
 * One pair's published figure: the figure stamped with its inputs and the
 * rules version (DRC-D16).
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly figure: Stamped<RollingDaFigure>;
 *   readonly causes?: readonly DaCause[];
 * }} DemandAnticipationEntry
 */

/**
 * `source`:  `publish` — the planner's verb. `sampleSeed` — the one publication
 *   the sample data opens with, computed by the same function at the hub's
 *   present; nobody published it, and the page says so.
 * `actor`:  Who published it. The seed carries `UNATTRIBUTED`: no person acted.
 * `planningWeek`:  The Monday of the planning week it records (DRC-2 BR-01).
 * `agreedFirstOutside`:  The pairs (`supplierId|materialCode`) whose supplier
 *   agreed to take the remainder in the first week outside the horizon [Owner A8].
 * `entries`:  Every pair's figure for that planning week; with BL-268 (PEX-6 BR-02), the causes since the previous publication.
 * `ledgerMark`:  BL-268 — how many rows the LTP input and OSIP value ledgers held when it was made.
 *
 * @typedef {{
 *   readonly id: string;
 *   readonly publishedAt: string;
 *   readonly actor: ActorAttribution;
 *   readonly source: 'publish' | 'sampleSeed';
 *   readonly planningWeek: string;
 *   readonly agreedFirstOutside: readonly string[];
 *   readonly entries: readonly DemandAnticipationEntry[];
 *   readonly ledgerMark?: LedgerMark;
 * }} DemandAnticipationPublication
 */

/**
 * @param {string} supplierId
 * @param {string} materialCode
 */
export const pairKey = (supplierId, materialCode) => `${supplierId}|${materialCode}`;

/**
 * The publication in force for a planning week: the LATEST one recording it
 * (publications are kept oldest first). Null when none does.
 * @param {readonly DemandAnticipationPublication[]} publications
 * @param {string} planningWeek
 * @returns {DemandAnticipationPublication | null}
 */
export function publicationOf(publications, planningWeek) {
  for (let i = publications.length - 1; i >= 0; i -= 1)
    if (publications[i].planningWeek === planningWeek) return publications[i];
  return null;
}

/**
 * @param {DemandAnticipationPublication | null} publication
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {DemandAnticipationEntry | null}
 */
export function entryOf(publication, supplierId, materialCode) {
  return (
    publication?.entries.find(
      (e) => e.supplierId === supplierId && e.materialCode === materialCode
    ) ?? null
  );
}

/**
 * What the planning week reads from earlier publications for one pair:
 *   · `previous` — the previous planning week's published OSPO and additional
 *     PO (the chain, [Default A9]); null when that week was not published.
 *   · `carries` — the remainders the latest earlier publication moved forward,
 *     into this planning week or later.
 *   · `agreedFirstOutside` — whether the publication in force for THIS planning
 *     week recorded the supplier's agreement for the pair.
 * @param {readonly DemandAnticipationPublication[]} publications
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} planningWeek
 * @returns {{ previous: { ospo: number; additionalPo: number } | null; carries: Carry[]; agreedFirstOutside: boolean }}
 */
export function chainFor(publications, supplierId, materialCode, planningWeek) {
  const prevEntry = entryOf(
    publicationOf(publications, addDays(planningWeek, -7)),
    supplierId,
    materialCode
  );
  const earlier = [...publications]
    .reverse()
    .find((p) => p.planningWeek < planningWeek && entryOf(p, supplierId, materialCode) !== null);
  const earlierEntry = earlier ? entryOf(earlier, supplierId, materialCode) : null;
  const current = publicationOf(publications, planningWeek);
  return {
    previous: prevEntry
      ? { ospo: prevEntry.figure.value.ospo, additionalPo: prevEntry.figure.value.additionalPo }
      : null,
    carries: (earlierEntry?.figure.value.carries ?? []).filter((c) => c.week >= planningWeek),
    agreedFirstOutside: current
      ? current.agreedFirstOutside.includes(pairKey(supplierId, materialCode))
      : false
  };
}

/**
 * Two figures are the same publication when every stored number and week is.
 * @param {RollingDaFigure} a
 * @param {RollingDaFigure} b
 */
export const sameFigure = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly inputs: RollingDaInputs;
 *   readonly figure: RollingDaFigure;
 *   readonly causes?: readonly DaCause[];
 * }} PairFigure
 */

/**
 * Design rule 3 / DRC-D16 — the entries a publication stores.
 * @param {readonly PairFigure[]} figures
 * @returns {DemandAnticipationEntry[]}
 */
export function entriesOf(figures) {
  return figures.map((f) => ({
    supplierId: f.supplierId,
    materialCode: f.materialCode,
    figure: stamp(f.figure, f.inputs),
    ...(f.causes ? { causes: f.causes } : {})
  }));
}

/**
 * The publish verb's refusal, or null when it may proceed.
 *   · STALE_WEEK — the confirm named another planning week than the current
 *     one (the hub week moved on while it was open).
 *   · BAD_AGREEMENT — `agreedFirstOutside` is not a list of pairs on the page
 *     with a remainder to carry. An agreement is recorded only where something
 *     moves [Owner A8].
 *   · NOTHING_TO_PUBLISH — no supplier × material has an LTP.
 *   · NOTHING_CHANGED — the publication in force for this week already holds
 *     these figures and these agreements.
 * @param {{ readonly planningWeek?: unknown; readonly agreedFirstOutside?: unknown }} payload
 * @param {{
 *   readonly planningWeek: string;
 *   readonly remainders: ReadonlyMap<string, number>;
 *   readonly inForce: DemandAnticipationPublication | null;
 *   readonly figures: readonly PairFigure[];
 * }} ctx  `remainders` per pair key at today's figures; `figures` computed with the payload's agreements.
 * @returns {'STALE_WEEK' | 'BAD_AGREEMENT' | 'NOTHING_TO_PUBLISH' | 'NOTHING_CHANGED' | null}
 */
export function publishRefusal(payload, ctx) {
  if (payload.planningWeek !== ctx.planningWeek) return 'STALE_WEEK';
  const agreed = payload.agreedFirstOutside ?? [];
  if (
    !Array.isArray(agreed) ||
    agreed.some((k) => typeof k !== 'string' || !((ctx.remainders.get(k) ?? 0) > 0))
  )
    return 'BAD_AGREEMENT';
  if (ctx.figures.length === 0) return 'NOTHING_TO_PUBLISH';
  const inForce = ctx.inForce;
  if (
    inForce &&
    [...inForce.agreedFirstOutside].sort().join(',') === [...agreed].sort().join(',') &&
    inForce.entries.length === ctx.figures.length &&
    ctx.figures.every((f) => {
      const e = entryOf(inForce, f.supplierId, f.materialCode);
      return e !== null && sameFigure(e.figure.value, f.figure);
    })
  )
    return 'NOTHING_CHANGED';
  return null;
}

// ─── The read ───────────────────────────────────────────────────────────────

/**
 * One week of a row as the page shows it.
 * `inHorizon`:  The week is in the horizon of the figure in force.
 * `qty`:  Demand anticipation in force: the published figure when the planning
 *   week is published, today's otherwise; after the check's absorption. Null
 *   outside the horizon.
 * `published`:  The published figure, or null.
 * `wouldBe`:  Today's recomputation; null outside today's horizon.
 * `delta`:  wouldBe − published when both exist.
 * `inputs`:  The week's LTP, safety order and carried-in remainders (of the figure in force).
 * `absorbed`:  DRC-4 BR-02 — the surplus the last week absorbed (0 elsewhere).
 * `publishedBy`:  The publication behind `published`.
 * `consumption` / `consumptionRecord`:  CAP-11 (kept) — filled by `withConsumption`.
 *
 * @typedef {{
 *   readonly week: string;
 *   readonly inHorizon: boolean;
 *   readonly qty: number | null;
 *   readonly published: number | null;
 *   readonly wouldBe: number | null;
 *   readonly delta: number | null;
 *   readonly inputs: {
 *     readonly ltp: number;
 *     readonly safety: number;
 *     readonly carriedIn: readonly { readonly qty: number; readonly fromWeek: string }[];
 *   };
 *   readonly absorbed: number;
 *   readonly publishedBy: {
 *     readonly publicationId: string;
 *     readonly publishedAt: string;
 *     readonly source: DemandAnticipationPublication['source'];
 *   } | null;
 *   readonly consumption: number | null;
 *   readonly consumptionRecord: {
 *     readonly materialQty: number;
 *     readonly share: number;
 *     readonly source: 'manual' | 'upload' | 'sap';
 *     readonly recordedAt: string;
 *     readonly recordId: string;
 *   } | null;
 * }} DemandAnticipationWeekView
 */

/**
 * `plan`:  The figure in force (published, or today's); `planSource` says which.
 * `today`:  Today's recomputation.
 * `changed`:  Today's figure differs from the published one, or the week is not published.
 * `agreedFirstOutside`:  The agreement in force for this planning week.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly share: number | null;
 *   readonly stockOnRecord: boolean;
 *   readonly planningWeek: string;
 *   readonly plan: RollingDaFigure;
 *   readonly planSource: 'published' | 'today';
 *   readonly today: RollingDaFigure;
 *   readonly changed: boolean;
 *   readonly agreedFirstOutside: boolean;
 *   readonly publishedBy: DemandAnticipationWeekView['publishedBy'];
 *   readonly weeks: readonly DemandAnticipationWeekView[];
 * }} DemandAnticipationRowCore
 */

/**
 * One row of the read (`getDemandAnticipation`): the core with names for the page.
 * @typedef {DemandAnticipationRowCore & {
 *   readonly supplierName: string;
 *   readonly materialLabel: string;
 *   readonly uom: string;
 * }} DemandAnticipationRow
 */

/**
 * The page's rows: per pair, the figure in force, today's recomputation and
 * the shown weeks.
 * @param {readonly DemandAnticipationPublication[]} publications
 * @param {readonly (DemandAnticipationPair & { readonly today: RollingDaFigure })[]} pairs
 * @param {string} planningWeek
 * @returns {DemandAnticipationRowCore[]}
 */
export function demandAnticipationRows(publications, pairs, planningWeek) {
  const pub = publicationOf(publications, planningWeek);
  return [...pairs]
    .sort((a, b) =>
      pairKey(a.supplierId, a.materialCode).localeCompare(pairKey(b.supplierId, b.materialCode))
    )
    .map((p) => {
      const entry = entryOf(pub, p.supplierId, p.materialCode);
      const published = entry ? entry.figure.value : null;
      const plan = published ?? p.today;
      /** @type {DemandAnticipationWeekView['publishedBy']} */
      const publishedBy =
        pub && entry
          ? { publicationId: pub.id, publishedAt: pub.publishedAt, source: pub.source }
          : null;
      return {
        supplierId: p.supplierId,
        materialCode: p.materialCode,
        share: p.share,
        stockOnRecord: p.soh !== null,
        planningWeek,
        plan,
        planSource: published ? 'published' : 'today',
        today: p.today,
        changed: published === null || !sameFigure(published, p.today),
        agreedFirstOutside: pub
          ? pub.agreedFirstOutside.includes(pairKey(p.supplierId, p.materialCode))
          : false,
        publishedBy,
        weeks: p.weeks.map((week, i) => {
          const at = plan.horizonWeeks.indexOf(week);
          const todayAt = p.today.horizonWeeks.indexOf(week);
          const pubAt = published ? published.horizonWeeks.indexOf(week) : -1;
          const pubQty = published && pubAt >= 0 ? published.daInForce[pubAt] : null;
          const wouldBe = todayAt >= 0 ? p.today.daInForce[todayAt] : null;
          const w = at >= 0 ? plan.weeks[at] : null;
          return {
            week,
            inHorizon: at >= 0,
            qty: at >= 0 ? plan.daInForce[at] : null,
            published: pubQty,
            wouldBe,
            delta: pubQty !== null && wouldBe !== null ? wouldBe - pubQty : null,
            inputs: {
              ltp: w ? w.ltp : (p.ltp[i] ?? 0),
              safety: w ? w.safety : 0,
              carriedIn: w ? w.carriedIn : []
            },
            absorbed: at >= 0 && at === plan.horizonWeeks.length - 1 ? plan.absorbedLastWeek : 0,
            publishedBy: pubQty !== null ? publishedBy : null,
            consumption: null,
            consumptionRecord: null
          };
        })
      };
    });
}

/**
 * DRC-4 / DRC-B7 — a surplus the last week of the horizon could not take.
 * `fromWeeks`:  The horizon whose surplus it is.
 * `intoWeeks`:  The week that absorbed what it could (the horizon's last).
 * `excess`:  The whole surplus (supply − Total DA).
 * `remaining`:  What the last week could not take.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly fromWeeks: readonly string[];
 *   readonly intoWeeks: readonly string[];
 *   readonly excess: number;
 *   readonly remaining: number;
 * }} UnabsorbedExcess
 */

/**
 * The surpluses the figure in force could not absorb, for the planner's alert.
 * @param {readonly DemandAnticipationRowCore[]} rows
 * @returns {UnabsorbedExcess[]}
 */
export function unabsorbedOf(rows) {
  return rows.flatMap((r) =>
    r.plan.unabsorbed > 0
      ? [
          {
            supplierId: r.supplierId,
            materialCode: r.materialCode,
            fromWeeks: r.plan.horizonWeeks,
            intoWeeks: r.plan.horizonWeeks.slice(-1),
            excess: -r.plan.gap,
            remaining: r.plan.unabsorbed
          }
        ]
      : []
  );
}
