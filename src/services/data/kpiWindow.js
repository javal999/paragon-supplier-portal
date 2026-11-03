// ─────────────────────────────────────────────────────────────────────────────
// THE EARLY-DELIVERY WINDOW FOR OTIF AND CFOT — ONE VALUE (BL-66 (4), BL-82).
//
// How many days BEFORE its date a receipt may arrive and still count as on time.
// OTIF (CR-06 matching in `transitions/callOffRules.js`), the Hub CFOT
// (`data/performanceRules.js`) and the engine CFOT (`engine/cfot.js`) all read
// THIS constant, so the two measures can never apply two different early rules.
//
// DECIDED for an unconfirmed early receipt (KPI-2, owner 2026-11-02): it counts
// only inside this window, CR-06's 7-day match window. Change the right-hand
// side below and every measure and both performance pages follow.
//
// ⚠️ NOT BUILT: KPI-2 as amended on 2026-11-02 also counts an early receipt on a
// date the Material Planner team confirmed as on time, however early. This file
// still applies the one window to every early receipt, confirmed or not (BL-234).
//
// This is NOT the call-off confirmation's early allowance (`callOff.
// earlyAllowanceDays`, 0 days, decided with BL-56): that decides whether a
// confirmed EARLIER DATE needs the planner's approval, not whether a receipt counts.
//
// Pure: no clock, no store — the engine imports it and stays portable (X-01).
// ─────────────────────────────────────────────────────────────────────────────

import { MATCH_WINDOW_DAYS } from '../delivery/fulfillment';

/**
 * Days before its date an unconfirmed receipt still counts as on time (OTIF and CFOT alike; KPI-2). A confirmed early date is BL-234, not built.
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
