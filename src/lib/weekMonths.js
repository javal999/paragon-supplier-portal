import { addDays, mondayOf } from '@services/engine/dates';

// ─────────────────────────────────────────────────────────────────────────────
// WEEKS INTO MONTHS — CAP-2 (BL-171), SC-HUB-CAPACITY-REQUIREMENTS-2026-10 §3.
//
// Pure: no React, no clock. A week is named by its Monday (YYYY-MM-DD).
//
// - BR-02 a week belongs to the month holding at least 4 of its 7 days, which
//   is the month of its Thursday (ISO 8601). The week of Mon 28 Sep 2026 has 3
//   days in September and 4 in October, so it counts in October.
// - BR-03 each metric declares how its weeks combine into a month: `sum`
//   (flows), `last` (levels at the end), `first` (levels at the start), `min`,
//   `status` (the worst week and how many weeks hold it) and `distinct`
//   (reasons and events: every distinct value).
// - BR-04 / BR-06 a month knows its weeks, its first and last Monday, and
//   whether it is partial: fewer weeks shown than the month has ISO weeks.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'sum' | 'last' | 'first' | 'min' | 'status' | 'distinct'} MonthCombine */

/**
 * One month column built from the weeks it holds.
 * @typedef {object} WeekMonth
 * @property {string} key The month, `YYYY-MM`.
 * @property {readonly string[]} weeks The Mondays shown in this month, in the order given.
 * @property {readonly number[]} indexes Each week's index in the list the month was built from.
 * @property {string} firstMonday
 * @property {string} lastMonday
 * @property {number} isoWeeks How many ISO weeks the month has in all (4 or 5).
 * @property {boolean} partial Fewer weeks shown than `isoWeeks` (BR-06).
 */

/**
 * The status a month shows: its worst week, and how many of its weeks hold it.
 * @typedef {object} MonthStatus
 * @property {string | null} worst Null when no week has a status.
 * @property {number} count Weeks holding the worst status.
 * @property {number} of Weeks in the month.
 */

/**
 * BR-02 — the month (`YYYY-MM`) a week counts in: the month of its Thursday.
 * Any day of the week is accepted.
 * @param {string} day
 * @returns {string}
 */
export const monthOfWeek = (day) => addDays(mondayOf(day.slice(0, 10)), 3).slice(0, 7);

/**
 * How many ISO weeks a month holds: the number of its Thursdays (4 or 5).
 * @param {string} month `YYYY-MM`
 * @returns {number}
 */
export function isoWeeksInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0 = Sunday
  const firstThursday = 1 + ((4 - firstDow + 7) % 7);
  return Math.floor((days - firstThursday) / 7) + 1;
}

/**
 * Groups weeks into months, in order of first appearance. Weeks need not be
 * consecutive (a filter may have narrowed them); a month then holds only the
 * weeks it was given and reads partial.
 * @param {readonly string[]} weeks Mondays, ISO dates.
 * @returns {WeekMonth[]}
 */
export function groupWeeksByMonth(weeks) {
  /** @type {Map<string, { weeks: string[]; indexes: number[] }>} */
  const byKey = new Map();
  weeks.forEach((w, i) => {
    const key = monthOfWeek(w);
    const m = byKey.get(key) ?? { weeks: [], indexes: [] };
    m.weeks.push(w);
    m.indexes.push(i);
    byKey.set(key, m);
  });
  return [...byKey].map(([key, m]) => {
    const isoWeeks = isoWeeksInMonth(key);
    return {
      key,
      weeks: m.weeks,
      indexes: m.indexes,
      firstMonday: m.weeks[0],
      lastMonday: m.weeks[m.weeks.length - 1],
      isoWeeks,
      partial: m.weeks.length < isoWeeks
    };
  });
}

/**
 * @param {readonly unknown[]} values
 * @returns {number[]}
 */
const numbers = (values) =>
  /** @type {number[]} */ (values.filter((v) => typeof v === 'number' && !Number.isNaN(v)));

/**
 * BR-03 — combine one metric's weekly values into the month's value.
 *
 * - `sum` / `min`: over the weeks that have a number; null when none has.
 * - `first` / `last`: the first / last week's value, whatever it is.
 * - `status`: the worst status by `severity` (higher is worse), with its count.
 * - `distinct`: every distinct non-empty value, in order of first appearance;
 *   a week's value may be one value or a list.
 *
 * @param {MonthCombine} kind
 * @param {readonly unknown[]} values One per week of the month, in week order.
 * @param {(status: string) => number} [severity] For `status` only.
 * @returns {number | null | unknown | MonthStatus | string[]}
 */
export function combineWeeks(kind, values, severity = () => 0) {
  switch (kind) {
    case 'sum': {
      const ns = numbers(values);
      return ns.length ? ns.reduce((a, b) => a + b, 0) : null;
    }
    case 'min': {
      const ns = numbers(values);
      return ns.length ? Math.min(...ns) : null;
    }
    case 'first':
      return values.length ? values[0] : null;
    case 'last':
      return values.length ? values[values.length - 1] : null;
    case 'status': {
      const states = /** @type {string[]} */ (values.filter((v) => typeof v === 'string' && v));
      /** @type {string | null} */
      let worst = null;
      for (const s of states) if (worst === null || severity(s) > severity(worst)) worst = s;
      return {
        worst,
        count: worst === null ? 0 : states.filter((s) => s === worst).length,
        of: values.length
      };
    }
    case 'distinct': {
      /** @type {string[]} */
      const out = [];
      for (const v of values.flat())
        if (typeof v === 'string' && v !== '' && !out.includes(v)) out.push(v);
      return out;
    }
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BL-186 (G-03) — the week header's short date: `07 Sep`, the day and a
// 3-letter month. The portal's `formatDate` uses en-GB, whose ICU data writes
// September as "Sept"; that formatter is portal-wide and pinned by many specs,
// so the grid has its own. The months are written out rather than read from
// Intl, so the header does not change with the browser's ICU version.
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];
const MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des'
];

/**
 * `07 Sep` (EN) or `17 Agu` (ID) for a calendar date, `YYYY-MM-DD`. The date is
 * read as written, with no time zone.
 * @param {string} iso
 * @param {string} [lang] The reader's language; `id…` gives Indonesian months.
 * @returns {string}
 */
export function weekHeaderDate(iso, lang = 'en') {
  const [, m, d] = iso.slice(0, 10).split('-');
  const months = lang.startsWith('id') ? MONTHS_ID : MONTHS_EN;
  return `${d} ${months[Number(m) - 1]}`;
}
