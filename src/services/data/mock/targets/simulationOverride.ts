// ────────────────────────────────────────────────────────────────────────────
// Material E1 · THE STOCK SIMULATION PLANNER INPUT TARGET (MR-7 BR-08; plan
// AD-1, AD-5, AR-20).
//
//   · Creation-only: `create` appends a row; `applyTransition` is a no-op (a
//     changed figure is a new input, never an edit).
//   · `readScopeOwner` and `creationOwner` are null: the simulation is PTI's
//     estimate, so every supplier seat is denied at SCOPE (§86).
//   · `enteredAt` is the hub clock and `enteredBy` the session's actor; the
//     supplier's stock record is never touched (BR-08).
//   · The hook calls `simulationOverrideRefusal`, the rule the page calls.
// ────────────────────────────────────────────────────────────────────────────

import { bindPolicyHook, POLICY_HOOKS, type CommandTarget } from '../../../transitions';
import { simulationOverrideRefusal } from '../../../transitions/simulateSupplierStock';
import { materialEntry, sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import type { SimulationOverrideField } from '../../types';
import { simulationOverrideStore } from '../stores/simulationOverrideStore';
import { supplierEntry } from '../supplierMaster';

export const simulationOverrideTarget: CommandTarget = {
  readState: (id) => (simulationOverrideStore.get(id) ? 'Recorded' : null),
  readScopeOwner: () => null,
  readEntity: (id) => simulationOverrideStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — an input is recorded once; a changed figure is a new input */
  },
  creationOwner: () => null,
  create: (payload, _toState, scope) => {
    const date = typeof payload.date === 'string' && payload.date !== '' ? payload.date : undefined;
    const made = simulationOverrideStore.add({
      supplierId: String(payload.supplierId),
      materialCode: String(payload.materialCode),
      field: payload.field as SimulationOverrideField,
      value: Number(payload.value),
      ...(date ? { date } : {}),
      enteredBy: scope.actor ?? NO_PERSON,
      enteredAt: sdcClock.now(),
    });
    return { entityId: made.id };
  },
};

bindPolicyHook(POLICY_HOOKS.SIMULATION_OVERRIDE_VALID, ({ payload }) => {
  const refusal = simulationOverrideRefusal(payload, {
    supplierKnown: (id) => supplierEntry(id) !== null,
    materialKnown: (code) => materialEntry(code) !== null,
  });
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
