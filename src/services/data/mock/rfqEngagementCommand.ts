// ────────────────────────────────────────────────────────────────────────────
// The write side of the supplier's RFQ response (RFx working spec,
// 2026-09-21): the command targets for intent, confidentiality and
// clarifications, and the policy bindings that judge them — plus the tiered
// quotation rule, bound here because it reads the same stores.
//
// Imported by `MockCommandService`, which registers the targets in `TARGETS`;
// importing this module binds the policies (side effect), exactly as the
// bindings inside `MockCommandService` itself do.
//
// Every judgement is a pure function in `sourcing/rfqResponse.ts`. This module
// only gathers the facts the rule needs from the stores and hands them over,
// so the quote grid's own gate and the verb cannot disagree.
// ────────────────────────────────────────────────────────────────────────────

import { bindPolicyHook, POLICY_HOOKS, type CommandTarget } from '../../transitions';
import { rfqStore } from './stores/rfqStore';
import {
  acceptanceOf,
  intentOf,
  rfqClarificationStore,
  rfqConfidentialityStore,
  rfqIntentStore,
} from './stores/rfqEngagementStores';
import { currentQuotesFor, rfxNow } from './rfxReadModel';
import {
  clarificationAnswerRefusal,
  clarificationAskRefusal,
  clarificationState,
  confidentialityRefusal,
  intentRefusal,
  intentState,
  tieredQuoteRefusal,
  type RfqIntentRecord,
} from '../../sourcing/rfqResponse';
import type { RfqDeclineReason } from '../../sourcing/rfqModel';

const str = (payload: Record<string, unknown>, k: string): string =>
  typeof payload[k] === 'string' ? (payload[k] as string) : '';

/**
 * The owner of a supplier-raised record: the supplier named in the payload,
 * and ONLY when it is invited to the RFQ named beside it. The quotation
 * target's rule, restated, so an uninvited supplier is refused at SCOPE and a
 * supplier naming another supplier's id is refused there too.
 */
const invitedOwner = (payload: Record<string, unknown>): string | null => {
  const rfq = rfqStore.get(str(payload, 'rfqId'));
  const sid = str(payload, 'supplierId');
  return rfq && rfq.invitedSupplierIds.includes(sid) ? sid : null;
};

const hasLiveQuote = (rfqId: string, supplierId: string): boolean =>
  currentQuotesFor(rfqId).some((q) => q.supplierId === supplierId);

// ── Intent ──────────────────────────────────────────────────────────────────

export const rfqIntentTarget: CommandTarget = {
  readState: (id) => {
    const r = rfqIntentStore.get(id);
    return r ? intentState(r) : null;
  },
  readScopeOwner: (id) => rfqIntentStore.get(id)?.supplierId ?? null,
  readEntity: (id) => rfqIntentStore.get(id) ?? null,
  // The one update is `t_rfqintent_withdraw`: "I will respond" becomes a
  // decline, with the reason and words the policy has already judged.
  applyTransition: (id, _toState, payload) => {
    rfqIntentStore.update(id, (r) => ({
      id: r.id,
      rfqId: r.rfqId,
      supplierId: r.supplierId,
      intent: 'decline',
      reason: payload.reason as RfqDeclineReason,
      text: String(payload.text).trim(),
      at: rfxNow(),
    }));
  },
  creationOwner: invitedOwner,
  create: (payload, toState) => {
    const id = rfqIntentStore.nextId();
    const base = { id, rfqId: str(payload, 'rfqId'), supplierId: str(payload, 'supplierId'), at: rfxNow() };
    const row: RfqIntentRecord =
      toState === 'Responding'
        ? { ...base, intent: 'respond' }
        : {
            ...base,
            intent: 'decline',
            reason: payload.reason as RfqDeclineReason,
            text: str(payload, 'text').trim(),
          };
    rfqIntentStore.add(row);
    return { entityId: id };
  },
};

bindPolicyHook(POLICY_HOOKS.RFQ_INTENT_VALID, ({ payload, entityId, toState, currentState }) => {
  // A withdraw names the record; a creation names the RFQ and the supplier.
  const existingRow = entityId ? rfqIntentStore.get(entityId) : undefined;
  const rfqId = existingRow?.rfqId ?? str(payload, 'rfqId');
  const supplierId = existingRow?.supplierId ?? str(payload, 'supplierId');
  const act = currentState === 'Responding' ? 'withdraw' : toState === 'Responding' ? 'respond' : 'decline';
  const reason = intentRefusal({
    rfq: rfqStore.get(rfqId),
    supplierId,
    act,
    reason: payload.reason,
    text: payload.text,
    existing: intentOf(rfqId, supplierId),
    hasQuote: hasLiveQuote(rfqId, supplierId),
    nowIso: rfxNow(),
  });
  return reason ? { ok: false, reason } : { ok: true };
});

// ── Confidentiality ─────────────────────────────────────────────────────────

export const rfqConfidentialityTarget: CommandTarget = {
  readState: (id) => (rfqConfidentialityStore.get(id) ? 'Accepted' : null),
  readScopeOwner: (id) => rfqConfidentialityStore.get(id)?.supplierId ?? null,
  readEntity: (id) => rfqConfidentialityStore.get(id) ?? null,
  // Single-state and creation-only: nothing moves an acceptance.
  applyTransition: () => undefined,
  creationOwner: invitedOwner,
  create: (payload) => {
    const id = rfqConfidentialityStore.nextId();
    rfqConfidentialityStore.add({
      id,
      rfqId: str(payload, 'rfqId'),
      supplierId: str(payload, 'supplierId'),
      acceptedAt: rfxNow(),
    });
    return { entityId: id };
  },
};

bindPolicyHook(POLICY_HOOKS.RFQ_CONFIDENTIALITY_ACCEPTABLE, ({ payload }) => {
  const rfqId = str(payload, 'rfqId');
  const supplierId = str(payload, 'supplierId');
  const reason = confidentialityRefusal({
    rfq: rfqStore.get(rfqId),
    supplierId,
    alreadyAccepted: acceptanceOf(rfqId, supplierId) !== undefined,
    nowIso: rfxNow(),
  });
  return reason ? { ok: false, reason } : { ok: true };
});

// ── Clarifications ──────────────────────────────────────────────────────────

export const rfqClarificationTarget: CommandTarget = {
  readState: (id) => {
    const c = rfqClarificationStore.get(id);
    return c ? clarificationState(c) : null;
  },
  // The asker owns its question. The buyer answers it, and a buyer scope is
  // not compared against a supplier owner.
  readScopeOwner: (id) => rfqClarificationStore.get(id)?.askedBy ?? null,
  readEntity: (id) => rfqClarificationStore.get(id) ?? null,
  applyTransition: (id, _toState, payload) => {
    rfqClarificationStore.update(id, (c) => ({
      ...c,
      answer: String(payload.answer).trim(),
      answeredAt: rfxNow(),
      visibility: payload.visibility === 'published' ? 'published' : 'private',
    }));
  },
  creationOwner: invitedOwner,
  create: (payload) => {
    const id = rfqClarificationStore.nextId();
    rfqClarificationStore.add({
      id,
      rfqId: str(payload, 'rfqId'),
      askedBy: str(payload, 'supplierId'),
      askedAt: rfxNow(),
      question: str(payload, 'question').trim(),
      // Nobody reads an unanswered question but the asker and the buyer; the
      // buyer chooses the visibility when it answers.
      visibility: 'private',
    });
    return { entityId: id };
  },
};

bindPolicyHook(POLICY_HOOKS.RFQ_CLARIFICATION_ASKABLE, ({ payload }) => {
  const reason = clarificationAskRefusal({
    rfq: rfqStore.get(str(payload, 'rfqId')),
    supplierId: str(payload, 'supplierId'),
    question: payload.question,
    nowIso: rfxNow(),
  });
  return reason ? { ok: false, reason } : { ok: true };
});

bindPolicyHook(POLICY_HOOKS.RFQ_CLARIFICATION_ANSWERABLE, ({ payload, entityId }) => {
  const reason = clarificationAnswerRefusal({
    clarification: rfqClarificationStore.get(entityId),
    answer: payload.answer,
    visibility: payload.visibility,
  });
  return reason ? { ok: false, reason } : { ok: true };
});

// ── The tiered quotation ────────────────────────────────────────────────────

/**
 * `quotation_tiered_well_formed` — on `t_quotation_submit` and
 * `t_quotation_revise`. The shape rule is `tieredQuoteRefusal`; the two
 * precedence checks before it are about WHO may quote: a confidential RFQ is
 * quoted only under its accepted terms (the content being priced was hidden
 * until then), and a supplier that declined has said it is not bidding.
 */
bindPolicyHook(POLICY_HOOKS.QUOTATION_TIERED_WELL_FORMED, ({ payload }) => {
  const rfqId = str(payload, 'rfqId');
  const supplierId = str(payload, 'supplierId');
  const rfq = rfqStore.get(rfqId);
  if (!rfq) return { ok: false, reason: 'RFQ_NOT_FOUND: sourcing event not found' };
  if (rfq.confidential && !acceptanceOf(rfqId, supplierId)) {
    return { ok: false, reason: `CONFIDENTIALITY_NOT_ACCEPTED: ${rfq.rfqNumber} is quoted under its accepted terms` };
  }
  if (intentOf(rfqId, supplierId)?.intent === 'decline') {
    return { ok: false, reason: `INTENT_DECLINED: ${supplierId} declined ${rfq.rfqNumber}` };
  }
  const reason = tieredQuoteRefusal(rfq, payload);
  return reason ? { ok: false, reason } : { ok: true };
});
