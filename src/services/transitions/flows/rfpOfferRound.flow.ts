// ────────────────────────────────────────────────────────────────────────────
// RFP firm-offer round flow — NR-2 BR-02 (decision D-1, option A).
//
// A round is a WINDOW the buyer opens on a Closed RFP: the options and quantity
// points it wants FIRM prices for, the suppliers asked, a deadline and an
// optional message. Rounds repeat and every one is kept, so a round is never
// edited and never reopened; asking again is a NEW round.
//
// ⚠️ **A NEW MACHINE BESIDE `negotiationRound`, NOT A GENERALISATION OF IT.**
// That round is keyed by an RFQ and re-prices quotes per item and break; this
// one prices RFP options at quantity points. The RFQ round stays untouched.
//
// The round does NOT hold the offers. Those are `rfpFirmOffer` rows, one per
// supplier per round, each keeping every version it was sent in.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const rfpOfferRoundFlow: FlowDefinition = {
  entity: 'rfpOfferRound',
  version: 1,
  states: ['Open', 'Closed'],
  initial: 'Open',
  terminals: ['Closed'],
  transitions: [
    {
      id: 't_rfp_round_open',
      from: [],
      to: 'Open',
      trigger: 'creation',
      requiredRole: 'rfp:negotiate',
      requiredFields: ['rfpId', 'optionIds', 'quantityPoints', 'invitedSupplierIds', 'deadline'],
      policyHooks: [POLICY_HOOKS.RFP_OFFER_ROUND_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // The buyer stops taking firm offers, before the deadline or after it.
      id: 't_rfp_round_close',
      from: ['Open'],
      to: 'Closed',
      trigger: 'user',
      requiredRole: 'rfp:negotiate',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
