// ────────────────────────────────────────────────────────────────────────────
// Material G1 · THE QUALIFICATION RULE TARGET (MR-10 BR-04; plan AD-5, MAT-R13).
//
// `entityId` IS the level (`approved` | `preferred`) — there is no level payload
// field — so the list commanded and the list recorded cannot disagree.
//
//   · `readState` answers `Defined` for the two levels and null for anything
//     else, so an unknown level is NOT_FOUND rather than a silently new list.
//   · `readScopeOwner` is null: the lists belong to no supplier, so a supplier
//     seat is refused at SCOPE (and no supplier lane holds the atom anyway).
//   · `applyTransition` APPENDS a change with `placeholder: false` — a list a
//     person set is no longer the placeholder. `setAt` is the hub clock, `setBy`
//     the session's actor; neither is read from the payload.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import {
  isQualificationRuleLevel,
  qualificationRuleRefusal,
  requirementsOf
} from '../../../transitions/qualificationRules';
import { qualificationRuleStore } from '../../../transitions/qualificationRuleStore';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';

/** @type {CommandTarget} */
export const qualificationRuleTarget = {
  readState: (id) => (isQualificationRuleLevel(id) ? 'Defined' : null),
  readScopeOwner: () => null,
  readEntity: (id) => (isQualificationRuleLevel(id) ? qualificationRuleStore.get(id) : null),
  applyTransition: (id, _toState, payload, scope) => {
    // The policy hook has already refused every list this could reject.
    const requiredDocs = requirementsOf(payload.requiredDocs);
    if (!isQualificationRuleLevel(id) || requiredDocs === null) return;
    qualificationRuleStore.append({
      level: id,
      requiredDocs,
      placeholder: false,
      setAt: sdcClock.now(),
      setBy: scope.actor ?? NO_PERSON
    });
  }
};

bindPolicyHook(POLICY_HOOKS.QUALIFICATION_RULE_VALID, ({ entityId, payload }) => {
  const refusal = qualificationRuleRefusal(
    entityId,
    payload.requiredDocs,
    qualificationRuleStore.all()
  );
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
