// ────────────────────────────────────────────────────────────────────────────
// RFQ intent flow — the supplier's first answer to an invitation (RFx working
// spec, 2026-09-21, "Supplier response · Intent").
//
// Before a supplier quotes, it says either "I will respond" or declines with a
// reason from the list and words of its own. The buyer reads both on the RFQ's
// side panel, so a silent invitee and a supplier that said no are no longer the
// same row.
//
// TWO CREATION VERBS, one per answer, because the answer IS the born state and
// a creation edge has exactly one `to`. Changing "I will respond" into a
// decline is its own verb (`t_rfqintent_withdraw`), so the trail shows the
// supplier changed its mind rather than overwriting what it first said. The
// state is DERIVED from the record's `intent` field, never stored beside it.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const rfqIntentFlow: FlowDefinition = {
  entity: 'rfqIntent',
  version: 1,
  states: ['Responding', 'Declined'],
  initial: 'Responding',
  terminals: ['Declined'],
  transitions: [
    {
      // "I will respond". The supplier's own verb: the owner resolves from the
      // payload and an uninvited supplier is refused at scope.
      id: 't_rfqintent_respond',
      from: [],
      to: 'Responding',
      trigger: 'creation',
      requiredRole: 'rfqintent:declare',
      requiredFields: ['rfqId', 'supplierId'],
      policyHooks: [POLICY_HOOKS.RFQ_INTENT_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // A decline, with a reason from the list and the supplier's own words.
      id: 't_rfqintent_decline',
      from: [],
      to: 'Declined',
      trigger: 'creation',
      requiredRole: 'rfqintent:declare',
      requiredFields: ['rfqId', 'supplierId', 'reason', 'text'],
      policyHooks: [POLICY_HOOKS.RFQ_INTENT_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // "I will respond" turned into a decline, under the same rule.
      id: 't_rfqintent_withdraw',
      from: ['Responding'],
      to: 'Declined',
      trigger: 'user',
      requiredRole: 'rfqintent:declare',
      requiredFields: ['reason', 'text'],
      policyHooks: [POLICY_HOOKS.RFQ_INTENT_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
