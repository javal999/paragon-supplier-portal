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
// DRC-15a BR-02 — the remainders carry no outcome and no settlement. What
// happens to the "not yet called off" remainder is DRC-15b (BL-207): the owner
// said it "will be discussed later", so a RECOMMENDATION is built behind the
// switch `FEEDSTOCK_LEFTOVER_RULES.leftoverRule` [Proposed BL-207], for review.
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
 * DRC-15b (BL-207) [Proposed] — what the "not yet called off" remainder means.
 *   · `'showOnly'`       — shown only (DRC-15a BR-02, the behaviour before BL-207).
 *   · `'flagLiability'`  — min(remainder, max stock where set) is flagged
 *                          "liability, not priced", mirroring the settlement the
 *                          owner ruled for the old fixed stock reconcile
 *                          (REQ-E06-04 BR-09, ENG-D17: flagged, never priced,
 *                          agreed outside the Hub). No max stock → the full remainder.
 *   · `'carryToNextPo'`  — the remainder is shown as carried into the pair's next
 *                          PO. Display only: nothing is created.
 * @typedef {'showOnly' | 'flagLiability' | 'carryToNextPo'} FsLeftoverRule
 */

/** @type {readonly FsLeftoverRule[]} */
export const FS_LEFTOVER_RULE_VARIANTS = Object.freeze([
  'showOnly',
  'flagLiability',
  'carryToNextPo'
]);

/**
 * DRC-15b (BL-207) — the leftover rules block. Every key is [Proposed]: built on
 * the owner's request for review while the rule is "discussed later", so the
 * page labels each figure built on it "Proposed: awaiting owner review (BL-207)".
 */
export const FEEDSTOCK_LEFTOVER_RULES = Object.freeze({
  /** [Proposed BL-207] DRC-15b — the recommended variant; `FS_LEFTOVER_RULE_VARIANTS` lists the alternatives. */
  leftoverRule: /** @type {FsLeftoverRule} */ ('flagLiability')
});

/**
 * `rule`:  The variant that produced this outcome.
 * `liabilityQty`:  `'flagLiability'` only: the quantity flagged "liability, not priced"; null otherwise or with no remainder.
 * `noMaxAgreed`:  `'flagLiability'` only: the liability is the full remainder because no max stock is set.
 * `carriedQty`:  `'carryToNextPo'` only: the remainder shown as carried into the next PO; null otherwise or with no remainder.
 *
 * @typedef {{
 *   readonly rule: FsLeftoverRule;
 *   readonly liabilityQty: number | null;
 *   readonly noMaxAgreed: boolean;
 *   readonly carriedQty: number | null;
 * }} FsLeftover
 */

/**
 * DRC-15b (BL-207) [Proposed] — the outcome of the "not yet called off"
 * remainder under one variant. A remainder of 0 carries no flag.
 * @param {{ readonly notYetCalledOff: number; readonly maxStock: number | null }} f
 * @param {FsLeftoverRule} [rule]
 * @returns {FsLeftover}
 */
export function feedstockLeftover(f, rule = FEEDSTOCK_LEFTOVER_RULES.leftoverRule) {
  const none = { rule, liabilityQty: null, noMaxAgreed: false, carriedQty: null };
  if (f.notYetCalledOff <= 0) return none;
  switch (rule) {
    case 'showOnly':
      return none;
    case 'flagLiability':
      // [Proposed BL-207] mirrors REQ-E06-04 BR-09 / ENG-D17: flagged, never priced.
      return f.maxStock === null
        ? { ...none, liabilityQty: f.notYetCalledOff, noMaxAgreed: true }
        : { ...none, liabilityQty: Math.min(f.notYetCalledOff, f.maxStock) };
    case 'carryToNextPo':
      return { ...none, carriedQty: f.notYetCalledOff };
    default:
      throw new Error(`Unknown feedstock leftover rule: ${String(rule)}`);
  }
}

/**
 * @typedef {Pick<PurchaseOrder, 'poNumber' | 'supplierId' | 'supplierName' | 'status' | 'lineItems'>} FsPoInput
 * @typedef {Pick<CallOff, 'id' | 'callOffNumber' | 'supplierId' | 'supplierName' | 'materialCode' | 'description' | 'uom' | 'status' | 'quantity'>} FsCallOffInput
 * @typedef {Pick<ASN, 'asnNumber' | 'status' | 'callOffId' | 'lineItems'>} FsAsnInput
 */

/**
 * `asOf`:  The hub day the reconcile is read on (`YYYY-MM-DD`).
 * `leftoverRule`:  DRC-15b variant; defaults to `FEEDSTOCK_LEFTOVER_RULES.leftoverRule` [Proposed BL-207].
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
 *   readonly leftoverRule?: FsLeftoverRule;
 * }} FsInputs
 */

/**
 * `key`:  supplier | material.
 * `poNumbers`:  The standing POs whose lines make up `poOrdered`.
 * `valueOnlyLines`:  Value-limit PO lines for the pair: they carry no quantity, so they add nothing to `poOrdered`.
 * `calledBeyondPo`:  Called off beyond the PO ordered (0 when not).
 * `shippedBeyondCalledOff`:  ASN requested beyond the called-off quantity (0 when not).
 * `leftover`:  DRC-15b [Proposed BL-207] — what the "not yet called off" remainder means.
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
 *   readonly leftover: FsLeftover;
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
    const remainders = feedstockRemainders(g);
    const maxStock = input.maxStock(g.supplierId, g.materialCode);
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
      ...remainders,
      maxStock,
      maxStockSettable: input.maxStockSettable(g.supplierId, g.materialCode),
      // DRC-15b [Proposed BL-207]
      leftover: feedstockLeftover(
        { notYetCalledOff: remainders.notYetCalledOff, maxStock },
        input.leftoverRule ?? FEEDSTOCK_LEFTOVER_RULES.leftoverRule
      )
    });
  }
  return rows.sort(
    (a, b) =>
      a.supplierName.localeCompare(b.supplierName) || a.materialCode.localeCompare(b.materialCode)
  );
}
