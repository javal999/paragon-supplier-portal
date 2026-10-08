// ────────────────────────────────────────────────────────────────────────────
// BuyerContracts — pure helpers (no React): the label lookups, the page's
// IDR / date formatters, and the tab predicate.
//
// Moved out of `BuyerContracts.jsx` by the Phase 5 page split (no behaviour
// change).
// ────────────────────────────────────────────────────────────────────────────

/** @import { TFunction } from 'i18next' */
/** @import { ContractType } from '@data/mockContracts' */
/** @import { ContractDisplayStatus } from '@services/data/contractExpiry' */
/** @import { GroupTab } from './const' */
import { CATEGORY_LABEL_KEY, OWNER_LABEL_KEY, TYPE_LABEL_KEY } from './const';

/**
 * The localized label of a contract type; an unknown value renders as itself.
 * @param {TFunction} t
 * @param {ContractType | string} v
 * @returns {string}
 */
export const typeLabel = (t, v) =>
  TYPE_LABEL_KEY[/** @type {ContractType} */ (v)]
    ? t(TYPE_LABEL_KEY[/** @type {ContractType} */ (v)])
    : String(v);

/**
 * The localized label of an obligation owner; an unknown value renders as itself.
 * @param {TFunction} t
 * @param {string} v
 * @returns {string}
 */
export const ownerLabel = (t, v) => (OWNER_LABEL_KEY[v] ? t(OWNER_LABEL_KEY[v]) : v);

/**
 * The localized label of a contract category; an unknown value renders as itself.
 * @param {TFunction} t
 * @param {string} v
 * @returns {string}
 */
export const catLabel = (t, v) => (CATEGORY_LABEL_KEY[v] ? t(CATEGORY_LABEL_KEY[v]) : v);

/**
 * A whole-rupiah IDR amount, `id-ID` grouping.
 * @param {number} value
 * @returns {string}
 */
export const formatIDR = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);

/**
 * `dd Mon yyyy` (en-GB); an empty date renders as an em dash.
 * @param {string} iso
 * @returns {string}
 */
export const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * `Month yyyy` (en-GB) — the renewal pipeline's group key and heading.
 * @param {string} iso
 * @returns {string}
 */
export const formatMonth = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

// ⚠️ `expiryTone(days)` IS DELETED, not moved. Its three cuts were `< 0` (a
// restatement of the zero boundary `isPast` now owns), `< 30` (a page-local
// width) and `< 90` (a copy of the band this batch removes). The tone is now
// `CONTRACT_EXPIRY_TONE[displayStatus]` — one map, keyed on the same classifier
// the pill and the tab read, so the figure's colour and the pill beside it
// cannot disagree.

// ⚠️ **EVERY ARM NOW READS THE SAME COMPUTED STATUS, AND THAT IS THE POINT.**
// This used to take `daysToExpiry` and run its own `0..90` band on the
// `expiring` arm while every other arm read the stored literal — so one tab
// answered a clock question and six answered a data question, and the tab BADGE
// (`counts`, below) answered a third. Taking the display status instead means
// the tab, the badge, the tile, the pill and the expiry tone are one predicate
// evaluated once per row.
/**
 * Whether a row with this display status belongs under the tab `g`.
 * @param {ContractDisplayStatus} display
 * @param {GroupTab} g
 * @returns {boolean}
 */
export const matchesGroup = (display, g) => {
  if (g === 'all') return true;
  if (g === 'active') return display === 'Active';
  if (g === 'expiring') return display === 'Expiring';
  if (g === 'expired') return display === 'Expired';
  if (g === 'renewed') return display === 'Renewed';
  if (g === 'draft') return display === 'Draft';
  if (g === 'terminated') return display === 'Terminated';
  return true;
};
