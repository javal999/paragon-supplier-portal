// ─────────────────────────────────────────────────────────────────────────────
// BLANKET PO RUN-OUT — CAP-9 (BL-178), SC-HUB-CAPACITY-REQUIREMENTS-2026-10 §7.
//
// A blanket (umbrella) PO line has a remaining quantity, or on a value-only
// line a remaining value (`umbrellaRemaining`, callOffRules). The hub projects
// it week by week from the current hub week: remaining − the LTP for that
// supplier × material in the week, assuming call-offs follow the plan (BR-01).
// A value-only line draws LTP × the line's unit price (BR-02).
//
//   · run-out week     = the first week the projection goes below zero.
//   · new PO needed by = run-out week − the PO lead time (BR-03).
//
// The LTP is THE capacity demand figure (`groupWeekLtp`, capacityRules), read
// for the one material. The lead time is the one on record for the supplier ×
// material, in whole weeks rounded up; 2 weeks when none is on record (CAP-D8).
// Never runs out within the forecast horizon: "Covers the forecast horizon"
// (BR-06). The planner is alerted when "new PO needed by" falls in the 4 weeks
// starting with the current week, or has already passed (BR-05).
//
// Everything here is a pure function of its inputs and the hub clock's now:
// a run-out or needed-by week is computed at read, never stored (law 0.5).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { CallOff, PurchaseOrder, RiskClass } from '../data/types' */
/** @import { LtpLine } from './capacityRules' */
/** @import { ReleaseBasis, UmbrellaRemaining } from './callOffRules' */
import { FORECAST_HORIZON_WEEKS } from '../engine/demandForecast';
import { CALL_OFF_PO_STATES, umbrellaRemaining } from './callOffRules';
import { groupWeekLtp } from './capacityRules';
import { addDays, dayOf, daysBetween, hasLeadTime, mondayOf } from './inventoryRules';

/** BR-06 — the projection runs over the forecast horizon (E14-03, the SAP plan snapshot's). */
export const BLANKET_PO_HORIZON_WEEKS = FORECAST_HORIZON_WEEKS;

/** BR-03 [Proposed, CAP-D8] — the PO lead time when none is on record. */
export const BLANKET_PO_FALLBACK_LEAD_WEEKS = 2;

/**
 * BR-05 [Proposed, CAP-D8] — "new PO needed by" within this many weeks raises
 * the alert: the weeks starting with the current week (the same reading of
 * "the 4 weeks" as CAP-10 BR-01), plus any needed-by week already passed.
 */
export const BLANKET_PO_ALERT_WEEKS = 4;

/**
 * The Mondays of the projection, starting with the current hub week.
 * @param {string} nowIso
 * @param {number} [count]
 * @returns {string[]}
 */
export function projectionWeeks(nowIso, count = BLANKET_PO_HORIZON_WEEKS) {
  const first = mondayOf(dayOf(nowIso));
  return Array.from({ length: count }, (_, i) => addDays(first, i * 7));
}

/**
 * The PO lead time in whole weeks (days rounded up), and whether it came from
 * the record or is the 2-week fallback.
 * @param {number | null | undefined} leadTimeDays
 * @returns {{ readonly weeks: number; readonly onRecord: boolean }}
 */
export function poLeadTimeWeeks(leadTimeDays) {
  return hasLeadTime(leadTimeDays)
    ? { weeks: Math.ceil(/** @type {number} */ (leadTimeDays) / 7), onRecord: true }
    : { weeks: BLANKET_PO_FALLBACK_LEAD_WEEKS, onRecord: false };
}

/**
 * One projected week. `draw` is in the line's basis: pieces/kg on a quantity
 * line, IDR (LTP × unit price) on a value-only line.
 *
 * @typedef {{
 *   readonly week: string;
 *   readonly ltp: number;
 *   readonly draw: number;
 *   readonly balance: number;
 * }} RunOutWeek
 */

/**
 * A week of the projection: `index` counts from 1 = the current hub week, so
 * a needed-by `index` of 0 or less is a week already passed.
 *
 * @typedef {{ readonly index: number; readonly week: string }} ProjectionWeek
 */

/**
 * `start`:  What remains today, in the line's basis.
 * `runOut`:  BR-03 — the first week below zero; null when it covers the horizon.
 * `newPoBy`:  BR-03 — the run-out week minus the lead time; null with `runOut`.
 * `hasLtp`:  Whether any week of the horizon carries an LTP for the supplier × material.
 *
 * @typedef {{
 *   readonly basis: ReleaseBasis;
 *   readonly start: number;
 *   readonly weeks: readonly RunOutWeek[];
 *   readonly runOut: ProjectionWeek | null;
 *   readonly newPoBy: ProjectionWeek | null;
 *   readonly leadTime: { readonly weeks: number; readonly onRecord: boolean };
 *   readonly hasLtp: boolean;
 *   readonly horizonWeeks: number;
 * }} RunOutProjection
 */

/**
 * BR-01 to BR-03 — project one blanket PO line.
 * @param {{
 *   readonly remaining: Pick<UmbrellaRemaining, 'basis' | 'remainingQty' | 'remainingValue'>;
 *   readonly unitPrice: number;
 *   readonly weeks: readonly string[];
 *   readonly ltpPerWeek: readonly number[];
 *   readonly leadTimeDays: number | null | undefined;
 * }} input
 * @returns {RunOutProjection}
 */
export function projectRunOut({ remaining, unitPrice, weeks, ltpPerWeek, leadTimeDays }) {
  const basis = remaining.basis;
  const start = basis === 'quantity' ? (remaining.remainingQty ?? 0) : remaining.remainingValue;
  const leadTime = poLeadTimeWeeks(leadTimeDays);
  /** @type {RunOutWeek[]} */
  const out = [];
  /** @type {ProjectionWeek | null} */
  let runOut = null;
  let balance = start;
  weeks.forEach((week, i) => {
    const ltp = ltpPerWeek[i] ?? 0;
    const draw = basis === 'quantity' ? ltp : ltp * unitPrice;
    balance -= draw;
    out.push({ week, ltp, draw, balance });
    if (runOut === null && balance < 0) runOut = { index: i + 1, week };
  });
  /** @type {ProjectionWeek | null} */
  let newPoBy = null;
  const found = /** @type {ProjectionWeek | null} */ (runOut);
  if (found !== null && weeks[0] !== undefined) {
    const index = found.index - leadTime.weeks;
    newPoBy = { index, week: addDays(weeks[0], (index - 1) * 7) };
  }
  return {
    basis,
    start,
    weeks: out,
    runOut,
    newPoBy,
    leadTime,
    hasLtp: out.some((w) => w.ltp > 0),
    horizonWeeks: weeks.length
  };
}

/**
 * BR-05 — "new PO needed by" falls in the alert window, or has passed.
 * @param {Pick<RunOutProjection, 'newPoBy'>} p
 * @returns {boolean}
 */
export const isNewPoDue = (p) => p.newPoBy !== null && p.newPoBy.index <= BLANKET_PO_ALERT_WEEKS;

/**
 * One blanket PO line with its projection.
 *
 * @typedef {{
 *   readonly poId: string;
 *   readonly poNumber: string;
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly lineId: string;
 *   readonly materialCode: string;
 *   readonly description: string;
 *   readonly uom: string;
 *   readonly projection: RunOutProjection;
 * }} BlanketPoRunOut
 */

/**
 * `leadTimeDays`:  The lead time on record for a supplier × material, or null.
 *
 * @typedef {{
 *   readonly pos: readonly Pick<PurchaseOrder, 'id' | 'poNumber' | 'supplierId' | 'supplierName' | 'status' | 'lineItems'>[];
 *   readonly callOffs: readonly CallOff[];
 *   readonly ltpLines: readonly LtpLine[];
 *   readonly leadTimeDays: (supplierId: string, materialCode: string) => number | null;
 * }} BlanketPoInputs
 */

/**
 * Every open blanket PO line (the POs call-offs release against), projected
 * from the current hub week.
 * @param {BlanketPoInputs} input
 * @param {string} nowIso
 * @returns {BlanketPoRunOut[]}
 */
export function blanketPoRunOuts(input, nowIso) {
  const weeks = projectionWeeks(nowIso);
  return input.pos
    .filter((po) => CALL_OFF_PO_STATES.includes(po.status))
    .flatMap((po) =>
      po.lineItems.map((line) => ({
        poId: po.id,
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        lineId: line.id,
        materialCode: line.materialCode,
        description: line.description,
        uom: line.uom,
        projection: projectRunOut({
          remaining: umbrellaRemaining(line, input.callOffs),
          unitPrice: line.unitPrice,
          weeks,
          ltpPerWeek: weeks.map((w) =>
            groupWeekLtp(input.ltpLines, po.supplierId, [line.materialCode], w)
          ),
          leadTimeDays: input.leadTimeDays(po.supplierId, line.materialCode)
        })
      }))
    );
}

/**
 * BR-04 — "Blanket POs running out": the lines that run out within the
 * horizon, soonest "new PO needed by" first (then run-out week, PO, line).
 * @param {readonly BlanketPoRunOut[]} rows
 * @returns {BlanketPoRunOut[]}
 */
export function runningOut(rows) {
  /** @param {BlanketPoRunOut} r */
  const by = (r) => /** @type {ProjectionWeek} */ (r.projection.newPoBy).week;
  /** @param {BlanketPoRunOut} r */
  const out = (r) => /** @type {ProjectionWeek} */ (r.projection.runOut).week;
  return rows
    .filter((r) => r.projection.runOut !== null)
    .sort(
      (a, b) =>
        by(a).localeCompare(by(b)) ||
        out(a).localeCompare(out(b)) ||
        a.poNumber.localeCompare(b.poNumber) ||
        a.lineId.localeCompare(b.lineId)
    );
}

/**
 * BR-05 — a blanket PO that needs a new PO soon. One per PO (its most urgent
 * line). `daysToImpact`: days from today to the needed-by week, 0 once passed.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly poId: string;
 *   readonly label: string;
 *   readonly riskClass: RiskClass;
 *   readonly daysToImpact: number;
 * }} BlanketPoAlertSubject
 */

/**
 * BR-05 — the alert subjects: every blanket PO whose "new PO needed by" is in
 * the alert window or passed. High when it is this week or passed, else Medium.
 * @param {readonly BlanketPoRunOut[]} rows
 * @param {string} nowIso
 * @returns {BlanketPoAlertSubject[]}
 */
export function blanketPoAlertSubjects(rows, nowIso) {
  const today = dayOf(nowIso);
  const out = /** @type {Map<string, BlanketPoAlertSubject>} */ (new Map());
  for (const r of runningOut(rows)) {
    const by = r.projection.newPoBy;
    if (by === null || !isNewPoDue(r.projection) || out.has(r.poId)) continue;
    out.set(r.poId, {
      supplierId: r.supplierId,
      supplierName: r.supplierName,
      poId: r.poId,
      label: `${r.poNumber} · ${r.materialCode} ${r.description}`,
      riskClass: by.index <= 1 ? 'high' : 'medium',
      daysToImpact: Math.max(0, daysBetween(today, by.week))
    });
  }
  return [...out.values()];
}
