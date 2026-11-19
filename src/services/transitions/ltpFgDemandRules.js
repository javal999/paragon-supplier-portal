// ─────────────────────────────────────────────────────────────────────────────
// LTP VS FINISHED-GOODS DEMAND, AND THE CONSUMPTION MOVING AVERAGE — DRC-18
// (BL-203), SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10 §3 and §4 (A11).
//
// Per supplier × material × week, beside the LTP the demand anticipation grid
// already shows:
//
//   FG demand          = round(material gross requirement(w) × share)
//                        The material's gross requirement is the forecast
//                        engine's (REQ-E14-03): the finished-goods plan and
//                        sales orders exploded through the BOM. `share` is the
//                        supplier's share the page already shows (CAP-D11).
//   LTP − FG demand    = LTP(w) − FG demand(w)
//   Consumption, 13-week average
//                      = round(average × share), where average is the mean of
//                        the material's recorded consumption (CAP-11, the
//                        record in force per week) over the 13 weeks ending at
//                        the week, or at the current hub week for a later
//                        week (consumption is only recorded for weeks that
//                        have happened). Only weeks with a record count: with
//                        fewer than 13, it averages what exists and says how
//                        many weeks it used [Default A11].
//
// Read only. Nothing here changes how demand anticipation is calculated,
// frozen or published (BL-188 reworks that in wave 2).
//
// [Default A11] is owned by the one rules block (design rule 2,
// `OSIP_RULES.consumptionMovingAvgWeeks` in `osipRules.js`, BL-187);
// `LTP_FG_DEMAND_RULES` below only re-exports it, so the value lives once.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { ConsumptionRecord } from './consumptionRules' */
/** @import { DemandAnticipationRow, DemandAnticipationWeekView } from './demandAnticipationRules' */
import { consumptionInForce } from './consumptionRules';
import { OSIP_RULES } from './osipRules';
import { addDays, dayOf, mondayOf } from './inventoryRules';

/**
 * DRC-18 defaults.
 *   · consumptionAverageWeeks: [Default A11] — the moving average of recorded
 *     consumption runs over 13 weeks (3 months) [XLS ROP Fisik Non stc].
 */
export const LTP_FG_DEMAND_RULES = Object.freeze({
  consumptionAverageWeeks: OSIP_RULES.consumptionMovingAvgWeeks // [Default A11]
});

/**
 * `average`:  Mean of the weeks with a record, unrounded; null when none has one.
 * `weeksWithRecords`:  How many weeks of the window have a record in force.
 * `windowWeeks`:  The window's length [Default A11].
 * `windowEnd`:  The Monday the window ends at (inclusive).
 * `partial`:  Fewer weeks with a record than the window holds.
 *
 * @typedef {{
 *   readonly average: number | null;
 *   readonly weeksWithRecords: number;
 *   readonly windowWeeks: number;
 *   readonly windowEnd: string;
 *   readonly partial: boolean;
 * }} ConsumptionAverage
 */

/**
 * DRC-18 [Default A11] — the moving average of one material's recorded
 * consumption over the `windowWeeks` weeks ending at `windowEnd`. A later
 * record for the same material × week replaces the earlier one (CAP-11).
 * @param {readonly ConsumptionRecord[]} records
 * @param {string} materialCode
 * @param {string} windowEnd  A Monday.
 * @param {number} [windowWeeks]
 * @returns {ConsumptionAverage}
 */
export function consumptionMovingAverage(
  records,
  materialCode,
  windowEnd,
  windowWeeks = LTP_FG_DEMAND_RULES.consumptionAverageWeeks
) {
  const inForce = consumptionInForce(records.filter((r) => r.materialCode === materialCode));
  /** @type {number[]} */
  const found = [];
  for (let i = 0; i < windowWeeks; i++) {
    const r = inForce.get(`${materialCode}|${addDays(windowEnd, -7 * i)}`);
    if (r) found.push(r.qty);
  }
  return {
    average: found.length === 0 ? null : found.reduce((a, b) => a + b, 0) / found.length,
    weeksWithRecords: found.length,
    windowWeeks,
    windowEnd,
    partial: found.length < windowWeeks
  };
}

/**
 * The week fields DRC-18 adds to a demand anticipation week.
 * `fgDemand`:  The supplier's share of the material's finished-goods demand
 *   (gross requirement), whole units; null when the engine holds none for
 *   the material or the row has no share.
 * `fgDemandMaterial`:  The material's gross requirement that week (all
 *   suppliers); null when the engine holds none for the material.
 * `ltpLessFgDemand`:  LTP − FG demand; null when either is missing.
 * `consumptionAverage`:  The supplier's share of the material's 13-week
 *   consumption average, whole units; null with no record or no share.
 * `consumptionAverageBasis`:  The average behind it, for the cell's note.
 *
 * @typedef {{
 *   readonly fgDemand: number | null;
 *   readonly fgDemandMaterial: number | null;
 *   readonly ltpLessFgDemand: number | null;
 *   readonly consumptionAverage: number | null;
 *   readonly consumptionAverageBasis: ConsumptionAverage;
 *   readonly fgBreakdown: readonly FgBreakdownPart[] | null;
 * }} LtpFgWeekFields
 */

/**
 * One finished good's part of a material's weekly requirement (PSC-3 AC-03):
 * the engine's pegs grouped by finished good.
 * @typedef {{
 *   readonly skuCode: string;
 *   readonly quantity: number;
 * }} FgBreakdownPart
 */

/**
 * The material-level finished-goods demand per week, or null when the
 * engine is not reachable (the page then says "FG demand not available").
 * @typedef {ReadonlyMap<string, ReadonlyMap<string, number>> | null} FgDemandByMaterial
 */

/**
 * PSC-3 (BL-338) — every finished good behind each material × week, from the
 * engine's pegs. A material absent from the map has no FG demand read.
 * @typedef {ReadonlyMap<string, ReadonlyMap<string, readonly FgBreakdownPart[]>> | null} FgBreakdownByMaterial
 */

/**
 * PSC-3 (BL-338) — the finished goods that use each material, directly or
 * through a bulk (one row covers every FG that uses the material, BR-02).
 * @typedef {ReadonlyMap<string, readonly string[]>} FgUsersByMaterial
 */

/**
 * Walk the BOM from each component up to the finished goods that use it. An
 * item that is neither a finished good nor a component of anything has no FG
 * behind it and is absent from the returned map.
 * @param {readonly Pick<import('../engine/types').BomLine, 'parentCode' | 'componentCode'>[]} bom
 * @param {readonly string[]} fgSkus
 * @returns {FgUsersByMaterial}
 */
export function materialFgUsers(bom, fgSkus) {
  const fgs = new Set(fgSkus);
  /** @type {Map<string, string[]>} */
  const parents = new Map();
  for (const b of bom) {
    const list = parents.get(b.componentCode) ?? [];
    if (!list.includes(b.parentCode)) list.push(b.parentCode);
    parents.set(b.componentCode, list);
  }
  /** @type {Map<string, readonly string[]>} */
  const out = new Map();
  for (const b of bom) {
    if (out.has(b.componentCode)) continue;
    const found = new Set();
    /** @type {string[]} */
    const stack = [b.componentCode];
    const visited = new Set();
    while (stack.length > 0) {
      const code = /** @type {string} */ (stack.pop());
      if (visited.has(code)) continue;
      visited.add(code);
      for (const parent of parents.get(code) ?? []) {
        if (fgs.has(parent)) found.add(parent);
        else stack.push(parent);
      }
    }
    out.set(b.componentCode, [...found].sort());
  }
  return out;
}

/**
 * PSC-3 AC-03 — the engine's pegs for one material × week, grouped by
 * finished good (the same FG can reach a material through more than one BOM
 * path, so the parts are summed).
 * @param {readonly { readonly skuCode: string; readonly quantity: number }[]} pegs
 * @returns {readonly FgBreakdownPart[]}
 */
export function pegsByFg(pegs) {
  /** @type {Map<string, number>} */
  const bySku = new Map();
  for (const p of pegs) bySku.set(p.skuCode, (bySku.get(p.skuCode) ?? 0) + p.quantity);
  return [...bySku].map(([skuCode, quantity]) => ({ skuCode, quantity }));
}

/**
 * DRC-18 — every row's weeks with FG demand, LTP − FG demand and the
 * consumption moving average. The demand anticipation fields are untouched.
 *
 * PSC-3 (BL-338) adds what the LTP batch preview reads: per week
 * `fgBreakdown` (the finished goods behind the computed total), and per row
 * `fgUsers` (every FG that uses the material) and `noPlanFgs` (those of them
 * with no plan row in the FG plan version in force) — the edge case where an
 * FG with no plan is left out of the total and the page says so.
 *
 * @template {Omit<DemandAnticipationRow, 'weeks'> & { readonly weeks: readonly DemandAnticipationWeekView[] }} R
 * @param {readonly R[]} rows
 * @param {{
 *   readonly fgDemand: FgDemandByMaterial;
 *   readonly records: readonly ConsumptionRecord[];
 *   readonly nowIso: string;
 *   readonly fgBreakdown?: FgBreakdownByMaterial;
 *   readonly fgUsers?: FgUsersByMaterial;
 *   readonly noPlanFgs?: FgUsersByMaterial;
 * }} input
 * @returns {(Omit<R, 'weeks'> & { readonly fgDemandAvailable: boolean; readonly fgUsers: readonly string[]; readonly noPlanFgs: readonly string[]; readonly weeks: readonly (R['weeks'][number] & LtpFgWeekFields)[] })[]}
 */
export function withLtpFgDemand(
  rows,
  { fgDemand, records, nowIso, fgBreakdown, fgUsers, noPlanFgs }
) {
  const currentWeek = mondayOf(dayOf(nowIso));
  return rows.map((row) => {
    const byWeek = fgDemand?.get(row.materialCode) ?? null;
    const parts = fgBreakdown?.get(row.materialCode) ?? null;
    const share = row.share;
    return {
      ...row,
      fgDemandAvailable: byWeek !== null,
      fgUsers: fgUsers?.get(row.materialCode) ?? [],
      noPlanFgs: noPlanFgs?.get(row.materialCode) ?? [],
      weeks: row.weeks.map((w) => {
        const material = byWeek ? (byWeek.get(w.week) ?? 0) : null;
        const fg = material === null || share === null ? null : Math.round(material * share);
        const ltp = w.inputs?.ltp;
        const basis = consumptionMovingAverage(
          records,
          row.materialCode,
          w.week < currentWeek ? w.week : currentWeek
        );
        return {
          ...w,
          fgDemand: fg,
          fgDemandMaterial: material,
          ltpLessFgDemand: fg === null || ltp === undefined ? null : ltp - fg,
          consumptionAverage:
            basis.average === null || share === null ? null : Math.round(basis.average * share),
          consumptionAverageBasis: basis,
          fgBreakdown: parts === null ? null : (parts.get(w.week) ?? [])
        };
      })
    };
  });
}
