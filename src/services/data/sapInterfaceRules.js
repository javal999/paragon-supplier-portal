// ─────────────────────────────────────────────────────────────────────────────
// SAP INTERFACE RULES — REQ-E07-08 (order data interface with SAP), CR-20.
//
// Pure functions. Nothing here reads a clock or a store: the monitor page and
// the data-age banner hand in the documents, the recorded messages and the
// instant, so "last updated", "how old" and "is this stale" are derived at read
// time and never stored (law 0.5).
//
// ⚠️ THE HUB HAS NO SAP. What this models is stated rather than implied: the
// inbound feeds are SIMULATED — each object's "last received" is the newest
// document of that family in the fixtures, which is the honest stand-in for a
// delivery timestamp nothing in this prototype produces. The OUTBOUND failures
// are real: they are the settle failures the dispatcher already records, read
// back out of the audit trail and classified by the SAME vocabulary the settle
// boundary uses (`settleFaults.js`), so CR-20's retry rule has exactly one home.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { TransitionEvent } from '../transitions/events' */
/** @import { SettleFault } from '../transitions/settleFaults' */
import { SETTLE_FAULT_RETRYABLE, settleFaultKindOf } from '../transitions/settleFaults';

// ── BR-01 / BR-02 · the objects exchanged, and which way they travel ────────

export const SAP_OBJECTS = /** @type {const} */ ([
  'umbrellaPo',
  'goodsReceipt',
  'invoiceStatus',
  'poResponse',
  'inboundDelivery',
  'invoiceOut'
]);

/** @typedef {(typeof SAP_OBJECTS)[number]} SapObjectId */

/** @typedef {'inbound' | 'outbound'} SapDirection */

/** BR-02 — SAP to hub for PO, goods receipt and invoice status; hub to SAP for
 * @type {Readonly<Record<SapObjectId, SapDirection>>}
 *  the PO response, the ASN as an inbound delivery, and the invoice. */
export const SAP_OBJECT_DIRECTION = Object.freeze({
  umbrellaPo: 'inbound',
  goodsReceipt: 'inbound',
  invoiceStatus: 'inbound',
  poResponse: 'outbound',
  inboundDelivery: 'outbound',
  invoiceOut: 'outbound'
});

/** BR-04 — SAP changes are expected in the hub inside this many minutes. */
export const SAP_LATENCY_TARGET_MINUTES = 15;

/** Which interface object each screen's figures depend on (AC-03). */
export const SAP_PAGE_OBJECT = /** @satisfies {Record<string, SapObjectId>} */ (
  /** @type {const} */ ({
    purchaseOrders: 'umbrellaPo',
    goodsReceipts: 'goodsReceipt',
    inventory: 'umbrellaPo',
    invoices: 'invoiceStatus'
  })
);

/** @typedef {keyof typeof SAP_PAGE_OBJECT} SapPageKey */

// ── A failed message ────────────────────────────────────────────────────────

/**
 * @typedef {object} SapFailedMessage
 * @property {string} id
 * @property {SapObjectId} object
 * @property {SettleFault} fault -  CR-20's class — the settle boundary's own vocabulary, not a second one.
 * @property {string} errorText -  The business-plain error the interface reported.
 * @property {string} correlationId -  The reference both sides quote when they talk about this message.
 * @property {string} timestamp
 * @property {string} [settleCorrelationId] -  Present when the message came from a real settle the dispatcher can retry.
 */

/**
 * CR-20 — only a transport failure may be retried; a refusal is fixed first.
 * @param {Pick<SapFailedMessage, 'fault'>} message
 * @returns {boolean}
 */
export function isRetryable(message) {
  return SETTLE_FAULT_RETRYABLE[message.fault];
}

// ── The per-object status the monitor renders ───────────────────────────────

/**
 * @typedef {object} SapObjectStatus
 * @property {SapObjectId} object
 * @property {SapDirection} direction
 * @property {string | null} lastSuccessAt -  The last time this object moved successfully, or null if it never has.
 * @property {number} failureCount
 * @property {readonly SapFailedMessage[]} failures
 * @property {number} retryableCount -  Of the failures, the ones CR-20 allows a retry on.
 */

/**
 * The newest of a set of timestamps, or null when there is none.
 * @param {readonly (string | null | undefined)[]} instants
 * @returns {string | null}
 */
export function newestInstant(instants) {
  const real = instants.filter(
    /** @returns {i is string} */ (i) => typeof i === 'string' && i.length > 0
  );
  if (real.length === 0) return null;
  return real.reduce((a, b) => (Date.parse(a) >= Date.parse(b) ? a : b));
}

/**
 * Which interface object a settle failure belongs to. The two SAP-boundary
 * verbs in the tree are the goods-receipt post and the invoice payment release,
 * so the mapping is by entity and there is no third case to guess at.
 * @param {string} entity
 * @returns {SapObjectId | null}
 */
export function objectForEntity(entity) {
  if (entity === 'goodsReceipt') return 'goodsReceipt';
  if (entity === 'invoice') return 'invoiceOut';
  return null;
}

/**
 * Failed messages recovered from the command trail. A settle that failed emits
 * `outcome: 'failed'` with a `reason` the settle boundary wrote; a later
 * successful settle emits `done` under the SAME correlationId, which is what
 * clears the failure here — so a retry that works updates the monitor without
 * anything being deleted.
 * @param {readonly TransitionEvent[]} events
 * @param {(transitionId: string) => string | null} entityOf
 * @returns {readonly SapFailedMessage[]}
 */
export function failuresFromEvents(events, entityOf) {
  const settled = new Set(events.filter((e) => e.outcome === 'done').map((e) => e.correlationId));
  /** @type {SapFailedMessage[]} */
  const out = [];
  for (const e of events) {
    if (e.outcome !== 'failed') continue;
    const fault = settleFaultKindOf(e.reason);
    if (!fault) continue;
    if (settled.has(e.correlationId)) continue;
    const entity = entityOf(e.event);
    const object = entity ? objectForEntity(entity) : null;
    if (!object) continue;
    out.push({
      id: `msg-${e.correlationId}`,
      object,
      fault,
      errorText: e.reason ?? fault,
      correlationId: e.correlationId,
      timestamp: e.ts,
      settleCorrelationId: e.correlationId
    });
  }
  return out;
}

/**
 * @typedef {object} SapMonitorInput
 * @property {Readonly<Partial<Record<SapObjectId, string | null>>>} lastSeen -  Newest document instant per object — the simulated "last received".
 * @property {readonly SapFailedMessage[]} messages
 */

/**
 * The whole monitor: one row per interface object, newest failure first.
 * @param {SapMonitorInput} input
 * @returns {readonly SapObjectStatus[]}
 */
export function sapMonitor(input) {
  return SAP_OBJECTS.map((object) => {
    const failures = input.messages
      .filter((m) => m.object === object)
      .slice()
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return {
      object,
      direction: SAP_OBJECT_DIRECTION[object],
      lastSuccessAt: input.lastSeen[object] ?? null,
      failureCount: failures.length,
      failures,
      retryableCount: failures.filter(isRetryable).length
    };
  });
}

// ── BR-04 / AC-03 · the data age a screen shows ─────────────────────────────

/**
 * @typedef {object} SapDataAge
 * @property {number | null} minutes -  Whole minutes since the object last arrived; null when it never has.
 * @property {boolean} stale -  True when the age exceeds the latency target — the banner's condition.
 * @property {string | null} lastSuccessAt
 */

/**
 * How old a screen's SAP data is. Derived at read time from the last successful
 * arrival and the instant handed in — never stored, and never a clock read here.
 * @param {string | null} lastSuccessAt
 * @param {string} nowIso
 * @returns {SapDataAge}
 */
export function sapDataAge(lastSuccessAt, nowIso) {
  if (!lastSuccessAt) return { minutes: null, stale: true, lastSuccessAt: null };
  const ms = Date.parse(nowIso) - Date.parse(lastSuccessAt);
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  return { minutes, stale: minutes > SAP_LATENCY_TARGET_MINUTES, lastSuccessAt };
}

/** A plain age phrase's parts (SC-04): the page renders them, this decides them. */
/** @typedef {'minutes' | 'hours' | 'days'} SapAgeUnit */

/**
 * @param {number} minutes
 * @returns {{ unit: SapAgeUnit; value: number }}
 */
export function sapAgeParts(minutes) {
  if (minutes < 60) return { unit: 'minutes', value: minutes };
  if (minutes < 60 * 24) return { unit: 'hours', value: Math.floor(minutes / 60) };
  return { unit: 'days', value: Math.floor(minutes / (60 * 24)) };
}
