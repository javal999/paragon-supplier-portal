// ─────────────────────────────────────────────────────────────────────────────
// PSC-4 BR-07 (BL-339) — THE MATERIAL BUFFER'S EVENT CALENDAR: CNY and Typhoon.
//
//   > The event calendar carries CNY and Typhoon; ADM maintains it. The Material
//   > Buffer switches on in the window and off after it; the planner can
//   > override the switch with a reason. The default Typhoon window is 2 weeks
//   > before landfall.                    [PSC-4 BR-07; M2-A17; Q-16; BL-332]
//
// ⚠️ **THIS IS NOT `engine/eventCalendar.js`.** That module is the FORECAST
// INDEX's calendar (payday, double-date, Christmas, Ramadan, pre-Ramadan) — a
// frozen constant estimating demand factors, with CNY deliberately absent
// (DRC-B28 said so until the 2026-11-18 amendment). This one is DATA an
// administrator maintains, and it drives a SWITCH, not a factor. They are kept
// apart on purpose: an index that changes because somebody edited a calendar
// would stop being a constant the forecast was validated against.
//
// A window is a closed range of CALENDAR days [startsOn, endsOn]. A hub week is
// Monday to Sunday and reads "in the window" when any of its days falls inside
// it. The Typhoon form offers LANDFALL, and the window defaults to the 14 days
// before it; the administrator may still set both ends by hand.
//
// Pure: rows in, windows and switch states out. No clock, no store.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays, daysBetween, mondayOf } from '../engine/dates';

/** @typedef {'CNY' | 'Typhoon'} MaterialBufferEventKind */

/** The two event kinds the calendar carries (BR-07). @type {readonly MaterialBufferEventKind[]} */
export const MATERIAL_BUFFER_EVENTS = Object.freeze(
  /** @type {MaterialBufferEventKind[]} */ (['CNY', 'Typhoon'])
);

/** @param {unknown} kind @returns {kind is MaterialBufferEventKind} */
export const isMaterialBufferEvent = (kind) =>
  typeof kind === 'string' && MATERIAL_BUFFER_EVENTS.includes(/** @type {any} */ (kind));

/** The default Typhoon window, in calendar days before landfall (BL-332). */
export const TYPHOON_WINDOW_DAYS = 14;

/** A window none of this rule's bounds refuses: at most this many days. */
export const EVENT_WINDOW_MAX_DAYS = 183;

/**
 * One calendar row, as stored. `id` is the `eventKey` and is the entityId.
 * @typedef {{
 *   readonly id: string;
 *   readonly kind: MaterialBufferEventKind;
 *   readonly startsOn: string;
 *   readonly endsOn: string;
 *   readonly reason: string;
 *   readonly setAt: string;
 *   readonly setBy: import('@lib/enforcement').ActorAttribution;
 * }} CalendarEventRow
 */

/**
 * The event a row supersedes: one window per kind and start day. A new window
 * for the same kind and start REPLACES the earlier row; a different start is a
 * different window, so two CNY windows in one year are both possible.
 * @param {MaterialBufferEventKind} kind
 * @param {string} startsOn  YYYY-MM-DD
 * @returns {string}
 */
export const eventKey = (kind, startsOn) => `${kind}|${startsOn}`;

/**
 * @param {string} key
 * @returns {{ readonly kind: MaterialBufferEventKind; readonly startsOn: string } | null}
 */
export function parseEventKey(key) {
  const [kind, startsOn, ...rest] = key.split('|');
  if (rest.length > 0 || !isMaterialBufferEvent(kind)) return null;
  return isCalendarDate(startsOn) ? { kind, startsOn } : null;
}

/**
 * A real calendar day, written `YYYY-MM-DD`.
 * @param {unknown} day
 * @returns {day is string}
 */
export function isCalendarDate(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day;
}

/**
 * The Typhoon window a landfall day gives by default: the 14 calendar days
 * before it, the landfall day last (BL-332: "2 weeks before landfall").
 * @param {string} landfall  YYYY-MM-DD
 * @returns {{ readonly startsOn: string; readonly endsOn: string }}
 */
export function defaultTyphoonWindow(landfall) {
  return {
    startsOn: addDays(landfall, -TYPHOON_WINDOW_DAYS),
    endsOn: landfall
  };
}

/**
 * Why an event row would be refused, or null. The one predicate the policy hook
 * and the form both call, so the form cannot accept what the verb refuses.
 * @param {{ readonly kind?: unknown; readonly startsOn?: unknown; readonly endsOn?: unknown; readonly reason?: unknown }} event
 * @returns {string | null}
 */
export function eventRefusal(event) {
  if (!isMaterialBufferEvent(event.kind))
    return `EVENT_KIND_INVALID: the kind is ${MATERIAL_BUFFER_EVENTS.join(' or ')}`;
  if (!isCalendarDate(event.startsOn))
    return `EVENT_DATE_INVALID: ${String(event.startsOn)} is not a calendar day (YYYY-MM-DD)`;
  if (!isCalendarDate(event.endsOn))
    return `EVENT_DATE_INVALID: ${String(event.endsOn)} is not a calendar day (YYYY-MM-DD)`;
  if (event.endsOn < event.startsOn)
    return 'EVENT_WINDOW_INVALID: the window ends before it starts';
  if (daysBetween(event.startsOn, event.endsOn) + 1 > EVENT_WINDOW_MAX_DAYS)
    return `EVENT_WINDOW_INVALID: a window is at most ${EVENT_WINDOW_MAX_DAYS} days`;
  if (typeof event.reason !== 'string' || event.reason.trim() === '')
    return 'EVENT_REASON_REQUIRED: say why the window is set';
  return null;
}

/**
 * The Monday of every hub week a window touches: a week counts when any of its
 * seven days is inside [startsOn, endsOn].
 * @param {{ readonly startsOn: string; readonly endsOn: string }} event
 * @returns {readonly string[]}
 */
export function eventWeeks(event) {
  /** @type {string[]} */
  const weeks = [];
  for (let w = mondayOf(event.startsOn); w <= event.endsOn; w = addDays(w, 7)) weeks.push(w);
  return weeks;
}

/**
 * The event covering a hub week (a Monday), or null. The earliest start wins
 * where two overlap, so the answer is stable.
 * @param {readonly CalendarEventRow[]} events
 * @param {string} week  a Monday
 * @returns {CalendarEventRow | null}
 */
export function eventCovering(events, week) {
  const last = addDays(week, 6);
  return (
    [...events]
      .filter((e) => e.startsOn <= last && e.endsOn >= week)
      .sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.kind.localeCompare(b.kind))[0] ??
    null
  );
}

/**
 * `on`: whether the Material Buffer is added for this week.
 * `source`: `override` when the planner's row decided it, `calendar` otherwise.
 * `event`: the window in force for the week, or null outside every window.
 * @typedef {{
 *   readonly on: boolean;
 *   readonly source: 'calendar' | 'override';
 *   readonly event: CalendarEventRow | null;
 * }} MaterialBufferSwitch
 */

/**
 * BR-07 / PEX-13 BR-02 — the switch for one week: the planner's override when
 * one is set (and it stays set until cleared — "the next window does not
 * override the manual choice until it is cleared"), else on inside a window and
 * off outside it.
 * @param {{ readonly events: readonly CalendarEventRow[]; readonly week: string; readonly override: boolean | null }} input
 * @returns {MaterialBufferSwitch}
 */
export function materialBufferSwitch({ events, week, override }) {
  const event = eventCovering(events, week);
  if (typeof override === 'boolean') return { on: override, source: 'override', event };
  return { on: event !== null, source: 'calendar', event };
}
