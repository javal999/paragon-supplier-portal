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
//
// TWO VERBS, ONE ACT (BL-59, BR-03 as amended 2026-09-21): the supplier presses
// Sync on its own Stock page (`t_stocksync_pull`, a supplier fulfilment atom,
// beside `inventorydeclaration:declare`), and a PTI planner can press it on the
// supplier's behalf (`t_stocksync_run`, a planning atom). Same target, same
// store, same connection check — they differ ONLY in the role, exactly as
// `t_inventorydeclaration_declare` / `_record` do. The target's creationOwner
// NAMES the supplier (the payload's own, when it has assignments), so the
// dispatcher's supplier arm admits a supplier pulling ITS OWN stock and
// refuses one naming another supplier.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const stockSyncFlow = {
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
      version: 1
    },
    {
      // BL-59 — the supplier's own Sync button (REQ-E08-02 BR-03, AC-02).
      id: 't_stocksync_pull',
      from: [],
      to: 'Recorded',
      trigger: 'creation',
      requiredRole: 'stocksync:pull',
      requiredFields: ['supplierId'],
      policyHooks: [POLICY_HOOKS.STOCK_SYNC_CONNECTED],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
