// ────────────────────────────────────────────────────────────────────────────
// BL-267 (PEX-5) — LTP inputs: the planner's upload of LTP A, LTP Festive and
// LTP B for a material, and the LTP choice (A, Festive or B).
//
// THE PRECEDENT IS `t_osipparam_set`, FOLLOWED: a degenerate single-state
// ledger, statePreserving, append-only. `entityId` IS the key
// (`upload|<material>|<series>` or `choice|<material>`). The hub never picks the
// LTP (BR-07): the planner records the choice the owner's system made.
//
// `ltpinput:set` IS A `planning` ATOM: the Material Planner holds it, as it
// holds `osipparam:set`. No supplier lane holds it; the target denies every
// supplier at SCOPE. Planner file upload is [Proposed, PEX-D12] until the feed
// of the owner's system exists.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const ltpInputFlow = {
  entity: 'ltpInput',
  version: 1,
  states: ['Maintained'],
  initial: 'Maintained',
  /** `t_ltpinput_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Maintained'],
  transitions: [
    {
      id: 't_ltpinput_set',
      from: ['Maintained'],
      to: 'Maintained',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'ltpinput:set',
      // The payload differs by key kind (an upload or a choice): the policy hook checks it.
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.LTP_INPUT_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
