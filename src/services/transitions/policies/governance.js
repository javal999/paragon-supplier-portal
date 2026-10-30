// ────────────────────────────────────────────────────────────────────────────
// policies/governance.js — the hooks on the Hub administrator's settings.
//
// Holds enforcement set, custom-role grant, 3PL list, working calendar, rule
// setting, reason code and maximum stock. Separate because each guards a
// governed value an administrator records, and each names its actor (`setBy`
// or `grantedBy`).
// ────────────────────────────────────────────────────────────────────────────

/** @import { PolicyHookFn } from '../dispatcher' */
import { maxStockRefusal, parseMaxStockEntityId } from '../maxStock';
import { POLICY_HOOKS } from '../policyHooks';
/** @import { EnforcementSetting } from '@lib/enforcement' */
import {
  ENFORCEMENT_MODES,
  GOVERNED_CHECK_IDS,
  MAXIMUM_RIGOUR,
  UNATTRIBUTED_REASONS,
  asActorAttribution,
  isAttributed,
  isEnforcementMode,
  isGovernedCheckId,
  isReviewDay,
  rigour,
  settingInForce
} from '@lib/enforcement';

import {
  CUSTOM_ROLE_TEXT,
  I18N_NAMESPACE_PREFIX,
  addableAtomRefusal,
  copyableParentRefusal,
  grantableIdRefusal
} from '../customRoles';
/** @import { SystemRoleId } from '../businessRoles' */
import { SYSTEM_ROLES } from '../businessRoles';
import { catalogRoles } from '../roles';
import { calendarRulingRefusal } from '../workingCalendarStore';
import { threePlRefusal, threePlStore } from '../threePlStore';
import { settingRefusal } from '../hubSettings';
import { parseReasonCodeEntityId, reasonCodeStore } from '../reasonCodes';
import { hubSettingsStore } from '../hubSettingsStore';
import { bindPolicyHook } from './bindings';

// — Enforcement set: the recorded relaxation must be GOVERNED (CP-3 · E2) ——————
//
// THE DIRECTION RULE, as the operator dispatched it: TIGHTENING IS ALWAYS
// LEGAL; LOOSENING REQUIRES `reviewBy` AND A NAMED ACTOR. Read the asymmetry
// the right way round — this is not "loosening needs paperwork", it is
//
//   THE SAFEST ACT IS ALWAYS AVAILABLE TO ANYBODY.
//
// Setting a check to full rigour needs no review date, no resolved identity and
// no argument. Everything below it does. Failing in the strict direction costs a
// blocked dock; failing in the other costs an anonymous unlock, and only one of
// those is recoverable after the goods have moved.
//
// FOUR REFUSALS, each by name:
//   1. an unrecognised MODE. Note the direction: `effectiveEnforcement` RANKS an
//      unknown mode at the ceiling (the class rule), but this verb REFUSES it.
//      Reading and writing want opposite behaviours — a stored typo must not
//      relax anything, and an authoring typo must be told, not silently
//      maximised into a block nobody asked for.
//   2. a malformed ACTOR — including a `RESOLVED` one missing either field.
//      Coercing it to UNATTRIBUTED would give every typo a legitimate-looking
//      absence to hide in.
//   3. a relaxation with NO READABLE `reviewBy`. The type already forbids it;
//      this is the runtime half, because the payload crosses a seam and a type
//      guarantee is only as strong as the authoring on the other side.
//   4. a LOOSENING by an unattributed actor.
//
// The baseline for "loosening" is the LAST RECORDED MODE, not the effective
// (possibly ratcheted) one — two reasons, and both matter. A lapse is a
// CONSEQUENCE, not a decision, so comparing against it would let the calendar
// silently re-classify an unchanged decision as a relaxation; and legality would
// then depend on WHEN the command was dispatched, which is a clock deciding a
// transition by another route. An unset check baselines at MAXIMUM_RIGOUR, so
// THE FIRST EVER SETTING BELOW FULL RIGOUR IS A LOOSENING and must be named.
/** @type {PolicyHookFn} */
const enforcementSetGoverned = ({ entityId, payload, target }) => {
  const mode = payload.mode;
  if (typeof mode !== 'string' || !isEnforcementMode(mode)) {
    return {
      ok: false,
      reason: `mode '${String(mode)}' is not an enforcement mode (${ENFORCEMENT_MODES.join(', ')})`
    };
  }
  if (!isGovernedCheckId(entityId)) {
    // Defence in depth: `readState` already answers null for an unknown check,
    // so the dispatcher raised NOT_FOUND before this ran. Stated anyway, because
    // "the target happens to check it" is a convention and this is a rule.
    return {
      ok: false,
      reason: `'${entityId}' is not a governed check (${GOVERNED_CHECK_IDS.join(', ')})`
    };
  }
  const actor = asActorAttribution(payload.setBy);
  if (!actor) {
    return {
      ok: false,
      reason:
        "setBy must be { kind: 'RESOLVED', person: { personId, displayName } } or " +
        `{ kind: 'UNATTRIBUTED', reason } (${UNATTRIBUTED_REASONS.join(', ')})`
    };
  }
  if (mode !== MAXIMUM_RIGOUR && !isReviewDay(payload.reviewBy)) {
    return {
      ok: false,
      reason: `a relaxation to ${mode} requires reviewBy as a readable YYYY-MM-DD, got ${String(payload.reviewBy)}`
    };
  }
  const ledger = /** @type {readonly EnforcementSetting[] | null} */ (target.readEntity(entityId));
  const current = settingInForce(ledger ?? undefined, entityId);
  const baseline = current && isEnforcementMode(current.mode) ? current.mode : MAXIMUM_RIGOUR;
  if (rigour(mode) < rigour(baseline) && !isAttributed(actor)) {
    return {
      ok: false,
      reason: `loosening ${entityId} from ${baseline} to ${mode} requires a NAMED actor (setBy.kind is UNATTRIBUTED: ${actor.reason})`
    };
  }
  return { ok: true };
};

bindPolicyHook(POLICY_HOOKS.ENFORCEMENT_SET_GOVERNED, enforcementSetGoverned);

// ── THE PRIVILEGE GRANT (duplicate-and-narrow) ──────────────────────────────
//
// ⚠️ **EVERY REFUSAL HERE NAMES THE THING IT REFUSED.** The tenancy arm names
// the ATOM and both SIDES, because "invalid role" would send somebody to read
// the form when the answer is that the boundary held.
//
// ⚠️ **AND THE TENANCY CHECK IS DELIBERATELY NOT THE FORM'S.** The surface
// offers only same-side atoms, so a well-behaved caller never reaches this
// branch — which is exactly why it must exist. A boundary that has held by
// construction since the beginning must not become a boundary that holds
// because a dropdown was populated correctly.
//
// ⚠️ **`grantedBy` IS VALIDATED, NEVER REQUIRED TO BE *NAMED*, AND THE
// DIFFERENCE IS THE D2 RULING.** `enforcementSetGoverned` refuses a LOOSENING by
// an unattributed actor — and a custom role is additive, so every grant is a
// loosening, 100% of the time. Applying that rule verbatim would refuse every
// grant this platform can currently make, because `CurrentIdentity.actor` is
// always `UNATTRIBUTED: NO_PERSON_IN_SESSION`. What pays for the difference is
// that a grant DOES NOT SURVIVE THE SESSION (`customRoles.js`): an anonymous
// privilege grant that cannot outlive the browser tab is a demonstrable act,
// not a durable ungoverned one. **The day an IdP answers, this is where the
// `isAttributed` guard lands and where durability becomes arguable.**
/** @type {PolicyHookFn} */
const roleGrantGoverned = ({ entityId, payload }) => {
  const parentRefusal = copyableParentRefusal(entityId);
  if (parentRefusal) return { ok: false, reason: parentRefusal };
  const parent = /** @type {SystemRoleId} */ (entityId);

  const roleId = payload.roleId;
  if (typeof roleId !== 'string') {
    return { ok: false, reason: `roleId must be a string, got ${typeof roleId}` };
  }
  const idRefusal = grantableIdRefusal(roleId);
  if (idRefusal) return { ok: false, reason: idRefusal };

  // ⚠️ `displayName` AND `description` ARE RENDERED BY PASSING THEM TO `t()`
  // AS THEIR OWN KEY (`roleModel.js`), so user text comes back verbatim in both
  // locales. The only string that would resolve to something else is one
  // prefixed with this app's loaded namespace — refused by name. Punctuation is
  // NOT refused: it was probed and does not truncate.
  for (const field of /** @type {const} */ (['displayName', 'description'])) {
    const value = payload[field];
    if (typeof value !== 'string' || !CUSTOM_ROLE_TEXT.test(value.trim())) {
      return { ok: false, reason: `${field} must be 2-80 characters of text` };
    }
    if (I18N_NAMESPACE_PREFIX.test(value.trim())) {
      return {
        ok: false,
        reason: `${field} may not begin with a translation namespace - it would render truncated`
      };
    }
  }

  const adds = payload.adds;
  if (!Array.isArray(adds) || adds.some((a) => typeof a !== 'string')) {
    return { ok: false, reason: 'adds must be an array of permission strings' };
  }
  const catalog = catalogRoles();
  const held = /** @type {Set<string>} */ (new Set(SYSTEM_ROLES[parent]));
  for (const atom of /** @type {readonly string[]} */ (adds)) {
    if (held.has(atom)) {
      return {
        ok: false,
        reason: `'${atom}' is already held by '${parent}' - an addition must add something`
      };
    }
    const refusal = addableAtomRefusal(parent, atom, catalog);
    if (refusal) return { ok: false, reason: refusal };
  }

  if (!asActorAttribution(payload.grantedBy)) {
    return {
      ok: false,
      reason:
        "grantedBy must be { kind: 'RESOLVED', person: { personId, displayName } } or " +
        `{ kind: 'UNATTRIBUTED', reason } (${UNATTRIBUTED_REASONS.join(', ')})`
    };
  }
  return { ok: true };
};

bindPolicyHook(POLICY_HOOKS.ROLE_GRANT_GOVERNED, roleGrantGoverned);

// ── BL-51 · ONE 3PL ON THE ADMINISTRATOR'S LIST ──────────────────────────────
//
// ⚠️ **THE SAME PREDICATE THE LINK IS BUILT THROUGH** (`threePlRefusal` →
// `trackingPatternRefusal`), so "an address the verb would accept" and "an
// address an ASN links to" are one rule in one place. `entityId` IS the 3PL id —
// there is no id payload field. A name is unique across the list, because a
// supplier picks a 3PL by its name and two identical names would make the pick
// a guess.
/** @type {PolicyHookFn} */
const threePlGoverned = ({ entityId, payload }) => {
  const refusal = threePlRefusal(
    entityId,
    payload.name,
    payload.trackingUrlPattern,
    payload.active
  );
  if (refusal) return { ok: false, reason: refusal };
  const name = String(payload.name).trim().toLowerCase();
  const clash = threePlStore
    .all()
    .find((r) => r.id !== entityId && r.name.trim().toLowerCase() === name);
  if (clash)
    return { ok: false, reason: `another 3PL on the list is already called ${clash.name}` };
  if (!asActorAttribution(payload.setBy)) {
    return {
      ok: false,
      reason:
        "setBy must be { kind: 'RESOLVED', person: { personId, displayName } } or " +
        `{ kind: 'UNATTRIBUTED', reason } (${UNATTRIBUTED_REASONS.join(', ')})`
    };
  }
  return { ok: true };
};

// ── BL-50 · A RULING ON ONE DAY OF THE HUB'S WORKING CALENDAR ────────────────
//
// ⚠️ **THE SAME PREDICATE THE STORE CALLS ON READ** (`calendarRulingRefusal`),
// so "a ruling the verb would have accepted" is one rule in one place, not two
// vocabularies that agree until the day they do not. Every refusal names what
// it refused. `entityId` IS the date — there is no date payload field.
/** @type {PolicyHookFn} */
const calendarDayGoverned = ({ entityId, payload }) => {
  const refusal = calendarRulingRefusal(entityId, payload.kind, payload.reason);
  if (refusal) return { ok: false, reason: refusal };
  if (!asActorAttribution(payload.setBy)) {
    return {
      ok: false,
      reason:
        "setBy must be { kind: 'RESOLVED', person: { personId, displayName } } or " +
        `{ kind: 'UNATTRIBUTED', reason } (${UNATTRIBUTED_REASONS.join(', ')})`
    };
  }
  return { ok: true };
};

bindPolicyHook(POLICY_HOOKS.THREE_PL_GOVERNED, threePlGoverned);
bindPolicyHook(POLICY_HOOKS.CALENDAR_DAY_GOVERNED, calendarDayGoverned);

// ── BL-32 · ONE RULE VALUE THE HUB ADMINISTRATOR CHANGES ─────────────────────
//
// ⚠️ **THE SAME PREDICATE THE STORE CALLS ON READ** (`settingRefusal`), checked
// against the values IN FORCE, so an order rule (a band's ends, min below max)
// is judged on the state the change would produce. `entityId` IS the key —
// there is no key payload field. `value` must be PRESENT (null is a value: it
// removes a stale-period override), which the dispatcher's required-field rule
// cannot say without refusing that null.
/** @type {PolicyHookFn} */
const settingGoverned = ({ entityId, payload }) => {
  if (!Object.prototype.hasOwnProperty.call(payload, 'value')) {
    return { ok: false, reason: `value is required for ${entityId}` };
  }
  const refusal = settingRefusal(entityId, payload.value, hubSettingsStore.state());
  if (refusal) return { ok: false, reason: refusal };
  if (!asActorAttribution(payload.setBy)) {
    return {
      ok: false,
      reason:
        "setBy must be { kind: 'RESOLVED', person: { personId, displayName } } or " +
        `{ kind: 'UNATTRIBUTED', reason } (${UNATTRIBUTED_REASONS.join(', ')})`
    };
  }
  return { ok: true };
};

bindPolicyHook(POLICY_HOOKS.SETTING_GOVERNED, settingGoverned);

// ── BL-32 · ONE CODE ON ONE REASON LIST ──────────────────────────────────────
// The same predicate the store calls on read (`reasonCodeStore.refusal`), so a
// hand-edited list is held to the verb's rule. `entityId` IS `<list>:<code>`.
/** @type {PolicyHookFn} */
const reasonCodeGoverned = ({ entityId, payload }) => {
  const id = parseReasonCodeEntityId(entityId);
  if (!id) return { ok: false, reason: `'${entityId}' is not <list>:<code>` };
  const refusal = reasonCodeStore.refusal(
    id.list,
    id.code,
    payload.labelEn,
    payload.labelId,
    payload.active
  );
  if (refusal) return { ok: false, reason: refusal };
  if (!asActorAttribution(payload.setBy)) {
    return {
      ok: false,
      reason:
        "setBy must be { kind: 'RESOLVED', person: { personId, displayName } } or " +
        `{ kind: 'UNATTRIBUTED', reason } (${UNATTRIBUTED_REASONS.join(', ')})`
    };
  }
  return { ok: true };
};

bindPolicyHook(POLICY_HOOKS.REASON_CODE_GOVERNED, reasonCodeGoverned);

// ── REQ-E06-04 BR-06 · ONE SUPPLIER × MATERIAL'S MAXIMUM STOCK ───────────────
// The same predicate the page's form calls (`maxStockRefusal`). `quantity` must
// be PRESENT — a whole number above zero, or null to clear — so an omitted key
// can never be read as "cleared".
bindPolicyHook(POLICY_HOOKS.MAX_STOCK_GOVERNED, ({ entityId, payload }) => {
  if (!parseMaxStockEntityId(entityId))
    return { ok: false, reason: `'${entityId}' is not <supplierId>|<materialCode>` };
  if (!('quantity' in payload))
    return { ok: false, reason: 'quantity is required: a whole number, or null to clear it' };
  const refusal = maxStockRefusal(payload.quantity);
  if (refusal) return { ok: false, reason: refusal };
  if (!asActorAttribution(payload.setBy)) {
    return {
      ok: false,
      reason:
        "setBy must be { kind: 'RESOLVED', person: { personId, displayName } } or " +
        `{ kind: 'UNATTRIBUTED', reason } (${UNATTRIBUTED_REASONS.join(', ')})`
    };
  }
  return { ok: true };
});
