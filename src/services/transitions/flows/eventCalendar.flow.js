// ────────────────────────────────────────────────────────────────────────────
// PSC-4 BR-07 (BL-339) — the Material Buffer's event calendar: the CNY and
// Typhoon windows the Hub administrator (ADM) maintains.
//
// THE PRECEDENT IS `t_calendar_day_set`, FOLLOWED: a degenerate single-state
// ledger, statePreserving, append-only. `entityId` IS the event key
// (`<kind>|<startsOn>`, `eventKey`), so the window a command names and the
// window recorded cannot disagree. `applyTransition` APPENDS; `setAt` (hub
// clock) and `setBy` (the session's actor) are assigned by the target, never
// read from the payload.
//
// ⚠️ **`eventcalendar:set` SITS BESIDE `calendar:set` IN THE `compliance`
// LANE.** A window switches the Material Buffer on, which moves ROP Order for
// every material while it is open — the same "a party may not set the rule it
// is measured by" argument the working calendar carries. `admin` (ADM) holds it
// by derivation; no supplier lane does.
//
// ⚠️ **IT WRITES NO DA VERSION.** A change that moves only ROP Order is
// recorded with the ROP Order figure's stored inputs and rules version
// (DRC-D16) and writes no DA version (PSC-4 BR-10, owner ruling 2026-11-19 Q2).
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const eventCalendarFlow = {
  entity: 'eventCalendar',
  version: 1,
  // ONE state. A calendar window does not have a lifecycle — it has a ledger.
  states: ['Maintained'],
  initial: 'Maintained',
  /** `t_eventcalendar_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Maintained'],
  transitions: [
    {
      id: 't_eventcalendar_set',
      from: ['Maintained'],
      to: 'Maintained',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'eventcalendar:set',
      requiredFields: ['kind', 'startsOn', 'endsOn', 'reason', 'setBy'],
      policyHooks: [POLICY_HOOKS.EVENT_CALENDAR_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
