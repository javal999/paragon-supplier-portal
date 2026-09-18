// ────────────────────────────────────────────────────────────────────────────
// Negotiation round flow — REQ-E03-05 BR-03 / BR-04.
//
// A round is a WINDOW the buyer opens on an RFQ for a shortlist: a deadline, an
// optional message and target, and a best-and-final flag. Rounds repeat, and
// every one of them is kept — so a round is never edited and never reopened;
// asking again is a NEW round, which is how the version history stays a history.
//
// The round does NOT hold the revised quotes. Those are quotation versions
// (`t_quotation_revise`), so a supplier's bid lives in one place whichever round
// produced it, and the buyer's comparison reads one list.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const negotiationRoundFlow: FlowDefinition = {
  entity: 'negotiationRound',
  version: 1,
  states: ['Open', 'Closed'],
  initial: 'Open',
  terminals: ['Closed'],
  transitions: [
    {
      id: 't_negotiationround_open',
      from: [],
      to: 'Open',
      trigger: 'creation',
      requiredRole: 'rfq:negotiate',
      requiredFields: ['rfqId', 'deadline', 'invitedSupplierIds'],
      policyHooks: [POLICY_HOOKS.NEGOTIATION_ROUND_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_negotiationround_close',
      from: ['Open'],
      to: 'Closed',
      trigger: 'user',
      requiredRole: 'rfq:negotiate',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
