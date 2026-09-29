// ────────────────────────────────────────────────────────────────────────────
// Forecast override — REQ-E14-11 X-06 / BR-03 (ENG-D11 decided 2026-09-28).
//
// A Material Planning team member overrides one SKU × week of the demand
// forecast (E14-07). The record keeps who, when, the old value, the new value
// and a reason code (X-06); an upward override needs a reason code (BR-03).
// Creation-only, one state — an override has no lifecycle; a later override of
// the same cell is a new record and the latest is in force (the ledger shape of
// `sapChangeMark`). The old value and the engine's value are read from the
// forecast run by the target, never taken from the form.
//
// Not refused on simulated data, unlike `t_sapchange_mark`: an override
// reaches neither a supplier nor material planning (SAP's plan stays E14-03's
// input, ENG-B66), so nothing leaves PTI on the strength of it (ENG-B102).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const forecastOverrideFlow: FlowDefinition = {
  entity: 'forecastOverride',
  version: 1,
  states: ['Recorded'],
  initial: 'Recorded',
  terminals: ['Recorded'],
  transitions: [
    {
      id: 't_forecastoverride_record',
      from: [],
      to: 'Recorded',
      trigger: 'creation',
      requiredRole: 'forecastoverride:record',
      requiredFields: ['skuCode', 'weekStart', 'newValue'],
      policyHooks: [POLICY_HOOKS.FORECAST_OVERRIDE_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
