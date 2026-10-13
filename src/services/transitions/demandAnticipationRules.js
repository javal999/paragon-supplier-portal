// ─────────────────────────────────────────────────────────────────────────────
// DEMAND ANTICIPATION — CAP-10 (BL-179), SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10
// sections 2 to 4 (CAP-D10 to CAP-D13, CAP-D16).
//
// Per supplier × material × week, from the current hub week (CAP-D11):
//
//   share       = the supplier's share of the material's LTP over the share
//                 window (the 4 frozen weeks); an even split when the window
//                 carries no LTP for the material at all.
//   stock share = share × PTI stock on hand (SAP)   — whole units
//   ROP share   = share × PTI reorder point (SAP)   — whole units
//   start       = stock share − ROP share
//
//   start < 0 (below the reorder point): week 1 = LTP(1) + (ROP share − stock
//     share); every later week = its LTP.
//   start ≥ 0 (above it): the surplus is used up first, week by week:
//     figure(w) = max(0, LTP(w) − surplus left), and the surplus left falls by
//     LTP(w) until it reaches 0.
//
// Stock and reorder point are a stock POSITION, not a weekly flow, so they
// count once, in week 1 (brief §3). Open orders are not netted here: CAP-12
// compares supply with this figure, so netting them would count them twice.
//
// Freezing (CAP-D13; FIXED 4-WEEK HORIZONS, CAP-D17, owner 2026-10-13): weeks
// fall into consecutive horizons of `horizonWeeks` weeks, anchored on the
// first published horizon (the seed: W36–W39, then W40–W43, W44–W47, …), or
// on the current hub week while nothing is published (`horizonAnchor`).
// Publishing freezes the horizon that CONTAINS the current hub week, once
// (`currentHorizon`); it never freezes a future horizon, so the next one's
// weeks stay adjustable (CAP-11 absorbs into them). A week keeps the figure
// of the FIRST publication that froze it (BR-02). "Would be" is today's
// recomputation of a frozen week, shown beside it, read only (BR-03).
//
// Everything here is a pure function of its inputs and the hub clock's now:
// today's figure and "would be" are computed at read, never stored (law 0.5).
// Only a publication's frozen figures are stored, because freezing them is
// what a publication is.
//
// Every [Placeholder] value is in ONE block, `DEMAND_ANTICIPATION_RULES`, so
// Ary Hidayat's spike use case (brief §8) can change a value in one line.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { LtpLine } from './capacityRules' */
/** @import { PtiStockRecord } from './inventoryRules' */
/** @import { ActorAttribution } from '@lib/enforcement' */
import { groupWeekLtp } from './capacityRules';
import { addDays, dayOf, mondayOf } from './inventoryRules';

/**
 * [Placeholder, CAP-D16] — every value Ary's use case may change.
 *   · horizonWeeks:     CAP-10 BR-01 / CAP-D17 — the length of every fixed
 *                       horizon; a publication freezes the one that holds the
 *                       current hub week.
 *   · shareWindowWeeks: CAP-D11 — the weeks whose LTP decides each supplier's
 *                       share of the material's stock and reorder point.
 *   · shownWeeks:       how many weeks the page shows, from the current week.
 *   · consumptionSplit: CAP-11 / CAP-D14 — how a material's recorded weekly
 *                       consumption is shared across its suppliers:
 *                       'demandAnticipation' (each one's share of that week's
 *                       frozen demand anticipation) or 'even'.
 *   · unabsorbedAlertMinQty: CAP-11 BR-04 — the smallest excess left after the
 *                       next horizon that raises the planner's alert.
 * The excess is absorbed into the NEXT fixed horizon (weeks 5 to 8, BR-02 /
 * BR-03, CAP-D17), so its length is `horizonWeeks`, not a key of its own.
 */
export const DEMAND_ANTICIPATION_RULES = Object.freeze({
  horizonWeeks: 4,
  shareWindowWeeks: 4,
  shownWeeks: 13,
  consumptionSplit: /** @type {'demandAnticipation' | 'even'} */ ('demandAnticipation'),
  unabsorbedAlertMinQty: 1
});

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
 * CAP-D17 — the Monday the fixed horizons are counted from: the first
 * publication's horizon start (publications are kept oldest first), or the
 * current hub week while nothing is published.
 * @param {readonly { readonly horizonStart: string }[]} publications
 * @param {string} nowIso
 * @returns {string}
 */
export function horizonAnchor(publications, nowIso) {
  return publications[0]?.horizonStart ?? mondayOf(dayOf(nowIso));
}

/**
 * CAP-D17 — the fixed horizon that holds `week` (any Monday, before or after
 * the anchor): its `horizonWeeks` Mondays.
 * @param {string} anchor
 * @param {string} week
 * @returns {string[]}
 */
export function horizonContaining(anchor, week) {
  const n = DEMAND_ANTICIPATION_RULES.horizonWeeks;
  const weeksFromAnchor = Math.round(
    (Date.parse(`${week}T00:00:00Z`) - Date.parse(`${anchor}T00:00:00Z`)) / (7 * 86_400_000)
  );
  const first = addDays(anchor, Math.floor(weeksFromAnchor / n) * n * 7);
  return Array.from({ length: n }, (_, i) => addDays(first, i * 7));
}

/**
 * CAP-D17 — the horizon that contains the current hub week, and whether a
 * publication has already frozen it. Publishing freezes exactly this one,
 * once; a future horizon is never frozen ahead of its time.
 *
 * ⚠️ A SKIPPED HORIZON STAYS UNFROZEN. The hub clock can jump past a whole
 * horizon nobody published (the demo clock moves only through its test seam;
 * a real one moves while a planner is away). Publishing then freezes the
 * CURRENT horizon only: the skipped weeks are history by then, and freezing
 * them after the fact would invent a commitment nobody made at the time.
 * @param {readonly { readonly horizonStart: string }[]} publications
 * @param {string} nowIso
 * @returns {{ weeks: string[]; frozen: boolean; next: string[] }}
 */
export function currentHorizon(publications, nowIso) {
  const anchor = horizonAnchor(publications, nowIso);
  const weeks = horizonContaining(anchor, mondayOf(dayOf(nowIso)));
  const n = DEMAND_ANTICIPATION_RULES.horizonWeeks;
  return {
    weeks,
    frozen: publications.some((p) => p.horizonStart === weeks[0]),
    next: horizonContaining(anchor, addDays(weeks[0], n * 7))
  };
}

/**
 * What one week's figure came from. Stock share and ROP share are null when
 * SAP holds no PTI stock record for the material; the figure is then the LTP.
 * @typedef {{
 *   readonly ltp: number;
 *   readonly stockShare: number | null;
 *   readonly ropShare: number | null;
 * }} DemandAnticipationInputs
 */

/**
 * CAP-11 — what a week absorbs of an earlier horizon's excess (BR-05).
 * `fromHorizonStart`:  The Monday of the horizon the excess arose in.
 *
 * @typedef {{
 *   readonly qty: number;
 *   readonly fromHorizonStart: string;
 * }} DemandAnticipationAbsorbedStored
 */

/**
 * The absorption as the read shows it: with the source horizon's weeks.
 * @typedef {DemandAnticipationAbsorbedStored & {
 *   readonly fromWeeks: readonly string[];
 * }} DemandAnticipationAbsorbed
 */

/**
 * `absorbed`:  CAP-11 — set only on a figure already lowered by an absorption.
 *
 * @typedef {{
 *   readonly week: string;
 *   readonly qty: number;
 *   readonly inputs: DemandAnticipationInputs;
 *   readonly absorbed?: DemandAnticipationAbsorbedStored;
 * }} DemandAnticipationWeek
 */

/**
 * `share`:  The supplier's share of the material's LTP over the share window (0 to 1).
 * `stockOnRecord`:  Whether SAP holds a PTI stock record for the material.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly share: number;
 *   readonly stockOnRecord: boolean;
 *   readonly weeks: readonly DemandAnticipationWeek[];
 * }} DemandAnticipationSeries
 */

/**
 * Brief §3 — the formula for one supplier × material, week 1 first. Stock
 * and reorder point count once, in week 1.
 * @param {{
 *   readonly ltp: readonly number[];
 *   readonly stockShare: number | null;
 *   readonly ropShare: number | null;
 * }} input
 * @returns {number[]}
 */
export function demandAnticipationFigures({ ltp, stockShare, ropShare }) {
  const start = stockShare === null || ropShare === null ? 0 : stockShare - ropShare;
  if (start < 0) return ltp.map((l, i) => (i === 0 ? l - start : l));
  let surplus = start;
  return ltp.map((l) => {
    const qty = Math.max(0, l - surplus);
    surplus = Math.max(0, surplus - l);
    return qty;
  });
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
 * CAP-10 — the demand anticipation of every supplier × material the LTP
 * names, for `count` weeks from the current hub week, with each week's inputs.
 * @param {{
 *   readonly ltpLines: readonly LtpLine[];
 *   readonly ptiStock: readonly PtiStockRecord[];
 * }} input
 * @param {string} nowIso
 * @param {number} [count]
 * @returns {DemandAnticipationSeries[]}
 */
export function demandAnticipationWeeks(
  { ltpLines, ptiStock },
  nowIso,
  count = DEMAND_ANTICIPATION_RULES.shownWeeks
) {
  const weeks = hubWeeks(nowIso, Math.max(count, DEMAND_ANTICIPATION_RULES.shareWindowWeeks));
  const window = weeks.slice(0, DEMAND_ANTICIPATION_RULES.shareWindowWeeks);
  const shown = weeks.slice(0, count);
  /** @type {Map<string, string[]>} */
  const suppliersOf = new Map();
  for (const l of ltpLines) {
    const list = suppliersOf.get(l.materialCode) ?? [];
    if (!list.includes(l.supplierId)) suppliersOf.set(l.materialCode, [...list, l.supplierId]);
  }
  /** @type {DemandAnticipationSeries[]} */
  const out = [];
  for (const materialCode of [...suppliersOf.keys()].sort()) {
    const suppliers = [...(suppliersOf.get(materialCode) ?? [])].sort();
    const shares = materialShares(ltpLines, materialCode, suppliers, window);
    const stock = ptiStock.find((s) => s.materialCode === materialCode);
    for (const supplierId of suppliers) {
      const share = shares.get(supplierId) ?? 0;
      const stockShare = stock ? Math.round(share * stock.ptiSoh) : null;
      const ropShare = stock ? Math.round(share * stock.ptiRop) : null;
      const ltp = shown.map((w) => groupWeekLtp(ltpLines, supplierId, [materialCode], w));
      const figures = demandAnticipationFigures({ ltp, stockShare, ropShare });
      out.push({
        supplierId,
        materialCode,
        share,
        stockOnRecord: stock !== undefined,
        weeks: shown.map((week, i) => ({
          week,
          qty: figures[i],
          inputs: { ltp: ltp[i], stockShare, ropShare }
        }))
      });
    }
  }
  return out;
}

/**
 * One frozen figure of a publication.
 * `absorbed`:  CAP-11 — the excess this week froze with (its `qty` is already
 *   lowered by it), so the absorption is never taken twice.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly week: string;
 *   readonly qty: number;
 *   readonly inputs: DemandAnticipationInputs;
 *   readonly absorbed?: DemandAnticipationAbsorbedStored;
 * }} DemandAnticipationEntry
 */

/**
 * `source`:  `publish` — the planner's verb. `sampleSeed` — the one publication
 *   the sample data opens with, computed by `demandAnticipationWeeks` at the
 *   hub's present; nobody published it, and the page says so.
 * `actor`:  Who published it. The seed carries `UNATTRIBUTED`: no person acted.
 * `horizonWeeks`:  The weeks the publication froze at, from `horizonStart` (BR-01).
 * `entries`:  Only the weeks it froze FIRST; a week frozen earlier keeps that value.
 *
 * @typedef {{
 *   readonly id: string;
 *   readonly publishedAt: string;
 *   readonly actor: ActorAttribution;
 *   readonly source: 'publish' | 'sampleSeed';
 *   readonly horizonStart: string;
 *   readonly horizonWeeks: readonly string[];
 *   readonly entries: readonly DemandAnticipationEntry[];
 * }} DemandAnticipationPublication
 */

/**
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} week
 */
const entryKey = (supplierId, materialCode, week) => `${supplierId}|${materialCode}|${week}`;

/**
 * BR-02 / BR-04 — the figure a week is frozen at: the FIRST publication (in
 * publication order) holding it. Null while no publication has frozen it.
 * @param {readonly DemandAnticipationPublication[]} publications
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} week
 * @returns {{ entry: DemandAnticipationEntry; publication: DemandAnticipationPublication } | null}
 */
export function frozenEntryOf(publications, supplierId, materialCode, week) {
  for (const publication of publications) {
    const entry = publication.entries.find(
      (e) => e.supplierId === supplierId && e.materialCode === materialCode && e.week === week
    );
    if (entry) return { entry, publication };
  }
  return null;
}

/**
 * BR-01 / BR-02 — what a publication made now would freeze: every supplier ×
 * material × week of the horizon that no earlier publication froze, at
 * today's figure. Empty when the whole horizon is already frozen.
 * @param {readonly DemandAnticipationPublication[]} publications
 * @param {readonly DemandAnticipationSeries[]} today
 * @param {readonly string[]} horizon
 * @returns {DemandAnticipationEntry[]}
 */
export function entriesToFreeze(publications, today, horizon) {
  const frozen = new Set(
    publications.flatMap((p) =>
      p.entries.map((e) => entryKey(e.supplierId, e.materialCode, e.week))
    )
  );
  return today.flatMap((s) =>
    s.weeks
      .filter((w) => horizon.includes(w.week))
      .filter((w) => !frozen.has(entryKey(s.supplierId, s.materialCode, w.week)))
      .map((w) => ({
        supplierId: s.supplierId,
        materialCode: s.materialCode,
        week: w.week,
        qty: w.qty,
        inputs: w.inputs,
        // CAP-11 — a figure lowered by an absorption freezes with it.
        ...(w.absorbed ? { absorbed: w.absorbed } : {})
      }))
  );
}

/**
 * `qty`:  The figure in force: the frozen one in a frozen week, today's otherwise.
 * `published`:  The frozen figure, or null when the week is not frozen.
 * `wouldBe`:  Today's recomputation (BR-03); null when today names no LTP for the pair.
 * `delta`:  wouldBe − published in a frozen week; null otherwise.
 * `inputs`:  Today's inputs (LTP, stock share, ROP share); null as `wouldBe`.
 * `frozenBy`:  The publication that froze the week, with the inputs it froze.
 * `horizonStart`:  CAP-D17 — the first Monday of the fixed horizon the week belongs to.
 * `horizonFrozen`:  Whether a publication froze that horizon.
 * `consumption`:  CAP-11 — the supplier's share of the material's recorded
 *   consumption that week, or null when none is recorded.
 * `consumptionRecord`:  The record in force behind it: the material's figure, the
 *   supplier's share, the source and when it was recorded.
 * `absorbed`:  CAP-11 BR-05 — the excess of an earlier horizon this week absorbs.
 *
 * @typedef {{
 *   readonly week: string;
 *   readonly qty: number | null;
 *   readonly frozen: boolean;
 *   readonly published: number | null;
 *   readonly wouldBe: number | null;
 *   readonly delta: number | null;
 *   readonly inputs: DemandAnticipationInputs | null;
 *   readonly horizonStart: string;
 *   readonly horizonFrozen: boolean;
 *   readonly frozenBy: {
 *     readonly publicationId: string;
 *     readonly publishedAt: string;
 *     readonly source: DemandAnticipationPublication['source'];
 *     readonly inputs: DemandAnticipationInputs;
 *   } | null;
 *   readonly consumption: number | null;
 *   readonly consumptionRecord: {
 *     readonly materialQty: number;
 *     readonly share: number;
 *     readonly source: 'manual' | 'upload' | 'sap';
 *     readonly recordedAt: string;
 *     readonly recordId: string;
 *   } | null;
 *   readonly absorbed: DemandAnticipationAbsorbed | null;
 * }} DemandAnticipationWeekView
 */

/**
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly share: number | null;
 *   readonly stockOnRecord: boolean;
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
 * The page's rows: every supplier × material today's figures or a frozen
 * week name, over the shown weeks from the current hub week.
 * @param {readonly DemandAnticipationPublication[]} publications
 * @param {readonly DemandAnticipationSeries[]} today
 * @param {string} nowIso
 * @returns {DemandAnticipationRowCore[]}
 */
export function demandAnticipationRows(publications, today, nowIso) {
  const shown = hubWeeks(nowIso, DEMAND_ANTICIPATION_RULES.shownWeeks);
  const anchor = horizonAnchor(publications, nowIso);
  const publishedStarts = new Set(publications.map((p) => p.horizonStart));
  /** @param {string} week */
  const horizonOfWeek = (week) => horizonContaining(anchor, week)[0];
  const pairs = new Map(today.map((s) => [`${s.supplierId}|${s.materialCode}`, s]));
  /** @type {Map<string, { supplierId: string; materialCode: string }>} */
  const keys = new Map(
    today.map((s) => [
      `${s.supplierId}|${s.materialCode}`,
      { supplierId: s.supplierId, materialCode: s.materialCode }
    ])
  );
  for (const p of publications)
    for (const e of p.entries)
      if (shown.includes(e.week) && !keys.has(`${e.supplierId}|${e.materialCode}`))
        keys.set(`${e.supplierId}|${e.materialCode}`, {
          supplierId: e.supplierId,
          materialCode: e.materialCode
        });
  return [...keys.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { supplierId, materialCode }]) => {
      const series = pairs.get(key);
      return {
        supplierId,
        materialCode,
        share: series ? series.share : null,
        stockOnRecord: series ? series.stockOnRecord : false,
        weeks: shown.map((week) => {
          const now = series?.weeks.find((w) => w.week === week) ?? null;
          const hit = frozenEntryOf(publications, supplierId, materialCode, week);
          const wouldBe = now ? now.qty : null;
          const published = hit ? hit.entry.qty : null;
          return {
            week,
            qty: hit ? published : wouldBe,
            frozen: hit !== null,
            published,
            wouldBe,
            delta: hit && wouldBe !== null ? wouldBe - hit.entry.qty : null,
            inputs: now ? now.inputs : null,
            horizonStart: horizonOfWeek(week),
            horizonFrozen: publishedStarts.has(horizonOfWeek(week)),
            frozenBy: hit
              ? {
                  publicationId: hit.publication.id,
                  publishedAt: hit.publication.publishedAt,
                  source: hit.publication.source,
                  inputs: hit.entry.inputs
                }
              : null,
            // CAP-11 — filled by `rowsInForce` (consumptionRules).
            consumption: null,
            consumptionRecord: null,
            absorbed: null
          };
        })
      };
    });
}

/**
 * The publish verb's refusal, or null when it may proceed.
 *   · NOTHING_TO_FREEZE — the current horizon is already frozen (CAP-D17:
 *     once), or holds no figure to freeze.
 *   · STALE_HORIZON — the confirm named another horizon than the current one
 *     (the hub week moved into the next horizon while it was open).
 * @param {unknown} horizonStart
 * @param {{ readonly weeks: readonly string[]; readonly frozen: boolean }} horizon
 * @param {number} toFreeze
 * @returns {'STALE_HORIZON' | 'NOTHING_TO_FREEZE' | null}
 */
export function publishRefusal(horizonStart, horizon, toFreeze) {
  if (horizon.frozen || toFreeze === 0) return 'NOTHING_TO_FREEZE';
  if (horizonStart !== horizon.weeks[0]) return 'STALE_HORIZON';
  return null;
}
