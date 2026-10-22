// ────────────────────────────────────────────────────────────────────────────
// BL-202 (DRC-17 BR-05) · THE WHAT-IF SCENARIO TARGET.
//
// `entityId` is the scenario id (`wis-0001`, minted by the store).
//
//   · Creation-only: `create` appends a row; `applyTransition` is a no-op (a
//     scenario is never changed; saving other numbers is a new scenario).
//   · `readScopeOwner` and `creationOwner` are null: the sandbox is PTI's
//     analysis, so every supplier seat is denied at SCOPE (§86).
//   · `savedAt` is the hub clock, `savedBy` the session's actor, and
//     `rulesVersion` the `RULES_VERSION` in force — never the payload's. The
//     headline figures are recomputed here from the stored inputs and stamped
//     with that version (DRC-D16), so a later rules change can say what moved.
//   · BR-06 — this writes ONLY `whatIfScenarioStore`. No DA, PO, call-off,
//     level, setting or SAP record moves (whatIfSandbox.test.js holds that).
//   · The hook calls `scenarioRefusal`, the rule the page's form calls.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
/** @import { WhatIfInputs, WhatIfSwitches } from '../../../transitions/whatIfSandboxRules' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import { RULES_VERSION, stamp } from '../../../transitions/osipRules';
import {
  headlinesOf,
  mergeSwitches,
  runWhatIf,
  scenarioRefusal
} from '../../../transitions/whatIfSandboxRules';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { whatIfScenarioStore } from '../stores/whatIfScenarioStore';
import { isWhatIfPair } from '../whatIfSandboxReadModel';

/** @type {CommandTarget} */
export const whatIfScenarioTarget = {
  readState: (id) => (whatIfScenarioStore.get(id) ? 'Saved' : null),
  readScopeOwner: () => null,
  readEntity: (id) => whatIfScenarioStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — a scenario is saved once; other numbers are a new scenario */
  },
  creationOwner: () => null,
  create: (payload, _toState, scope) => {
    // The policy hook has refused every payload this could not store.
    const inputs = /** @type {WhatIfInputs} */ (structuredClone(payload.inputs));
    const switches = mergeSwitches(
      /** @type {Partial<WhatIfSwitches>} */ (structuredClone(payload.switches))
    );
    const supplierId = String(payload.supplierId);
    const materialCode = String(payload.materialCode);
    const made = whatIfScenarioStore.add({
      name: String(payload.name).trim(),
      supplierId,
      materialCode,
      inputs,
      switches,
      rulesVersion: RULES_VERSION,
      figuresAtSave: stamp(headlinesOf(runWhatIf(inputs, switches)), {
        supplierId,
        materialCode
      }),
      savedAt: sdcClock.now(),
      savedBy: scope.actor ?? NO_PERSON
    });
    return { entityId: made.id };
  }
};

// DRC-17 BR-05 — the same rule the page's save form calls.
bindPolicyHook(POLICY_HOOKS.WHAT_IF_SCENARIO_VALID, ({ payload }) => {
  const refusal = scenarioRefusal(payload, { pairKnown: isWhatIfPair });
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
