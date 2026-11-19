// ────────────────────────────────────────────────────────────────────────────
// PSC-4 (BL-339) — the read side of model A's buffers, shared by the Demand
// anticipation read and the Safety stock targets read, so one material's cover
// setting and switch are read ONE way.
//
//   · `coverWeeksFor` — the Protection cover setting P (`coverWeeks` on the
//     OSIP ledger), default 4 weeks (owner 2026-11-19).
//   · `coverageWeeksFor` — the Material Buffer's own coverage weeks
//     (`coverageWeeks`), default 2 weeks (same ruling).
//   · `materialBufferSwitchFor` — BR-07's switch for one hub week: the
//     planner's override when one is set (it persists until cleared), else the
//     event calendar's window.
//   · `bufferModelAFor` — the four figures for one supplier × material.
//
// No clock is read here; the caller passes the planning week.
// ────────────────────────────────────────────────────────────────────────────

/** @import { MaterialBufferSwitch } from '../../transitions/eventCalendarRules' */
import { materialBufferSwitch, eventCovering } from '../../transitions/eventCalendarRules';
import {
  COVERAGE_WEEKS_DEFAULT,
  COVER_WEEKS_DEFAULT,
  bufferModelA
} from '../../transitions/bufferModelA';
/** @import { BufferModelA } from '../../transitions/bufferModelA' */
import { osipParamKey } from '../../transitions/osipParams';
import { osipParamStore } from './stores/osipParamStore';
import { eventCalendarStore } from '../../transitions/eventCalendarStore';

/**
 * The material's cover setting P, in weeks; the default when none is set.
 * @param {string} materialCode
 * @returns {number}
 */
export function coverWeeksFor(materialCode) {
  const v = osipParamStore.valueOf(osipParamKey('coverWeeks', { materialCode }));
  return typeof v === 'number' ? v : COVER_WEEKS_DEFAULT;
}

/**
 * The material's Material Buffer coverage weeks; the default when none is set.
 * @param {string} materialCode
 * @returns {number}
 */
export function coverageWeeksFor(materialCode) {
  const v = osipParamStore.valueOf(osipParamKey('coverageWeeks', { materialCode }));
  return typeof v === 'number' ? v : COVERAGE_WEEKS_DEFAULT;
}

/**
 * BR-07 — the Material Buffer switch for one hub week (a Monday). The
 * planner's override, when one is set, decides it alone; otherwise the event
 * calendar's window does.
 * @param {string} materialCode
 * @param {string} week  a Monday
 * @returns {MaterialBufferSwitch}
 */
export function materialBufferSwitchFor(materialCode, week) {
  const v = osipParamStore.valueOf(osipParamKey('materialBufferOn', { materialCode }));
  return materialBufferSwitch({
    events: eventCalendarStore.inForce(),
    week,
    override: typeof v === 'boolean' ? v : null
  });
}

/**
 * The event in force for a week, or null — the page's "event window" line.
 * @param {string} week  a Monday
 * @returns {import('../../transitions/eventCalendarRules').CalendarEventRow | null}
 */
export const eventWindowFor = (week) => eventCovering(eventCalendarStore.inForce(), week);

/**
 * PSC-4 BR-03 to BR-07 — one supplier × material's buffers at one week.
 * `ltpB` / `ltpFestive` null: the series is not uploaded, so the buffer it
 * feeds reads "Not available" and adds nothing (BR-08).
 * @param {{
 *   readonly materialCode: string;
 *   readonly week: string;
 *   readonly ltpA: readonly number[];
 *   readonly ltpB: readonly (number | null)[] | null;
 *   readonly ltpFestive: readonly (number | null)[] | null;
 *   readonly leadTimeWeeks: number | null;
 * }} input
 * @returns {BufferModelA}
 */
export function bufferModelAFor({ materialCode, week, ltpA, ltpB, ltpFestive, leadTimeWeeks }) {
  return bufferModelA({
    ltpA,
    ltpB,
    ltpFestive,
    leadTimeWeeks,
    coverWeeks: coverWeeksFor(materialCode),
    coverageWeeks: coverageWeeksFor(materialCode),
    materialOn: materialBufferSwitchFor(materialCode, week).on
  });
}
