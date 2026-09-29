// ────────────────────────────────────────────────────────────────────────────
// Qualification rule flow — Material G1 (MR-10 BR-04; MAT-D15; plan AD-8).
// THE RECORDING VERB FOR THE DOCUMENTS ONE QUALIFICATION LEVEL REQUIRES.
//
// The `t_threepl_set` shape, followed: a governance act, `statePreserving`,
// append-only. A level's list has no lifecycle — it has a ledger of changes —
// so `Defined` is the one state and nothing leaves it. `entityId` IS the level
// (`approved` | `preferred`); there is no level payload field, so the list
// commanded and the list recorded cannot disagree. `setAt` is stamped by the
// target and `setBy` comes from the session, never from the form.
//
// ── `qualification:manage` IS A `compliance` ATOM ──────────────────────────
// The lists decide which vendors may bid on which events (MR-10 BR-05), so no
// supplier lane (it would pick the documents it is judged by) and not
// `procurement` (which sources from the vendors the lists admit) may hold it.
// It sits with the lane that verifies the documents the lists name — Quality,
// the `compliance` lane (MAT-D6) — and `admin` holds it by derivation.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const qualificationRuleFlow: FlowDefinition = {
  entity: 'qualificationRule',
  version: 1,
  // ONE state. A level's list has a ledger, not a lifecycle.
  states: ['Defined'],
  initial: 'Defined',
  /** `t_qualification_rule_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Defined'],
  transitions: [
    {
      // WIRED (Material G1). Procurement and Quality set the documents a level
      // requires; the Preferred list always includes every Approved document.
      id: 't_qualification_rule_set',
      from: ['Defined'],
      to: 'Defined',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'qualification:manage',
      requiredFields: ['requiredDocs'],
      policyHooks: [POLICY_HOOKS.QUALIFICATION_RULE_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
