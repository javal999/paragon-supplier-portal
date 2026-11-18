// Module-scope constants of the buyer call-offs page. Moved out of
// `BuyerCallOffs.jsx` by the Phase 5 page split (no behaviour change).

/** P-12 — the page's tabs, in order; the first opens by default. */
// i18n-defer: tab identifiers, not copy — each renders through t(`co.tab.${id}`)
// AIB-3 (BL-351) — the missing-ASN chase is an action list, so it sits beside
// To act, before the record-keeping tabs.
export const CALL_OFF_TABS = /** @type {const} */ (['toAct', 'chase', 'all', 'runOut']);
/** @typedef {(typeof CALL_OFF_TABS)[number]} CallOffTab */

/** The `?status=` values that name something on the To act tab. */
export const TO_ACT_STATUSES = ['awaitingApproval', 'escalated', 'atRisk', 'drift'];
