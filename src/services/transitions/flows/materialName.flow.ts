// ────────────────────────────────────────────────────────────────────────────
// Supplier trade name flow — Material C2 (MR-3 BR-01 to BR-06; plan AR-20).
//
// A supplier records its own name for a PTI material it supplies; Material
// Planning approves or rejects it. Each submission is a NEW record, so a
// changed name never overwrites the one in use (BR-02):
//
//   submit (supplier) ──► Awaiting approval ──approve──► Approved
//                                          └─reject───► Rejected (reason required)
//   load   (PTI, bulk) ──────────────────────────────► Approved (loadedByPti)
//
// ── `Replaced` IS REACHED BY A CASCADE, NOT BY A PERSON ─────────────────────
// At most one approved name per supplier × material (BR-01): approving or
// loading a name fires `t_materialname_replace` on the earlier approved one.
// A supplier that changes a name still awaiting approval replaces that pending
// one the same way, so a planner never sees two open names for one pair. The
// atom sits in `AUTOMATION_ATOMS` only.
//
// ── THE ATOMS ────────────────────────────────────────────────────────────────
// `materialname:submit` is the supplier's, in `fulfilment` beside the stock it
// declares. `materialname:review` (approve, reject, load) is `planning`'s.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const materialNameFlow: FlowDefinition = {
  entity: 'materialName',
  version: 1,
  states: ['Awaiting approval', 'Approved', 'Rejected', 'Replaced'],
  initial: 'Awaiting approval',
  /** A rejected name is kept as it was; a changed name is a new record. */
  terminals: ['Rejected', 'Replaced'],
  transitions: [
    {
      // The supplier submits its trade name (and, optionally, its own material
      // number) for a material assigned to it.
      id: 't_materialname_submit',
      from: [],
      to: 'Awaiting approval',
      trigger: 'creation',
      requiredRole: 'materialname:submit',
      // `tradeName` is not listed: the hook refuses a missing or blank name as
      // NAME_LENGTH, the code the form shows.
      requiredFields: ['supplierId', 'materialCode'],
      policyHooks: [POLICY_HOOKS.MATERIAL_NAME_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Material Planning approves the name. The earlier approved name, if
      // any, is replaced by cascade.
      id: 't_materialname_approve',
      from: ['Awaiting approval'],
      to: 'Approved',
      trigger: 'user',
      requiredRole: 'materialname:review',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Material Planning rejects the name with a reason the supplier sees.
      // `rejectionReason` is checked by the hook (REASON_REQUIRED), which also
      // refuses a reason of only spaces.
      id: 't_materialname_reject',
      from: ['Awaiting approval'],
      to: 'Rejected',
      trigger: 'user',
      requiredRole: 'materialname:review',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.MATERIAL_NAME_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // PTI loads approved names in bulk (one command per file row), approved
      // on load and marked "Loaded by PTI" (BR-06). A row identical to the
      // approved name in force changes nothing, so loading a file twice is
      // harmless.
      id: 't_materialname_load',
      from: [],
      to: 'Approved',
      trigger: 'creation',
      requiredRole: 'materialname:review',
      requiredFields: ['supplierId', 'materialCode'],
      policyHooks: [POLICY_HOOKS.MATERIAL_NAME_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // CASCADE TARGET of submit, approve and load: the earlier name for the
      // same supplier × material steps aside.
      id: 't_materialname_replace',
      from: ['Awaiting approval', 'Approved'],
      to: 'Replaced',
      trigger: 'cascade',
      requiredRole: 'materialname:replace',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why:
          'A consequence of a newer name for the same supplier and material being ' +
          'approved, loaded or submitted (cascade); at most one approved name per pair.',
      },
      version: 1,
    },
  ],
};
