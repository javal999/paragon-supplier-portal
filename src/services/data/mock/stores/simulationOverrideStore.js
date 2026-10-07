// ────────────────────────────────────────────────────────────────────────────
// Material E1 (MR-7 BR-08; plan AD-1) — the planner's inputs to the stock
// simulation. Append-only (MAT-R3): a changed figure is a new row, and which
// rows are in force (the latest per field, until the supplier's next stock
// record) is derived at read by `overridesInForce`. Empty at start.
// ────────────────────────────────────────────────────────────────────────────

/** @import { SimulationOverride } from '../../types' */

/** @type {SimulationOverride[]} */
let rows = [];
let seq = 0;

export const simulationOverrideStore = {
  /** @returns {readonly SimulationOverride[]} */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {SimulationOverride | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /**
   * @param {Omit<SimulationOverride, 'id'>} row
   * @returns {SimulationOverride}
   */
  add(row) {
    seq += 1;
    /** @type {SimulationOverride} */
    const made = { ...row, id: `sim-${String(seq).padStart(4, '0')}` };
    rows = [...rows, made];
    return made;
  },
  /** @returns {void} */
  reset() {
    rows = [];
    seq = 0;
  }
};
