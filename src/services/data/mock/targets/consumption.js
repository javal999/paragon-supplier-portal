// ────────────────────────────────────────────────────────────────────────────
// CAP-11 · THE RECORDED CONSUMPTION TARGET (CAP-D14).
//
// `entityId` is the record id (`con-0001`, minted by the store).
//
//   · `readState` answers `Recorded` for a record that exists.
//   · `readScopeOwner` / `creationOwner` are null: consumption is PTI's own
//     figure, so a supplier seat is denied at SCOPE (§86).
//   · `create` APPENDS a record. The material, week, quantity, unit and source
//     come from the payload, each checked first by the policy hook; the time
//     (hub clock) and the actor (the session's) are assigned here.
//   · `applyTransition` is a no-op: a record is never changed; a later record
//     for the same material × week supersedes it at read.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
/** @import { ConsumptionSource } from '../../../transitions/consumptionRules' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import { consumptionRefusal } from '../../../transitions/consumptionRules';
import { materialEntry, sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { consumptionStore } from '../stores/consumptionStore';

/** @param {string} code */
const uomOf = (code) => materialEntry(code)?.canonicalUom ?? null;

/** @type {CommandTarget} */
export const consumptionTarget = {
  readState: (id) => (consumptionStore.get(id) ? 'Recorded' : null),
  readScopeOwner: () => null,
  readEntity: (id) => consumptionStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — a record is never changed */
  },
  creationOwner: () => null,
  create: (payload, _toState, scope) => {
    // The policy hook has refused every payload this could not store.
    const made = consumptionStore.add({
      materialCode: String(payload.materialCode),
      week: String(payload.week),
      qty: Number(payload.qty),
      unit: String(payload.unit),
      source: /** @type {ConsumptionSource} */ (payload.source),
      recordedAt: sdcClock.now(),
      actor: scope.actor ?? NO_PERSON
    });
    return { entityId: made.id };
  }
};

/** @type {Record<NonNullable<ReturnType<typeof consumptionRefusal>>, string>} */
const REFUSAL_TEXT = {
  UNKNOWN_MATERIAL: 'UNKNOWN_MATERIAL: the material is not in the material master',
  NOT_A_WEEK: 'NOT_A_WEEK: name the week by its Monday (YYYY-MM-DD)',
  FUTURE_WEEK: 'FUTURE_WEEK: consumption can be recorded up to the current week only',
  NOT_A_QUANTITY: 'NOT_A_QUANTITY: the consumption must be a number above zero',
  UNIT_MISMATCH: 'UNIT_MISMATCH: the unit is not the material’s unit in the master',
  BAD_SOURCE: 'BAD_SOURCE: a planner records consumption typed or uploaded; SAP is the feed’s'
};

bindPolicyHook(POLICY_HOOKS.CONSUMPTION_RECORD_VALID, ({ payload }) => {
  const refusal = consumptionRefusal(payload, { uomOf, nowIso: sdcClock.now() });
  return refusal ? { ok: false, reason: REFUSAL_TEXT[refusal] } : { ok: true };
});
