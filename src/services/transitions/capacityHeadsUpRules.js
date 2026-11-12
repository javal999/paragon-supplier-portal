// ─────────────────────────────────────────────────────────────────────────────
// BL-269 — CAPACITY HEADS-UP (PEX-4), SC-HUB-PLAN-EXECUTION-REQUIREMENTS-2026-11.
//
// 12 months from the current month (BR-01). Weeks 1–13 keep the weekly entry
// built today; months beyond are entered by month [Proposed]. A month's figures:
//
//   weekly month   every Monday of the month that is not yet past lies inside
//                  the 13 weekly buckets: capacity = the sum of those weeks'
//                  confirmed capacity, demand = the sum of the same weeks'
//                  demand (`weeklyDemand`, the chosen LTP of PEX-5, spread by day).
//   monthly month  any other: capacity = the supplier's monthly entry; demand =
//                  the sum of the weekly demand of the month's Mondays.
//   no capacity    a month with no confirmed capacity is "No capacity
//                  confirmed", never 0% (BR-06).
//
//   Utilisation(month) = demand ÷ confirmed capacity, a percentage     (BR-02,
//   PEX-D13, [Proposed]). It is shown rounded DOWN, so a month under 70% never
//   reads "70%": demand 700 on 1,000 reads 70%, green; 690 reads 69%, under-used
//   (AC-01).
//
// Bands (BR-04): the built LTP vs capacity bands stay (within, needs additional,
// cannot supply, from `ltpCapacityLevel` on the month's capacity and BE), and a
// month under 70% is `underUsed` — "needs attention" — drawn with a neutral blue
// outline, not amber, so it does not read as a supply risk [Proposed]. A month
// is `underUsed` only when it would otherwise be within.
//
// Breakdown (BR-03, BR-07): capacity is confirmed per planning group, so a
// material's utilisation = the material's demand ÷ the GROUP's capacity and the
// materials of a group add up to the group figure. A material's demand splits to
// brands by each brand's share of the material's BOM demand in THAT month
// (PEX-D26, BL-295, owner ruling 2026-11-12); the shares are passed in
// (`brandShares(materialCode, month)`). Only the per-brand rows read them.
//
// Pure: plans, monthly entries and demand in, rows out. The 70% is the doc's;
// it lives once, here.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays, dayOf, mondayOf } from './inventoryRules';
import { beOf, ltpCapacityLevel } from './capacityRules';
/** @import { CapacityPlan } from '../data/types' */
/** @import { LtpCapacityLevel } from './capacityRules' */

/** PEX-4 BR-01 / BR-04 — the horizon and the under-used line. */
export const CAPACITY_HEADS_UP_RULES = Object.freeze({
  months: 12,
  /** A month below this utilisation (percent) is under-used, needs attention [M04 1]. */
  underUsedBelowPct: 70
});

/** The five bands, worst first. @typedef {LtpCapacityLevel | 'underUsed'} HeadsUpBand */

/** @param {string} day @returns {string} YYYY-MM */
const monthOf = (day) => day.slice(0, 7);

/**
 * The month `n` months after `month`.
 * @param {string} month YYYY-MM
 * @param {number} n
 * @returns {string}
 */
export function addMonths(month, n) {
  const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + n;
  return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/**
 * The 12 months from the current one.
 * @param {string} nowIso
 * @param {number} [count]
 * @returns {string[]}
 */
export function headsUpMonths(nowIso, count = CAPACITY_HEADS_UP_RULES.months) {
  const first = monthOf(dayOf(nowIso));
  return Array.from({ length: count }, (_, i) => addMonths(first, i));
}

/**
 * The Mondays of a month that are not before `firstMonday` (the current week).
 * @param {string} month YYYY-MM
 * @param {string} firstMonday
 * @returns {string[]}
 */
export function mondaysOfMonth(month, firstMonday) {
  /** @type {string[]} */
  const out = [];
  let d = mondayOf(`${month}-01`);
  if (monthOf(d) !== month) d = addDays(d, 7);
  for (; monthOf(d) === month; d = addDays(d, 7)) if (d >= firstMonday) out.push(d);
  return out;
}

/**
 * Utilisation as a whole percent rounded down; null with no confirmed capacity
 * (BR-06). Zero capacity reads as no capacity.
 * @param {number} demand
 * @param {number | null} capacity
 * @returns {number | null}
 */
export function utilisationPct(demand, capacity) {
  if (capacity === null || !(capacity > 0)) return null;
  return Math.floor((demand / capacity) * 100);
}

/**
 * The band of a month (BR-04). `be` is capacity + additional capacity.
 * @param {number} demand
 * @param {{ capacity: number; be: number } | null} cap
 * @returns {HeadsUpBand}
 */
export function headsUpBand(demand, cap) {
  if (cap === null || !(cap.capacity > 0)) return 'unconfirmed';
  const level = ltpCapacityLevel(demand, {
    allocated: cap.capacity,
    upside: cap.be - cap.capacity
  });
  if (
    level === 'within' &&
    (demand / cap.capacity) * 100 < CAPACITY_HEADS_UP_RULES.underUsedBelowPct
  )
    return 'underUsed';
  return level;
}

/**
 * A supplier's monthly capacity entry for one planning group.
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly planningGroupId: string;
 *   readonly submittedAt: string;
 *   readonly id: string;
 *   readonly months: readonly { readonly month: string; readonly allocated: number; readonly upside?: number }[];
 * }} CapacityMonthSubmission
 */

/**
 * The monthly entry in force for a month: the latest submission that states it.
 * @param {readonly CapacityMonthSubmission[]} submissions
 * @param {string} supplierId
 * @param {string} planningGroupId
 * @param {string} month
 * @returns {{ allocated: number; upside: number } | null}
 */
export function monthlyEntry(submissions, supplierId, planningGroupId, month) {
  const mine = submissions
    .filter((s) => s.supplierId === supplierId && s.planningGroupId === planningGroupId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id));
  for (const s of mine) {
    const m = s.months.find((x) => x.month === month);
    if (m) return { allocated: m.allocated, upside: m.upside ?? 0 };
  }
  return null;
}

/**
 * Why a monthly submission is refused, or null: every month named is within the
 * headroom the weekly entry does not cover (month 4 onward are entered by
 * month), has a capacity of 0 or more, an additional capacity of 0 or more.
 * @param {unknown} months
 * @param {readonly string[]} allowed the months a monthly entry may state
 * @returns {string | null}
 */
export function capacityMonthRefusal(months, allowed) {
  if (!Array.isArray(months) || months.length === 0)
    return 'MONTHS_REQUIRED: state at least one month';
  const seen = new Set();
  for (const m of months) {
    const month = /** @type {{ month?: unknown }} */ (m)?.month;
    if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month))
      return 'MONTH_INVALID: a month is YYYY-MM';
    if (!allowed.includes(month)) return `MONTH_NOT_ENTERED_BY_MONTH: ${month}`;
    if (seen.has(month)) return `MONTH_TWICE: ${month}`;
    seen.add(month);
    const { allocated, upside } = /** @type {{ allocated?: unknown; upside?: unknown }} */ (m);
    if (typeof allocated !== 'number' || !Number.isFinite(allocated) || allocated < 0)
      return `CAPACITY_INVALID: ${month}`;
    if (
      upside !== undefined &&
      (typeof upside !== 'number' || !Number.isFinite(upside) || upside < 0)
    )
      return `UPSIDE_INVALID: ${month}`;
  }
  return null;
}

/**
 * Whether a month is entered by month: not every one of its not-yet-past
 * Mondays lies inside the weekly buckets, or it has none.
 * @param {string} month
 * @param {readonly string[]} horizon the 13 weekly Mondays
 * @returns {boolean}
 */
export function isMonthlyEntryMonth(month, horizon) {
  const mondays = mondaysOfMonth(month, horizon[0]);
  return mondays.length === 0 || mondays.some((w) => !horizon.includes(w));
}

/**
 * One month of a group: capacity, BE, demand, utilisation and band.
 * `source`: where the capacity came from.
 * @typedef {{
 *   readonly month: string;
 *   readonly source: 'weekly' | 'monthly' | null;
 *   readonly capacity: number | null;
 *   readonly be: number | null;
 *   readonly demand: number;
 *   readonly utilisationPct: number | null;
 *   readonly band: HeadsUpBand;
 * }} HeadsUpMonth
 */

/**
 * @typedef {{
 *   readonly month: string;
 *   readonly demand: number;
 *   readonly utilisationPct: number | null;
 * }} HeadsUpShare
 */

/**
 * `byMaterial` / `byBrand`: BR-03; utilisation = the part's demand ÷ the GROUP's
 * capacity (BR-07).
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly planningGroupId: string;
 *   readonly uom: string;
 *   readonly materials: readonly string[];
 *   readonly months: readonly HeadsUpMonth[];
 *   readonly byMaterial: readonly { readonly materialCode: string; readonly months: readonly HeadsUpShare[] }[];
 *   readonly byBrand: readonly { readonly brand: string; readonly months: readonly HeadsUpShare[] }[];
 * }} HeadsUpPlan
 */

/** The brand a material with no BOM demand is shown under. */
export const NO_BRAND = 'No brand on record';

/**
 * PEX-4 — every supplier × planning group's 12 months.
 * @param {{
 *   readonly plans: readonly CapacityPlan[];
 *   readonly submissions: readonly CapacityMonthSubmission[];
 *   readonly weeklyDemand: (supplierId: string, materialCode: string, week: string) => number;
 *   readonly brandShares: (materialCode: string, month: string) => ReadonlyMap<string, number>;
 *   readonly nowIso: string;
 * }} input
 * @returns {HeadsUpPlan[]}
 */
export function buildHeadsUp({ plans, submissions, weeklyDemand, brandShares, nowIso }) {
  const horizon = plans[0]?.weeks.map((w) => w.week) ?? [];
  const firstMonday = mondayOf(dayOf(nowIso));
  const months = headsUpMonths(nowIso);
  return plans.map((plan) => {
    /** @param {string} material @param {string} month */
    const materialDemand = (material, month) =>
      mondaysOfMonth(month, firstMonday).reduce(
        (n, w) => n + weeklyDemand(plan.supplierId, material, w),
        0
      );
    /** @type {HeadsUpMonth[]} */
    const out = months.map((month) => {
      const mondays = mondaysOfMonth(month, firstMonday);
      const demand = plan.materials.reduce((n, m) => n + materialDemand(m, month), 0);
      /** @type {{ capacity: number; be: number } | null} */
      let cap = null;
      /** @type {'weekly' | 'monthly' | null} */
      let source = null;
      if (!isMonthlyEntryMonth(month, horizon)) {
        const entries = mondays.map((w) => plan.weeks.find((x) => x.week === w)?.entry ?? null);
        if (entries.length > 0 && entries.every((e) => e !== null)) {
          const rows = /** @type {NonNullable<(typeof entries)[number]>[]} */ (entries);
          cap = {
            capacity: rows.reduce((n, e) => n + e.allocated, 0),
            be: rows.reduce((n, e) => n + beOf(e), 0)
          };
          source = 'weekly';
        }
      } else {
        const e = monthlyEntry(submissions, plan.supplierId, plan.planningGroupId, month);
        if (e) {
          cap = { capacity: e.allocated, be: e.allocated + e.upside };
          source = 'monthly';
        }
      }
      return {
        month,
        source,
        capacity: cap ? cap.capacity : null,
        be: cap ? cap.be : null,
        demand,
        utilisationPct: utilisationPct(demand, cap ? cap.capacity : null),
        band: headsUpBand(demand, cap)
      };
    });
    /** @param {number} demand @param {number | null} capacity @param {string} month @returns {HeadsUpShare} */
    const share = (demand, capacity, month) => ({
      month,
      demand,
      utilisationPct: utilisationPct(demand, capacity)
    });
    const byMaterial = plan.materials.map((materialCode) => ({
      materialCode,
      months: out.map((m) => share(materialDemand(materialCode, m.month), m.capacity, m.month))
    }));
    /** @type {Map<string, number[]>} */
    const brandDemand = new Map();
    for (const materialCode of plan.materials) {
      months.forEach((month, i) => {
        // PEX-D26 — the brand share of this month, not one share for all 12.
        const shares = brandShares(materialCode, month);
        const split = shares.size > 0 ? [...shares.entries()] : [[NO_BRAND, 1]];
        const demand = materialDemand(materialCode, month);
        for (const [brand, part] of /** @type {[string, number][]} */ (split)) {
          const series = brandDemand.get(brand) ?? /** @type {number[]} */ (months.map(() => 0));
          series[i] += demand * part;
          brandDemand.set(brand, series);
        }
      });
    }
    const byBrand = [...brandDemand.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([brand, series]) => ({
        brand,
        months: out.map((m, i) => share(Math.round(series[i]), m.capacity, m.month))
      }));
    return {
      supplierId: plan.supplierId,
      supplierName: plan.supplierName,
      planningGroupId: plan.planningGroupId,
      uom: plan.uom,
      materials: plan.materials,
      months: out,
      byMaterial,
      byBrand
    };
  });
}

/**
 * PEX-4 BR-05 — a slice-and-dice treemap: each item's area is proportional to
 * its `size`, in a `width` × `height` box. Items with no size are left out.
 * Pure geometry; the page draws it.
 * @template {{ size: number }} T
 * @param {readonly T[]} items
 * @param {number} width
 * @param {number} height
 * @returns {(T & { x: number; y: number; w: number; h: number })[]}
 */
export function treemapLayout(items, width, height) {
  const drawn = items.filter((i) => i.size > 0).sort((a, b) => b.size - a.size);
  /** @type {(T & { x: number; y: number; w: number; h: number })[]} */
  const out = [];
  /** @param {typeof drawn} list @param {number} x @param {number} y @param {number} w @param {number} h @param {boolean} horizontal */
  const place = (list, x, y, w, h, horizontal) => {
    if (list.length === 0) return;
    if (list.length === 1) {
      out.push({ ...list[0], x, y, w, h });
      return;
    }
    const total = list.reduce((n, i) => n + i.size, 0);
    const [head, ...rest] = list;
    const part = head.size / total;
    if (horizontal) {
      out.push({ ...head, x, y, w: w * part, h });
      place(rest, x + w * part, y, w * (1 - part), h, false);
    } else {
      out.push({ ...head, x, y, w, h: h * part });
      place(rest, x, y + h * part, w, h * (1 - part), true);
    }
  };
  place(drawn, 0, 0, width, height, width >= height);
  return out;
}
