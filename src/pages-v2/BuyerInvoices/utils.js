// Pure helpers of the buyer invoices page. Moved out of `BuyerInvoices.jsx` by
// the Phase 5 page split (no behaviour change).
import { formatIDR } from '@lib/format';

// Compact tiles use the shared jt/B/T scale; full amounts and dates delegate
// to the locale utility directly (see call sites).
/**
 * An IDR amount on the compact jt/B/T scale, for KPI tiles, the queue's amount
 * column and the confirm-release button.
 * @param {number} n
 * @returns {string}
 */
export const fmtCompact = (n) => formatIDR(n, { compact: true });
