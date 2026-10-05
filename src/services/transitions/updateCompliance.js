// ─────────────────────────────────────────────────────────────────────────────
// UPDATE COMPLIANCE — Material B3. MR-2 BR-01 to BR-03, edge cases 1 to 3.
//
// Pure: the stock records, the sync attempts, the assignments, the mode history
// and the calendar come in as arguments; nothing here reads a clock or a store.
// The weeks are B1's update cycles (`updateCycleFor`), so the stock page, the
// freshness rule and this measure count the SAME weeks.
//
//   · A manual week is compliant when every counted material was updated in
//     the cycle (`cycleStatus`, MR-1 BR-04). One missing material fails it
//     (MAT-D7).
//   · An API week is compliant when every working day of the cycle holds at
//     least one SUCCESSFUL pull. A failed pull is not an update (MR-1 edge
//     case 3; owner ruling 2026-09-29).
//   · Each week is judged by the mode in force at that week's cutoff (edge
//     case 2).
//   · The first 4 cycles after the supplier's first material assignment are
//     not counted, and with fewer than 4 counted weeks the figure is "No
//     history" (null) (BR-03).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { WorkingCalendar } from '@lib/workingCalendar' */
import { isWorkingDay } from '@lib/workingCalendar';
/** @import { StockUpdateMode } from '../data/types' */
/** @import { CycleAssignment, CycleStockRecord, UpdateCycle, UpdateCycleSettings } from './updateCycle' */
import { cycleStatus, inCycle, updateCycleFor } from './updateCycle';

/** MR-2 BR-01 — the rolling window, in update cycles. */
export const COMPLIANCE_WINDOW_WEEKS = 13;
/** MR-2 BR-03 — cycles not counted after the first material assignment. */
export const COMPLIANCE_GRACE_WEEKS = 4;
/** MR-2 BR-03 — fewer counted weeks than this reads "No history". */
export const COMPLIANCE_MIN_COUNTED_WEEKS = 4;

/** @typedef {'compliant' | 'missed' | 'notCounted'} ComplianceWeekState */

/**
 * `mode`:  The supplier's update mode at the cycle's cutoff — the rule the week was judged by.
 *
 * @typedef {{
 *   readonly cycle: UpdateCycle;
 *   readonly state: ComplianceWeekState;
 *   readonly mode: StockUpdateMode;
 * }} ComplianceWeek
 */

/**
 * `pct`:  Weeks compliant ÷ weeks counted, 0–100 (whole number); null reads "No history".
 * `weeks`:  Oldest first, ending with the last completed cycle.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly pct: number | null;
 *   readonly weeks: readonly ComplianceWeek[];
 * }} UpdateCompliance
 */

/** A pull of a supplier's system, as the measure reads it. */
/**
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly at: string;
 *   readonly outcome: 'success' | 'failed';
 * }} ComplianceSyncAttempt
 */

/**
 * `onboardedAt`: When the supplier was onboarded (supplier master). Stands in for the first material assignment when no assignment carries its own date: a supplier is not assigned materials before it is onboarded.
 * `modeAt`:  The supplier's stock update mode at an instant (`stockUpdateModeOf`).
 *
 * @typedef {{
 *   readonly records: readonly CycleStockRecord[];
 *   readonly syncAttempts: readonly ComplianceSyncAttempt[];
 *   readonly assignments: readonly CycleAssignment[];
 *   readonly onboardedAt: (supplierId: string) => string | null;
 *   readonly modeAt: (supplierId: string, atIso: string) => StockUpdateMode;
 *   readonly calendar: WorkingCalendar;
 *   readonly cycle: UpdateCycleSettings;
 * }} ComplianceSources
 */

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/**
 * @param {number} ms
 * @param {WorkingCalendar} calendar
 * @returns {string}
 */
const wallDate = (ms, calendar) =>
  new Date(ms + calendar.utcOffsetHours * HOUR_MS).toISOString().slice(0, 10);

/**
 * @param {string} date
 * @returns {string}
 */
const nextDate = (date) =>
  new Date(Date.parse(`${date}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10);

/**
 * The cycle just before `cycle`.
 * @param {UpdateCycle} cycle
 * @param {WorkingCalendar} calendar
 * @param {UpdateCycleSettings} settings
 * @returns {UpdateCycle}
 */
const previousCycle = (cycle, calendar, settings) =>
  updateCycleFor(cycle.start, calendar, settings);

/**
 * The working days a cycle is judged on: every working day on the hub calendar
 * whose date (in the calendar's zone) falls after the start's date, up to and
 * including the cutoff's date. With the 23:59 cutoff that is exactly the days
 * inside the cycle.
 * @param {UpdateCycle} cycle
 * @param {WorkingCalendar} calendar
 * @returns {string[]}
 */
export function cycleWorkingDays(cycle, calendar) {
  const last = wallDate(Date.parse(cycle.cutoff), calendar);
  /** @type {string[]} */
  const out = [];
  for (let d = nextDate(wallDate(Date.parse(cycle.start), calendar)); d <= last; d = nextDate(d)) {
    if (isWorkingDay(d, calendar)) out.push(d);
  }
  return out;
}

/**
 * The instant of the supplier's first material assignment; null when it has
 * none; -Infinity when an undated assignment has no onboarding date either
 * (assigned before any cycle, as `cycleStatus` reads it).
 * @param {ComplianceSources} sources
 * @param {string} supplierId
 * @returns {number | null}
 */
function firstAssignedAt(sources, supplierId) {
  const own = sources.assignments.filter((a) => a.supplierId === supplierId);
  if (own.length === 0) return null;
  const onboarded = sources.onboardedAt(supplierId);
  const instants = own
    .map((a) => a.assignedAt ?? onboarded)
    .map((d) => (d === null ? -Infinity : Date.parse(d)));
  return Math.min(...instants);
}

/**
 * One cycle judged by the mode at its cutoff (BR-02, edge case 2).
 * @param {ComplianceSources} sources
 * @param {string} supplierId
 * @param {UpdateCycle} cycle
 * @param {number | null} graceEnd
 * @returns {ComplianceWeek}
 */
function judgeWeek(sources, supplierId, cycle, graceEnd) {
  const mode = sources.modeAt(supplierId, cycle.cutoff);
  /** @type {ComplianceWeek} */
  const notCounted = { cycle, state: 'notCounted', mode };
  // No material yet, or inside the grace weeks (BR-03, edge case 1).
  if (graceEnd === null || Date.parse(cycle.cutoff) <= graceEnd) return notCounted;
  const materials = cycleStatus(supplierId, cycle, sources.records, sources.assignments).filter(
    (m) => m.status !== 'notCounted'
  );
  // Every material assigned only part of this cycle is left out (edge case 3).
  if (materials.length === 0) return notCounted;
  if (mode === 'manual') {
    return {
      cycle,
      state: materials.every((m) => m.status === 'updated') ? 'compliant' : 'missed',
      mode
    };
  }
  const pulledOn = new Set(
    sources.syncAttempts
      .filter((a) => a.supplierId === supplierId && a.outcome === 'success' && inCycle(a.at, cycle))
      .map((a) => wallDate(Date.parse(a.at), sources.calendar))
  );
  const days = cycleWorkingDays(cycle, sources.calendar);
  return { cycle, state: days.every((d) => pulledOn.has(d)) ? 'compliant' : 'missed', mode };
}

/**
 * The `weeks` update cycles ending with the last cycle completed at `asOf`, oldest first.
 * @param {string} asOf
 * @param {WorkingCalendar} calendar
 * @param {UpdateCycleSettings} settings
 * @param {number} [weeks]
 * @returns {UpdateCycle[]}
 */
export function complianceCycles(asOf, calendar, settings, weeks = COMPLIANCE_WINDOW_WEEKS) {
  /** @type {UpdateCycle[]} */
  const cycles = [];
  let c = previousCycle(updateCycleFor(asOf, calendar, settings), calendar, settings);
  for (let i = 0; i < weeks; i++) {
    cycles.unshift(c);
    c = previousCycle(c, calendar, settings);
  }
  return cycles;
}

/**
 * MR-2 BR-01 — the supplier's update compliance over the `weeks` update cycles
 * ending with the last cycle completed at `asOf`.
 * @param {ComplianceSources} sources
 * @param {string} supplierId
 * @param {string} asOf
 * @param {number} [weeks]
 * @returns {UpdateCompliance}
 */
export function complianceOver(sources, supplierId, asOf, weeks = COMPLIANCE_WINDOW_WEEKS) {
  const cycles = complianceCycles(asOf, sources.calendar, sources.cycle, weeks);

  // BR-03 — the cycle holding the first assignment is grace week 1; the grace
  // ends at the cutoff of grace week 4.
  const first = firstAssignedAt(sources, supplierId);
  /** @type {number | null} */
  let graceEnd = null;
  if (first !== null) {
    if (first === -Infinity) graceEnd = -Infinity;
    else {
      let g = updateCycleFor(new Date(first), sources.calendar, sources.cycle);
      for (let i = 1; i < COMPLIANCE_GRACE_WEEKS; i++) {
        g = updateCycleFor(new Date(Date.parse(g.cutoff) + 1), sources.calendar, sources.cycle);
      }
      graceEnd = Date.parse(g.cutoff);
    }
  }

  const judged = cycles.map((cycle) => judgeWeek(sources, supplierId, cycle, graceEnd));
  const counted = judged.filter((w) => w.state !== 'notCounted');
  const compliant = counted.filter((w) => w.state === 'compliant').length;
  const pct =
    counted.length < COMPLIANCE_MIN_COUNTED_WEEKS
      ? null
      : Math.round((compliant / counted.length) * 100);
  return { supplierId, pct, weeks: judged };
}

// ── The pill (Material B4; MR-2 step 4, BR-04, BR-06, BR-07) ────────────────

/** How a compliance figure reads beside a bid: plain, amber, red, or "No history". */
/** @typedef {'plain' | 'amber' | 'red' | 'noHistory'} CompliancePill */

/**
 * MR-2 BR-04 — plain at or above `warnPct`, amber below it, red below
 * `flagPct`. "No history" (null) is never coloured (BR-03).
 * @param {number | null} pct
 * @param {{ readonly warnPct: number; readonly flagPct: number }} thresholds
 * @returns {CompliancePill}
 */
export function compliancePill(pct, thresholds) {
  if (pct === null) return 'noHistory';
  if (pct < thresholds.flagPct) return 'red';
  return pct < thresholds.warnPct ? 'amber' : 'plain';
}

/**
 * MR-2 BR-06 — a red-flagged supplier: compliance below `flagPct`. "No
 * history" is never flagged. A flag only asks for a reason; it never blocks
 * (BR-07).
 * @param {number | null} pct
 * @param {number} flagPct
 * @returns {boolean}
 */
export const isComplianceFlagged = (pct, flagPct) => pct !== null && pct < flagPct;
