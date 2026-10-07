// ────────────────────────────────────────────────────────────────────────────
// Mutable IncomingShipment store (SDC-3a).
//
// Same contract as the other creation stores: reads resolve FROM here; the
// report command ADDS a new leg (births 'Booked'); the authored-unwired
// advance verbs (ship/arrive/cancel) mutate IMMUTABLY when they wire. Seeded
// from the SDC-0 SIMULATED fixtures; `reset()` restores the seed. Keyed by id.
// ────────────────────────────────────────────────────────────────────────────

import { INCOMING_SHIPMENTS } from '../../../sdc';
/** @import { IncomingShipment } from '../../../sdc' */

/**
 * @param {IncomingShipment} s
 * @returns {IncomingShipment}
 */
function clone(s) {
  return { ...s };
}

/** @type {IncomingShipment[]} */
let rows = INCOMING_SHIPMENTS.map(clone);
let seq = 0;

export const incomingShipmentStore = {
  /**
   * All shipment legs (the mutable source reads resolve from).
   * @returns {readonly IncomingShipment[]}
   */
  all() {
    return rows;
  },
  /**
   * One leg by id, or undefined.
   * @param {string} id
   * @returns {IncomingShipment | undefined}
   */
  get(id) {
    return rows.find((s) => s.id === id);
  },
  /**
   * IMMUTABLE update — swap in a new leg + new array (advance verbs, 3b+).
   * @param {string} id
   * @param {(s: IncomingShipment) => IncomingShipment} next
   * @returns {void}
   */
  update(id, next) {
    rows = rows.map((s) => (s.id === id ? next(s) : s));
  },
  /**
   * Add a newly-reported leg (creation). New array reference.
   * @param {IncomingShipment} shipment
   * @returns {void}
   */
  add(shipment) {
    rows = [shipment, ...rows];
  },
  /**
   * Store-assigned id for a report (distinct 9xxx range; fixtures are 0xxx).
   * @returns {string}
   */
  nextNumber() {
    seq += 1;
    return `ish-${9000 + seq}`;
  },
  /**
   * Restore the fixture seed (test isolation).
   * @returns {void}
   */
  reset() {
    rows = INCOMING_SHIPMENTS.map(clone);
    seq = 0;
  }
};
