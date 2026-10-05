// ────────────────────────────────────────────────────────────────────────────
// Working-calendar flow — BL-50, REQUIREMENTS §3.4 (Q-18 decided 2026-09-21).
// THE RECORDING VERB FOR A RULING ON ONE DAY OF THE HUB'S CALENDAR.
//
// ── THE PRECEDENT IS `t_enforcement_set`, FOLLOWED RATHER THAN ADAPTED ──────
// A governance act on no document, `statePreserving`, append-only:
//
//   · A DEGENERATE SINGLE-STATE MACHINE. A calendar day does not have a
//     lifecycle — it has a LEDGER of rulings. `Maintained` is the one state and
//     nothing ever leaves it.
//   · THE ENTITY IS THE DATE. `entityId` IS the `YYYY-MM-DD` being ruled on,
//     exactly as enforcement's `entityId` IS the `GovernedCheckId` — so the day
//     commanded and the day recorded cannot disagree, and there is no `date`
//     payload field to disagree with it. `readState` answers `Maintained` for a
//     date the SAP load covers and `null` for anything else, which makes a date
//     outside the loaded calendar `NOT_FOUND` rather than a silently created one.
//   · `applyTransition` APPENDS a ruling; it never writes a state. `setAt` is
//     store-assigned, never a payload field (the `pinnedAt` discipline).
//
// ── ⚠️ WHY THE DEADLINES ARE NOT ON THIS MACHINE — LAW 0.5 ──────────────────
// A ruling moves every open deadline in the hub: PO responses, call-off
// confirmations, forecast commitments. None of that is written here. The
// deadlines are DERIVED AT READ from `hubWorkingCalendar()`, so there is no
// cascade to fan out, nothing to recompute and nothing that can fall out of
// step with the calendar. A late commitment is never a state a clock fired.
//
// ── ⚠️ `calendar:set` IS A `compliance` ATOM, AND THE REASON IS THE DEADLINES
// Whoever sets the calendar moves every deadline the hub measures people by —
// including the planner's own escalations and the supplier's response windows.
// The lanes those deadlines MEASURE (planning, procurement, and every supplier
// lane) therefore cannot hold it: a party may not set the clock it is timed on.
// `compliance` already holds the platform's other governance acts
// (`role:grant`, and `enforcement:set` is ruled to move there), and `admin` —
// the Hub administrator seat (ADM) — holds it by derivation, as it holds every
// lane's atoms. No new lane is minted for it (C10 §4.1).
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const workingCalendarFlow = {
  entity: 'workingCalendar',
  version: 1,
  // ONE state. A calendar day does not have a lifecycle — it has a ledger.
  states: ['Maintained'],
  initial: 'Maintained',
  /** `t_calendar_day_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Maintained'],
  transitions: [
    {
      // WIRED (BL-50). The Hub administrator rules one date working or
      // non-working, with a reason. `kind` is the decision; `reason` is why;
      // `setBy` is the attribution it is recorded under — from the session,
      // never from the form (C10 §6.2).
      id: 't_calendar_day_set',
      from: ['Maintained'],
      to: 'Maintained',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'calendar:set',
      requiredFields: ['kind', 'reason', 'setBy'],
      policyHooks: [POLICY_HOOKS.CALENDAR_DAY_GOVERNED],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
