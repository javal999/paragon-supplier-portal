// ────────────────────────────────────────────────────────────────────────────
// Sourcing type flow — Material G2 (MR-10 BR-06; plan AR-17; MAT-D13).
// THE RECORDING VERB FOR ONE KEY OF THE SOURCING TYPE MAP.
//
// The `t_qualification_rule_set` shape, followed: a governance act,
// `statePreserving`, append-only. A key has a ledger, not a lifecycle, so
// `Defined` is the one state. `entityId` IS the key (`category:Packaging`,
// `pg:101`); there is no key payload field, so the key commanded and the key
// recorded cannot disagree. `setAt` is stamped by the target and `setBy` comes
// from the session, never the form.
//
// ── `sourcingtype:manage` IS A `procurement` ATOM ───────────────────────────
// MR-10 BR-06: Procurement maps each category and purchasing group once. No
// supplier lane (the type decides which level it must hold to bid); `admin`
// holds it by derivation.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const sourcingTypeFlow = {
  entity: 'sourcingType',
  version: 1,
  // ONE state. A key of the map has a ledger, not a lifecycle.
  states: ['Defined'],
  initial: 'Defined',
  /** `t_sourcingtype_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Defined'],
  transitions: [
    {
      // WIRED (Material G2). Procurement sets a category or purchasing group
      // to Direct or Indirect. A published event keeps the type it was
      // published with.
      id: 't_sourcingtype_set',
      from: ['Defined'],
      to: 'Defined',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'sourcingtype:manage',
      requiredFields: ['sourcingType'],
      policyHooks: [POLICY_HOOKS.SOURCING_TYPE_GOVERNED],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
