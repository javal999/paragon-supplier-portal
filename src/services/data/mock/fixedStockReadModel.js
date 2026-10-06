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
//   · Called off: the call-off store (REQ-E09-03), classified by the call-off
//     rules: the deliveries both sides agreed count (the accepted confirmation,
//     else what both last agreed); a call-off awaiting the supplier, or a
//     counter-offer awaiting the planner, is pending (owner, 2026-09-29).
//   · Held: the stock submissions (REQ-E08-02), oldest first by the store's own
//     recency, so the last matching one is the figure the Stock page shows.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CallOff, ForecastCommitmentLine } from '../types' */
import { declarationRecency } from '../../sdc';
import { materialEntry } from '../../sdc/materialMaster';
import { sdcClock } from '../../sdc/clock';
import { dayOf } from '../../engine/dates';
import { buildCommitmentLines, streamVersions } from '../../transitions/forecastRules';
/** @import { FsCallOffInput, FsRow } from '../../transitions/fixedStockReconcile' */
import { buildFixedStockReconcile } from '../../transitions/fixedStockReconcile';
import { FS_RECONCILE_CYCLE_ANCHOR, fsReconcileCycleWeeks } from '../../transitions/forecastConfig';
import { isAwaitingApproval, isConfirmedAndAccepted } from '../../transitions/callOffRules';
import { maxStockFor } from '../../transitions/maxStock';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { forecastVersionStore } from './stores/forecastHubStores';
import { callOffStore } from './stores/callOffStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { STREAMS, forecastSupplierName, qualifiedSuppliers } from './forecastReadModel';

/**
 * Every period's standing commitment line, from the latest version covering it.
 * @returns {ForecastCommitmentLine[]}
 */
export function standingCommitmentLines() {
  /** @type {ForecastCommitmentLine[]} */
  const out = [];
  for (const stream of STREAMS) {
    const versions = streamVersions(forecastVersionStore.all(), stream);
    const byPeriod = /** @type {Map<string, ForecastCommitmentLine[]>} */ (new Map());
    versions.forEach((_, i) => {
      const lines = buildCommitmentLines({
        publications: versions.slice(0, i + 1),
        responses: requirementResponseStore.all(),
        master: materialEntry,
        supplierName: forecastSupplierName,
        draftsFor: null,
        qualifiedSuppliers
      });
      const covered = /** @type {Map<string, ForecastCommitmentLine[]>} */ (new Map());
      for (const l of lines)
        covered.set(l.periodBucket, [...(covered.get(l.periodBucket) ?? []), l]);
      for (const [period, ls] of covered) byPeriod.set(period, ls);
    });
    for (const ls of byPeriod.values()) out.push(...ls);
  }
  return out;
}

/**
 * REQ-E06-04 BR-04 — a call-off as the reconcile reads it. Agreed deliveries:
 * the supplier's confirmation once accepted, else the deliveries both sides
 * last agreed (a planner's change to an accepted call-off keeps them until the
 * change is confirmed). Pending: awaiting the supplier's confirmation, or a
 * counter-offer awaiting the planner. Drafts, dismissed drafts and rejected
 * call-offs carry nothing.
 * @param {CallOff} c
 * @returns {FsCallOffInput}
 */
export function reconcileCallOff(c) {
  const agreed =
    c.confirmation && isConfirmedAndAccepted(c)
      ? c.confirmation.deliveries
      : c.agreedDeliveries && c.agreedDeliveries.length > 0 && c.status === 'Awaiting Confirmation'
        ? c.agreedDeliveries
        : [];
  /** @type {FsCallOffInput['pending']} */
  const pending =
    agreed.length > 0
      ? null
      : c.status === 'Awaiting Confirmation'
        ? 'supplier'
        : isAwaitingApproval(c)
          ? 'pti'
          : null;
  return {
    supplierId: c.supplierId,
    materialCode: c.materialCode,
    callOffNumber: c.callOffNumber,
    agreed,
    pending,
    needDate: c.needDate
  };
}

/**
 * REQ-E06-04 — every supplier × material × cycle row, on the hub clock.
 * @param {string} [nowIso]
 * @returns {FsRow[]}
 */
export function allFixedStockRows(nowIso = sdcClock.now()) {
  const stock = [...inventoryDeclarationStore.all()].sort(
    (a, b) => declarationRecency(a) - declarationRecency(b)
  );
  return buildFixedStockReconcile({
    commitments: standingCommitmentLines(),
    callOffs: callOffStore.all().map(reconcileCallOff),
    stock,
    maxStock: maxStockFor,
    asOf: dayOf(nowIso),
    anchor: FS_RECONCILE_CYCLE_ANCHOR,
    cycleWeeks: fsReconcileCycleWeeks()
  });
}
