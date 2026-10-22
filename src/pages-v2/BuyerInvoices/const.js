// Module-scope constants of the buyer invoices page. Moved out of
// `BuyerInvoices.jsx` by the Phase 5 page split (no behaviour change).
/** @import { LucideIcon } from 'lucide-react' */
/** @import { BuyerInvoice, BuyerInvoiceStatus as InvStatus, InvoiceMatchStatus as MatchStatus } from '@services/data/types' */
import { MessageCircle, Mail, Globe, Send } from 'lucide-react';
import { CHART_SERIES, CHART_SEMANTIC } from '@lib/chartPalette';

/** @typedef {'queue' | 'analytics' | 'aging'} TabKey */
/** @typedef {InvStatus | 'all'} StatusFilter */
/** @typedef {'detail' | 'confirming' | 'remittance' | 'disputing'} PanelMode */

/** @type {Record<InvStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'>} */
export const STATUS_VARIANT = {
  'Pending Match': 'neutral',
  Approved: 'success',
  Disputed: 'danger',
  'Payment Released': 'success',
  Overdue: 'danger'
};

/** @type {Record<MatchStatus, 'success' | 'warning' | 'danger' | 'neutral'>} */
export const MATCH_VARIANT = {
  Matched: 'success',
  'Pending GR': 'neutral',
  Pending: 'neutral',
  'Qty Mismatch': 'danger',
  'Price Variance': 'danger'
};

/** @type {Record<BuyerInvoice['channel'], LucideIcon>} */
export const CHANNEL_ICON = {
  WhatsApp: MessageCircle,
  Email: Mail,
  Web: Globe,
  API: Send
};

export const MONTHLY_SPEND = [
  { month: 'Nov 24', paid: 1800, pending: 400 },
  { month: 'Dec 24', paid: 2100, pending: 350 },
  { month: 'Jan 25', paid: 1950, pending: 500 },
  { month: 'Feb 25', paid: 2400, pending: 280 },
  { month: 'Mar 25', paid: 3100, pending: 380 },
  { month: 'Apr 25', paid: 890, pending: 3195 }
];

// i18n keys for the status filter chips + the footer commit verb per status.
// The status/match CHIPS themselves localize centrally via StatusPill; these
// are the separate scaffolding literals (filter labels, footer buttons).
/** @type {Record<StatusFilter, string>} */
export const STATUS_FILTER_KEY = {
  all: 'buyerInvoices.filter.all',
  'Pending Match': 'buyerInvoices.filter.pendingMatch',
  Approved: 'buyerInvoices.filter.approved',
  'Payment Released': 'buyerInvoices.filter.released',
  Disputed: 'buyerInvoices.filter.disputed',
  Overdue: 'buyerInvoices.filter.overdue'
};

// ⚠️ **THIS MAP NO LONGER CHOOSES A MACHINE VERB, AND THAT IS THE FIX.** It is
// keyed on the DISPLAY LABEL, which is lossy by construction: `toBuyerLabel`
// collapses a past-due `Approved` into `Overdue`, so asking this map "what may I
// do?" answered `Escalate` — a toast — on every invoice the machine declared
// releasable. Both Approved invoices in the tree are past due, so it was 2 of 2,
// decaying in from each due date with no commit involved.
// What remains here are the INFORMATIONAL footers — affordances that are not
// transitions at all (a deferral notice, a remittance advice, an escalation).
// The verbs come from `invoiceActionsFor(lifecycleState)`, derived from the
// machine. See `invoices/invoiceActionModel.js`.
/** @type {Record<InvStatus, string>} */
export const FOOTER_ACTION_KEY = {
  'Pending Match': 'buyerInvoices.footer.reviewMatch',
  Approved: 'buyerInvoices.footer.releasePayment',
  Disputed: 'buyerInvoices.footer.resolveDispute',
  'Payment Released': 'buyerInvoices.footer.sendRemittance',
  Overdue: 'buyerInvoices.footer.escalate'
};

/** @type {Record<MatchStatus, string>} */
export const MATCH_DESC_KEY = {
  Matched: 'buyerInvoices.match.matched',
  'Pending GR': 'buyerInvoices.match.pendingGr',
  Pending: 'buyerInvoices.match.pending',
  'Qty Mismatch': 'buyerInvoices.match.qtyMismatch',
  'Price Variance': 'buyerInvoices.match.priceVariance'
};

// DP2-PALETTE-01: chart/UI colour sourced from the central palette (SSoT),
// not page-local hex. Values unchanged — pure de-dup.
export const TOKEN_SUCCESS = CHART_SEMANTIC.success;
export const TOKEN_TEAL = CHART_SERIES[0];
export const TOKEN_MUTED = CHART_SEMANTIC.neutral;
