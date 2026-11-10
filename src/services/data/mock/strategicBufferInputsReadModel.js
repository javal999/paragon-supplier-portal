// ────────────────────────────────────────────────────────────────────────────
// PEX-D10 — the strategic buffer from LTP Festive − LTP A, per supplier ×
// material and calendar month, for the Capacity page's DRC-9a section.
//
// Only a material with an uploaded LTP Festive is read here; the rest keep the
// DRC-9a calculation. The weekly figures are `ltpWeeks`' (the DA grid's), over
// the Mondays the uploads name, with the supplier's CAP-D11 share and the
// forecast spread standing in for an LTP A not uploaded. Computed at read.
// ────────────────────────────────────────────────────────────────────────────

import { sdcClock } from '../../sdc';
import { groupWeekLtp } from '../../transitions/capacityRules';
import { addDays } from '../../transitions/inventoryRules';
import { hubWeeks, materialShares } from '../../transitions/demandAnticipationRules';
import { ltpWeeks, materialLtpInputs } from '../../transitions/ltpInputRules';
import { festiveBufferByMonth } from '../../transitions/strategicBufferInputs';
import { allCommitmentLines } from './forecastReadModel';
import { ltpInputStore } from './stores/ltpInputStore';

/**
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly months: Readonly<Record<string, import('../../transitions/strategicBufferInputs').FestiveMonth>>;
 * }} StrategicBufferInput
 */

/**
 * @param {string} [nowIso]
 * @returns {StrategicBufferInput[]}
 */
export function allStrategicBufferInputs(nowIso = sdcClock.now()) {
  const lines = allCommitmentLines(null);
  const rows = ltpInputStore.all();
  const window = hubWeeks(nowIso, 4);
  /** @type {Map<string, string[]>} */
  const suppliersOf = new Map();
  for (const l of lines) {
    const list = suppliersOf.get(l.materialCode) ?? [];
    if (!list.includes(l.supplierId)) suppliersOf.set(l.materialCode, [...list, l.supplierId]);
  }
  /** @type {StrategicBufferInput[]} */
  const out = [];
  for (const [materialCode, suppliers] of suppliersOf) {
    const inputs = materialLtpInputs(rows, materialCode);
    const festive = inputs.uploads.Festive;
    if (!festive?.weeks) continue;
    // Every Monday from the first to the last week the Festive upload names.
    const named = Object.keys(festive.weeks).sort();
    /** @type {string[]} */
    const weeks = [];
    for (let w = named[0]; w <= named[named.length - 1]; w = addDays(w, 7)) weeks.push(w);
    const sorted = [...suppliers].sort();
    const shares = materialShares(lines, materialCode, sorted, window);
    for (const supplierId of sorted) {
      const source = weeks.map((w) => groupWeekLtp(lines, supplierId, [materialCode], w));
      const lw = ltpWeeks(weeks, source, inputs, shares.get(supplierId) ?? 0);
      out.push({
        supplierId,
        materialCode,
        months: festiveBufferByMonth(weeks, lw.strategicBuffer)
      });
    }
  }
  return out;
}
