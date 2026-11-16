// ────────────────────────────────────────────────────────────────────────────
// PEX-8 · THE PO ON HOLD DECISION TARGET (`supplierAsk`'s shape).
//
// `entityId` is the decision id (`poh-0001`, minted by the store).
//   · `readScopeOwner` NAMES THE SUPPLIER of the line, so a supplier seat can
//     choose only on its own lines (§86). `creationOwner` is the supplier the
//     payload names, resolved against the supplier master.
//   · `create` inserts the decision with the planner's suggestion; time (hub
//     clock) and actor are assigned here. `applyTransition` appends the
//     supplier's choice. No earlier step is changed (PEX-8 BR-05).
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import { poOnHoldOptionRefusal } from '../../../transitions/poOnHold';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { poOnHoldStore } from '../stores/poOnHoldStore';
import { poOnHoldFor } from '../poOnHoldReadModel';
import { executePoOnHold } from '../poOnHoldExecutor';
import { isKnownSupplier } from '../supplierMaster';

/**
 * @param {unknown} v
 * @returns {string}
 */
const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** @type {CommandTarget} */
export const poOnHoldDecisionTarget = {
  readState: (id) => poOnHoldStore.get(id)?.state ?? null,
  readScopeOwner: (id) => poOnHoldStore.get(id)?.supplierId ?? null,
  readEntity: (id) => poOnHoldStore.get(id) ?? null,
  applyTransition: (id, toState, payload, scope) => {
    // PEX-8 — the end of the grace period: the system runs the option that stands.
    if (toState === 'Executed') {
      executePoOnHold(id);
      return;
    }
    // The policy hook has already refused every payload this could not store.
    const option = /** @type {import('../../../transitions/poOnHold').PoOnHoldOption} */ (
      str(payload.option)
    );
    poOnHoldStore.append(id, 'Chosen', option, {
      kind: 'chosen',
      option,
      at: sdcClock.now(),
      actor: scope.actor ?? NO_PERSON
    });
  },
  requireCreationOwner: true,
  creationOwner: (payload) => {
    const sid = str(payload.supplierId);
    return isKnownSupplier(sid) ? sid : null;
  },
  create: (payload, _toState, scope) => {
    const line = poOnHoldFor(str(payload.supplierId), str(payload.materialCode));
    const option = /** @type {import('../../../transitions/poOnHold').PoOnHoldOption} */ (
      str(payload.option)
    );
    // [Proposed] "Suggest again": the line's decision already ran and left a
    // remainder on hold, so this is a new round — a new decision, never a
    // second row on the old one. Its grace period starts today (hub day).
    const previous = line?.decision ? poOnHoldStore.get(line.decision.id) : undefined;
    const supplierId = str(payload.supplierId);
    const materialCode = str(payload.materialCode);
    const today = sdcClock.now().slice(0, 10);
    if (previous) poOnHoldStore.restart(`${supplierId}|${materialCode}`, today);
    const row = poOnHoldStore.insert({
      supplierId,
      materialCode,
      firstDay: previous ? today : (line?.grace.firstDay ?? today),
      ...(previous ? { round: (previous.round ?? 1) + 1, previousId: previous.id } : {}),
      qty: line?.qty ?? 0,
      state: 'Suggested',
      suggested: option,
      chosen: null,
      history: [{ kind: 'suggested', option, at: sdcClock.now(), actor: scope.actor ?? NO_PERSON }]
    });
    return { entityId: row.id };
  }
};

// PEX-8 BR-01 — the planner suggests on a line that is on hold, once per round:
// a line whose decision already executed and left a remainder takes a new one
// ("Suggest again", [Proposed]); any other line with a decision is refused.
bindPolicyHook(POLICY_HOOKS.PO_ON_HOLD_SUGGESTABLE, ({ payload }) => {
  const refusal = poOnHoldOptionRefusal(payload.option);
  if (refusal) return { ok: false, reason: refusal };
  const line = poOnHoldFor(str(payload.supplierId), str(payload.materialCode));
  if (!line)
    return {
      ok: false,
      reason: 'PO_ON_HOLD_NO_LINE: nothing is on hold for this supplier and material'
    };
  if (line.decision && line.execution.status !== 'executed')
    return {
      ok: false,
      reason: 'PO_ON_HOLD_ALREADY_SUGGESTED: this line already has a suggestion'
    };
  return { ok: true };
});

// PEX-8 BR-01 — the supplier chooses while the grace period runs.
bindPolicyHook(POLICY_HOOKS.PO_ON_HOLD_CHOOSABLE, ({ entityId, payload }) => {
  const refusal = poOnHoldOptionRefusal(payload.option);
  if (refusal) return { ok: false, reason: refusal };
  const d = poOnHoldStore.get(entityId);
  const line = d ? poOnHoldFor(d.supplierId, d.materialCode) : undefined;
  if (!line || line.decision?.id !== entityId)
    return { ok: false, reason: 'PO_ON_HOLD_NO_LINE: this line is no longer on hold' };
  // [Proposed] a choice after the end of the grace period is refused: by then
  // the suggestion already applies (PEX-8 BR-06).
  if (line.grace.ended)
    return {
      ok: false,
      reason: 'PO_ON_HOLD_GRACE_ENDED: the grace period is over; the planner’s suggestion applies'
    };
  return { ok: true };
});

// PEX-8 BR-02/BR-05 — the execution runs when the line is still on hold, the
// grace period has ended, an option stands and the facts it needs are on record.
bindPolicyHook(POLICY_HOOKS.PO_ON_HOLD_EXECUTABLE, ({ entityId }) => {
  const d = poOnHoldStore.get(entityId);
  const line = d ? poOnHoldFor(d.supplierId, d.materialCode) : undefined;
  if (!line || line.decision?.id !== entityId)
    return { ok: false, reason: 'PO_ON_HOLD_NO_LINE: this line is no longer on hold' };
  if (!line.grace.ended)
    return { ok: false, reason: 'PO_ON_HOLD_GRACE_RUNNING: the grace period has not ended' };
  if (line.effective === null)
    return {
      ok: false,
      reason: 'PO_ON_HOLD_NO_OPTION: no option stands; the line is with the planner'
    };
  if (line.execution.plan?.blocked)
    return {
      ok: false,
      reason: `PO_ON_HOLD_BLOCKED: ${line.execution.plan.blocked === 'noCap' ? 'the FG cap cannot be computed' : 'no lead time on record'}`
    };
  return { ok: true };
});
