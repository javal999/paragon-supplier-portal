// ─────────────────────────────────────────────────────────────────────────────
// THE WEEKLY STOCK UPDATE CYCLE AND STALENESS BY MODE — Material B1.
// MR-1 BR-03 to BR-05, edge cases 1 to 5; plan AD-1, AR-07.
//
// Pure: every function takes the instant, the calendar and the setting values
// it reasons about. Nothing here reads a clock or a store, so the stock page
// (B2), the compliance measure (B3) and the freshness rule all count the SAME
// weeks.
//
//   · `updateCycleFor` — the cycle an instant falls in: (previous cutoff,
//     cutoff]. The cutoff is `stockUpdate.cutoffDay` at `stockUpdate.cutoffTime`
//     in the calendar's zone (WIB); when that day is not a working day on the
//     hub calendar (BL-50) it moves to the last working day before it.
//   · `cycleStatus` — per material, updated / missing / not counted this cycle.
//   · `staleAtFor` — the instant a position's figure turns stale, by the
//     supplier's update mode. `stockFreshness` compares `now` with it.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { WorkingCalendar } from '@lib/workingCalendar' */
import { isWorkingDay } from '@lib/workingCalendar';
/** @import { StockUpdateMode } from '../data/types' */
/** @import { StockChannel } from '../sdc/types' */

/** MR-1 BR-03 — the weekly cutoff: ISO weekday (Monday = 1) and minutes after midnight. */
/**
 * @typedef {{
 *   readonly cutoffDay: number;
 *   readonly cutoffTime: number;
 * }} UpdateCycleSettings
 */

/** One update cycle: `start` exclusive, `cutoff` inclusive (ISO instants). */
/**
 * @typedef {{
 *   readonly start: string;
 *   readonly cutoff: string;
 * }} UpdateCycle
 */

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/**
 * @param {string} date
 * @param {number} n
 * @returns {string}
 */
const shiftDate = (date, n) =>
  new Date(Date.parse(`${date}T00:00:00.000Z`) + n * 24 * HOUR_MS).toISOString().slice(0, 10);

/**
 * @param {string} date
 * @returns {number}
 */
const isoWeekday = (date) => {
  const d = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return d === 0 ? 7 : d;
};

/**
 * The cutoff instant (ms) for the week whose nominal cutoff day is `nominal`.
 * @param {string} nominal
 * @param {WorkingCalendar} calendar
 * @param {UpdateCycleSettings} settings
 * @returns {number}
 */
function cutoffMsFor(nominal, calendar, settings) {
  let day = nominal;
  // A calendar with no working day at all would loop for ever; a year is plenty.
  for (let i = 0; i < 366 && !isWorkingDay(day, calendar); i++) day = shiftDate(day, -1);
  return (
    Date.parse(`${day}T00:00:00.000Z`) +
    settings.cutoffTime * MINUTE_MS -
    calendar.utcOffsetHours * HOUR_MS
  );
}

/**
 * MR-1 BR-03 — the update cycle an instant falls in. An instant exactly at the
 * cutoff belongs to that cycle; one second later belongs to the next (edge
 * case 4). A holiday on the cutoff day moves the cutoff to the last working
 * day before it (edge case 5, AC-05).
 * @param {string | Date} date
 * @param {WorkingCalendar} calendar
 * @param {UpdateCycleSettings} settings
 * @returns {UpdateCycle}
 */
export function updateCycleFor(date, calendar, settings) {
  const ms = typeof date === 'string' ? Date.parse(date) : date.getTime();
  const wallDate = new Date(ms + calendar.utcOffsetHours * HOUR_MS).toISOString().slice(0, 10);
  let nominal = shiftDate(wallDate, (settings.cutoffDay - isoWeekday(wallDate) + 7) % 7);
  let cutoff = cutoffMsFor(nominal, calendar, settings);
  while (cutoff < ms) {
    nominal = shiftDate(nominal, 7);
    cutoff = cutoffMsFor(nominal, calendar, settings);
  }
  const start = cutoffMsFor(shiftDate(nominal, -7), calendar, settings);
  return { start: new Date(start).toISOString(), cutoff: new Date(cutoff).toISOString() };
}

/**
 * Is the instant inside the cycle: after its start, at or before its cutoff?
 * @param {string} iso
 * @param {UpdateCycle} cycle
 * @returns {boolean}
 */
export const inCycle = (iso, cycle) => {
  const ms = Date.parse(iso);
  return ms > Date.parse(cycle.start) && ms <= Date.parse(cycle.cutoff);
};

// ── Cycle status per material (MR-1 BR-04, edge case 2) ─────────────────────

/** @typedef {'updated' | 'missing' | 'notCounted'} CycleMaterialStatus */

/** A stock record as the cycle reads it: who, what, when it was accepted, how. */
/**
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly declaredAt: string;
 *   readonly channel?: StockChannel;
 * }} CycleStockRecord
 */

/** A supplier × material assignment. No `assignedAt`: assigned before any cycle. */
/**
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly assignedAt?: string;
 * }} CycleAssignment
 */

/**
 * MR-1 BR-04 — per material assigned to the supplier: `updated` when a stock
 * record for it was accepted inside the cycle, from ANY channel (`manual`,
 * `template`, `api` or `pti` — MAT-D7); `missing` when none was; `notCounted`
 * when the material was assigned during the cycle (edge case 2). A material
 * assigned after the cutoff is not part of the cycle and is left out.
 * @param {string} supplierId
 * @param {UpdateCycle} cycle
 * @param {readonly CycleStockRecord[]} records
 * @param {readonly CycleAssignment[]} assignments
 * @returns {{ readonly materialCode: string; readonly status: CycleMaterialStatus }[]}
 */
export function cycleStatus(supplierId, cycle, records, assignments) {
  const start = Date.parse(cycle.start);
  const cutoff = Date.parse(cycle.cutoff);
  /** @type {{ materialCode: string; status: CycleMaterialStatus }[]} */
  const out = [];
  const seen = /** @type {Set<string>} */ (new Set());
  for (const a of assignments) {
    if (a.supplierId !== supplierId || seen.has(a.materialCode)) continue;
    const assigned = a.assignedAt === undefined ? null : Date.parse(a.assignedAt);
    if (assigned !== null && assigned > cutoff) continue;
    seen.add(a.materialCode);
    if (assigned !== null && assigned > start) {
      out.push({ materialCode: a.materialCode, status: 'notCounted' });
      continue;
    }
    const updated = records.some(
      (r) =>
        r.supplierId === supplierId &&
        r.materialCode === a.materialCode &&
        inCycle(r.declaredAt, cycle)
    );
    out.push({ materialCode: a.materialCode, status: updated ? 'updated' : 'missing' });
  }
  return out;
}

// ── Staleness by mode (MR-1 BR-05, edge cases 1 and 3; AR-07) ───────────────

/**
 * `lastUpdatedAt`:  When the figure on hand was accepted; null when there is none.
 * `mode`:  The supplier's update mode at the START of the current cycle (edge case 1).
 * `lastSuccessfulPullAt`:  The latest successful API pull for the supplier; null when none is on record.
 * `overrideDays`:  The administrator's per supplier × material stale period (BL-32), in days; null when none.
 * `apiHours`:  `stale.apiHours` in force.
 *
 * @typedef {{
 *   readonly lastUpdatedAt: string | null;
 *   readonly mode: StockUpdateMode;
 *   readonly lastSuccessfulPullAt: string | null;
 *   readonly overrideDays: number | null;
 *   readonly calendar: WorkingCalendar;
 *   readonly cycle: UpdateCycleSettings;
 *   readonly apiHours: number;
 * }} StaleAtInputs
 */

/**
 * The instant the figure turns stale (stale when `now` is AFTER it), or null
 * when there is no figure (it is missing, not stale).
 *   · An override (BL-32) wins: that many days after the last update.
 *   · Manual: the figure counts for the cycle it was accepted in and for the
 *     next one; it turns stale when the next cycle's cutoff passes without an
 *     update — "not updated in the last completed cycle" (BR-05, AC-02).
 *   · API: `stale.apiHours` after the last successful pull (MAT-D8). A failed
 *     pull is not an update (edge case 3). With no successful pull on record,
 *     the figure's own acceptance time stands in for it.
 * @param {StaleAtInputs} i
 * @returns {string | null}
 */
export function staleAtFor(i) {
  if (i.lastUpdatedAt === null) return null;
  if (i.overrideDays !== null) {
    return new Date(Date.parse(i.lastUpdatedAt) + i.overrideDays * 24 * HOUR_MS).toISOString();
  }
  if (i.mode === 'api') {
    const base = i.lastSuccessfulPullAt ?? i.lastUpdatedAt;
    return new Date(Date.parse(base) + i.apiHours * HOUR_MS).toISOString();
  }
  const own = updateCycleFor(i.lastUpdatedAt, i.calendar, i.cycle);
  return updateCycleFor(new Date(Date.parse(own.cutoff) + 1), i.calendar, i.cycle).cutoff;
}

// ── The supplier's weekly-update panel and its reminders (Material B2) ──────
// MR-1 d (steps 1 to 4), AC-01. Derived at read from the positions the
// supplier already reads; nothing here is stored (AD-1).

/** A position as the panel reads it: which material, when its figure was last accepted. */
/**
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly lastUpdatedAt: string | null;
 * }} WeeklyUpdateRow
 */

/**
 * `cycle`:  The open cycle: `now` is inside it.
 * `total`:  Materials counted this cycle (edge case 2 leaves some out).
 * `missing`:  Still missing this cycle — the list the panel and the reminder show.
 * `missed`: Missing in the cycle that just closed AND still not updated since: the panel reads "Missed" for these until the supplier sends each one.
 *
 * @typedef {{
 *   readonly cycle: UpdateCycle;
 *   readonly total: number;
 *   readonly updated: readonly string[];
 *   readonly missing: readonly string[];
 *   readonly missed: readonly string[];
 * }} WeeklyUpdateStatus
 */

/**
 * MR-1 BR-04 over the rows the supplier reads. Each row carries the LATEST
 * accepted figure for its material, which is enough: a material is updated in
 * the open cycle exactly when its latest figure falls inside it, and it missed
 * the closed cycle and is still missing exactly when its latest figure is
 * older than the closed cycle's start.
 * @param {string} supplierId
 * @param {readonly WeeklyUpdateRow[]} rows
 * @param {string} nowIso
 * @param {WorkingCalendar} calendar
 * @param {UpdateCycleSettings} settings
 * @returns {WeeklyUpdateStatus}
 */
export function weeklyUpdateStatus(supplierId, rows, nowIso, calendar, settings) {
  const own = rows.filter((r) => r.supplierId === supplierId);
  /** @type {CycleStockRecord[]} */
  const records = own.flatMap((r) =>
    r.lastUpdatedAt === null
      ? []
      : [{ supplierId, materialCode: r.materialCode, declaredAt: r.lastUpdatedAt }]
  );
  /** @type {CycleAssignment[]} */
  const assignments = own.map((r) => ({ supplierId, materialCode: r.materialCode }));
  const cycle = updateCycleFor(nowIso, calendar, settings);
  const closed = updateCycleFor(cycle.start, calendar, settings);
  const open = cycleStatus(supplierId, cycle, records, assignments).filter(
    (s) => s.status !== 'notCounted'
  );
  const before = cycleStatus(supplierId, closed, records, assignments);
  const missing = open.filter((s) => s.status === 'missing').map((s) => s.materialCode);
  return {
    cycle,
    total: open.length,
    updated: open.filter((s) => s.status === 'updated').map((s) => s.materialCode),
    missing,
    missed: before
      .filter((s) => s.status === 'missing' && missing.includes(s.materialCode))
      .map((s) => s.materialCode)
  };
}

/** MR-1 d step 2 — the reminders go out at 09:00 WIB (minutes after midnight). */
export const UPDATE_REMINDER_TIME = 9 * 60;

/**
 * MR-1 d step 2 — the in-hub reminder instants for a cycle: 09:00 on the
 * working day before the cutoff day, and 09:00 on the cutoff day. Both follow
 * the hub calendar, so a holiday cutoff moves them a working day earlier (edge
 * case 5). A reminder that would fall after the cutoff is dropped. Derived,
 * never stored — the same way as the forecast `commitmentReminderAt`.
 * @param {UpdateCycle} cycle
 * @param {WorkingCalendar} calendar
 * @returns {string[]}
 */
export function updateReminderTimes(cycle, calendar) {
  const offsetMs = calendar.utcOffsetHours * HOUR_MS;
  const cutoffMs = Date.parse(cycle.cutoff);
  const cutoffDay = new Date(cutoffMs + offsetMs).toISOString().slice(0, 10);
  let dayBefore = shiftDate(cutoffDay, -1);
  for (let i = 0; i < 366 && !isWorkingDay(dayBefore, calendar); i++)
    dayBefore = shiftDate(dayBefore, -1);
  return [dayBefore, cutoffDay]
    .map((d) => Date.parse(`${d}T00:00:00.000Z`) + UPDATE_REMINDER_TIME * MINUTE_MS - offsetMs)
    .filter((ms) => ms <= cutoffMs)
    .map((ms) => new Date(ms).toISOString());
}

/**
 * The reminder in force at `now`: the latest reminder instant that has come,
 * while the cycle is still open; null before the first one. The pages show it
 * only while materials are still missing.
 * @param {UpdateCycle} cycle
 * @param {string} nowIso
 * @param {WorkingCalendar} calendar
 * @returns {string | null}
 */
export function activeUpdateReminder(cycle, nowIso, calendar) {
  const now = Date.parse(nowIso);
  if (now > Date.parse(cycle.cutoff)) return null;
  const come = updateReminderTimes(cycle, calendar).filter((r) => Date.parse(r) <= now);
  return come.length > 0 ? come[come.length - 1] : null;
}

/**
 * MR-1 BR-01 / d step 2 — an API supplier's next scheduled pull: the last
 * attempt (successful or not — a failed pull retries at the next slot, d step
 * 3) plus `stockSync.intervalHours`. Null when no attempt is on record.
 * @param {string | null} lastAttemptAt
 * @param {number} intervalHours
 * @returns {string | null}
 */
export function nextSyncAt(lastAttemptAt, intervalHours) {
  return lastAttemptAt === null
    ? null
    : new Date(Date.parse(lastAttemptAt) + intervalHours * HOUR_MS).toISOString();
}
