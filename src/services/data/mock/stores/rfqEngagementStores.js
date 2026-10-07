// ────────────────────────────────────────────────────────────────────────────
// Mutable stores for the supplier's side of an RFQ (RFx working spec,
// 2026-09-21): intents, confidentiality acceptances and clarifications.
//
// The same contract as the RFx stores beside them (`rfxStores.collection`):
// reads resolve from here, commands mutate immutably, `reset()` restores the
// seed for test isolation.
// ────────────────────────────────────────────────────────────────────────────

import { collection } from './rfxStores';
import {
  RFQ_CLARIFICATION_SEED,
  RFQ_CONFIDENTIALITY_SEED,
  RFQ_INTENT_SEED
} from '../fixtures/rfqEngagement';
/** @import { RfqClarification } from '../../../sourcing/rfqModel' */
/** @import { RfqConfidentialityRecord, RfqIntentRecord } from '../../../sourcing/rfqResponse' */

export const rfqIntentStore = /** @type {typeof collection<RfqIntentRecord>} */ (collection)(
  RFQ_INTENT_SEED,
  'ri'
);
export const rfqConfidentialityStore = /** @type {typeof collection<RfqConfidentialityRecord>} */ (
  collection
)(RFQ_CONFIDENTIALITY_SEED, 'rca');
export const rfqClarificationStore = /** @type {typeof collection<RfqClarification>} */ (
  collection
)(RFQ_CLARIFICATION_SEED, 'rc');

/**
 * The intent one supplier stated on one RFQ, if any.
 * @param {string} rfqId
 * @param {string} supplierId
 * @returns {RfqIntentRecord | undefined}
 */
export const intentOf = (rfqId, supplierId) =>
  rfqIntentStore.all().find((r) => r.rfqId === rfqId && r.supplierId === supplierId);

/**
 * When one supplier accepted one RFQ's confidentiality terms, if it has.
 * @param {string} rfqId
 * @param {string} supplierId
 * @returns {RfqConfidentialityRecord | undefined}
 */
export const acceptanceOf = (rfqId, supplierId) =>
  rfqConfidentialityStore.all().find((r) => r.rfqId === rfqId && r.supplierId === supplierId);

/**
 * Reset every supplier-response store (test isolation).
 * @returns {void}
 */
export function resetRfqEngagementStores() {
  rfqIntentStore.reset();
  rfqConfidentialityStore.reset();
  rfqClarificationStore.reset();
}
