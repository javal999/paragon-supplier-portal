// ────────────────────────────────────────────────────────────────────────────
// Demand anticipation publication — CAP-10 (BL-179), CAP-D13
// (SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10 §4).
//
// Weeks run in fixed 4-week horizons (CAP-D17, owner 2026-10-13), anchored on
// the first published one. A publication freezes the horizon that holds the
// current hub week, once, and never a future one (BR-01). It is never edited:
// the next horizon is a NEW publication, and a frozen week keeps its first
// figure (BR-02).
//
// THE PRECEDENT IS `t_forecastversion_publish`, FOLLOWED: a creation verb onto
// a single terminal state, the planner's `forecast:publish` atom (reused, not
// minted — the same planner publishes the forecast this figure is built on),
// one policy hook, and the time, the actor and the figures target-assigned,
// never read from the payload. The one payload field, `horizonStart`, is the
// Monday the confirm named: a confirm left open while the hub week moved into
// the next horizon is refused rather than freezing weeks the planner did not see.
//
// A record of PTI's own plan: nothing is sent to SAP or a supplier on it.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const demandAnticipationFlow = {
  entity: 'demandAnticipation',
  version: 1,
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
      requiredFields: ['horizonStart'],
      policyHooks: [POLICY_HOOKS.DEMAND_ANTICIPATION_PUBLISH_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
