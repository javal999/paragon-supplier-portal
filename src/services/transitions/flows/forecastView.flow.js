// ────────────────────────────────────────────────────────────────────────────
// Forecast view — REQ-E06-01 ("sees which suppliers have viewed it").
//
// Recorded when a supplier opens a version of its forecast. Once per supplier
// × version: opening it again returns the first record, so PTI reads when the
// supplier first saw it. The supplier's "New forecast version to review" task
// is derived from the versions without a view.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */

/** @type {FlowDefinition} */
export const forecastViewFlow = {
  entity: 'forecastView',
  version: 1,
  states: ['Viewed'],
  initial: 'Viewed',
  terminals: ['Viewed'],
  transitions: [
    {
      id: 't_forecastview_record',
      from: [],
      to: 'Viewed',
      trigger: 'creation',
      requiredRole: 'forecast:view',
      requiredFields: ['publicationId', 'supplierId'],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
