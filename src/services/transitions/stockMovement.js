// ─────────────────────────────────────────────────────────────────────────────
// STOCK MOVEMENT FOR THE FG OPTION — PEX-7 BR-03, PEX-8 BR-02 [Proposed].
//
// "No stock movement for the set period" is read as: no goods receipt and no
// goods issue POSTED on the material in the last N working days. It is NOT a
// change in the stock balance: a receipt and an issue that cancel out are two
// movements. (Owner away 2026-11-10; the definition awaits Mba Septi.)
//
// What the hub holds to read:
//   · goods receipts posted (the receipt's own date, a posted status);
//   · goods issues: the hub holds NO issue postings. The nearest record is the
//     consumption the planner records per material × week (`consumptionStore`;
//     the SAP goods-issue feed does not exist). A week with consumption above 0
//     counts as a movement on that week's last working day, or today when the
//     week is not over. That is a stand-in, reported as "Needs requirement".
//
// PURE: the caller hands in the dates. Calendar arithmetic is on the hub
// calendar (working days, BL-50).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { WorkingCalendar } from '@lib/workingCalendar' */
import { addWorkingDays, documentInstant } from '@lib/workingCalendar';
import { hubWorkingCalendar } from './workingCalendarStore';

/** Goods receipt statuses that mean the receipt is posted to stock. */
export const POSTED_RECEIPT_STATUSES = Object.freeze([
  'Approved',
  'Partially Approved',
  'Posting to SAP',
  'Posted to SAP'
]);

/**
 * The last working day of the week that starts on `monday`, `YYYY-MM-DD`.
 * @param {string} monday
 * @param {WorkingCalendar} [cal]
 * @returns {string}
 */
export function weekLastWorkingDay(monday, cal = hubWorkingCalendar()) {
  const due = addWorkingDays(documentInstant(monday, cal), 4, cal);
  return new Date(due.getTime() + cal.utcOffsetHours * 3_600_000).toISOString().slice(0, 10);
}

/**
 * The latest movement day on or before `today`, or null when none is on record.
 * @param {{
 *   readonly receiptDays: readonly string[];
 *   readonly consumptionWeeks: readonly string[];
 *   readonly today: string;
 * }} f
 * @param {WorkingCalendar} [cal]
 * @returns {string | null}
 */
export function lastMovementDay(f, cal = hubWorkingCalendar()) {
  const days = [
    ...f.receiptDays.map((d) => d.slice(0, 10)),
    ...f.consumptionWeeks.map((w) => {
      const end = weekLastWorkingDay(w.slice(0, 10), cal);
      return end > f.today ? f.today : end;
    })
  ]
    .filter((d) => d <= f.today && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  return days.length > 0 ? /** @type {string} */ (days[days.length - 1]) : null;
}
