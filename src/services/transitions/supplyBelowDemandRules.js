// ─────────────────────────────────────────────────────────────────────────────
// SUPPLY BELOW DEMAND ANTICIPATION — CAP-12 (BL-181),
// SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10 §6 (CAP-D15; CAP-D4).
//
// Per supplier × material × week, beside the demand anticipation (CAP-10):
//
//   open supply(w) = the quantity of the call-offs in a RELEASED state
//                    (Awaiting Confirmation and the four confirmed states,
//                    `isReleased`, callOffRules) whose need date falls in the
//                    week of Monday w. A Draft is not released; a Dismissed or
//                    Rejected call-off gave its quantity back. Neither is supply.
//   gap(w)         = max(0, demand anticipation(w) − open supply(w)), where the
//                    demand anticipation is the read's `qty`: the figure IN
//                    FORCE for the week (frozen or today's). It is read, never
//                    recomputed here, so a later adjustment of `qty` (CAP-11
//                    absorbing an excess) flows into the gap unchanged.
//
// A blanket balance that has not been called off is not dated supply (CAP-9
// shows it as run-out); every open PO line in a call-off state is a blanket
// line, and its call-offs are the dated supply (brief §6).
//
// The proposal for a gap (BR-02, BR-03): walk the supplier × material's blanket
// lines OLDEST FIRST — CAP-9's own order (`oldestFirst`, blanketPoRules) — and
// call off against each line's remaining balance (`umbrellaRemaining`) until
// the gap is covered. Whatever no line covers is "New PO needed": the hub
// recommends, the planner raises it (CAP-D4); nothing is posted to SAP.
// The gaps of one supplier × material are walked week by week, earliest first,
// and share the balance: a balance proposed for week 5 is not offered again
// for week 6.
//
// Everything here is a pure function of its inputs: open supply, the gap and
// the proposal are computed at read, never stored (law 0.5).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { CallOff, PurchaseOrder } from '../data/types' */
/** @import { DemandAnticipationRow, DemandAnticipationWeekView } from './demandAnticipationRules' */
import { oldestFirst } from './blanketPoRules';
import { CALL_OFF_PO_STATES, isReleased, umbrellaRemaining } from './callOffRules';
import { dayOf, mondayOf } from './inventoryRules';

/**
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} week
 */
const supplyKey = (supplierId, materialCode, week) => `${supplierId}|${materialCode}|${week}`;

/**
 * Open supply per supplier × material × week (the Monday of each released
 * call-off's need date).
 * @param {readonly Pick<CallOff, 'supplierId' | 'materialCode' | 'needDate' | 'quantity' | 'status'>[]} callOffs
 * @returns {Map<string, number>} keyed `supplierId|materialCode|monday`
 */
export function openSupplyIndex(callOffs) {
  /** @type {Map<string, number>} */
  const out = new Map();
  for (const c of callOffs) {
    if (!isReleased(c)) continue;
    const key = supplyKey(c.supplierId, c.materialCode, mondayOf(dayOf(c.needDate)));
    out.set(key, (out.get(key) ?? 0) + c.quantity);
  }
  return out;
}

/**
 * gap = demand anticipation − open supply, where positive; null when the week
 * has no demand anticipation figure.
 * @param {number | null} demandAnticipation
 * @param {number} openSupply
 * @returns {number | null}
 */
export const supplyGap = (demandAnticipation, openSupply) =>
  demandAnticipation === null ? null : Math.max(0, demandAnticipation - openSupply);

/**
 * One blanket line of a supplier × material, oldest first, with what it can
 * still give in the material's unit: the remaining quantity, or on a
 * value-only line the remaining value ÷ its unit price, in whole units.
 * @typedef {{
 *   readonly poId: string;
 *   readonly poNumber: string;
 *   readonly orderDate: string;
 *   readonly lineId: string;
 *   readonly balance: number;
 * }} BlanketBalance
 */

/**
 * The supplier × material's blanket lines (open POs in a call-off state),
 * oldest first as CAP-9 orders them, each with its balance.
 * @param {readonly Pick<PurchaseOrder, 'id' | 'poNumber' | 'orderDate' | 'supplierId' | 'status' | 'lineItems'>[]} pos
 * @param {readonly CallOff[]} callOffs
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {BlanketBalance[]}
 */
export function blanketBalances(pos, callOffs, supplierId, materialCode) {
  return pos
    .filter((po) => po.supplierId === supplierId && CALL_OFF_PO_STATES.includes(po.status))
    .flatMap((po) =>
      po.lineItems
        .filter((l) => l.materialCode === materialCode)
        .map((line) => {
          const r = umbrellaRemaining(line, callOffs);
          const units =
            r.basis === 'quantity'
              ? (r.remainingQty ?? 0)
              : line.unitPrice > 0
                ? Math.floor(r.remainingValue / line.unitPrice)
                : 0;
          return {
            poId: po.id,
            poNumber: po.poNumber,
            orderDate: po.orderDate,
            lineId: line.id,
            balance: Math.max(0, units)
          };
        })
    )
    .sort(oldestFirst);
}

/**
 * One call-off the proposal drafts: `qty` on the blanket line, which held
 * `balance` before this gap drew on it.
 * @typedef {{
 *   readonly poId: string;
 *   readonly poNumber: string;
 *   readonly lineId: string;
 *   readonly qty: number;
 *   readonly balance: number;
 * }} ProposedCallOff
 */

/**
 * BR-02 / BR-03 — what closes one week's gap: call-offs on blanket lines,
 * oldest first, then "New PO needed" for the rest.
 * @typedef {{
 *   readonly callOffs: readonly ProposedCallOff[];
 *   readonly newPoQty: number;
 * }} GapProposal
 */

/**
 * The proposals for one supplier × material's gaps, earliest week first. The
 * weeks share the lines' balances: what one week takes, a later week cannot.
 * @param {readonly { readonly week: string; readonly gap: number }[]} gaps
 * @param {readonly BlanketBalance[]} lines oldest first
 * @returns {Map<string, GapProposal>} keyed by week
 */
export function proposeForGaps(gaps, lines) {
  const left = lines.map((l) => l.balance);
  /** @type {Map<string, GapProposal>} */
  const out = new Map();
  for (const { week, gap } of [...gaps].sort((a, b) => a.week.localeCompare(b.week))) {
    if (gap <= 0) continue;
    let rest = gap;
    /** @type {ProposedCallOff[]} */
    const callOffs = [];
    lines.forEach((line, i) => {
      const balance = left[i] ?? 0;
      if (rest <= 0 || balance <= 0) return;
      const qty = Math.min(rest, balance);
      callOffs.push({
        poId: line.poId,
        poNumber: line.poNumber,
        lineId: line.lineId,
        qty,
        balance
      });
      left[i] = balance - qty;
      rest -= qty;
    });
    out.set(week, { callOffs, newPoQty: rest });
  }
  return out;
}

/**
 * CAP-12 — what one week adds to the demand anticipation read.
 * `openSupply`:  released call-offs needed that week.
 * `gap`:  demand anticipation − open supply where positive; null with no figure.
 * `proposal`:  how the gap closes; null when there is no gap.
 * @typedef {{
 *   readonly openSupply: number;
 *   readonly gap: number | null;
 *   readonly proposal: GapProposal | null;
 * }} SupplyWeekFields
 */

/** @typedef {DemandAnticipationWeekView & SupplyWeekFields} DemandAnticipationSupplyWeek */

/**
 * One row of `getDemandAnticipation` with CAP-12's open supply and gap per week.
 * @typedef {Omit<DemandAnticipationRow, 'weeks'> & {
 *   readonly weeks: readonly DemandAnticipationSupplyWeek[];
 * }} DemandAnticipationSupplyRow
 */

/**
 * CAP-12 — every row's weeks with open supply, the gap and its proposal.
 * @param {readonly DemandAnticipationRow[]} rows
 * @param {{
 *   readonly pos: readonly Pick<PurchaseOrder, 'id' | 'poNumber' | 'orderDate' | 'supplierId' | 'status' | 'lineItems'>[];
 *   readonly callOffs: readonly CallOff[];
 * }} supply
 * @returns {DemandAnticipationSupplyRow[]}
 */
export function withOpenSupply(rows, { pos, callOffs }) {
  const index = openSupplyIndex(callOffs);
  return rows.map((row) => {
    const measured = row.weeks.map((w) => {
      const openSupply = index.get(supplyKey(row.supplierId, row.materialCode, w.week)) ?? 0;
      return { w, openSupply, gap: supplyGap(w.qty, openSupply) };
    });
    const gaps = measured.flatMap((m) =>
      m.gap !== null && m.gap > 0 ? [{ week: m.w.week, gap: m.gap }] : []
    );
    const proposals =
      gaps.length === 0
        ? new Map()
        : proposeForGaps(gaps, blanketBalances(pos, callOffs, row.supplierId, row.materialCode));
    return {
      ...row,
      weeks: measured.map(({ w, openSupply, gap }) => ({
        ...w,
        openSupply,
        gap,
        proposal: proposals.get(w.week) ?? null
      }))
    };
  });
}

/**
 * One line of "Below demand anticipation" on What to order: a week with a gap.
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly materialCode: string;
 *   readonly materialLabel: string;
 *   readonly uom: string;
 *   readonly week: string;
 *   readonly demandAnticipation: number;
 *   readonly openSupply: number;
 *   readonly gap: number;
 *   readonly proposal: GapProposal;
 * }} SupplyGapRow
 */

/**
 * Every week with a gap, earliest week first, then supplier and material.
 * @param {readonly DemandAnticipationSupplyRow[]} rows
 * @returns {SupplyGapRow[]}
 */
export function supplyGapRows(rows) {
  return rows
    .flatMap((r) =>
      r.weeks.flatMap((w) =>
        w.gap !== null && w.gap > 0 && w.proposal !== null && w.qty !== null
          ? [
              {
                supplierId: r.supplierId,
                supplierName: r.supplierName,
                materialCode: r.materialCode,
                materialLabel: r.materialLabel,
                uom: r.uom,
                week: w.week,
                demandAnticipation: w.qty,
                openSupply: w.openSupply,
                gap: w.gap,
                proposal: w.proposal
              }
            ]
          : []
      )
    )
    .sort(
      (a, b) =>
        a.week.localeCompare(b.week) ||
        a.supplierName.localeCompare(b.supplierName) ||
        a.materialCode.localeCompare(b.materialCode)
    );
}
