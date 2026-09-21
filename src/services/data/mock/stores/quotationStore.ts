// ────────────────────────────────────────────────────────────────────────────
// Mutable Quotation store (v2.2 Step 4 batch iv).
//
// Same contract as purchaseOrderStore: reads (getQuotations) resolve FROM here;
// commands mutate IMMUTABLY (new object + new array). The award cascade fans out
// onto these: the winning quotation → Awarded (`t_quotation_award`), every other
// on the same RFQ → Rejected (`t_quotation_reject`). `forRfq` gives the cascade
// resolver the sibling set (winner + losers). Keyed by id; seeded from the
// fixture; `reset()` restores it (test isolation).
// ────────────────────────────────────────────────────────────────────────────

import { mockQuotations } from '../../../../data/mockQuotations';
import type { Quotation } from '../../../../data/mockQuotations';
// REQ-E03-03 / REQ-E03-05 — the priced bids on the present-relative events,
// including the round-1 revision that supersedes one of them.
import { RFX_QUOTATION_SEED } from '../fixtures/rfxHub';
// BL-64 — the compliance gate demo quotes (CR-23), in the same store.
import { GATE_DEMO_QUOTATION_SEED } from '../fixtures/gateDemo';

const SEED: readonly Quotation[] = [...RFX_QUOTATION_SEED, ...GATE_DEMO_QUOTATION_SEED, ...mockQuotations];

function clone(q: Quotation): Quotation {
  return { ...q };
}

let rows: Quotation[] = SEED.map(clone);
let seq = 0;

export const quotationStore = {
  /** All quotations (the mutable source reads resolve from). */
  all(): readonly Quotation[] {
    return rows;
  },
  /** One quotation by id, or undefined. */
  get(id: string): Quotation | undefined {
    return rows.find((q) => q.id === id);
  },
  /** Every quotation on an RFQ (the cascade's winner + loser set). */
  forRfq(rfqId: string): readonly Quotation[] {
    return rows.filter((q) => q.rfqId === rfqId);
  },
  /** IMMUTABLE update — swap in a new quotation + new array. */
  update(id: string, next: (q: Quotation) => Quotation): void {
    rows = rows.map((q) => (q.id === id ? next(q) : q));
  },
  /** Add a newly-submitted quotation (creation). New array reference. */
  add(quotation: Quotation): void {
    rows = [quotation, ...rows];
  },
  /** Store-assigned quotation number for a submit (distinct 9xx range, as rfqStore). */
  nextNumber(): string {
    seq += 1;
    return `QUO-2026-${900 + seq}`;
  },
  /** Restore the fixture seed (test isolation). */
  reset(): void {
    rows = SEED.map(clone);
    seq = 0;
  },
};
