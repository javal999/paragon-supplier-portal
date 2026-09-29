// ────────────────────────────────────────────────────────────────────────────
// Inventory and capacity alert — REQ-E08-05.
//
// An alert is OPEN while its derived condition holds and nobody has closed it
// (BR-01, BR-05). The planner closes it with a reason from the `alertClose`
// list, and a note when the reason is "Other" (MR-9 BR-04). `entityId` is the
// alert key (rule × material or group × supplier), so one condition is one
// alert. A closed alert reopens only when its condition clears and recurs —
// that is derived from the closure ledger, not a verb, so no state here moves
// back to Open.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const inventoryAlertFlow: FlowDefinition = {
  entity: 'inventoryAlert',
  version: 1,
  states: ['Open', 'Closed'],
  initial: 'Open',
  /** Closed has no verb out; a recurrence is a fresh open alert. */
  terminals: ['Closed'],
  transitions: [
    {
      id: 't_inventoryalert_close',
      from: ['Open'],
      to: 'Closed',
      trigger: 'user',
      requiredRole: 'inventoryalert:close',
      // MR-9 BR-04 (AR-14) — a reason is required; the note only for "Other".
      requiredFields: ['closeReason'],
      policyHooks: [POLICY_HOOKS.ALERT_CLOSE_REASON_GIVEN],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
