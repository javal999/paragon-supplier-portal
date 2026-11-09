// ─────────────────────────────────────────────────────────────────────────────
// BL-195 — STRATEGIC BUFFER (DRC-9a) AND PRODUCTION LIMIT (DRC-9b),
// SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10 section 3 and defaults C4, E3.
//
// Pure: plans, LTP lines and the demand-event calendar in, figures out. Every
// figure here is computed at read and stored nowhere, so none is stamped
// (DRC-D16 stamps stored figures only). The formula itself lives in the
// calculation module (`osipRules.strategicBuffer`, design rule 1); this file
// only gathers its inputs.
//
//   production limit  = the supplier's allocated capacity for the planning
//                       group, per week [Default E3; MoM 3]. The ceiling on
//                       turning feedstock into finished material. Source is a
//                       switch: 'allocatedCapacity' (default, MR-8 built) or
//                       'sadrFeed' (reserved: "not available" until a feed
//                       exists).
//   strategic buffer  = LTP − baseline, per month of a festive window, where
//                       baseline = average LTP of the 3 months before the
//                       window [Default C4; PPT 12]. Never below 0.
//
// FESTIVE WINDOWS come from PTI's demand-event calendar
// (`engine/eventCalendar.js`, BL-137), never from dates invented here. The
// calendar's festive season is Ramadan to Lebaran (`RAMADAN_TABLE`); a window
// is the calendar months from the first day of Ramadan to Eid al-Fitr
// (Lebaran) inclusive. The calendar has NO Chinese New Year, so CNY is not a
// window until the calendar carries it. The calendar's `christmas` and
// `preRamadan` events are sell-in tags for the forecast index, not festive
// windows, and are not used here.
// ─────────────────────────────────────────────────────────────────────────────

import { OSIP_RULES, ceilingTo, strategicBuffer } from './osipRules';
import { RAMADAN_TABLE } from '../engine/eventCalendar';
/** @import { CapacityPlan } from '../data/types' */
/** @import { MaterialMasterEntry } from '../sdc/types' */
/** @import { LtpLine } from './capacityRules' */
/** @import { RamadanDates } from '../engine/eventCalendar' */

/**
 * @typedef {{
 *   readonly productionLimitSource: 'allocatedCapacity' | 'sadrFeed';
 *   readonly strategicBufferBaselineMonths: number;
 * }} BufferRules
 */

/**
 * The [Default]s of BL-195, one key each with its question ID (design rule 2).
 * @type {BufferRules}
 */
export const BUFFER_RULES = Object.freeze({
  /** [Default E3] DRC-9b — production limit = allocated capacity per planning group; 'sadrFeed' reserved for the SADR feed. */
  productionLimitSource: /** @type {'allocatedCapacity' | 'sadrFeed'} */ ('allocatedCapacity'),
  /** [Default C4] DRC-9a — the baseline averages this many months of LTP before the festive window (PPT 12). */
  strategicBufferBaselineMonths: 3
});

/** The question IDs a page names in its "Provisional" label (design rule 5). */
export const PRODUCTION_LIMIT_QUESTION = 'E3';
export const STRATEGIC_BUFFER_QUESTION = 'C4';

// ─── Production limit (DRC-9b) ──────────────────────────────────────────────

/**
 * `available`: the figure. `notStated`: the supplier stated no capacity for the
 * week. `noPlan`: the supplier has no capacity plan for the group, or the week
 * is outside its horizon. `notAvailable`: the source has no data yet (SADR feed).
 *
 * @typedef {| { readonly status: 'available'; readonly value: number; readonly source: 'allocatedCapacity'; readonly planningGroupId: string; readonly uom: string }
 *   | { readonly status: 'notStated'; readonly source: 'allocatedCapacity'; readonly planningGroupId: string }
 *   | { readonly status: 'noPlan'; readonly source: 'allocatedCapacity' }
 *   | { readonly status: 'notAvailable'; readonly source: 'sadrFeed' }} ProductionLimit
 */

/**
 * DRC-9b [Default E3] — the supplier's production limit for a planning group
 * (or the planning group a material sits in) and a week. Wave 3 feeds ROP
 * Fisik's capacity term from here.
 * @param {readonly CapacityPlan[]} plans
 * @param {string} supplierId
 * @param {string} groupOrMaterial a planning group id, or a material code (resolved through `master`, else through the plans' material lists)
 * @param {string} week the week's Monday (YYYY-MM-DD)
 * @param {{ master?: (materialCode: string) => MaterialMasterEntry | null; rules?: BufferRules }} [options]
 * @returns {ProductionLimit}
 */
export function productionLimitFor(plans, supplierId, groupOrMaterial, week, options = {}) {
  const rules = options.rules ?? BUFFER_RULES;
  // [Default E3] the alternative source has no feed yet: say so, never guess.
  if (rules.productionLimitSource === 'sadrFeed')
    return { status: 'notAvailable', source: 'sadrFeed' };
  const mine = plans.filter((p) => p.supplierId === supplierId);
  const entry = options.master?.(groupOrMaterial) ?? null;
  const plan =
    mine.find((p) => p.planningGroupId === groupOrMaterial) ??
    (entry
      ? mine.find(
          (p) => p.planningGroupId === (entry.planningGroupId ?? `pg-${entry.materialGroup}`)
        )
      : undefined) ??
    mine.find((p) => p.materials.includes(groupOrMaterial));
  if (!plan) return { status: 'noPlan', source: 'allocatedCapacity' };
  const w = plan.weeks.find((x) => x.week === week);
  if (!w) return { status: 'noPlan', source: 'allocatedCapacity' };
  if (!w.entry)
    return {
      status: 'notStated',
      source: 'allocatedCapacity',
      planningGroupId: plan.planningGroupId
    };
  return {
    status: 'available',
    value: w.entry.allocated,
    source: 'allocatedCapacity',
    planningGroupId: plan.planningGroupId,
    uom: plan.uom
  };
}

/**
 * DRC-9b — whether the capacity page's allocated row IS the production limit
 * (it is under the default source; under 'sadrFeed' it is not).
 * @param {BufferRules} [rules]
 * @returns {boolean}
 */
export const allocatedIsProductionLimit = (rules = BUFFER_RULES) =>
  rules.productionLimitSource === 'allocatedCapacity';

// ─── Months ─────────────────────────────────────────────────────────────────

/** @param {string} day YYYY-MM-DD @returns {string} YYYY-MM */
const monthOf = (day) => day.slice(0, 7);

/**
 * The month `n` months after `month` (n may be negative).
 * @param {string} month YYYY-MM
 * @param {number} n
 * @returns {string}
 */
export function addMonths(month, n) {
  const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + n;
  return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** @param {string} month YYYY-MM @returns {number} */
const daysInMonth = (month) =>
  new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();

/** @param {string} day @returns {number} days since the epoch */
const dayNumber = (day) =>
  Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))) /
  86_400_000;

/**
 * Days a period [from, to] and a month share.
 * @param {string} from
 * @param {string} to
 * @param {string} month
 * @returns {number}
 */
function overlapDays(from, to, month) {
  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
  const a = from > first ? from : first;
  const b = to < last ? to : last;
  return a > b ? 0 : dayNumber(b) - dayNumber(a) + 1;
}

/**
 * `qty`: the LTP of the month, whole units; null when no line touches it.
 * `coveredDays` / `days`: how much of the month the LTP lines cover. A month the
 * lines cover only in part reads its covered part, flagged `partial`.
 *
 * @typedef {{
 *   readonly month: string;
 *   readonly qty: number | null;
 *   readonly coveredDays: number;
 *   readonly days: number;
 *   readonly partial: boolean;
 * }} MonthLtp
 */

/**
 * A supplier × material's LTP for one calendar month: each line spread over
 * its period by day, the way the capacity page spreads it over weeks
 * (`capacityRules.groupWeekLtp`).
 * @param {readonly LtpLine[]} lines
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} month YYYY-MM
 * @returns {MonthLtp}
 */
export function monthLtp(lines, supplierId, materialCode, month) {
  const days = daysInMonth(month);
  const covered = /** @type {Set<number>} */ (new Set());
  let total = 0;
  let touched = false;
  for (const l of lines) {
    if (l.supplierId !== supplierId || l.materialCode !== materialCode) continue;
    const shared = overlapDays(l.periodStart, l.periodEnd, month);
    if (shared === 0) continue;
    touched = true;
    const lineDays = dayNumber(l.periodEnd) - dayNumber(l.periodStart) + 1;
    total += (l.forecastQty * shared) / lineDays;
    const from = Math.max(dayNumber(l.periodStart), dayNumber(`${month}-01`));
    for (let d = from; d < from + shared; d += 1) covered.add(d);
  }
  return {
    month,
    qty: touched ? Math.round(total) : null,
    coveredDays: covered.size,
    days,
    partial: touched && covered.size < days
  };
}

// ─── Festive windows ────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   readonly id: string;
 *   readonly event: 'ramadan';
 *   readonly start: string;
 *   readonly eid: string;
 *   readonly months: readonly string[];
 * }} FestiveWindow
 */

/**
 * The festive windows in PTI's demand-event calendar: per Ramadan row, the
 * months from its first day to Lebaran (Eid) inclusive.
 * @param {readonly RamadanDates[]} [table]
 * @returns {FestiveWindow[]}
 */
export function festiveWindows(table = RAMADAN_TABLE) {
  return table.map((r) => {
    /** @type {string[]} */
    const months = [];
    for (let m = monthOf(r.start); m <= monthOf(r.eid); m = addMonths(m, 1)) months.push(m);
    return { id: `H${r.hijriYear}`, event: 'ramadan', start: r.start, eid: r.eid, months };
  });
}

// ─── Strategic buffer (DRC-9a) ──────────────────────────────────────────────

/**
 * `buffer`: LTP − baseline, never below 0; null when the month has no LTP or
 * the baseline is incomplete.
 * @typedef {MonthLtp & { readonly buffer: number | null }} FestiveMonth
 */

/**
 * `baseline`: null when a baseline month has no LTP (`baselineIncomplete`).
 * @typedef {{
 *   readonly window: FestiveWindow;
 *   readonly baselineMonths: readonly MonthLtp[];
 *   readonly baseline: number | null;
 *   readonly months: readonly FestiveMonth[];
 *   readonly status: 'ok' | 'baselineIncomplete';
 * }} WindowBuffer
 */

/**
 * `windows` is empty when no festive window falls in the LTP's months.
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly materialCode: string;
 *   readonly materialLabel: string;
 *   readonly uom: string;
 *   readonly ltpMonths: readonly string[];
 *   readonly windows: readonly WindowBuffer[];
 * }} StrategicBufferRow
 */

/**
 * DRC-9a [Default C4] — one festive window's buffer for a supplier × material.
 * @param {readonly LtpLine[]} lines
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {FestiveWindow} window
 * @param {BufferRules} [rules]
 * @returns {WindowBuffer}
 */
export function windowBuffer(lines, supplierId, materialCode, window, rules = BUFFER_RULES) {
  const n = rules.strategicBufferBaselineMonths;
  const first = window.months[0];
  const baselineMonths = Array.from({ length: n }, (_, i) =>
    monthLtp(lines, supplierId, materialCode, addMonths(first, i - n))
  );
  const complete = baselineMonths.every((m) => m.qty !== null);
  const preFestiveLtp = baselineMonths.map((m) => m.qty ?? 0);
  const months = window.months.map((month) => {
    const m = monthLtp(lines, supplierId, materialCode, month);
    // Design rule 1 — the formula is the calculation module's, not restated here.
    const buffer =
      complete && m.qty !== null ? strategicBuffer({ ltp: m.qty, preFestiveLtp }).value : null;
    return { ...m, buffer };
  });
  return {
    window,
    baselineMonths,
    baseline: complete ? strategicBuffer({ ltp: 0, preFestiveLtp }).baseline : null,
    months,
    status: complete ? 'ok' : 'baselineIncomplete'
  };
}

/**
 * The fields of a forecast line the rows read (names for the display).
 * @typedef {LtpLine & { readonly supplierName?: string; readonly materialLabel?: string; readonly uom?: string }} NamedLtpLine
 */

/**
 * DRC-9a — every supplier × material with LTP, with the strategic buffer per
 * month of each festive window that falls in its LTP months. Read only:
 * nothing is ordered from it.
 * @param {readonly NamedLtpLine[]} lines
 * @param {{ rules?: BufferRules; table?: readonly RamadanDates[] }} [options]
 * @returns {StrategicBufferRow[]}
 */
export function strategicBufferRows(lines, options = {}) {
  const rules = options.rules ?? BUFFER_RULES;
  const windows = festiveWindows(options.table ?? RAMADAN_TABLE);
  /** @type {Map<string, NamedLtpLine[]>} */
  const pairs = new Map();
  for (const l of lines) {
    const key = `${l.supplierId}|${l.materialCode}`;
    pairs.set(key, [...(pairs.get(key) ?? []), l]);
  }
  return [...pairs.values()]
    .map((mine) => {
      const head = mine[0];
      /** @type {Set<string>} */
      const months = new Set();
      for (const l of mine)
        for (let m = monthOf(l.periodStart); m <= monthOf(l.periodEnd); m = addMonths(m, 1))
          months.add(m);
      const ltpMonths = [...months].sort();
      return {
        supplierId: head.supplierId,
        supplierName: head.supplierName ?? head.supplierId,
        materialCode: head.materialCode,
        materialLabel: head.materialLabel ?? head.materialCode,
        uom: head.uom ?? '',
        ltpMonths,
        windows: windows
          .filter((w) => w.months.some((m) => months.has(m)))
          .map((w) => windowBuffer(mine, head.supplierId, head.materialCode, w, rules))
      };
    })
    .sort(
      (a, b) =>
        a.supplierName.localeCompare(b.supplierName) || a.materialCode.localeCompare(b.materialCode)
    );
}

// ─── Protection buffer (DRC-9c, BL-205) [Proposed] ──────────────────────────
//
// DRC-9c is on hold on question C3 (the uplift of a non-festive material is
// unknown). The owner asked for the recommended option built behind a switch,
// for review, so every key below is [Proposed], not a ruling:
//
//   protection buffer = CEILING(uplift, production MPQ), per supplier × material
//                       × month, where uplift = max(0, LTP of the month −
//                       average LTP of the 3 months before it): PPT 12's
//                       strategic buffer formula (`osipRules.strategicBuffer`)
//                       applied to every month, the baseline rolling with it.
//   levels            = 5, 6 and 7 only: XLS Guidance "risk protection =
//                       Ceiling(Uplift, MPQ Produksi)" for levels 4 to 7, with
//                       the revision "level 4 tanpa protection buffer". Levels
//                       1 to 3 carry a strategic buffer instead.
//   MPQ               = `MaterialSource.orderMultiple` (wave 2 default).
//
// MoM 3: anticipatory stock, "planned to be absorbed": PTI takes it even if
// demand does not rise. Read only: it does NOT feed ROP Fisik or Max (out of
// scope for BL-205; a decision for the owner). Computed at read, stored
// nowhere, so not stamped (DRC-D16).

/**
 * @typedef {{
 *   readonly baselineMonths: number;
 *   readonly levels: readonly number[];
 *   readonly mpqSource: 'orderMultiple';
 * }} ProtectionBufferRules
 */

/**
 * The [Proposed] keys of BL-205, awaiting owner review (question C3).
 * @type {ProtectionBufferRules}
 */
export const PROTECTION_BUFFER_RULES = Object.freeze({
  /** [Proposed BL-205, C3] months of LTP the rolling baseline averages (PPT 12's 3). */
  baselineMonths: 3,
  /** [Proposed BL-205, C3] the OSIP levels that carry one: XLS Guidance levels 4–7, less level 4 by its revision note. */
  levels: Object.freeze([5, 6, 7]),
  /** [Default, wave 2] MPQ = orderMultiple until the master data feed carries MPQ (wave 2 default). */
  mpqSource: /** @type {'orderMultiple'} */ ('orderMultiple')
});

/** The question the [Proposed] label names. */
export const PROTECTION_BUFFER_QUESTION = 'C3';
/** The [Default]s a protection figure also rests on (design rule 5): level C2, MPQ. */
export const PROTECTION_BUFFER_DEFAULTS = Object.freeze(['C2', 'MPQ']);

/**
 * One supplier × material's inputs the rule reads beyond its LTP: the OSIP
 * level in force (DRC-D11, [Default C2] when none set) and the production MPQ.
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly level: number;
 *   readonly levelSource: 'planner' | 'classification' | 'default';
 *   readonly mpq: number | null;
 *   readonly protectionOn?: boolean;
 * }} ProtectionBufferInput
 */

/**
 * `baseline`: null when a previous month has no LTP. `uplift` / `buffer`: null
 * when the month or its baseline has no LTP; `buffer` also null with no MPQ.
 * @typedef {MonthLtp & {
 *   readonly baselineMonths: readonly MonthLtp[];
 *   readonly baseline: number | null;
 *   readonly uplift: number | null;
 *   readonly buffer: number | null;
 *   readonly status: 'ok' | 'noLtp' | 'baselineIncomplete' | 'noMpq';
 * }} ProtectionMonth
 */

/** @typedef {'switchedOff' | 'level4' | 'strategicLevel' | 'otherLevel'} ProtectionExclusion */

/**
 * `applies`: false with a `reason` when the material carries none:
 * `switchedOff` ('off' variant), `level4` (Guidance revision), `strategicLevel`
 * (levels 1–3: strategic buffer instead), `otherLevel` (any level outside the
 * rule's list). `months` is empty then.
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly materialCode: string;
 *   readonly materialLabel: string;
 *   readonly uom: string;
 *   readonly level: number;
 *   readonly levelSource: ProtectionBufferInput['levelSource'];
 *   readonly mpq: number | null;
 *   readonly applies: boolean;
 *   readonly reason: ProtectionExclusion | null;
 *   readonly months: readonly ProtectionMonth[];
 * }} ProtectionBufferRow
 */

/**
 * DRC-9c [Proposed BL-205, C3] — one month's protection buffer.
 * @param {readonly LtpLine[]} lines
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} month YYYY-MM
 * @param {number | null} mpq
 * @param {ProtectionBufferRules} [rules]
 * @returns {ProtectionMonth}
 */
export function protectionMonth(
  lines,
  supplierId,
  materialCode,
  month,
  mpq,
  rules = PROTECTION_BUFFER_RULES
) {
  const n = rules.baselineMonths;
  const m = monthLtp(lines, supplierId, materialCode, month);
  const baselineMonths = Array.from({ length: n }, (_, i) =>
    monthLtp(lines, supplierId, materialCode, addMonths(month, i - n))
  );
  const complete = baselineMonths.every((b) => b.qty !== null);
  const preFestiveLtp = baselineMonths.map((b) => b.qty ?? 0);
  const baseline = complete ? strategicBuffer({ ltp: 0, preFestiveLtp }).baseline : null;
  const base = { ...m, baselineMonths, baseline };
  if (m.qty === null) return { ...base, uplift: null, buffer: null, status: 'noLtp' };
  if (!complete) return { ...base, uplift: null, buffer: null, status: 'baselineIncomplete' };
  // Design rule 1 — PPT 12's formula is the calculation module's, applied to every month.
  const uplift = strategicBuffer({ ltp: m.qty, preFestiveLtp }).value;
  // XLS Guidance — Ceiling(Uplift, MPQ Produksi). No MPQ, no figure (never guessed).
  if (mpq === null || !(mpq > 0)) return { ...base, uplift, buffer: null, status: 'noMpq' };
  return { ...base, uplift, buffer: ceilingTo(uplift, mpq), status: 'ok' };
}

/**
 * DRC-9c [Proposed BL-205] — why a material at `level` carries no protection
 * buffer, or null when it does.
 * @param {number} level
 * @param {ProtectionBufferRules} [rules]
 * @param {boolean} [on]  PEX-13: the material's protection buffer switch (default on).
 * @returns {ProtectionExclusion | null}
 */
export function protectionExclusion(level, rules = PROTECTION_BUFFER_RULES, on = true) {
  // PEX-13 (BL-275) — the per-material switch, replacing the code constant `protectionUplift`.
  if (!on) return 'switchedOff';
  if (rules.levels.includes(level)) return null;
  // XLS Guidance revision: "level 4 tanpa protection buffer".
  if (level === 4) return 'level4';
  if (level >= 1 && level <= 3) return 'strategicLevel';
  return 'otherLevel';
}

/**
 * DRC-9c [Proposed BL-205, C3] — every supplier × material with LTP, with its
 * protection buffer per LTP month when its level carries one. Read only:
 * nothing is ordered from it, and ROP Fisik and Max do not include it.
 * @param {readonly NamedLtpLine[]} lines
 * @param {readonly ProtectionBufferInput[]} inputs
 * @param {{ rules?: ProtectionBufferRules }} [options]
 * @returns {ProtectionBufferRow[]}
 */
export function protectionBufferRows(lines, inputs, options = {}) {
  const rules = options.rules ?? PROTECTION_BUFFER_RULES;
  const byPair = new Map(inputs.map((i) => [`${i.supplierId}|${i.materialCode}`, i]));
  /** @type {Map<string, NamedLtpLine[]>} */
  const pairs = new Map();
  for (const l of lines) {
    const key = `${l.supplierId}|${l.materialCode}`;
    pairs.set(key, [...(pairs.get(key) ?? []), l]);
  }
  return [...pairs.entries()]
    .map(([key, mine]) => {
      const head = mine[0];
      const input = byPair.get(key);
      // [Default C2] a pair with no input is at the default level, with no MPQ.
      const level = input?.level ?? OSIP_RULES.defaultLevel;
      const mpq = input?.mpq ?? null;
      const reason = protectionExclusion(level, rules, input?.protectionOn !== false);
      /** @type {Set<string>} */
      const months = new Set();
      for (const l of mine)
        for (let m = monthOf(l.periodStart); m <= monthOf(l.periodEnd); m = addMonths(m, 1))
          months.add(m);
      return {
        supplierId: head.supplierId,
        supplierName: head.supplierName ?? head.supplierId,
        materialCode: head.materialCode,
        materialLabel: head.materialLabel ?? head.materialCode,
        uom: head.uom ?? '',
        level,
        levelSource: input?.levelSource ?? /** @type {const} */ ('default'),
        mpq,
        applies: reason === null,
        reason,
        months:
          reason === null
            ? [...months]
                .sort()
                .map((m) =>
                  protectionMonth(mine, head.supplierId, head.materialCode, m, mpq, rules)
                )
            : []
      };
    })
    .sort(
      (a, b) =>
        a.supplierName.localeCompare(b.supplierName) || a.materialCode.localeCompare(b.materialCode)
    );
}
