// ────────────────────────────────────────────────────────────────────────────
// Forecast version — REQ-E06-01 (publication) and REQ-E06-03 BR-05 (reassign).
//
// A version is a snapshot of one forecast stream (packaging weekly, raw
// material monthly). It is never edited: a re-publication — on the cadence or
// an emergency one — is a NEW version, and so is moving a period's demand from
// one supplier to another. Every earlier version is kept (BR-06).
//
// In the prototype the SAP planning run is simulated: publish builds the next
// version from sample demand on the working calendar's "now". Both verbs are
// the planner's; suppliers are notified through their Home task, which is
// derived from the versions they have not opened yet.
//
// REQ-E14-06 — the stabilised engine plan asks to publish through the same
// verb with `source: 'engine'`. That is refused (ENG-B35): while the engine
// dataset is simulated (X-03), and — once it is live — until SOMO ratifies
// C8 §8, because a publication today names SOMO as the source of its totals.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const forecastVersionFlow: FlowDefinition = {
  entity: 'forecastVersion',
  version: 1,
  states: ['Published'],
  initial: 'Published',
  /** A version is superseded by a newer one, never changed. */
  terminals: ['Published'],
  transitions: [
    {
      id: 't_forecastversion_publish',
      from: [],
      to: 'Published',
      trigger: 'creation',
      requiredRole: 'forecast:publish',
      requiredFields: ['stream'],
      // REQ-E14-06 (X-03): a publication sourced from the forecast engine is
      // refused while its data is simulated, and until C8 §8 is ratified.
      policyHooks: [POLICY_HOOKS.FORECAST_PUBLISH_VALID, POLICY_HOOKS.FORECAST_ENGINE_PUBLISH_ALLOWED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_forecastversion_reassign',
      from: [],
      to: 'Published',
      trigger: 'creation',
      requiredRole: 'forecast:publish',
      requiredFields: ['publicationId', 'materialCode', 'periodBucket', 'fromSupplierId', 'toSupplierId', 'note'],
      policyHooks: [POLICY_HOOKS.FORECAST_REASSIGN_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
