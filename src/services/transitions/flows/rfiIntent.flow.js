// ────────────────────────────────────────────────────────────────────────────
// RFI intent flow — BL-132 (RFx UX S-13, finding F-13): the supplier's first
// answer to an RFI invitation, as the RFQ has it (`rfqIntent.flow.js`).
//
// Before a supplier answers, it says either "I will respond" or declines with
// a reason from the list and words of its own. The buyer reads both on the
// invitee table, so a silent invitee and a supplier that said no are no longer
// the same row.
//
// The RFQ's shape, verb for verb: TWO CREATION VERBS, one per answer, because
// the answer IS the born state; changing "I will respond" into a decline is
// its own verb (`t_rfiintent_withdraw`), allowed until the response is
// submitted; a decline is final. The state is DERIVED from the record's
// `intent` field. A declined supplier's save, submit and revise are refused
// `INTENT_DECLINED` on the response flow (`RFX_RESPONSE_NOT_DECLINED`).
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const rfiIntentFlow = {
  entity: 'rfiIntent',
  version: 1,
  states: ['Responding', 'Declined'],
  initial: 'Responding',
  terminals: ['Declined'],
  transitions: [
    {
      // "I will respond". The supplier's own verb: the owner resolves from the
      // payload and an uninvited supplier is refused at scope.
      id: 't_rfiintent_respond',
      from: [],
      to: 'Responding',
      trigger: 'creation',
      requiredRole: 'rfiintent:declare',
      requiredFields: ['rfiId', 'supplierId'],
      policyHooks: [POLICY_HOOKS.RFX_INTENT_VALID],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // A decline, with a reason from the list and the supplier's own words.
      id: 't_rfiintent_decline',
      from: [],
      to: 'Declined',
      trigger: 'creation',
      requiredRole: 'rfiintent:declare',
      requiredFields: ['rfiId', 'supplierId', 'reason', 'text'],
      policyHooks: [POLICY_HOOKS.RFX_INTENT_VALID],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // "I will respond" turned into a decline, under the same rule.
      id: 't_rfiintent_withdraw',
      from: ['Responding'],
      to: 'Declined',
      trigger: 'user',
      requiredRole: 'rfiintent:declare',
      requiredFields: ['reason', 'text'],
      policyHooks: [POLICY_HOOKS.RFX_INTENT_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
