// ─────────────────────────────────────────────────────────────────────────────
// ORDER FULFILMENT TOLERANCES — the ONE config module (REQ-E07-06, REQ-E07-07).
//
// Every number the invoice price match and the goods receipt quantity check
// compare against lives here, so a tolerance is changed in one place (the
// prototype has no admin screen; section 3.6 says ADM can change every
// threshold, and BL-23 replaces the placeholders below with agreed values):
//   · CR-12 — invoice price tolerance (owner decision 2026-09-21): 0% where a
//     contract price exists for the line; otherwise 2% AND within an absolute
//     rupiah cap set by Finance (PQ-05, backlog BL-54).
//   · CR-25 — goods receipt quantity tolerance (owner decision 2026-09-21):
//     any over-delivery is flagged; a shortfall above 2% is flagged and keeps
//     the receipt open. Values are held per material.
// ─────────────────────────────────────────────────────────────────────────────

/** CR-12 — the invoice price tolerance. */
export const INVOICE_PRICE_TOLERANCE = Object.freeze({
  /** A line whose PO price comes from a contract must be billed exactly. */
  contractPricePct: 0,
  /** A line without a contract price may differ by up to this percentage… */
  standardPct: 2,
  /**
   * …and by at most this many rupiah. ⚠️ PLACEHOLDER (BL-54): Finance has not
   * set the cap yet (PQ-05). When it does, change this one line.
   */
  standardCapIdr: 500_000,
});

/** CR-25 — the receipt quantity tolerance for one material, in percent of what was shipped. */
export interface ReceiptQtyTolerance {
  /** Over-delivery allowed without a flag. 0 = any quantity above is flagged. */
  readonly overPct: number;
  /** Shortfall allowed without a flag; above it the receipt stays open. */
  readonly shortPct: number;
}

/** CR-25 — the default for every material. */
export const RECEIPT_QTY_TOLERANCE_DEFAULT: ReceiptQtyTolerance = Object.freeze({
  overPct: 0,
  shortPct: 2,
});

/**
 * CR-25 — "values held per material": a material that needs a different
 * tolerance is listed here by material code. None is agreed yet, so the list
 * is empty and every material uses the default.
 */
export const RECEIPT_QTY_TOLERANCE_BY_MATERIAL: Readonly<Record<string, ReceiptQtyTolerance>> = Object.freeze({});

/** The receipt quantity tolerance for one material. */
export function receiptQtyToleranceFor(materialCode: string): ReceiptQtyTolerance {
  return RECEIPT_QTY_TOLERANCE_BY_MATERIAL[materialCode] ?? RECEIPT_QTY_TOLERANCE_DEFAULT;
}
