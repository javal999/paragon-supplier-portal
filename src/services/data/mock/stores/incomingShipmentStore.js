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

// PEX-16 usability test: the seeded supplier seat (sup-007) sees one leg from its own
// principal on the Stock page (sup-005 already has ish-0002), so the tracking link
// can be tried without first reporting a shipment. Kept out of the SDC-0 fixtures
// on purpose: the coverage and consolidation maths read those and would change.
/** @type {readonly IncomingShipment[]} */
const TEST_SEAT_LEGS = Object.freeze([
  Object.freeze({
    id: 'ish-0003',
    supplierId: 'sup-007',
    materialCode: 'PK-PETB-8810',
    direction: 'principal-to-distributor',
    lifecycle: 'Shipped',
    qty: 20000,
    uom: 'PCS',
    etd: '2026-08-28',
    eta: '2026-09-14',
    awb: 'AWB-77120107',
    provenance: INCOMING_SHIPMENTS[0].provenance
  })
]);

/** @returns {IncomingShipment[]} */
const seed = () => [...INCOMING_SHIPMENTS, ...TEST_SEAT_LEGS].map(clone);

/** @type {IncomingShipment[]} */
let rows = seed();
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
    rows = seed();
    seq = 0;
  }
};
