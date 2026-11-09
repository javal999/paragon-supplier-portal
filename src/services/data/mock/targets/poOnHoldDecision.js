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
  applyTransition: (id, _toState, payload, scope) => {
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
    const row = poOnHoldStore.insert({
      supplierId: str(payload.supplierId),
      materialCode: str(payload.materialCode),
      firstDay: line?.grace.firstDay ?? sdcClock.now().slice(0, 10),
      qty: line?.qty ?? 0,
      state: 'Suggested',
      suggested: option,
      chosen: null,
      history: [{ kind: 'suggested', option, at: sdcClock.now(), actor: scope.actor ?? NO_PERSON }]
    });
    return { entityId: row.id };
  }
};

// PEX-8 BR-01 — the planner suggests on a line that is on hold, once per episode.
bindPolicyHook(POLICY_HOOKS.PO_ON_HOLD_SUGGESTABLE, ({ payload }) => {
  const refusal = poOnHoldOptionRefusal(payload.option);
  if (refusal) return { ok: false, reason: refusal };
  const line = poOnHoldFor(str(payload.supplierId), str(payload.materialCode));
  if (!line)
    return {
      ok: false,
      reason: 'PO_ON_HOLD_NO_LINE: nothing is on hold for this supplier and material'
    };
  if (line.decision)
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
