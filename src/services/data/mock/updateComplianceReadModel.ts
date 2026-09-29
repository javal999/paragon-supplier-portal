// ────────────────────────────────────────────────────────────────────────────
// UPDATE COMPLIANCE READ MODEL — Material B3 (MR-2 BR-01 to BR-03).
//
// ONE place gathers the stock records, the sync attempts, the assignments, the
// mode history and the calendar and hands them to the pure rule
// (`transitions/updateCompliance.ts`). Computed at read; nothing is stored.
// ────────────────────────────────────────────────────────────────────────────

import type { QueryScope } from '../types';
import { sdcClock } from '../../sdc/clock';
import {
  COMPLIANCE_WINDOW_WEEKS,
  complianceOver,
  type ComplianceSources,
  type UpdateCompliance,
} from '../../transitions/updateCompliance';
import { updateCycleSettings } from '../../transitions/inventoryConfig';
import { hubWorkingCalendar } from '../../transitions/workingCalendarStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { stockSyncStore } from './stores/inventoryHubStores';
import { stockUpdateAssignments } from './inventoryReadModel';
import { stockUpdateModeOf, supplierEntry } from './supplierMaster';
import { mockSuppliers } from '../../../data/mockSuppliers';

function sources(): ComplianceSources {
  return {
    records: inventoryDeclarationStore.all(),
    syncAttempts: stockSyncStore.all(),
    assignments: stockUpdateAssignments(),
    onboardedAt: (supplierId) => supplierEntry(supplierId)?.onboardedDate ?? null,
    modeAt: stockUpdateModeOf,
    calendar: hubWorkingCalendar(),
    cycle: updateCycleSettings(),
  };
}

/** MR-2 BR-01 — one supplier's update compliance over the rolling window ending `asOf`. */
export function updateCompliance(
  supplierId: string,
  asOf: string = sdcClock.now(),
  weeks: number = COMPLIANCE_WINDOW_WEEKS,
): UpdateCompliance {
  return complianceOver(sources(), supplierId, asOf, weeks);
}

/**
 * Every supplier's update compliance, narrowed HERE (MAT-R4): a supplier reads
 * only its own figure.
 */
export function updateComplianceFor(scope: QueryScope, asOf: string = sdcClock.now()): UpdateCompliance[] {
  const src = sources();
  const ids = mockSuppliers
    .map((s) => s.id)
    .filter((id) => scope.personaType !== 'supplier' || id === scope.supplierId);
  return ids.map((id) => complianceOver(src, id, asOf));
}
