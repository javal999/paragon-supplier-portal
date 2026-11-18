// ─────────────────────────────────────────────────────────────────────────────
// PO ON HOLD — PEX-7 (BL-270, BL-272) and PEX-8 (BL-271), [M04 2], [Table],
// owner 2026-11-05 (SC-HUB-PLAN-EXECUTION-REQUIREMENTS-2026-11).
//
// PO On Hold is the part of a supplier × material's open PO quantity that DA
// does not absorb over the horizon:
//
//   PO On Hold = max(0, OSPO − Σ DA not yet called off over the horizon)
//                                                    [Proposed, PEX-D9]
//
// "DA not yet called off" of one horizon week = max(0, DA − call-offs released
// for that week). OSPO is the open PO quantity not yet called off, the figure
// the DA page uses.
//
// The grace period starts on the day a quantity first appears [Proposed] and
// lasts 14 days by default, per supplier × material [Owner, Q7, PEX-D7]. The
// decision (PEX-8) takes effect at its end.
//
// ⚠️ THE GRACE COUNTS CALENDAR DAYS (PSC-6 BR-01, BR-06; PEX-D7 amended
// 2026-11-18, owner). Days 1..graceDays inclusive are in grace and the quantity
// shows In grace; on day graceDays + 1 it moves to PO On Hold. The owner's
// earlier ruling (2026-11-09, PEX-D23) that the grace counted working days on
// the hub calendar is SUPERSEDED FOR THE GRACE ONLY: the no-movement period
// (PEX-7 BR-03) still counts working days on the hub calendar (BL-50).
//
// PURE. No store, no clock: the read model hands in the figures and the day.
// Nothing is decided for a planner here except the pre-selected suggestion
// (PEX-8 BR-02), which the planner can change.
//
// Not built here (PEX-12, Hold — waits on Mba Septi): auto absorb, auto
// carry-over, the thresholds that choose between them, PO cancellation.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { WorkingCalendar } from '@lib/workingCalendar' */
import { isWorkingDay } from '@lib/workingCalendar';
import { hubWorkingCalendar } from './workingCalendarStore';

/**
 * PEX-D7 — 14 days each, per supplier × material, editable (`t_osipparam_set`,
 * keys `grace|<supplier>|<material>` and `noMove|<supplier>|<material>`).
 * PSC-6 BR-01 / PEX-D7 (owner, 2026-11-18): `graceDays` is CALENDAR days;
 * `noMoveDays` stays WORKING days (PEX-7 BR-03, PEX-D23).
 */
export const PO_ON_HOLD_RULES = Object.freeze({
  graceDays: 14,
  noMoveDays: 14
});

/**
 * PEX-8 BR-02 — the three ways out.
 * @typedef {'fsOnly' | 'fsSpread' | 'fg'} PoOnHoldOption
 */

/** @type {readonly PoOnHoldOption[]} */
export const PO_ON_HOLD_OPTIONS = Object.freeze(
  /** @type {PoOnHoldOption[]} */ (['fsOnly', 'fsSpread', 'fg'])
);

/**
 * PEX-7 BR-01 — Σ over the horizon of max(0, DA − called off that week).
 * @param {readonly { readonly da: number; readonly calledOff: number }[]} weeks
 * @returns {number}
 */
export function daNotCalledOff(weeks) {
  return weeks.reduce((n, w) => n + Math.max(0, w.da - w.calledOff), 0);
}

/**
 * PEX-7 BR-01 [Proposed, PEX-D9] — the quantity DA did not absorb.
 * @param {{ readonly ospo: number; readonly daNotCalledOff: number }} f
 * @returns {number}
 */
export const poOnHoldQty = (f) => Math.max(0, f.ospo - f.daNotCalledOff);

/**
 * PEX-7 BR-02 / BR-05 (PSC-6 BR-01, BR-06) — where a line stands against its
 * grace period.
 * `dueDay`:  The first day after the grace period (day `graceDays` + 1, counted
 *            in CALENDAR days from `firstDay`); the decision takes effect on it.
 * `daysLeft`:  Calendar days from `asOf` to `dueDay`, never below 0.
 * `ended`:  The grace period is over on `asOf`.
 *
 * @typedef {{
 *   readonly firstDay: string;
 *   readonly graceDays: number;
 *   readonly dueDay: string;
 *   readonly daysLeft: number;
 *   readonly ended: boolean;
 * }} GraceState
 */

/**
 * Working days after `from` up to and including `to` (both `YYYY-MM-DD`) on the
 * calendar: 0 when `to` is not after `from`.
 * @param {string} from
 * @param {string} to
 * @param {WorkingCalendar} [cal]
 * @returns {number}
 */
export function workingDaysBetween(from, to, cal = hubWorkingCalendar()) {
  let n = 0;
  let d = from;
  while (d < to) {
    d = new Date(Date.parse(`${d}T00:00:00.000Z`) + 86_400_000).toISOString().slice(0, 10);
    if (isWorkingDay(d, cal)) n += 1;
  }
  return n;
}

/**
 * The grace period is `graceDays` CALENDAR days (PSC-6 BR-01, BR-06; owner,
 * 2026-11-18 — supersedes the working-day count of PEX-D23 for the grace; the
 * no-movement period stays on the hub calendar). Days 1..graceDays inclusive are
 * in grace; on day graceDays + 1 the quantity moves to PO On Hold. A first day
 * on a weekend or a hub holiday counts as it falls: a calendar clock, so a
 * calendar ruling by the hub administrator moves no grace end.
 * @param {string} asOf  `YYYY-MM-DD`
 * @param {string} firstDay  The day the quantity first appeared.
 * @param {number} graceDays  Calendar days.
 * @returns {GraceState}
 */
export function graceState(asOf, firstDay, graceDays) {
  // ⚠️ CALENDAR DAYS ON PURPOSE (PSC-6 BR-06). Pinned in
  // `hubCalendarReaders.guard.test.js`'s calendar-day allowlist with this reason.
  const due = new Date(Date.parse(`${firstDay}T00:00:00.000Z`) + graceDays * 86_400_000);
  const dueDay = due.toISOString().slice(0, 10);
  const daysLeft =
    (Date.parse(`${dueDay}T00:00:00.000Z`) - Date.parse(`${asOf}T00:00:00.000Z`)) / 86_400_000;
  return {
    firstDay,
    graceDays,
    dueDay,
    daysLeft: Math.max(0, Math.round(daysLeft)),
    ended: asOf >= dueDay
  };
}

/**
 * PEX-8 BR-03 — FG cap = (Max PTI + min(Max Supplier, SOH Supplier)) − SOH PTI,
 * floored at 0. Null when any of the four is not on record: nothing is guessed.
 * @param {{
 *   readonly maxPti: number | null;
 *   readonly maxSupplier: number | null;
 *   readonly sohSupplier: number | null;
 *   readonly sohPti: number | null;
 * }} f
 * @returns {number | null}
 */
export function fgCap(f) {
  if (f.maxPti === null || f.maxSupplier === null || f.sohSupplier === null || f.sohPti === null)
    return null;
  return Math.max(0, f.maxPti + Math.min(f.maxSupplier, f.sohSupplier) - f.sohPti);
}

/**
 * What the hub knows of one line, for the conditions of PEX-8 BR-02.
 * `pipo`:  True/false when the hub holds the flag; null when it does not.
 * `demand`:  Σ DA over the horizon.
 * `daysSinceMovement`:  Whole WORKING days since the last stock movement; null when none is on record.
 *
 * @typedef {{
 *   readonly pipo: boolean | null;
 *   readonly demand: number;
 *   readonly daysSinceMovement: number | null;
 *   readonly noMoveDays: number;
 *   readonly capKnown?: boolean;
 * }} OptionFacts
 */

/**
 * PEX-8 BR-02 — which options' conditions hold. Every condition must hold.
 *   · FS only:    PIPO material, OR no demand at all.
 *   · FS + spread: demand dropped and is still above 0 [Proposed: "dropped"
 *                  is read as: the line is on hold, so DA no longer absorbs
 *                  the OSPO; "still above 0" is demand > 0].
 *   · FG:         NOT PIPO, AND no demand at all, AND no stock movement for the
 *                 set period. With the PIPO flag or the movement unknown, the
 *                 condition cannot be shown to hold, so FG does not.
 * @param {OptionFacts} f
 * @returns {Readonly<Record<PoOnHoldOption, boolean>>}
 */
export function optionConditions(f) {
  const noDemand = f.demand <= 0;
  const noMovement = f.daysSinceMovement !== null && f.daysSinceMovement >= f.noMoveDays;
  return {
    fsOnly: f.pipo === true || noDemand,
    fsSpread: f.demand > 0,
    // `capKnown` false (Max PTI not on record): FG would absorb nothing, so it is not offered.
    fg: f.pipo === false && noDemand && noMovement && f.capKnown !== false
  };
}

/**
 * PEX-8 BR-02 — the option the hub pre-selects, or null when no condition
 * holds. PEX-D5: PIPO with zero demand → FS only (FG needs not PIPO). Where FS
 * only and FG both hold (not PIPO, no demand, no movement) FG is the one the
 * decision table's AC-02 shows; where movement is recent only FS only holds
 * (AC-03).
 * @param {OptionFacts} f
 * @returns {PoOnHoldOption | null}
 */
export function suggestOption(f) {
  const c = optionConditions(f);
  if (c.fg) return 'fg';
  if (c.fsOnly) return 'fsOnly';
  if (c.fsSpread) return 'fsSpread';
  return null;
}

/**
 * PEX-8 — what the end of the grace period does with the quantity.
 *   · fsOnly:   the whole remainder in one call-off [Proposed, PEX-D3].
 *   · fsSpread: the whole remainder spread over the next weeks' call-offs, following DA.
 *   · fg:       absorbed up to the cap (BR-03); the rest stays on hold (BR-04).
 *               A cap that cannot be computed absorbs nothing: all stays on hold.
 *
 * @typedef {{
 *   readonly option: PoOnHoldOption;
 *   readonly feedstockQty: number;
 *   readonly spreadQty: number;
 *   readonly fgQty: number;
 *   readonly stayOnHoldQty: number;
 *   readonly cap: number | null;
 * }} Outcome
 */

/**
 * @param {PoOnHoldOption} option
 * @param {number} qty  The PO On Hold quantity.
 * @param {number | null} cap  `fgCap`, for the FG option.
 * @returns {Outcome}
 */
export function outcomeOf(option, qty, cap) {
  const none = { option, feedstockQty: 0, spreadQty: 0, fgQty: 0, stayOnHoldQty: 0, cap };
  if (option === 'fsOnly') return { ...none, feedstockQty: qty };
  if (option === 'fsSpread') return { ...none, spreadQty: qty };
  const fg = cap === null ? 0 : Math.min(qty, cap);
  return { ...none, fgQty: fg, stayOnHoldQty: qty - fg };
}

/**
 * PEX-8 BR-05 — one step of a decision's history; append-only. The first two
 * are a person's; `executed` is the system's own act at the end of the grace
 * period (a machine act: no person named, never dressed as unattributed).
 * @typedef {{
 *   readonly kind: 'suggested' | 'chosen';
 *   readonly option: PoOnHoldOption;
 *   readonly at: string;
 *   readonly actor: import('@lib/enforcement').ActorAttribution;
 * } | {
 *   readonly kind: 'executed';
 *   readonly option: PoOnHoldOption;
 *   readonly at: string;
 *   readonly actor: 'system';
 * }} DecisionEvent
 */

/**
 * PEX-8 BR-01, BR-06 — which option stands for a line, and why.
 * The supplier's choice is final. A supplier who has not chosen by the end of
 * the grace period: the planner's suggestion applies, marked "no supplier
 * response" [Proposed, PEX-D14]. With no suggestion either, nothing applies and
 * the line goes back to the planner.
 *
 * `status`:
 *   · `'noSuggestion'`      — the planner has not suggested yet.
 *   · `'awaitingSupplier'`  — suggested; the supplier may still choose.
 *   · `'chosen'`            — the supplier chose (before or after the end).
 *   · `'noSupplierResponse'`— the grace period ended, no choice: the suggestion applies.
 *   · `'backToPlanner'`     — the grace period ended with no suggestion and no choice.
 *
 * @typedef {'noSuggestion' | 'awaitingSupplier' | 'chosen' | 'noSupplierResponse' | 'backToPlanner'} DecisionStatus
 */

/**
 * @param {{
 *   readonly suggested: PoOnHoldOption | null;
 *   readonly chosen: PoOnHoldOption | null;
 *   readonly graceEnded: boolean;
 * }} d
 * @returns {{ readonly status: DecisionStatus; readonly effective: PoOnHoldOption | null }}
 */
export function decisionStanding(d) {
  if (d.chosen !== null) return { status: 'chosen', effective: d.chosen };
  if (d.suggested === null)
    return { status: d.graceEnded ? 'backToPlanner' : 'noSuggestion', effective: null };
  return d.graceEnded
    ? { status: 'noSupplierResponse', effective: d.suggested }
    : { status: 'awaitingSupplier', effective: null };
}

/**
 * Why a suggestion or a choice would be refused, or null when acceptable. The
 * policy hook and the page's form call this one rule.
 * @param {unknown} option
 * @returns {string | null}
 */
export function poOnHoldOptionRefusal(option) {
  return typeof option === 'string' && PO_ON_HOLD_OPTIONS.includes(/** @type {any} */ (option))
    ? null
    : 'PO_ON_HOLD_OPTION_INVALID: FS only, FS + spread or FG is expected';
}
