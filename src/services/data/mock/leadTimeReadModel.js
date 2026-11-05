// ────────────────────────────────────────────────────────────────────────────
// A SUPPLIER × MATERIAL LEAD TIME, AS A CALL-OFF READS IT — PEX-10 (BL-273).
//
// The lead time is DRC-6's (`leadTimeBreakdown` over the engine dataset's
// source for the pair): the sum of its steps, or its `leadTimeDays` when the
// source carries none. Attached to a call-off AT READ, never stored, the way
// the MRP controller is (`mrpControllerReadModel`).
// ────────────────────────────────────────────────────────────────────────────

import { engineDataset } from './fixtures/engineDataset';
import { leadTimeBreakdown } from '../../engine/leadTimeSteps';

/**
 * DRC-6 — the pair's lead time in days, or null when no source is on record.
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {number | null}
 */
export function leadTimeDaysOf(supplierId, materialCode) {
  const src = engineDataset().sources.find(
    (s) => s.supplierId === supplierId && s.materialCode === materialCode
  );
  return src ? leadTimeBreakdown(src).totalDays : null;
}

/**
 * The row with its pair's lead time attached (unchanged when none is on record).
 * @template {{ readonly supplierId: string; readonly materialCode: string; readonly leadTimeDays?: number }} T
 * @param {T} row
 * @returns {T}
 */
export function withLeadTime(row) {
  const days = leadTimeDaysOf(row.supplierId, row.materialCode);
  return days === null ? row : { ...row, leadTimeDays: days };
}
