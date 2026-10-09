import { addDays, daysBetween } from '@services/transitions/inventoryRules';

// ─────────────────────────────────────────────────────────────────────────────
// Buyer Home task severity (SC-01). A task's severity follows from its own
// dates, never from its type:
//
//   urgent-eligible — the oldest line item's deadline is before today, OR the
//                     projected stock-out (today + days of cover) falls before
//                     a reorder placed today could arrive (today + lead time).
//   urgency score   — days the deadline has passed, or days the stock-out
//                     precedes the reorder arrival; the larger when both hold.
//   ranking         — score high to low, then the earliest deadline, then the
//                     task id, so the same data always ranks the same way.
//
// The top URGENT_CAP eligible tasks are `urgent` (red). Eligible tasks below
// the cap are `dueSoonAmber`: genuinely late, capped out of the red slots.
// Everything else is `dueSoonGrey`. The red count is never padded to the cap.
//
// Days are calendar days in Asia/Jakarta, the zone every date on screen uses.
// ─────────────────────────────────────────────────────────────────────────────

export const URGENT_CAP = 3;

/** @typedef {'urgent' | 'dueSoonAmber' | 'dueSoonGrey'} TaskSeverity */

/**
 * One material's cover against its supplier lead time, in days.
 * @typedef {{ readonly daysOfCover: number; readonly leadTimeDays: number }} StockCover
 */

/**
 * `deadlines`:  The deadline of every line item the task counts (ISO date or instant).
 * `stock`:  Cover against lead time for the materials the task counts, when it has any.
 *
 * @typedef {{
 *   readonly id: string;
 *   readonly deadlines: readonly (string | null | undefined)[];
 *   readonly stock?: readonly StockCover[];
 * }} SeverityInput
 */

/**
 * `reason`:  What the detail line names: the passed deadline, or (only when the
 *            deadline has not passed) the cover and lead time. Null when not eligible.
 * `deadline`:  The oldest line item's deadline as a Jakarta day, or null when none is on record.
 * `rank`:  1-based position among the eligible tasks; null when not eligible.
 *
 * @typedef {{
 *   readonly id: string;
 *   readonly severity: TaskSeverity;
 *   readonly eligible: boolean;
 *   readonly score: number;
 *   readonly rank: number | null;
 *   readonly reason: 'deadline' | 'stockOut' | null;
 *   readonly deadline: string | null;
 *   readonly overdueDays: number;
 *   readonly cover: StockCover | null;
 *   readonly stockOutGapDays: number;
 * }} SeverityResult
 */

const JAKARTA_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

/**
 * `YYYY-MM-DD` in Asia/Jakarta; a bare date is already a day. Null when unparseable.
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
function jakartaDay(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : JAKARTA_DAY.format(new Date(ms));
}

/**
 * @param {SeverityInput} task
 * @param {string} today  `YYYY-MM-DD`
 */
function assess(task, today) {
  const days = task.deadlines
    .map(jakartaDay)
    .filter((d) => d !== null)
    .sort();
  const deadline = days[0] ?? null;
  const overdueDays = deadline === null ? 0 : Math.max(0, daysBetween(deadline, today));

  // Stock-out day = today + whole days of cover; reorder arrival = today + lead
  // time. The gap is how many days the stock-out comes first. The material with
  // the widest gap speaks for the task.
  /** @type {StockCover | null} */
  let cover = null;
  let stockOutGapDays = 0;
  for (const s of task.stock ?? []) {
    if (!Number.isFinite(s.daysOfCover) || !(s.leadTimeDays > 0)) continue;
    const stockOut = addDays(today, Math.floor(s.daysOfCover));
    const arrival = addDays(today, s.leadTimeDays);
    const gap = daysBetween(stockOut, arrival);
    if (gap > stockOutGapDays) {
      stockOutGapDays = gap;
      cover = s;
    }
  }

  const deadlinePassed = overdueDays > 0;
  const stockOutFirst = stockOutGapDays > 0;
  return {
    id: task.id,
    eligible: deadlinePassed || stockOutFirst,
    score: Math.max(overdueDays, stockOutGapDays),
    reason: deadlinePassed
      ? /** @type {const} */ ('deadline')
      : stockOutFirst
        ? /** @type {const} */ ('stockOut')
        : null,
    deadline,
    overdueDays,
    cover,
    stockOutGapDays
  };
}

/**
 * The severity of every task, from its own dates and today's date. Pure: no
 * clock, no rendering. Results come back in the order the tasks went in.
 * @param {readonly SeverityInput[]} tasks
 * @param {string} today  An ISO date or instant; read as a Jakarta day.
 * @returns {SeverityResult[]}
 */
export function taskSeverities(tasks, today) {
  const day = jakartaDay(today);
  if (day === null) throw new Error(`taskSeverities: today is not a date (${today})`);
  const assessed = tasks.map((task) => assess(task, day));
  const ranked = assessed
    .filter((a) => a.eligible)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.deadline ?? '9999-12-31').localeCompare(b.deadline ?? '9999-12-31') ||
        a.id.localeCompare(b.id)
    );
  const rankOf = new Map(ranked.map((a, i) => [a.id, i + 1]));
  return assessed.map((a) => {
    const rank = rankOf.get(a.id) ?? null;
    /** @type {TaskSeverity} */
    const severity = rank === null ? 'dueSoonGrey' : rank <= URGENT_CAP ? 'urgent' : 'dueSoonAmber';
    return { ...a, severity, rank };
  });
}
