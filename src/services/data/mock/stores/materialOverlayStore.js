// ────────────────────────────────────────────────────────────────────────────
// Material A2 · the hub-mastered material overlay (plan AD-4, MAT-R15).
//
// `MATERIAL_MASTER` is a frozen copy of SAP. Fields the hub masters itself
// (`shelfLifeRelevant`, `planningGroupId`) live here instead, and
// `materialEntry` merges them over the fixture entry, so no reader of the
// master changes. Append-only (MAT-R3): a change is a new row, never an edit.
// Empty at start. No verb writes it yet; C4 and C5 add those.
// ────────────────────────────────────────────────────────────────────────────

/** @import { MaterialOverlayRow } from '../../../sdc/types' */

/** @type {MaterialOverlayRow[]} */
let rows = [];

export const materialOverlayStore = {
  /** @returns {readonly MaterialOverlayRow[]} */
  all() {
    return rows;
  },
  /**
   * Rows for one material, oldest first.
   * @param {string} materialCode
   * @returns {readonly MaterialOverlayRow[]}
   */
  forMaterial(materialCode) {
    return rows.filter((r) => r.materialCode === materialCode);
  },
  /**
   * @param {MaterialOverlayRow} row
   * @returns {MaterialOverlayRow}
   */
  append(row) {
    rows = [...rows, row];
    return row;
  },
  /** @returns {void} */
  reset() {
    rows = [];
  }
};
