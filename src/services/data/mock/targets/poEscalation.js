// ────────────────────────────────────────────────────────────────────────────
// UCX-P7 (BL-368) · UCX-D22 — THE PO ESCALATION RECORD TARGET.
// `entityId` is the record id (`esc-0001`, minted by the store).
//   · `readScopeOwner` is null: an escalation record is PTI's own ledger, so a
//     supplier seat is denied at SCOPE (§86). The panel that writes it is the
//     buyer's PO panel.
//   · `create` inserts one row: the ask, or one of the four ruled decisions,
//     with the hub clock and the session's actor (the placeholder
//     `UNATTRIBUTED: NO_PERSON_IN_SESSION` — portal `CLAUDE.md`).
//   · The three ending decisions cascade a PO move (`cascades.js`); nothing
//     here writes the PO store itself.
//   · Nothing claims a SAP, email or WhatsApp effect (BL-24, BL-26).
//
// ⚠️ **THE VERB AROWS THE DECISION, AND THE PAYLOAD MUST AGREE WITH IT.** The
// target receives payload and state, not the transition id, so the page sends
// `decision` and dispatches the verb `PO_ESCALATION_VERB[decision]` names. The
// cascade hangs off the VERB (cascades.js), so a payload that disagreed with
// the verb would record one decision and move the order by another — the hook
// below refuses a decision outside the ruled set, and a spec pins each verb to
// its move.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import {
  escalationDecisionRefusal,
  isPoEscalationDecision
} from '../../../transitions/poEscalationRules';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { poEscalationStore } from '../stores/poEscalationStore';
import { purchaseOrderStore } from '../stores/purchaseOrderStore';
import { isAwaitingResponse } from '../../poResponseProjection';

/** @param {unknown} v @returns {string} */
const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** @type {CommandTarget} */
export const poEscalationTarget = {
  readState: (id) => (poEscalationStore.get(id) ? 'Recorded' : null),
  readScopeOwner: () => null,
  readEntity: (id) => poEscalationStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — a record is never changed */
  },
  creationOwner: () => null,
  create: (payload, _toState, scope) => {
    const po = purchaseOrderStore.get(str(payload.poId));
    const decision = isPoEscalationDecision(payload.decision) ? payload.decision : null;
    const row = poEscalationStore.insert({
      poId: str(payload.poId),
      poNumber: po?.poNumber ?? str(payload.poId),
      supplierId: po?.supplierId ?? '',
      kind: decision ? 'decision' : 'ask',
      decision,
      at: sdcClock.now(),
      actor: scope.actor ?? NO_PERSON,
      ...(str(payload.note) ? { note: str(payload.note) } : {})
    });
    return { entityId: row.id };
  }
};

// An act attaches to a PO that exists and still awaits the supplier's answer;
// a decision, when one is sent, must be one of the four UCX-D22 rules.
bindPolicyHook(POLICY_HOOKS.PO_ESCALATION_TARGET_AWAITING, ({ payload }) => {
  const po = purchaseOrderStore.get(str(payload.poId));
  if (!po) return { ok: false, reason: 'ESCALATION_NO_PO: no such purchase order' };
  if (!isAwaitingResponse(po))
    return {
      ok: false,
      reason: `ESCALATION_PO_NOT_AWAITING: the order is ${po.status}, not awaiting the supplier's answer`
    };
  if (payload.decision !== undefined) {
    const refusal = escalationDecisionRefusal(payload.decision);
    if (refusal) return { ok: false, reason: refusal };
  }
  return { ok: true };
});
