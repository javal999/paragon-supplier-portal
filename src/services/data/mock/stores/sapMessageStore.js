// ────────────────────────────────────────────────────────────────────────────
// Simulated inbound SAP messages (REQ-E07-08) — the demo's failed records.
//
// ⚠️ THIS IS A FEED SIMULATOR, NOT A BUSINESS MACHINE, AND THAT IS WHY IT IS
// NOT A GOVERNED VERB. Retrying an inbound integration message is SAP sending
// the same record again: no hub entity changes state, no lifecycle edge is
// taken, nobody's authority is exercised over a document. The OUTBOUND failures
// the monitor shows are the real thing — the dispatcher's own settle failures,
// retried through `settle()` on the pending-settle queue — and those stay
// governed exactly as they were.
//
// Seeded deterministically so a demo can always show both CR-20 branches:
// one TRANSPORT failure on the goods-receipt inbound (retryable) and one
// REFUSED business error on the invoice-status inbound (not retryable until the
// data is fixed). Dates are offsets from `DECLARED_PRESENT`, never literals.
// ────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT } from '../../fixturePresent';
/** @import { SapFailedMessage } from '../../sapInterfaceRules' */

const P = Date.parse(`${DECLARED_PRESENT}T00:00:00.000Z`);
const MINUTE_MS = 60_000;

/**
 * An instant `minutes` before the declared present's 09:00 WIB (02:00Z).
 * @param {number} minutes
 */
const before = (minutes) => new Date(P + 2 * 3_600_000 - minutes * MINUTE_MS).toISOString();

/** @type {readonly SapFailedMessage[]} */
export const SAP_INBOUND_SEED = Object.freeze([
  {
    id: 'sapmsg-0001',
    object: 'goodsReceipt',
    fault: 'TRANSPORT',
    errorText: 'SAP did not answer in time. Nothing was received for this goods receipt.',
    correlationId: 'SAP-GR-2026-0044',
    timestamp: before(95)
  },
  {
    id: 'sapmsg-0002',
    object: 'invoiceStatus',
    fault: 'REFUSED',
    errorText: 'SAP refused the invoice status: the cost centre on the order is blocked.',
    correlationId: 'SAP-INV-2026-0117',
    timestamp: before(240)
  }
]);

/** @type {SapFailedMessage[]} */
let rows = SAP_INBOUND_SEED.map((m) => ({ ...m }));
/**
 * Messages a retry has cleared, and when — the monitor reads the newest as a success.
 * @type {{ id: string; at: string }[]}
 */
let cleared = [];

export const sapMessageStore = {
  /**
   * The open (still failed) simulated inbound messages.
   * @returns {readonly SapFailedMessage[]}
   */
  open() {
    return rows;
  },
  /**
   * When each object last took a message successfully through a retry.
   * @returns {readonly { id: string; at: string }[]}
   */
  clearedAt() {
    return cleared;
  },
  /**
   * Re-deliver one message. Returns the message that cleared, or null when the
   * id is unknown or CR-20 does not allow a retry on it.
   * @param {string} id
   * @param {string} atIso
   * @returns {SapFailedMessage | null}
   */
  retry(id, atIso) {
    const row = rows.find((m) => m.id === id);
    if (!row || row.fault !== 'TRANSPORT') return null;
    rows = rows.filter((m) => m.id !== id);
    cleared = [...cleared, { id, at: atIso }];
    return row;
  },
  /** @returns {void} */
  reset() {
    rows = SAP_INBOUND_SEED.map((m) => ({ ...m }));
    cleared = [];
  }
};
