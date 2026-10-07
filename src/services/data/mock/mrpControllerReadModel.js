// ────────────────────────────────────────────────────────────────────────────
// Material C4 · A MATERIAL'S MRP CONTROLLER, AS THE READER MAY SEE IT
// (MR-5 BR-01 to BR-04; MAT-R4, MAT-R15).
//
// The code comes from the material master through `materialEntry` (never the
// fixture directly); who the code is comes from the administrator's list. The
// narrowing for a supplier — the name, never the code — happens HERE, in the
// read model, so no page can show a supplier a code by forgetting to hide it.
// ────────────────────────────────────────────────────────────────────────────

import { materialEntry } from '../../sdc/materialMaster';
import { mrpControllerRef } from '../../transitions/mrpControllerStore';
/** @import { MrpControllerRef, QueryScope } from '../types' */

/**
 * The MRP controller of a material for this reader, or undefined when there is nothing to show.
 * @param {string} materialCode
 * @param {QueryScope} scope
 * @returns {MrpControllerRef | undefined}
 */
export function mrpControllerOf(materialCode, scope) {
  return mrpControllerRef(
    materialEntry(materialCode)?.mrpController,
    scope.personaType === 'supplier' ? 'supplier' : 'buyer'
  );
}

/**
 * The row with its material's MRP controller attached (unchanged when there is none).
 * @template {{ readonly mrpController?: MrpControllerRef }} T
 * @param {T} row
 * @param {string} materialCode
 * @param {QueryScope} scope
 * @returns {T}
 */
export function withMrpController(row, materialCode, scope) {
  const ref = mrpControllerOf(materialCode, scope);
  return ref ? { ...row, mrpController: ref } : row;
}
