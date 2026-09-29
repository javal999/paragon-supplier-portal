// ────────────────────────────────────────────────────────────────────────────
// Capacity confirmation — REQ-E08-04.
//
// The supplier states the capacity it allocates to PTI per material group and
// week for the 13-week horizon, with optional upside (BR-05). A week below
// PTI's demand (the LTP: the current forecast, summed per group and week) cannot be submitted without a starter reason code, and `other`
// needs a note (BR-04, AC-02) — enforced HERE, by policy, not by the page.
//
// A submission is a snapshot: a changed plan is a new submission, and the
// latest per supplier × group is the current one (derived at read). The
// planner's gap notification is a Home task derived from the latest
// submissions, so nothing is stored beyond the submission itself.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const capacitySubmissionFlow: FlowDefinition = {
  entity: 'capacitySubmission',
  version: 1,
  states: ['Submitted'],
  initial: 'Submitted',
  /** A submission is replaced by a newer one, never changed. */
  terminals: ['Submitted'],
  transitions: [
    {
      id: 't_capacity_submit',
      from: [],
      to: 'Submitted',
      trigger: 'creation',
      requiredRole: 'capacity:confirm',
      requiredFields: ['supplierId', 'materialGroup', 'weeks'],
      policyHooks: [POLICY_HOOKS.CAPACITY_SUBMISSION_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
