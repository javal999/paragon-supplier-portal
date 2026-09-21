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
  RFQ_INTENT_SEED,
} from '../fixtures/rfqEngagement';
import type { RfqClarification } from '../../../sourcing/rfqModel';
import type { RfqConfidentialityRecord, RfqIntentRecord } from '../../../sourcing/rfqResponse';

export const rfqIntentStore = collection<RfqIntentRecord>(RFQ_INTENT_SEED, 'ri');
export const rfqConfidentialityStore = collection<RfqConfidentialityRecord>(RFQ_CONFIDENTIALITY_SEED, 'rca');
export const rfqClarificationStore = collection<RfqClarification>(RFQ_CLARIFICATION_SEED, 'rc');

/** The intent one supplier stated on one RFQ, if any. */
export const intentOf = (rfqId: string, supplierId: string): RfqIntentRecord | undefined =>
  rfqIntentStore.all().find((r) => r.rfqId === rfqId && r.supplierId === supplierId);

/** When one supplier accepted one RFQ's confidentiality terms, if it has. */
export const acceptanceOf = (rfqId: string, supplierId: string): RfqConfidentialityRecord | undefined =>
  rfqConfidentialityStore.all().find((r) => r.rfqId === rfqId && r.supplierId === supplierId);

/** Reset every supplier-response store (test isolation). */
export function resetRfqEngagementStores(): void {
  rfqIntentStore.reset();
  rfqConfidentialityStore.reset();
  rfqClarificationStore.reset();
}
