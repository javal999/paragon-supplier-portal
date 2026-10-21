// ────────────────────────────────────────────────────────────────────────────
// BuyerGoodsReceipt — module-scope constants and the shared typedefs.
//
// Moved out of `BuyerGoodsReceipt.jsx` by the Phase 5 page split (no behaviour
// change). None of these is `.map()`ped: each is a lookup the components index
// by a row's value.
// ────────────────────────────────────────────────────────────────────────────

/** @import { GRStatus } from '@services/data/types' */
import { DECLARED_PRESENT } from '@services/data/fixturePresent';

// ⚠️ **THE THIRD PIN, RETIRED — AND THE CANON LISTED ONLY TWO.**
// `REFERENCE_TODAY` (2026-05-18) and `RFQ_TODAY_MS` (2026-04-25) went at #317.
// This one, `BuyerShipments`' and `BuyerInventory`'s survived, all three reading
// 2026-05-20 — which is EVIDENCE, not a coincidence: it is the same authoring
// generation, and it is where `goodsReceipt`'s anchor comes from.
//
// Retiring it onto the declared present is BEHAVIOUR-PRESERVING by construction:
// this page's families shift by `DECLARED_PRESENT - anchor` and so does the pin,
// so every rendered day-count is unchanged. The pin was a per-page "now"; there
// is now one, and it is declared.
export const TODAY = DECLARED_PRESENT;

/**
 * `action` (IA P-08) — every receipt Home's "Goods receipts to review" counts.
 * @typedef {| 'all'
 *   | 'action'
 *   | 'pending'
 *   | 'under-inspection'
 *   | 'approved'
 *   | 'hold'
 *   | 'rejected'
 *   | 'posted'} GroupTab
 */

/** @typedef {'today' | 'week' | 'month' | '30d' | 'all'} DateFilter */

/** @type {Record<string, string>} */
export const COUNTRY_FLAG = {
  ID: 'ID',
  MY: 'MY',
  DE: 'DE',
  FR: 'FR',
  CN: 'CN',
  SG: 'SG',
  IN: 'IN'
};

/** @type {Record< GRStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral' >} */
export const STATUS_VARIANT = {
  'Pending Inspection': 'neutral',
  'Under Inspection': 'warning',
  'Quality Hold': 'danger',
  Approved: 'success',
  'Partially Approved': 'warning',
  Rejected: 'danger',
  'Posting to SAP': 'info',
  'Posted to SAP': 'success'
};

/** @type {Record<string, 'success' | 'warning' | 'danger' | 'neutral'>} */
export const CHECK_VARIANT = {
  Pass: 'success',
  Fail: 'danger',
  Pending: 'warning',
  'N/A': 'neutral'
};

export const DAY_MS = 24 * 60 * 60 * 1000;
