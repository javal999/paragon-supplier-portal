// ────────────────────────────────────────────────────────────────────────────
// policies/supplierApplication.js — the supplier application birth guards.
//
// Holds the request-type, internal-vendor, refusal-reason and declarations
// hooks (B1). Separate because they read only the payload and the target's own
// resolver, and their vocabulary comes from `supplierApplication.flow`.
// ────────────────────────────────────────────────────────────────────────────

import { POLICY_HOOKS } from '../policyHooks';
import {
  APPLICATION_REQUEST_TYPES,
  VENDOR_BEARING_REQUEST_TYPE,
  isApplicationRequestType,
  isApplicationDeclaration
} from '../flows/supplierApplication.flow';
import { bindPolicyHook } from './bindings';

// ── B1 · SUPPLIER APPLICATION — THE BIRTH GUARDS ────────────────────────────
//
// All three are PURE: they read the payload and, for the vendor rule, the
// TARGET's own resolver. No roster, no fixture and no store crosses into this
// layer — which is what lets the resolution live in the data layer that owns
// the roster while the OBLIGATION lives here, next to every other obligation.

// The request type is one of three, and an unknown token is refused BY NAME.
// `requiredFields` proves presence; nothing else proves membership, so without
// this a hand-crafted dispatch stores a request type no reader recognises and
// every downstream branch takes its else-arm silently.
bindPolicyHook(POLICY_HOOKS.APPLICATION_REQUEST_TYPE_KNOWN, ({ payload }) => {
  const value = payload.requestType;
  if (!isApplicationRequestType(value)) {
    return {
      ok: false,
      reason:
        `requestType ${JSON.stringify(value)} is not one of ` +
        `${APPLICATION_REQUEST_TYPES.join(' | ')} — an unrecognised request type would be ` +
        'stored as one and read by nothing'
    };
  }
  return { ok: true };
});

// ── THE VENDOR RESOLUTION, MADE BINDING ─────────────────────────────────────
//
// ⚠️ **THE RESOLVER IS THE TARGET'S `creationOwner`, READ THROUGH `ctx.target`
// — THERE IS EXACTLY ONE OF IT, AND THIS HOOK DOES NOT CONTAIN A SECOND.** A
// hook that re-implemented the roster lookup would be the copy that drifts, and
// it would put the platform roster inside the transitions layer, which knows
// about no data at all.
//
// ⚠️ **WHY THIS IS NOT `requireCreationOwner: true`, MEASURED.** That flag is
// per-TARGET: the dispatcher refuses ANY buyer creation whose owner resolves
// null. Two of the three request types have no existing vendor by definition,
// so their owner is legitimately null and the flag would refuse them — the
// majority path, including every genuinely new supplier. The flag cannot say
// "required when", and this is the layer that can.
//
// ⚠️ **THE LIMIT, STATED.** It proves the named vendor EXISTS on the roster. It
// cannot prove the applicant is that vendor, or that the person filling the
// form meant that one — no value-level guard can, exactly as the quantity floor
// cannot tell 2400 from 2.4.
bindPolicyHook(POLICY_HOOKS.APPLICATION_INTERNAL_VENDOR_RESOLVED, ({ payload, target }) => {
  if (payload.requestType !== VENDOR_BEARING_REQUEST_TYPE) return { ok: true };
  if (!target.creationOwner) {
    return {
      ok: false,
      reason:
        'the target implements no creationOwner, so the named vendor cannot be resolved ' +
        'against anything — an application claiming an existing vendor must be checked, ' +
        'never taken on the payload’s word'
    };
  }
  if (target.creationOwner(payload) === null) {
    return {
      ok: false,
      reason:
        `s4Vendor ${JSON.stringify(payload.s4Vendor ?? null)} resolves to no vendor the ` +
        'governed roster names — a request to extend a supplier that does not exist would ' +
        'sit in the queue forever with nobody able to say who it is about'
    };
  }
  return { ok: true };
});

// The refusal a person will eventually have to deliver. Fourth instance of the
// substance-not-presence guard, and the one whose reader is furthest from the
// act: the applicant has no seat here, so whoever tells them has nothing but
// this text to tell them with.
bindPolicyHook(POLICY_HOOKS.APPLICATION_REFUSAL_AUTHORED, ({ payload }) => {
  const value = payload.rejectionReason;
  if (typeof value !== 'string') {
    return { ok: false, reason: `rejectionReason must be text, got ${typeof value}` };
  }
  if (value.trim() === '') {
    return {
      ok: false,
      reason:
        'rejectionReason is blank — a refused application is the one record anybody will have ' +
        'when the applicant asks why, and an empty one answers nothing'
    };
  }
  return { ok: true };
});

// Declarations are OPTIONAL — an application carrying none is legal and common.
// A declarations key that is PRESENT and malformed is not: reading the good
// entries and dropping the rest would subtract from data somebody supplied,
// silently, and leave nothing anywhere saying which claim went missing.
bindPolicyHook(POLICY_HOOKS.APPLICATION_DECLARATIONS_WELL_FORMED, ({ payload }) => {
  if (!('declarations' in payload) || payload.declarations === undefined) {
    return { ok: true };
  }
  const value = payload.declarations;
  if (!Array.isArray(value)) {
    return {
      ok: false,
      reason: `declarations must be a list, got ${typeof value}`
    };
  }
  const bad = value
    .map((d, i) => (isApplicationDeclaration(d) ? null : i))
    .filter(/** @returns {i is number} */ (i) => i !== null);
  if (bad.length > 0) {
    return {
      ok: false,
      reason:
        `declarations ${bad.join(', ')} name no known document or carry a blank reference — ` +
        'a declaration is a claim somebody will later be asked to stand behind, and one with ' +
        'nothing in it cannot be looked up or refused'
    };
  }
  return { ok: true };
});
