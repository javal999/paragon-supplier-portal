// ─────────────────────────────────────────────────────────────────────────────
// BL-283 — ZONE CAPACITY: CAPACITY LEFT (PEX-1 BR-02 / BR-03, PEX-D22).
//
// A Zone Capacity period stays acknowledge-only (PEX-D22: the supplier types no
// commitment there). Beside the acknowledgement the page shows ONE read-only
// figure, read from the supplier's capacity confirmation, never typed again:
//
//   capacity left = confirmed capacity of the period
//                   − (Zone Liability quantity + other open commitments in it)
//
//   confirmed capacity  the supplier's capacity for the material's PLANNING
//                       GROUP (capacity is confirmed per group, MR-8 BR-04).
//                       Weeks 1–13: the weekly confirmation. Beyond: the
//                       monthly entry (BL-269, `t_capacitymonth_submit`),
//                       spread to days by WORKING days on the hub calendar and
//                       summed over the period's working days [Proposed].
//                       A period with a working day that has no confirmed
//                       capacity is "not confirmed" — null, never 0 [Proposed].
//   used                over the group's materials' lines in the same period:
//                       a Zone Liability line counts PTI's demand (BR-01: the
//                       quantity the supplier is liable for); any other line
//                       counts what the supplier committed to, if anything
//                       [Proposed: the period's own acknowledged demand is not
//                       deducted, because it is not a commitment].
//
// Pure: lines, plans and the calendar in, figures out. Computed at read, never
// stored (law 0.5).
// ─────────────────────────────────────────────────────────────────────────────

import { isWorkingDay } from '../../lib/workingCalendar';
import { addDays, mondayOf } from './inventoryRules';
import { capacityGroupOfMaterial } from './capacityRules';
/** @import { CapacityPlan, ForecastCommitmentLine } from '../data/types' */
/** @import { HeadsUpPlan } from './capacityHeadsUpRules' */
/** @import { WorkingCalendar } from '../../lib/workingCalendar' */
/** @import { MaterialMasterEntry } from '../sdc/types' */

/**
 * The working days of `start`..`end` on the given calendar.
 * @param {string} start YYYY-MM-DD
 * @param {string} end YYYY-MM-DD
 * @param {WorkingCalendar} cal
 * @returns {string[]}
 */
export function workingDaysIn(start, end, cal) {
  /** @type {string[]} */
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) if (isWorkingDay(d, cal)) out.push(d);
  return out;
}

/**
 * @param {string} month YYYY-MM
 * @returns {string} the last day of the month
 */
const lastDayOf = (month) =>
  new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10);

/**
 * The confirmed capacity of one period of a supplier × planning group, or null
 * when any working day of it has no confirmed capacity.
 * @param {{
 *   readonly plan: CapacityPlan;
 *   readonly headsUp: HeadsUpPlan | null;
 *   readonly periodStart: string;
 *   readonly periodEnd: string;
 *   readonly cal: WorkingCalendar;
 * }} input
 * @returns {number | null}
 */
export function confirmedCapacityOfPeriod({ plan, headsUp, periodStart, periodEnd, cal }) {
  const days = workingDaysIn(periodStart, periodEnd, cal);
  if (days.length === 0) return null;
  let total = 0;
  for (const day of days) {
    const monday = mondayOf(day);
    const week = plan.weeks.find((w) => w.week === monday);
    if (week) {
      if (!week.entry) return null;
      total += week.entry.allocated / workingDaysIn(monday, addDays(monday, 6), cal).length;
      continue;
    }
    const month = day.slice(0, 7);
    const entry = headsUp?.months.find((m) => m.month === month && m.source === 'monthly');
    if (!entry || entry.capacity === null) return null;
    total += entry.capacity / workingDaysIn(`${month}-01`, lastDayOf(month), cal).length;
  }
  return Math.round(total);
}

/**
 * What the group's materials already take of one period (see the header).
 * @param {readonly ForecastCommitmentLine[]} lines
 * @param {readonly string[]} materials
 * @param {string} periodBucket
 * @returns {number}
 */
export function usedInPeriod(lines, materials, periodBucket) {
  return lines
    .filter((l) => l.periodBucket === periodBucket && materials.includes(l.materialCode))
    .reduce((n, l) => n + (l.zone === 'firm' ? l.forecastQty : (l.committedQty ?? 0)), 0);
}

/**
 * @typedef {{
 *   readonly confirmed: number | null;
 *   readonly used: number;
 *   readonly left: number | null;
 * }} CapacityLeft
 */

/**
 * The capacity-left figure of one line's period. `left` and `confirmed` are null
 * when no capacity is confirmed (shown as "No capacity confirmed", not a number).
 * @param {ForecastCommitmentLine} line
 * @param {{
 *   readonly lines: readonly ForecastCommitmentLine[];
 *   readonly plans: readonly CapacityPlan[];
 *   readonly headsUp: readonly HeadsUpPlan[];
 *   readonly supplierId: string;
 *   readonly master: (materialCode: string) => MaterialMasterEntry | null;
 *   readonly cal: WorkingCalendar;
 * }} ctx
 * @returns {CapacityLeft}
 */
export function capacityLeftOf(line, { lines, plans, headsUp, supplierId, master, cal }) {
  const group = capacityGroupOfMaterial(plans, supplierId, line.materialCode, master);
  const used = usedInPeriod(lines, group.materials, line.periodBucket);
  if (!group.plan) return { confirmed: null, used, left: null };
  const confirmed = confirmedCapacityOfPeriod({
    plan: group.plan,
    headsUp: headsUp.find((h) => h.planningGroupId === group.planningGroupId) ?? null,
    periodStart: line.periodStart,
    periodEnd: line.periodEnd,
    cal
  });
  return { confirmed, used, left: confirmed === null ? null : confirmed - used };
}
