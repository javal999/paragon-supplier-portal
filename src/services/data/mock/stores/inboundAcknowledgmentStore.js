// ────────────────────────────────────────────────────────────────────────────
// Inbound acknowledgment store (AIB-2 BR-02, BL-350).
//
// One record per ASN: who acknowledged the inbound and when. APPEND-ONLY in the
// sense that matters — a record is never rewritten; a second acknowledgment of
// the same inbound is refused by name at the verb
// (`INBOUND_ACKNOWLEDGMENT_UNACKNOWLEDGED`), so "who and when" cannot change
// under a reader.
//
// ⚠️ **THE RECORD IS ATTRIBUTED HONESTLY.** The portal holds no persons
// (`CurrentIdentity.actor` is `UNATTRIBUTED: NO_PERSON_IN_SESSION`), so `by` is
// the actor the SESSION carried and `seatRoles` names the seat that acted. The
// surface prints the seat (Expeditor) and says the person is unattributed; the
// raw attribution is kept so a real IdP fills the person field without a
// migration.
//
// Seeded with ONE acknowledged inbound so the list shows both states without
// the reviewer having to act first. The seed is a fixture fact, not a stored
// write: `reset()` restores it.
// ────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT } from '../../fixturePresent';
import { NO_PERSON } from '@context/noPerson';
/** @import { InboundAcknowledgment } from '../../types' */

const DAY_MS = 86_400_000;

/**
 * An instant `offset` days from the declared present at `hourWib` WIB.
 * @param {number} offset
 * @param {number} hourWib
 * @returns {string}
 */
const at = (offset, hourWib) =>
  new Date(
    Date.parse(`${DECLARED_PRESENT}T00:00:00.000Z`) + offset * DAY_MS + (hourWib - 7) * 3_600_000
  ).toISOString();

/**
 * The demo record — the first delivered ASN of the sample supplier was
 * acknowledged the morning after it arrived, by the Expeditor seat.
 * @type {InboundAcknowledgment}
 */
const SEEDED = Object.freeze({
  asnNumber: 'ASN-2025-00198',
  supplierId: 'sup-007',
  acknowledgedBy: NO_PERSON,
  seatRoles: Object.freeze(['expeditor']),
  acknowledgedAt: at(-1, 9)
});

/** @returns {InboundAcknowledgment[]} */
const seed = () => [{ ...SEEDED }];

/** @type {InboundAcknowledgment[]} */
let rows = seed();

export const inboundAcknowledgmentStore = {
  /** @returns {readonly InboundAcknowledgment[]} */
  all() {
    return rows;
  },
  /**
   * @param {string} asnNumber
   * @returns {InboundAcknowledgment | undefined}
   */
  get(asnNumber) {
    return rows.find((r) => r.asnNumber === asnNumber);
  },
  /**
   * Add the one acknowledgment an inbound gets.
   * @param {InboundAcknowledgment} rec
   * @returns {void}
   */
  add(rec) {
    rows = [...rows, rec];
  },
  /** @returns {void} */
  reset() {
    rows = seed();
  }
};
