// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER FEEDSTOCK CONFIRMATION — BL-194, DRC-8 (feedstock part only),
// SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10; owner decision 2026-10-19
// (DRC-D17): the supplier confirms its CURRENT FEEDSTOCK with a confirmation
// date. Confirming Incoming DA waits for BL-204 (DRC-D10), so nothing here
// reads or shows a DA figure to a supplier.
//
// Pure: no store, no clock, no UI. The policy hook and the supplier form call
// the SAME `feedstockEntryRefusal`, so the page cannot accept what the verb
// refuses (and the reverse).
//
//   · BR-a  one record per confirmation, append-only; the latest is in force.
//   · BR-b  cadence: weekly, with the Thursday stock update cycle [Default E2].
//           The due list reuses `weeklyUpdateStatus` (MR-1) over the latest
//           confirmation per material, so it counts the SAME weeks the stock
//           update counts. It is NOT part of the MR-2 update-compliance score.
//   · BR-c  feedstock never adds to supplier SOH, "supplier available" or
//           "free to call off" (MoM 2B; MR-7 BR-01): nothing here returns a
//           stock figure, and the confirmation lives in its own store.
//   · BR-e  target feedstock = LT spare × weekly demand [Default E1], LT spare
//           default 0, so the target reads 0 (Provisional).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { WorkingCalendar } from '@lib/workingCalendar' */
/** @import { UpdateCycleSettings, WeeklyUpdateStatus } from './updateCycle' */
import { weeklyUpdateStatus } from './updateCycle';

/**
 * The [Default] values this feature runs on (design rule 2), one key each,
 * with its question ID. `osipRules.js` holds no E1 / E2 key and is read-only
 * for this build, so the block lives here.
 * @typedef {{
 *   readonly ltSpareWeeks: number;
 *   readonly cadence: 'weeklyStockCycle';
 *   readonly noteMaxLength: number;
 * }} FeedstockRules
 */

/** @type {FeedstockRules} */
export const FEEDSTOCK_RULES = Object.freeze({
  /** [Default E1] LT spare, in weeks of demand, per material; default 0 (target feedstock = 0). */
  ltSpareWeeks: 0,
  /** [Default E2] the supplier confirms weekly, with the Thursday stock update cycle (MR-1). */
  cadence: /** @type {'weeklyStockCycle'} */ ('weeklyStockCycle'),
  /** DRC-8 BR-a — the optional note's length limit (not a [Default]: a form bound). */
  noteMaxLength: 500
});

/** The question IDs every figure built on these defaults names in its Provisional label. */
export const FEEDSTOCK_PROVISIONAL_QUESTIONS = Object.freeze(['E1', 'E2']);

/**
 * Why a confirmation is refused, or null when it is accepted.
 * @typedef {'NOT_ASSIGNED' | 'QTY_INVALID' | 'DATE_REQUIRED' | 'DATE_INVALID' | 'DATE_IN_FUTURE' | 'NOTE_INVALID' | 'NOTE_TOO_LONG'} FeedstockRefusal
 */

/** Every refusal code, in the order the rule checks them. */
export const FEEDSTOCK_REFUSALS = /** @type {readonly FeedstockRefusal[]} */ (
  Object.freeze([
    'NOT_ASSIGNED',
    'QTY_INVALID',
    'DATE_REQUIRED',
    'DATE_INVALID',
    'DATE_IN_FUTURE',
    'NOTE_INVALID',
    'NOTE_TOO_LONG'
  ])
);

/**
 * @param {unknown} v
 * @returns {v is string}
 */
const isIsoDay = (v) =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00.000Z`)) &&
  new Date(`${v}T00:00:00.000Z`).toISOString().slice(0, 10) === v;

/**
 * `assigned`:  Is the material assigned to the supplier (the target resolves it)?
 * `feedstockQty`:  In the material's unit; 0 allowed (BR-a).
 * `confirmedOn`:  `YYYY-MM-DD`, required, not after `today` (BR-a).
 * `today`:  The hub's day, `YYYY-MM-DD` (the caller reads the clock).
 *
 * @typedef {{
 *   readonly assigned: boolean;
 *   readonly feedstockQty: unknown;
 *   readonly confirmedOn: unknown;
 *   readonly note?: unknown;
 *   readonly today: string;
 * }} FeedstockEntry
 */

/**
 * DRC-8 BR-a — the one rule the verb's policy hook and the supplier form call.
 * @param {FeedstockEntry} e
 * @param {FeedstockRules} [rules]
 * @returns {FeedstockRefusal | null}
 */
export function feedstockEntryRefusal(e, rules = FEEDSTOCK_RULES) {
  if (!e.assigned) return 'NOT_ASSIGNED';
  if (
    typeof e.feedstockQty !== 'number' ||
    !Number.isFinite(e.feedstockQty) ||
    e.feedstockQty < 0
  ) {
    return 'QTY_INVALID';
  }
  if (e.confirmedOn === undefined || e.confirmedOn === null || e.confirmedOn === '') {
    return 'DATE_REQUIRED';
  }
  if (!isIsoDay(e.confirmedOn)) return 'DATE_INVALID';
  if (e.confirmedOn > e.today) return 'DATE_IN_FUTURE';
  if (e.note !== undefined && e.note !== null && typeof e.note !== 'string') return 'NOTE_INVALID';
  if (typeof e.note === 'string' && e.note.trim().length > rules.noteMaxLength) {
    return 'NOTE_TOO_LONG';
  }
  return null;
}

/**
 * The refusal code inside a dispatcher reason (`POLICY_REJECTED:<hook>:<CODE>`),
 * or null when the reason is not one of ours.
 * @param {string | undefined} reason
 * @returns {FeedstockRefusal | null}
 */
export function feedstockRefusalOf(reason) {
  if (!reason) return null;
  const code = reason.slice(reason.lastIndexOf(':') + 1);
  return FEEDSTOCK_REFUSALS.includes(/** @type {FeedstockRefusal} */ (code))
    ? /** @type {FeedstockRefusal} */ (code)
    : null;
}

/**
 * A confirmation as the rules read it: who, what, and when it was RECORDED.
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly recordedAt: string;
 * }} FeedstockRecordRef
 */

/**
 * BR-a — the record in force for a supplier × material: the latest RECORDED,
 * whatever its confirmation date (a correction is a new record). Records are
 * stored in append order, so ties on `recordedAt` resolve to the later one.
 * @template {FeedstockRecordRef} T
 * @param {readonly T[]} records
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {T | undefined}
 */
export function latestFeedstock(records, supplierId, materialCode) {
  /** @type {T | undefined} */
  let best;
  for (const r of records) {
    if (r.supplierId !== supplierId || r.materialCode !== materialCode) continue;
    if (best === undefined || r.recordedAt >= best.recordedAt) best = r;
  }
  return best;
}

/**
 * BR-b [Default E2] — which assigned materials still need this week's
 * confirmation. The cycle is the stock update cycle (MR-1 BR-03): the same
 * cutoff, the same holiday shift, the same "missed" carry-over; a material
 * counts as confirmed this week when its latest confirmation was RECORDED
 * inside the open cycle (not by its confirmation date, which the supplier
 * types). Derived at read; nothing is stored, and nothing feeds MR-2.
 * @param {string} supplierId
 * @param {readonly { readonly supplierId: string; readonly materialCode: string; readonly feedstockRecordedAt: string | null }[]} rows
 * @param {string} nowIso
 * @param {WorkingCalendar} calendar
 * @param {UpdateCycleSettings} settings
 * @returns {WeeklyUpdateStatus}
 */
export function feedstockCycleStatus(supplierId, rows, nowIso, calendar, settings) {
  return weeklyUpdateStatus(
    supplierId,
    rows.map((r) => ({
      supplierId: r.supplierId,
      materialCode: r.materialCode,
      lastUpdatedAt: r.feedstockRecordedAt
    })),
    nowIso,
    calendar,
    settings
  );
}

/**
 * BR-e [Default E1] — target feedstock = LT spare × weekly demand. With LT
 * spare 0 the target is 0 whatever the demand; with LT spare above 0 it needs
 * the weekly demand, and is null (not shown) when that is unknown.
 * @param {{ readonly weeklyDemand: number | null }} input
 * @param {FeedstockRules} [rules]
 * @returns {number | null}
 */
export function feedstockTarget({ weeklyDemand }, rules = FEEDSTOCK_RULES) {
  if (rules.ltSpareWeeks === 0) return 0;
  if (weeklyDemand === null || !Number.isFinite(weeklyDemand)) return null;
  return rules.ltSpareWeeks * weeklyDemand;
}
