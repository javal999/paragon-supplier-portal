// ────────────────────────────────────────────────────────────────────────────
// UCX-P7 (BL-368) · UCX-D22, UCX-D29 — THE PO ESCALATION RECORD.
//
// One append-only record per act PTI takes on an escalated PO: the ask ("Ask
// the supplier to confirm") and the four decisions UCX-D22 rules. The entity
// holds ONE state, `Recorded`, like `t_enforcement_set` and `t_role_grant`: the
// row IS the act, and nothing edits it afterwards.
//
// Why not a PO state: `Escalated` is a clock projection over the awaiting
// states (`poResponseProjection.isEscalated`, law 0.5), so the record cannot be
// a state on the PO. The three decisions that END the order's open question
// cascade a PO move (`cascades.js`): Confirmed / Rejected / Closed. "Still
// waiting" records and moves nothing — the supplier still owes an answer, and
// the panel shows the record so the reader sees PTI acted.
//
// `po:escalation` sits in Procurement (UCX-D29). Every verb here needs it.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const poEscalationFlow = {
  entity: 'poEscalation',
  version: 1,
  states: ['Recorded'],
  initial: 'Recorded',
  /** A record is history the moment it is made; a new act is a new row. */
  terminals: ['Recorded'],
  transitions: [
    {
      // PTI asks the supplier to confirm the order (UCX-P7, the mockup's act).
      // It claims no email or WhatsApp effect (BL-26): the planner shares the
      // hub link outside the verb.
      id: 't_po_ask_confirm',
      from: [],
      to: 'Recorded',
      trigger: 'creation',
      requiredRole: 'po:escalation',
      requiredFields: ['poId'],
      policyHooks: [POLICY_HOOKS.PO_ESCALATION_TARGET_AWAITING],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // UCX-D22 (1) — the supplier confirmed outside the hub: the PO is Confirmed.
      id: 't_po_escalation_supplier_confirmed',
      from: [],
      to: 'Recorded',
      trigger: 'creation',
      requiredRole: 'po:escalation',
      requiredFields: ['poId'],
      policyHooks: [POLICY_HOOKS.PO_ESCALATION_TARGET_AWAITING],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // UCX-D22 (2) — PTI sources elsewhere: the PO is Rejected (REQ-E07-02
      // BR-09: the need is sourced another way).
      id: 't_po_escalation_sourcing_elsewhere',
      from: [],
      to: 'Recorded',
      trigger: 'creation',
      requiredRole: 'po:escalation',
      requiredFields: ['poId'],
      policyHooks: [POLICY_HOOKS.PO_ESCALATION_TARGET_AWAITING],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // UCX-D22 (3) — the PO is cancelled in SAP: the hub records the decision
      // and takes the order to Closed. The SAP write itself is outside the hub.
      id: 't_po_escalation_cancelled_in_sap',
      from: [],
      to: 'Recorded',
      trigger: 'creation',
      requiredRole: 'po:escalation',
      requiredFields: ['poId'],
      policyHooks: [POLICY_HOOKS.PO_ESCALATION_TARGET_AWAITING],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // UCX-D22 (4) — PTI decides to wait: the record is made and the PO stays
      // in its awaiting state. No cascade.
      id: 't_po_escalation_still_waiting',
      from: [],
      to: 'Recorded',
      trigger: 'creation',
      requiredRole: 'po:escalation',
      requiredFields: ['poId'],
      policyHooks: [POLICY_HOOKS.PO_ESCALATION_TARGET_AWAITING],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
