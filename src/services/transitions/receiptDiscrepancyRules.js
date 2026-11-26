// ────────────────────────────────────────────────────────────────────────────
// UCX-P7 (BL-368) · UCX-F17 — THE DISPUTE OUTCOME IS A CHOICE.
//
// A resolved dispute used to record only PTI's comment: the OUTCOME lived in
// prose, so nothing could filter, count or follow it. UCX-P7 makes the outcome
// one of three values, required by the resolve verb and picked on the panel.
// The set is [Proposed]: no source names PTI's dispute outcomes yet.
// ────────────────────────────────────────────────────────────────────────────

/**
 * What PTI decided about a disputed receipt difference.
 * `supplierRight`  — the supplier is right; the receipt is corrected.
 * `receiptStands`  — the receipt as posted stands; the difference is closed.
 * `recount`        — both agree to recount before either side stands.
 * @typedef {'supplierRight' | 'receiptStands' | 'recount'} ReceiptDisputeOutcome
 */

/** @type {readonly ReceiptDisputeOutcome[]} */
export const RECEIPT_DISPUTE_OUTCOMES = Object.freeze(
  /** @type {ReceiptDisputeOutcome[]} */ (['supplierRight', 'receiptStands', 'recount'])
);

/**
 * @param {unknown} value
 * @returns {value is ReceiptDisputeOutcome}
 */
export function isReceiptDisputeOutcome(value) {
  return (
    typeof value === 'string' &&
    RECEIPT_DISPUTE_OUTCOMES.includes(/** @type {ReceiptDisputeOutcome} */ (value))
  );
}
