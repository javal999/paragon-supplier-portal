// ────────────────────────────────────────────────────────────────────────────
// Mutable receipt-discrepancy response store (REQ-E07-06).
//
// One response per goods receipt, keyed by the receipt's id: the supplier's
// acknowledgement or dispute, and PTI's resolution. Same immutable-update
// contract as the other stores. Reads join it onto the receipt they answer.
//
// ── ⚠️ IT NO LONGER STARTS EMPTY, AND THE SENTENCE IT REPLACES IS QUOTED ────
//   This header read, verbatim:
//
//       "Starts EMPTY — a response is something a supplier gives, never a
//        fixture."
//
//   The second half is still true of the FIXTURE FILE and is why the seed lives
//   HERE rather than in `mockGoodsReceipts.ts`: a discrepancy response is not a
//   property of a receipt, it is an act, and `GoodsReceipt.discrepancyResponse`
//   is joined on read precisely so nothing can author one as a receipt field.
//
//   The first half was a claim about the DEMO, and as a demo it was false in
//   the direction that costs a reader: `isOpenDispute` had no reachable member,
//   so PTI's "supplier disputed a receipt" task and the resolve affordance
//   behind it could not be reached without somebody first dispatching a dispute
//   by hand. **A flow nobody can start is a flow nobody can review.** One seed
//   row, below, is the whole of the change; `reset()` restores it, exactly as
//   `purchaseOrderStore.reset()` restores its own fixture seed.
// ────────────────────────────────────────────────────────────────────────────

import type { ReceiptDiscrepancyResponse } from '../../../../data/mockGoodsReceipts';

/**
 * ⚠️ ONE ROW, AND IT IS A DEMO STARTING POINT RATHER THAN A POPULATION.
 *
 * `gr-016` (sup-007, `PO-2026-00125`) rejected 800 caps; the supplier disputed
 * the rejection and is waiting on PTI. That is the ONLY state in this lane that
 * cannot be produced from a clean tree by clicking — acknowledging and
 * disputing are both supplier acts the supplier surface offers, but RESOLVING
 * needs a dispute that already exists.
 *
 * `respondedAt` is a literal rather than a shifted date because this file is
 * not a fixture family: it is one instant, chosen to sit between `gr-016`'s
 * shifted receipt date and the declared present.
 */
const SEED: readonly ReceiptDiscrepancyResponse[] = [
  {
    receiptId: 'gr-016',
    supplierId: 'sup-007',
    status: 'Disputed',
    comment:
      'The 800 rejected caps were the two lots held back at our own QC gate and were not shipped — please re-check the lot references against the packing list.',
    respondedAt: '2026-08-27T04:20:00.000Z',
  },
];

let rows: ReceiptDiscrepancyResponse[] = [...SEED];

export const receiptDiscrepancyStore = {
  all(): readonly ReceiptDiscrepancyResponse[] {
    return rows;
  },
  get(receiptId: string): ReceiptDiscrepancyResponse | undefined {
    return rows.find((r) => r.receiptId === receiptId);
  },
  add(row: ReceiptDiscrepancyResponse): void {
    rows = [row, ...rows];
  },
  update(receiptId: string, next: (r: ReceiptDiscrepancyResponse) => ReceiptDiscrepancyResponse): void {
    rows = rows.map((r) => (r.receiptId === receiptId ? next(r) : r));
  },
  reset(): void {
    rows = [...SEED];
  },
};
