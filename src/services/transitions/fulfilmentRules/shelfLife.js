// ────────────────────────────────────────────────────────────────────────────
// Fulfilment rules · shelf life (MR-6 BR-05 to BR-09) — calendar-month
// arithmetic, the per-line shelf-life view, and where an ASN's shelf-life
// exception stands. Separate from the ASN line rule, which calls
// `shelfLifeMet`; this file needs only types from `asn.js`, so there is no
// runtime import cycle.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ASN, AsnLineItem, AsnShelfLifeEvent, AsnShelfLifeLine } from '../../data/types' */
/** @import { AsnLineCheck, AsnLineRefusal } from './asn' */
import { shelfLifeRuleFor } from '../fulfilmentConfig';
import { isCalendarDate } from './shared';

// ── Shelf life (MR-6 BR-05 to BR-09) ────────────────────────────────────────

/**
 * A `YYYY-MM-DD` date moved by whole calendar months. A day the target month
 * does not have is its last day (2026-08-31 + 6 → 2027-02-28).
 * @param {string} date
 * @param {number} months
 * @returns {string}
 */
export function addCalendarMonths(date, months) {
  const [y, m, d] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ty = Math.floor(total / 12);
  const tm = total - ty * 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return `${String(ty).padStart(4, '0')}-${String(tm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

/**
 * MR-6 BR-05 — expiry ≥ ETA + the minimum, in calendar months (edge case 3: equal passes).
 * @param {string} expiryDate
 * @param {string} eta
 * @param {number} minMonths
 * @returns {boolean}
 */
export function shelfLifeMet(expiryDate, eta, minMonths) {
  return expiryDate >= addCalendarMonths(eta, minMonths);
}

/**
 * @param {string} date
 * @returns {number}
 */
const dayNumber = (date) => Date.parse(`${date}T00:00:00.000Z`) / 86_400_000;

/**
 * Remaining shelf life at ETA in calendar months, with the part month as a
 * fraction of that month's days ("7.4 months left at ETA"). Negative when the
 * batch expires before it arrives.
 * @param {string} eta
 * @param {string} expiryDate
 * @returns {number}
 */
export function monthsLeftAt(eta, expiryDate) {
  let whole = 0;
  if (expiryDate >= eta) {
    while (addCalendarMonths(eta, whole + 1) <= expiryDate) whole++;
  } else {
    while (addCalendarMonths(eta, whole) > expiryDate) whole--;
  }
  const from = addCalendarMonths(eta, whole);
  const to = addCalendarMonths(eta, whole + 1);
  return whole + (dayNumber(expiryDate) - dayNumber(from)) / (dayNumber(to) - dayNumber(from));
}

/** What the form shows under a line's expiry (MR-6 d step 4). */
/**
 * @typedef {object} ShelfLifeLineView
 * @property {number} minMonths
 * @property {number | null} monthsLeft -  Null until both expiry and ETA are real dates.
 * @property {boolean} ok -  False when the line fails BR-05.
 */

/**
 * The shelf-life view of a line, or null when the material is not shelf-life relevant.
 * @param {Pick<AsnLineCheck, 'materialCode' | 'expiryDate' | 'eta'>} line
 * @returns {ShelfLifeLineView | null}
 */
export function shelfLifeLineView(line) {
  const rule = shelfLifeRuleFor(line.materialCode);
  if (!rule?.relevant) return null;
  if (!isCalendarDate(line.expiryDate) || !isCalendarDate(line.eta)) {
    return { minMonths: rule.minMonths, monthsLeft: null, ok: true };
  }
  return {
    minMonths: rule.minMonths,
    monthsLeft: monthsLeftAt(line.eta, line.expiryDate),
    ok: shelfLifeMet(line.expiryDate, line.eta, rule.minMonths)
  };
}

/**
 * MR-6 BR-08 — a supplier may ask for an exception only when shelf life is the
 * ONE thing wrong: at least one line refused for it, and every other line clean.
 * @param {readonly (AsnLineRefusal | null)[]} refusals
 * @returns {boolean}
 */
export const onlyShelfLifeRefused = (refusals) =>
  refusals.some((r) => r === 'shelfLife') && refusals.every((r) => r === null || r === 'shelfLife');

/** The request an exception decision is about: the latest request or reopening. */
/** @typedef {Extract<AsnShelfLifeEvent, { kind: 'requested' | 'etaChanged' }>} ShelfLifeRequest */
/** @typedef {Extract<AsnShelfLifeEvent, { kind: 'approved' | 'rejected' }>} ShelfLifeDecision */

/** MR-6 BR-09 — where an ASN's exception stands, derived from its record. */
/**
 * @typedef {object} ShelfLifeExceptionView
 * @property {'pending' | 'approved' | 'rejected'} state
 * @property {ShelfLifeRequest} request -  The latest request (or the ETA change that reopened it).
 * @property {string} reason -  The latest request's reason — the supplier's own words.
 * @property {ShelfLifeDecision | null} decision -  The decision on `request`, when there is one.
 * @property {readonly AsnShelfLifeEvent[]} history
 */

/**
 * @param {Pick<ASN, 'shelfLifeException'>} asn
 * @returns {ShelfLifeExceptionView | null}
 */
export function shelfLifeExceptionOf(asn) {
  const history = asn.shelfLifeException ?? [];
  /** @type {ShelfLifeRequest | null} */
  let request = null;
  let reason = '';
  /** @type {ShelfLifeDecision | null} */
  let decision = null;
  for (const e of history) {
    if (e.kind === 'requested' || e.kind === 'etaChanged') {
      request = e;
      decision = null;
      if (e.kind === 'requested') reason = e.reason;
    } else {
      decision = e;
    }
  }
  if (!request) return null;
  const state =
    decision === null ? 'pending' : decision.kind === 'approved' ? 'approved' : 'rejected';
  return { state, request, reason, decision, history };
}

/**
 * @param {readonly AsnShelfLifeLine[]} lines
 * @param {Pick<AsnLineCheck, 'materialCode' | 'lotNumber' | 'expiryDate'>} line
 */
const coveredBy = (lines, line) =>
  lines.some(
    (l) =>
      l.materialCode === line.materialCode &&
      l.lotNumber === (line.lotNumber ?? '').trim() &&
      l.expiryDate === line.expiryDate
  );

/**
 * MR-6 BR-08 — a pending or approved exception waives the shelf-life refusal
 * for the lines the request named (same material, batch and expiry), at an ETA
 * no later than the one asked about (edge case 1).
 * @param {Pick<ASN, 'shelfLifeException'>} asn
 * @param {Pick<AsnLineCheck, 'materialCode' | 'lotNumber' | 'expiryDate' | 'eta'>} line
 * @returns {boolean}
 */
export function shelfLifeWaivedFor(asn, line) {
  const view = shelfLifeExceptionOf(asn);
  if (!view || view.state === 'rejected') return false;
  return (
    isCalendarDate(line.eta) && line.eta <= view.request.eta && coveredBy(view.request.lines, line)
  );
}

/**
 * MR-6 BR-08 / BR-09 — the lines approved to be received into blocked stock.
 * Empty unless the exception stands and the ASN is on its way (a draft, a
 * cancelled ASN and one awaiting a decision carry no approval to receipt).
 * @param {Pick<ASN, 'status' | 'shelfLifeException'>} asn
 * @returns {AsnShelfLifeLine[]}
 */
export function approvedShelfLifeLines(asn) {
  if (asn.status === 'Draft' || asn.status === 'Cancelled' || asn.status === 'Awaiting exception')
    return [];
  const view = shelfLifeExceptionOf(asn);
  return view?.state === 'approved' ? [...view.request.lines] : [];
}

/**
 * Edge case 1 — an ETA change on an ASN whose exception was approved needs a
 * new decision when the new ETA is later than the approved one and a line still
 * fails the rule there.
 * @param {Pick<ASN, 'shelfLifeException' | 'lineItems'>} asn
 * @param {string} newEta
 * @returns {boolean}
 */
export function etaNeedsReapproval(asn, newEta) {
  const view = shelfLifeExceptionOf(asn);
  if (!view || view.state !== 'approved' || !isCalendarDate(newEta) || newEta <= view.request.eta)
    return false;
  return shelfLifeFailingLines(asn.lineItems, newEta).length > 0;
}

/**
 * The lines of an ASN that fail the rule at an ETA, as an exception records them.
 * @param {readonly Pick<AsnLineItem, 'materialCode' | 'lotNumber' | 'expiryDate'>[]} lines
 * @param {string} eta
 * @returns {AsnShelfLifeLine[]}
 */
export function shelfLifeFailingLines(lines, eta) {
  /** @type {AsnShelfLifeLine[]} */
  const out = [];
  for (const l of lines) {
    const rule = shelfLifeRuleFor(l.materialCode);
    if (!rule?.relevant || !isCalendarDate(l.expiryDate) || !isCalendarDate(eta)) continue;
    if (shelfLifeMet(l.expiryDate, eta, rule.minMonths)) continue;
    out.push({
      materialCode: l.materialCode,
      lotNumber: l.lotNumber.trim(),
      expiryDate: l.expiryDate,
      minMonths: rule.minMonths
    });
  }
  return out;
}
