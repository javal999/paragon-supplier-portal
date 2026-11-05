// ────────────────────────────────────────────────────────────────────────────
// A SUPPLIER × MATERIAL LEAD TIME, AS A CALL-OFF READS IT — PEX-10 (BL-273).
//
// The lead time is DRC-6's (`leadTimeBreakdown` over the engine dataset's
// source for the pair): the sum of its steps, or its `leadTimeDays` when the
// source carries none. Attached to a call-off AT READ, never stored, the way
// the MRP controller is (`mrpControllerReadModel`).
//
// PEX-D16 (owner, 2026-11-05): with no source on record, the material-type
// default from `DEFAULT_LEAD_TIME_DAYS` (packaging 14, raw material 30), marked
// `leadTimeIsDefault` so the page labels it, and every call-off has a date.
// ────────────────────────────────────────────────────────────────────────────

import { engineDataset } from './fixtures/engineDataset';
import { leadTimeBreakdown } from '../../engine/leadTimeSteps';
import { DEFAULT_LEAD_TIME_DAYS } from '../../transitions/forecastConfig';
import { MATERIAL_MASTER } from '../../sdc/fixtures';

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
 * PEX-D16 — the material-type default lead time, or null when the type is unknown.
 * @param {string} materialCode
 * @returns {number | null}
 */
export function defaultLeadTimeDaysOf(materialCode) {
  const type = MATERIAL_MASTER[materialCode]?.materialType;
  return type ? (DEFAULT_LEAD_TIME_DAYS[type] ?? null) : null;
}

/**
 * The row with its pair's lead time attached; with none on record, the
 * material-type default, flagged (PEX-D16). Unchanged when neither exists.
 * @template {{ readonly supplierId: string; readonly materialCode: string; readonly leadTimeDays?: number; readonly leadTimeIsDefault?: boolean }} T
 * @param {T} row
 * @returns {T}
 */
export function withLeadTime(row) {
  const days = leadTimeDaysOf(row.supplierId, row.materialCode);
  if (days !== null) return { ...row, leadTimeDays: days };
  const fallback = defaultLeadTimeDaysOf(row.materialCode);
  return fallback === null ? row : { ...row, leadTimeDays: fallback, leadTimeIsDefault: true };
}
