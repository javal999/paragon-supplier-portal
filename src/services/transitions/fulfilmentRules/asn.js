// ────────────────────────────────────────────────────────────────────────────
// Fulfilment rules · ASN (REQ-E07-04) — which POs an ASN may be raised on, open
// quantity per PO line, and why one ASN line is refused. Separate from the
// shelf-life, batch, receipt and invoice rules so each concern reads alone;
// re-exported unchanged by `index.js`.
// ────────────────────────────────────────────────────────────────────────────

import { POStatus } from '../../data/types';
/** @import { ASN, AsnLineItem, AsnStatus, PurchaseOrder, POLineItem } from '../../data/types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */
import { shelfLifeRuleFor } from '../fulfilmentConfig';
import { reopenedQtyByMaterial } from './goodsReceipt';
import { isCalendarDate, isNonBlank } from './shared';
import { shelfLifeMet } from './shelfLife';

// ── ASN (REQ-E07-04) ────────────────────────────────────────────────────────

/**
 * A PO an ASN may be created against: approved, and not yet fully received.
 * @type {readonly POStatus[]}
 */
export const ASN_PO_STATES = [POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED];

/**
 * ASN states that no longer carry goods toward PTI.
 * @type {readonly AsnStatus[]}
 */
export const ASN_INACTIVE_STATES = ['Cancelled'];

/**
 * ASN states the supplier may still cancel — before anything was received.
 * MR-6 BR-08 — an ASN awaiting a shelf-life exception has not shipped, so the
 * supplier may withdraw it instead of waiting for Quality.
 * @type {readonly AsnStatus[]}
 */
export const ASN_CANCELLABLE_STATES = ['Draft', 'Submitted', 'Awaiting exception'];

/**
 * @param {Pick<ASN, 'status'>} a
 * @returns {boolean}
 */
export const isActiveAsn = (a) => !ASN_INACTIVE_STATES.includes(a.status);

/**
 * The quantity the supplier committed on a PO line: confirmed, else ordered.
 * @param {Pick<POLineItem, 'quantity' | 'confirmedQty'>} li
 * @returns {number}
 */
export const committedQty = (li) => (li.confirmedQty > 0 ? li.confirmedQty : li.quantity);

/**
 * BR-02 — open quantity on a PO line = committed quantity minus the quantity on
 * the PO's non-cancelled ASNs for that material, PLUS the missing quantity of
 * any KEPT-OPEN goods receipt on that PO line (GR-1 / BL-71 / BL-81: a receipt
 * kept open reopens the missing quantity for another shipment). `excludeAsn`
 * leaves one ASN out (the one being edited). Never below zero.
 *
 * `receipts` is optional so a caller with no receipt read keeps BR-02's plain
 * answer; every ASN-lane caller (the policy hooks and the wizard) passes the
 * store's rows, so the form and the verb stay one rule (AR-11). A receipt
 * against a CANCELLED ASN reopens nothing: that shipment's quantity was never
 * consumed, so there is nothing to put back without double-counting.
 * @param {Pick<PurchaseOrder, 'poNumber'>} po
 * @param {Pick<POLineItem, 'materialCode' | 'quantity' | 'confirmedQty'>} line
 * @param {readonly ASN[]} asns
 * @param {string} [excludeAsn]
 * @param {readonly Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>[]} [receipts]
 * @returns {number}
 */
export function openQtyForLine(po, line, asns, excludeAsn, receipts = []) {
  const shipped = asns
    .filter((a) => a.poReference === po.poNumber && isActiveAsn(a) && a.asnNumber !== excludeAsn)
    .flatMap((a) => a.lineItems)
    .filter((l) => l.materialCode === line.materialCode)
    .reduce((sum, l) => sum + (Number.isFinite(l.shippedQty) ? l.shippedQty : 0), 0);
  const reopened = receipts
    .filter((gr) => gr.poNumber === po.poNumber && gr.asnNumber !== excludeAsn)
    .reduce((sum, gr) => {
      const asn = asns.find((a) => a.asnNumber === gr.asnNumber);
      if (asn && !isActiveAsn(asn)) return sum;
      return sum + (reopenedQtyByMaterial(gr, asn ?? null)[line.materialCode] ?? 0);
    }, 0);
  return Math.max(0, committedQty(line) - shipped + reopened);
}

/**
 * MR-6 BR-04 — how a line's batch was entered: picked from the supplier's
 * declared stock, or typed (shown to PTI as "not in declared stock").
 */
/** @typedef {NonNullable<AsnLineItem['batchSource']>} AsnBatchSource */

/** One ASN line as the supplier enters it (the command payload). */
/**
 * @typedef {object} AsnLineInput
 * @property {string} materialCode
 * @property {number} shippedQty
 * @property {string} [batchNumber]
 * @property {string} [expiryDate]
 * @property {AsnBatchSource} [batchSource] -  MR-6 BR-04 — picked from declared stock, or typed.
 */

/**
 * AR-11 — one ASN line as the rule reads it: the line with its batch and
 * expiry, and the ASN's expected arrival. The form and both ASN policy hooks
 * build this same shape, so a rule that needs the batch, the expiry or the ETA
 * sees them on every path.
 */
/**
 * @typedef {object} AsnLineCheck
 * @property {string} materialCode
 * @property {number} shippedQty
 * @property {string} [lotNumber]
 * @property {string} [expiryDate]
 * @property {string} [eta]
 */

/**
 * Why a line is refused. MR-6 BR-05 to BR-07 add two, both read at submission
 * only (`requireBatch`), for a material with `shelfLifeRelevant`:
 *   expiryRequired — the line carries no expiry
 *   shelfLife      — expiry is before ETA + the material's minimum remaining
 *                    shelf life. Checked LAST, so a line that returns it has
 *                    nothing else wrong — which is what lets the supplier ask
 *                    for an exception instead (BR-08).
 */
/**
 * @typedef {| 'unknownMaterial'
 *   | 'quantity'
 *   | 'overOpen'
 *   | 'batch'
 *   | 'expiry'
 *   | 'expiryRequired'
 *   | 'shelfLife'} AsnLineRefusal
 */

/**
 * A stored ASN line as the rule reads it, carrying the ASN's ETA.
 * @param {Pick<AsnLineItem, 'materialCode' | 'shippedQty' | 'lotNumber' | 'expiryDate'>} line
 * @param {string | undefined} eta
 * @returns {AsnLineCheck}
 */
export const asnLineCheckOf = (line, eta) => ({
  materialCode: line.materialCode,
  shippedQty: line.shippedQty,
  lotNumber: line.lotNumber,
  ...(line.expiryDate !== undefined ? { expiryDate: line.expiryDate } : {}),
  ...(eta !== undefined ? { eta } : {})
});

/**
 * Why one ASN line would be refused, or null. `requireBatch` is off at draft
 * time (a draft may be incomplete) and on at submission (BR-04). The ASN form
 * and both ASN policy hooks call this one function (AR-11).
 *
 * The line's own completeness (quantity, then batch) is read before the PO
 * checks, so a submission names a missing batch first, as it always has, and
 * the batch is required on every line the ASN carries.
 * `waiveShelfLife`:  MR-6 BR-08 — Quality approved an exception covering this line.
 * `receipts`:  GR-1 / BL-71 — the goods receipts read, so a kept-open receipt's
 *   missing quantity is open again for this line (never read by this module
 *   itself; the caller holds the store).
 * @param {Partial<AsnLineCheck> | null | undefined} line
 * @param {Pick<PurchaseOrder, 'poNumber' | 'lineItems'>} po
 * @param {readonly ASN[]} asns
 * @param {{ excludeAsn?: string; overShipReason?: unknown; requireBatch: boolean; waiveShelfLife?: boolean; receipts?: readonly Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>[]; }} opts
 * @returns {AsnLineRefusal | null}
 */
export function asnLineRefusal(line, po, asns, opts) {
  if (!line) return 'unknownMaterial';
  const q = line.shippedQty;
  if (typeof q !== 'number' || !Number.isFinite(q) || q <= 0) return 'quantity';
  if (opts.requireBatch && !isNonBlank(line.lotNumber)) return 'batch';
  // MR-6 BR-07 — expiry is part of a complete line for a shelf-life material.
  const rule =
    opts.requireBatch && typeof line.materialCode === 'string'
      ? shelfLifeRuleFor(line.materialCode)
      : null;
  if (rule?.relevant && !isNonBlank(line.expiryDate)) return 'expiryRequired';
  const item = po.lineItems.find((li) => li.materialCode === line.materialCode);
  if (!item) return 'unknownMaterial';
  if (
    q > openQtyForLine(po, item, asns, opts.excludeAsn, opts.receipts) &&
    !isNonBlank(opts.overShipReason)
  ) {
    return 'overOpen';
  }
  if (line.expiryDate !== undefined && line.expiryDate !== '' && !isCalendarDate(line.expiryDate)) {
    return 'expiry';
  }
  // MR-6 BR-05 / BR-06 — last, so it is the only thing wrong when it fires.
  if (
    rule?.relevant &&
    !opts.waiveShelfLife &&
    isCalendarDate(line.expiryDate) &&
    isCalendarDate(line.eta) &&
    !shelfLifeMet(line.expiryDate, line.eta, rule.minMonths)
  ) {
    return 'shelfLife';
  }
  return null;
}
