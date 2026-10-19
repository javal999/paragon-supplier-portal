// ────────────────────────────────────────────────────────────────────────────
// Recorded consumption — CAP-11 (BL-180), CAP-D14
// (SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10 §5).
//
// The Material Planner records how much of a material was used in a week,
// typed in or uploaded from the template, until the SAP goods-issue feed
// exists. The demand anticipation read shows it per supplier beside the
// rolling figure and the DRC-18 moving average reads it. (Absorbing an excess
// into the next horizon, CAP-11 BR-02/03, is superseded by DRC-4 BR-02.)
//
// THE PRECEDENT IS `t_demandanticipation_publish`, FOLLOWED: a creation verb
// onto a single terminal state, one policy hook, and the time and the actor
// target-assigned, never read from the payload. A record is never edited: a
// later record for the same material × week supersedes it at read, and both
// stay stored.
//
// THE ATOM IS THE PLANNER'S `forecast:publish`, REUSED, NOT MINTED. Recorded
// consumption is a planning input beside the demand anticipation, so the seat
// that publishes the demand anticipation is the seat that records it.
//
// A record of PTI's own plan: nothing is sent to SAP or a supplier on it.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const consumptionFlow = {
  entity: 'consumption',
  version: 1,
  states: ['Recorded'],
  initial: 'Recorded',
  /** A record is followed by a later one, never changed. */
  terminals: ['Recorded'],
  transitions: [
    {
      id: 't_consumption_record',
      from: [],
      to: 'Recorded',
      trigger: 'creation',
      requiredRole: 'forecast:publish',
      requiredFields: ['materialCode', 'week', 'qty', 'unit', 'source'],
      policyHooks: [POLICY_HOOKS.CONSUMPTION_RECORD_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
