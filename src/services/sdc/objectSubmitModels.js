// ────────────────────────────────────────────────────────────────────────────
// SDC-3b — the PURE draft→payload mapping for the IncomingShipment supplier
// object (the InventoryDeclaration builder was retired at BL-73). Mirrors `submitModel.js`
// (requirementResponse) EXACTLY: the page collects text, coercion happens here,
// and the payload carries ONLY honest raw facts. `uom` is deliberately ABSENT
// from every payload — the CommandTarget copies it from the material master
// (integrity invariant #2), never from the caller. `supplierId` comes from the
// current identity (never a form field), so the spoof branch stays SCOPE_DENIED.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ShipmentDirection } from './types' */

// ─── InventoryDeclaration ─────────────────────────────────────────────────────
//
// No builder here any more. `buildInventoryDeclarationPayload` served only the
// SDC ingestion adapter (`parseGrid`), retired at BL-73 with the channel
// triage's own stock path; every stock declaration is now assembled by the
// Stock page's entry form and template upload (REQ-E08-02 BR-09).

// ─── IncomingShipment (direction-named) ───────────────────────────────────────

// ── CP-0 · W1 · PR-2d — the LAST zero-fabricating builder retires ────────────
//
// `qty` used to arrive here as a STRING and be coerced in place:
//
//     qty: Number(draft.qty.replace(/,/g, '')) || 0
//
// while the SURFACE independently coerced the SAME string with its own copy of
// that formula (`numberFromField`) to decide whether to submit at all. Two
// parses of one fact — the pattern 2a killed on the declaration path and 2c on
// the confirm path, alive here until now. It is also the last blanket
// comma-strip on any typed-entry path in the app: `numberFromField` is deleted
// with this change, having no other consumer.
//
// The `|| 0` mattered more here than anywhere else in the series, because a
// shipment quantity is not a leaf. It sums into the buyer's incoming-coverage
// read (`consolidation.js` — a covered supplier can be made to read as a
// shortfall), and it drives delivery fulfilment, where the schedule line's
// `qtyVariance` is `qty - plannedQty` AND the matching shipment is chosen by
// the SMALLEST absolute variance. A misparse there does not merely report a
// wrong number: it can match the wrong shipment to a released schedule line.
// A blank coerced to 0 posts a variance of minus the entire planned quantity —
// a total non-delivery, claimed, against a live commitment.
//
// The builder now takes a NUMBER. It cannot parse, so it cannot disagree with
// the gate; callers normalise ONCE (via `normalizeQty`) and gate and ship the
// same value. Blank and ambiguous never reach here — they refuse at the surface.

/** The report form fields. `qty` is ALREADY NORMALISED — the caller ran the one
 *  legal parse and refused anything unreadable, so no coercion happens here
 *  (CP-0 §4). `asnRef` is a SELECTED own-ASN number present ONLY for a
 *  to-paragon leg (never free-typed — the R-4 note: it resolves server-side
 *  against the supplier's own ASNs). A p2d leg never carries it. */
/**
 * @typedef {object} IncomingShipmentDraft
 * @property {number} qty
 * @property {string} [etd]
 * @property {string} [eta]
 * @property {string} [awb]
 * @property {string} [asnRef] -  to-paragon ONLY — the selected own-ASN number this leg converges on.
 */

/**
 * Build the `t_incomingshipment_report` payload from an ALREADY-NORMALISED
 * draft. Pure assembly: the number it is given is the number it ships. The
 * direction is passed explicitly (the surface offers only the legal directions
 * for the material); `asnRef` is included ONLY for a to-paragon leg, so the
 * symmetric guards (ISH_P2D_NO_ASN / ISH_TOPARAGON_ASN_LINKED) can never be
 * tripped by the surface itself. No id/lifecycle/uom — store/master-assigned.
 *
 * Quantity honesty (three distinct states, none collapsed):
 *  · a TYPED 0 is a real statement ("nothing is in transit") and is recorded;
 *  · a BLANK field is not a zero — it refuses at the surface and never arrives;
 *  · an AMBIGUOUS token ("6.000" = 6000 or 6) refuses too, rather than shipping
 *    one plausible reading of two into a coverage read and a drawdown match.
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {ShipmentDirection} direction
 * @param {IncomingShipmentDraft} draft
 * @returns {Record<string, unknown>}
 */
export function buildIncomingShipmentPayload(supplierId, materialCode, direction, draft) {
  return {
    supplierId,
    materialCode,
    direction,
    qty: draft.qty,
    ...(draft.etd ? { etd: draft.etd } : {}),
    ...(draft.eta ? { eta: draft.eta } : {}),
    ...(draft.awb ? { awb: draft.awb } : {}),
    // to-paragon converges on an ASN; p2d carries none (Paragon isn't consignee).
    ...(direction === 'to-paragon' && draft.asnRef ? { asnRef: draft.asnRef } : {})
  };
}
