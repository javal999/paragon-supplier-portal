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
// [Proposed] "Suggest again": a remainder left on hold after `Executed` gets a
// NEW decision (round 2, 3, …) through the same `t_poonhold_suggest`: one
// execution per decision stays true, and the old rows are never changed.
//
// Both steps are appended with time and actor (PEX-8 BR-05). The third state,
// `Executed`, is the end of the grace period: the system calls off, spreads or
// absorbs per the option that stands (`t_poonhold_execute`, a machine act, run
// once per decision). Not here: the automatic handling (PEX-12, Hold).
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const poOnHoldDecisionFlow = {
  entity: 'poOnHoldDecision',
  version: 1,
  states: ['Suggested', 'Chosen', 'Executed'],
  initial: 'Suggested',
  /** The supplier's choice is final (PEX-8 BR-01); the execution ends the line's episode. */
  terminals: ['Executed'],
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
    },
    {
      // PEX-8 BR-02/BR-05 — the end of the grace period: the system executes
      // the option that stands (the supplier's choice, else the planner's
      // suggestion, BR-06). Once per decision; recorded on the ledger.
      id: 't_poonhold_execute',
      from: ['Suggested', 'Chosen'],
      to: 'Executed',
      trigger: 'system',
      requiredRole: 'poonhold:execute',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.PO_ON_HOLD_EXECUTABLE],
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why:
          'The end of the grace period is a date, not a decision: the hub runs ' +
          'the option that stands, once. The planner sees a read-only preview.'
      },
      version: 1
    }
  ]
};
