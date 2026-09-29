// ────────────────────────────────────────────────────────────────────────────
// MRP controller list flow — Material C4 (MR-5 BR-02; plan AR-19).
// THE RECORDING VERB FOR ONE MRP CONTROLLER ON THE ADMINISTRATOR'S LIST.
//
// The `t_threepl_set` shape, followed: a governance act on no document,
// `statePreserving`, append-only. A controller on the list has no lifecycle —
// it has a ledger of changes — so `Maintained` is the one state and nothing
// leaves it. `entityId` IS the SAP code (`P12`); there is no code payload
// field, so the code commanded and the code recorded cannot disagree. `setAt`
// is stamped by the target and `setBy` comes from the session, never the form.
//
// ── `mrpcontroller:manage` IS A `compliance` ATOM ──────────────────────────
// MR-5 BR-02 says the Hub administrator maps each code to hub users. `admin` is
// the derived union of every lane, so the governance acts sit in `compliance`
// and `admin` holds them by derivation. No supplier lane (it would choose who
// it answers to) and not `planning` (the planners the list names).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const mrpControllerFlow: FlowDefinition = {
  entity: 'mrpController',
  version: 1,
  // ONE state. A controller on the list has a ledger, not a lifecycle.
  states: ['Maintained'],
  initial: 'Maintained',
  /** `t_mrpcontroller_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Maintained'],
  transitions: [
    {
      // WIRED (Material C4). The Hub administrator maps an MRP controller code
      // to a name and one or more hub users, or changes that mapping.
      id: 't_mrpcontroller_set',
      from: ['Maintained'],
      to: 'Maintained',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'mrpcontroller:manage',
      requiredFields: ['name', 'userLabels'],
      policyHooks: [POLICY_HOOKS.MRP_CONTROLLER_GOVERNED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
