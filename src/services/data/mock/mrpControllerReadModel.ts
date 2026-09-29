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
import type { MrpControllerRef, QueryScope } from '../types';

/** The MRP controller of a material for this reader, or undefined when there is nothing to show. */
export function mrpControllerOf(materialCode: string, scope: QueryScope): MrpControllerRef | undefined {
  return mrpControllerRef(
    materialEntry(materialCode)?.mrpController,
    scope.personaType === 'supplier' ? 'supplier' : 'buyer',
  );
}

/** The row with its material's MRP controller attached (unchanged when there is none). */
export function withMrpController<T extends { readonly mrpController?: MrpControllerRef }>(
  row: T,
  materialCode: string,
  scope: QueryScope,
): T {
  const ref = mrpControllerOf(materialCode, scope);
  return ref ? { ...row, mrpController: ref } : row;
}
