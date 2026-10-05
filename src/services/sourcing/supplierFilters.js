// ────────────────────────────────────────────────────────────────────────────
// SUPPLIER FILTERS — BL-52, REQ-E03-01 BR-05 (A-02 decided 2026-09-21).
//
// Three filters, in the decided order: certificate validity, then performance
// band, then country. They sit on the buyer supplier list and on every invitee
// search, compose with the filters already there (status and search on the
// list; purchasing group and category on the invitee search), and live in the
// page address so a filtered view can be shared or returned to.
//
// ⚠️ **NOTHING HERE INVENTS A MEASURE.** Each filter reads a calculation the
// hub already makes:
//   · certificate validity — `complianceProjection.computeStatus` (the same
//     Valid / Expiring / Expired projection the compliance tracker shows, with
//     its window `EXPIRING_WINDOW_DAYS`) and `schemeValid` (the BPJPH mandate),
//     over the supplier's halal and BPOM certificates. Where the certificate
//     registry holds a halal or BPOM row for the supplier, those rows decide;
//     otherwise the supplier master's own flag does — the SAME precedence the
//     compliance gate (CR-23) uses. The master's halal expiry is projected
//     through the same `computeStatus`, never compared by hand.
//   · performance band — the grade `performanceRules.gradeFor` reads off the
//     calculated score (the A–D bands stated on the performance pages), or
//     "No history" when nothing was measured. Never a zero, never a D.
//   · country — the supplier master's country.
//
// Pure: no store, no clock of its own. `nowIso` is injected (law 0.5), so the
// validity is derived at read and never stored.
// ────────────────────────────────────────────────────────────────────────────

import { EXPIRING_WINDOW_DAYS, computeStatus, schemeValid } from '../data/complianceProjection';
/** @import { ComplianceRegistryEntry } from '../data/types' */
/** @import { PerformanceGrade } from '../data/performanceRules' */

// ── 1 · Certificate validity ────────────────────────────────────────────────

/** The three answers, in the order a buyer reads them. */
export const CERT_VALIDITIES = /** @type {const} */ (['valid', 'expiring', 'expiredOrMissing']);
/** @typedef {(typeof CERT_VALIDITIES)[number]} CertValidity */

/** The window "expiring" means — the compliance projection's own, restated nowhere. */
export const CERT_EXPIRING_WITHIN_DAYS = EXPIRING_WINDOW_DAYS;

/** What the validity reads about a supplier — a supplier master row, narrowed. */
/**
 * `certExpiryDate`:  The halal certificate's expiry on the master (`YYYY-MM-DD`).
 *
 * @typedef {{
 *   readonly id: string;
 *   readonly halalCertified: boolean;
 *   readonly certExpiryDate: string;
 *   readonly bpomRegistered: boolean;
 * }} CertSupplier
 */

/** @param {ComplianceRegistryEntry} c */
const isHalal = (c) => c.certType.startsWith('HALAL');
/** @param {ComplianceRegistryEntry} c */
const isBpom = (c) => c.certType === 'BPOM';

/** @typedef {'valid' | 'expiring' | 'expiredOrMissing'} OneCert */

/**
 * One registry certificate through the existing projection.
 * @param {ComplianceRegistryEntry} c
 * @param {string} nowIso
 * @returns {OneCert}
 */
function registryCert(c, nowIso) {
  const status = computeStatus(c, nowIso);
  if (status === 'Missing' || status === 'Under Review' || status === 'Expired')
    return 'expiredOrMissing';
  // A halal cert its own dates call valid can still fail the mandate's scheme.
  if (isHalal(c) && !schemeValid(c, nowIso)) return 'expiredOrMissing';
  return status === 'Expiring' ? 'expiring' : 'valid';
}

/**
 * The supplier's certificate validity (halal and BPOM, BR-05):
 *   · `expiredOrMissing` — any certificate expired, missing or not yet
 *     verified, or no halal or BPOM certificate on file at all;
 *   · `expiring` — none of those, and at least one expires within
 *     `CERT_EXPIRING_WITHIN_DAYS`;
 *   · `valid` — every certificate on file is valid beyond that window.
 * @param {CertSupplier} supplier
 * @param {readonly ComplianceRegistryEntry[]} registry
 * @param {string} nowIso
 * @returns {CertValidity}
 */
export function certificateValidity(supplier, registry, nowIso) {
  const mine = registry.filter((c) => c.supplierId === supplier.id);
  const halalRows = mine.filter(isHalal);
  const bpomRows = mine.filter(isBpom);
  /** @type {OneCert[]} */
  const certs = [];

  if (halalRows.length > 0) certs.push(...halalRows.map((c) => registryCert(c, nowIso)));
  else if (supplier.halalCertified) {
    const status = computeStatus(
      { lifecycleState: 'Valid', expiryDate: supplier.certExpiryDate || null },
      nowIso
    );
    certs.push(
      status === 'Expired' ? 'expiredOrMissing' : status === 'Expiring' ? 'expiring' : 'valid'
    );
  }

  if (bpomRows.length > 0) certs.push(...bpomRows.map((c) => registryCert(c, nowIso)));
  // The master records BPOM registration without a date: held, no clock.
  else if (supplier.bpomRegistered) certs.push('valid');

  if (certs.length === 0 || certs.includes('expiredOrMissing')) return 'expiredOrMissing';
  return certs.includes('expiring') ? 'expiring' : 'valid';
}

// ── 2 · Performance band ────────────────────────────────────────────────────

/** The bands: the A–D grades read off the calculated score, and "No history". */
export const PERFORMANCE_BANDS = /** @type {const} */ (['A', 'B', 'C', 'D', 'noHistory']);
/** @typedef {(typeof PERFORMANCE_BANDS)[number]} PerformanceBand */

/**
 * The band of a grade — `null` (nothing measured) is "No history", never D.
 * @param {PerformanceGrade | null | undefined} grade
 * @returns {PerformanceBand}
 */
export const bandOf = (grade) => grade ?? 'noHistory';

/**
 * The band of the grade letter projected onto a supplier master row
 * (`Supplier.scorecardGrade`, set from the same `gradeFor`). Absent is "No
 * history". The master's enum also carries an `F` the projection never writes;
 * should one ever arrive it sits below every band floor, so it reads as D.
 * @param {string | undefined} letter
 * @returns {PerformanceBand}
 */
export function bandOfLetter(letter) {
  if (letter === undefined) return 'noHistory';
  return letter === 'A' || letter === 'B' || letter === 'C' ? letter : 'D';
}

// ── 3 · The filters, composed ───────────────────────────────────────────────

/** The filters a buyer may set. Absent = that filter is off. */
/**
 * `country`:  Supplier master country code.
 *
 * @typedef {{
 *   readonly cert?: CertValidity;
 *   readonly band?: PerformanceBand;
 *   readonly country?: string;
 * }} SupplierFilters
 */

/** What a row must say about itself for the filters to read it. */
/**
 * @typedef {{
 *   readonly certificates: CertValidity;
 *   readonly band: PerformanceBand;
 *   readonly country: string;
 * }} FilterableSupplier
 */

/**
 * True when the row passes every filter that is on (they compose with AND).
 * @param {FilterableSupplier} row
 * @param {SupplierFilters} f
 * @returns {boolean}
 */
export function matchesSupplierFilters(row, f) {
  if (f.cert && row.certificates !== f.cert) return false;
  if (f.band && row.band !== f.band) return false;
  if (f.country && row.country !== f.country) return false;
  return true;
}

/**
 * True when at least one filter is on.
 * @param {SupplierFilters} f
 * @returns {boolean}
 */
export const hasSupplierFilters = (f) => Boolean(f.cert || f.band || f.country);

// ── 4 · The page address ────────────────────────────────────────────────────

/** The URL parameter names. Stable: a shared link must keep meaning the same. */
export const SUPPLIER_FILTER_PARAMS = /** @type {const} */ ({
  cert: 'cert',
  band: 'band',
  country: 'country'
});

/**
 * @template {string} T
 * @param {readonly T[]} all
 * @param {string | null} v
 * @returns {v is T}
 */
const isOneOf = (all, v) => v !== null && /** @type {readonly string[]} */ (all).includes(v);

/**
 * Read the filters from the page address. A value the filter does not know is
 * IGNORED (the filter is off), never guessed — and the page then shows the
 * filter as off, so what is shown and what is applied cannot differ.
 * @param {URLSearchParams} params
 * @returns {SupplierFilters}
 */
export function readSupplierFilters(params) {
  const cert = params.get(SUPPLIER_FILTER_PARAMS.cert);
  const band = params.get(SUPPLIER_FILTER_PARAMS.band);
  const country = params.get(SUPPLIER_FILTER_PARAMS.country);
  return {
    ...(isOneOf(CERT_VALIDITIES, cert) ? { cert } : {}),
    ...(isOneOf(PERFORMANCE_BANDS, band) ? { band } : {}),
    ...(country && /^[A-Z]{2}$/.test(country) ? { country } : {})
  };
}

/**
 * Write the filters into a copy of the page address; every other parameter is kept.
 * @param {URLSearchParams} params
 * @param {SupplierFilters} f
 * @returns {URLSearchParams}
 */
export function writeSupplierFilters(params, f) {
  const next = new URLSearchParams(params);
  for (const key of Object.values(SUPPLIER_FILTER_PARAMS)) next.delete(key);
  if (f.cert) next.set(SUPPLIER_FILTER_PARAMS.cert, f.cert);
  if (f.band) next.set(SUPPLIER_FILTER_PARAMS.band, f.band);
  if (f.country) next.set(SUPPLIER_FILTER_PARAMS.country, f.country);
  return next;
}
