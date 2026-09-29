// ────────────────────────────────────────────────────────────────────────────
// Material A2 · the hub-mastered material overlay (plan AD-4, MAT-R15).
//
// `MATERIAL_MASTER` is a frozen copy of SAP. Fields the hub masters itself
// (`shelfLifeRelevant`, `planningGroupId`) live here instead, and
// `materialEntry` merges them over the fixture entry, so no reader of the
// master changes. Append-only (MAT-R3): a change is a new row, never an edit.
// Empty at start. No verb writes it yet; C4 and C5 add those.
// ────────────────────────────────────────────────────────────────────────────

import type { MaterialOverlayRow } from '../../../sdc/types';

let rows: MaterialOverlayRow[] = [];

export const materialOverlayStore = {
  all(): readonly MaterialOverlayRow[] {
    return rows;
  },
  /** Rows for one material, oldest first. */
  forMaterial(materialCode: string): readonly MaterialOverlayRow[] {
    return rows.filter((r) => r.materialCode === materialCode);
  },
  append(row: MaterialOverlayRow): MaterialOverlayRow {
    rows = [...rows, row];
    return row;
  },
  reset(): void {
    rows = [];
  },
};
