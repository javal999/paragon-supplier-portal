// ────────────────────────────────────────────────────────────────────────────
// Inventory and capacity alert — REQ-E08-05.
//
// An alert is OPEN while its derived condition holds and nobody has closed it
// (BR-01, BR-05). The planner closes it with an action note. `entityId` is the
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
      requiredFields: ['actionNote'],
      policyHooks: [POLICY_HOOKS.ALERT_ACTION_NOTE_AUTHORED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
