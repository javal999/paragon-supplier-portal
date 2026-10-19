// ────────────────────────────────────────────────────────────────────────────
// CAP-10 · THE DEMAND ANTICIPATION PUBLICATION TARGET (CAP-D13), reworked by
// DRC-2 (BL-188): a publication records one planning week.
//
// `entityId` is the publication id (`dap-0001`, minted by the store).
//
//   · `readState` answers `Published` for a publication that exists.
//   · `readScopeOwner` / `creationOwner` are null: a publication is PTI's
//     Material Planning plan, so a supplier seat is denied at SCOPE (§86).
//   · `create` APPENDS a publication of the current planning week. Every
//     pair's figure, stamped with its inputs and `RULES_VERSION` (DRC-D16),
//     the time (hub clock) and the actor (the session's) are assigned here.
//     The payload carries two things, both checked first by the policy hook:
//     `planningWeek` (the Monday the confirm named) and `agreedFirstOutside`,
//     the pairs whose supplier agreed to take the remainder in the first week
//     outside the horizon [Owner A8]. Recording that agreement IS this act:
//     it has the publication's actor, time and audit event.
//   · `applyTransition` is a no-op: a publication is never changed.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import { entriesOf, publishRefusal } from '../../../transitions/demandAnticipationRules';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { demandAnticipationStore } from '../stores/demandAnticipationStore';
import { demandAnticipationToPublish } from '../demandAnticipationReadModel';

/**
 * The payload's agreements as a list of pair keys (the policy hook has
 * refused anything else).
 * @param {unknown} v
 * @returns {string[]}
 */
const agreedOf = (v) => (Array.isArray(v) ? v.filter((k) => typeof k === 'string').sort() : []);

/** @type {CommandTarget} */
export const demandAnticipationTarget = {
  readState: (id) => (demandAnticipationStore.get(id) ? 'Published' : null),
  readScopeOwner: () => null,
  readEntity: (id) => demandAnticipationStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — a publication is never changed */
  },
  creationOwner: () => null,
  create: (payload, _toState, scope) => {
    const now = sdcClock.now();
    const agreed = agreedOf(payload.agreedFirstOutside);
    const { planningWeek, figures } = demandAnticipationToPublish(agreed, now);
    const made = demandAnticipationStore.add({
      publishedAt: now,
      actor: scope.actor ?? NO_PERSON,
      source: 'publish',
      planningWeek,
      agreedFirstOutside: agreed,
      entries: entriesOf(figures)
    });
    return { entityId: made.id };
  }
};

/** @type {Record<NonNullable<ReturnType<typeof publishRefusal>>, string>} */
const REFUSAL_TEXT = {
  STALE_WEEK:
    'STALE_WEEK: the hub week moved on to another planning week than the confirm named; reopen Publish',
  BAD_AGREEMENT:
    'BAD_AGREEMENT: a supplier agreement can be recorded only for a supplier × material on the page with a remainder to carry',
  NOTHING_TO_PUBLISH: 'NOTHING_TO_PUBLISH: no supplier × material has an LTP',
  NOTHING_CHANGED:
    'NOTHING_CHANGED: this planning week is already published with these figures and agreements'
};

bindPolicyHook(POLICY_HOOKS.DEMAND_ANTICIPATION_PUBLISH_VALID, ({ payload }) => {
  const ctx = demandAnticipationToPublish(agreedOf(payload.agreedFirstOutside), sdcClock.now());
  const refusal = publishRefusal(payload, ctx);
  return refusal ? { ok: false, reason: REFUSAL_TEXT[refusal] } : { ok: true };
});
