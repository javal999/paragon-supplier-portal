// ────────────────────────────────────────────────────────────────────────────
// Supplier access to PTI stock — REQ-E08-03.
//
// The planner grants a supplier access to PTI stock (all the materials it
// supplies, or a chosen list — consignment materials first, BR-04) and removes
// it at any time; the supplier does not approve (BR-02). Both are governed verbs
// on the planning lane, and every change is appended to the supplier's access
// log with the acting user and the time (BR-06).
//
// Two states per supplier, `entityId` IS the supplierId: `NoAccess` (the
// default for every supplier in the inventory model) and `Granted`. A granted
// supplier's material list is changed with `t_stockaccess_change`. Removal takes effect on the
// next read, because the inventory read consults the access store every time
// (edge case).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const stockAccessFlow: FlowDefinition = {
  entity: 'stockAccess',
  version: 1,
  states: ['NoAccess', 'Granted'],
  initial: 'NoAccess',
  /** Access can always be granted again, so no state is an ending. */
  terminals: [],
  transitions: [
    {
      id: 't_stockaccess_grant',
      from: ['NoAccess'],
      to: 'Granted',
      trigger: 'user',
      requiredRole: 'stockaccess:manage',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.STOCK_ACCESS_SCOPE_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Changing the material list of a supplier that already has access. It
      // records a fact without moving the state, so it is statePreserving.
      id: 't_stockaccess_change',
      from: ['Granted'],
      to: 'Granted',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'stockaccess:manage',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.STOCK_ACCESS_SCOPE_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_stockaccess_remove',
      from: ['Granted'],
      to: 'NoAccess',
      trigger: 'user',
      requiredRole: 'stockaccess:manage',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
