// ─────────────────────────────────────────────────────────────────────────────
// THE EARLY-DELIVERY WINDOW FOR OTIF AND CFOT — ONE VALUE (BL-66 (4), BL-82).
//
// How many days BEFORE its date a receipt may arrive and still count as on time.
// OTIF (CR-06 matching in `transitions/callOffRules.js`), the Hub CFOT
// (`data/performanceRules.js`) and the engine CFOT (`engine/cfot.js`) all read
// THIS constant, so the two measures can never apply two different early rules.
//
// ⚠️ PROPOSED, NOT DECIDED. The early allowance is BL-56 (PQ-08, the warehouse
// capacity check). Until it is decided, the window is CR-06's existing 7-day
// match window — the only early rule OTIF already applied. When BL-56 sets its
// value, replace the right-hand side below with it; every measure and both
// performance pages follow.
//
// This is NOT the call-off confirmation's early allowance (`callOff.
// earlyAllowanceDays`, placeholder 0 days): that decides whether a confirmed
// EARLIER DATE needs the planner's approval, not whether a receipt counts.
//
// Pure: no clock, no store — the engine imports it and stays portable (X-01).
// ─────────────────────────────────────────────────────────────────────────────

import { MATCH_WINDOW_DAYS } from '../delivery/fulfillment';

/**
 * Days before its date a receipt still counts as on time (OTIF and CFOT alike). PROPOSED until BL-56.
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
