// ────────────────────────────────────────────────────────────────────────────
// RFP firm offer flow — NR-2 BR-01 / BR-03 / BR-04 (decision D-1, option A).
//
// One supplier's firm prices in one firm-offer round: per option and quantity
// point, with the date it holds them until. Only an invited supplier may send
// one, only while the round is open, and it may revise until then. A revision
// APPENDS a version: every version is kept, and the last one is in force.
//
// ONE state. Sending is the creation; revising is state-preserving. Nothing
// ever leaves `Submitted`: what the offer is worth after the round is the
// award's question (D2), not this machine's.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const rfpFirmOfferFlow = {
  entity: 'rfpFirmOffer',
  version: 1,
  states: ['Submitted'],
  initial: 'Submitted',
  /** `t_rfpfirmoffer_revise` is statePreserving, so nothing ever leaves it. */
  terminals: ['Submitted'],
  transitions: [
    {
      // `validUntil` is NOT a required field: its absence is refused by the
      // policy by name (OFFER_VALIDITY_MISSING), beside a validity that lapses
      // before the round deadline.
      id: 't_rfpfirmoffer_submit',
      from: [],
      to: 'Submitted',
      trigger: 'creation',
      requiredRole: 'rfpfirmoffer:submit',
      requiredFields: ['roundId', 'supplierId', 'prices'],
      policyHooks: [POLICY_HOOKS.RFP_FIRM_OFFER_VALID],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      id: 't_rfpfirmoffer_revise',
      from: ['Submitted'],
      to: 'Submitted',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'rfpfirmoffer:submit',
      requiredFields: ['prices'],
      policyHooks: [POLICY_HOOKS.RFP_FIRM_OFFER_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
