// ────────────────────────────────────────────────────────────────────────────
// CAP-10 — the demand anticipation read model over the mock stores.
//
// ONE place gathers the inputs and hands them to the pure rules
// (`demandAnticipationRules`), so the read service, the publish target and
// its policy hook see the same figures:
//   · the LTP — every current forecast version's lines (`allCommitmentLines`),
//     spread by day per week (`groupWeekLtp`), as capacity and CAP-9 read it;
//   · PTI stock on hand and reorder point — SAP's (`PTI_STOCK`), read by
//     material code exactly as `buildInventoryPositions` reads it;
//   · the publications — `demandAnticipationStore`;
//   · CAP-11 — the recorded consumption (`consumptionStore`): the excess of a
//     frozen horizon is absorbed into the next one's open weeks, so the figure
//     in force (`qty`) and what a publication freezes both carry it.
// Today's figures and "would be" are computed here at read, never stored.
// ────────────────────────────────────────────────────────────────────────────

/** @import { DemandAnticipationRow } from '../../transitions/demandAnticipationRules' */
/** @import { DemandAnticipationEntry, DemandAnticipationSeries } from '../../transitions/demandAnticipationRules' */
/** @import { AbsorptionPlan } from '../../transitions/consumptionRules' */
import { NO_PERSON } from '@context/noPerson';
import { SDC_SIMULATED_NOW, materialEntry, sdcClock } from '../../sdc';
import {
  demandAnticipationRows,
  demandAnticipationWeeks,
  entriesToFreeze,
  currentHorizon,
  hubWeeks
} from '../../transitions/demandAnticipationRules';
import { absorptionPlan, rowsInForce, seriesInForce } from '../../transitions/consumptionRules';
import { consumptionStore } from './stores/consumptionStore';
import { allCommitmentLines } from './forecastReadModel';
import { PTI_STOCK } from './fixtures/inventoryHub';
import { supplierNameOf } from './inventoryReadModel';
import { demandAnticipationStore } from './stores/demandAnticipationStore';

/**
 * Today's demand anticipation per supplier × material, from the current hub week.
 * @param {string} [nowIso]
 * @returns {DemandAnticipationSeries[]}
 */
export function todaysDemandAnticipation(nowIso = sdcClock.now()) {
  return demandAnticipationWeeks(
    { ltpLines: allCommitmentLines(null), ptiStock: PTI_STOCK },
    nowIso
  );
}

/**
 * CAP-11 — the consumption shares, the absorption per week and what stays
 * unabsorbed, over the publications, today's figures and the recorded
 * consumption.
 * @param {string} [nowIso]
 * @returns {AbsorptionPlan}
 */
export function demandAnticipationAbsorption(nowIso = sdcClock.now()) {
  return absorptionPlan(
    {
      publications: demandAnticipationStore.all(),
      today: todaysDemandAnticipation(nowIso),
      records: consumptionStore.all()
    },
    nowIso
  );
}

/**
 * CAP-D17 — the fixed horizon holding the current hub week, and the figures a
 * publication made now would freeze in it: none once it is frozen (once only).
 * Published part-way through, a horizon freezes the weeks from the current
 * week on; its weeks already past are history and are not frozen afterwards.
 * @param {string} [nowIso]
 * @returns {{ horizon: ReturnType<typeof currentHorizon>; entries: DemandAnticipationEntry[] }}
 */
export function demandAnticipationToFreeze(nowIso = sdcClock.now()) {
  const publications = demandAnticipationStore.all();
  const horizon = currentHorizon(publications, nowIso);
  const fromNow = hubWeeks(nowIso, 1)[0];
  return {
    horizon,
    entries: horizon.frozen
      ? []
      : entriesToFreeze(
          publications,
          // CAP-11 — the figure in force: today's, less what each week absorbs.
          seriesInForce(todaysDemandAnticipation(nowIso), demandAnticipationAbsorption(nowIso)),
          horizon.weeks.filter((w) => w >= fromNow)
        )
  };
}

// The seed (store header): one publication at the hub's present, computed by
// the same function the verb freezes with. Nobody published it.
demandAnticipationStore.useSeeder(() => {
  // The hub's declared present, not the clock at the first read: a test that
  // moves the clock before anything reads the store still opens on W36–W39.
  const now = SDC_SIMULATED_NOW;
  // Nothing published yet: the anchor is the current hub week (CAP-D17).
  const horizon = currentHorizon([], now).weeks;
  const entries = entriesToFreeze([], todaysDemandAnticipation(now), horizon);
  return entries.length === 0
    ? null
    : {
        publishedAt: now,
        actor: NO_PERSON,
        source: 'sampleSeed',
        horizonStart: horizon[0],
        horizonWeeks: horizon,
        entries
      };
});

/**
 * The page's rows: frozen figures, "would be" and today's inputs per week.
 * @param {string} [nowIso]
 * @returns {DemandAnticipationRow[]}
 */
export function allDemandAnticipation(nowIso = sdcClock.now()) {
  const lines = allCommitmentLines(null);
  /** @param {string} supplierId */
  const nameOf = (supplierId) =>
    lines.find((l) => l.supplierId === supplierId)?.supplierName ?? supplierNameOf(supplierId);
  return rowsInForce(
    demandAnticipationRows(demandAnticipationStore.all(), todaysDemandAnticipation(nowIso), nowIso),
    demandAnticipationAbsorption(nowIso)
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
