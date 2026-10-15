// ────────────────────────────────────────────────────────────────────────────
// Locale formatting — single source of truth for currency / date / number
// display. Rupiah and plain numbers both follow the UI language's grouping and
// compact suffixes ("Rp" prefix in both languages); dates render in the
// Asia/Jakarta timezone so output is deterministic regardless of runner locale.
//
// Consolidation target: the ~127 inline formatting sites across pages-v2
// migrate onto these three functions opportunistically as Phase 1' touches
// each page. All three return an em dash for null/undefined/NaN/invalid input.
// ────────────────────────────────────────────────────────────────────────────

import i18n from './i18n';
/** @import { BidCurrency } from './currencyPolicy' */

const JAKARTA = 'Asia/Jakarta';
const EMPTY = '—';

const idID = new Intl.NumberFormat('id-ID');
const enUS = new Intl.NumberFormat('en-US');

// Active UI language, read from the i18n singleton (the SSoT). EN output stays
// byte-identical to the pre-i18n behaviour; only ID mode diverges.
/** @returns {boolean} */
function isID() {
  return i18n.language?.toLowerCase().startsWith('id') ?? false;
}

/**
 * A plain number in the UI language's grouping: "1,234,567" in English,
 * "1.234.567" in Indonesian. null/undefined/NaN → "—".
 *
 * BL-83 — it used to group the Indonesian way in both languages, so the
 * English UI showed "1.234", which an English reader takes for one point two.
 * This is also the grouping `formatIDR` uses for a full rupiah amount, so a
 * quantity and the amount beside it always share one separator.
 * @param {number | null} [value]
 * @returns {string}
 */
export function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return EMPTY;
  return (isID() ? idID : enUS).format(value);
}

// Compact tiers, largest first. Each suffix is the UI language's own word for
// the magnitude: English "m / bn / tn"; Indonesian "jt / M / T" (juta, miliar,
// triliun). "M" means billion only in Indonesian, which is why the English UI
// must never show it.
const COMPACT_TIERS = [
  { div: 1e12, en: 'tn', id: 'T' },
  { div: 1e9, en: 'bn', id: 'M' },
  { div: 1e6, en: 'm', id: 'jt' }
];

// One decimal, shown only when it is not zero ("1.1", "4"), with the
// language's decimal separator ("1.1" EN, "1,1" ID).
const enCompact = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const idCompact = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

/**
 * Rupiah, in the UI language's conventions. "Rp" and one space lead in both.
 *   Full:    "Rp 1,250,000,000" (EN) / "Rp 1.250.000.000" (ID)
 *   Compact ({ compact: true }), at or above one million:
 *            "Rp 1.1 bn" (EN) / "Rp 1,1 M" (ID); "Rp 62.1 m" / "Rp 62,1 jt";
 *            "Rp 2 tn" / "Rp 2 T"
 * A compact amount below one million renders in full. null/undefined/NaN → "—".
 * @param {number | null} [value]
 * @param {{ compact?: boolean }} [opts]
 * @returns {string}
 */
export function formatIDR(value, opts) {
  if (value == null || Number.isNaN(value)) return EMPTY;
  if (opts?.compact) {
    const id = isID();
    const abs = Math.abs(value);
    for (let i = 0; i < COMPACT_TIERS.length; i++) {
      const tier = COMPACT_TIERS[i];
      if (abs < tier.div) continue;
      // 999.96 million rounds to "1,000 m"; say "1 bn" instead.
      const rounded = Math.round((value / tier.div) * 10) / 10;
      const up = i > 0 && Math.abs(rounded) >= 1000 ? COMPACT_TIERS[i - 1] : tier;
      const n = up === tier ? rounded : Math.round((value / up.div) * 10) / 10;
      return `Rp ${(id ? idCompact : enCompact).format(n)} ${id ? up.id : up.en}`;
    }
  }
  return `Rp ${formatNumber(value)}`;
}

// — Currency-aware money (CP-0 · 2e-c-2) ─────────────────────────────────────
//
// Was a local const in `BuyerSourcing.jsx`, where a comment recorded that
// consolidating it "belongs to the currency ruling (FIND-01 / 2e-c), not here".
// This is that ruling, so it lands here beside `formatIDR` — the rest of the
// app's money already comes from this file.
//
// It replaces a USD-vs-domestic BINARY (`currency === 'USD' ? … : …`, twice)
// under which every non-USD currency inherited rupiah conventions, so a €2.85
// bid rendered "€3" — a ~5% misstatement of a supplier's price (2e-c-1-FIND-01).
// Each currency now states its own locale and its own precision.
//
// EUR = en-IE by operator ruling: "€2.85" — symbol leading, dot decimal, two
// fraction digits. The users are Indonesian procurement staff; the symbol's job
// is to say "this is not rupiah", not to reproduce a German invoice. It also
// keeps EUR rows structurally parallel to USD rows ("$2.85") in a comparison
// table whose entire purpose is comparison.
//
// IDR DELEGATES to `formatIDR`, so there is exactly ONE rupiah rendering in the
// app. The retired binary built its own via `Intl` currency style, which emits a
// NO-BREAK SPACE after "Rp" where `formatIDR` emits an ordinary space — two
// renderings of the same currency, differing by an invisible character.
/** @type {Record<Exclude<BidCurrency, 'IDR'>, string>} */
const MONEY_LOCALE = {
  USD: 'en-US',
  EUR: 'en-IE'
};

/**
 * An amount in the currency it is actually denominated in. The currency is
 * REQUIRED — a defaulted currency is an assertion about money that the caller,
 * not this function, is in a position to make. null/undefined/NaN → "—".
 * @param {number | null | undefined} value
 * @param {BidCurrency} currency
 * @returns {string}
 */
export function formatMoney(value, currency) {
  if (value == null || Number.isNaN(value)) return EMPTY;
  if (currency === 'IDR') return formatIDR(value);
  return new Intl.NumberFormat(MONEY_LOCALE[currency], {
    style: 'currency',
    currency,
    // Both min and max: a price is quoted to the cent, and "€2.8" would be a
    // different-looking number from "$2.80" in a table read across rows.
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * "02 Jul 2026" (Asia/Jakarta), dd MMM yyyy. Month abbreviations localize:
 * EN (en-GB) "Aug/Oct/Dec" vs ID (id-ID) "Agu/Okt/Des". Accepts ISO string /
 * epoch / Date. Invalid/empty → "—".
 * @param {string | number | Date | null} [value]
 * @returns {string}
 */
export function formatDate(value) {
  if (value == null || value === '') return EMPTY;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return new Intl.DateTimeFormat(isID() ? 'id-ID' : 'en-GB', {
    timeZone: JAKARTA,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(d);
}

/**
 * "18 Sep 2026, 08:00 WIB" — a date and time in Asia/Jakarta. Invalid → "—".
 * @param {string | number | Date | null} [value]
 * @returns {string}
 */
export function formatDateTime(value) {
  if (value == null || value === '') return EMPTY;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: JAKARTA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
  return `${formatDate(d)}, ${time} WIB`;
}
