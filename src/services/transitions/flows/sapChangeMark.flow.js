// ────────────────────────────────────────────────────────────────────────────
// "Taken to SAP" — REQ-E14-13 BR-07 (ENG-D16 decided 2026-09-24).
//
// The Hub does not edit a PO (REQ-E07-01 BR-02). A PO-line proposal from the
// reschedule report is agreed with the supplier and changed in SAP by the
// Material Planner (ENG-D16); the Hub records only that the planner took it
// there, the change taken, and when. Creation-only, one state — a mark has no
// lifecycle, the same shape as `forecastView`. The line itself is read from
// the engine's dataset, never echoed from the form.
//
// X-03: while the engine runs on simulated data the mark is refused — a change
// made in SAP from a proposal on synthetic data would reach the supplier
// through SAP, which is what the release rule forbids (ENG-B18, ENG-B24).
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const sapChangeMarkFlow = {
  entity: 'sapChangeMark',
  version: 1,
  states: ['Recorded'],
  initial: 'Recorded',
  terminals: ['Recorded'],
  transitions: [
    {
      id: 't_sapchange_mark',
      from: [],
      to: 'Recorded',
      trigger: 'creation',
      requiredRole: 'sapchange:mark',
      requiredFields: ['poNumber', 'line', 'proposalType', 'proposedQuantity'],
      policyHooks: [POLICY_HOOKS.SAP_CHANGE_MARK_VALID, POLICY_HOOKS.SAP_CHANGE_ENGINE_DATA_LIVE],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
