// ────────────────────────────────────────────────────────────────────────────
// PO ON HOLD DECISION — PEX-8 (BL-271), [Table], owner 2026-11-05 (Q3–Q6,
// PEX-D4): the planner suggests one of FS only, FS + spread or FG for a PO On
// Hold line; the supplier chooses the final option, and the choice is final.
//
// ITS OWN FLOW, MODELLED ON `supplierAsk` (the planner raises, the supplier the
// row names answers). Two states: `Suggested` (the planner has suggested; the
// supplier may still choose) and `Chosen`. A supplier who does not choose by
// the end of the grace period is not a state: the read applies the planner's
// suggestion and marks it "no supplier response" [Proposed, PEX-D14].
//
// Both steps are appended with time and actor (PEX-8 BR-05). Not here: the
// end-of-grace execution itself (the call-off, the spread, the FG absorption)
// and the automatic handling (PEX-12, Hold).
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const poOnHoldDecisionFlow = {
  entity: 'poOnHoldDecision',
  version: 1,
  states: ['Suggested', 'Chosen'],
  initial: 'Suggested',
  /** The supplier's choice is final (PEX-8 BR-01). */
  terminals: ['Chosen'],
  transitions: [
    {
      // The planner suggests an option for one PO On Hold line.
      id: 't_poonhold_suggest',
      from: [],
      to: 'Suggested',
      trigger: 'creation',
      requiredRole: 'poonhold:suggest',
      requiredFields: ['supplierId', 'materialCode', 'option'],
      policyHooks: [POLICY_HOOKS.PO_ON_HOLD_SUGGESTABLE],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // The supplier the line names chooses the final option.
      id: 't_poonhold_choose',
      from: ['Suggested'],
      to: 'Chosen',
      trigger: 'user',
      requiredRole: 'poonhold:choose',
      requiredFields: ['option'],
      policyHooks: [POLICY_HOOKS.PO_ON_HOLD_CHOOSABLE],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
