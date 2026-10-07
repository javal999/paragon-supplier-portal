// ─────────────────────────────────────────────────────────────────────────────
// The supplier's OWN obligations — "what Paragon needs from you" (SDC-5e).
//
// Extracted here (from SupplierDeliveryAgreements, its first consumer) so a SECOND
// own-facing surface — the Channel Inbox "what Paragon needs from you" section
// (Comm Hub C5) — reuses the SAME derivation rather than re-deriving it. Pure over
// the own-scoped delivery views + the shared clock; no service read, no store.
//
// Shaped from the SAME 5a `deriveDeliveryChase` the buyer chase uses, reframed
// OWN-FACING so NO chase vocabulary leaks:
//   · non-compliance-alert → 'overdue'  (factual — Paragon is waiting)
//   · anticipatory-nudge   → 'upcoming' (Paragon is expecting this)
//   · drift → OMITTED. Drift is a buyer-side PATTERN judgment ("this supplier is
//     slipping"); the supplier sees the constituent overdue lines, never "you are
//     drifting" (those lines already appear as non-compliance-alerts → overdue).
// Own-scoped by construction: `views` come from an own-scoped supplier read, so
// every entry is this supplier's own (never another's). Read-only — no writes.
// ─────────────────────────────────────────────────────────────────────────────

import { deriveDeliveryChase } from './deliveryChase';
/** @import { DeliveryAgreementView } from '../delivery' */

/**
 * @typedef {{
 *     readonly key: string;
 *     readonly kind: 'overdue' | 'upcoming';
 *     readonly materialCode: string;
 *     readonly dueDate: string;
 *   }} SupplierObligation
 */

const OBLIGATION_KIND = /** @type {const} */ ({
  'non-compliance-alert': 'overdue',
  'anticipatory-nudge': 'upcoming'
});
/** @type {Record<SupplierObligation['kind'], number>} */
const OBLIGATION_ORDER = { overdue: 0, upcoming: 1 };

/** Shape the own obligations from the mirror's views: reuse 5a `deriveDeliveryChase`,
 *  drop drift, map to own-facing kinds, sort OVERDUE-first then by due date. Pure —
 * @param {readonly DeliveryAgreementView[]} views
 * @param {string} now
 * @returns {SupplierObligation[]}
 *  no new derivation, no service read (the caller already holds the own-scoped views). */
export function shapeObligations(views, now) {
  return deriveDeliveryChase(views, now)
    .filter((e) => e.mode === 'non-compliance-alert' || e.mode === 'anticipatory-nudge')
    .map((e) => ({
      key: `${e.agreementId}-${e.itemSeq}-${e.releaseSeq}`,
      kind: OBLIGATION_KIND[/** @type {'non-compliance-alert' | 'anticipatory-nudge'} */ (e.mode)],
      materialCode: e.materialCode,
      dueDate: e.dueDate
    }))
    .sort(
      (a, b) =>
        OBLIGATION_ORDER[a.kind] - OBLIGATION_ORDER[b.kind] || a.dueDate.localeCompare(b.dueDate)
    );
}
