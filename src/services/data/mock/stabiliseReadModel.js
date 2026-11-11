// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-06 — the engine's plan versions, replayed, as the stabiliser's input.
//
// No plan has ever been published from the engine, so the versions a supplier
// would have seen are REPLAYED (ENG-B30): the E14-04 → E14-03 chain run as of
// each of the last `REPLAY_WEEKS` Mondays-apart days and today, on the dataset
// as it stands (the ENG-B17 shape: last week's inputs on today's record of
// them). Packaging is published weekly, raw material monthly (REQ-E06-01
// BR-02, X-04), so raw material keeps every fourth version.
//
// Each version's quantity per supplier × material × week is the material's net
// requirement lot-for-lot, split by the supplier's source share (ENG-B29). The
// zones come from REQ-E06-01 BR-05 (`zoneLengthsFor`), the Firm zone at least
// the lead time. The MASC scale is E14-02's own: the seasonal-naive MAE of the
// supplier's share of the material's weekly requirement over the sales history.
//
// The values in force (the damping weight, safety stock targets) are read by
// the SERVICE and passed in — this module reads no setting (BL-32, X-05).
// ─────────────────────────────────────────────────────────────────────────────

import { grossRequirement } from '../../engine/bom';
import { addDays, mondayOf } from '../../engine/dates';
import { seasonalNaiveScale } from '../../engine/reliability';
/** @import { MaterialRequirementRun } from '../../engine/requirement' */
import { defaultRequirementOptions, materialRequirement } from '../../engine/requirement';
/** @import { SafetyStockRun } from '../../engine/safetyStock' */
import { requirementInputs } from '../../engine/safetyStock';
/** @import { SeriesInput, VersionInput } from '../../engine/stabilise' */
import { lotForLotNeed } from '../../engine/stabilise';
/** @import { EngineDataset, IsoDate, IsoInstant, WarehouseKind } from '../../engine/types' */
import { STREAM_MATERIAL_TYPE, zoneLengthsFor } from '../../transitions/forecastConfig';

/** Weeks replayed before today: 13 versions, the same depth as E14-02's plan history. */
export const REPLAY_WEEKS = 12;

/**
 * Weeks between two versions of a stream (REQ-E06-01 BR-02: weekly packaging, monthly raw material).
 * @type {Readonly<Record<WarehouseKind, number>>}
 */
export const VERSION_STEP_WEEKS = Object.freeze({ packaging: 1, rawMaterial: 4 });

/**
 * The version days of a stream, oldest first, ending today.
 * @param {IsoDate} asOf
 * @param {WarehouseKind} kind
 * @returns {IsoDate[]}
 */
export function versionDays(asOf, kind) {
  const step = VERSION_STEP_WEEKS[kind];
  /** @type {IsoDate[]} */
  const out = [];
  for (let k = REPLAY_WEEKS - (REPLAY_WEEKS % step); k >= 0; k -= step)
    out.push(addDays(asOf, -7 * k));
  return out;
}

/**
 * `current`:  Today's E14-03 run (the finished-goods plan it used, the weeks).
 *
 * @typedef {{
 *   readonly inputs: SeriesInput[];
 *   readonly current: MaterialRequirementRun;
 * }} ReplayResult
 */

/**
 * The engine's versions per supplier × material, ready for `stabilisePlan`.
 * @param {EngineDataset} data
 * @param {IsoDate} asOf
 * @param {(asOf: IsoDate) => SafetyStockRun} safetyStockAt
 * @returns {ReplayResult}
 */
export function stabiliseInputs(data, asOf, safetyStockAt) {
  const days = [
    ...new Set([...versionDays(asOf, 'packaging'), ...versionDays(asOf, 'rawMaterial')])
  ].sort();
  const runs = /** @type {Map<IsoDate, MaterialRequirementRun>} */ (
    new Map(
      days.map((d) => [
        d,
        materialRequirement(data, {
          ...defaultRequirementOptions(d),
          ...requirementInputs(safetyStockAt(d))
        })
      ])
    )
  );
  const current = /** @type {MaterialRequirementRun} */ (runs.get(asOf));

  // E14-02's scale: the requirement the sales history implies, before this week.
  const requirement = grossRequirement(
    data.sales.filter((s) => s.weekStart <= asOf),
    data.bom
  );
  const thisWeek = mondayOf(asOf);
  const historyWeeks = [...new Set(data.sales.map((s) => s.weekStart))]
    .filter((d) => d < thisWeek)
    .sort();

  /** @type {SeriesInput[]} */
  const inputs = [];
  for (const m of current.materials) {
    const master = data.materials.find((x) => x.materialCode === m.materialCode);
    for (const src of data.sources
      .filter((s) => s.materialCode === m.materialCode)
      .sort((a, b) => a.supplierId.localeCompare(b.supplierId))) {
      const zones = zoneLengthsFor(
        src.supplierId,
        master?.materialGroup ?? m.materialCode,
        STREAM_MATERIAL_TYPE[m.kind],
        m.materialCode
      );
      /** @type {VersionInput[]} */
      const versions = versionDays(asOf, m.kind).map((d) => {
        const plan = /** @type {MaterialRequirementRun} */ (runs.get(d)).materials.find(
          (x) => x.materialCode === m.materialCode
        );
        const need = plan
          ? lotForLotNeed(
              plan.startStock,
              plan.weeks.map((w) => w.gross),
              plan.weeks.map((w) => w.receipts),
              plan.safetyStock
            )
          : [];
        return {
          asOf: d,
          raw: new Map(
            (plan?.weeks ?? []).map(
              (w, i) => /** @type {const} */ ([w.weekStart, need[i] * src.share])
            )
          )
        };
      });
      const series = historyWeeks.map(
        (d) => (requirement.get(m.materialCode)?.get(d) ?? 0) * src.share
      );
      inputs.push({
        supplierId: src.supplierId,
        materialCode: m.materialCode,
        kind: m.kind,
        terms: {
          firmDays: Math.max(zones.firmDays, src.leadTimeDays),
          tradeOffDays: zones.tradeOffDays,
          leadTimeDays: src.leadTimeDays
        },
        scale: seasonalNaiveScale(series),
        versions
      });
    }
  }
  return { inputs, current };
}

/**
 * ENG-B33 — SAP's published plan history (the stand-in E14-02 measures PTI's
 * plan change on), as the stabiliser's input: every version the dataset holds
 * published by `now`, per supplier × material, with the same zones and scale.
 * It answers "what would stabilising have done to the plan suppliers saw?".
 * @param {EngineDataset} data
 * @param {IsoInstant} now
 * @param {readonly SeriesInput[]} engine
 * @returns {SeriesInput[]}
 */
export function planHistoryInputs(data, now, engine) {
  const byKey = /** @type {Map<string, SeriesInput>} */ (
    new Map(engine.map((s) => [`${s.supplierId}|${s.materialCode}`, s]))
  );
  const grouped = /** @type {Map<string, Map<string, Map<IsoDate, number>>>} */ (new Map());
  for (const v of data.planVersions) {
    const key = `${v.supplierId}|${v.materialCode}`;
    if (!byKey.has(key) || v.publishedAt > now) continue;
    const versions =
      grouped.get(key) ?? /** @type {Map<string, Map<IsoDate, number>>} */ (new Map());
    const day = v.publishedAt.slice(0, 10);
    const periods = versions.get(day) ?? /** @type {Map<IsoDate, number>} */ (new Map());
    periods.set(v.periodBucket, v.quantity);
    versions.set(day, periods);
    grouped.set(key, versions);
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, versions]) => {
      const s = /** @type {SeriesInput} */ (byKey.get(key));
      return {
        ...s,
        versions: [...versions.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([asOf, raw]) => ({ asOf, raw }))
      };
    });
}
