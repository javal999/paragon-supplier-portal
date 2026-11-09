// ────────────────────────────────────────────────────────────────────────────
// BL-269 (PEX-4 BR-01) · THE MONTHLY CAPACITY TARGET.
//
// `entityId` is the submission id (`capm-0001`, minted by the store).
//   · `readScopeOwner` is the submission's supplier; creation is scoped to the
//     supplier named in the payload, and only when the supplier has a capacity
//     plan for the planning group (the weekly target's rule).
//   · `create` APPENDS a submission; the time (hub clock) is assigned here.
//   · `applyTransition` is a no-op: a changed entry is a new submission.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import {
  capacityMonthRefusal,
  headsUpMonths,
  isMonthlyEntryMonth
} from '../../../transitions/capacityHeadsUpRules';
import { sdcClock } from '../../../sdc';
import { capacityMonthStore } from '../stores/capacityMonthStore';
import { allCapacityPlans } from '../inventoryReadModel';

/**
 * The months a supplier may state for a group: those the weekly entry does not cover.
 * @param {string} supplierId
 * @param {string} planningGroupId
 * @returns {{ plan: boolean; allowed: string[] }}
 */
function allowedMonths(supplierId, planningGroupId) {
  const plan = allCapacityPlans().find(
    (p) => p.supplierId === supplierId && p.planningGroupId === planningGroupId
  );
  if (!plan) return { plan: false, allowed: [] };
  const horizon = plan.weeks.map((w) => w.week);
  return {
    plan: true,
    allowed: headsUpMonths(sdcClock.now()).filter((m) => isMonthlyEntryMonth(m, horizon))
  };
}

/** @type {CommandTarget} */
export const capacityMonthTarget = {
  readState: (id) => (capacityMonthStore.get(id) ? 'Submitted' : null),
  readScopeOwner: (id) => capacityMonthStore.get(id)?.supplierId ?? null,
  readEntity: (id) => capacityMonthStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — a changed entry is a new submission */
  },
  requireCreationOwner: true,
  creationOwner: (payload) => {
    const supplierId = String(payload.supplierId);
    return allowedMonths(supplierId, String(payload.planningGroupId)).plan ? supplierId : null;
  },
  create: (payload) => {
    const months = /** @type {{ month: string; allocated: number; upside?: number }[]} */ (
      payload.months
    ).map((m) => ({
      month: m.month,
      allocated: m.allocated,
      ...(typeof m.upside === 'number' ? { upside: m.upside } : {})
    }));
    const row = {
      id: capacityMonthStore.nextId(),
      supplierId: String(payload.supplierId),
      planningGroupId: String(payload.planningGroupId),
      submittedAt: sdcClock.now(),
      months: months.sort((a, b) => a.month.localeCompare(b.month))
    };
    capacityMonthStore.add(row);
    return { entityId: row.id };
  }
};

bindPolicyHook(POLICY_HOOKS.CAPACITY_MONTH_VALID, ({ payload }) => {
  const { plan, allowed } = allowedMonths(
    String(payload.supplierId),
    String(payload.planningGroupId)
  );
  if (!plan)
    return { ok: false, reason: 'no materials of this group are assigned to the supplier' };
  const refusal = capacityMonthRefusal(payload.months, allowed);
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
