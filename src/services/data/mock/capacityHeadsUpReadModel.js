// ────────────────────────────────────────────────────────────────────────────
// BL-269 (PEX-4) — the capacity heads-up read model: every supplier × planning
// group's 12 months, over the mock stores. ONE place gathers the inputs and
// hands them to the pure rules (`capacityHeadsUpRules`):
//   · capacity — the weekly plans (`allCapacityPlans`) and the supplier's
//     monthly entries (`capacityMonthStore`);
//   · demand — the LTP the demand anticipation reads (PEX-5): the chosen LTP
//     series per material when LTP inputs are uploaded (split to suppliers by
//     the sourcing share on record, PEX-D25 / BL-293; the LTP share over the
//     first 4 hub weeks only when the material has none), else the forecast
//     lines, spread by day per week;
//   · brands — each material's demand by finished good through the BOM (the
//     engine's gross requirement pegs over a 56-week run), grouped by the
//     finished good's brand, recomputed per month (PEX-D26 / BL-295, owner
//     ruling 2026-11-12). A month whose weeks carry no peg reads the material's
//     share over the whole run [my call].
// Computed at read, never stored (law 0.5).
// ────────────────────────────────────────────────────────────────────────────

/** @import { HeadsUpPlan } from '../../transitions/capacityHeadsUpRules' */
import { sdcClock, materialEntry } from '../../sdc';
import { dayOf } from '../../engine/dates';
import { defaultRequirementOptions, materialRequirement } from '../../engine/requirement';
import { groupWeekLtp } from '../../transitions/capacityRules';
import { mondayOf, addDays } from '../../transitions/inventoryRules';
import { hubWeeks, ltpSplitShares } from '../../transitions/demandAnticipationRules';
import { ltpWeeks, materialLtpInputs } from '../../transitions/ltpInputRules';
import { buildHeadsUp } from '../../transitions/capacityHeadsUpRules';
import { allCapacityPlans } from './inventoryReadModel';
import { allCommitmentLines } from './forecastReadModel';
import { engineDataset } from './fixtures/engineDataset';
import { capacityMonthStore } from './stores/capacityMonthStore';
import { ltpInputStore } from './stores/ltpInputStore';

/** Weeks the heads-up looks ahead: 12 months plus a month's slack. */
const HEADS_UP_WEEKS = 56;

/**
 * PEX-D26 (BL-295) — each material's share of BOM demand by brand, per month:
 * the engine's gross requirement pegs of the weeks whose Monday falls in the
 * month. A month with no peg reads the share over the whole run; a material
 * with no peg at all reads none ("No brand on record").
 * @param {string} nowIso
 * @returns {(materialCode: string, month: string) => Map<string, number>}
 */
export function brandSharesAt(nowIso) {
  const data = engineDataset();
  const brandOf = new Map(data.finishedGoods.map((f) => [f.skuCode, f.brand]));
  const run = materialRequirement(data, {
    ...defaultRequirementOptions(dayOf(nowIso)),
    horizonWeeks: HEADS_UP_WEEKS
  });
  /** @param {Map<string, number>} brands @returns {Map<string, number>} */
  const toShares = (brands) => {
    const total = [...brands.values()].reduce((n, v) => n + v, 0);
    return new Map(total > 0 ? [...brands.entries()].map(([b, q]) => [b, q / total]) : []);
  };
  /** @type {Map<string, { whole: Map<string, number>; byMonth: Map<string, Map<string, number>> }>} */
  const byMaterial = new Map();
  for (const m of run.materials) {
    /** @type {Map<string, number>} */
    const whole = new Map();
    /** @type {Map<string, Map<string, number>>} */
    const months = new Map();
    for (const w of m.weeks) {
      const month = w.weekStart.slice(0, 7);
      const inMonth = months.get(month) ?? new Map();
      for (const p of w.pegs) {
        const brand = brandOf.get(p.skuCode);
        if (!brand) continue;
        whole.set(brand, (whole.get(brand) ?? 0) + p.quantity);
        inMonth.set(brand, (inMonth.get(brand) ?? 0) + p.quantity);
      }
      months.set(month, inMonth);
    }
    byMaterial.set(m.materialCode, {
      whole: toShares(whole),
      byMonth: new Map([...months.entries()].map(([k, v]) => [k, toShares(v)]))
    });
  }
  return (materialCode, month) => {
    const entry = byMaterial.get(materialCode);
    if (!entry) return new Map();
    const inMonth = entry.byMonth.get(month);
    return inMonth && inMonth.size > 0 ? inMonth : entry.whole;
  };
}

/**
 * @typedef {HeadsUpPlan & { readonly materialLabels: Readonly<Record<string, string>> }} HeadsUpRow
 */

/**
 * The 12-month heads-up for every supplier × planning group.
 * @param {string} [nowIso]
 * @returns {HeadsUpRow[]}
 */
export function allCapacityHeadsUp(nowIso = sdcClock.now()) {
  const plans = allCapacityPlans(nowIso);
  const lines = allCommitmentLines(null);
  const first = mondayOf(dayOf(nowIso));
  const weeks = Array.from({ length: HEADS_UP_WEEKS }, (_, i) => addDays(first, i * 7));
  const window = hubWeeks(nowIso, 4);
  const ltpRows = ltpInputStore.all();
  const { sources } = engineDataset();
  /** @type {Map<string, Map<string, number>>} */
  const demand = new Map();
  /** @type {Map<string, string[]>} */
  const suppliersOf = new Map();
  for (const l of lines) {
    const list = suppliersOf.get(l.materialCode) ?? [];
    if (!list.includes(l.supplierId)) suppliersOf.set(l.materialCode, [...list, l.supplierId]);
  }
  /** @param {string} supplierId @param {string} materialCode @param {string} week */
  const weeklyDemand = (supplierId, materialCode, week) => {
    const key = `${supplierId}|${materialCode}`;
    let series = demand.get(key);
    if (!series) {
      const source = weeks.map((w) => groupWeekLtp(lines, supplierId, [materialCode], w));
      const inputs = materialLtpInputs(ltpRows, materialCode);
      const suppliers = [...(suppliersOf.get(materialCode) ?? [])].sort();
      // PEX-D25 (BL-293) — the sourcing share on record; the LTP share only without one.
      const share = inputs.hasUpload
        ? (ltpSplitShares(
            sources,
            lines,
            materialCode,
            suppliers.length ? suppliers : [supplierId],
            window
          ).shares.get(supplierId) ?? 0)
        : 0;
      const used = inputs.hasUpload ? ltpWeeks(weeks, source, inputs, share).used : source;
      series = new Map(weeks.map((w, i) => [w, used[i]]));
      demand.set(key, series);
    }
    return series.get(week) ?? 0;
  };
  const rows = buildHeadsUp({
    plans,
    submissions: capacityMonthStore.all(),
    weeklyDemand,
    brandShares: brandSharesAt(nowIso),
    nowIso
  });
  return rows.map((r) => ({
    ...r,
    materialLabels: Object.fromEntries(r.materials.map((m) => [m, materialEntry(m)?.label ?? m]))
  }));
}
