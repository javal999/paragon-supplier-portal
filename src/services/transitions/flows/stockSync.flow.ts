// ────────────────────────────────────────────────────────────────────────────
// Supplier API stock sync — REQ-E08-02 BR-03, AC-02.
//
// PTI presses Sync for an API-connected supplier. Each press is one recorded
// attempt, successful or failed, with its time — a failure is a fact the
// planner must see (edge case: show the error and time, keep the previous
// figures, flag them stale), so it is recorded rather than refused. A
// successful attempt appends the supplier's figures as stock submissions on
// the `api` channel.
//
// Degenerate single state, like `inventoryDeclaration`: an attempt is a
// snapshot. Refused only when the supplier is not API-connected.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const stockSyncFlow: FlowDefinition = {
  entity: 'stockSync',
  version: 1,
  states: ['Recorded'],
  initial: 'Recorded',
  /** An attempt is recorded where it rests. */
  terminals: ['Recorded'],
  transitions: [
    {
      id: 't_stocksync_run',
      from: [],
      to: 'Recorded',
      trigger: 'creation',
      requiredRole: 'stocksync:run',
      requiredFields: ['supplierId'],
      policyHooks: [POLICY_HOOKS.STOCK_SYNC_CONNECTED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
