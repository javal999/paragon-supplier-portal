// ────────────────────────────────────────────────────────────────────────────
// REQ-E14-08 BR-05 (BL-235) — a promotion entered for one SKU.
//
// THE PRECEDENT IS `t_ltpinput_set`, FOLLOWED: a degenerate single-state ledger,
// statePreserving, append-only. `entityId` IS the key (`promo|<sku>|<week>`):
// one active promotion per SKU per week. ONE verb enters, changes and withdraws
// (the payload says which), as the LTP verb uploads and chooses.
//
// `promotion:set` IS A `planning` ATOM: the Material Planner holds it, as it holds
// `ltpinput:set`. No supplier lane holds it; the target denies every supplier at
// SCOPE. [Proposed] — the owner asked for "a planner"; Marketing owns the
// promotion calendar later (ENG-D12).
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const promotionFlow = {
  entity: 'promotion',
  version: 1,
  states: ['Maintained'],
  initial: 'Maintained',
  /** `t_promotion_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Maintained'],
  transitions: [
    {
      id: 't_promotion_set',
      from: ['Maintained'],
      to: 'Maintained',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'promotion:set',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.PROMOTION_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
