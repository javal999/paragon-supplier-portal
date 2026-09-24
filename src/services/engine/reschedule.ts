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
// days ahead against a 14-day lead time → no penalty. `reschedule.test.ts`
// runs it verbatim.
// ─────────────────────────────────────────────────────────────────────────────

import { dayOf, daysBetween, mondayOf } from './dates';
import { lineHistories, requirementAt } from './lines';
import {
  DEFAULT_TOLERANCE_BAND,
  assessAll,
  breachesToleranceBand,
  isInsideLeadTime,
  portfolioReliability,
  supplierReliability,
  trailingWindow,
  type ToleranceBand,
} from './reliability';
import { interimOrderSize, type MaterialRequirementRun } from './requirement';
import { lineKey, type EngineDataset, type IsoDate, type IsoInstant, type WarehouseKind } from './types';
import type { Uom } from '../sdc/types';

const EPS = 1e-6;

// ── Inputs ──────────────────────────────────────────────────────────────────

export type OrderLineKind = 'poLine' | 'callOff';

/** Why a line is in the projection but is not proposed (BR-01 and the verbs' own rules). */
export type InfoReason =
  | 'dispatched' // BR-01: already on its way
  | 'awaitingConfirmation' // the supplier has not answered; the change verb waits for the answer
  | 'changePending' // a change was sent and is not yet confirmed: nothing counts as moved
  | 'awaitingApproval' // a confirmation waits for the planner
  | 'multipleDeliveries' // confirmed as two deliveries; the change verb sets one
  | 'noSource' // no supplier source: no lead time, MOQ or zone to judge a change by
  | 'noVolume'; // no pallet conversion: its space cannot be valued

/** One open order line: a PO schedule line, or one of the Hub's call-offs. */
export interface OpenOrderLine {
  /** `po:<poNumber>#<line>` or `co:<call-off id>`. */
  readonly id: string;
  readonly kind: OrderLineKind;
  /** What a person reads: `SYN-PO-00213/1`, `CO-2026-0002`. */
  readonly reference: string;
  /** Call-off: its id (the change verb's entity). PO line: null. */
  readonly callOffId: string | null;
  readonly poNumber: string;
  readonly poLine: number | null;
  readonly supplierId: string;
  readonly materialCode: string;
  /** Still to arrive. */
  readonly quantity: number;
  /** Already received against the line. */
  readonly receivedQuantity: number;
  /** The first quantity the supplier saw (ENG-D8 cumulative band). */
  readonly firstQuantity: number;
  /** The date in force (supplier-confirmed or agreed; the need date before any answer). */
  readonly date: IsoDate;
  readonly confirmed: boolean;
  /** Set when the line is projected but not proposed. */
  readonly info: InfoReason | null;
}

/** The supplier terms a proposal is judged by (E14-01 source, REQ-E06-01 zones). */
export interface LineTerms {
  readonly leadTimeDays: number;
  /** Firm zone length (REQ-E06-01 BR-01: defaults to the lead time). */
  readonly firmDays: number;
  readonly tradeOffDays: number;
  readonly moq: number;
  readonly orderMultiple: number;
}

export interface RescheduleMaterial {
  readonly materialCode: string;
  readonly kind: WarehouseKind;
  readonly uom: Uom;
  readonly startStock: number;
  readonly safetyStock: number;
  /** Per week index. */
  readonly gross: readonly number[];
  /** E14-05's planned receipts per week index. */
  readonly planned: readonly number[];
  /** Null: no pallet conversion. */
  readonly unitsPerPallet: number | null;
}

export interface RescheduleWarehouse {
  readonly warehouseId: string;
  readonly kind: WarehouseKind;
  readonly capacityPallets: number;
}

export interface RescheduleCosts {
  /** ENG-D6 — rupiah per rented pallet per week. */
  readonly rentIdrPerPalletWeek: number;
  /** E14-05 BR-03 — rupiah per pallet changed inside the lead time. */
  readonly changePenaltyIdrPerPallet: number;
}

export interface RescheduleInput {
  /** The present (the day a change would be made). */
  readonly asOf: IsoDate;
  /** The planning weeks, Mondays, oldest first. */
  readonly weeks: readonly IsoDate[];
  readonly warehouses: readonly RescheduleWarehouse[];
  readonly materials: readonly RescheduleMaterial[];
  readonly lines: readonly OpenOrderLine[];
  /** Keyed `supplierId|materialCode`. A line without terms is info `noSource`. */
  readonly terms: ReadonlyMap<string, LineTerms>;
  readonly costs: RescheduleCosts;
  /** ENG-D15 — weeks early before a reschedule-out is proposed (default 1). */
  readonly thresholdWeeks: number;
  readonly band?: ToleranceBand;
  /**
   * E14-02 (BR-09): the PO lines a change sent now would add to PTI's "changed
   * inside the lead time" count, by line id. Absent: none is known to.
   */
  readonly addsToPlanChange?: ReadonlySet<string>;
  /**
   * E14-02's own reading of "inside the lead time" (against PTI's requested
   * date in force), by line id. A line in it is inside the lead time here too,
   * even when its confirmed date is further out, so the report never calls
   * "free" a change the supplier measure counts against PTI (ENG-B23).
   */
  readonly insideLeadTimeByMeasure?: ReadonlySet<string>;
}

// ── Outputs ─────────────────────────────────────────────────────────────────

export type ProposalType = 'rescheduleOut' | 'rescheduleIn' | 'reduce' | 'cancel';
export type Zone = 'firm' | 'tradeOff' | 'forecast';

/**
 * Rank tier (BR-04, BR-05): 0 — free to send; 1 — a commercial conversation
 * (a Trade-off cancellation carries the supplier's liability, ENG-D17);
 * 2 — inside the lead time or the Firm zone: needs supplier agreement, last.
 */
export type RankTier = 0 | 1 | 2;

export interface Proposal {
  /** = the line id. */
  readonly id: string;
  readonly line: OpenOrderLine;
  readonly warehouseKind: WarehouseKind;
  readonly type: ProposalType;
  /** The week the line lands in now (an overdue line lands in the first week). */
  readonly currentWeek: IsoDate;
  /** BR-02 — null when none of the line is needed within the horizon. */
  readonly needWeek: IsoDate | null;
  /** Whole weeks the line is early (positive) or late (negative); null with no need week. */
  readonly weeksEarly: number | null;
  /** Null for a cancellation. Never before the present (the verbs refuse a past date). */
  readonly proposedDate: IsoDate | null;
  readonly proposedQuantity: number;
  /** The part needed within the horizon, before rounding to MOQ and multiple. */
  readonly neededQuantity: number;
  readonly zone: Zone;
  /** Days from the present to the line's date in force. */
  readonly daysAhead: number;
  readonly leadTimeDays: number;
  readonly insideLeadTime: boolean;
  /** A Trade-off reduction held to the ENG-D8 band (the needed part was smaller). */
  readonly bandLimited: boolean;
  /** ENG-D17 — the supplier's liability for material already bought: flagged, not priced. */
  readonly liability: boolean;
  /** A cancelled PO line that is the last open line on its PO: the buyer checks the contract. */
  readonly lastOpenLineOnPo: boolean;
  readonly needsSupplierAgreement: boolean;
  readonly tier: RankTier;
  /** Pallets the change moves or removes. */
  readonly palletsChanged: number;
  /** Per week index: pallets freed by this change alone (negative: added). */
  readonly freedPallets: readonly number[];
  /** Σ freedPallets — every week, over capacity or not. */
  readonly palletWeeksFreed: number;
  /** Relief: freed pallet-weeks ABOVE capacity, valued jointly in rank order (BR-06). */
  readonly overCapacityPalletWeeksFreed: number;
  readonly rentSavedIdr: number;
  readonly changePenaltyIdr: number;
  /** rentSaved − changePenalty (the liability is not priced, ENG-D17). */
  readonly netSavingIdr: number;
  /** 1-based rank on the warehouse's relief list; null when it is not relief. */
  readonly rank: number | null;
  /** E14-02 (BR-09): sending it would add a PTI change inside the lead time to the measure. */
  readonly addsToPlanChange: boolean;
}

export interface RescheduleWeek {
  readonly weekStart: IsoDate;
  /** End-of-week pallets now (open lines, planned orders, stock). */
  readonly pallets: number;
  /** After every relief proposal on the list. */
  readonly palletsAfterRelief: number;
  /** Stock already on hand the plan has not used yet. */
  readonly onHandPallets: number;
  readonly fill: number;
  readonly fillAfterRelief: number;
  readonly onHandFill: number;
  readonly overPallets: number;
  readonly overPalletsAfterRelief: number;
  /** Pallets above capacity that are stock on hand: no open order can relieve them. */
  readonly onHandOverPallets: number;
}

export interface InfoLine {
  readonly line: OpenOrderLine;
  readonly warehouseKind: WarehouseKind;
  readonly reason: InfoReason;
}

export interface WarehouseReschedule {
  readonly warehouseId: string;
  readonly kind: WarehouseKind;
  readonly capacityPallets: number;
  readonly weeks: readonly RescheduleWeek[];
  /** Relief first (by rank), then the rest by id. */
  readonly proposals: readonly Proposal[];
  /** Lines projected but not proposed, with why. */
  readonly info: readonly InfoLine[];
  readonly totals: {
    readonly overPalletWeeks: number;
    readonly overPalletWeeksAfterRelief: number;
    /** Of the over-capacity pallet-weeks, those that are stock on hand. */
    readonly onHandOverPalletWeeks: number;
    readonly reliefProposals: number;
    readonly reliefPalletWeeks: number;
    readonly rentSavedIdr: number;
    readonly changePenaltyIdr: number;
    readonly netSavingIdr: number;
  };
}

export interface RescheduleRun {
  readonly asOf: IsoDate;
  readonly weeks: readonly IsoDate[];
  readonly method: { readonly name: 'need-date reschedule with joint relief'; readonly spec: 'REQ-E14-13; METHOD-SPEC M2, M5'; readonly version: 1 };
  readonly costs: RescheduleCosts;
  readonly thresholdWeeks: number;
  readonly band: ToleranceBand;
  readonly warehouses: readonly WarehouseReschedule[];
}

// ── The arithmetic ──────────────────────────────────────────────────────────

const ceilTo = (y: number, step: number): number => Math.ceil(y / step - 1e-9) * step;
const stepOf = (t: Pick<LineTerms, 'orderMultiple'>) => (t.orderMultiple > 0 ? t.orderMultiple : 1);
export const termsKey = (supplierId: string, materialCode: string): string => `${supplierId}|${materialCode}`;

/** The week index a date lands in: before the first week → 0; after the last → null. */
export function weekIndex(weeks: readonly IsoDate[], date: IsoDate): number | null {
  if (weeks.length === 0) return null;
  const i = Math.round(daysBetween(weeks[0], mondayOf(date)) / 7);
  if (i < 0) return 0;
  return i < weeks.length ? i : null;
}

/** BR-04 — where a line sits in the supplier's zones, by days ahead. */
export function zoneOf(daysAhead: number, terms: Pick<LineTerms, 'firmDays' | 'tradeOffDays'>): Zone {
  if (daysAhead < terms.firmDays) return 'firm';
  return daysAhead < terms.firmDays + terms.tradeOffDays ? 'tradeOff' : 'forecast';
}

/** Cumulative gross by the end of each week. */
const cumulative = (xs: readonly number[]): number[] => {
  let s = 0;
  return xs.map((x) => (s += x));
};

/**
 * BR-02 — the need week index of a line, given the supply ahead of it
 * (start + earlier lines): the first week stock without it falls below safety
 * stock; null when it never does within the horizon.
 */
export function needWeekIndex(supplyBefore: number, cumGross: readonly number[], safetyStock: number): number | null {
  for (let t = 0; t < cumGross.length; t += 1) if (supplyBefore - cumGross[t] < safetyStock - EPS) return t;
  return null;
}

/** The part of a line needed within the horizon (before rounding). */
export function neededWithinHorizon(supplyBefore: number, cumGross: readonly number[], safetyStock: number, quantity: number): number {
  const total = cumGross[cumGross.length - 1] ?? 0;
  return Math.min(quantity, Math.max(0, total + safetyStock - supplyBefore));
}

/** Pallets freed per week when `qty` moves from week `from` to week `to` as `toQty` (index ≥ T: never arrives). */
export function freedPalletsOf(T: number, from: number, qty: number, to: number, toQty: number, unitsPerPallet: number): number[] {
  return Array.from({ length: T }, (_, t) => ((t >= from ? qty : 0) - (t >= to ? toQty : 0)) / unitsPerPallet);
}

/** The Monday of a week as a date a change can carry: the present when that Monday has passed (ENG-B16). */
export const changeDate = (weekStart: IsoDate, asOf: IsoDate): IsoDate => (weekStart < asOf ? asOf : weekStart);

const overOf = (pallets: readonly number[], cap: number) => pallets.reduce((s, p) => s + Math.max(0, p - cap), 0);

// ── One line → its proposal (before valuation) ──────────────────────────────

type Draft = Omit<Proposal, 'overCapacityPalletWeeksFreed' | 'rentSavedIdr' | 'netSavingIdr' | 'rank'>;

function draftProposal(
  input: RescheduleInput,
  line: OpenOrderLine,
  mat: RescheduleMaterial,
  terms: LineTerms,
  supplyBefore: number,
  cumGross: readonly number[],
  lastOpenLineOnPo: boolean,
): Draft | null {
  const { weeks } = input;
  const T = weeks.length;
  const band = input.band ?? DEFAULT_TOLERANCE_BAND;
  const upp = mat.unitsPerPallet!;
  const due = weekIndex(weeks, line.date)!;
  const needIdx = needWeekIndex(supplyBefore, cumGross, mat.safetyStock);
  const needed = neededWithinHorizon(supplyBefore, cumGross, mat.safetyStock, line.quantity);
  const daysAhead = daysBetween(input.asOf, line.date);
  const zone = zoneOf(daysAhead, terms);
  const insideLeadTime = daysAhead < terms.leadTimeDays || (input.insideLeadTimeByMeasure?.has(line.id) ?? false);
  const weeksEarly = needIdx === null ? null : needIdx - due;
  const early = weeksEarly !== null && weeksEarly >= input.thresholdWeeks;

  let type: ProposalType;
  let toIdx: number;
  let toQty: number;
  let bandLimited = false;
  if (needed <= EPS) {
    type = 'cancel';
    toIdx = T;
    toQty = 0;
  } else {
    const rounded = Math.min(line.quantity, interimOrderSize(needed, terms.moq, terms.orderMultiple));
    let reduceTo: number | null = rounded < line.quantity - EPS ? rounded : null;
    if (reduceTo !== null && zone === 'tradeOff') {
      const total = line.quantity + line.receivedQuantity;
      if (breachesToleranceBand(total, reduceTo + line.receivedQuantity, line.firstQuantity, band)) {
        // Held to the band: the smallest open quantity whose total stays inside it.
        const floorTotal = Math.max(total * (1 - band.perVersion), line.firstQuantity * (1 - band.cumulative));
        const capped = Math.max(rounded, ceilTo(floorTotal - line.receivedQuantity, stepOf(terms)));
        reduceTo = capped < line.quantity - EPS ? capped : null;
        bandLimited = reduceTo !== null;
      }
    }
    if (reduceTo !== null) {
      type = 'reduce';
      toQty = reduceTo;
      toIdx = early ? needIdx! : due;
    } else if (early) {
      type = 'rescheduleOut';
      toQty = line.quantity;
      toIdx = needIdx!;
    } else if (weeksEarly !== null && weeksEarly < 0) {
      type = 'rescheduleIn';
      toQty = line.quantity;
      toIdx = needIdx!;
    } else {
      return null;
    }
  }

  const beyondBand =
    type === 'cancel' ||
    (type === 'reduce' &&
      breachesToleranceBand(line.quantity + line.receivedQuantity, toQty + line.receivedQuantity, line.firstQuantity, band));
  const liability = zone !== 'forecast' && beyondBand;
  const proposedDate = type === 'cancel' ? null : changeDate(weeks[toIdx], input.asOf);
  const proposedInsideLeadTime =
    type === 'rescheduleIn' && proposedDate !== null && daysBetween(input.asOf, proposedDate) < terms.leadTimeDays;
  const needsSupplierAgreement = zone === 'firm' || insideLeadTime || liability || proposedInsideLeadTime;
  const tier: RankTier = zone === 'firm' || insideLeadTime || proposedInsideLeadTime ? 2 : liability ? 1 : 0;
  const palletsChanged = (type === 'rescheduleOut' || type === 'rescheduleIn' ? line.quantity : line.quantity - toQty) / upp;
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
    addsToPlanChange: input.addsToPlanChange?.has(line.id) ?? false,
  };
}

// ── The run ─────────────────────────────────────────────────────────────────

/** REQ-E14-13 over prepared inputs: every warehouse, every open line. */
export function reschedule(input: RescheduleInput): RescheduleRun {
  const T = input.weeks.length;
  const band = input.band ?? DEFAULT_TOLERANCE_BAND;
  const openPerPo = new Map<string, number>();
  for (const l of input.lines) if (l.kind === 'poLine') openPerPo.set(l.poNumber, (openPerPo.get(l.poNumber) ?? 0) + 1);

  const warehouses = input.warehouses.map((wh): WarehouseReschedule => {
    const mats = input.materials.filter((m) => m.kind === wh.kind);
    const cap = wh.capacityPallets;
    const pallets = new Array<number>(T).fill(0);
    const onHand = new Array<number>(T).fill(0);
    const drafts: Draft[] = [];
    const info: InfoLine[] = [];

    for (const m of mats) {
      const lines = input.lines
        .filter((l) => l.materialCode === m.materialCode && weekIndex(input.weeks, l.date) !== null)
        .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
      const cg = cumulative(m.gross);
      if (m.unitsPerPallet !== null && m.unitsPerPallet > 0) {
        // The projection: stock, open lines and planned receipts, less gross.
        const add = new Array<number>(T).fill(0);
        for (const l of lines) add[weekIndex(input.weeks, l.date)!] += l.quantity;
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
        const reason: InfoReason | null =
          l.info ?? (!(m.unitsPerPallet !== null && m.unitsPerPallet > 0) ? 'noVolume' : !terms ? 'noSource' : null);
        if (reason !== null) info.push({ line: l, warehouseKind: wh.kind, reason });
        else {
          const d = draftProposal(input, l, m, terms!, supply, cg, (openPerPo.get(l.poNumber) ?? 0) === 1);
          if (d) drafts.push(d);
        }
        supply += l.quantity;
      }
    }

    // BR-05 / BR-06 — value the relief proposals together, in rank order.
    const state = [...pallets];
    const rentOf = (d: Draft) => {
      const freed = overOf(state, cap) - overOf(state.map((p, t) => p - d.freedPallets[t]), cap);
      return { freed, net: freed * input.costs.rentIdrPerPalletWeek - d.changePenaltyIdr };
    };
    const reliefTypes: readonly ProposalType[] = ['rescheduleOut', 'reduce', 'cancel'];
    let pool = drafts.filter((d) => reliefTypes.includes(d.type));
    const ranked: Proposal[] = [];
    for (const tier of [0, 1, 2] as const) {
      for (;;) {
        let best: { d: Draft; freed: number; net: number } | null = null;
        for (const d of pool) {
          if (d.tier !== tier) continue;
          const v = rentOf(d);
          if (v.freed <= EPS) continue;
          if (!best || v.net > best.net + EPS || (Math.abs(v.net - best.net) <= EPS && d.id < best.d.id)) best = { d, ...v };
        }
        if (!best) break;
        const { d, freed, net } = best;
        ranked.push({
          ...d,
          overCapacityPalletWeeksFreed: freed,
          rentSavedIdr: freed * input.costs.rentIdrPerPalletWeek,
          netSavingIdr: net,
          rank: ranked.length + 1,
        });
        for (let t = 0; t < T; t += 1) state[t] -= d.freedPallets[t];
        pool = pool.filter((x) => x !== d);
      }
    }
    const rankedIds = new Set(ranked.map((p) => p.id));
    const rest: Proposal[] = drafts
      .filter((d) => !rankedIds.has(d.id))
      .map((d) => ({ ...d, overCapacityPalletWeeksFreed: 0, rentSavedIdr: 0, netSavingIdr: -d.changePenaltyIdr, rank: null }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const weeks: RescheduleWeek[] = input.weeks.map((w, t) => ({
      weekStart: w,
      pallets: pallets[t],
      palletsAfterRelief: state[t],
      onHandPallets: onHand[t],
      fill: pallets[t] / cap,
      fillAfterRelief: state[t] / cap,
      onHandFill: onHand[t] / cap,
      overPallets: Math.max(0, pallets[t] - cap),
      overPalletsAfterRelief: Math.max(0, state[t] - cap),
      onHandOverPallets: Math.max(0, onHand[t] - cap),
    }));
    const sum = (f: (p: Proposal) => number) => ranked.reduce((s, p) => s + f(p), 0);
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
        netSavingIdr: sum((p) => p.netSavingIdr),
      },
    };
  });

  return {
    asOf: input.asOf,
    weeks: input.weeks,
    method: { name: 'need-date reschedule with joint relief', spec: 'REQ-E14-13; METHOD-SPEC M2, M5', version: 1 },
    costs: input.costs,
    thresholdWeeks: input.thresholdWeeks,
    band,
    warehouses,
  };
}

// ── A selection (the planner's ticks) ───────────────────────────────────────

export interface SelectionEffect {
  /** End-of-week pallets with the selected changes applied, recomputed from the baseline. */
  readonly pallets: readonly number[];
  readonly fill: readonly number[];
  readonly overPalletWeeks: number;
  /** Over-capacity pallet-weeks the selection frees, jointly (never double-counted). */
  readonly freedOverPalletWeeks: number;
  readonly rentSavedIdr: number;
  readonly changePenaltyIdr: number;
  readonly insideLeadTime: number;
}

/** AC-03 / AC-04 — the effect of a set of proposals, applied together to the baseline. */
export function selectionEffect(w: WarehouseReschedule, selected: ReadonlySet<string>, costs: RescheduleCosts): SelectionEffect {
  const chosen = w.proposals.filter((p) => selected.has(p.id));
  const pallets = w.weeks.map((wk, t) => chosen.reduce((s, p) => s - p.freedPallets[t], wk.pallets));
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
    insideLeadTime: chosen.filter((p) => p.insideLeadTime).length,
  };
}

// ── The dataset adapter ─────────────────────────────────────────────────────

/**
 * E14-03's open receipts (the confirmed PO lines it nets) as order lines, with
 * the first quantity from the line itself (ENG-D8's cumulative band).
 */
export function poOrderLines(data: Pick<EngineDataset, 'poLines' | 'scheduleChanges' | 'confirmations' | 'receipts'>, run: MaterialRequirementRun): OpenOrderLine[] {
  const hist = new Map(lineHistories(data).map((h) => [lineKey(h.line.poNumber, h.line.line), h]));
  return run.materials.flatMap((m) =>
    m.receipts.map((r): OpenOrderLine => {
      const h = hist.get(lineKey(r.poNumber, r.line))!;
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
        info: null,
      };
    }),
  );
}

export interface PlanChangeBaseline {
  readonly windowFrom: IsoDate;
  readonly windowTo: IsoDate;
  /** PO lines created in the window (E14-02 BR-05's denominator). */
  readonly schedules: number;
  readonly changedInsideLeadTime: number;
  readonly share: number | null;
}

/**
 * BR-09 — E14-02's portfolio "share of schedules changed inside the lead time"
 * over its trailing window, and the PO lines a change sent now would ADD to it.
 */
export function planChangeGuard(
  data: EngineDataset,
  asOf: IsoInstant,
  windowWeeks: number,
  lines: readonly OpenOrderLine[],
  band: ToleranceBand = DEFAULT_TOLERANCE_BAND,
): { readonly baseline: PlanChangeBaseline; readonly adds: Set<string>; readonly inside: Set<string> } {
  const w = trailingWindow(asOf, windowWeeks);
  const p = portfolioReliability(supplierReliability(data, w, { band })).planChange;
  const lt = new Map(data.sources.map((s) => [termsKey(s.supplierId, s.materialCode), s.leadTimeDays]));
  const assessed = new Map(assessAll(data, asOf, band).map((x) => [lineKey(x.a.poNumber, x.a.line), x]));
  const adds = new Set<string>();
  const inside = new Set<string>();
  for (const l of lines) {
    if (l.kind !== 'poLine' || l.poLine === null) continue;
    const x = assessed.get(lineKey(l.poNumber, l.poLine));
    const leadTime = lt.get(termsKey(l.supplierId, l.materialCode));
    if (!x || leadTime === undefined || !isInsideLeadTime(asOf, requirementAt(x.h).date, leadTime)) continue;
    inside.add(l.id);
    const created = dayOf(x.h.line.createdAt);
    const inWindow = created >= w.from && created <= w.to && created <= dayOf(w.asOf);
    if (inWindow && !x.a.changedInsideLeadTime) adds.add(l.id);
  }
  return {
    baseline: { windowFrom: w.from, windowTo: w.to, schedules: p.schedules, changedInsideLeadTime: p.changedInsideLeadTime, share: p.share },
    adds,
    inside,
  };
}

/** BR-09 — the share after sending the selected proposals (each line counts once). */
export function planChangeAfter(baseline: PlanChangeBaseline, proposals: readonly Proposal[], selected: ReadonlySet<string>): PlanChangeBaseline {
  const added = new Set(proposals.filter((p) => selected.has(p.id) && p.addsToPlanChange).map((p) => p.id)).size;
  const changed = baseline.changedInsideLeadTime + added;
  return { ...baseline, changedInsideLeadTime: changed, share: baseline.schedules > 0 ? changed / baseline.schedules : null };
}
