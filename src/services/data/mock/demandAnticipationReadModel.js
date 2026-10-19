// ────────────────────────────────────────────────────────────────────────────
// DRC-2 (BL-188) and DRC-4 (BL-190) — the rolling demand anticipation read
// model over the mock stores.
//
// ONE place gathers the inputs and hands them to the pure rules
// (`demandAnticipationRules`, which call `osipRules.js`), so the read service,
// the publish target and its policy hook see the same figures:
//   · LTP — every current forecast version's lines (`allCommitmentLines`),
//     spread by day per week (`groupWeekLtp`), as capacity and CAP-9 read it;
//   · SOH — the supplier's share of PTI's stock on hand (`PTI_STOCK`), as the
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
//   · recorded consumption — `consumptionStore` (CAP-11, kept).
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
import { consumptionStore } from './stores/consumptionStore';
import { callOffStore } from './stores/callOffStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { allCommitmentLines } from './forecastReadModel';
import { engineDataset } from './fixtures/engineDataset';
import { PTI_STOCK } from './fixtures/inventoryHub';
import { supplierNameOf } from './inventoryReadModel';
import { demandAnticipationStore } from './stores/demandAnticipationStore';

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
 * Every pair the LTP names, over enough weeks for its horizon plus one.
 * @param {string} nowIso
 * @returns {DemandAnticipationPair[]}
 */
function pairsAt(nowIso) {
  const input = { ltpLines: allCommitmentLines(null), ptiStock: PTI_STOCK };
  const first = demandAnticipationPairs(input, nowIso, DEMAND_ANTICIPATION_RULES.shownWeeks);
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
    : demandAnticipationPairs(input, nowIso, longest + 1);
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
  return pairsAt(nowIso).map((p) => {
    const chain = chainFor(publications, p.supplierId, p.materialCode, planningWeek);
    /** @param {string} week */
    const calledOff = (week) => supply.get(`${p.supplierId}|${p.materialCode}|${week}`) ?? 0;
    const src = sourceOf(p.supplierId, p.materialCode);
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
        ospr: null
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
