// ────────────────────────────────────────────────────────────────────────────
// Hub setting flow — BL-32, REQ-E08-05 BR-03, REQUIREMENTS §3.6.
// THE RECORDING VERB FOR ONE RULE VALUE THE HUB ADMINISTRATOR CHANGES.
//
// ── THE PRECEDENT IS `t_calendar_day_set` / `t_threepl_set`, FOLLOWED ───────
// A governance act on no document, `statePreserving`, append-only:
//
//   · A DEGENERATE SINGLE-STATE MACHINE. A rule value has no lifecycle — it has
//     a LEDGER of changes. `Maintained` is the one state and nothing leaves it.
//   · THE ENTITY IS THE KEY. `entityId` IS the setting key (`callOff.overPct`,
//     `stale.override:sup-007|PK-PETB-8801`, …), so the value commanded and the
//     value recorded cannot disagree and every audit event names it.
//     `readState` answers `Maintained` for a key in the registry
//     (`hubSettings.ts`) or a well-formed override of an assigned supplier ×
//     material, and `null` for anything else — a key nobody defined is
//     NOT_FOUND, never a silently created setting.
//   · `applyTransition` APPENDS a change. `previous` and `setAt` are
//     store-assigned, never payload fields; `setBy` comes from the session.
//   · "RESET TO DEFAULT" IS NOT A SECOND VERB. It is this verb writing the
//     default back, so a reset is on the record like any change.
//
// ── ⚠️ ONE VERB WITH TYPED KEYS, NOT ONE FLOW PER PAGE SECTION ──────────────
// Tolerances, deadlines, alert thresholds and stale periods are ONE shape — a
// key and a number (or yes/no) checked against one registry — held by ONE
// authority. The page sections are a reading aid, not an authority boundary:
// a flow per section would repeat the same machine, policy and ledger four
// times and let their refusal vocabularies drift. The TYPE lives in the key
// (the registry's unit, bounds and order rules), and the one policy
// (`SETTING_GOVERNED`) refuses by key. Reason codes are a different shape — a
// list entry with labels and a retired flag — and get their own verb
// (`t_reasoncode_set`).
//
// ── ⚠️ `setting:set` IS A `compliance` ATOM, AND THE REASON IS WHO IS MEASURED
// These values decide what is accepted without a person: a supplier's
// over-delivery, an invoice's price difference, a commitment's shortfall, a
// supplier's award eligibility, when stock counts as stale. The lanes judged
// by them — every supplier lane, and planning, procurement, receiving and
// finance, who decide the exceptions they raise — cannot hold it: a party may
// not set the bar it is measured against or rules under. It sits with the
// platform's other governance acts (`calendar:set`, `threepl:maintain`,
// `role:grant`), and `admin` — the Hub administrator (ADM, who "configures"
// per REQ-E08-05 BR-03) — holds it by derivation. Whether `buyer_all` keeps it
// is BL-70's question, as for the calendar and the 3PL list.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const hubSettingFlow: FlowDefinition = {
  entity: 'hubSetting',
  version: 1,
  // ONE state. A rule value does not have a lifecycle — it has a ledger.
  states: ['Maintained'],
  initial: 'Maintained',
  /** `t_setting_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Maintained'],
  transitions: [
    {
      // WIRED (BL-32). The Hub administrator changes one rule value, or sets it
      // back to its default. `value` is the new value (`null` removes a
      // stale-period override); `setBy` is the attribution it is recorded under.
      id: 't_setting_set',
      from: ['Maintained'],
      to: 'Maintained',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'setting:set',
      // `value` is checked by the policy, not here: the dispatcher's
      // required-field rule would refuse `null`, which is how an override is
      // removed.
      requiredFields: ['setBy'],
      policyHooks: [POLICY_HOOKS.SETTING_GOVERNED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
