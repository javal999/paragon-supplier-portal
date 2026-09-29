// ────────────────────────────────────────────────────────────────────────────
// SAMPLE WEEKLY STOCK-UPDATE HISTORY — Material B4 (carried over from B3).
//
// ⚠️ SAMPLE DATA, NOT A FEED (MAT-R14). The seed holds only each supplier's
// latest stock figure, so before this every supplier with materials read 0%
// update compliance. This file supplies an ILLUSTRATIVE 13-week history,
// dated back from the declared present, so the award panel shows every pill
// state. Every surface that shows the figure carries the inventory
// `<LivenessPill>`, which reads "simulated".
//
// It feeds the update-compliance read model ONLY (`updateComplianceReadModel`):
// it is not written to the declaration store, so no stock-on-hand figure, no
// "latest update" and no stock page changes.
//
// The four states on existing events (declared present, default thresholds):
//   · sup-007 — plain, 92% (12 of 13 weeks). RFQ-2026-014, RFQ-2026-005, rfp-001.
//   · sup-008 — amber, 69% (9 of 13). RFQ-2026-014, RFQ-2026-005, rfp-001.
//   · sup-003 — red, 54% (7 of 13), an API supplier whose pulls often fail.
//     RFQ-2026-004.
//   · sup-013 / sup-015 / sup-004 — "No history": no material assigned, so no
//     week is counted (MR-2 BR-03). RFQ-2026-014, RFQ-2026-004.
// Every other supplier with materials updated every week (100%, plain).
// ────────────────────────────────────────────────────────────────────────────

import type { WorkingCalendar } from '../../../../lib/workingCalendar';
import type { StockUpdateMode } from '../../types';
import type { CycleAssignment, CycleStockRecord, UpdateCycle } from '../../../transitions/updateCycle';
import { cycleWorkingDays, type ComplianceSyncAttempt } from '../../../transitions/updateCompliance';

/** Oldest week first, one character per update cycle: `x` updated, `.` missed. */
export const SAMPLE_UPDATE_PATTERN: Readonly<Record<string, string>> = {
  'sup-001': 'xxxxxxxxxxxxx',
  'sup-002': 'xxxxxxxxxxxxx',
  'sup-003': 'x.x.xx..x.x.x',
  'sup-005': 'xxxxxxxxxxxxx',
  'sup-006': 'xxxxxxxxxxxxx',
  'sup-007': 'xxxxxxx.xxxxx',
  'sup-008': 'x.xxx.xx.xx.x',
  'sup-009': 'xxxxxxxxxxxxx',
  'sup-010': 'xxxxxxxxxxxxx',
};

const HOUR_MS = 3_600_000;

export interface SampleHistoryInputs {
  /** The 13 cycles the pattern covers, oldest first (the window ending at the declared present). */
  readonly cycles: readonly UpdateCycle[];
  readonly calendar: WorkingCalendar;
  readonly assignments: readonly CycleAssignment[];
  readonly modeAt: (supplierId: string, atIso: string) => StockUpdateMode;
}

/**
 * The sample history as the compliance rule reads it: in an `x` week, a manual
 * supplier updates every assigned material a day before the cutoff; an API
 * supplier has one successful pull on every working day of the cycle.
 */
export function sampleUpdateHistory(inputs: SampleHistoryInputs): {
  readonly records: readonly CycleStockRecord[];
  readonly syncAttempts: readonly ComplianceSyncAttempt[];
} {
  const records: CycleStockRecord[] = [];
  const syncAttempts: ComplianceSyncAttempt[] = [];
  for (const [supplierId, pattern] of Object.entries(SAMPLE_UPDATE_PATTERN)) {
    const materials = [
      ...new Set(inputs.assignments.filter((a) => a.supplierId === supplierId).map((a) => a.materialCode)),
    ];
    inputs.cycles.forEach((cycle, i) => {
      if (pattern[i] !== 'x') return;
      if (inputs.modeAt(supplierId, cycle.cutoff) === 'api') {
        for (const day of cycleWorkingDays(cycle, inputs.calendar)) {
          syncAttempts.push({ supplierId, at: `${day}T03:00:00.000Z`, outcome: 'success' });
        }
        return;
      }
      const declaredAt = new Date(Date.parse(cycle.cutoff) - 24 * HOUR_MS).toISOString();
      for (const materialCode of materials) records.push({ supplierId, materialCode, declaredAt });
    });
  }
  return { records, syncAttempts };
}
