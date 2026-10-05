// ─────────────────────────────────────────────────────────────────────────────
// PTI'S DEMAND EVENTS AND THE CALENDAR INDEX — REQ-E14-07 fallback (owner
// decision 2026-09-29 on PR #81; ENG-B70 to ENG-B74).
//
// The owner named PTI's known demand events. Each week is tagged with the
// events it contains, each event's effect is ESTIMATED from history, and the
// fallback (Comb, and Theta beside it) divides the history by the index and
// multiplies the forecast by it. Pure: dates in, tags and factors out (X-01).
//
// ── THE EVENTS (a week is Monday to Sunday) ─────────────────────────────────
//   · payday      — the week contains any day from the 25th to the month's end
//   · doubleDate  — the week contains day m of month m (1.1, 2.2, … 12.12)
//   · christmas   — the week contains any day from 11 to 24 December: the two
//                   weeks or so before Christmas, when sell-in ships
//   · ramadan     — the week contains any day of Ramadan (first day to the
//                   day before Eid al-Fitr / Lebaran)
//   · preRamadan  — the `lead` weeks before the week Ramadan starts. Sell-in
//                   ships ahead of the festival; the lead is ESTIMATED from
//                   history (`estimateLead`), 0 to 6 weeks, never assumed.
//
// ── ESTIMATING A FACTOR ─────────────────────────────────────────────────────
//   baseline_t = mean of the weeks within ±13 of t that carry no event and
//                sit outside the 8-week window before any Ramadan (at least 4
//                such weeks, else no baseline)
//   raw_e      = mean over the weeks carrying e of y_t ÷ (baseline_t × the
//                factors of the OTHER events that week), iterated 10 times so
//                overlapping events are not double-counted
//   factor_e   = 1 + (raw_e − 1) · n ÷ (n + 1), n the distinct occurrences
//                (months for payday and double-date, years for the others) —
//                shrunk toward 1 when there are few — then capped to
//                [1 ÷ 1.5, 1.5]. No week with the event and a baseline: 1,
//                "not estimable". Never an invented uplift.
//
// ── RAMADAN DATES ARE APPROXIMATE ───────────────────────────────────────────
//   Indonesia's Ministry of Religious Affairs sets the dates each year (sidang
//   isbat). The table below is an approximation; the Material Planning team
//   confirms it each year and adds the next row (owner, 2026-09-29). It is a
//   constant, not an administrator setting (ENG-B71). A week after the
//   table's last Eid cannot be tagged, and the run says so.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays, daysBetween, mondayOf } from './dates';
/** @import { IsoDate } from './types' */

/** @typedef {'payday' | 'doubleDate' | 'christmas' | 'ramadan' | 'preRamadan'} DemandEvent */
/** @type {readonly DemandEvent[]} */
export const DEMAND_EVENTS = ['payday', 'doubleDate', 'christmas', 'ramadan', 'preRamadan'];

/**
 * @typedef {object} RamadanDates
 * @property {number} hijriYear
 * @property {IsoDate} start -  First day of Ramadan.
 * @property {IsoDate} eid -  Eid al-Fitr (Lebaran), the day after Ramadan ends.
 */

/**
 * APPROXIMATE — the Material Planning team confirms the dates against the
 * Ministry of Religious Affairs' (Kemenag) announcement each year and adds the
 * next row (owner, 2026-09-29).
 * @type {readonly RamadanDates[]}
 */
export const RAMADAN_TABLE = Object.freeze([
  { hijriYear: 1445, start: '2024-03-11', eid: '2024-04-10' },
  { hijriYear: 1446, start: '2025-03-01', eid: '2025-03-31' },
  { hijriYear: 1447, start: '2026-02-18', eid: '2026-03-20' },
  { hijriYear: 1448, start: '2027-02-08', eid: '2027-03-10' },
  { hijriYear: 1449, start: '2028-01-28', eid: '2028-02-26' }
]);

/** The window before Ramadan kept out of the baseline, and the longest lead. */
export const PRE_RAMADAN_WINDOW_WEEKS = 8;
export const MAX_LEAD_WEEKS = 6;
/** A pre-Ramadan week counts toward the lead when its mean ratio is at least this. */
export const LEAD_THRESHOLD = 1.05;
export const BASELINE_HALF_WINDOW = 13;
export const MIN_BASELINE_WEEKS = 4;
/** Prior weight, in occurrences, pulling a factor toward 1. */
export const SHRINK_OCCURRENCES = 1;
export const FACTOR_CAP = 1.5;
/** |factor − 1| below this is reported as "no clear effect". */
export const EFFECT_THRESHOLD = 0.05;

/**
 * @param {IsoDate} weekStart
 * @returns {IsoDate[]}
 */
const days = (weekStart) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
/** @param {IsoDate} d */
const dayOfMonth = (d) => Number(d.slice(8, 10));
/** @param {IsoDate} d */
const month = (d) => Number(d.slice(5, 7));

/**
 * The week (a Monday) a date falls in.
 * @param {IsoDate} d
 * @returns {IsoDate}
 */
export const weekOf = (d) => mondayOf(d);

/**
 * The last day the Ramadan table can tag (the day before its last Eid).
 * @param {readonly RamadanDates[]} [table]
 * @returns {IsoDate}
 */
export const ramadanTableCoversUntil = (table = RAMADAN_TABLE) =>
  addDays(table[table.length - 1].eid, -1);

/**
 * @typedef {object} WeekTag
 * @property {readonly DemandEvent[]} events
 * @property {Readonly<Partial<Record<DemandEvent, string>>>} occurrence -  Per event, the occurrence it belongs to ('2026-09', '2026', 'H1447').
 */

/** The events a week contains, with `lead` pre-Ramadan weeks. */
// A week's tags depend only on the week, the lead and the table, and every run
// asks for the same weeks many times (history, horizon, per level). Memoised per
// table so the bias replay (E14-11, ENG-B100) can re-run the forecast at past
// origins cheaply. The tag is frozen; callers only read it.
const tagMemo = /** @type {WeakMap<readonly RamadanDates[], Map<string, WeekTag>>} */ (
  new WeakMap()
);

/**
 * @param {IsoDate} weekStart
 * @param {number} lead
 * @param {readonly RamadanDates[]} [table]
 * @returns {WeekTag}
 */
export function tagWeek(weekStart, lead, table = RAMADAN_TABLE) {
  let byKey = tagMemo.get(table);
  if (!byKey) {
    byKey = new Map();
    tagMemo.set(table, byKey);
  }
  const key = `${weekStart}|${lead}`;
  const hit = byKey.get(key);
  if (hit) return hit;
  const tag = computeTag(weekStart, lead, table);
  byKey.set(key, tag);
  return tag;
}

/**
 * @param {IsoDate} weekStart
 * @param {number} lead
 * @param {readonly RamadanDates[]} table
 * @returns {WeekTag}
 */
function computeTag(weekStart, lead, table) {
  const ds = days(weekStart);
  /** @type {Partial<Record<DemandEvent, string>>} */
  const occurrence = {};
  const payday = ds.find((d) => dayOfMonth(d) >= 25);
  if (payday) occurrence.payday = payday.slice(0, 7);
  const dd = ds.find((d) => dayOfMonth(d) === month(d));
  if (dd) occurrence.doubleDate = dd.slice(0, 7);
  const xmas = ds.find((d) => month(d) === 12 && dayOfMonth(d) >= 11 && dayOfMonth(d) <= 24);
  if (xmas) occurrence.christmas = xmas.slice(0, 4);
  for (const r of table) {
    if (ds.some((d) => d >= r.start && d < r.eid)) occurrence.ramadan = `H${r.hijriYear}`;
    const k = daysBetween(weekStart, weekOf(r.start)) / 7;
    if (k >= 1 && k <= lead) occurrence.preRamadan = `H${r.hijriYear}`;
  }
  return Object.freeze({
    events: Object.freeze(DEMAND_EVENTS.filter((e) => occurrence[e] !== undefined)),
    occurrence: Object.freeze(occurrence)
  });
}

/**
 * Weeks inside the pre-Ramadan window (kept out of the baseline).
 * @param {IsoDate} weekStart
 * @param {readonly RamadanDates[]} table
 * @returns {boolean}
 */
function inPreRamadanWindow(weekStart, table) {
  return table.some((r) => {
    const k = daysBetween(weekStart, weekOf(r.start)) / 7;
    return k >= 1 && k <= PRE_RAMADAN_WINDOW_WEEKS;
  });
}

/**
 * The local baseline per week (NaN where fewer than MIN_BASELINE_WEEKS clean weeks).
 * @param {readonly number[]} y
 * @param {readonly IsoDate[]} weeks
 * @param {readonly RamadanDates[]} [table]
 * @returns {number[]}
 */
export function eventBaseline(y, weeks, table = RAMADAN_TABLE) {
  const clean = weeks.map(
    (w) => tagWeek(w, 0, table).events.length === 0 && !inPreRamadanWindow(w, table)
  );
  return y.map((_, t) => {
    let s = 0;
    let c = 0;
    for (
      let u = Math.max(0, t - BASELINE_HALF_WINDOW);
      u <= Math.min(y.length - 1, t + BASELINE_HALF_WINDOW);
      u += 1
    ) {
      if (clean[u]) {
        s += y[u];
        c += 1;
      }
    }
    return c >= MIN_BASELINE_WEEKS ? s / c : NaN;
  });
}

/**
 * The pre-Ramadan lead: how many consecutive weeks before the Ramadan-start
 * week (1, 2, …) have a mean ratio to baseline of at least LEAD_THRESHOLD,
 * across the Ramadans in the history. At most MAX_LEAD_WEEKS; 0 when none.
 * @param {readonly number[]} y
 * @param {readonly IsoDate[]} weeks
 * @param {readonly RamadanDates[]} [table]
 * @returns {number}
 */
export function estimateLead(y, weeks, table = RAMADAN_TABLE) {
  const base = eventBaseline(y, weeks, table);
  const index = new Map(weeks.map((w, i) => /** @type {const} */ ([w, i])));
  let lead = 0;
  for (let k = 1; k <= MAX_LEAD_WEEKS; k += 1) {
    const ratios = table
      .map((r) => index.get(addDays(weekOf(r.start), -7 * k)))
      .filter(/** @returns {t is number} */ (t) => t !== undefined && base[t] > 0)
      .map((t) => y[t] / base[t]);
    if (ratios.length === 0) break;
    if (ratios.reduce((a, b) => a + b, 0) / ratios.length < LEAD_THRESHOLD) break;
    lead = k;
  }
  return lead;
}

/**
 * @typedef {object} EventFactor
 * @property {DemandEvent} event
 * @property {number} factor -  The factor applied: shrunk and capped; 1 when not estimable.
 * @property {number | null} raw -  The unshrunk mean ratio; null when not estimable.
 * @property {number} occurrences -  Distinct occurrences in the history (months, or years).
 * @property {number} weeks -  History weeks that carried the event and had a baseline.
 * @property {'effect' | 'noClearEffect' | 'notEstimable'} status
 * @property {boolean} capped
 */

/**
 * Each event's factor from one series' history (see the header).
 * @param {readonly number[]} y
 * @param {readonly IsoDate[]} weeks
 * @param {number} lead
 * @param {readonly RamadanDates[]} [table]
 * @returns {EventFactor[]}
 */
export function estimateEventFactors(y, weeks, lead, table = RAMADAN_TABLE) {
  const tags = weeks.map((w) => tagWeek(w, lead, table));
  const base = eventBaseline(y, weeks, table);
  /** @param {number} t */
  const usable = (t) => base[t] > 0 && Number.isFinite(base[t]);
  const raw = /** @type {Map<DemandEvent, number>} */ (new Map(DEMAND_EVENTS.map((e) => [e, 1])));
  const estimable = /** @type {Set<DemandEvent>} */ (new Set());
  for (let iter = 0; iter < 10; iter += 1) {
    for (const e of DEMAND_EVENTS) {
      /** @type {number[]} */
      const ratios = [];
      tags.forEach((tag, t) => {
        if (!tag.events.includes(e) || !usable(t)) return;
        const others = tag.events
          .filter((o) => o !== e)
          .reduce(
            (p, o) => p * /** @type {NonNullable<ReturnType<typeof raw.get>>} */ (raw.get(o)),
            1
          );
        ratios.push(y[t] / (base[t] * others));
      });
      if (ratios.length === 0) continue;
      estimable.add(e);
      raw.set(e, ratios.reduce((a, b) => a + b, 0) / ratios.length);
    }
  }
  return DEMAND_EVENTS.map((e) => {
    const used = tags
      .map((tag, t) =>
        tag.events.includes(e) && usable(t) ? /** @type {string} */ (tag.occurrence[e]) : null
      )
      .filter(/** @returns {o is string} */ (o) => o !== null);
    if (!estimable.has(e))
      return {
        event: e,
        factor: 1,
        raw: null,
        occurrences: 0,
        weeks: 0,
        status: 'notEstimable',
        capped: false
      };
    const n = new Set(used).size;
    const r = /** @type {NonNullable<ReturnType<typeof raw.get>>} */ (raw.get(e));
    const shrunk = 1 + ((r - 1) * n) / (n + SHRINK_OCCURRENCES);
    const factor = Math.min(FACTOR_CAP, Math.max(1 / FACTOR_CAP, shrunk));
    return {
      event: e,
      factor,
      raw: r,
      occurrences: n,
      weeks: used.length,
      status: Math.abs(factor - 1) < EFFECT_THRESHOLD ? 'noClearEffect' : 'effect',
      capped: factor !== shrunk
    };
  });
}

/**
 * The calendar index of a week: the product of the factors of the events in it.
 * @param {IsoDate} weekStart
 * @param {readonly EventFactor[]} factors
 * @param {number} lead
 * @param {readonly RamadanDates[]} [table]
 * @returns {number}
 */
export function calendarIndex(weekStart, factors, lead, table = RAMADAN_TABLE) {
  const tag = tagWeek(weekStart, lead, table);
  return factors.filter((f) => tag.events.includes(f.event)).reduce((p, f) => p * f.factor, 1);
}
