// ────────────────────────────────────────────────────────────────────────────
// policies/rollups.js — the GR header and invoice match ROLLUP hooks.
//
// Both make a header verb legal only when its own sub-flow has rolled up to
// the matching terminal (census G2). Separate because both read the entity's
// own lines through `target.readEntity`, the same shape for two documents.
// ────────────────────────────────────────────────────────────────────────────

/** @import { Invoice } from '../../data/types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */
/** @import { PolicyHookFn } from '../dispatcher' */
import { POLICY_HOOKS } from '../policyHooks';
/** @import { GrHeaderDisposition } from '../grRollup' */
import { deriveHeaderDisposition } from '../grRollup';
import { isMatched } from '../invoiceRollup';
import { bindPolicyHook } from './bindings';

// — GR header disposition = ROLLUP of the per-line sub-flow (census G2). Each
//   disposition verb is legal ONLY when the lines roll up to its terminal, so
//   the header is provably derived, never asserted. Reads the GR's own lines
//   (same-entity), so it binds here rather than in the cross-entity mock layer. —
/**
 * @param {GrHeaderDisposition} want
 * @returns {PolicyHookFn}
 */
const grRollup =
  (want) =>
  ({ entityId, target }) => {
    const gr = /** @type {GoodsReceipt | null} */ (target.readEntity(entityId));
    if (!gr) return { ok: false, reason: 'entity missing' };
    const got = deriveHeaderDisposition(gr.inspectionResults);
    return got === want
      ? { ok: true }
      : { ok: false, reason: `line rollup is '${got}', not '${want}'` };
  };

bindPolicyHook(POLICY_HOOKS.GR_ROLLUP_APPROVED, grRollup('Approved'));
bindPolicyHook(POLICY_HOOKS.GR_ROLLUP_PARTIAL, grRollup('Partially Approved'));
bindPolicyHook(POLICY_HOOKS.GR_ROLLUP_REJECTED, grRollup('Rejected'));

// — Invoice match = ROLLUP of the match sub-flow (census G2). The header advance
//   `Submitted → Matched` is legal ONLY when the invoice's match axis has rolled
//   up to a clean Matched — so the header is derived, never asserted. Reads the
//   invoice's own matchStatus (same-entity), so it binds here. ————————————————
/** @type {PolicyHookFn} */
const invoiceRollupMatched = ({ entityId, target }) => {
  const inv = /** @type {Invoice | null} */ (target.readEntity(entityId));
  if (!inv) return { ok: false, reason: 'entity missing' };
  return isMatched(inv)
    ? { ok: true }
    : { ok: false, reason: `match axis is '${inv.matchStatus}', not 'Matched'` };
};

bindPolicyHook(POLICY_HOOKS.INVOICE_ROLLUP_MATCHED, invoiceRollupMatched);
