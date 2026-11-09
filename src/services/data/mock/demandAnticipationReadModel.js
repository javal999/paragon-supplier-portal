// ────────────────────────────────────────────────────────────────────────────
// DRC-2 (BL-188) and DRC-4 (BL-190) — the rolling demand anticipation read
// model over the mock stores.
//
// ONE place gathers the inputs and hands them to the pure rules
// (`demandAnticipationRules`, which call `osipRules.js`), so the read service,
// the publish target and its policy hook see the same figures:
//   · LTP — every current forecast version's lines (`allCommitmentLines`),
//     spread by day per week (`groupWeekLtp`), as capacity and CAP-9 read it;
//   · SOH — the supplier's share of PTI's stock on hand (`ptiStockStore`, BL-199), as the
//     page computed it before (CAP-D11);
//   · lead time and MPQ — the pair's source in the engine dataset:
//     `leadTimeBreakdown(...).totalWeeks` (DRC-6, BL-192) and `orderMultiple`
//     (MPQ = orderMultiple until the master data feed carries MPQ, wave 2
//     default);
//   · call-offs — released call-offs by need-date week (`openSupplyIndex`,
//     CAP-12's own classification);
//   · OSPO — open PO quantity not yet called off: the balance of the pair's
//     blanket lines (`blanketBalances`, CAP-12), the chain's start when the
//     previous planning week was not published;
//   · the previous planning week's publication — OSPO and additional PO (the
//     chain, [Default A9]) and the remainders it carried;
//   · OSPR and the last 4 weeks of sales orders per supplier × material — the
//     hub holds neither (PRs carry no material code; sales orders are per FG
//     SKU), so both are passed as null and every figure is flagged;
//   · recorded consumption — `consumptionStore` (CAP-11, kept), split by LTP
//     share (BL-211);
//   · BL-210 — the supplier's consumption share, MOQ and koli as ROP Order's
//     safety order reads them (`osipSafetySizes`), so the week-1 safety order
//     is ROP Order's under every `sdSource` and `safetyRounding` variant.
// Today's figures and "would be" are computed here at read, never stored.
// ────────────────────────────────────────────────────────────────────────────

/** @import { DemandAnticipationPair, DemandAnticipationPublication, DemandAnticipationRow, PairFigure, RollingDaInputs, UnabsorbedExcess } from '../../transitions/demandAnticipationRules' */
import { NO_PERSON } from '@context/noPerson';
import { SDC_SIMULATED_NOW, materialEntry, sdcClock } from '../../sdc';
import { leadTimeBreakdown } from '../../engine/leadTimeSteps';
import {
  DEMAND_ANTICIPATION_RULES,
  chainFor,
  demandAnticipationPairs,
  demandAnticipationRows,
  entriesOf,
  hubWeeks,
  pairKey,
  publicationOf,
  rollingDaFigure,
  unabsorbedOf
} from '../../transitions/demandAnticipationRules';
import { withConsumption } from '../../transitions/consumptionRules';
import { blanketBalances, openSupplyIndex } from '../../transitions/supplyBelowDemandRules';
import { addDays } from '../../transitions/inventoryRules';
import { groupWeekLtp } from '../../transitions/capacityRules';
import { horizonWeeksOf } from '../../transitions/osipRules';
import {
  ltpWeeks,
  materialLtpInputs,
  protectionForRopOrder
} from '../../transitions/ltpInputRules';
import { ltpInputStore } from './stores/ltpInputStore';
import { consumptionStore } from './stores/consumptionStore';
import { callOffStore } from './stores/callOffStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { allCommitmentLines } from './forecastReadModel';
import { engineDataset } from './fixtures/engineDataset';
import { ptiStockStore } from './stores/ptiStockStore';
import { supplierNameOf } from './inventoryReadModel';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { osipSafetySizes } from './osipSafetyReadModel';
/** @import { SupplierDaRowCore } from '../../transitions/supplierDaView' */
import { supplierDaRows } from '../../transitions/supplierDaView';

/**
 * The pair's source in the engine dataset (lead time, MPQ), or undefined.
 * @param {string} supplierId
 * @param {string} materialCode
 */
const sourceOf = (supplierId, materialCode) =>
  engineDataset().sources.find(
    (s) => s.supplierId === supplierId && s.materialCode === materialCode
  );

/**
 * DRC-2 BR-01 — the pair's lead time in weeks (DRC-6), or null with no source.
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {number | null}
 */
export function leadTimeWeeksOf(supplierId, materialCode) {
  const src = sourceOf(supplierId, materialCode);
  return src ? leadTimeBreakdown(src).totalWeeks : null;
}

/**
 * BL-267 (PEX-5) — the pair's LTP weeks: the three series, the chosen one (DA
 * reads it, BR-04) and the buffers. `source` is the forecast spread by week.
 * @param {{ supplierId: string; materialCode: string; share: number }} p
 * @param {readonly string[]} weeks
 * @param {readonly import('../../transitions/capacityRules').LtpLine[]} lines
 */
export function ltpWeeksOf(p, weeks, lines) {
  const source = weeks.map((w) => groupWeekLtp(lines, p.supplierId, [p.materialCode], w));
  const inputs = materialLtpInputs(ltpInputStore.all(), p.materialCode);
  return { ...ltpWeeks(weeks, source, inputs, p.share), hasUpload: inputs.hasUpload, inputs };
}

/**
 * Every pair the LTP names, over enough weeks for its horizon plus one.
 * @param {string} nowIso
 * @returns {DemandAnticipationPair[]}
 */
function pairsAt(nowIso) {
  const input = { ltpLines: allCommitmentLines(null), ptiStock: ptiStockStore.combined() };
  // BL-267 — a material with uploaded LTP inputs reads the chosen series (BR-04).
  /** @param {DemandAnticipationPair[]} pairs */
  const withChosen = (pairs) =>
    pairs.map((p) => {
      const lw = ltpWeeksOf(p, p.weeks, input.ltpLines);
      return lw.hasUpload ? { ...p, ltp: [...lw.used] } : p;
    });
  const first = withChosen(
    demandAnticipationPairs(input, nowIso, DEMAND_ANTICIPATION_RULES.shownWeeks)
  );
  const longest = Math.max(
    0,
    ...first.map(
      (p) =>
        leadTimeWeeksOf(p.supplierId, p.materialCode) ??
        DEMAND_ANTICIPATION_RULES.fallbackHorizonWeeks
    )
  );
  return longest + 1 <= DEMAND_ANTICIPATION_RULES.shownWeeks
    ? first
    : withChosen(demandAnticipationPairs(input, nowIso, longest + 1));
}

/**
 * The inputs of every pair's figure for the planning week of `nowIso`.
 * @param {readonly DemandAnticipationPublication[]} publications
 * @param {string} nowIso
 * @param {ReadonlySet<string> | null} agreed  The agreements to compute with; null
 *   = the ones the publication in force for the planning week recorded.
 * @returns {(DemandAnticipationPair & { inputs: RollingDaInputs })[]}
 */
function pairInputs(publications, nowIso, agreed) {
  const planningWeek = hubWeeks(nowIso, 1)[0];
  const pos = purchaseOrderStore.all();
  const callOffs = callOffStore.all();
  const supply = openSupplyIndex(callOffs);
  const sizes = osipSafetySizes(nowIso);
  const lines = allCommitmentLines(null);
  return pairsAt(nowIso).map((p) => {
    const chain = chainFor(publications, p.supplierId, p.materialCode, planningWeek);
    /** @param {string} week */
    const calledOff = (week) => supply.get(`${p.supplierId}|${p.materialCode}|${week}`) ?? 0;
    const src = sourceOf(p.supplierId, p.materialCode);
    // BL-210 — ROP Order's own consumption, MOQ and koli; none for a pair with no source.
    const size = sizes.get(pairKey(p.supplierId, p.materialCode));
    // BL-267 (PEX-5 BR-06) — LTP B − LTP A, added to ROP Order only, when B is given.
    const lw = ltpWeeksOf(p, p.weeks, lines);
    const horizon = horizonWeeksOf(
      (src ? leadTimeBreakdown(src).totalWeeks : null) ??
        DEMAND_ANTICIPATION_RULES.fallbackHorizonWeeks
    );
    const protection = lw.inputs.uploads.B ? protectionForRopOrder(lw, horizon) : 0;
    return {
      ...p,
      inputs: {
        weeks: p.weeks,
        ltp: p.ltp,
        leadTimeWeeks: src ? leadTimeBreakdown(src).totalWeeks : null,
        mpq: src ? src[DEMAND_ANTICIPATION_RULES.mpqField] : 0,
        soh: p.soh,
        ospoOpen: blanketBalances(pos, callOffs, p.supplierId, p.materialCode).reduce(
          (n, l) => n + l.balance,
          0
        ),
        previous: chain.previous,
        callOffPrev: calledOff(addDays(planningWeek, -7)),
        carries: chain.carries,
        callOff: calledOff(planningWeek),
        agreedFirstOutside: agreed
          ? agreed.has(pairKey(p.supplierId, p.materialCode))
          : chain.agreedFirstOutside,
        // [Default A8b] — the hub holds no sales-order quantity per supplier × material.
        salesOrderQty4w: null,
        // The hub's PRs carry no material code: no open PR quantity per pair.
        ospr: null,
        ...(protection > 0 ? { protectionBuffer: protection } : {}),
        ...(size
          ? { consumption: size.consumption, moq: size.moq, koli: size.koli, z: size.z }
          : {})
      }
    };
  });
}

/**
 * Every pair's figure for the planning week.
 * @param {readonly DemandAnticipationPublication[]} publications
 * @param {string} nowIso
 * @param {ReadonlySet<string> | null} [agreed]
 * @returns {(PairFigure & DemandAnticipationPair)[]}
 */
function figuresAt(publications, nowIso, agreed = null) {
  return pairInputs(publications, nowIso, agreed).map((p) => ({
    ...p,
    figure: rollingDaFigure(p.inputs)
  }));
}

/**
 * What the publish verb and its policy hook read: the planning week, today's
 * remainders (an agreement needs one), the publication in force for the week,
 * and the figures a publication with `agreed` would store.
 * @param {readonly string[]} agreed
 * @param {string} [nowIso]
 */
export function demandAnticipationToPublish(agreed, nowIso = sdcClock.now()) {
  const publications = demandAnticipationStore.all();
  const planningWeek = hubWeeks(nowIso, 1)[0];
  const today = figuresAt(publications, nowIso);
  return {
    planningWeek,
    remainders: new Map(
      today.map((f) => [pairKey(f.supplierId, f.materialCode), f.figure.remainder])
    ),
    inForce: publicationOf(publications, planningWeek),
    figures: figuresAt(publications, nowIso, new Set(agreed))
  };
}

// The seed (store header): one publication of the hub's present planning
// week, computed by the same function the verb stores with. Nobody published it.
demandAnticipationStore.useSeeder(() => {
  // The hub's declared present, not the clock at the first read.
  const now = SDC_SIMULATED_NOW;
  const figures = figuresAt([], now);
  return figures.length === 0
    ? null
    : {
        publishedAt: now,
        actor: NO_PERSON,
        source: 'sampleSeed',
        planningWeek: hubWeeks(now, 1)[0],
        agreedFirstOutside: [],
        entries: entriesOf(figures)
      };
});

/**
 * The page's rows: the figure in force, today's recomputation, the weeks and
 * the recorded consumption.
 * @param {string} [nowIso]
 * @returns {DemandAnticipationRow[]}
 */
export function allDemandAnticipation(nowIso = sdcClock.now()) {
  const publications = demandAnticipationStore.all();
  const lines = allCommitmentLines(null);
  /** @param {string} supplierId */
  const nameOf = (supplierId) =>
    lines.find((l) => l.supplierId === supplierId)?.supplierName ?? supplierNameOf(supplierId);
  const pairs = figuresAt(publications, nowIso).map((f) => ({ ...f, today: f.figure }));
  return withConsumption(
    demandAnticipationRows(publications, pairs, hubWeeks(nowIso, 1)[0]),
    consumptionStore.all()
  ).map((r) => {
    const entry = materialEntry(r.materialCode);
    return {
      ...r,
      supplierName: nameOf(r.supplierId),
      materialLabel: entry?.label ?? r.materialCode,
      uom: entry?.canonicalUom ?? ''
    };
  });
}

/**
 * DRC-4 / DRC-B7 — the surpluses the figure in force could not absorb in the
 * last week of the horizon (the planner's alert).
 * @param {string} [nowIso]
 * @returns {UnabsorbedExcess[]}
 */
export function demandAnticipationUnabsorbed(nowIso = sdcClock.now()) {
  return unabsorbedOf(allDemandAnticipation(nowIso));
}

/**
 * BL-204 (DRC-1) — one supplier view row: the latest publication's figure for
 * the pair, with names for the page.
 * @typedef {SupplierDaRowCore & {
 *   readonly supplierName: string;
 *   readonly materialLabel: string;
 *   readonly uom: string;
 * }} SupplierDaRow
 */

/**
 * BL-204 (DRC-1) — every pair's published DA as a supplier may read it (the
 * service narrows it to the reader). Stored figures only: the same numbers the
 * planner's page shows as published for the pair.
 * @returns {SupplierDaRow[]}
 */
export function supplierDemandAnticipation() {
  return supplierDaRows(demandAnticipationStore.all()).map((r) => {
    const entry = materialEntry(r.materialCode);
    return {
      ...r,
      supplierName: supplierNameOf(r.supplierId),
      materialLabel: entry?.label ?? r.materialCode,
      uom: entry?.canonicalUom ?? ''
    };
  });
}

/**
 * BL-204 (DRC-8) — the published DA a supplier confirms as Incoming DA for one
 * pair, or undefined when no publication holds the pair.
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {SupplierDaRowCore | undefined}
 */
export function incomingDaFor(supplierId, materialCode) {
  return supplierDaRows(demandAnticipationStore.all()).find(
    (r) => r.supplierId === supplierId && r.materialCode === materialCode
  );
}

/**
 * BL-267 (PEX-5 BR-03) — what the DA grid adds to a row: the three LTP series
 * per week, the chosen one, the buffers and where each came from.
 * `byWeek` is keyed by the row's week Monday.
 * @typedef {{
 *   readonly choice: import('../../transitions/ltpInputRules').LtpSeries;
 *   readonly hasUpload: boolean;
 *   readonly aFromUpload: boolean;
 *   readonly strategicFromFestive: boolean;
 *   readonly protectionFromB: boolean;
 *   readonly flags: readonly string[];
 *   readonly uploads: Readonly<Record<'A' | 'Festive' | 'B', { readonly sourceFile: string; readonly setAt: string } | null>>;
 *   readonly byWeek: Readonly<Record<string, {
 *     readonly a: number;
 *     readonly festive: number | null;
 *     readonly b: number | null;
 *     readonly used: number;
 *     readonly strategicBuffer: number | null;
 *     readonly protectionBuffer: number | null;
 *   }>>;
 * }} RowLtpInputs
 */

/**
 * Adds `ltpInputs` to each DA row (BL-267). Read only.
 * @template {{ supplierId: string; materialCode: string; share: number | null; weeks: readonly { week: string }[] }} R
 * @param {readonly R[]} rows
 * @returns {(R & { readonly ltpInputs: RowLtpInputs })[]}
 */
export function withLtpInputsRead(rows) {
  const lines = allCommitmentLines(null);
  return rows.map((r) => {
    const weeks = r.weeks.map((w) => w.week);
    const lw = ltpWeeksOf({ ...r, share: r.share ?? 0 }, weeks, lines);
    /** @param {'A' | 'Festive' | 'B'} s */
    const meta = (s) => {
      const u = lw.inputs.uploads[s];
      return u && u.sourceFile !== null ? { sourceFile: u.sourceFile, setAt: u.setAt } : null;
    };
    return {
      ...r,
      ltpInputs: {
        choice: lw.choice,
        hasUpload: lw.hasUpload,
        aFromUpload: lw.aFromUpload,
        strategicFromFestive: lw.inputs.uploads.Festive !== null,
        protectionFromB: lw.inputs.uploads.B !== null,
        flags: lw.flags,
        uploads: { A: meta('A'), Festive: meta('Festive'), B: meta('B') },
        byWeek: Object.fromEntries(
          weeks.map((w, i) => [
            w,
            {
              a: lw.a[i],
              festive: lw.festive[i],
              b: lw.b[i],
              used: lw.used[i],
              strategicBuffer: lw.strategicBuffer[i],
              protectionBuffer: lw.protectionBuffer[i]
            }
          ])
        )
      }
    };
  });
}
