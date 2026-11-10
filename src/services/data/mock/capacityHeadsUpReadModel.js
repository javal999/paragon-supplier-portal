// ────────────────────────────────────────────────────────────────────────────
// BL-269 (PEX-4) — the capacity heads-up read model: every supplier × planning
// group's 12 months, over the mock stores. ONE place gathers the inputs and
// hands them to the pure rules (`capacityHeadsUpRules`):
//   · capacity — the weekly plans (`allCapacityPlans`) and the supplier's
//     monthly entries (`capacityMonthStore`);
//   · demand — the LTP the demand anticipation reads (PEX-5): the chosen LTP
//     series per material when LTP inputs are uploaded (split to suppliers by
//     the CAP-D11 share), else the forecast lines, spread by day per week;
//   · brands — each material's demand by finished good through the BOM (the
//     engine's pegs over a 52-week run), grouped by the finished good's brand
//     [Proposed]. One share per material for all months.
// Computed at read, never stored (law 0.5).
// ────────────────────────────────────────────────────────────────────────────

/** @import { HeadsUpPlan } from '../../transitions/capacityHeadsUpRules' */
import { sdcClock, materialEntry } from '../../sdc';
import { dayOf } from '../../engine/dates';
import { defaultRequirementOptions, materialRequirement } from '../../engine/requirement';
import { groupWeekLtp } from '../../transitions/capacityRules';
import { mondayOf, addDays } from '../../transitions/inventoryRules';
import { hubWeeks, materialShares } from '../../transitions/demandAnticipationRules';
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
 * Each material's share of BOM demand by brand over the engine's run.
 * @param {string} nowIso
 * @returns {(materialCode: string) => Map<string, number>}
 */
export function brandSharesAt(nowIso) {
  const data = engineDataset();
  const brandOf = new Map(data.finishedGoods.map((f) => [f.skuCode, f.brand]));
  const run = materialRequirement(data, {
    ...defaultRequirementOptions(dayOf(nowIso)),
    horizonWeeks: HEADS_UP_WEEKS
  });
  /** @type {Map<string, Map<string, number>>} */
  const byMaterial = new Map();
  for (const m of run.materials) {
    /** @type {Map<string, number>} */
    const brands = new Map();
    for (const w of m.weeks)
      for (const p of w.pegs) {
        const brand = brandOf.get(p.skuCode);
        if (brand) brands.set(brand, (brands.get(brand) ?? 0) + p.quantity);
      }
    const total = [...brands.values()].reduce((n, v) => n + v, 0);
    byMaterial.set(
      m.materialCode,
      new Map(total > 0 ? [...brands.entries()].map(([b, q]) => [b, q / total]) : [])
    );
  }
  return (materialCode) => byMaterial.get(materialCode) ?? new Map();
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
      const share = inputs.hasUpload
        ? (materialShares(
            lines,
            materialCode,
            suppliers.length ? suppliers : [supplierId],
            window
          ).get(supplierId) ?? 0)
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
