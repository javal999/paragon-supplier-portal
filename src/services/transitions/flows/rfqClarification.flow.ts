// ────────────────────────────────────────────────────────────────────────────
// RFQ clarification flow — questions during the response window (RFx working
// spec, 2026-09-21, "Supplier response · Clarification Q&A").
//
// An invited supplier asks; the buyer answers from the RFQ side panel and
// chooses who reads the answer: the asker alone (private), or every invitee
// (published) with the asker's identity removed. The visibility rule is a READ
// rule (`rfqResponse.clarificationViewFor`), so no surface can show a question
// to a supplier the rule does not let read it.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const rfqClarificationFlow: FlowDefinition = {
  entity: 'rfqClarification',
  version: 1,
  states: ['Asked', 'Answered'],
  initial: 'Asked',
  terminals: ['Answered'],
  transitions: [
    {
      // The supplier asks. Its own verb, so an uninvited supplier is refused at
      // scope before the question is judged.
      id: 't_rfqclarification_ask',
      from: [],
      to: 'Asked',
      trigger: 'creation',
      requiredRole: 'rfqclarification:ask',
      requiredFields: ['rfqId', 'supplierId', 'question'],
      policyHooks: [POLICY_HOOKS.RFQ_CLARIFICATION_ASKABLE],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // The buyer answers, privately or published to every invitee.
      id: 't_rfqclarification_answer',
      from: ['Asked'],
      to: 'Answered',
      trigger: 'user',
      requiredRole: 'rfqclarification:answer',
      requiredFields: ['answer', 'visibility'],
      policyHooks: [POLICY_HOOKS.RFQ_CLARIFICATION_ANSWERABLE],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
