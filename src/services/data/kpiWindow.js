// ─────────────────────────────────────────────────────────────────────────────
// THE EARLY-DELIVERY WINDOW FOR OTIF AND CFOT — ONE VALUE (BL-66 (4), BL-82).
//
// How many days BEFORE its date a receipt may arrive and still count as on time.
// OTIF (CR-06 matching in `transitions/callOffRules.js`), the Hub CFOT
// (`data/performanceRules.js`) and the engine CFOT (`engine/cfot.js`) all read
// THIS constant, so the two measures can never apply two different early rules.
//
// THE DECIDED RULE (owner, 2026-11-02, KPI-2 amended; BL-234):
//   · an early receipt on a date the Material Planner team CONFIRMED counts as
//     on time in OTIF and CFOT, however early;
//   · an early receipt with NO such confirmation counts only inside this
//     window, CR-06's 7-day match window.
// Change the right-hand side below and every measure and both performance
// pages follow.
//
// HOW A CONFIRMED EARLIER DATE IS RECORDED, AND WHY THIS WINDOW NEVER BITES IT.
// The window is measured back from the date each measure is held to, and a
// planner-confirmed earlier date BECOMES that date:
//   · OTIF — the supplier proposes the earlier date in its call-off
//     confirmation; the early allowance is 0 days (BL-56), so it waits for the
//     planner (CR-05, `approval: 'awaiting'`) and binds once approved
//     (`approval: 'approved'`). `approvedDeliveries` then returns that date,
//     so a receipt on it is 0 days early, not 14.
//   · Hub CFOT — the supplier's counter-offer date binds only once the planner
//     ACCEPTED it (`confirmedLine`, BL-66 (1)); the date then measured is it.
//   · Engine CFOT (`engine/cfot.js`) — the engine data records no planner
//     acceptance, so no confirmed early date exists there and every early
//     receipt keeps the window (stated on the reliability page).
// `kpiAlignment.bl234.test.js` fires the three cases through the real measures.
//
// This is NOT the call-off confirmation's early allowance (`callOff.
// earlyAllowanceDays`, 0 days, decided with BL-56): that decides whether a
// confirmed EARLIER DATE needs the planner's approval, not whether a receipt counts.
//
// Pure: no clock, no store — the engine imports it and stays portable (X-01).
// ─────────────────────────────────────────────────────────────────────────────

import { MATCH_WINDOW_DAYS } from '../delivery/fulfillment';

/**
 * Days before its date an unconfirmed receipt still counts as on time (OTIF and CFOT alike; KPI-2). A planner-confirmed earlier date is the measured date itself, so this never limits it (BL-234).
 * @type {number}
 */
export const EARLY_DELIVERY_WINDOW_DAYS = MATCH_WINDOW_DAYS;

const DAY_MS = 86_400_000;

/**
 * The earliest day (`YYYY-MM-DD`) a receipt may arrive and count for a date.
 * @param {string} date
 * @param {number} [windowDays]
 * @returns {string}
 */
export function earliestCountingDay(date, windowDays = EARLY_DELIVERY_WINDOW_DAYS) {
  return new Date(Date.parse(`${date.slice(0, 10)}T00:00:00.000Z`) - windowDays * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/**
 * Does a receipt on `receivedDate` count as on time for `date` — inside the early window, not after the date?
 * @param {string} receivedDate
 * @param {string} date
 * @param {number} [windowDays]
 * @returns {boolean}
 */
export function receivedOnTimeFor(receivedDate, date, windowDays = EARLY_DELIVERY_WINDOW_DAYS) {
  const day = receivedDate.slice(0, 10);
  return day <= date.slice(0, 10) && day >= earliestCountingDay(date, windowDays);
}
