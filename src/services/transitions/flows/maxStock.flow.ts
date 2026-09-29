// ────────────────────────────────────────────────────────────────────────────
// Maximum stock per supplier × material — REQ-E06-04 BR-06 (owner, 2026-09-29).
//
// THE PRECEDENT IS `t_threepl_set` / `t_reasoncode_set`, FOLLOWED:
//   · A DEGENERATE SINGLE-STATE MACHINE. A maximum stock has no lifecycle; it
//     has a LEDGER of changes (set, changed, cleared).
//   · THE ENTITY IS `<supplierId>|<materialCode>` for a pair the hub assigns.
//     Setting a pair that has no value yet adds one; clearing is `quantity:
//     null`. There is no delete: every change stays on record.
//   · `previous` and `setAt` are store-assigned; `setBy` comes from the session.
//
// ── ⚠️ `maxstock:set` IS A `procurement` ATOM ──────────────────────────────
// The maximum a supplier may hold for PTI is a commercial term agreed with the
// supplier, which is Procurement's subject matter (owner, 2026-09-29). The
// planner reads it on the reconcile and does not set it: the reconcile's
// liability flag is capped by it, and the planner is the one who raises that
// flag. No supplier lane holds it — a supplier may not set the cap on what PTI
// owes it — and the target denies every supplier at SCOPE.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const maxStockFlow: FlowDefinition = {
  entity: 'maxStock',
  version: 1,
  states: ['Maintained'],
  initial: 'Maintained',
  /** `t_maxstock_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Maintained'],
  transitions: [
    {
      // WIRED (REQ-E06-04). Procurement sets, changes or clears the maximum
      // stock of one supplier × material.
      id: 't_maxstock_set',
      from: ['Maintained'],
      to: 'Maintained',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'maxstock:set',
      requiredFields: ['setBy'],
      policyHooks: [POLICY_HOOKS.MAX_STOCK_GOVERNED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
