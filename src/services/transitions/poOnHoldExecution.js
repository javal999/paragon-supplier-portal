// ─────────────────────────────────────────────────────────────────────────────
// PO ON HOLD — THE END-OF-GRACE EXECUTION. PEX-8 BR-02 and BR-05, PEX-10 BR-01.
//
// WHAT THE DOCUMENT DOES NOT SAY, AND THIS FILE DECIDES ON BEST PRACTICE. Every
// choice below is [Proposed] (owner away 2026-11-10; Mba Septi has not
// confirmed how a call-off attaches to a PO line or which need date it takes):
//
//   · A call-off attaches to a PO line the way every call-off does: `poId` and
//     `poLineId`, drawn on the supplier × material's open lines OLDEST FIRST
//     (CAP-9), never beyond a line's remaining balance.
//   · FS only: one call-off of the whole remainder. Confirmation date = the
//     first day after the grace period (the grace-end date); the call-off's
//     need date = the fulfil-by date of PEX-10 (`fulfilmentWindow`: that date +
//     the DRC-6 lead time). A remainder that spans two PO lines is two
//     call-offs, one per line (a call-off names exactly one line).
//   · FS + spread: the remainder is added to the next weeks' call-offs in
//     proportion to DA, never above the room a week has: max(0, DA − EVERY
//     call-off released for it), the ones an earlier "Suggest again" round made
//     too (owner ruling 2026-11-17, "Count them: yes, count earlier rounds"), so
//     a week's call-offs never exceed its DA, across rounds as well. The caller
//     hands in that figure as `calledOff`; the screen's "DA not yet called off"
//     is another reading and leaves the execution call-offs out (see the read
//     model). A week takes the need date of a call-off it ALREADY has; a week
//     with none takes nothing (no date is invented). What does not fit stays on
//     hold and returns to the planner, like the FG remainder (BR-04). A round
//     with no room left places 0 and the remainder stays on hold: rounds are
//     not limited, nothing is refused.
//   · Absorb as FG: absorbed up to the cap (BR-03), recorded on the PO line; no
//     call-off. The rest stays on hold (BR-04). The caller hands in the cap an
//     earlier round has not already used [Proposed, the same reading as the
//     spread room]. With the cap not computable (Max PTI not on record) the
//     execution WAITS rather than absorb 0 for good: it is one-shot, so it must
//     not be spent on missing data.
//
// PURE. No store, no clock: the read model hands in the figures. The calendar
// arithmetic of the grace end is `graceState`'s (working days, BL-50); the only
// calendar-day count here is DRC-6's lead time, inside `fulfilmentWindow`.
// ─────────────────────────────────────────────────────────────────────────────

import { fulfilmentWindow } from './fulfilmentWindow';

/**
 * One PO line a call-off or an absorption can draw on.
 * @typedef {{
 *   readonly poId: string;
 *   readonly poNumber: string;
 *   readonly lineId: string;
 *   readonly balance: number;
 * }} ExecutionLine
 */

/**
 * One horizon week: DA, the call-offs released for it, and the need date of a
 * call-off it already has (the earliest), or null.
 * `calledOff`:  EVERY call-off released for the week, the ones an earlier PO On Hold round made too: the room is DA less this.
 * @typedef {{
 *   readonly week: string;
 *   readonly da: number;
 *   readonly calledOff: number;
 *   readonly needDate: string | null;
 * }} ExecutionWeek
 */

/**
 * `kind`:  `feedstock`: the FS-only call-off; `spread`: added to a week's call-offs.
 * @typedef {{
 *   readonly kind: 'feedstock' | 'spread';
 *   readonly poId: string;
 *   readonly poNumber: string;
 *   readonly lineId: string;
 *   readonly qty: number;
 *   readonly needDate: string;
 *   readonly week: string | null;
 * }} PlannedCallOff
 */

/**
 * @typedef {{
 *   readonly poId: string;
 *   readonly poNumber: string;
 *   readonly lineId: string;
 *   readonly qty: number;
 * }} PlannedAbsorption
 */

/**
 * `blocked`:  Why nothing can run yet: `noLeadTime` (no fulfil-by date) or `noCap` (the FG cap cannot be computed). Null when it can.
 * `confirmedOn`:  The grace-end date: the confirmation date of every call-off.
 * `placedQty`:  What the call-offs or absorptions take.
 * `stayOnHoldQty`:  What is left on hold and goes back to the planner.
 *
 * @typedef {{
 *   readonly option: import('./poOnHold').PoOnHoldOption;
 *   readonly blocked: 'noLeadTime' | 'noCap' | null;
 *   readonly confirmedOn: string;
 *   readonly callOffs: readonly PlannedCallOff[];
 *   readonly absorbed: readonly PlannedAbsorption[];
 *   readonly placedQty: number;
 *   readonly stayOnHoldQty: number;
 * }} ExecutionPlan
 */

/**
 * Draw `qty` on the lines oldest first, each up to its balance. The lines are
 * mutated in `left` (a copy the caller owns) so several draws share balances.
 * @param {{ line: ExecutionLine; left: number }[]} left
 * @param {number} qty
 * @returns {{ line: ExecutionLine; qty: number }[]}
 */
function draw(left, qty) {
  /** @type {{ line: ExecutionLine; qty: number }[]} */
  const out = [];
  let rest = qty;
  for (const l of left) {
    if (rest <= 0) break;
    const take = Math.min(rest, l.left);
    if (take <= 0) continue;
    l.left -= take;
    rest -= take;
    out.push({ line: l.line, qty: take });
  }
  return out;
}

/**
 * Spread `qty` over the weeks in proportion to DA, each week capped at its
 * "DA not yet called off". Whole units; a week without a call-off to take its
 * need date from takes nothing.
 * @param {readonly ExecutionWeek[]} weeks
 * @param {number} qty
 * @returns {{ week: ExecutionWeek; qty: number }[]}
 */
export function spreadAcrossWeeks(weeks, qty) {
  const eligible = weeks
    .filter((w) => w.needDate !== null && w.da > 0 && w.da - w.calledOff >= 1)
    .map((w) => ({ week: w, room: Math.floor(w.da - w.calledOff), given: 0 }));
  let left = Math.floor(qty);
  let active = eligible.slice();
  while (left > 0 && active.length > 0) {
    const total = active.reduce((n, a) => n + a.week.da, 0);
    let given = 0;
    for (const a of active) {
      const g = Math.min(Math.floor((left * a.week.da) / total), a.room - a.given);
      a.given += g;
      given += g;
    }
    if (given === 0) {
      // Less than a unit each: hand out the last units one at a time, in week order.
      for (const a of active) {
        if (left - given <= 0) break;
        if (a.room - a.given >= 1) {
          a.given += 1;
          given += 1;
        }
      }
    }
    if (given === 0) break;
    left -= given;
    active = active.filter((a) => a.room - a.given >= 1);
  }
  return eligible.filter((a) => a.given > 0).map((a) => ({ week: a.week, qty: a.given }));
}

/**
 * PEX-8 BR-02, BR-05 — what the end of the grace period does with a line, as a
 * plan. Nothing is written here; the caller writes the plan, or shows it.
 * @param {{
 *   readonly option: import('./poOnHold').PoOnHoldOption;
 *   readonly qty: number;
 *   readonly cap: number | null;
 *   readonly graceEndDay: string;
 *   readonly leadTimeDays: number | null | undefined;
 *   readonly lines: readonly ExecutionLine[];
 *   readonly weeks: readonly ExecutionWeek[];
 * }} f
 * @returns {ExecutionPlan}
 */
export function planExecution(f) {
  const left = f.lines.map((line) => ({ line, left: line.balance }));
  /** @type {Omit<ExecutionPlan, 'placedQty' | 'stayOnHoldQty'>} */
  const base = {
    option: f.option,
    blocked: null,
    confirmedOn: f.graceEndDay,
    callOffs: [],
    absorbed: []
  };
  /** @param {Omit<ExecutionPlan, 'placedQty' | 'stayOnHoldQty'>} p */
  const done = (p) => {
    const placed =
      p.callOffs.reduce((n, c) => n + c.qty, 0) + p.absorbed.reduce((n, a) => n + a.qty, 0);
    return { ...p, placedQty: placed, stayOnHoldQty: Math.max(0, f.qty - placed) };
  };

  if (f.option === 'fsOnly') {
    const window = fulfilmentWindow(f.graceEndDay, f.leadTimeDays);
    if (!window) return done({ ...base, blocked: 'noLeadTime' });
    return done({
      ...base,
      callOffs: draw(left, f.qty).map((d) => ({
        kind: /** @type {const} */ ('feedstock'),
        poId: d.line.poId,
        poNumber: d.line.poNumber,
        lineId: d.line.lineId,
        qty: d.qty,
        needDate: window.by,
        week: null
      }))
    });
  }

  if (f.option === 'fsSpread') {
    /** @type {PlannedCallOff[]} */
    const callOffs = [];
    for (const s of spreadAcrossWeeks(f.weeks, f.qty))
      for (const d of draw(left, s.qty))
        callOffs.push({
          kind: 'spread',
          poId: d.line.poId,
          poNumber: d.line.poNumber,
          lineId: d.line.lineId,
          qty: d.qty,
          needDate: /** @type {string} */ (s.week.needDate),
          week: s.week.week
        });
    return done({ ...base, callOffs });
  }

  if (f.cap === null) return done({ ...base, blocked: 'noCap' });
  return done({
    ...base,
    absorbed: draw(left, Math.min(f.qty, f.cap)).map((d) => ({
      poId: d.line.poId,
      poNumber: d.line.poNumber,
      lineId: d.line.lineId,
      qty: d.qty
    }))
  });
}

/**
 * A round with no room left: an FS + spread or FG plan that places nothing
 * though a remainder is on hold, and is not waiting for a missing fact. No week
 * can take another call-off (each is at its DA, earlier rounds counted, or none
 * has a call-off to take a need date from), or the FG cap is used up. The round
 * still runs: it places 0 and the remainder stays on hold. FS only has no room
 * to run out of: it places the whole remainder, or waits for a lead time.
 * @param {Pick<ExecutionPlan, 'option' | 'blocked' | 'placedQty' | 'stayOnHoldQty'>} plan
 * @returns {boolean}
 */
export function planHasNoRoom(plan) {
  return (
    plan.blocked === null &&
    plan.option !== 'fsOnly' &&
    plan.placedQty === 0 &&
    plan.stayOnHoldQty > 0
  );
}

/**
 * BL-323 — the room each option has left on a line, before the planner sends a
 * round: the plan that option would run, judged by `planHasNoRoom`. The picker
 * shows the line against this and the preview shows it against `planHasNoRoom`
 * of the stored plan, so the two cannot disagree. FS only comes back false by
 * the predicate's own rule (it places the whole remainder, or waits for a lead
 * time); a missing fact comes back false too — that is `blocked`, not "no room".
 * @param {{
 *   readonly qty: number;
 *   readonly cap: number | null;
 *   readonly graceEndDay: string;
 *   readonly leadTimeDays: number | null | undefined;
 *   readonly lines: readonly ExecutionLine[];
 *   readonly weeks: readonly ExecutionWeek[];
 * }} f  Everything a plan needs except the option.
 * @returns {Readonly<Record<import('./poOnHold').PoOnHoldOption, boolean>>}
 */
export function noRoomByOption(f) {
  /** @param {import('./poOnHold').PoOnHoldOption} option */
  const of = (option) => planHasNoRoom(planExecution({ ...f, option }));
  return { fsOnly: of('fsOnly'), fsSpread: of('fsSpread'), fg: of('fg') };
}

/**
 * The idempotency key of one PO line's execution: a second run finds it and
 * does nothing. One decision is one supplier × material × grace episode.
 * @param {string} decisionId
 * @param {string} poLineId
 * @returns {string}
 */
export const executionKey = (decisionId, poLineId) => `${decisionId}|${poLineId}`;

/**
 * Where a line stands against its execution: `scheduled` (grace running),
 * `due` (grace ended, nothing run yet), `blocked` (due, but a fact is missing),
 * `executed`.
 * @param {{
 *   readonly executed: boolean;
 *   readonly graceEnded: boolean;
 *   readonly blocked: 'noLeadTime' | 'noCap' | null;
 * }} s
 * @returns {'scheduled' | 'due' | 'blocked' | 'executed'}
 */
export function executionStanding(s) {
  if (s.executed) return 'executed';
  if (!s.graceEnded) return 'scheduled';
  return s.blocked ? 'blocked' : 'due';
}
