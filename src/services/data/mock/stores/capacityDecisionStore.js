// ────────────────────────────────────────────────────────────────────────────
// CAPACITY DECISION STORE — INV-D8 (Inventory UX P-07).
//
// One row per acceptance PTI recorded on a supplier × planning group × week.
// Only the `capacityDecision` target writes here: `create` inserts a row, and
// the withdraw verb (BL-227) marks it `withdrawn`. A row is never removed
// (RFX-R3); a later acceptance on the same week is a new row.
//
// SAMPLE DATA: the store opens with one acceptance on sup-005's amber week
// 2026-10-12 (pg-MG-02), marked `sample: true`, so "PTI's decision" and the
// supplier's "PTI accepted your additional capacity" line are not empty in the
// demo. The pages that show it carry the "Sample data" badge.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CapacityDecision } from '../../types' */
import { NO_PERSON } from '@context/noPerson';

/** @returns {CapacityDecision[]} */
const seed = () => [
  Object.freeze({
    id: 'capd-0001',
    supplierId: 'sup-005',
    planningGroupId: 'pg-MG-02',
    week: '2026-10-12',
    decision: /** @type {const} */ ('accepted'),
    decidedAt: '2026-08-31T03:10:00.000Z',
    decidedBy: NO_PERSON,
    sample: true
  })
];

/** @type {CapacityDecision[]} */
let rows = seed();
let seq = rows.length;
let version = 0;
const listeners = /** @type {Set<() => void>} */ (new Set());

/** @returns {void} */
function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

export const capacityDecisionStore = {
  /**
   * Every decision, oldest first.
   * @returns {readonly CapacityDecision[]}
   */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {CapacityDecision | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /**
   * The acceptance in force on one supplier × planning group × week, if any
   * (a withdrawn one is not in force).
   * @param {string} supplierId
   * @param {string} planningGroupId
   * @param {string} week
   * @returns {CapacityDecision | undefined}
   */
  find(supplierId, planningGroupId, week) {
    return rows.find(
      (r) =>
        r.decision === 'accepted' &&
        r.supplierId === supplierId &&
        r.planningGroupId === planningGroupId &&
        r.week === week
    );
  },
  /**
   * A new decision with a store-assigned id. Called by the target's `create` only.
   * @param {Omit<CapacityDecision, 'id'>} row
   * @returns {CapacityDecision}
   */
  insert(row) {
    seq += 1;
    /** @type {CapacityDecision} */
    const full = Object.freeze({ ...row, id: `capd-${String(seq).padStart(4, '0')}` });
    rows = [...rows, full];
    changed();
    return full;
  },
  /**
   * BL-227 — marks an acceptance withdrawn. Called by the target's
   * `applyTransition` only.
   * @param {string} id
   * @param {string} at
   * @param {import('../../types').CapacityDecision['decidedBy']} by
   * @returns {void}
   */
  withdraw(id, at, by) {
    rows = rows.map((r) =>
      r.id === id
        ? Object.freeze({
            ...r,
            decision: /** @type {const} */ ('withdrawn'),
            withdrawnAt: at,
            withdrawnBy: by
          })
        : r
    );
    changed();
  },
  /**
   * Back to the sample row — test isolation.
   * @returns {void}
   */
  reset() {
    rows = seed();
    seq = rows.length;
    changed();
  },
  /** @returns {number} */
  version() {
    return version;
  },
  /**
   * @param {() => void} listener
   * @returns {() => void}
   */
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
