// ─────────────────────────────────────────────────────────────────────────────
// Purchase-order fixtures · the raw array and its re-timed export. Separate
// from the authored rows so the shift reads alone. The raw array keeps the
// authored order: base orders 1, base orders 2, the sup-007 walkthrough set,
// then the single-case rows.
// ─────────────────────────────────────────────────────────────────────────────
/** @import { PurchaseOrder } from '@services/data/types' */
import { shiftFields, shiftIso } from '@services/data/fixturePresent';
import { baseOrders1Raw } from './baseOrders1';
import { baseOrders2Raw } from './baseOrders2';
import { sup007WalkthroughRaw } from './sup007Walkthrough';
import { singleCaseOrdersRaw } from './singleCaseOrders';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THESE ARE THE RAW, AUTHORED LITERALS — 2025, exactly as written. Nothing
// reads them directly: `mockPurchaseOrders` at the foot of this file is the
// shifted export, re-timed to the declared present by the `purchaseOrder`
// family anchor (`services/data/fixturePresent.js`). The raw dates stay here so
// the authoring intent — and the spacing between orders, deliveries and the
// response windows — is readable rather than encoded away into an offset.
// ─────────────────────────────────────────────────────────────────────────────
/** @type {PurchaseOrder[]} */
const mockPurchaseOrdersRaw = [
  ...baseOrders1Raw,
  ...baseOrders2Raw,
  ...sup007WalkthroughRaw,
  ...singleCaseOrdersRaw
];

// ─────────────────────────────────────────────────────────────────────────────
// THE DECLARED PRESENT — FIXTURE-PRESENT-01 (d).
//
// `shiftFields` moves the three TOP-LEVEL dates; the response and the shipping
// notice carry dates one level down, and a field a shift cannot reach is a
// field that silently stays in 2025 — so they are mapped here by the SAME
// `shiftIso`, never by a second offset.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {string} v
 * @returns {string}
 */
const shift = (v) => shiftIso(v, 'purchaseOrder');

/** @type {PurchaseOrder[]} */
export const mockPurchaseOrders = shiftFields(mockPurchaseOrdersRaw, 'purchaseOrder', [
  'orderDate',
  'requestedDeliveryDate',
  'confirmedDeliveryDate',
  'responseRequestedAt'
]).map((po) => ({
  ...po,
  response: po.response
    ? {
        ...po.response,
        respondedAt: shift(po.response.respondedAt),
        ...(po.response.confirmedDeliveryDate
          ? { confirmedDeliveryDate: shift(po.response.confirmedDeliveryDate) }
          : {}),
        ...(po.response.lines
          ? { lines: po.response.lines.map((l) => ({ ...l, counterDate: shift(l.counterDate) })) }
          : {}),
        ...(po.response.review
          ? { review: { ...po.response.review, reviewedAt: shift(po.response.review.reviewedAt) } }
          : {})
      }
    : undefined,
  shippingNotice: po.shippingNotice
    ? {
        ...po.shippingNotice,
        ...(po.shippingNotice.startedOn ? { startedOn: shift(po.shippingNotice.startedOn) } : {}),
        ...(po.shippingNotice.updatedAt ? { updatedAt: shift(po.shippingNotice.updatedAt) } : {}),
        ...(po.shippingNotice.expectedCompletionDate
          ? { expectedCompletionDate: shift(po.shippingNotice.expectedCompletionDate) }
          : {}),
        ...(po.shippingNotice.previousCompletionDate
          ? { previousCompletionDate: shift(po.shippingNotice.previousCompletionDate) }
          : {})
      }
    : undefined
}));
