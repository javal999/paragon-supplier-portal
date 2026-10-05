// ────────────────────────────────────────────────────────────────────────────
// UPDATE COMPLIANCE READ MODEL — Material B3 (MR-2 BR-01 to BR-03).
//
// ONE place gathers the stock records, the sync attempts, the assignments, the
// mode history and the calendar and hands them to the pure rule
// (`transitions/updateCompliance.js`). Computed at read; nothing is stored.
// ────────────────────────────────────────────────────────────────────────────

/** @import { QueryScope } from '../types' */
import { sdcClock } from '../../sdc/clock';
/** @import { ComplianceSources, UpdateCompliance } from '../../transitions/updateCompliance' */
import {
  COMPLIANCE_WINDOW_WEEKS,
  complianceCycles,
  complianceOver,
  isComplianceFlagged
} from '../../transitions/updateCompliance';
import { complianceThresholds, updateCycleSettings } from '../../transitions/inventoryConfig';
import { hubWorkingCalendar } from '../../transitions/workingCalendarStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { stockSyncStore } from './stores/inventoryHubStores';
import { stockUpdateAssignments } from './inventoryReadModel';
import { stockUpdateModeOf, supplierEntry } from './supplierMaster';
import { mockSuppliers } from '@data/mockSuppliers';
import { DECLARED_PRESENT } from '../fixturePresent';
import { sampleUpdateHistory } from './fixtures/updateHistorySample';

/** @returns {ComplianceSources} */
function sources() {
  const calendar = hubWorkingCalendar();
  const cycle = updateCycleSettings();
  const assignments = stockUpdateAssignments();
  // Material B4 — the SAMPLE weekly history (MAT-R14; `updateHistorySample.js`),
  // over the 13 cycles ending at the declared present, beside the real rows.
  const sample = sampleUpdateHistory({
    cycles: complianceCycles(`${DECLARED_PRESENT}T12:00:00.000Z`, calendar, cycle),
    calendar,
    assignments,
    modeAt: stockUpdateModeOf
  });
  return {
    records: [...inventoryDeclarationStore.all(), ...sample.records],
    syncAttempts: [...stockSyncStore.all(), ...sample.syncAttempts],
    assignments,
    onboardedAt: (supplierId) => supplierEntry(supplierId)?.onboardedDate ?? null,
    modeAt: stockUpdateModeOf,
    calendar,
    cycle
  };
}

/**
 * MR-2 BR-01 — one supplier's update compliance over the rolling window ending `asOf`.
 * @param {string} supplierId
 * @param {string} [asOf]
 * @param {number} [weeks]
 * @returns {UpdateCompliance}
 */
export function updateCompliance(
  supplierId,
  asOf = sdcClock.now(),
  weeks = COMPLIANCE_WINDOW_WEEKS
) {
  return complianceOver(sources(), supplierId, asOf, weeks);
}

/**
 * Material B4 (MR-2 BR-06) — is the supplier red-flagged on update compliance at `asOf`?
 * @param {string} supplierId
 * @param {string} asOf
 * @returns {boolean}
 */
export function complianceFlaggedAt(supplierId, asOf) {
  return isComplianceFlagged(
    updateCompliance(supplierId, asOf).pct,
    complianceThresholds().flagPct
  );
}

/**
 * Material B4 (MR-2 BR-06, AC-05) — each awarded supplier's compliance at the award, once each.
 * @param {readonly string[]} supplierIds
 * @param {string} asOf
 * @returns {{ readonly supplierId: string; readonly pct: number | null }[]}
 */
export function complianceSnapshot(supplierIds, asOf) {
  return [...new Set(supplierIds)].map((supplierId) => ({
    supplierId,
    pct: updateCompliance(supplierId, asOf).pct
  }));
}

/**
 * Every supplier's update compliance, narrowed HERE (MAT-R4): a supplier reads
 * only its own figure.
 * @param {QueryScope} scope
 * @param {string} [asOf]
 * @returns {UpdateCompliance[]}
 */
export function updateComplianceFor(scope, asOf = sdcClock.now()) {
  const src = sources();
  const ids = mockSuppliers
    .map((s) => s.id)
    .filter((id) => scope.personaType !== 'supplier' || id === scope.supplierId);
  return ids.map((id) => complianceOver(src, id, asOf));
}
