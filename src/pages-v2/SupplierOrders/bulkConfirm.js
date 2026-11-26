// ────────────────────────────────────────────────────────────────────────────
// UCX-P2 v2 (BL-363) · UCX-F27 — "CONFIRM AS REQUESTED" IN ONE ACT.
//
// Which purchase orders a supplier may tick in the bulk bar, and what each
// one's confirm sends. The rules are the record's own, never a new one:
//
//   · an order that still waits for the supplier's answer (Sent / Viewed /
//     Acknowledged) is tickable — `isAwaitingResponse`;
//   · an ESCALATED order is not (safeguard 3): the supplier is past the
//     deadline, so silencing it from a list would hide the one signal PTI's
//     goal UCX-SG1 counts on;
//   · an order with a VALUE-LIMIT line is not: the line commits a value and no
//     quantity (CR-04, BL-13), so "as requested" has no quantity to name;
//   · an answered order is not: it has no confirm left.
//
// "As requested" sends the ordered quantity per line and the REQUESTED
// delivery date, so the order is confirmed exactly as PTI asked for it. The
// per-record verb, its policy and its bounds stay the only enforcement (the
// bulk path calls the same `t_po_confirm`).
// ────────────────────────────────────────────────────────────────────────────

/** @import { PurchaseOrder } from '@services/data/types' */
import { isAwaitingResponse, isEscalated } from '@services/data/poResponseProjection';

/**
 * Why a PO cannot be ticked, or null when it can.
 * @param {PurchaseOrder} po
 * @param {string} nowIso
 * @returns {'answered' | 'escalated' | 'valueLimit' | null}
 */
export function poNeedsDecision(po, nowIso) {
  if (!isAwaitingResponse(po)) return 'answered';
  if (isEscalated(po, nowIso)) return 'escalated';
  if (po.lineItems.some((l) => l.valueLimit !== undefined)) return 'valueLimit';
  return null;
}

/**
 * @param {PurchaseOrder} po
 * @param {string} nowIso
 * @returns {boolean}
 */
export const poBulkEligible = (po, nowIso) => poNeedsDecision(po, nowIso) === null;

/**
 * The confirm payload for one PO: every line's ordered quantity and the
 * REQUESTED delivery date — the order exactly as PTI asked for it.
 * @param {PurchaseOrder} po
 */
export const asRequestedConfirm = (po) => ({
  poId: po.id,
  confirmedQuantities: po.lineItems.map((l) => l.quantity),
  confirmedDeliveryDate: po.requestedDeliveryDate
});
