// ────────────────────────────────────────────────────────────────────────────
// The read model for the supplier's side of an RFQ (RFx working spec,
// 2026-09-21): intents, confidentiality acceptances and clarifications.
//
// ⚠️ **THE VISIBILITY RULES LIVE HERE, ONCE.** A supplier reads its own intent
// and acceptance and nobody else's; it reads its own clarifications and every
// published answer on an RFQ it is invited to, with the asker removed. Every
// surface reads through this module, so there is no second path that could
// show a supplier who asked, or another supplier's decline.
// ────────────────────────────────────────────────────────────────────────────

import { rfqStore } from './stores/rfqStore';
import {
  rfqClarificationStore,
  rfqConfidentialityStore,
  rfqIntentStore
} from './stores/rfqEngagementStores';
import { rfxSupplierName } from './rfxReadModel';
/** @import { RfqClarificationView, RfqEngagementView, RfqIntentRecord } from '../../sourcing/rfqResponse' */
import { clarificationViewFor } from '../../sourcing/rfqResponse';
/** @import { RfqIntent } from '../../sourcing/rfqModel' */

/**
 * One row per (RFQ, supplier) that has stated an intent or accepted terms.
 * `readerSupplierId === null` is the buyer.
 * @param {string | null} readerSupplierId
 * @returns {readonly RfqEngagementView[]}
 */
export function rfqEngagementViews(readerSupplierId) {
  const keys = /** @type {Map<string, { rfqId: string; supplierId: string }>} */ (new Map());
  for (const r of [...rfqIntentStore.all(), ...rfqConfidentialityStore.all()]) {
    if (readerSupplierId !== null && r.supplierId !== readerSupplierId) continue;
    keys.set(`${r.rfqId}|${r.supplierId}`, { rfqId: r.rfqId, supplierId: r.supplierId });
  }
  return [...keys.values()].map(({ rfqId, supplierId }) => {
    const intent = rfqIntentStore
      .all()
      .find((r) => r.rfqId === rfqId && r.supplierId === supplierId);
    const accepted = rfqConfidentialityStore
      .all()
      .find((r) => r.rfqId === rfqId && r.supplierId === supplierId);
    return {
      rfqId,
      supplierId,
      supplierName: rfxSupplierName(supplierId),
      ...(intent ? { intent: stripId(intent), intentId: intent.id } : {}),
      ...(accepted ? { confidentialityAcceptedAt: accepted.acceptedAt } : {})
    };
  });
}

/**
 * The model's `RfqIntent`, without the store's key.
 * @param {RfqIntentRecord} r
 * @returns {RfqIntent}
 */
function stripId(r) {
  return r.intent === 'respond'
    ? { rfqId: r.rfqId, supplierId: r.supplierId, intent: 'respond', at: r.at }
    : {
        rfqId: r.rfqId,
        supplierId: r.supplierId,
        intent: 'decline',
        reason: r.reason,
        text: r.text,
        at: r.at
      };
}

/**
 * Every clarification the reader may see, oldest first.
 * @param {string | null} readerSupplierId
 * @returns {readonly RfqClarificationView[]}
 */
export function rfqClarificationViews(readerSupplierId) {
  /**
   * @param {string} rfqId
   * @returns {boolean}
   */
  const invitedTo = (rfqId) =>
    readerSupplierId !== null &&
    (rfqStore.get(rfqId)?.invitedSupplierIds.includes(readerSupplierId) ?? false);
  return rfqClarificationStore
    .all()
    .map((c) => clarificationViewFor(c, readerSupplierId, invitedTo, rfxSupplierName))
    .filter(/** @returns {v is RfqClarificationView} */ (v) => v !== null)
    .sort((a, b) => a.askedAt.localeCompare(b.askedAt));
}
