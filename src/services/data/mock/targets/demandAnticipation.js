// ────────────────────────────────────────────────────────────────────────────
// CAP-10 · THE DEMAND ANTICIPATION PUBLICATION TARGET (CAP-D13).
//
// `entityId` is the publication id (`dap-0001`, minted by the store).
//
//   · `readState` answers `Published` for a publication that exists.
//   · `readScopeOwner` / `creationOwner` are null: a publication is PTI's
//     Material Planning plan, so a supplier seat is denied at SCOPE (§86).
//   · `create` APPENDS a publication. The weeks it freezes (`nextHorizon`),
//     their figures and inputs (`demandAnticipationToFreeze`), the time (hub
//     clock) and the actor (the session's) are all assigned here; the
//     payload's `horizonStart` is only checked, by the policy hook, against
//     the horizon a publication would freeze now.
//   · `applyTransition` is a no-op: a publication is never changed.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import { publishRefusal } from '../../../transitions/demandAnticipationRules';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { demandAnticipationStore } from '../stores/demandAnticipationStore';
import { demandAnticipationToFreeze } from '../demandAnticipationReadModel';

/** @type {CommandTarget} */
export const demandAnticipationTarget = {
  readState: (id) => (demandAnticipationStore.get(id) ? 'Published' : null),
  readScopeOwner: () => null,
  readEntity: (id) => demandAnticipationStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — a publication is never changed */
  },
  creationOwner: () => null,
  create: (_payload, _toState, scope) => {
    const now = sdcClock.now();
    const toFreeze = demandAnticipationToFreeze(now);
    // The policy hook has refused a publish with no horizon to freeze.
    const horizon = /** @type {string[]} */ (toFreeze.horizon);
    const entries = toFreeze.entries;
    const made = demandAnticipationStore.add({
      publishedAt: now,
      actor: scope.actor ?? NO_PERSON,
      source: 'publish',
      horizonStart: horizon[0],
      horizonWeeks: horizon,
      entries
    });
    return { entityId: made.id };
  }
};

/** @type {Record<NonNullable<ReturnType<typeof publishRefusal>>, string>} */
const REFUSAL_TEXT = {
  STALE_HORIZON:
    'STALE_HORIZON: the weeks to freeze have changed since the confirm opened; reopen Publish',
  NOTHING_TO_FREEZE:
    'NOTHING_TO_FREEZE: the next horizon is already frozen; publish again when the hub week moves on'
};

bindPolicyHook(POLICY_HOOKS.DEMAND_ANTICIPATION_PUBLISH_VALID, ({ payload }) => {
  const { horizon, entries } = demandAnticipationToFreeze(sdcClock.now());
  const refusal = publishRefusal(payload.horizonStart, horizon, entries.length);
  return refusal ? { ok: false, reason: REFUSAL_TEXT[refusal] } : { ok: true };
});
