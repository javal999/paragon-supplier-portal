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
import { compareReceipt } from './goodsReceipt';
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
 * store's rows, so the form and the verb stay one rule (AR-11).
 *
 * ⚠️ BL-325 — the reopened amount is computed ONCE PER ASN, not summed per
 * receipt. Only an ASN this read counts in `shipped` (same PO, active, not
 * `excludeAsn`) may reopen, only when it has a kept-open receipt line for the
 * material (no receipt → nothing was received → nothing to put back), and it
 * reopens
 *   max(0, its shipped quantity for the material − Σ received on the kept-open
 *          lines of its receipts for the material).
 * A receipt against a CANCELLED ASN, an ASN of another PO, the excluded ASN, or
 * an ASN not on record reopens nothing: that shipment's quantity was never
 * subtracted from `shipped`, so there is nothing to put back without
 * double-counting. (Before this fix two receipts against one ASN reopened the
 * same debt twice, and an ASN-less receipt reopened `qtyExpected − received`
 * on top of a quantity that was never consumed.)
 *
 * ⚠️ BL-139 (owner ruling, 2026-11-19) — THE RECEIPT IS THE AUTHORITY, AND THE
 * GOODS ARE SUBTRACTED ONCE. A `Delivered` ASN that a receipt of this PO covers
 * is accounted by what the receipts say ARRIVED (Σ `received` for the
 * material), never by its shipped quantity AND the receipt both: the shipped
 * figure is not subtracted a second time. A `Delivered` ASN with no covering
 * receipt for the material keeps its shipped quantity (nothing arrived to
 * measure), and every other state is unchanged. Because the receipt's figure is
 * already the net of the shortfall, such an ASN does not also REOPEN its
 * missing quantity — that would hand the same shortfall out twice. The ruling
 * is pinned in `receiptAuthorityOpenQty.test.js`.
 * @param {Pick<PurchaseOrder, 'poNumber'>} po
 * @param {Pick<POLineItem, 'materialCode' | 'quantity' | 'confirmedQty'>} line
 * @param {readonly ASN[]} asns
 * @param {string} [excludeAsn]
 * @param {readonly Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>[]} [receipts]
 * @returns {number}
 */
export function openQtyForLine(po, line, asns, excludeAsn, receipts = []) {
  const counted = asns.filter(
    (a) => a.poReference === po.poNumber && isActiveAsn(a) && a.asnNumber !== excludeAsn
  );
  /**
   * One ASN's shipped quantity for this material.
   * @param {Pick<ASN, 'lineItems'>} asn
   * @returns {number}
   */
  const shippedOf = (asn) =>
    asn.lineItems
      .filter((l) => l.materialCode === line.materialCode)
      .reduce((sum, l) => sum + (Number.isFinite(l.shippedQty) ? l.shippedQty : 0), 0);
  /**
   * The receipts of this PO that name this ASN.
   * @param {Pick<ASN, 'asnNumber'>} asn
   */
  const coveringOf = (asn) =>
    receipts.filter((gr) => gr.poNumber === po.poNumber && gr.asnNumber === asn.asnNumber);
  /**
   * This ASN's comparison lines for this material, over every covering receipt.
   * @param {Pick<ASN, 'asnNumber' | 'lineItems'>} asn
   */
  const coveringLinesOf = (asn) =>
    coveringOf(asn)
      .flatMap((gr) => compareReceipt(gr, asn))
      .filter((l) => l.materialCode === line.materialCode);
  /**
   * BL-139 — how much THIS ASN has accounted for against the committed line.
   * A `Delivered` ASN a receipt covers is accounted by what the receipt says
   * arrived; every other case is the ASN's shipped quantity. The two are never
   * added together — that is the double count the ruling forbids.
   * @param {ASN} asn
   * @returns {number}
   */
  const accountedOf = (asn) => {
    if (asn.status !== 'Delivered') return shippedOf(asn);
    const covering = coveringLinesOf(asn);
    if (covering.length === 0) return shippedOf(asn);
    return covering.reduce((sum, l) => sum + l.received, 0);
  };
  const accounted = counted.reduce((sum, asn) => sum + accountedOf(asn), 0);
  // BL-325 — per ASN, once: see the arithmetic in this function's doc. The
  // existence check is what keeps this from reopening every shipment that has
  // no receipt at all — with none, `Σ received` is 0 and there is nothing to
  // reopen; only an ASN with a KEPT-OPEN line for this material puts quantity
  // back. BL-139 — a `Delivered` ASN is accounted by its covering receipt
  // already, so its missing quantity is open through that figure; reopening it
  // as well would count the shortfall twice.
  const reopened = counted.reduce((sum, asn) => {
    const keptOpenLines = coveringLinesOf(asn).filter((l) => l.qtyOutcome === 'shortOver');
    if (keptOpenLines.length === 0) return sum;
    if (asn.status === 'Delivered') return sum;
    const receivedOnKeptOpenLines = keptOpenLines.reduce((received, l) => received + l.received, 0);
    return sum + Math.max(0, shippedOf(asn) - receivedOnKeptOpenLines);
  }, 0);
  const open = committedQty(line) - accounted + reopened;
  // BL-325 — never hand a NaN downstream: `q > NaN` is false, which silently
  // disabled the over-ship refusal instead of refusing the line.
  return Number.isFinite(open) ? Math.max(0, open) : 0;
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
