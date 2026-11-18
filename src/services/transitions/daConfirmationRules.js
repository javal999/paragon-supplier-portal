// ────────────────────────────────────────────────────────────────────────────
// PSC-1 (BL-336) — THE ONE-TIME WEEKLY CONFIRMATION ON THE DA PAGE.
//
// Both Zone Liability and the demand anticipation are published on Friday from
// one publication (PSC-1 BR-01). The supplier confirms that publication by
// 23:59 WIB on the Wednesday after it (BR-02), while NEW STOCK DATA uses the
// Thursday 23:59 cutoff the stock update already counts (BR-03, REQ-E08-02
// BR-14). The first cycle is confirmed explicitly; later weeks carry the last
// confirmation forward, and a week with no submit is recorded as "carried
// forward" — derived from the records, never written (BR-04, BR-05).
//
// Pure: every function takes the instant, the calendar and the values it
// reasons about. Nothing here reads a clock or a store, so the page, the
// target's policy hook and the read model agree.
//
// ⚠️ THE DEADLINE ARITHMETIC IS THE HUB CALENDAR'S (BL-50). `isWorkingDay`
// always receives the calendar, and no day constant from
// `hubCalendarReaders.guard` is used here: the one weekday shift is local, the
// same shape `updateCycle.js` uses for the stock cutoff. A non-working
// publication day moves the deadline by the same count, and a non-working
// Wednesday moves it back to the last working day before it — the precedent
// MR-1 BR-03 set for the Thursday cutoff.
// ────────────────────────────────────────────────────────────────────────────

/** @import { WorkingCalendar } from '@lib/workingCalendar' */
import { isWorkingDay } from '@lib/workingCalendar';
import { updateCycleFor } from './updateCycle';
/** @import { UpdateCycleSettings } from './updateCycle' */

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/**
 * PSC-1 BR-02 / BR-03 — the two clock times, on the hub's zone.
 * `confirmationTime` is the Wednesday 23:59 WIB the confirmation is due;
 * `stockCutoffTime` is the Thursday 23:59 the stock update already counts.
 */
export const DA_CONFIRMATION_RULES = Object.freeze({
  confirmationTime: 23 * 60 + 59,
  stockCutoffTime: 23 * 60 + 59
});

/**
 * @param {string} date `YYYY-MM-DD`
 * @param {number} n
 * @returns {string}
 */
const shiftDate = (date, n) =>
  new Date(Date.parse(`${date}T00:00:00.000Z`) + n * 24 * HOUR_MS).toISOString().slice(0, 10);

/**
 * @param {string} date `YYYY-MM-DD`
 * @returns {number} ISO weekday, Monday = 1
 */
const isoWeekday = (date) => {
  const d = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return d === 0 ? 7 : d;
};

/**
 * The wall-clock day an instant falls on, in the calendar's zone.
 * @param {string} iso
 * @param {WorkingCalendar} calendar
 * @returns {string}
 */
export const daWallDate = (iso, calendar) =>
  new Date(Date.parse(iso) + calendar.utcOffsetHours * HOUR_MS).toISOString().slice(0, 10);

/**
 * The instant of a wall day at a minute of the day, in the calendar's zone.
 * @param {string} date `YYYY-MM-DD`
 * @param {number} minuteOfDay
 * @param {WorkingCalendar} calendar
 * @returns {string}
 */
const instantOf = (date, minuteOfDay, calendar) =>
  new Date(
    Date.parse(`${date}T00:00:00.000Z`) +
      minuteOfDay * MINUTE_MS -
      calendar.utcOffsetHours * HOUR_MS
  ).toISOString();

/**
 * @param {string} date `YYYY-MM-DD`
 * @param {WorkingCalendar} calendar
 * @returns {string} the same day when it is a working day, else the last working day before it
 */
function lastWorkingDayAtOrBefore(date, calendar) {
  let day = date;
  // A calendar with no working day at all would loop for ever; a year is plenty.
  for (let i = 0; i < 366 && !isWorkingDay(day, calendar); i++) day = shiftDate(day, -1);
  return day;
}

/**
 * PSC-1 BR-02 — the confirmation deadline: 23:59 WIB on the Wednesday after
 * the publication. Edge case (BR-02, [Proposed]): a non-working publication day
 * moves the deadline by the same working-day count, and a non-working Wednesday
 * moves it back to the last working day before it. A late publication moves the
 * deadline with its own date, because the deadline is measured from the
 * publication the supplier is confirming.
 * @param {string} publishedAt ISO instant of the publication
 * @param {WorkingCalendar} calendar
 * @returns {string} ISO instant of the deadline
 */
export function daConfirmationDueAt(publishedAt, calendar) {
  const wall = daWallDate(publishedAt, calendar);
  // The publication is a Friday (5). Shift to that Friday's weekday first, so a
  // publication stamped on another day still measures from its own date.
  const fridayShift = (5 - isoWeekday(wall) + 7) % 7;
  const nominalFriday = shiftDate(wall, fridayShift);
  const effectiveFriday = lastWorkingDayAtOrBefore(nominalFriday, calendar);
  // "The same working-day count": however far the publication moved, the
  // Wednesday moves the same distance.
  const movedBy = Math.round(
    (Date.parse(`${nominalFriday}T00:00:00.000Z`) -
      Date.parse(`${effectiveFriday}T00:00:00.000Z`)) /
      (24 * HOUR_MS)
  );
  const nominalWednesday = shiftDate(nominalFriday, 5);
  const movedWednesday = shiftDate(nominalWednesday, -movedBy);
  const effectiveWednesday = lastWorkingDayAtOrBefore(movedWednesday, calendar);
  return instantOf(effectiveWednesday, DA_CONFIRMATION_RULES.confirmationTime, calendar);
}

/**
 * PSC-1 BR-03 — the stock cutoff shown beside the confirmation deadline: the
 * Thursday 23:59 WIB cycle the stock page already counts (MR-1 BR-03 moves it
 * to the last working day before a non-working Thursday).
 * @param {string} nowIso
 * @param {WorkingCalendar} calendar
 * @param {UpdateCycleSettings} settings
 * @returns {string} ISO instant
 */
export const daStockCutoffAt = (nowIso, calendar, settings) =>
  updateCycleFor(nowIso, calendar, settings).cutoff;

/**
 * PSC-1 BR-04 / AC-03 / AC-05 — where a supplier × week stands:
 *   · `notConfirmed` — no confirmation ever, so the first one is due;
 *   · `carriedForward` — no confirm this week, and last week's (or an earlier)
 *     confirmation is in force;
 *   · `confirmed` — this week was submitted with no changed field;
 *   · `changed` — this week was submitted with at least one changed field.
 * @typedef {'notConfirmed' | 'carriedForward' | 'confirmed' | 'changed'} DaConfirmationStatus
 */

/**
 * @param {readonly { readonly supplierId: string; readonly week: string; readonly changedFields?: readonly string[] }[]} records
 * @param {string} supplierId
 * @param {string} week
 * @returns {{ readonly status: DaConfirmationStatus; readonly carriedFromWeek: string | null }}
 */
export function daConfirmationStatus(records, supplierId, week) {
  const own = records.filter((r) => r.supplierId === supplierId);
  const current = own.find((r) => r.week === week);
  if (current) {
    return {
      status: (current.changedFields?.length ?? 0) > 0 ? 'changed' : 'confirmed',
      carriedFromWeek: null
    };
  }
  const earlier = own.filter((r) => r.week < week).sort((a, b) => b.week.localeCompare(a.week));
  return earlier.length > 0
    ? { status: 'carriedForward', carriedFromWeek: earlier[0].week }
    : { status: 'notConfirmed', carriedFromWeek: null };
}

/**
 * The reason a confirmation cannot be recorded, or null. The one rule the
 * page's pre-check and the target's policy hook both call.
 * @param {{
 *   supplierKnown: boolean;
 *   week: unknown;
 *   publicationHolds: boolean;
 *   materials: readonly { materialCode: string; soh: unknown; assigned: boolean }[];
 * }} facts
 * @returns {DaConfirmationRefusal | null}
 */
export function daConfirmationRefusal(facts) {
  if (!facts.supplierKnown) return 'SUPPLIER_UNKNOWN';
  if (typeof facts.week !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(facts.week))
    return 'WEEK_INVALID';
  if (!facts.publicationHolds) return 'NO_PUBLICATION';
  if (facts.materials.length === 0) return 'NO_MATERIALS';
  for (const m of facts.materials) {
    if (!m.assigned) return 'NOT_ASSIGNED';
    if (typeof m.soh !== 'number' || !Number.isFinite(m.soh) || m.soh < 0) return 'SOH_INVALID';
  }
  return null;
}

/** @typedef {'SUPPLIER_UNKNOWN' | 'WEEK_INVALID' | 'NO_PUBLICATION' | 'NO_MATERIALS' | 'NOT_ASSIGNED' | 'SOH_INVALID'} DaConfirmationRefusal */

/**
 * BR-08 — the fields a submission changed against the figures it was
 * pre-filled with. `previous` maps a material code to the figure in force
 * before the submission (the stock record, else the last confirmation).
 * @param {readonly { materialCode: string; soh: number }[]} submitted
 * @param {Readonly<Record<string, number | null>>} previous
 * @returns {string[]}
 */
export function changedSohFields(submitted, previous) {
  return submitted
    .filter((s) => {
      const before = previous[s.materialCode];
      return typeof before === 'number' && before !== s.soh;
    })
    .map((s) => `soh:${s.materialCode}`);
}
