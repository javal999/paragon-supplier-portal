// ────────────────────────────────────────────────────────────────────────────
// INV-D8 · THE CAPACITY GAP DECISION TARGET (Inventory UX P-07).
//
// `entityId` is the decision id (`capd-0001`, minted by the store).
//
//   · `readState` answers `Accepted`, or `Withdrawn` once the planner undid
//     it (BL-227).
//   · `readScopeOwner` NAMES THE SUPPLIER the decision is about (§86), and
//     `creationOwner` the supplier the payload names, resolved against the
//     supplier master for every persona (`requireCreationOwner`): nobody can
//     record a decision on a supplier that does not exist. A supplier seat
//     holds no `capacitydecision:accept`, so it is refused at the role gate.
//   · `create` inserts the decision; the time (hub clock) and the actor (the
//     session's) are assigned here, never taken from the payload.
//   · `applyTransition` marks the decision withdrawn (the only transition out
//     of `Accepted`); the time and actor are assigned here, as on create.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import {
  CAPACITY_DECISION_REFUSAL_SENTENCE,
  capacityAcceptRefusal
} from '../../../transitions/capacityDecisionRules';
import { ltpCapacityWeeks } from '../../../transitions/capacityRules';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { capacityDecisionStore } from '../stores/capacityDecisionStore';
import { allCapacityPlans } from '../inventoryReadModel';
import { isKnownSupplier } from '../supplierMaster';

/**
 * @param {unknown} v
 * @returns {string}
 */
const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** @type {CommandTarget} */
export const capacityDecisionTarget = {
  readState: (id) => {
    const row = capacityDecisionStore.get(id);
    if (!row) return null;
    return row.decision === 'withdrawn' ? 'Withdrawn' : 'Accepted';
  },
  readScopeOwner: (id) => capacityDecisionStore.get(id)?.supplierId ?? null,
  readEntity: (id) => capacityDecisionStore.get(id) ?? null,
  applyTransition: (id, _toState, _payload, scope) => {
    capacityDecisionStore.withdraw(id, sdcClock.now(), scope.actor ?? NO_PERSON);
  },
  requireCreationOwner: true,
  creationOwner: (payload) => {
    const sid = str(payload.supplierId);
    return isKnownSupplier(sid) ? sid : null;
  },
  create: (payload, _toState, scope) => {
    // The policy hook has refused every payload this could not store.
    const row = capacityDecisionStore.insert({
      supplierId: str(payload.supplierId),
      planningGroupId: str(payload.planningGroupId),
      week: str(payload.week),
      decision: 'accepted',
      decidedAt: sdcClock.now(),
      decidedBy: scope.actor ?? NO_PERSON
    });
    return { entityId: row.id };
  }
};

/**
 * The week's LTP check on the supplier's current capacity plan, or null when
 * the supplier × planning group × week is not in one.
 * @param {string} supplierId
 * @param {string} planningGroupId
 * @param {string} week
 * @returns {import('../../../transitions/capacityRules').LtpCapacityLevel | null}
 */
export function capacityWeekLevel(supplierId, planningGroupId, week) {
  const plan = allCapacityPlans().find(
    (p) => p.supplierId === supplierId && p.planningGroupId === planningGroupId
  );
  if (!plan) return null;
  return ltpCapacityWeeks(plan).find((w) => w.week === week)?.level ?? null;
}

// INV-D8 — the same rule the PTI Capacity page calls.
bindPolicyHook(POLICY_HOOKS.CAPACITY_DECISION_ACCEPTABLE, ({ payload }) => {
  const supplierId = str(payload.supplierId);
  const planningGroupId = str(payload.planningGroupId);
  const week = str(payload.week);
  const refusal = capacityAcceptRefusal({
    level: capacityWeekLevel(supplierId, planningGroupId, week),
    accepted: capacityDecisionStore.find(supplierId, planningGroupId, week) !== undefined
  });
  return refusal
    ? { ok: false, reason: `${refusal}: ${CAPACITY_DECISION_REFUSAL_SENTENCE[refusal]}` }
    : { ok: true };
});
