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
// Owner ruling 2026-10-13: several lines for one supplier × material draw down
// ONE AFTER ANOTHER, oldest PO first (`projectGroup`). The group runs out with
// its last line, which alone carries "new PO needed by" and the alert; an older
// line shows its own run-out week and the line next in line.
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

/** @import { CallOff, POLineItem, PurchaseOrder, RiskClass } from '../data/types' */
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
 * One projected week. `ltp` is the group's LTP that week; `draw` is what THIS
 * line gave of it and `balance` what it has left, both in the line's basis:
 * pieces/kg on a quantity line, IDR (at its unit price) on a value-only line.
 * An older line's balance stops at zero (the rest spills to the next line);
 * the last line's goes below zero.
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
 * `runOut`:  BR-03 — the first week the line is used up (below zero); null when it lasts the horizon.
 * `newPoBy`:  BR-03 — the run-out week minus the lead time. Only the LAST line of a
 *   supplier × material group carries it (owner, 2026-10-13); null otherwise.
 * `lastInLine`:  Whether this line is the last of its supplier × material group.
 * `hasLtp`:  Whether any week of the horizon carries an LTP for the supplier × material.
 *
 * @typedef {{
 *   readonly basis: ReleaseBasis;
 *   readonly start: number;
 *   readonly weeks: readonly RunOutWeek[];
 *   readonly runOut: ProjectionWeek | null;
 *   readonly newPoBy: ProjectionWeek | null;
 *   readonly lastInLine: boolean;
 *   readonly leadTime: { readonly weeks: number; readonly onRecord: boolean };
 *   readonly hasLtp: boolean;
 *   readonly horizonWeeks: number;
 * }} RunOutProjection
 */

/**
 * One line of a group, oldest first.
 * @typedef {{
 *   readonly remaining: Pick<UmbrellaRemaining, 'basis' | 'remainingQty' | 'remainingValue'>;
 *   readonly unitPrice: number;
 * }} GroupLine
 */

/**
 * Owner ruling 2026-10-13 — the blanket PO lines of one supplier × material,
 * oldest first, draw down ONE AFTER ANOTHER: each week the group's LTP is drawn
 * from the oldest line that still has a balance, and any excess spills to the
 * next line in the same week. A line's run-out week is the week it is used up:
 * the week the group's cumulative LTP passes everything up to and including it.
 * The group runs out with its LAST line; only that line has "new PO needed by".
 *
 * Every line is measured in the material's unit: a value-only line holds its
 * remaining value ÷ its unit price, and its own figures (start, draw, balance)
 * are shown back in IDR at that price. So a group that mixes quantity and value
 * lines draws one unit throughout. A group of one is exactly BR-01 to BR-03.
 * @param {{
 *   readonly lines: readonly GroupLine[];
 *   readonly weeks: readonly string[];
 *   readonly ltpPerWeek: readonly number[];
 *   readonly leadTimeDays: number | null | undefined;
 * }} input
 * @returns {RunOutProjection[]}
 */
export function projectGroup({ lines, weeks, ltpPerWeek, leadTimeDays }) {
  const leadTime = poLeadTimeWeeks(leadTimeDays);
  /** The group's LTP to the end of each week, in the material's unit. */
  const cumulative = /** @type {number[]} */ ([]);
  let total = 0;
  for (let i = 0; i < weeks.length; i += 1) {
    total += ltpPerWeek[i] ?? 0;
    cumulative.push(total);
  }
  const hasLtp = weeks.some((_, i) => (ltpPerWeek[i] ?? 0) > 0);
  let before = 0; // what the older lines hold, in the material's unit
  return lines.map((line, k) => {
    const basis = line.remaining.basis;
    const start =
      basis === 'quantity' ? (line.remaining.remainingQty ?? 0) : line.remaining.remainingValue;
    // The line's price per unit of the material: 1 on a quantity line.
    const per = basis === 'quantity' ? 1 : line.unitPrice;
    const holds = per > 0 ? Math.max(0, start / per) : 0;
    const last = k === lines.length - 1;
    const from = before;
    before += holds;
    /** What this line has given up to a cumulative group LTP, in the material's unit. */
    const usedTo = (/** @type {number} */ upTo) => {
      const u = Math.max(0, upTo - from);
      return last ? u : Math.min(u, holds);
    };
    /** @type {RunOutWeek[]} */
    const out = [];
    /** @type {ProjectionWeek | null} */
    let runOut = null;
    weeks.forEach((week, i) => {
      const upTo = cumulative[i] ?? 0;
      const prior = i === 0 ? 0 : (cumulative[i - 1] ?? 0);
      const raw = start - Math.max(0, upTo - from) * per;
      out.push({
        week,
        ltp: ltpPerWeek[i] ?? 0,
        draw: (usedTo(upTo) - usedTo(prior)) * per,
        balance: last ? raw : Math.max(0, raw)
      });
      if (runOut === null && raw < 0) runOut = { index: i + 1, week };
    });
    /** @type {ProjectionWeek | null} */
    let newPoBy = null;
    const found = /** @type {ProjectionWeek | null} */ (runOut);
    if (last && found !== null && weeks[0] !== undefined) {
      const index = found.index - leadTime.weeks;
      newPoBy = { index, week: addDays(weeks[0], (index - 1) * 7) };
    }
    return {
      basis,
      start,
      weeks: out,
      runOut,
      newPoBy,
      lastInLine: last,
      leadTime,
      hasLtp,
      horizonWeeks: weeks.length
    };
  });
}

/**
 * BR-01 to BR-03 — project one blanket PO line alone (a group of one).
 * @param {GroupLine & {
 *   readonly weeks: readonly string[];
 *   readonly ltpPerWeek: readonly number[];
 *   readonly leadTimeDays: number | null | undefined;
 * }} input
 * @returns {RunOutProjection}
 */
export function projectRunOut({ remaining, unitPrice, weeks, ltpPerWeek, leadTimeDays }) {
  return /** @type {RunOutProjection} */ (
    projectGroup({ lines: [{ remaining, unitPrice }], weeks, ltpPerWeek, leadTimeDays })[0]
  );
}

/**
 * BR-05 — "new PO needed by" falls in the alert window, or has passed.
 * @param {Pick<RunOutProjection, 'newPoBy'>} p
 * @returns {boolean}
 */
export const isNewPoDue = (p) => p.newPoBy !== null && p.newPoBy.index <= BLANKET_PO_ALERT_WEEKS;

/** Another blanket PO line of the same group. */
/** @typedef {{ readonly poId: string; readonly poNumber: string; readonly lineId: string }} BlanketPoRef */

/**
 * One blanket PO line with its projection. `nextInLine`: the line of the same
 * supplier × material drawn after this one; null on the last line.
 *
 * @typedef {{
 *   readonly poId: string;
 *   readonly poNumber: string;
 *   readonly orderDate: string;
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly lineId: string;
 *   readonly materialCode: string;
 *   readonly description: string;
 *   readonly uom: string;
 *   readonly nextInLine: BlanketPoRef | null;
 *   readonly projection: RunOutProjection;
 * }} BlanketPoRunOut
 */

/**
 * `leadTimeDays`:  The lead time on record for a supplier × material, or null.
 *
 * @typedef {{
 *   readonly pos: readonly Pick<PurchaseOrder, 'id' | 'poNumber' | 'orderDate' | 'supplierId' | 'supplierName' | 'status' | 'lineItems'>[];
 *   readonly callOffs: readonly CallOff[];
 *   readonly ltpLines: readonly LtpLine[];
 *   readonly leadTimeDays: (supplierId: string, materialCode: string) => number | null;
 * }} BlanketPoInputs
 */

/** @param {{ supplierId: string; materialCode: string }} r */
const groupKeyOf = (r) => `${r.supplierId}|${r.materialCode}`;

/**
 * Oldest first: the PO's order date, then PO number, then line.
 * @param {{ orderDate: string; poNumber: string; lineId: string }} a
 * @param {{ orderDate: string; poNumber: string; lineId: string }} b
 * @returns {number}
 */
export const oldestFirst = (a, b) =>
  a.orderDate.localeCompare(b.orderDate) ||
  a.poNumber.localeCompare(b.poNumber) ||
  a.lineId.localeCompare(b.lineId);

/**
 * Every open blanket PO line (the POs call-offs release against), projected
 * from the current hub week, each supplier × material group drawn down oldest
 * first. Rows come group by group, oldest line first within a group.
 * @param {BlanketPoInputs} input
 * @param {string} nowIso
 * @returns {BlanketPoRunOut[]}
 */
export function blanketPoRunOuts(input, nowIso) {
  const weeks = projectionWeeks(nowIso);
  /** @type {BlanketPoRunOut[][]} */
  const out = [];
  const groups = /** @type {Map<string, Omit<BlanketPoRunOut, 'nextInLine' | 'projection'>[]>} */ (
    new Map()
  );
  /** @type {Map<string, POLineItem>} */
  const lineOf = new Map();
  for (const po of input.pos) {
    if (!CALL_OFF_PO_STATES.includes(po.status)) continue;
    for (const line of po.lineItems) {
      const row = {
        poId: po.id,
        poNumber: po.poNumber,
        orderDate: po.orderDate,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        lineId: line.id,
        materialCode: line.materialCode,
        description: line.description,
        uom: line.uom
      };
      lineOf.set(`${po.id}|${line.id}`, line);
      groups.set(groupKeyOf(row), [...(groups.get(groupKeyOf(row)) ?? []), row]);
    }
  }
  for (const group of groups.values()) {
    const ordered = [...group].sort(oldestFirst);
    const first = /** @type {(typeof ordered)[number]} */ (ordered[0]);
    const projections = projectGroup({
      lines: ordered.map((r) => {
        const line = /** @type {POLineItem} */ (lineOf.get(`${r.poId}|${r.lineId}`));
        return { remaining: umbrellaRemaining(line, input.callOffs), unitPrice: line.unitPrice };
      }),
      weeks,
      ltpPerWeek: weeks.map((w) =>
        groupWeekLtp(input.ltpLines, first.supplierId, [first.materialCode], w)
      ),
      leadTimeDays: input.leadTimeDays(first.supplierId, first.materialCode)
    });
    out.push(
      ordered.map((r, k) => {
        const next = ordered[k + 1];
        return {
          ...r,
          nextInLine: next
            ? { poId: next.poId, poNumber: next.poNumber, lineId: next.lineId }
            : null,
          projection: /** @type {RunOutProjection} */ (projections[k])
        };
      })
    );
  }
  return out.flat();
}

/**
 * A supplier × material group that runs out: its last line (which carries
 * "new PO needed by") and the older lines drawn before it, oldest first.
 * @typedef {{ readonly last: BlanketPoRunOut; readonly earlier: readonly BlanketPoRunOut[] }} RunningOutGroup
 */

/**
 * BR-04 — "Blanket POs running out", read per supplier × material group: every
 * group whose LAST line runs out within the horizon, soonest "new PO needed by"
 * first (then the last line's run-out week, PO number, line).
 * @param {readonly BlanketPoRunOut[]} rows
 * @returns {RunningOutGroup[]}
 */
export function runningOut(rows) {
  /** @param {RunningOutGroup} g */
  const by = (g) => /** @type {ProjectionWeek} */ (g.last.projection.newPoBy).week;
  /** @param {RunningOutGroup} g */
  const out = (g) => /** @type {ProjectionWeek} */ (g.last.projection.runOut).week;
  return rows
    .filter((r) => r.projection.lastInLine && r.projection.runOut !== null)
    .map((last) => ({
      last,
      earlier: rows
        .filter((r) => groupKeyOf(r) === groupKeyOf(last) && !r.projection.lastInLine)
        .sort(oldestFirst)
    }))
    .sort(
      (a, b) =>
        by(a).localeCompare(by(b)) ||
        out(a).localeCompare(out(b)) ||
        a.last.poNumber.localeCompare(b.last.poNumber) ||
        a.last.lineId.localeCompare(b.last.lineId)
    );
}

/**
 * BR-05 — a supplier × material group that needs a new PO soon. One per group,
 * raised on its last line's PO. `daysToImpact`: days from today to the
 * needed-by week, 0 once passed.
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
 * BR-05 — the alert subjects: every group whose "new PO needed by" is in the
 * alert window or passed. High when it is this week or passed, else Medium.
 * @param {readonly BlanketPoRunOut[]} rows
 * @param {string} nowIso
 * @returns {BlanketPoAlertSubject[]}
 */
export function blanketPoAlertSubjects(rows, nowIso) {
  const today = dayOf(nowIso);
  const out = /** @type {Map<string, BlanketPoAlertSubject>} */ (new Map());
  for (const { last: r } of runningOut(rows)) {
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
