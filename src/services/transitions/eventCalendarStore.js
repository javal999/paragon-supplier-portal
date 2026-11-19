// ────────────────────────────────────────────────────────────────────────────
// PSC-4 BR-07 (BL-339) — the Material Buffer's event calendar: CNY and Typhoon
// windows, maintained by the Hub administrator (ADM).
//
// Append-only: a window is a row, and the latest row of an event key
// (`<kind>|<startsOn>`, `eventKey`) is in force. Written by
// `t_eventcalendar_set` only. Held in memory like every other record in the
// prototype.
//
// It sits BESIDE `workingCalendarStore.js` because it is the same address: an
// ADM-maintained ledger the administration page reads, not a per-page mock. A
// page that imported a `data/mock` store would break the page data seam
// (`pageDataSeam.guard`).
//
// The seed is SAMPLE DATA standing where the administrator's entries will: one
// Typhoon window inside the hub's 13-week horizon and one CNY window after it.
// ⚠️ NEITHER COVERS THE HUB'S PRESENT WEEK, deliberately: the Material Buffer
// switches on inside a window (BR-07), so a seeded window over the present
// week would move every material's ROP Order on a fresh load.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CalendarEventRow } from './eventCalendarRules' */
import { eventKey, defaultTyphoonWindow } from './eventCalendarRules';
import { NO_PERSON } from '@context/noPerson';
import { SDC_SIMULATED_NOW } from '../sdc';

/** The Typhoon the sample data carries: landfall 12 Oct 2026, window 2 weeks before it. */
const TYPHOON_LANDFALL = '2026-10-12';

/**
 * @param {import('./eventCalendarRules').MaterialBufferEventKind} kind
 * @param {string} startsOn
 * @param {string} endsOn
 * @param {string} reason
 * @returns {CalendarEventRow}
 */
const seedRow = (kind, startsOn, endsOn, reason) => ({
  id: eventKey(kind, startsOn),
  kind,
  startsOn,
  endsOn,
  reason,
  setAt: SDC_SIMULATED_NOW,
  setBy: NO_PERSON
});

/** @returns {CalendarEventRow[]} */
const seedRows = () => {
  const typhoon = defaultTyphoonWindow(TYPHOON_LANDFALL);
  return [
    seedRow(
      'Typhoon',
      typhoon.startsOn,
      typhoon.endsOn,
      'Sample data: a storm makes landfall on 12 October 2026'
    ),
    seedRow('CNY', '2027-02-01', '2027-02-14', 'Sample data: Chinese New Year window 2027')
  ];
};

/** @type {CalendarEventRow[]} */
let rows = seedRows();

export const eventCalendarStore = {
  /** Every row, oldest first. @returns {readonly CalendarEventRow[]} */
  all() {
    return rows;
  },
  /**
   * The rows in force: the latest row of each event key, sorted by start day.
   * @returns {CalendarEventRow[]}
   */
  inForce() {
    /** @type {Map<string, CalendarEventRow>} */
    const latest = new Map();
    for (const r of rows) latest.set(r.id, r);
    return [...latest.values()].sort(
      (a, b) => a.startsOn.localeCompare(b.startsOn) || a.kind.localeCompare(b.kind)
    );
  },
  /**
   * @param {CalendarEventRow} row
   * @returns {void}
   */
  append(row) {
    rows = [...rows, row];
  },
  /**
   * TEST SEAM — back to the sample load.
   * @returns {void}
   */
  reset() {
    rows = seedRows();
  }
};
