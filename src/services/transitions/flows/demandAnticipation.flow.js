// ────────────────────────────────────────────────────────────────────────────
// Demand anticipation publication — CAP-10 (BL-179), CAP-D13, reworked by
// DRC-2 (BL-188, DRC-D13; SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10).
//
// The horizon is the lead time, rolling weekly (DRC-2 BR-01). A publication
// records what was sent for ONE planning week: every supplier × material's
// figure, stamped with its inputs and rules version (DRC-D16). It is never
// edited: publishing again in the same week appends a newer record that
// supersedes it at read, and the next week's publication rolls forward.
//
// The publish act also records the supplier's agreement to take a remainder
// in the first week outside the horizon (`agreedFirstOutside`, [Owner A8]):
// the smallest governed act for it, with this verb's atom, policy hook and
// audit event, rather than a second verb.
//
// THE PRECEDENT IS `t_forecastversion_publish`, FOLLOWED: a creation verb onto
// a single terminal state, the planner's `forecast:publish` atom (reused, not
// minted — the same planner publishes the forecast this figure is built on),
// one policy hook, and the time, the actor and the figures target-assigned,
// never read from the payload. The required payload field, `planningWeek`, is
// the Monday the confirm named: a confirm left open while the hub week moved
// on is refused rather than publishing a week the planner did not see.
//
// A record of PTI's own plan: nothing is sent to SAP or a supplier on it.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const demandAnticipationFlow = {
  entity: 'demandAnticipation',
  version: 2,
  states: ['Published'],
  initial: 'Published',
  /** A publication is followed by a newer one, never changed. */
  terminals: ['Published'],
  transitions: [
    {
      id: 't_demandanticipation_publish',
      from: [],
      to: 'Published',
      trigger: 'creation',
      requiredRole: 'forecast:publish',
      requiredFields: ['planningWeek'],
      policyHooks: [POLICY_HOOKS.DEMAND_ANTICIPATION_PUBLISH_VALID],
      surfaceable: { surfaced: true },
      version: 2
    }
  ]
};
