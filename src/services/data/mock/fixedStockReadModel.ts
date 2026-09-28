// ────────────────────────────────────────────────────────────────────────────
// REQ-E06-04 — the fixed stock (FS) reconcile read model over the mock stores.
//
// Gathers the three records the reconcile compares and hands them to the pure
// rule (`transitions/fixedStockReconcile`). Nothing computed here is stored.
//
//   · Committed: for every period, the standing commitment in the LATEST
//     forecast version whose horizon covers that period — so a period that has
//     left the current version (it has passed) keeps the commitment it ended
//     with. A version that covers the period but no longer carries a supplier's
//     line (demand moved) leaves that supplier nothing committed.
//   · Called off: the call-off store (REQ-E09-03).
//   · Held: the stock submissions (REQ-E08-02), oldest first by the store's own
//     recency, so the last matching one is the figure the Stock page shows.
// ────────────────────────────────────────────────────────────────────────────

import type { ForecastCommitmentLine } from '../types';
import { declarationRecency } from '../../sdc';
import { materialEntry } from '../../sdc/materialMaster';
import { sdcClock } from '../../sdc/clock';
import { dayOf } from '../../engine/dates';
import { buildCommitmentLines, streamVersions } from '../../transitions/forecastRules';
import { buildFixedStockReconcile, type FsRow } from '../../transitions/fixedStockReconcile';
import {
  FS_RECONCILE_CYCLE_ANCHOR,
  FS_RECONCILE_CYCLE_WEEKS,
  agreedMaxStock,
} from '../../transitions/forecastConfig';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { forecastVersionStore } from './stores/forecastHubStores';
import { callOffStore } from './stores/callOffStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { STREAMS, forecastSupplierName, qualifiedSuppliers } from './forecastReadModel';

/** Every period's standing commitment line, from the latest version covering it. */
export function standingCommitmentLines(): ForecastCommitmentLine[] {
  const out: ForecastCommitmentLine[] = [];
  for (const stream of STREAMS) {
    const versions = streamVersions(forecastVersionStore.all(), stream);
    const byPeriod = new Map<string, ForecastCommitmentLine[]>();
    versions.forEach((_, i) => {
      const lines = buildCommitmentLines({
        publications: versions.slice(0, i + 1),
        responses: requirementResponseStore.all(),
        master: materialEntry,
        supplierName: forecastSupplierName,
        draftsFor: null,
        qualifiedSuppliers,
      });
      const covered = new Map<string, ForecastCommitmentLine[]>();
      for (const l of lines) covered.set(l.periodBucket, [...(covered.get(l.periodBucket) ?? []), l]);
      for (const [period, ls] of covered) byPeriod.set(period, ls);
    });
    for (const ls of byPeriod.values()) out.push(...ls);
  }
  return out;
}

/** REQ-E06-04 — every supplier × material × cycle row, on the hub clock. */
export function allFixedStockRows(nowIso: string = sdcClock.now()): FsRow[] {
  const stock = [...inventoryDeclarationStore.all()].sort((a, b) => declarationRecency(a) - declarationRecency(b));
  return buildFixedStockReconcile({
    commitments: standingCommitmentLines(),
    callOffs: callOffStore.all(),
    stock,
    maxStock: agreedMaxStock,
    asOf: dayOf(nowIso),
    anchor: FS_RECONCILE_CYCLE_ANCHOR,
    cycleWeeks: FS_RECONCILE_CYCLE_WEEKS,
  });
}
