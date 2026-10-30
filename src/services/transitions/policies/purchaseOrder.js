// ────────────────────────────────────────────────────────────────────────────
// policies/purchaseOrder.js — the PO confirm and PO response policy hooks.
//
// Holds the confirm bound, the counter-offer rule, the reject cause, the
// counter-review comment and the shipping-notice date, plus the shared
// expressions the SupplierOrders surface mirrors (`confirmedQtyWithinBounds`,
// `counterOfferRefusal`, `isIsoDate`). Separate because it is one domain.
// ────────────────────────────────────────────────────────────────────────────

/** @import { PurchaseOrder, PoLineResponse } from '../../data/types' */
/** @import { PolicyHookFn } from '../dispatcher' */
import { POLICY_HOOKS } from '../policyHooks';
import { activeReasonCodes, isActiveReasonCode, reasonCodeStore } from '../reasonCodes';
import { bindPolicyHook } from './bindings';

// — PO confirm: each confirmed line qty must be > 0 and ≤ the ordered qty, and
//   the confirmation must cover every line (count matches). ————————————————————

/**
 * The ONE expression of the per-line confirm bound — shared between the policy
 * hook below (the LAW) and the SupplierOrders surface (a courtesy mirror that
 * disables Confirm and explains the bound in the operator's language). One
 * expression, two consumers, so the mirror structurally cannot drift from the
 * policy (CP-0 · 2f-c, operator constraint). The policy remains authoritative:
 * a dispatch that bypasses the UI is still refused here, in this voice.
 *
 * `Number.isFinite` (2f-c, SE-Team spec edit): the previous
 * `typeof q !== 'number'` admitted NaN — `typeof NaN === 'number'`, and NaN
 * fails BOTH comparisons (`NaN <= 0` and `NaN > ordered` are false), so a
 * hand-crafted dispatch could stamp `confirmedQty: NaN` into the store and
 * poison `expectedValue` (Σ confirmedQty × unitPrice), the 3-way-match input.
 * The 4a-FIND-01 `num()` class, closed here because this policy is the lock
 * the 2f-c parse gate is built in front of.
 * @param {number} q
 * @param {number} ordered
 * @returns {boolean}
 */
export const confirmedQtyWithinBounds = (q, ordered) => Number.isFinite(q) && q > 0 && q <= ordered;

/** @type {PolicyHookFn} */
const poConfirmQtyWithinOrdered = ({ entityId, payload, target }) => {
  const po = /** @type {PurchaseOrder | null} */ (target.readEntity(entityId));
  if (!po) return { ok: false, reason: 'entity missing' };
  const qtys = payload.confirmedQuantities;
  if (!Array.isArray(qtys) || qtys.length !== po.lineItems.length) {
    return { ok: false, reason: 'confirmedQuantities must cover every line' };
  }
  for (let i = 0; i < qtys.length; i++) {
    const q = qtys[i];
    const ordered = po.lineItems[i].quantity;
    if (typeof q !== 'number' || !confirmedQtyWithinBounds(q, ordered)) {
      return {
        ok: false,
        reason: `line ${i + 1}: confirmed qty out of bounds (0 < q ≤ ${ordered})`
      };
    }
  }
  return { ok: true };
};

bindPolicyHook(POLICY_HOOKS.PO_CONFIRM_QTY_WITHIN_ORDERED, poConfirmQtyWithinOrdered);

// — PO response: adjust / reject / counter-offer review / shipping notice
//   (REQ-E07-02, REQ-E07-05). Each rule is ONE exported expression, read by the
//   policy (the law) and by the supplier surface (a courtesy mirror), on the
//   `confirmedQtyWithinBounds` precedent. ——————————————————————————————————————

// The adjust reasons (§3.6 starter list) and the rejection causes (REQ-E07-02
// BR-06) are the Hub administrator's lists since BL-32 (`reasonCodes.js`): read
// IN FORCE at every check, so a code added is accepted at once and a retired
// code is refused on a new answer while old answers keep it.

/**
 * @param {unknown} v
 * @returns {v is string}
 */
const isNonBlank = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * A real calendar date written `YYYY-MM-DD` (2026-02-30 is refused).
 * @param {unknown} v
 * @returns {v is string}
 */
export const isIsoDate = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/** Why a counter-offer line would be refused, or null when it is acceptable. */
/** @typedef {'unknownLine' | 'reason' | 'note' | 'quantity' | 'date'} CounterOfferRefusal */

/**
 * @param {Partial<PoLineResponse> | null | undefined} line
 * @param {Pick<PurchaseOrder, 'lineItems'>} po
 * @returns {CounterOfferRefusal | null}
 */
export function counterOfferRefusal(line, po) {
  const item = po.lineItems.find((li) => li.id === line?.lineId);
  if (!line || !item) return 'unknownLine';
  if (!isActiveReasonCode('poAdjust', line.reasonCode)) return 'reason';
  if (line.reasonCode === 'other' && !isNonBlank(line.note)) return 'note';
  // CR-10 is the same bound the confirm verb enforces: 0 < q ≤ ordered.
  if (
    typeof line.counterQty !== 'number' ||
    !confirmedQtyWithinBounds(line.counterQty, item.quantity)
  ) {
    return 'quantity';
  }
  if (!isIsoDate(line.counterDate)) return 'date';
  return null;
}

/** @type {PolicyHookFn} */
const poAdjustCounterOfferValid = ({ entityId, payload, target }) => {
  const po = /** @type {PurchaseOrder | null} */ (target.readEntity(entityId));
  if (!po) return { ok: false, reason: 'entity missing' };
  const lines = payload.lineResponses;
  if (!Array.isArray(lines) || lines.length === 0) {
    return { ok: false, reason: 'an adjustment needs at least one counter-offer line' };
  }
  const seen = /** @type {Set<string>} */ (new Set());
  for (let i = 0; i < lines.length; i++) {
    const line = /** @type {Partial<PoLineResponse> | null} */ (lines[i]);
    const refusal = counterOfferRefusal(line, po);
    if (refusal) return { ok: false, reason: `counter-offer ${i + 1}: ${refusal}` };
    if (seen.has(String(line?.lineId)))
      return { ok: false, reason: `counter-offer ${i + 1}: line given twice` };
    seen.add(String(line?.lineId));
  }
  return { ok: true };
};

bindPolicyHook(POLICY_HOOKS.PO_ADJUST_COUNTER_OFFER_VALID, poAdjustCounterOfferValid);

/** @type {PolicyHookFn} */
const poRejectCauseGiven = ({ payload }) => {
  const causes = payload.rejectionCauses;
  if (!Array.isArray(causes) || causes.length === 0) {
    return {
      ok: false,
      reason: `a rejection needs at least one cause: ${activeReasonCodes('poReject').join(', ')}`
    };
  }
  const unknown = causes.find((c) => !isActiveReasonCode('poReject', c));
  if (unknown !== undefined) {
    const retired =
      typeof unknown === 'string' && reasonCodeStore.get('poReject', unknown) !== undefined;
    return {
      ok: false,
      reason: retired
        ? `rejection cause '${unknown}' is retired`
        : `unknown rejection cause '${String(unknown)}'`
    };
  }
  return { ok: true };
};

bindPolicyHook(POLICY_HOOKS.PO_REJECT_CAUSE_GIVEN, poRejectCauseGiven);

/** @type {PolicyHookFn} */
const poCounterReviewCommentAuthored = ({ payload }) =>
  isNonBlank(payload.reviewComment)
    ? { ok: true }
    : { ok: false, reason: 'rejecting a counter-offer needs a comment for the supplier' };

bindPolicyHook(POLICY_HOOKS.PO_COUNTER_REVIEW_COMMENT_AUTHORED, poCounterReviewCommentAuthored);

/** @type {PolicyHookFn} */
const poShippingNoticeDateValid = ({ payload }) =>
  isIsoDate(payload.expectedCompletionDate)
    ? { ok: true }
    : { ok: false, reason: 'expected completion date must be a date (YYYY-MM-DD)' };

bindPolicyHook(POLICY_HOOKS.PO_SHIPPING_NOTICE_DATE_VALID, poShippingNoticeDateValid);
