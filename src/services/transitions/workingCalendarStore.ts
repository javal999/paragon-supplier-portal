// ─────────────────────────────────────────────────────────────────────────────
// THE HUB WORKING CALENDAR — BL-50, REQUIREMENTS §3.4 (Q-18 decided 2026-09-21).
//
//   > The hub keeps its own working calendar, maintained by the Hub
//   > administrator (ADM). It is loaded from the SAP factory calendar for
//   > Indonesia, and the administrator can add, remove or override days in the
//   > hub. Every deadline in this file reads that calendar. [Owner]
//
// Two layers, and the page shows which one a day came from:
//
//   1. THE SAP LOAD. `SAP_FACTORY_CALENDAR` — the factory calendar's non-working
//      dates for the year it covers. ⚠️ **SIMULATED: there is no SAP
//      connection.** The load is a fixture standing where the inbound message
//      will, and the page marks it "Sample data" (SC-04). Nothing here pretends
//      to fetch.
//   2. THE ADMINISTRATOR'S RULINGS. An append-only ledger of
//      `{ date, kind, reason, setBy, setAt }`, written ONLY by the governed verb
//      `t_calendar_day_set` (the `CommandTarget` in `MockCommandService`). The
//      latest ruling for a date decides it outright, whatever SAP said.
//
// ⚠️ **ONE CALENDAR IN FORCE, AND EVERY DEADLINE READS IT HERE.**
// `hubWorkingCalendar()` is the calendar the PO response deadline, the call-off
// confirmation deadline and the forecast commitment deadlines (CR-26) all count
// working days on. `hubCalendarReaders.guard.test.ts` derives the modules that
// do working-day arithmetic from source and refuses any that reaches past this
// function to the frozen base — a ruling that moved one deadline and not
// another would be two calendars, which is what Q-18 ruled out.
//
// ⚠️ **A RULING IS A FACT; A DEADLINE IS NEVER STORED (law 0.5).** Nothing here
// records that a commitment is late or a PO escalated. Those stay derived at
// read from `hubWorkingCalendar()` and the instant the caller passes, so a
// ruling moves every open deadline the moment it lands — no recompute, no
// migration, nothing to fall out of step.
//
// Persistence follows `customRoles.ts` (operator ruling on that store): the
// rulings survive a reload via `localStorage`, local to this browser and shared
// with nobody. The read fails honestly — absent, unparseable and refused rows
// are distinguished from "no rulings".
// ─────────────────────────────────────────────────────────────────────────────

import {
  DEFAULT_WORKING_CALENDAR,
  INDONESIA_HOLIDAYS_2026,
  isCalendarDate,
  isCalendarDayKind,
  isWorkingDay,
  withDayRulings,
  type CalendarDayKind,
  type WorkingCalendar,
} from '../../lib/workingCalendar';
import { asActorAttribution, type ActorAttribution } from '../../lib/enforcement';

// ── 1 · THE SAP LOAD (simulated) ─────────────────────────────────────────────

/**
 * The SAP factory calendar as the hub loaded it. ⚠️ **SIMULATED** — a fixture,
 * not an inbound message; `liveness` says so and the page renders it.
 *
 * Weekends are carried by weekday (SAP factory calendars mark Saturday and
 * Sunday as non-working by rule); `nonWorkingDates` is the list of dated
 * holidays and collective leave on top of that.
 */
export const SAP_FACTORY_CALENDAR = Object.freeze({
  /** The SAP factory calendar id for Indonesia. */
  calendarId: 'ID',
  liveness: 'SIMULATED' as const,
  /** The first and last date the load covers, inclusive. */
  coversFrom: '2026-01-01',
  coversTo: '2026-12-31',
  /** When the load arrived. A fixed instant — there is no feed to stamp it. */
  loadedAt: '2026-08-31T01:00:00.000Z',
  nonWorkingDates: INDONESIA_HOLIDAYS_2026,
});

/** Is `date` inside the year the SAP load covers? The verb's `readState`. */
export function calendarCovers(date: string): boolean {
  return (
    isCalendarDate(date) &&
    date >= SAP_FACTORY_CALENDAR.coversFrom &&
    date <= SAP_FACTORY_CALENDAR.coversTo
  );
}

/** The calendar exactly as SAP loaded it, before any ruling. */
export const SAP_BASE_CALENDAR: WorkingCalendar = Object.freeze({
  ...DEFAULT_WORKING_CALENDAR,
  holidays: new Set(SAP_FACTORY_CALENDAR.nonWorkingDates),
});

// ── 2 · THE ADMINISTRATOR'S RULINGS ──────────────────────────────────────────

/**
 * One ruling on one date.
 *
 * ⚠️ **`setAt` IS STORE-ASSIGNED, NEVER A PAYLOAD FIELD** — the `pinnedAt` /
 * `grantedAt` discipline. A caller that could set it could backdate its own
 * audit entry.
 */
export interface CalendarDayRuling {
  readonly date: string;
  readonly kind: CalendarDayKind;
  readonly reason: string;
  readonly setBy: ActorAttribution;
  readonly setAt: string;
}

/** Rulings present before anybody acts — sample data, not a stored write. */
export const SEEDED_CALENDAR_RULINGS: readonly CalendarDayRuling[] = Object.freeze([]);

/** The one key. Beside `paragon.customRoles`, same envelope discipline. */
export const WORKING_CALENDAR_KEY = 'paragon.workingCalendar';
const STORE_VERSION = 1;

export interface CalendarReadState {
  /** The rulings in force, oldest first (seed + stored). */
  readonly rulings: readonly CalendarDayRuling[];
  /** Stored rows refused on read, each with the reason. */
  readonly rejected: readonly { readonly row: string; readonly reason: string }[];
  /** The store exists but could not be parsed — DISTINCT from "no rulings". */
  readonly unreadable: boolean;
}

/** Why a ruling is not one the verb would have accepted, or null. The SAME
 *  predicates `calendar_day_governed` calls, so a hand-edited store cannot
 *  carry a ruling the verb would refuse. */
export function calendarRulingRefusal(
  date: unknown,
  kind: unknown,
  reason: unknown,
): string | null {
  if (!isCalendarDate(date)) return `'${String(date)}' is not a date (YYYY-MM-DD)`;
  if (!calendarCovers(date)) {
    return `${date} is outside the calendar loaded from SAP (${SAP_FACTORY_CALENDAR.coversFrom} to ${SAP_FACTORY_CALENDAR.coversTo})`;
  }
  if (!isCalendarDayKind(kind)) return `kind '${String(kind)}' is not working or non-working`;
  if (typeof reason !== 'string' || reason.trim().length < 3) {
    return 'a ruling on the working calendar needs a reason (at least 3 characters)';
  }
  return null;
}

let stored: CalendarDayRuling[] = [];
let readStateCache: CalendarReadState = { rulings: SEEDED_CALENDAR_RULINGS, rejected: [], unreadable: false };
let hydrated = false;
let version = 0;
const listeners = new Set<() => void>();

function readFromStorage(): { rows: CalendarDayRuling[]; rejected: CalendarReadState['rejected']; unreadable: boolean } {
  let raw: string | null = null;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { rows: [], rejected: [], unreadable: false };
    raw = window.localStorage.getItem(WORKING_CALENDAR_KEY);
  } catch {
    return { rows: [], rejected: [], unreadable: false };
  }
  if (raw === null) return { rows: [], rejected: [], unreadable: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { rows: [], rejected: [], unreadable: true };
  }
  const env = parsed as { v?: unknown; rulings?: unknown } | null;
  if (!env || typeof env !== 'object' || env.v !== STORE_VERSION || !Array.isArray(env.rulings)) {
    return { rows: [], rejected: [], unreadable: true };
  }
  const rows: CalendarDayRuling[] = [];
  const rejected: { row: string; reason: string }[] = [];
  for (const [i, row] of (env.rulings as readonly unknown[]).entries()) {
    const r = row as Record<string, unknown> | null;
    if (!r || typeof r !== 'object' || typeof r.setAt !== 'string') {
      rejected.push({ row: `row ${i}`, reason: 'not a calendar ruling' });
      continue;
    }
    const refusal = calendarRulingRefusal(r.date, r.kind, r.reason);
    if (refusal) {
      rejected.push({ row: String(r.date ?? `row ${i}`), reason: refusal });
      continue;
    }
    const setBy = asActorAttribution(r.setBy);
    if (!setBy) {
      rejected.push({ row: String(r.date), reason: 'setBy is not a recorded attribution' });
      continue;
    }
    rows.push({
      date: r.date as string,
      kind: r.kind as CalendarDayKind,
      reason: (r.reason as string).trim(),
      setBy,
      setAt: r.setAt,
    });
  }
  return { rows, rejected, unreadable: false };
}

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  const read = readFromStorage();
  stored = read.rows;
  readStateCache = {
    rulings: [...SEEDED_CALENDAR_RULINGS, ...stored],
    rejected: read.rejected,
    unreadable: read.unreadable,
  };
}

function persist(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(WORKING_CALENDAR_KEY, JSON.stringify({ v: STORE_VERSION, rulings: stored }));
  } catch {
    // Quota / private browsing: the ruling stands for the session and is in
    // the audit trail; only its durability is lost.
  }
}

function changed(): void {
  version += 1;
  calendarMemo = null;
  listeners.forEach((l) => l());
}

export const workingCalendarStore = {
  /** Every ruling in force, oldest first (the seeded demo ruling first). */
  rulings(): readonly CalendarDayRuling[] {
    hydrate();
    return readStateCache.rulings;
  },
  /** What the last read found, including refused rows and an unreadable store. */
  readState(): CalendarReadState {
    hydrate();
    return readStateCache;
  },
  /** APPEND ONLY — called by the `t_calendar_day_set` target and nothing else. */
  append(ruling: CalendarDayRuling): void {
    hydrate();
    stored = [...stored, ruling];
    readStateCache = { ...readStateCache, rulings: [...SEEDED_CALENDAR_RULINGS, ...stored] };
    persist();
    changed();
  },
  /** Forget the stored rulings, in memory AND on disk — test isolation. The
   *  seeded demo ruling stays: it is fixture data, not a stored write. */
  reset(): void {
    stored = [];
    readStateCache = { rulings: SEEDED_CALENDAR_RULINGS, rejected: [], unreadable: false };
    hydrated = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem(WORKING_CALENDAR_KEY);
    } catch {
      // in-memory state is already clear
    }
    changed();
  },
  /** Drop the in-memory copy WITHOUT touching storage — what a reload does. */
  rehydrate(): void {
    stored = [];
    hydrated = false;
    hydrate();
    changed();
  },
  /** A number that changes whenever the calendar in force does. */
  version(): number {
    return version;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// ── 3 · THE CALENDAR IN FORCE ────────────────────────────────────────────────

let calendarMemo: WorkingCalendar | null = null;

/**
 * THE calendar every deadline in the hub counts working days on: the SAP load
 * with the administrator's rulings applied, latest ruling per date winning.
 */
export function hubWorkingCalendar(): WorkingCalendar {
  if (calendarMemo) return calendarMemo;
  calendarMemo = withDayRulings(SAP_BASE_CALENDAR, workingCalendarStore.rulings());
  return calendarMemo;
}

/** Where a date's answer comes from, for the page. */
export type CalendarDaySource = 'sap' | 'administrator';

export interface CalendarDayView {
  readonly date: string;
  /** ISO weekday, 1 = Monday … 7 = Sunday. */
  readonly weekday: number;
  readonly working: boolean;
  readonly source: CalendarDaySource;
  /** What SAP said, so an override is visible as one. */
  readonly sapWorking: boolean;
  /** The ruling that decides it, when the administrator ruled. */
  readonly ruling: CalendarDayRuling | null;
}

const weekdayOf = (date: string): number => {
  const d = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return d === 0 ? 7 : d;
};

/** The latest ruling per date. */
function latestRulings(): Map<string, CalendarDayRuling> {
  const out = new Map<string, CalendarDayRuling>();
  for (const r of workingCalendarStore.rulings()) out.set(r.date, r);
  return out;
}

/** One date as the page shows it. */
export function calendarDay(date: string): CalendarDayView {
  const ruling = latestRulings().get(date) ?? null;
  return {
    date,
    weekday: weekdayOf(date),
    working: isWorkingDay(date, hubWorkingCalendar()),
    source: ruling ? 'administrator' : 'sap',
    sapWorking: isWorkingDay(date, SAP_BASE_CALENDAR),
    ruling,
  };
}

/**
 * The dated non-working days in force plus every date the administrator ruled
 * on, in date order — the list the page shows. Weekends are by weekday and are
 * not listed one by one, unless a ruling touches one.
 */
export function listedCalendarDays(): readonly CalendarDayView[] {
  const dates = new Set<string>(SAP_FACTORY_CALENDAR.nonWorkingDates);
  for (const date of latestRulings().keys()) dates.add(date);
  return [...dates].sort().map(calendarDay);
}
