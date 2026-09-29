// ────────────────────────────────────────────────────────────────────────────
// Material C4 · THE MRP CONTROLLER LIST TARGET (MR-5 BR-02; plan AD-5).
//
// `entityId` IS the SAP MRP controller code — there is no code payload field.
//
//   · `readState` answers `Maintained` for any SAP-shaped code: setting a code
//     the list does not hold yet ADDS it, and a malformed code is NOT_FOUND
//     rather than a silently created row (the `threePl` shape).
//   · `readScopeOwner` is null: the list is PTI's, so a supplier seat is denied
//     at SCOPE on every code, real or not (§86).
//   · `applyTransition` APPENDS a change, branching on the transition id:
//     `t_mrpcontroller_set` maps, `t_mrpcontroller_unmap` (BL-157) appends an
//     unmapping. `setAt` is the hub clock, `setBy` the session's actor; neither
//     is read from the payload.
// ────────────────────────────────────────────────────────────────────────────

import { bindPolicyHook, POLICY_HOOKS, type CommandTarget } from '../../../transitions';
import {
  MRP_CONTROLLER_CODE,
  mrpControllerChangeFrom,
  mrpControllerRefusal,
  mrpControllerStore,
  mrpControllerUnmapFrom,
  mrpControllerUnmapRefusal,
} from '../../../transitions/mrpControllerStore';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '../../../../context/noPerson';

export const mrpControllerTarget: CommandTarget = {
  readState: (id) => (MRP_CONTROLLER_CODE.test(id) ? 'Maintained' : null),
  readScopeOwner: () => null,
  readEntity: (id) => (MRP_CONTROLLER_CODE.test(id) ? mrpControllerStore.get(id) ?? null : null),
  applyTransition: (id, _toState, payload, scope, transitionId) => {
    const change =
      transitionId === 't_mrpcontroller_unmap'
        ? mrpControllerUnmapFrom(id, sdcClock.now(), scope.actor ?? NO_PERSON)
        : mrpControllerChangeFrom(id, payload, sdcClock.now(), scope.actor ?? NO_PERSON);
    // The policy hook has already refused every payload this could reject.
    if (change) mrpControllerStore.append(change);
  },
};

bindPolicyHook(POLICY_HOOKS.MRP_CONTROLLER_GOVERNED, ({ entityId, payload }) => {
  const refusal = mrpControllerRefusal(entityId, payload.name, payload.userLabels);
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});

bindPolicyHook(POLICY_HOOKS.MRP_CONTROLLER_UNMAPPABLE, ({ entityId }) => {
  const refusal = mrpControllerUnmapRefusal(entityId);
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
