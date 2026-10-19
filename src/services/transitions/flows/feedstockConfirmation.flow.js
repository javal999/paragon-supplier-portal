// ────────────────────────────────────────────────────────────────────────────
// Feedstock confirmation — BL-194, DRC-8 (feedstock part only; DRC-D17).
//
// The supplier confirms its CURRENT FEEDSTOCK for one assigned material: a
// quantity in the material's unit (0 allowed), the date it confirms it as of
// (required, not in the future) and an optional note (BR-a).
//
// A DEGENERATE SINGLE-STATE machine, the same shape as `inventoryDeclaration`
// and `capacitySubmission`: a confirmation is a snapshot, a changed figure is
// a NEW record (append-only), and the one in force is the latest per
// supplier × material, derived at read. The one state exists so the act rides
// the governed dispatch spine (role + fields + scope + policy + DR-10 audit).
//
// MoM 2B / MR-7 BR-01 (BR-c): feedstock potential is NOT physical stock until
// it is produced, so this entity has its own store and never reaches the stock
// declarations the SOH, the stock simulation and "free to call off" read.
//
// No planner review verb (BR-d): no existing acknowledge pattern could be
// reused without a new atom, verb and surface, so PTI sees "confirmed by
// supplier on …" only. Recorded as a decision for the owner.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const feedstockConfirmationFlow = {
  entity: 'feedstockConfirmation',
  version: 1,
  states: ['Confirmed'],
  initial: 'Confirmed',
  /** A confirmation is superseded by a newer one, never changed. */
  terminals: ['Confirmed'],
  transitions: [
    {
      id: 't_feedstock_confirm',
      from: [],
      to: 'Confirmed',
      trigger: 'creation',
      requiredRole: 'feedstock:confirm',
      // DRC-8 BR-a — the supplier, the material, the quantity and the date.
      // The unit is never a payload field: the target copies it from the
      // material master.
      requiredFields: ['supplierId', 'materialCode', 'feedstockQty', 'confirmedOn'],
      policyHooks: [POLICY_HOOKS.FEEDSTOCK_CONFIRMATION_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
