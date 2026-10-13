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
//   · the publications — `demandAnticipationStore`.
// Today's figures and "would be" are computed here at read, never stored.
// ────────────────────────────────────────────────────────────────────────────

/** @import { DemandAnticipationRow } from '../../transitions/demandAnticipationRules' */
/** @import { DemandAnticipationEntry, DemandAnticipationSeries } from '../../transitions/demandAnticipationRules' */
import { NO_PERSON } from '@context/noPerson';
import { materialEntry, sdcClock } from '../../sdc';
import {
  demandAnticipationRows,
  demandAnticipationWeeks,
  entriesToFreeze,
  nextHorizon,
  publishedWeeks
} from '../../transitions/demandAnticipationRules';
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
 * BR-01 / BR-02 / AC-02 — the horizon a publication made now would freeze
 * (null when the next one is already frozen) and the figures it would add.
 * @param {string} [nowIso]
 * @returns {{ horizon: string[] | null; entries: DemandAnticipationEntry[] }}
 */
export function demandAnticipationToFreeze(nowIso = sdcClock.now()) {
  const publications = demandAnticipationStore.all();
  const horizon = nextHorizon(publishedWeeks(publications), nowIso);
  return {
    horizon,
    entries: horizon ? entriesToFreeze(publications, todaysDemandAnticipation(nowIso), horizon) : []
  };
}

// The seed (store header): one publication at the hub's present, computed by
// the same function the verb freezes with. Nobody published it.
demandAnticipationStore.useSeeder(() => {
  const now = sdcClock.now();
  const horizon = /** @type {string[]} */ (nextHorizon([], now));
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
  return demandAnticipationRows(
    demandAnticipationStore.all(),
    todaysDemandAnticipation(nowIso),
    nowIso
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
