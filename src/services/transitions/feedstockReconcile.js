// ─────────────────────────────────────────────────────────────────────────────
// FEEDSTOCK (FS) RECONCILE — DRC-15a (BL-201), replacing the fixed stock
// reconcile of REQ-E06-04 [DRC-D14]. The owner ruled on 2026-10-16 that FS means
// FEEDSTOCK, and that the reconcile compares the POs PTI ordered with the
// call-offs and ASNs PTI requested, daily [Owner, 2026-10-16, F4].
//
// PURE. No store, no clock: the read model hands in the purchase orders, the
// call-offs and the ASNs as the hub holds them on the day it is read, and gets
// one row per supplier × material back. Nothing here is stored.
//
//   · PO ordered     — quantity on the pair's PO lines whose PO still stands
//                      (DRC-15a BR-01; `FEEDSTOCK_PO_EXCLUDED_STATES`).
//   · Called off     — quantity on the pair's RELEASED call-offs, from
//                      Awaiting Confirmation onward (`isReleased`, callOffRules):
//                      drafts, dismissed and rejected call-offs count nothing.
//   · ASN requested  — shipped quantity of the pair's material on ASNs linked
//                      to those call-offs, in a shipped state
//                      (`SHIPPED_ASN_STATES`, callOffRules).
//
// Not yet called off          = max(0, PO ordered − called off)
// Called off, not yet shipped = max(0, called off − ASN requested)
// An excess is never a negative remainder; it shows as a note.
//
// DRC-15a BR-02 — the remainders are SHOWN ONLY: no outcome, no liability flag,
// no settlement. What happens to a remainder is DRC-15b (BL-207), on hold.
// DRC-15a BR-03 — the max stock Procurement maintains (`maxStock.js`) stays on
// the row; it caps nothing here.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { ASN, CallOff, PurchaseOrder } from '../data/types' */
import { POStatus } from '../data/types';
import { SHIPPED_ASN_STATES, isReleased } from './callOffRules';

/**
 * DRC-15a BR-01 — PO states whose quantity is NOT "PO ordered". The PO model
 * has no Cancelled state; a PO the supplier REJECTED (REQ-E07-02) is the one
 * that no longer stands, so it is the one left out. Every other state —
 * including Adjusted, Delivered and Closed — is an order PTI placed.
 * @type {readonly POStatus[]}
 */
export const FEEDSTOCK_PO_EXCLUDED_STATES = [POStatus.REJECTED];

/**
 * @typedef {Pick<PurchaseOrder, 'poNumber' | 'supplierId' | 'supplierName' | 'status' | 'lineItems'>} FsPoInput
 * @typedef {Pick<CallOff, 'id' | 'callOffNumber' | 'supplierId' | 'supplierName' | 'materialCode' | 'description' | 'uom' | 'status' | 'quantity'>} FsCallOffInput
 * @typedef {Pick<ASN, 'asnNumber' | 'status' | 'callOffId' | 'lineItems'>} FsAsnInput
 */

/**
 * `asOf`:  The hub day the reconcile is read on (`YYYY-MM-DD`).
 * `maxStock`:  The max stock Procurement maintains for a pair, or null (BR-03).
 * `maxStockSettable`:  Whether the pair is one the hub assigns, so the governed verb can address it.
 *
 * @typedef {{
 *   readonly purchaseOrders: readonly FsPoInput[];
 *   readonly callOffs: readonly FsCallOffInput[];
 *   readonly asns: readonly FsAsnInput[];
 *   readonly maxStock: (supplierId: string, materialCode: string) => number | null;
 *   readonly maxStockSettable: (supplierId: string, materialCode: string) => boolean;
 *   readonly asOf: string;
 * }} FsInputs
 */

/**
 * `key`:  supplier | material.
 * `poNumbers`:  The standing POs whose lines make up `poOrdered`.
 * `valueOnlyLines`:  Value-limit PO lines for the pair: they carry no quantity, so they add nothing to `poOrdered`.
 * `calledBeyondPo`:  Called off beyond the PO ordered (0 when not).
 * `shippedBeyondCalledOff`:  ASN requested beyond the called-off quantity (0 when not).
 *
 * @typedef {{
 *   readonly key: string;
 *   readonly asOf: string;
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly materialCode: string;
 *   readonly materialLabel: string;
 *   readonly uom: string;
 *   readonly poOrdered: number;
 *   readonly poNumbers: readonly string[];
 *   readonly valueOnlyLines: number;
 *   readonly calledOff: number;
 *   readonly callOffNumbers: readonly string[];
 *   readonly asnRequested: number;
 *   readonly asnNumbers: readonly string[];
 *   readonly notYetCalledOff: number;
 *   readonly calledOffNotShipped: number;
 *   readonly calledBeyondPo: number;
 *   readonly shippedBeyondCalledOff: number;
 *   readonly maxStock: number | null;
 *   readonly maxStockSettable: boolean;
 * }} FsRow
 */

/**
 * DRC-15a BR-01 — the remainders for one supplier × material.
 * @param {{ readonly poOrdered: number; readonly calledOff: number; readonly asnRequested: number }} f
 */
export function feedstockRemainders(f) {
  return {
    notYetCalledOff: Math.max(0, f.poOrdered - f.calledOff),
    calledOffNotShipped: Math.max(0, f.calledOff - f.asnRequested),
    calledBeyondPo: Math.max(0, f.calledOff - f.poOrdered),
    shippedBeyondCalledOff: Math.max(0, f.asnRequested - f.calledOff)
  };
}

/**
 * @param {string} supplierId
 * @param {string} materialCode
 */
const pairKey = (supplierId, materialCode) => `${supplierId}|${materialCode}`;

/**
 * DRC-15a BR-01 — one row per supplier × material that has a standing PO line
 * or a released call-off, sorted by supplier name, then material code.
 * @param {FsInputs} input
 * @returns {FsRow[]}
 */
export function buildFeedstockReconcile(input) {
  /**
   * @typedef {{
   *   supplierId: string;
   *   supplierName: string;
   *   materialCode: string;
   *   materialLabel: string;
   *   uom: string;
   *   poOrdered: number;
   *   poNumbers: Set<string>;
   *   valueOnlyLines: number;
   *   calledOff: number;
   *   callOffNumbers: Set<string>;
   *   asnRequested: number;
   *   asnNumbers: Set<string>;
   * }} Acc
   */
  const groups = /** @type {Map<string, Acc>} */ (new Map());
  /**
   * @param {string} supplierId
   * @param {string} supplierName
   * @param {string} materialCode
   * @param {string} materialLabel
   * @param {string} uom
   * @returns {Acc}
   */
  const accFor = (supplierId, supplierName, materialCode, materialLabel, uom) => {
    const key = pairKey(supplierId, materialCode);
    let acc = groups.get(key);
    if (!acc) {
      acc = {
        supplierId,
        supplierName,
        materialCode,
        materialLabel,
        uom,
        poOrdered: 0,
        poNumbers: new Set(),
        valueOnlyLines: 0,
        calledOff: 0,
        callOffNumbers: new Set(),
        asnRequested: 0,
        asnNumbers: new Set()
      };
      groups.set(key, acc);
    }
    return acc;
  };

  // PO ordered — every line of a PO that still stands.
  for (const po of input.purchaseOrders) {
    if (FEEDSTOCK_PO_EXCLUDED_STATES.includes(po.status)) continue;
    for (const li of po.lineItems) {
      const acc = accFor(po.supplierId, po.supplierName, li.materialCode, li.description, li.uom);
      // A value-limit line commits a value, not a quantity (CR-04): `quantity`
      // is 0 there and means "no quantity", so it is counted apart.
      if (li.valueLimit !== undefined) acc.valueOnlyLines += 1;
      else acc.poOrdered += li.quantity;
      acc.poNumbers.add(po.poNumber);
    }
  }

  // Called off — released call-offs only (drafts, dismissed, rejected count nothing).
  const released = /** @type {Map<string, FsCallOffInput>} */ (new Map());
  for (const c of input.callOffs) {
    if (!isReleased(c)) continue;
    released.set(c.id, c);
    const acc = accFor(c.supplierId, c.supplierName, c.materialCode, c.description, c.uom);
    acc.calledOff += c.quantity;
    acc.callOffNumbers.add(c.callOffNumber);
  }

  // ASN requested — shipped ASNs against those call-offs, the call-off's material only.
  for (const a of input.asns) {
    if (!a.callOffId || !SHIPPED_ASN_STATES.includes(a.status)) continue;
    const c = released.get(a.callOffId);
    if (!c) continue;
    const qty = a.lineItems
      .filter((l) => l.materialCode === c.materialCode)
      .reduce((s, l) => s + l.shippedQty, 0);
    if (qty === 0) continue;
    const acc = /** @type {Acc} */ (groups.get(pairKey(c.supplierId, c.materialCode)));
    acc.asnRequested += qty;
    acc.asnNumbers.add(a.asnNumber);
  }

  /** @type {FsRow[]} */
  const rows = [];
  for (const [key, g] of groups) {
    rows.push({
      key,
      asOf: input.asOf,
      supplierId: g.supplierId,
      supplierName: g.supplierName,
      materialCode: g.materialCode,
      materialLabel: g.materialLabel,
      uom: g.uom,
      poOrdered: g.poOrdered,
      poNumbers: [...g.poNumbers].sort(),
      valueOnlyLines: g.valueOnlyLines,
      calledOff: g.calledOff,
      callOffNumbers: [...g.callOffNumbers].sort(),
      asnRequested: g.asnRequested,
      asnNumbers: [...g.asnNumbers].sort(),
      ...feedstockRemainders(g),
      maxStock: input.maxStock(g.supplierId, g.materialCode),
      maxStockSettable: input.maxStockSettable(g.supplierId, g.materialCode)
    });
  }
  return rows.sort(
    (a, b) =>
      a.supplierName.localeCompare(b.supplierName) || a.materialCode.localeCompare(b.materialCode)
  );
}
