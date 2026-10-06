// ────────────────────────────────────────────────────────────────────────────
// Supplier overlay flow — Material A1 (MR-1 BR-02, AC-06; plan AD-4, AR-03, AR-04).
// THE RECORDING VERB FOR A SUPPLIER'S HUB-MASTERED FIELDS.
//
// The `t_threepl_set` shape, followed: a governance act, `statePreserving`,
// append-only. A supplier's overlay has no lifecycle — it has a ledger of
// changes — so `Defined` is the one state and nothing leaves it. `entityId` IS
// the supplier id; there is no supplier payload field. `setAt` is stamped by
// the target and `setBy` comes from the session, never from the form.
//
// ── `supplier:set-update-mode` IS A `compliance` ATOM (AR-04) ───────────────
// MR-1 AC-06 says only the Hub administrator changes a supplier's update mode.
// `admin` is the derived union of every lane, so "administrator only" cannot be
// expressed as its own bundle; the governance acts sit in `compliance` and
// `admin` holds them by derivation. The mode decides the supplier's update
// cadence, its staleness rule and its compliance measure, so no supplier lane
// (it would pick the rule it is measured by) and not `planning` (which judges
// the stock it yields) may hold it.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const supplierOverlayFlow = {
  entity: 'supplierOverlay',
  version: 1,
  // ONE state. A supplier's overlay has a ledger, not a lifecycle.
  states: ['Defined'],
  initial: 'Defined',
  /** `t_supplier_set_update_mode` is statePreserving, so nothing ever leaves it. */
  terminals: ['Defined'],
  transitions: [
    {
      // WIRED (Material A1). The Hub administrator sets a supplier's stock
      // update mode — API or manual — with an optional reason.
      id: 't_supplier_set_update_mode',
      from: ['Defined'],
      to: 'Defined',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'supplier:set-update-mode',
      requiredFields: ['stockUpdateMode'],
      policyHooks: [POLICY_HOOKS.SUPPLIER_UPDATE_MODE_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
