// ─────────────────────────────────────────────────────────────────────────────
// CFOT BY ITS DEFINITION — used to CALIBRATE the synthetic dataset (BL-102).
//
// ⚠️ NOT SURFACED. REQ-E14-02 says BL-66 (the as-built CFOT in
// `data/performanceRules.ts` differs from its definition in five places) must
// land before E14-02 reports CFOT. This module exists so the dataset can be
// shown to reproduce the owner's 36% against the DEFINITION, and so the gap to
// the as-built calculation can be measured rather than guessed. No page reads
// it, and `performanceRules.ts` is untouched.
//
// THE DEFINITION IMPLEMENTED (REQ-E10-01 CFOT, E14-02 BR-06, METHOD-SPEC G3):
//   casefill on time, per PO line = quantity received on or before the
//   committed date, capped at the ordered quantity, ÷ the ordered quantity.
//   Aggregated per PO (Σ lines on time ÷ Σ lines ordered), and over a window
//   as the MEAN of the per-PO rates — each PO counts once. A quantity sum
//   across POs would add PCS to KG and let the largest packaging orders decide
//   the figure; the as-built calculation does sum across POs (reported).
//   · ordered   = what PTI asks for after its changes (the line's current qty)
//   · committed = the latest confirmation's date (SCOR: a re-confirmation is
//                 the new basis); a line never confirmed has no commitment, so
//                 its requested date stands in.
//   · `requested` mode measures against the requested date instead (BR-06:
//     report both, and show the gap).
//   · a cancelled line (quantity changed to 0) is not measured.
//   · a line is in the window when its measured date falls in [from, to].
// ─────────────────────────────────────────────────────────────────────────────

import { isCancelled, latestConfirmation, receivedBy, requirementAt, type LineHistory } from './lines';
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

export function cfotByDefinition(
  histories: readonly LineHistory[],
  window: CfotWindow,
  basis: CfotBasis = 'committed',
): CfotResult {
  const perPo = new Map<string, { supplierId: string; ordered: number; onTime: number }>();
  let lines = 0;
  for (const h of histories) {
    if (isCancelled(h)) continue;
    const date = cfotDate(h, basis);
    if (date < window.from || date > window.to) continue;
    const ordered = requirementAt(h).qty;
    const onTime = Math.min(ordered, receivedBy(h, date));
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
