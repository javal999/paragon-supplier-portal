// ─────────────────────────────────────────────────────────────────────────────
// CFOT ON THE ENGINE DATA — calibration (BL-102) and the surfaced figure
// (REQ-E14-02, since BL-82).
//
// TWO READS OF ONE CALCULATION:
//   · `cfotByDefinition` — the CALIBRATION instrument. The synthetic dataset is
//     tuned to reproduce the owner's 36% against it, and its early edge is an
//     ARGUMENT that defaults to "no earliest date", exactly as it was
//     calibrated. The synthetic dataset's own tests pin it that way.
//   · `agreedCfot` — the figure the planner reliability page and the supplier
//     "Your reliability" panel SHOW. It is `cfotByDefinition` with the early
//     edge set to the ONE shared early window (`data/kpiWindow.ts`), so the
//     engine CFOT, the Hub CFOT and OTIF all apply the same early rule.
//
// THE DEFINITION IMPLEMENTED (REQ-E10-01 CFOT, E14-02 BR-06, METHOD-SPEC G3):
//   casefill on time, per PO line = quantity received on time for the
//   committed date, capped at the ordered quantity, ÷ the ordered quantity.
//   Aggregated per PO (Σ lines on time ÷ Σ lines ordered), and over a window
//   as the MEAN of the per-PO rates — each PO counts once. A quantity sum
//   across POs would add PCS to KG and let the largest packaging orders decide
//   the figure; the Hub calculation (`data/performanceRules.ts`) does sum
//   across POs on its own data.
//   · ordered   = what PTI asks for after its changes (the line's current qty)
//   · committed = the latest confirmation's date (SCOR: a re-confirmation is
//                 the new basis); a line never confirmed has no commitment, so
//                 its requested date stands in.
//   · `requested` mode measures against the requested date instead (BR-06:
//     report both, and show the gap).
//   · a cancelled line (quantity changed to 0) is not measured.
//   · a line is in the window when its measured date falls in [from, to].
//
// THE FIVE BL-66 RULES, AS THEY APPLY TO THIS DATA:
//   (1) a supplier counter-offer binds only once the planner accepts it — NOT
//       APPLIED: the engine contract has no planner acceptance of a
//       confirmation (`Confirmation` carries no review), so the latest
//       confirmation stands as the commitment. Needs a field in `./types`.
//   (2) a planner's date change applies only once the supplier re-confirms —
//       HOLDS BY CONSTRUCTION: `committed` is the latest CONFIRMATION's date,
//       so a PTI change after it does not move the date until a new
//       confirmation arrives.
//   (3) partial receipts add up — HOLDS: `receivedBy` sums every receipt.
//   (4) one early rule — `agreedCfot` counts a receipt only inside the shared
//       early window (PROPOSED until BL-56).
//   (5) dispatched but not received — NOT APPLICABLE: the engine carries no
//       dispatch notices, and a line with nothing received by its date
//       already counts 0 on time once the date is in the window.
// ─────────────────────────────────────────────────────────────────────────────

import { EARLY_DELIVERY_WINDOW_DAYS } from '../data/kpiWindow';
import { addDays } from './dates';
import { isCancelled, latestConfirmation, requirementAt, type LineHistory } from './lines';
import type { IsoDate } from './types';

export type CfotBasis = 'committed' | 'requested';

export interface CfotWindow {
  readonly from: IsoDate;
  readonly to: IsoDate;
}

export interface PoCfotByDefinition {
  readonly poNumber: string;
  readonly supplierId: string;
  readonly orderedQty: number;
  readonly onTimeQty: number;
}

export interface CfotResult {
  /** Mean of the per-PO rates, 0–1, or null when nothing was measured. */
  readonly rate: number | null;
  /** Σ on time ÷ Σ ordered across every PO (mixes units; shown for comparison). */
  readonly quantityRate: number | null;
  readonly orderedQty: number;
  readonly onTimeQty: number;
  readonly lines: number;
  readonly perPo: readonly PoCfotByDefinition[];
}

/** The date a line is measured against. */
export function cfotDate(h: LineHistory, basis: CfotBasis): IsoDate {
  const req = requirementAt(h);
  if (basis === 'requested') return req.date;
  return latestConfirmation(h)?.confirmedDate ?? req.date;
}

/** Quantity received on or before `date` and — when a window is given — no more than `earlyDays` before it. */
export function receivedOnTime(h: LineHistory, date: IsoDate, earlyDays: number | null): number {
  const earliest = earlyDays === null ? null : addDays(date, -earlyDays);
  let sum = 0;
  for (const r of h.receipts) {
    if (r.receivedDate > date) continue;
    if (earliest !== null && r.receivedDate < earliest) continue;
    sum += r.receivedQty;
  }
  return sum;
}

/**
 * CFOT over the lines whose measured date falls in the window. `earlyDays` is
 * the early edge: `null` (the calibration default) counts a receipt however
 * early; a number counts only receipts that many days before the date or later.
 */
export function cfotByDefinition(
  histories: readonly LineHistory[],
  window: CfotWindow,
  basis: CfotBasis = 'committed',
  earlyDays: number | null = null,
): CfotResult {
  const perPo = new Map<string, { supplierId: string; ordered: number; onTime: number }>();
  let lines = 0;
  for (const h of histories) {
    if (isCancelled(h)) continue;
    const date = cfotDate(h, basis);
    if (date < window.from || date > window.to) continue;
    const ordered = requirementAt(h).qty;
    const onTime = Math.min(ordered, receivedOnTime(h, date, earlyDays));
    lines += 1;
    const row = perPo.get(h.line.poNumber) ?? { supplierId: h.line.supplierId, ordered: 0, onTime: 0 };
    row.ordered += ordered;
    row.onTime += onTime;
    perPo.set(h.line.poNumber, row);
  }
  const rows = [...perPo.entries()].map(([poNumber, r]) => ({
    poNumber,
    supplierId: r.supplierId,
    orderedQty: r.ordered,
    onTimeQty: r.onTime,
  }));
  const orderedQty = rows.reduce((s, r) => s + r.orderedQty, 0);
  const onTimeQty = rows.reduce((s, r) => s + r.onTimeQty, 0);
  const measured = rows.filter((r) => r.orderedQty > 0);
  return {
    rate: measured.length > 0 ? measured.reduce((s, r) => s + r.onTimeQty / r.orderedQty, 0) / measured.length : null,
    quantityRate: orderedQty > 0 ? onTimeQty / orderedQty : null,
    orderedQty,
    onTimeQty,
    lines,
    perPo: rows,
  };
}

/** The surfaced CFOT: against the commitment, with the ONE shared early window (BL-66 (4)). */
export function agreedCfot(histories: readonly LineHistory[], window: CfotWindow): CfotResult {
  return cfotByDefinition(histories, window, 'committed', EARLY_DELIVERY_WINDOW_DAYS);
}

/** One supplier's CFOT, read off a result: the mean of its per-PO rates, and how many POs. */
export interface SupplierCfot {
  /** 0–1, null when the supplier has no measured PO in the window. */
  readonly rate: number | null;
  readonly pos: number;
}

export function supplierCfot(result: CfotResult, supplierId: string): SupplierCfot {
  const mine = result.perPo.filter((r) => r.supplierId === supplierId && r.orderedQty > 0);
  return {
    rate: mine.length > 0 ? mine.reduce((s, r) => s + r.onTimeQty / r.orderedQty, 0) / mine.length : null,
    pos: mine.length,
  };
}

/** The portfolio CFOT from per-supplier rows: every PO counts once, whoever supplied it. */
export function portfolioCfot(rows: readonly SupplierCfot[]): SupplierCfot {
  const pos = rows.reduce((s, r) => s + r.pos, 0);
  const sum = rows.reduce((s, r) => s + (r.rate ?? 0) * r.pos, 0);
  return { rate: pos > 0 ? sum / pos : null, pos };
}
