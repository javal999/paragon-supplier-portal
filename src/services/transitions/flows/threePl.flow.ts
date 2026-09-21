// ────────────────────────────────────────────────────────────────────────────
// 3PL list flow — BL-51, REQ-E07-04 BR-05 (D-03 decided 2026-09-21).
// THE RECORDING VERB FOR ONE 3PL ON THE ADMINISTRATOR'S LIST.
//
// ── THE PRECEDENT IS `t_enforcement_set` / `t_role_grant`, FOLLOWED ─────────
// A governance act on no document, `statePreserving`, append-only:
//
//   · A DEGENERATE SINGLE-STATE MACHINE. A 3PL on the list has no lifecycle —
//     it has a LEDGER of changes (added, renamed, address changed, offered or
//     no longer offered). `Maintained` is the one state and nothing leaves it.
//   · THE ENTITY IS THE 3PL. `entityId` IS the `tpl-…` id, so the 3PL commanded
//     and the 3PL recorded cannot disagree and every audit event names it.
//     `readState` answers `Maintained` for any well-formed 3PL id — setting an
//     id the list does not hold yet ADDS it — and `null` for anything else, so
//     a malformed id is NOT_FOUND rather than a silently created row.
//   · `applyTransition` APPENDS a change; `setAt` is store-assigned, never a
//     payload field, and `setBy` comes from the session, never from the form.
//
// ── ⚠️ `threepl:maintain` IS A `compliance` ATOM, AND THE REASON IS WHO IS ──
// ── MEASURED BY IT, NOT WHO SEES IT ─────────────────────────────────────────
// The list decides which tracking page a PTI planner is sent to when they check
// whether a supplier's goods are really on the way. A supplier lane cannot hold
// it (a supplier would choose the page that vouches for its own shipment), and
// neither can `planning` or `receiving`, whose deliveries it is read against.
// It sits with the platform's other governance acts (`role:grant`, and the
// working calendar's `calendar:set` on its own branch), and `admin` — the Hub
// administrator seat (ADM, the owner named in BR-05) — holds it by derivation,
// as it holds every lane's atoms. No new lane is minted for it (C10 §4.1).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const threePlFlow: FlowDefinition = {
  entity: 'threePl',
  version: 1,
  // ONE state. A 3PL on the list does not have a lifecycle — it has a ledger.
  states: ['Maintained'],
  initial: 'Maintained',
  /** `t_threepl_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Maintained'],
  transitions: [
    {
      // WIRED (BL-51). The Hub administrator adds a 3PL or changes one: its
      // name, its public tracking address and whether new ASNs are offered it.
      id: 't_threepl_set',
      from: ['Maintained'],
      to: 'Maintained',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'threepl:maintain',
      requiredFields: ['name', 'trackingUrlPattern', 'setBy'],
      policyHooks: [POLICY_HOOKS.THREE_PL_GOVERNED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
