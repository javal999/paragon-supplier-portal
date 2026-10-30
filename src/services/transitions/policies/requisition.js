// ────────────────────────────────────────────────────────────────────────────
// policies/requisition.js — the PR reject, revise and approve hooks, and the
// supplier-document refusal.
//
// Holds the substance-not-presence guards on authored text and the PR approval
// attribution rule (C10 §6.2). The supplier-document refusal sits here because
// it is the same guard and it sat between the PR hooks in the binding order.
// ────────────────────────────────────────────────────────────────────────────

import { POLICY_HOOKS } from '../policyHooks';
import { asActorAttribution } from '@lib/enforcement';
import { bindPolicyHook } from './bindings';

// ── §67 · PR REJECT — THE REASON IS SUBSTANCE, NOT PRESENCE ──────────────────
//
// `requiredFields: ['rejectionReason']` proves the key is there. This proves
// somebody wrote something in it. Both are needed and the split is the point:
// the dispatcher's rule 5 is `isEmpty`, and `isEmpty('   ')` is FALSE — so a
// "required" reason without this hook admits the space bar, and A REQUIRED
// FIELD THAT ADMITS THE SPACE BAR IS A SUGGESTION WITH A VALIDATION MESSAGE.
//
// ⚠️ THE LIMIT, STATED: it proves a non-blank string. It cannot prove the text
// is TRUE, relevant, or responsive to the requisition — no value-level guard
// can, exactly as `RR_SUBMIT_QTY_FLOOR` cannot tell 2400 from 2.4. The surface
// disables its own submit until the box is non-empty; this is what stands
// behind a hand-crafted dispatch that never sees the surface.
bindPolicyHook(POLICY_HOOKS.PR_REJECT_REASON_AUTHORED, ({ payload }) => {
  const value = payload.rejectionReason;
  if (typeof value !== 'string') {
    return { ok: false, reason: `rejectionReason must be text, got ${typeof value}` };
  }
  if (value.trim() === '') {
    return {
      ok: false,
      reason:
        'rejectionReason is blank — a rejected requisition must say something ' +
        'the requester can read and revise against'
    };
  }
  return { ok: true };
});

// ── §68 · PR REVISE — WHAT CHANGED IS SUBSTANCE, NOT PRESENCE ───────────────
//
// The twin of `PR_REJECT_REASON_AUTHORED`, and the field it guards had been
// REQUIRED since PF-1a while being discarded before the document was written.
// A required field whose value evaporates is a validation message, not a
// record; a required field that admits the space bar is a suggestion with a
// validation message. Both halves are now closed on this verb.
bindPolicyHook(POLICY_HOOKS.PR_REVISION_NOTE_AUTHORED, ({ payload }) => {
  const value = payload.revisionNote;
  if (typeof value !== 'string') {
    return { ok: false, reason: `revisionNote must be text, got ${typeof value}` };
  }
  if (value.trim() === '') {
    return {
      ok: false,
      reason:
        'revisionNote is blank — a requisition returning to the approval queue must say what ' +
        'changed, or the approver sees the document they already declined'
    };
  }
  return { ok: true };
});

// ── §82 · SUPPLIERDOC REJECT — THE REASON THE SUPPLIER WILL READ ────────────
//
// The third instance of the same lesson, and the one with a reader on the other
// end: §80's `RefusalBlock` renders this text word for word to the supplier the
// refusal is about. A blank reason there is not a validation gap, it is a
// refusal notice with nothing written in it — the dead end §80 existed to end,
// restored by the space bar.
bindPolicyHook(POLICY_HOOKS.SUPPLIERDOC_REFUSAL_AUTHORED, ({ payload }) => {
  const value = payload.rejectionReason;
  if (typeof value !== 'string') {
    return { ok: false, reason: `rejectionReason must be text, got ${typeof value}` };
  }
  if (value.trim() === '') {
    return {
      ok: false,
      reason:
        'rejectionReason is blank — the supplier reads this text verbatim on their own ' +
        'documents page, so a refusal with nothing written in it tells them only that ' +
        'they failed'
    };
  }
  return { ok: true };
});

// ── §68 · PR APPROVE — THE DECIDER IS NAMED, AND NOT BY THE CALLER ──────────
//
// ⚠️ **THIS IS C10 §6.2's SECOND HALF, AND IT IS THE FIRST IMPLEMENTATION OF
// IT IN THE TREE.** §6.2 states the rule in two parts and records that the
// second is the one that gets forgotten:
//
//   1. the resolved actor comes from the SESSION, never from a payload;
//   2. a payload-supplied `RESOLVED` actor is REFUSED BY NAME ON WRITE — *"not
//      ignored, not overwritten, not silently replaced by the session's.
//      Refused, loudly."*
//
// The overwrite is the tempting build and it is the one §6.2 rules out: a
// silent correction of an attribution is a caller that believes it attributed
// an act and a record that says somebody else did.
//
// ⚠️ **AND THE REFUSAL IS BY KEY, NOT BY VALUE-SHAPE.** Refusing only a
// well-formed `RESOLVED` actor would let a malformed one through to be dropped
// silently, which is the same silent correction wearing a type error. Anything
// under `approvedBy` is refused, because the caller has no business writing
// that key at all — the payload is not where attribution lives.
//
// ⚠️ **AN `UNATTRIBUTED` SESSION ACTOR IS ACCEPTED, AND MUST BE.** It is a
// claim about a FAILURE TO RESOLVE, which is exactly what this platform has
// today (`NO_PERSON_IN_SESSION`) and exactly what makes the gap countable.
// Refusing it would make approval unreachable and would replace an honest
// absence with no record at all.
bindPolicyHook(POLICY_HOOKS.PR_APPROVAL_ATTRIBUTED, ({ payload, scope }) => {
  if ('approvedBy' in payload) {
    return {
      ok: false,
      reason:
        'approvedBy is REFUSED in the payload — an approval is attributed from the session, ' +
        'never from the caller (C10 §6.2). A caller that could set it could backdate its own ' +
        'audit entry'
    };
  }
  const actor = asActorAttribution(scope.actor);
  if (!actor) {
    return {
      ok: false,
      reason:
        'the commanding scope carries no actor — an approval that cannot say who decided it ' +
        'is not a record, and UNATTRIBUTED is available to any caller that has no person'
    };
  }
  return { ok: true };
});
