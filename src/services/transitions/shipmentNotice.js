// ────────────────────────────────────────────────────────────────────────────
// THE ONE-STEP SHIPMENT NOTICE — UCX-P3 (BL-364), REQ-E09-04 / REQ-E07-04.
//
// "Mark as shipped" is ONE act on the call-off drawer: it sends the dispatch
// notice PTI reads AND opens a draft ASN with the same values, so the supplier
// reports one shipment once (UCX-F10; goal UCX-SG7). The verbs keep their own
// gates (`calloff:dispatch`, `asn:create`, `asn:submit`); this module holds the
// values only, so the drawer and the wizard read one rule (the AR-11 pattern).
//
//   1. THE VALUES COME FROM THE CALL-OFF. The agreement's quantity (the
//      approved deliveries) and the call-off's need date. The wizard used to
//      open a call-off ASN on the PO's OPEN quantity (UCX-F9: an ASN for eight
//      times the call-off), because it seeds every PO line with what is open.
//   2. THE SEQUENCE PREFILLS THE NEXT FREE NUMBER (UCX-D13, owner ruling
//      2026-11-25): the highest numeric sequence on the supplier's live ASNs,
//      plus one — editable, and the SAP rules still run at submit
//      (`asnSequenceRead`, AIB-D1).
//   3. A DRAFT IS NOT A SHIPMENT. Only a Submitted ASN covers a call-off and
//      only a Submitted one is In Transit; the chase stays open until then
//      (UCX-SG2's at-risk clause).
//
// PURE: no store, no clock. The caller passes every record it reads.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ASN, CallOff } from '../data/types' */
import { approvedDeliveries } from './callOffRules';

/**
 * A draft ASN may still be Cancelled, so only a live ASN holds its sequence
 * (`ASN_INACTIVE_STATES` is Cancelled alone; it is not imported here because
 * the predicate is one comparison and this module reads no other rule).
 * @param {Pick<ASN, 'status'>} a
 * @returns {boolean}
 */
const live = (a) => a.status !== 'Cancelled';

/**
 * A sequence number as an integer, or null when it is not one. A non-numeric
 * sequence is still "in use" for the hint, but the counter cannot count from
 * it.
 * @param {unknown} value
 * @returns {number | null}
 */
const sequenceNumber = (value) => {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

/**
 * The sequences the supplier's live ASNs hold, in numeric order (non-numeric
 * values sort after the numbers, alphabetically). The wizard's visible hint
 * names them; nothing is decided here.
 * @param {readonly Pick<ASN, 'status' | 'sequence'>[]} asns
 * @returns {readonly string[]}
 */
export function sequencesInUse(asns) {
  /** @param {string} a @param {string} b */
  const compare = (a, b) => {
    const na = sequenceNumber(a);
    const nb = sequenceNumber(b);
    if (na !== null && nb !== null) return na - nb;
    if (na !== null) return -1;
    if (nb !== null) return 1;
    return a.localeCompare(b);
  };
  return [...new Set(asns.filter(live).map((a) => String(a.sequence ?? '').trim()))]
    .filter((s) => s !== '')
    .sort(compare);
}

/**
 * UCX-D13 — the next free ZWME021 sequence number for the supplier: the
 * highest numeric sequence its live ASNs hold, plus one; '1' when none is
 * numbered yet. Editable on the form, and the SAP rules still run at submit.
 * @param {readonly Pick<ASN, 'status' | 'sequence'>[]} asns
 * @returns {string}
 */
export function nextFreeSequence(asns) {
  const used = asns
    .filter(live)
    .map((a) => sequenceNumber(a.sequence))
    .filter(/** @returns {n is number} */ (n) => n !== null);
  return String(used.length > 0 ? Math.max(...used) + 1 : 1);
}

/**
 * The values "Mark as shipped" starts from, read off the call-off: the agreed
 * quantity (the approved deliveries — the accepted confirmation, else the
 * released figure) and the call-off's need date. Never the PO's open quantity
 * (UCX-F9).
 * @param {CallOff} callOff
 * @returns {{ quantity: number; expectedArrival: string }}
 */
export function callOffShipment(callOff) {
  return {
    quantity: approvedDeliveries(callOff).reduce((sum, d) => sum + d.quantity, 0),
    expectedArrival: callOff.needDate
  };
}

/**
 * The draft ASN the mark-as-shipped act creates: the call-off's line and
 * quantity, the arrival the supplier confirmed on the first step, and the
 * prefilled sequence. The details the draft still misses (tracking, Surat
 * Jalan, batch) are the wizard's step 2, as the mockup draws them.
 * @param {{
 *   callOff: CallOff;
 *   sequence: string;
 *   shippedDate?: string;
 *   expectedArrival: string;
 *   quantity: number;
 * }} input
 * @returns {{
 *   poReference: string;
 *   callOffId: string;
 *   sequence: string;
 *   shipDate?: string;
 *   eta: string;
 *   lines: { materialCode: string; shippedQty: number }[];
 * }}
 */
export function markShippedDraft({ callOff, sequence, shippedDate, expectedArrival, quantity }) {
  return {
    poReference: callOff.poNumber,
    callOffId: callOff.id,
    sequence: String(sequence ?? '').trim(),
    ...(shippedDate ? { shipDate: shippedDate } : {}),
    eta: expectedArrival,
    lines: [{ materialCode: callOff.materialCode, shippedQty: quantity }]
  };
}

/**
 * The open draft ASN for one call-off, or null. While it exists the drawer
 * offers "Complete the delivery details" instead of a second mark — one
 * shipment notice per delivery (UCX-P3).
 * @param {readonly Pick<ASN, 'asnNumber' | 'callOffId' | 'status'>[]} asns
 * @param {string} callOffId
 * @returns {string | null}
 */
export function draftForCallOff(asns, callOffId) {
  return asns.find((a) => a.callOffId === callOffId && a.status === 'Draft')?.asnNumber ?? null;
}
