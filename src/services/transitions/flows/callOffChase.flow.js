// ────────────────────────────────────────────────────────────────────────────
// Missing-ASN chase — AIB-3 (BL-351), SC-HUB-ASN-INBOUND-REQUIREMENTS-2026-11.
//
// One chase per call-off sent with no ASN. The chase FIRES on its own — one
// working day after the call-off was sent (BR-01, AIB-D6) — so the machine's
// only edge is the planner's closure, with a reason. The state before the first
// working day is derived (`transitions/callOffChase.js`), never stored: a timer
// row would disagree with the calendar the administrator maintains (BL-50).
//
//   Open ──close──▶ Closed
//
// `entityId` is the call-off id. A closed chase never re-opens: the chase fires
// once (BR-01), and a supplier who ships late is a delivery problem (CR-09,
// REQ-E09-04), not a second chase.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const callOffChaseFlow = {
  entity: 'callOffChase',
  version: 1,
  states: ['Open', 'Closed'],
  initial: 'Open',
  /** No verb leaves Closed. */
  terminals: ['Closed'],
  transitions: [
    {
      // AIB-3 BR-01 — the planner closes the chase with a reason of substance.
      id: 't_calloffchase_close',
      from: ['Open'],
      to: 'Closed',
      trigger: 'user',
      requiredRole: 'calloffchase:close',
      requiredFields: ['closeReason'],
      policyHooks: [POLICY_HOOKS.CHASE_CLOSE_REASON_AUTHORED],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
