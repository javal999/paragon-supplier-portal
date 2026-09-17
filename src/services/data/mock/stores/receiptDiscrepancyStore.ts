// ────────────────────────────────────────────────────────────────────────────
// Mutable receipt-discrepancy response store (REQ-E07-06).
//
// One response per goods receipt, keyed by the receipt's id: the supplier's
// acknowledgement or dispute, and PTI's resolution. Starts EMPTY — a response
// is something a supplier gives, never a fixture. Same immutable-update
// contract as the other stores. Reads join it onto the receipt they answer.
// ────────────────────────────────────────────────────────────────────────────

import type { ReceiptDiscrepancyResponse } from '../../../../data/mockGoodsReceipts';

let rows: ReceiptDiscrepancyResponse[] = [];

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
    rows = [];
  },
};
