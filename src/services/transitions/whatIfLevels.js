// ─────────────────────────────────────────────────────────────────────────────
// WHAT-IF SANDBOX BY LEVEL — PEX-15 (BL-277), SC-HUB-PLAN-EXECUTION-REQUIREMENTS-
// 2026-11 section 3. Three levels, each its own tab [Proposed, PEX-D15]:
//   material   one supplier × material: the sandbox built today (DRC-17), plus
//              the LTP scenario presets.
//   fg         one finished good: the effect on every material in its BOM, and
//              the BOM constraint (BR-03).
//   supplier   one supplier: total demand vs confirmed capacity per month.
//
// SCENARIOS (BR-02): Baseline = LTP A, Festive = LTP Festive, Protection buffer =
// LTP B. No LTP C. A scenario whose series the hub does not hold is UNAVAILABLE,
// never estimated: LTP Festive and LTP B arrive with the LTP inputs of PEX-5
// (BL-267), so until they do only Baseline loads.
//
// Pure: plain data in, plain data out. Every quantity comes from the engine's
// own requirement run (`pegs`: the finished-good part of a material's gross
// requirement, with the BOM's scrap and yield already in it), so the BOM
// explosion is not recomputed here (design rule 1). Analysis only: nothing here
// writes a plan, a PO, a call-off or a setting.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { MaterialPlanView } from '../data/types' */
import { mondayOf, dayOf } from './inventoryRules';

/** The three levels, one tab each (BR-01), the sandbox built today first. */
export const WHAT_IF_LEVELS = Object.freeze(/** @type {const} */ (['material', 'fg', 'supplier']));
/** @typedef {(typeof WHAT_IF_LEVELS)[number]} WhatIfLevel */

/** The scenarios (BR-02), Baseline first. @type {readonly ['baseline', 'festive', 'protection']} */
export const LTP_SCENARIOS = Object.freeze(
  /** @type {const} */ (['baseline', 'festive', 'protection'])
);
/** @typedef {(typeof LTP_SCENARIOS)[number]} LtpScenario */

/** The LTP series each scenario reads. */
export const SCENARIO_SERIES = Object.freeze({
  baseline: 'A',
  festive: 'Festive',
  protection: 'B'
});

/**
 * One material's weekly LTP by series; a series the hub does not hold is null.
 * @typedef {{
 *   readonly A: readonly number[] | null;
 *   readonly Festive: readonly number[] | null;
 *   readonly B: readonly number[] | null;
 * }} LtpSeriesSet
 */

/**
 * BR-02 — the weekly LTP a scenario reads, or null when the hub does not hold it.
 * @param {LtpScenario} scenario
 * @param {LtpSeriesSet} series
 * @returns {readonly number[] | null}
 */
export const scenarioLtp = (scenario, series) => series[SCENARIO_SERIES[scenario]] ?? null;

/**
 * Which scenarios can load for a series set.
 * @param {LtpSeriesSet} series
 * @returns {{ readonly scenario: LtpScenario; readonly available: boolean }[]}
 */
export const scenarioAvailability = (series) =>
  LTP_SCENARIOS.map((scenario) => ({
    scenario,
    available: scenarioLtp(scenario, series) !== null
  }));

// ─── FG and BOM (BR-03) ─────────────────────────────────────────────────────

/**
 * The finished goods behind the requirement run's pegs, by name.
 * @param {readonly Pick<MaterialPlanView, 'weeks'>[]} materials
 * @param {Readonly<Record<string, string>>} names
 * @returns {{ readonly skuCode: string; readonly name: string }[]}
 */
export function fgOptions(materials, names) {
  const codes = new Set(
    materials.flatMap((m) => m.weeks.flatMap((w) => w.pegs.map((p) => p.skuCode)))
  );
  return [...codes].sort().map((skuCode) => ({ skuCode, name: names[skuCode] ?? skuCode }));
}

/**
 * Why a BOM constraint would be refused, or null when acceptable. The planner
 * enters the units a limiting material supports (BR-03): zero or more, whole.
 * @param {unknown} units
 * @returns {string | null}
 */
export const bomConstraintRefusal = (units) =>
  typeof units === 'number' && Number.isInteger(units) && units >= 0
    ? null
    : 'BOM_UNITS_INVALID: a whole number of units, 0 or more';

/**
 * One finished good's effect on every material of its BOM, with the BOM
 * constraint (BR-03): the FG production quantity of each week drops to `units`
 * when it is above it, and every material is recalculated from the lower
 * quantity. A material's part for one FG unit is the engine's own (the peg's
 * quantity ÷ its FG quantity), so scrap and yield stay in.
 *
 * `weeks`: the FG weeks (Mondays) the requirement run pegs the FG to.
 * `fgDemand` / `fgProduced`: per week, before and after the constraint.
 * `base` / `recalculated`: per material and week, in the material's unit.
 * `limiting`: the material the planner named as limiting, if any.
 *
 * @typedef {{
 *   readonly skuCode: string;
 *   readonly weeks: readonly string[];
 *   readonly fgDemand: readonly number[];
 *   readonly fgProduced: readonly number[];
 *   readonly constrained: boolean;
 *   readonly materials: readonly {
 *     readonly materialCode: string;
 *     readonly label: string;
 *     readonly uom: string;
 *     readonly limiting: boolean;
 *     readonly base: readonly number[];
 *     readonly recalculated: readonly number[];
 *     readonly baseTotal: number;
 *     readonly recalculatedTotal: number;
 *   }[];
 * }} FgBomView
 */

/**
 * @param {{
 *   materials: readonly Pick<MaterialPlanView, 'materialCode' | 'materialLabel' | 'uom' | 'weeks'>[];
 *   skuCode: string;
 *   units?: number | null;
 *   limitingMaterial?: string | null;
 * }} input  `units` null or absent: no constraint.
 * @returns {FgBomView}
 */
export function fgBomView({ materials, skuCode, units = null, limitingMaterial = null }) {
  /** @type {Map<string, number>} FG week → FG quantity. */
  const demand = new Map();
  for (const m of materials)
    for (const w of m.weeks)
      for (const p of w.pegs) if (p.skuCode === skuCode) demand.set(p.fgWeek, p.fgQuantity);
  const weeks = [...demand.keys()].sort();
  const fgDemand = weeks.map((w) => demand.get(w) ?? 0);
  const fgProduced = fgDemand.map((q) => (units === null ? q : Math.min(q, units)));
  const rows = materials
    .map((m) => {
      /** @type {number[]} */
      const base = weeks.map(() => 0);
      /** @type {number[]} */
      const recalculated = weeks.map(() => 0);
      let any = false;
      for (const w of m.weeks)
        for (const p of w.pegs) {
          if (p.skuCode !== skuCode) continue;
          const i = weeks.indexOf(p.fgWeek);
          if (i < 0) continue;
          any = true;
          base[i] += p.quantity;
          recalculated[i] += p.fgQuantity > 0 ? (p.quantity * fgProduced[i]) / p.fgQuantity : 0;
        }
      return any
        ? {
            materialCode: m.materialCode,
            label: m.materialLabel,
            uom: m.uom,
            limiting: m.materialCode === limitingMaterial,
            base,
            recalculated,
            baseTotal: base.reduce((a, b) => a + b, 0),
            recalculatedTotal: recalculated.reduce((a, b) => a + b, 0)
          }
        : null;
    })
    .filter((r) => r !== null)
    .sort((a, b) => a.materialCode.localeCompare(b.materialCode));
  return {
    skuCode,
    weeks,
    fgDemand,
    fgProduced,
    constrained: units !== null && fgProduced.some((q, i) => q < fgDemand[i]),
    materials: /** @type {FgBomView['materials']} */ (rows)
  };
}

// ─── Supplier (BR-01 level 3) ───────────────────────────────────────────────

/**
 * One supplier's month: PTI demand (the LTP) against the capacity the supplier
 * confirmed. `utilisation` (PEX-4 BR-02) = demand ÷ confirmed capacity, as a
 * percentage, over the weeks of the month that have a confirmation; null when
 * none has one (PEX-4 BR-06: "no capacity confirmed", never 0%).
 * @typedef {{
 *   readonly month: string;
 *   readonly weeks: number;
 *   readonly weeksConfirmed: number;
 *   readonly demand: number;
 *   readonly confirmedDemand: number;
 *   readonly capacity: number | null;
 *   readonly utilisation: number | null;
 * }} SupplierMonth
 */

/**
 * @param {readonly { readonly supplierId: string; readonly weeks: readonly { readonly week: string; readonly demand: number; readonly entry: { readonly allocated: number } | null }[] }[]} plans
 *   The capacity plans (supplier × planning group, weekly).
 * @param {string} supplierId
 * @returns {SupplierMonth[]}
 */
export function supplierMonths(plans, supplierId) {
  /** @type {Map<string, { weeks: Set<string>; confirmed: Set<string>; demand: number; confirmedDemand: number; capacity: number }>} */
  const byMonth = new Map();
  for (const plan of plans.filter((p) => p.supplierId === supplierId))
    for (const w of plan.weeks) {
      const month = mondayOf(dayOf(w.week)).slice(0, 7);
      const m = byMonth.get(month) ?? {
        weeks: new Set(),
        confirmed: new Set(),
        demand: 0,
        confirmedDemand: 0,
        capacity: 0
      };
      m.weeks.add(w.week);
      m.demand += w.demand;
      if (w.entry) {
        m.confirmed.add(w.week);
        m.confirmedDemand += w.demand;
        m.capacity += w.entry.allocated;
      }
      byMonth.set(month, m);
    }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, m]) => ({
      month,
      weeks: m.weeks.size,
      weeksConfirmed: m.confirmed.size,
      demand: m.demand,
      confirmedDemand: m.confirmedDemand,
      capacity: m.confirmed.size === 0 ? null : m.capacity,
      utilisation:
        m.confirmed.size === 0 || m.capacity <= 0
          ? null
          : Math.round((m.confirmedDemand / m.capacity) * 1000) / 10
    }));
}
