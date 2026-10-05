// ────────────────────────────────────────────────────────────────────────────
// Material G2 · THE SOURCING TYPE TARGET (MR-10 BR-06; plan AR-17, AD-5,
// MAT-R13).
//
// `entityId` IS the map key (`category:<RFQCategory>` or `pg:<code>`), so the
// key commanded and the key recorded cannot disagree.
//
//   · `readState` answers `Defined` for every key the map holds and null for
//     anything else, so an unknown key is NOT_FOUND rather than a new key.
//   · `readScopeOwner` is null: the map belongs to no supplier.
//   · `applyTransition` APPENDS a change. `setAt` is the hub clock, `setBy`
//     the session's actor; neither is read from the payload.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import {
  isSourcingType,
  isSourcingTypeKey,
  sourcingTypeRefusal
} from '../../../sourcing/sourcingType';
import { sourcingTypeStore } from '../../../transitions/sourcingTypeStore';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';

/** @type {CommandTarget} */
export const sourcingTypeTarget = {
  readState: (id) => (isSourcingTypeKey(id) ? 'Defined' : null),
  readScopeOwner: () => null,
  readEntity: (id) =>
    isSourcingTypeKey(id) ? { key: id, sourcingType: sourcingTypeStore.get(id) } : null,
  applyTransition: (id, _toState, payload, scope) => {
    // The policy hook has already refused every change this could reject.
    if (!isSourcingTypeKey(id) || !isSourcingType(payload.sourcingType)) return;
    sourcingTypeStore.append({
      key: id,
      sourcingType: payload.sourcingType,
      setAt: sdcClock.now(),
      setBy: scope.actor ?? NO_PERSON
    });
  }
};

bindPolicyHook(POLICY_HOOKS.SOURCING_TYPE_GOVERNED, ({ entityId, payload }) => {
  const refusal = sourcingTypeRefusal(entityId, payload.sourcingType);
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
