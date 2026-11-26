// ────────────────────────────────────────────────────────────────────────────
// Purchase-order flow (v2.2 Step 3.1 seed machine).
//
// The one flow authored at 3.1: PO is fully unambiguous (no DR-7 dependency) and
// is the target of the Step 3.10 PO-confirm end-to-end proof. It exercises every
// non-clock trigger class — creation (issue), user (view/acknowledge/confirm),
// system (delivery/close) — and carries the `t_po_confirm` transition the proof
// drives (requiredFields qty payload + a registered policy hook).
//
// The remaining 14 machines are authored as their verbs land in Phase 2.2′; this
// file is the pattern they follow. `states` lists TRANSITION-states only —
// `daysOverdue` and any Expiring/Expired display state are read-time projections
// (law 0.5), never members of the transition table.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POStatus } from '../../data/types';
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const purchaseOrderFlow = {
  entity: 'purchaseOrder',
  version: 1,
  states: [
    POStatus.SENT,
    POStatus.VIEWED,
    POStatus.ACKNOWLEDGED,
    POStatus.CONFIRMED,
    POStatus.ADJUSTED,
    POStatus.REJECTED,
    POStatus.PARTIALLY_DELIVERED,
    POStatus.DELIVERED,
    POStatus.CLOSED
  ],
  initial: POStatus.SENT,
  /** PF-0 · D-2 — a closed PO is the end of the order lifecycle. */
  /** REQ-E07-02 — a rejected PO leaves the supplier's hands; PTI sources the
   *  need another way (BR-09 / MN-ORD-14), outside this machine. */
  terminals: [POStatus.CLOSED, POStatus.REJECTED],
  transitions: [
    {
      id: 't_po_issue',
      from: [],
      to: POStatus.SENT,
      trigger: 'creation',
      requiredRole: 'po:issue',
      requiredFields: ['supplierId', 'lineItems'],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'external-fact',
        owner: 's4hana',
        why:
          'A purchase order is raised in S/4HANA and arrives here as a fact. ' +
          'The portal is where a supplier RECEIVES a PO, never where Paragon ' +
          'issues one.'
      },
      version: 1
    },
    {
      id: 't_po_view',
      from: [POStatus.SENT],
      to: POStatus.VIEWED,
      trigger: 'user',
      requiredRole: 'po:view',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      id: 't_po_acknowledge',
      from: [POStatus.SENT, POStatus.VIEWED],
      to: POStatus.ACKNOWLEDGED,
      trigger: 'user',
      requiredRole: 'po:acknowledge',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // The Step 3.10 proof transition. A supplier confirms an actionable PO —
      // legal from any pre-confirm state the "needs action" workspace surfaces
      // (Sent / Viewed / Acknowledged), landing it in Confirmed.
      id: 't_po_confirm',
      from: [POStatus.SENT, POStatus.VIEWED, POStatus.ACKNOWLEDGED],
      to: POStatus.CONFIRMED,
      trigger: 'user',
      requiredRole: 'po:confirm',
      requiredFields: ['confirmedQuantities'],
      policyHooks: [POLICY_HOOKS.PO_CONFIRM_QTY_WITHIN_ORDERED],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // REQ-E07-02 Adjust — the supplier answers with a counter-offer per line:
      // a predefined reason, a quantity (CR-10) and a date. The planner reviews.
      id: 't_po_adjust',
      from: [POStatus.SENT, POStatus.VIEWED, POStatus.ACKNOWLEDGED],
      to: POStatus.ADJUSTED,
      trigger: 'user',
      requiredRole: 'po:adjust',
      requiredFields: ['lineResponses'],
      policyHooks: [POLICY_HOOKS.PO_ADJUST_COUNTER_OFFER_VALID],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // REQ-E07-02 Reject — the supplier cannot meet the date, quantity and/or
      // quality. At least one cause is required (AC-03).
      id: 't_po_reject',
      from: [POStatus.SENT, POStatus.VIEWED, POStatus.ACKNOWLEDGED],
      to: POStatus.REJECTED,
      trigger: 'user',
      requiredRole: 'po:reject',
      requiredFields: ['rejectionCauses'],
      policyHooks: [POLICY_HOOKS.PO_REJECT_CAUSE_GIVEN],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // The planner accepts the counter-offer: the PO is confirmed at the
      // counter-offered quantities and date.
      id: 't_po_accept_counter',
      from: [POStatus.ADJUSTED],
      to: POStatus.CONFIRMED,
      trigger: 'user',
      requiredRole: 'po:review-response',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // The planner does not accept the counter-offer: a comment is required,
      // and the PO reopens for the supplier's response.
      id: 't_po_reject_counter',
      from: [POStatus.ADJUSTED],
      to: POStatus.SENT,
      trigger: 'user',
      requiredRole: 'po:review-response',
      requiredFields: ['reviewComment'],
      policyHooks: [POLICY_HOOKS.PO_COUNTER_REVIEW_COMMENT_AUTHORED],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // UCX-P7 (BL-368) · UCX-D22 — PTI records that the supplier confirmed
      // outside the hub. Cascaded from the escalation record
      // (`t_po_escalation_supplier_confirmed`), never dispatched by a page.
      id: 't_po_escalation_confirm',
      from: [POStatus.SENT, POStatus.VIEWED, POStatus.ACKNOWLEDGED],
      to: POStatus.CONFIRMED,
      trigger: 'cascade',
      requiredRole: 'po:escalation',
      requiredFields: [],
      policyHooks: [],
      // UCX-P7 — a consequence of the record the planner made on the
      // escalation entity (cascade). The planner acted once; this is the move.
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why: 'Cascaded from the escalation record: the planner recorded one decision; this applies it.'
      },
      version: 1
    },
    {
      // UCX-P7 · UCX-D22 — PTI sources the need elsewhere; the order is
      // Rejected (REQ-E07-02 BR-09). Cascaded from the record.
      id: 't_po_escalation_source_elsewhere',
      from: [POStatus.SENT, POStatus.VIEWED, POStatus.ACKNOWLEDGED],
      to: POStatus.REJECTED,
      trigger: 'cascade',
      requiredRole: 'po:escalation',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why: 'Cascaded from the escalation record: the planner recorded one decision; this applies it.'
      },
      version: 1
    },
    {
      // UCX-P7 · UCX-D22 — the order is cancelled in SAP; the hub records the
      // decision and closes it. Cascaded from the record.
      id: 't_po_escalation_cancel',
      from: [POStatus.SENT, POStatus.VIEWED, POStatus.ACKNOWLEDGED],
      to: POStatus.CLOSED,
      trigger: 'cascade',
      requiredRole: 'po:escalation',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why: 'Cascaded from the escalation record: the planner recorded one decision; this applies it.'
      },
      version: 1
    },
    {
      // REQ-E07-05 — the supplier states (and later moves) the expected
      // completion date of a confirmed PO. Records a fact without moving the
      // PO, so it is legal wherever shipping is still under way.
      id: 't_po_shipping_notice',
      from: [POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED],
      to: POStatus.CONFIRMED,
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'po:shipping-notice',
      requiredFields: ['expectedCompletionDate'],
      policyHooks: [POLICY_HOOKS.PO_SHIPPING_NOTICE_DATE_VALID],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      id: 't_po_partial_deliver',
      from: [POStatus.CONFIRMED],
      to: POStatus.PARTIALLY_DELIVERED,
      trigger: 'system',
      requiredRole: 'po:fulfil',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'external-fact',
        owner: 's4hana',
        why:
          'Goods movement is posted in S/4HANA against the PO. Nobody in this ' +
          'portal declares a delivery.'
      },
      version: 1
    },
    {
      id: 't_po_deliver',
      from: [POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED],
      to: POStatus.DELIVERED,
      trigger: 'system',
      requiredRole: 'po:fulfil',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'external-fact',
        owner: 's4hana',
        why:
          'Goods movement is posted in S/4HANA against the PO. Nobody in this ' +
          'portal declares a delivery.'
      },
      version: 1
    },
    {
      id: 't_po_close',
      from: [POStatus.DELIVERED],
      to: POStatus.CLOSED,
      trigger: 'system',
      requiredRole: 'po:close',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'external-fact',
        owner: 's4hana',
        why:
          'A PO closes in S/4HANA once delivery and invoicing reconcile; the ' +
          'portal reads the outcome.'
      },
      version: 1
    }
  ]
};
