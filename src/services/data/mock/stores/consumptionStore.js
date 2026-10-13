// ────────────────────────────────────────────────────────────────────────────
// CAP-11 (CAP-D14) — the recorded consumption per material × week.
//
// Append-only, like `demandAnticipationStore`: `add` appends a record and
// nothing ever edits or removes one. A LATER record for the same material ×
// week supersedes the earlier one AT READ (`consumptionInForce`); BOTH stay
// stored, so the history of what the planner recorded is kept.
//
// Empty at start: no consumption history is invented. Until the SAP
// goods-issue feed exists every record is the planner's (`manual` or
// `upload`), and the page says so.
//
// Held in memory for the session, as the demand anticipation publications are.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ConsumptionRecord } from '../../../transitions/consumptionRules' */

/** @type {ConsumptionRecord[]} */
let records = [];
let seq = 0;

export const consumptionStore = {
  /** @returns {readonly ConsumptionRecord[]} Every record, oldest first. */
  all() {
    return records;
  },
  /**
   * @param {string} id
   * @returns {ConsumptionRecord | undefined}
   */
  get(id) {
    return records.find((r) => r.id === id);
  },
  /**
   * Append a record; returns it with its id.
   * @param {Omit<ConsumptionRecord, 'id'>} row
   * @returns {ConsumptionRecord}
   */
  add(row) {
    seq += 1;
    const made = Object.freeze({ ...row, id: `con-${String(seq).padStart(4, '0')}` });
    records = [...records, made];
    return made;
  },
  /** @returns {void} */
  reset() {
    records = [];
    seq = 0;
  }
};
