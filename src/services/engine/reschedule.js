// ─────────────────────────────────────────────────────────────────────────────
// RESCHEDULE OR CANCEL OPEN ORDERS (WAREHOUSE RELIEF) — REQ-E14-13.
//
// Pure functions. The present, the weeks, the cost rates, the threshold and
// the tolerance band are ARGUMENTS (X-01, X-05); nothing here reads a clock or
// a store. It reads E14-03 (the netting and its receipts), E14-04 (safety
// stock, through the run) and E14-05 (the sized plan and its cost rates), and
// E14-02 (the plan-change measure the stability guard moves).
//
// ── THE PROJECTION ──────────────────────────────────────────────────────────
//   Per material, stock at the END of week t (the point E14-03 and E14-05 use):
//     I_t = start + Σ_{s≤t} (lines_s + planned_s − gross_s)
//   lines are the open order lines (PO lines as E14-03 nets them, plus the
//   Hub's open call-offs), planned are E14-05's planned receipts. Pallets are
//   I_t ÷ units per pallet, summed per warehouse (ENG-D7: packaging and raw
//   material separately).
//
// ── NEED DATE (BR-02) ───────────────────────────────────────────────────────
//   Lines are taken in due-date order (ties by id). Line k's need week is the
//   first week in which stock WITHOUT line k and without every later line
//   would fall below safety stock:
//     first t with  start + Σ_{j<k} q_j − CG_t < SS,   CG_t = Σ_{s≤t} gross_s
//   Planned orders are not counted: they are sized around the open lines and
//   are re-planned after a change, so the open lines are what must cover.
//   The part of line k needed within the horizon is
//     clamp(CG_T + SS − start − Σ_{j<k} q_j, 0, q_k).
//
// ── PROPOSAL (BR-03, ENG-D15) ───────────────────────────────────────────────
//   · none of it needed within the horizon → CANCEL
//   · part of it needed → REDUCE to the needed part rounded up to MOQ and
//     multiple (and, when it is also early by the threshold, to the need week
//     in the same change)
//   · due ≥ threshold weeks before the need week → RESCHEDULE OUT to it
//   · due after the need week → RESCHEDULE IN to it (shortage, listed apart)
//
// ── ZONES (BR-04, ENG-D8, ENG-D17) ──────────────────────────────────────────
//   Days from the present to the line's date: below the Firm length (the lead
//   time, REQ-E06-01 BR-01) is FIRM, then TRADE-OFF, then FORECAST.
//   · Firm, or inside the lead time: shown, "needs supplier agreement", ranked
//     last, the change penalty applies (E14-05 BR-03, per pallet changed).
//   · Trade-off: a reduction is limited to the band (±10% on the quantity in
//     force, ±20% on the first quantity — `breachesToleranceBand`, E14-02). A
//     cancellation carries the supplier's liability: FLAGGED, NOT PRICED.
//   · Forecast: free.
//
// ── VALUE, TOGETHER (BR-05, BR-06) ──────────────────────────────────────────
//   Per warehouse, greedily: of the proposals not yet taken, take the one with
//   the highest net saving against the projection AS IT STANDS (rank tier
//   first: free; then commercial, a liability to agree; then inside the lead
//   time), apply it, and value the rest again. Net saving = pallet-weeks it
//   frees ABOVE CAPACITY × rent − change penalty. A proposal whose freed space
//   falls only in weeks under capacity (now) saves nothing and is not relief.
//   So each freed over-capacity pallet-week is claimed by one proposal only,
//   and the ranked values add up to the total (AC-04).
//
// ── STOCK ON HAND ───────────────────────────────────────────────────────────
//   On-hand pallets in week t: Σ max(0, start − CG_t) ÷ units per pallet — the
//   stock already in the warehouse that the plan has not yet used. Where they
//   alone exceed capacity, no open order can relieve the week.
//
// ── STABILITY GUARD (BR-09) ─────────────────────────────────────────────────
//   E14-02's "share of schedules changed inside the lead time" over its window:
//   a PO-line proposal sent now adds a PTI change inside the lead time to its
//   line when the line counts in the window, was not already so changed, and
//   the change is inside the lead time by E14-02's own rule
//   (`isInsideLeadTime` against PTI's requested date in force).
//
// Worked example (REQ-E14-13): CT-10, 40,000 on hand, safety stock 8,000,
// 8,000 a week; call-off of 20,000 due week 3 is needed in week 5 → reschedule
// out, 10 pallets × 2 weeks = 20 pallet-weeks × Rp 35,000 = Rp 700,000; 21
// days ahead against a 14-day lead time → no penalty. `reschedule.test.js`
// runs it verbatim.
// ─────────────────────────────────────────────────────────────────────────────

import { dayOf, daysBetween, mondayOf } from './dates';
import { lineHistories, requirementAt } from './lines';
/** @import { ToleranceBand } from './reliability' */
import {
  DEFAULT_TOLERANCE_BAND,
  assessAll,
  breachesToleranceBand,
  isInsideLeadTime,
  portfolioReliability,
  supplierReliability,
  trailingWindow
} from './reliability';
/** @import { MaterialRequirementRun } from './requirement' */
import { interimOrderSize } from './requirement';
/** @import { EngineDataset, IsoDate, IsoInstant, WarehouseKind } from './types' */
import { lineKey } from './types';
/** @import { Uom } from '../sdc/types' */

const EPS = 1e-6;

// ── Inputs ──────────────────────────────────────────────────────────────────

/** @typedef {'poLine' | 'callOff'} OrderLineKind */

/** Why a line is in the projection but is not proposed (BR-01 and the verbs' own rules). */
/**
 * BR-01: already on its way
 * the supplier has not answered; the change verb waits for the answer
 * a change was sent and is not yet confirmed: nothing counts as moved
 * a confirmation waits for the planner
 * confirmed as two deliveries; the change verb sets one
 * no supplier source: no lead time, MOQ or zone to judge a change by
 *
 * @typedef {| 'dispatched'
 *   | 'awaitingConfirmation'
 *   | 'changePending'
 *   | 'awaitingApproval'
 *   | 'multipleDeliveries'
 *   | 'noSource'
 *   | 'noVolume'} InfoReason
 */ // no pallet conversion: its space cannot be valued

/** One open order line: a PO schedule line, or one of the Hub's call-offs. */
/**
 * @typedef {object} OpenOrderLine
 * @property {string} id -  `po:<poNumber>#<line>` or `co:<call-off id>`.
 * @property {OrderLineKind} kind
 * @property {string} reference -  What a person reads: `SYN-PO-00213/1`, `CO-2026-0002`.
 * @property {string | null} callOffId -  Call-off: its id (the change verb's entity). PO line: null.
 * @property {string} poNumber
 * @property {number | null} poLine
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {number} quantity -  Still to arrive.
 * @property {number} receivedQuantity -  Already received against the line.
 * @property {number} firstQuantity -  The first quantity the supplier saw (ENG-D8 cumulative band).
 * @property {IsoDate} date -  The date in force (supplier-confirmed or agreed; the need date before any answer).
 * @property {boolean} confirmed
 * @property {InfoReason | null} info -  Set when the line is projected but not proposed.
 */

/** The supplier terms a proposal is judged by (E14-01 source, REQ-E06-01 zones). */
/**
 * @typedef {object} LineTerms
 * @property {number} leadTimeDays
 * @property {number} firmDays -  Firm zone length (REQ-E06-01 BR-01: defaults to the lead time).
 * @property {number} tradeOffDays
 * @property {number} moq
 * @property {number} orderMultiple
 */

/**
 * @typedef {object} RescheduleMaterial
 * @property {string} materialCode
 * @property {WarehouseKind} kind
 * @property {Uom} uom
 * @property {number} startStock
 * @property {number} safetyStock
 * @property {readonly number[]} gross -  Per week index.
 * @property {readonly number[]} planned -  E14-05's planned receipts per week index.
 * @property {number | null} unitsPerPallet -  Null: no pallet conversion.
 */

/**
 * @typedef {object} RescheduleWarehouse
 * @property {string} warehouseId
 * @property {WarehouseKind} kind
 * @property {number} capacityPallets
 */

/**
 * @typedef {object} RescheduleCosts
 * @property {number} rentIdrPerPalletWeek -  ENG-D6 — rupiah per rented pallet per week.
 * @property {number} changePenaltyIdrPerPallet -  E14-05 BR-03 — rupiah per pallet changed inside the lead time.
 */

/**
 * @typedef {object} RescheduleInput
 * @property {IsoDate} asOf -  The present (the day a change would be made).
 * @property {readonly IsoDate[]} weeks -  The planning weeks, Mondays, oldest first.
 * @property {readonly RescheduleWarehouse[]} warehouses
 * @property {readonly RescheduleMaterial[]} materials
 * @property {readonly OpenOrderLine[]} lines
 * @property {ReadonlyMap<string, LineTerms>} terms -  Keyed `supplierId|materialCode`. A line without terms is info `noSource`.
 * @property {RescheduleCosts} costs
 * @property {number} thresholdWeeks -  ENG-D15 — weeks early before a reschedule-out is proposed (default 1).
 * @property {ToleranceBand} [band]
 * @property {ReadonlySet<string>} [addsToPlanChange] E14-02 (BR-09): the PO lines a change sent now would add to PTI's "changed
 *   inside the lead time" count, by line id. Absent: none is known to.
 * @property {ReadonlySet<string>} [insideLeadTimeByMeasure] E14-02's own reading of "inside the lead time" (against PTI's requested
 *   date in force), by line id. A line in it is inside the lead time here too,
 *   even when its confirmed date is further out, so the report never calls
 *   "free" a change the supplier measure counts against PTI (ENG-B23).
 */

// ── Outputs ─────────────────────────────────────────────────────────────────

/** @typedef {'rescheduleOut' | 'rescheduleIn' | 'reduce' | 'cancel'} ProposalType */
/** @typedef {'firm' | 'tradeOff' | 'forecast'} Zone */

/**
 * Rank tier (BR-04, BR-05): 0 — free to send; 1 — a commercial conversation
 * (a Trade-off cancellation carries the supplier's liability, ENG-D17);
 * 2 — inside the lead time or the Firm zone: needs supplier agreement, last.
 */
/** @typedef {0 | 1 | 2} RankTier */

/**
 * @typedef {object} Proposal
 * @property {string} id -  = the line id.
 * @property {OpenOrderLine} line
 * @property {WarehouseKind} warehouseKind
 * @property {ProposalType} type
 * @property {IsoDate} currentWeek -  The week the line lands in now (an overdue line lands in the first week).
 * @property {IsoDate | null} needWeek -  BR-02 — null when none of the line is needed within the horizon.
 * @property {number | null} weeksEarly -  Whole weeks the line is early (positive) or late (negative); null with no need week.
 * @property {IsoDate | null} proposedDate -  Null for a cancellation. Never before the present (the verbs refuse a past date).
 * @property {number} proposedQuantity
 * @property {number} neededQuantity -  The part needed within the horizon, before rounding to MOQ and multiple.
 * @property {Zone} zone
 * @property {number} daysAhead -  Days from the present to the line's date in force.
 * @property {number} leadTimeDays
 * @property {boolean} insideLeadTime
 * @property {boolean} bandLimited -  A Trade-off reduction held to the ENG-D8 band (the needed part was smaller).
 * @property {boolean} liability -  ENG-D17 — the supplier's liability for material already bought: flagged, not priced.
 * @property {boolean} lastOpenLineOnPo -  A cancelled PO line that is the last open line on its PO: the buyer checks the contract.
 * @property {boolean} needsSupplierAgreement
 * @property {RankTier} tier
 * @property {number} palletsChanged -  Pallets the change moves or removes.
 * @property {readonly number[]} freedPallets -  Per week index: pallets freed by this change alone (negative: added).
 * @property {number} palletWeeksFreed -  Σ freedPallets — every week, over capacity or not.
 * @property {number} overCapacityPalletWeeksFreed -  Relief: freed pallet-weeks ABOVE capacity, valued jointly in rank order (BR-06).
 * @property {number} rentSavedIdr
 * @property {number} changePenaltyIdr
 * @property {number} netSavingIdr -  rentSaved − changePenalty (the liability is not priced, ENG-D17).
 * @property {number | null} rank -  1-based rank on the warehouse's relief list; null when it is not relief.
 * @property {boolean} addsToPlanChange -  E14-02 (BR-09): sending it would add a PTI change inside the lead time to the measure.
 */

/**
 * @typedef {object} RescheduleWeek
 * @property {IsoDate} weekStart
 * @property {number} pallets -  End-of-week pallets now (open lines, planned orders, stock).
 * @property {number} palletsAfterRelief -  After every relief proposal on the list.
 * @property {number} onHandPallets -  Stock already on hand the plan has not used yet.
 * @property {number} fill
 * @property {number} fillAfterRelief
 * @property {number} onHandFill
 * @property {number} overPallets
 * @property {number} overPalletsAfterRelief
 * @property {number} onHandOverPallets -  Pallets above capacity that are stock on hand: no open order can relieve them.
 */

/**
 * @typedef {object} InfoLine
 * @property {OpenOrderLine} line
 * @property {WarehouseKind} warehouseKind
 * @property {InfoReason} reason
 */

/**
 * @typedef {object} WarehouseReschedule
 * @property {string} warehouseId
 * @property {WarehouseKind} kind
 * @property {number} capacityPallets
 * @property {readonly RescheduleWeek[]} weeks
 * @property {readonly Proposal[]} proposals -  Relief first (by rank), then the rest by id.
 * @property {readonly InfoLine[]} info -  Lines projected but not proposed, with why.
 * @property {{ readonly overPalletWeeks: number; readonly overPalletWeeksAfterRelief: number; readonly onHandOverPalletWeeks: number; readonly reliefProposals: number; readonly reliefPalletWeeks: number; readonly rentSavedIdr: number; readonly changePenaltyIdr: number; readonly netSavingIdr: number; }} totals -  Of the over-capacity pallet-weeks, those that are stock on hand.
 */

/**
 * @typedef {object} RescheduleRun
 * @property {IsoDate} asOf
 * @property {readonly IsoDate[]} weeks
 * @property {{ readonly name: 'need-date reschedule with joint relief'; readonly spec: 'REQ-E14-13; METHOD-SPEC M2, M5'; readonly version: 1 }} method
 * @property {RescheduleCosts} costs
 * @property {number} thresholdWeeks
 * @property {ToleranceBand} band
 * @property {readonly WarehouseReschedule[]} warehouses
 */

// ── The arithmetic ──────────────────────────────────────────────────────────

/**
 * @param {number} y
 * @param {number} step
 * @returns {number}
 */
const ceilTo = (y, step) => Math.ceil(y / step - 1e-9) * step;
/** @param {Pick<LineTerms, 'orderMultiple'>} t */
const stepOf = (t) => (t.orderMultiple > 0 ? t.orderMultiple : 1);
/**
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {string}
 */
export const termsKey = (supplierId, materialCode) => `${supplierId}|${materialCode}`;

/**
 * The week index a date lands in: before the first week → 0; after the last → null.
 * @param {readonly IsoDate[]} weeks
 * @param {IsoDate} date
 * @returns {number | null}
 */
export function weekIndex(weeks, date) {
  if (weeks.length === 0) return null;
  const i = Math.round(daysBetween(weeks[0], mondayOf(date)) / 7);
  if (i < 0) return 0;
  return i < weeks.length ? i : null;
}

/**
 * BR-04 — where a line sits in the supplier's zones, by days ahead.
 * @param {number} daysAhead
 * @param {Pick<LineTerms, 'firmDays' | 'tradeOffDays'>} terms
 * @returns {Zone}
 */
export function zoneOf(daysAhead, terms) {
  if (daysAhead < terms.firmDays) return 'firm';
  return daysAhead < terms.firmDays + terms.tradeOffDays ? 'tradeOff' : 'forecast';
}

/**
 * Cumulative gross by the end of each week.
 * @param {readonly number[]} xs
 * @returns {number[]}
 */
const cumulative = (xs) => {
  let s = 0;
  return xs.map((x) => (s += x));
};

/**
 * BR-02 — the need week index of a line, given the supply ahead of it
 * (start + earlier lines): the first week stock without it falls below safety
 * stock; null when it never does within the horizon.
 * @param {number} supplyBefore
 * @param {readonly number[]} cumGross
 * @param {number} safetyStock
 * @returns {number | null}
 */
export function needWeekIndex(supplyBefore, cumGross, safetyStock) {
  for (let t = 0; t < cumGross.length; t += 1)
    if (supplyBefore - cumGross[t] < safetyStock - EPS) return t;
  return null;
}

/**
 * The part of a line needed within the horizon (before rounding).
 * @param {number} supplyBefore
 * @param {readonly number[]} cumGross
 * @param {number} safetyStock
 * @param {number} quantity
 * @returns {number}
 */
export function neededWithinHorizon(supplyBefore, cumGross, safetyStock, quantity) {
  const total = cumGross[cumGross.length - 1] ?? 0;
  return Math.min(quantity, Math.max(0, total + safetyStock - supplyBefore));
}

/**
 * Pallets freed per week when `qty` moves from week `from` to week `to` as `toQty` (index ≥ T: never arrives).
 * @param {number} T
 * @param {number} from
 * @param {number} qty
 * @param {number} to
 * @param {number} toQty
 * @param {number} unitsPerPallet
 * @returns {number[]}
 */
export function freedPalletsOf(T, from, qty, to, toQty, unitsPerPallet) {
  return Array.from(
    { length: T },
    (_, t) => ((t >= from ? qty : 0) - (t >= to ? toQty : 0)) / unitsPerPallet
  );
}

/**
 * The Monday of a week as a date a change can carry: the present when that Monday has passed (ENG-B16).
 * @param {IsoDate} weekStart
 * @param {IsoDate} asOf
 * @returns {IsoDate}
 */
export const changeDate = (weekStart, asOf) => (weekStart < asOf ? asOf : weekStart);

/**
 * @param {readonly number[]} pallets
 * @param {number} cap
 */
const overOf = (pallets, cap) => pallets.reduce((s, p) => s + Math.max(0, p - cap), 0);

// ── One line → its proposal (before valuation) ──────────────────────────────

/** @typedef {Omit<Proposal, 'overCapacityPalletWeeksFreed' | 'rentSavedIdr' | 'netSavingIdr' | 'rank'>} Draft */

/**
 * @param {RescheduleInput} input
 * @param {OpenOrderLine} line
 * @param {RescheduleMaterial} mat
 * @param {LineTerms} terms
 * @param {number} supplyBefore
 * @param {readonly number[]} cumGross
 * @param {boolean} lastOpenLineOnPo
 * @returns {Draft | null}
 */
function draftProposal(input, line, mat, terms, supplyBefore, cumGross, lastOpenLineOnPo) {
  const { weeks } = input;
  const T = weeks.length;
  const band = input.band ?? DEFAULT_TOLERANCE_BAND;
  const upp = /** @type {NonNullable<typeof mat.unitsPerPallet>} */ (mat.unitsPerPallet);
  const due = /** @type {NonNullable<ReturnType<typeof weekIndex>>} */ (
    weekIndex(weeks, line.date)
  );
  const needIdx = needWeekIndex(supplyBefore, cumGross, mat.safetyStock);
  const needed = neededWithinHorizon(supplyBefore, cumGross, mat.safetyStock, line.quantity);
  const daysAhead = daysBetween(input.asOf, line.date);
  const zone = zoneOf(daysAhead, terms);
  const insideLeadTime =
    daysAhead < terms.leadTimeDays || (input.insideLeadTimeByMeasure?.has(line.id) ?? false);
  const weeksEarly = needIdx === null ? null : needIdx - due;
  const early = weeksEarly !== null && weeksEarly >= input.thresholdWeeks;

  /** @type {ProposalType} */
  let type;
  /** @type {number} */
  let toIdx;
  /** @type {number} */
  let toQty;
  let bandLimited = false;
  if (needed <= EPS) {
    type = 'cancel';
    toIdx = T;
    toQty = 0;
  } else {
    const rounded = Math.min(
      line.quantity,
      interimOrderSize(needed, terms.moq, terms.orderMultiple)
    );
    /** @type {number | null} */
    let reduceTo = rounded < line.quantity - EPS ? rounded : null;
    if (reduceTo !== null && zone === 'tradeOff') {
      const total = line.quantity + line.receivedQuantity;
      if (
        breachesToleranceBand(total, reduceTo + line.receivedQuantity, line.firstQuantity, band)
      ) {
        // Held to the band: the smallest open quantity whose total stays inside it.
        const floorTotal = Math.max(
          total * (1 - band.perVersion),
          line.firstQuantity * (1 - band.cumulative)
        );
        const capped = Math.max(rounded, ceilTo(floorTotal - line.receivedQuantity, stepOf(terms)));
        reduceTo = capped < line.quantity - EPS ? capped : null;
        bandLimited = reduceTo !== null;
      }
    }
    if (reduceTo !== null) {
      type = 'reduce';
      toQty = reduceTo;
      toIdx = early ? /** @type {NonNullable<typeof needIdx>} */ (needIdx) : due;
    } else if (early) {
      type = 'rescheduleOut';
      toQty = line.quantity;
      toIdx = /** @type {NonNullable<typeof needIdx>} */ (needIdx);
    } else if (weeksEarly !== null && weeksEarly < 0) {
      type = 'rescheduleIn';
      toQty = line.quantity;
      toIdx = /** @type {NonNullable<typeof needIdx>} */ (needIdx);
    } else {
      return null;
    }
  }

  const beyondBand =
    type === 'cancel' ||
    (type === 'reduce' &&
      breachesToleranceBand(
        line.quantity + line.receivedQuantity,
        toQty + line.receivedQuantity,
        line.firstQuantity,
        band
      ));
  const liability = zone !== 'forecast' && beyondBand;
  const proposedDate = type === 'cancel' ? null : changeDate(weeks[toIdx], input.asOf);
  const proposedInsideLeadTime =
    type === 'rescheduleIn' &&
    proposedDate !== null &&
    daysBetween(input.asOf, proposedDate) < terms.leadTimeDays;
  const needsSupplierAgreement =
    zone === 'firm' || insideLeadTime || liability || proposedInsideLeadTime;
  /** @type {RankTier} */
  const tier = zone === 'firm' || insideLeadTime || proposedInsideLeadTime ? 2 : liability ? 1 : 0;
  const palletsChanged =
    (type === 'rescheduleOut' || type === 'rescheduleIn' ? line.quantity : line.quantity - toQty) /
    upp;
  const freedPallets = freedPalletsOf(T, due, line.quantity, toIdx, toQty, upp);
  return {
    id: line.id,
    line,
    warehouseKind: mat.kind,
    type,
    currentWeek: weeks[due],
    needWeek: needIdx === null ? null : weeks[needIdx],
    weeksEarly,
    proposedDate,
    proposedQuantity: toQty,
    neededQuantity: needed,
    zone,
    daysAhead,
    leadTimeDays: terms.leadTimeDays,
    insideLeadTime,
    bandLimited,
    liability,
    lastOpenLineOnPo: lastOpenLineOnPo && type === 'cancel' && line.kind === 'poLine',
    needsSupplierAgreement,
    tier,
    palletsChanged,
    freedPallets,
    palletWeeksFreed: freedPallets.reduce((s, p) => s + p, 0),
    changePenaltyIdr: insideLeadTime ? palletsChanged * input.costs.changePenaltyIdrPerPallet : 0,
    addsToPlanChange: input.addsToPlanChange?.has(line.id) ?? false
  };
}

// ── The run ─────────────────────────────────────────────────────────────────

/**
 * REQ-E14-13 over prepared inputs: every warehouse, every open line.
 * @param {RescheduleInput} input
 * @returns {RescheduleRun}
 */
export function reschedule(input) {
  const T = input.weeks.length;
  const band = input.band ?? DEFAULT_TOLERANCE_BAND;
  const openPerPo = /** @type {Map<string, number>} */ (new Map());
  for (const l of input.lines)
    if (l.kind === 'poLine') openPerPo.set(l.poNumber, (openPerPo.get(l.poNumber) ?? 0) + 1);

  const warehouses = input.warehouses.map(
    /** @returns {WarehouseReschedule} */ (wh) => {
      const mats = input.materials.filter((m) => m.kind === wh.kind);
      const cap = wh.capacityPallets;
      const pallets = /** @type {Array<number>} */ (new Array(T)).fill(0);
      const onHand = /** @type {Array<number>} */ (new Array(T)).fill(0);
      /** @type {Draft[]} */
      const drafts = [];
      /** @type {InfoLine[]} */
      const info = [];

      for (const m of mats) {
        const lines = input.lines
          .filter(
            (l) => l.materialCode === m.materialCode && weekIndex(input.weeks, l.date) !== null
          )
          .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
        const cg = cumulative(m.gross);
        if (m.unitsPerPallet !== null && m.unitsPerPallet > 0) {
          // The projection: stock, open lines and planned receipts, less gross.
          const add = /** @type {Array<number>} */ (new Array(T)).fill(0);
          for (const l of lines)
            add[
              /** @type {NonNullable<ReturnType<typeof weekIndex>>} */ (
                weekIndex(input.weeks, l.date)
              )
            ] += l.quantity;
          let s = m.startStock;
          for (let t = 0; t < T; t += 1) {
            s += add[t] + (m.planned[t] ?? 0) - m.gross[t];
            pallets[t] += s / m.unitsPerPallet;
            onHand[t] += Math.max(0, m.startStock - cg[t]) / m.unitsPerPallet;
          }
        }
        let supply = m.startStock;
        for (const l of lines) {
          const terms = input.terms.get(termsKey(l.supplierId, l.materialCode));
          /** @type {InfoReason | null} */
          const reason =
            l.info ??
            (!(m.unitsPerPallet !== null && m.unitsPerPallet > 0)
              ? 'noVolume'
              : !terms
                ? 'noSource'
                : null);
          if (reason !== null) info.push({ line: l, warehouseKind: wh.kind, reason });
          else {
            const d = draftProposal(
              input,
              l,
              m,
              /** @type {LineTerms} */ (terms),
              supply,
              cg,
              (openPerPo.get(l.poNumber) ?? 0) === 1
            );
            if (d) drafts.push(d);
          }
          supply += l.quantity;
        }
      }

      // BR-05 / BR-06 — value the relief proposals together, in rank order.
      const state = [...pallets];
      /** @param {Draft} d */
      const rentOf = (d) => {
        const freed =
          overOf(state, cap) -
          overOf(
            state.map((p, t) => p - d.freedPallets[t]),
            cap
          );
        return { freed, net: freed * input.costs.rentIdrPerPalletWeek - d.changePenaltyIdr };
      };
      /** @type {readonly ProposalType[]} */
      const reliefTypes = ['rescheduleOut', 'reduce', 'cancel'];
      let pool = drafts.filter((d) => reliefTypes.includes(d.type));
      /** @type {Proposal[]} */
      const ranked = [];
      for (const tier of /** @type {const} */ ([0, 1, 2])) {
        for (;;) {
          /** @type {{ d: Draft; freed: number; net: number } | null} */
          let best = null;
          for (const d of pool) {
            if (d.tier !== tier) continue;
            const v = rentOf(d);
            if (v.freed <= EPS) continue;
            if (
              !best ||
              v.net > best.net + EPS ||
              (Math.abs(v.net - best.net) <= EPS && d.id < best.d.id)
            )
              best = { d, ...v };
          }
          if (!best) break;
          const { d, freed, net } = best;
          ranked.push({
            ...d,
            overCapacityPalletWeeksFreed: freed,
            rentSavedIdr: freed * input.costs.rentIdrPerPalletWeek,
            netSavingIdr: net,
            rank: ranked.length + 1
          });
          for (let t = 0; t < T; t += 1) state[t] -= d.freedPallets[t];
          pool = pool.filter((x) => x !== d);
        }
      }
      const rankedIds = new Set(ranked.map((p) => p.id));
      /** @type {Proposal[]} */
      const rest = drafts
        .filter((d) => !rankedIds.has(d.id))
        .map((d) => ({
          ...d,
          overCapacityPalletWeeksFreed: 0,
          rentSavedIdr: 0,
          netSavingIdr: -d.changePenaltyIdr,
          rank: null
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

      /** @type {RescheduleWeek[]} */
      const weeks = input.weeks.map((w, t) => ({
        weekStart: w,
        pallets: pallets[t],
        palletsAfterRelief: state[t],
        onHandPallets: onHand[t],
        fill: pallets[t] / cap,
        fillAfterRelief: state[t] / cap,
        onHandFill: onHand[t] / cap,
        overPallets: Math.max(0, pallets[t] - cap),
        overPalletsAfterRelief: Math.max(0, state[t] - cap),
        onHandOverPallets: Math.max(0, onHand[t] - cap)
      }));
      /** @param {(p: Proposal) => number} f */
      const sum = (f) => ranked.reduce((s, p) => s + f(p), 0);
      return {
        warehouseId: wh.warehouseId,
        kind: wh.kind,
        capacityPallets: cap,
        weeks,
        proposals: [...ranked, ...rest],
        info: info.sort((a, b) => a.line.id.localeCompare(b.line.id)),
        totals: {
          overPalletWeeks: overOf(pallets, cap),
          overPalletWeeksAfterRelief: overOf(state, cap),
          onHandOverPalletWeeks: weeks.reduce((s, w) => s + w.onHandOverPallets, 0),
          reliefProposals: ranked.length,
          reliefPalletWeeks: sum((p) => p.overCapacityPalletWeeksFreed),
          rentSavedIdr: sum((p) => p.rentSavedIdr),
          changePenaltyIdr: sum((p) => p.changePenaltyIdr),
          netSavingIdr: sum((p) => p.netSavingIdr)
        }
      };
    }
  );

  return {
    asOf: input.asOf,
    weeks: input.weeks,
    method: {
      name: 'need-date reschedule with joint relief',
      spec: 'REQ-E14-13; METHOD-SPEC M2, M5',
      version: 1
    },
    costs: input.costs,
    thresholdWeeks: input.thresholdWeeks,
    band,
    warehouses
  };
}

// ── A selection (the planner's ticks) ───────────────────────────────────────

/**
 * @typedef {object} SelectionEffect
 * @property {readonly number[]} pallets -  End-of-week pallets with the selected changes applied, recomputed from the baseline.
 * @property {readonly number[]} fill
 * @property {number} overPalletWeeks
 * @property {number} freedOverPalletWeeks -  Over-capacity pallet-weeks the selection frees, jointly (never double-counted).
 * @property {number} rentSavedIdr
 * @property {number} changePenaltyIdr
 * @property {number} insideLeadTime
 */

/**
 * AC-03 / AC-04 — the effect of a set of proposals, applied together to the baseline.
 * @param {WarehouseReschedule} w
 * @param {ReadonlySet<string>} selected
 * @param {RescheduleCosts} costs
 * @returns {SelectionEffect}
 */
export function selectionEffect(w, selected, costs) {
  const chosen = w.proposals.filter((p) => selected.has(p.id));
  const pallets = w.weeks.map((wk, t) =>
    chosen.reduce((s, p) => s - p.freedPallets[t], wk.pallets)
  );
  const before = w.totals.overPalletWeeks;
  const after = overOf(pallets, w.capacityPallets);
  const penalty = chosen.reduce((s, p) => s + p.changePenaltyIdr, 0);
  return {
    pallets,
    fill: pallets.map((p) => p / w.capacityPallets),
    overPalletWeeks: after,
    freedOverPalletWeeks: before - after,
    rentSavedIdr: (before - after) * costs.rentIdrPerPalletWeek,
    changePenaltyIdr: penalty,
    insideLeadTime: chosen.filter((p) => p.insideLeadTime).length
  };
}

// ── The dataset adapter ─────────────────────────────────────────────────────

/**
 * E14-03's open receipts (the confirmed PO lines it nets) as order lines, with
 * the first quantity from the line itself (ENG-D8's cumulative band).
 * @param {Pick<EngineDataset, 'poLines' | 'scheduleChanges' | 'confirmations' | 'receipts'>} data
 * @param {MaterialRequirementRun} run
 * @returns {OpenOrderLine[]}
 */
export function poOrderLines(data, run) {
  const hist = new Map(lineHistories(data).map((h) => [lineKey(h.line.poNumber, h.line.line), h]));
  return run.materials.flatMap((m) =>
    m.receipts.map(
      /** @returns {OpenOrderLine} */ (r) => {
        const h = /** @type {import('./lines').LineHistory} */ (
          hist.get(lineKey(r.poNumber, r.line))
        );
        const received = h.receipts.reduce((s, x) => s + x.receivedQty, 0);
        return {
          id: `po:${lineKey(r.poNumber, r.line)}`,
          kind: 'poLine',
          reference: `${r.poNumber}/${r.line}`,
          callOffId: null,
          poNumber: r.poNumber,
          poLine: r.line,
          supplierId: r.supplierId,
          materialCode: r.materialCode,
          quantity: r.quantity,
          receivedQuantity: received,
          firstQuantity: h.line.orderedQty,
          date: r.date,
          confirmed: r.confirmed,
          info: null
        };
      }
    )
  );
}

/**
 * @typedef {object} PlanChangeBaseline
 * @property {IsoDate} windowFrom
 * @property {IsoDate} windowTo
 * @property {number} schedules -  PO lines created in the window (E14-02 BR-05's denominator).
 * @property {number} changedInsideLeadTime
 * @property {number | null} share
 */

/**
 * BR-09 — E14-02's portfolio "share of schedules changed inside the lead time"
 * over its trailing window, and the PO lines a change sent now would ADD to it.
 * @param {EngineDataset} data
 * @param {IsoInstant} asOf
 * @param {number} windowWeeks
 * @param {readonly OpenOrderLine[]} lines
 * @param {ToleranceBand} [band]
 * @returns {{ readonly baseline: PlanChangeBaseline; readonly adds: Set<string>; readonly inside: Set<string> }}
 */
export function planChangeGuard(data, asOf, windowWeeks, lines, band = DEFAULT_TOLERANCE_BAND) {
  const w = trailingWindow(asOf, windowWeeks);
  const p = portfolioReliability(supplierReliability(data, w, { band })).planChange;
  const lt = new Map(
    data.sources.map((s) => [termsKey(s.supplierId, s.materialCode), s.leadTimeDays])
  );
  const assessed = new Map(
    assessAll(data, asOf, band).map((x) => [lineKey(x.a.poNumber, x.a.line), x])
  );
  const adds = /** @type {Set<string>} */ (new Set());
  const inside = /** @type {Set<string>} */ (new Set());
  for (const l of lines) {
    if (l.kind !== 'poLine' || l.poLine === null) continue;
    const x = assessed.get(lineKey(l.poNumber, l.poLine));
    const leadTime = lt.get(termsKey(l.supplierId, l.materialCode));
    if (!x || leadTime === undefined || !isInsideLeadTime(asOf, requirementAt(x.h).date, leadTime))
      continue;
    inside.add(l.id);
    const created = dayOf(x.h.line.createdAt);
    const inWindow = created >= w.from && created <= w.to && created <= dayOf(w.asOf);
    if (inWindow && !x.a.changedInsideLeadTime) adds.add(l.id);
  }
  return {
    baseline: {
      windowFrom: w.from,
      windowTo: w.to,
      schedules: p.schedules,
      changedInsideLeadTime: p.changedInsideLeadTime,
      share: p.share
    },
    adds,
    inside
  };
}

/**
 * BR-09 — the share after sending the selected proposals (each line counts once).
 * @param {PlanChangeBaseline} baseline
 * @param {readonly Proposal[]} proposals
 * @param {ReadonlySet<string>} selected
 * @returns {PlanChangeBaseline}
 */
export function planChangeAfter(baseline, proposals, selected) {
  const added = new Set(
    proposals.filter((p) => selected.has(p.id) && p.addsToPlanChange).map((p) => p.id)
  ).size;
  const changed = baseline.changedInsideLeadTime + added;
  return {
    ...baseline,
    changedInsideLeadTime: changed,
    share: baseline.schedules > 0 ? changed / baseline.schedules : null
  };
}
