// ────────────────────────────────────────────────────────────────────────────
// DRC-D11 (BL-196) · THE OSIP LEVEL TARGET.
//
// `entityId` IS the material code — there is no code payload field.
//
//   · `readState` answers `Maintained` for any code the material master
//     resolves: setting a level adds the first row; an unknown code is
//     NOT_FOUND, never a silently created row (the `maxStock` shape).
//   · `readScopeOwner` is null: the level is PTI's Material Planning team's, so
//     a supplier seat is denied at SCOPE on every code, real or not (§86).
//   · `applyTransition` APPENDS a row: the level from the payload; `previous`,
//     `setAt` (hub clock) and `setBy` (the session's actor) are assigned here.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import { osipLevelInForce, osipLevelRefusal } from '../../../transitions/osipRopRules';
import { isKnownMaterial, sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { osipLevelStore } from '../stores/osipLevelStore';

/** @type {CommandTarget} */
export const osipLevelTarget = {
  readState: (id) => (isKnownMaterial(id) ? 'Maintained' : null),
  readScopeOwner: () => null,
  readEntity: (id) =>
    isKnownMaterial(id) ? osipLevelInForce(osipLevelStore.forMaterial(id)) : null,
  applyTransition: (id, _toState, payload, scope) => {
    // The policy hook has already refused every payload this could reject.
    if (!isKnownMaterial(id) || osipLevelRefusal(payload.osipLevel) !== null) return;
    osipLevelStore.append({
      materialCode: id,
      level: /** @type {number} */ (payload.osipLevel),
      previous: osipLevelInForce(osipLevelStore.forMaterial(id)).level,
      source: 'planner',
      setAt: sdcClock.now(),
      setBy: scope.actor ?? NO_PERSON
    });
  }
};

// DRC-D11 — the same predicate the page's form calls (`osipLevelRefusal`).
bindPolicyHook(POLICY_HOOKS.OSIP_LEVEL_VALID, ({ payload }) => {
  const refusal = osipLevelRefusal(payload.osipLevel);
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
