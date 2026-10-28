// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER FEEDSTOCK CONFIRMATION — BL-194, DRC-8 (feedstock part only),
// SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10; owner decision 2026-10-19
// (DRC-D17): the supplier confirms its CURRENT FEEDSTOCK with a confirmation
// date. Confirming Incoming DA waits for BL-204 (DRC-D10): BL-204 built it
// behind `SUPPLIER_DA_VIEW_ENABLED` (supplierDaView.js), which ships false, so
// the optional Incoming DA "yes" is refused until the flag is on.
//
// Pure: no store, no clock, no UI. The policy hook and the supplier form call
// the SAME `feedstockEntryRefusal`, so the page cannot accept what the verb
// refuses (and the reverse).
//
//   · BR-a  one record per confirmation, append-only; the latest is in force.
//   · BR-b  cadence [Team, 2026-10-28, E2; owner ruling 2026-10-28]: a
//           supplier on a pull agreement (`osipParams`, per supplier; default
//           no) confirms DAILY — each hub calendar day, midnight to midnight
//           WIB; any other supplier every week, with the Thursday stock update
//           cycle, which is the weekly DA send (Supply Sustainability owns the
//           DA). The weekly due list reuses `weeklyUpdateStatus` (MR-1) over
//           the latest confirmation per material, so it counts the SAME weeks
//           the stock update counts. Neither is part of the MR-2
//           update-compliance score. What happens when a supplier does not
//           confirm is OPEN (team answers section 4, Q7): the panel says it is
//           missed, and nothing else follows.
//   · BR-c  feedstock never adds to supplier SOH, "supplier available" or
//           "free to call off" (MoM 2B; MR-7 BR-01): nothing here returns a
//           stock figure, and the confirmation lives in its own store.
//   · BR-e  target feedstock = LT spare × weekly demand [Team, 2026-10-28, E1:
//           the next model defines no feedstock ROP], LT spare 0, so the
//           target reads 0. What "LT spare" meant in the current model is open
//           (team answers section 4, Q8).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { WorkingCalendar } from '@lib/workingCalendar' */
/** @import { UpdateCycleSettings, WeeklyUpdateStatus } from './updateCycle' */
import { cycleStatus, weeklyUpdateStatus } from './updateCycle';

/**
 * The [Default] values this feature runs on (design rule 2), one key each,
 * with its question ID. `osipRules.js` holds no E1 / E2 key and is read-only
 * for this build, so the block lives here.
 * @typedef {{
 *   readonly ltSpareWeeks: number;
 *   readonly cadence: 'byPullAgreement' | 'weeklyStockCycle';
 *   readonly noteMaxLength: number;
 * }} FeedstockRules
 */

/** @type {FeedstockRules} */
export const FEEDSTOCK_RULES = Object.freeze({
  /** [Default E1] LT spare, in weeks of demand, per material; default 0 (target feedstock = 0). */
  ltSpareWeeks: 0,
  /**
   * [Team, 2026-10-28, E2] 'byPullAgreement': daily for a supplier on a pull
   * agreement, weekly with the Thursday stock update (the DA send) for any
   * other; 'weeklyStockCycle': weekly for every supplier (the earlier default).
   */
  cadence: /** @type {'byPullAgreement' | 'weeklyStockCycle'} */ ('byPullAgreement'),
  /** DRC-8 BR-a — the optional note's length limit (not a [Default]: a form bound). */
  noteMaxLength: 500
});

/**
 * The question IDs every figure built on these defaults names in its
 * Provisional label. Empty since 2026-10-28: the team confirmed E1 (feedstock
 * target 0) and answered E2 (the cadence), which the owner accepted.
 */
export const FEEDSTOCK_PROVISIONAL_QUESTIONS = Object.freeze(/** @type {string[]} */ ([]));

/**
 * Why a confirmation is refused, or null when it is accepted.
 * @typedef {'NOT_ASSIGNED' | 'QTY_INVALID' | 'DATE_REQUIRED' | 'DATE_INVALID' | 'DATE_IN_FUTURE' | 'NOTE_INVALID' | 'NOTE_TOO_LONG' | 'INCOMING_DA_INVALID' | 'INCOMING_DA_NOT_AVAILABLE'} FeedstockRefusal
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
    'NOTE_TOO_LONG',
    'INCOMING_DA_INVALID',
    'INCOMING_DA_NOT_AVAILABLE'
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
 * `incomingDaConfirmed`:  BL-204 — the supplier also confirms its Incoming DA; optional, a boolean.
 * `incomingDaAvailable`:  BL-204 — the supplier view is on (`SUPPLIER_DA_VIEW_ENABLED`) and a
 *   publication holds the pair (the caller resolves it).
 *
 * @typedef {{
 *   readonly assigned: boolean;
 *   readonly feedstockQty: unknown;
 *   readonly confirmedOn: unknown;
 *   readonly note?: unknown;
 *   readonly today: string;
 *   readonly incomingDaConfirmed?: unknown;
 *   readonly incomingDaAvailable?: boolean;
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
  // BL-204 (DRC-8, the Incoming DA part DRC-D17 deferred): optional, a yes/no.
  // A "yes" needs the supplier view switched on (DRC-D10) AND a published DA
  // for the pair to confirm; otherwise it is refused, never silently dropped.
  const inc = e.incomingDaConfirmed;
  if (inc !== undefined && inc !== null && typeof inc !== 'boolean') return 'INCOMING_DA_INVALID';
  if (inc === true && e.incomingDaAvailable !== true) return 'INCOMING_DA_NOT_AVAILABLE';
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
 * BR-b [Team E2] — which assigned materials still need this cycle's
 * confirmation: today's for a supplier on a pull agreement, else this week's.
 * The weekly cycle is the stock update cycle (MR-1 BR-03): the same
 * cutoff, the same holiday shift, the same "missed" carry-over; a material
 * counts as confirmed this week when its latest confirmation was RECORDED
 * inside the open cycle (not by its confirmation date, which the supplier
 * types). Derived at read; nothing is stored, and nothing feeds MR-2.
 * @param {string} supplierId
 * @param {readonly { readonly supplierId: string; readonly materialCode: string; readonly feedstockRecordedAt: string | null }[]} rows
 * @param {string} nowIso
 * @param {WorkingCalendar} calendar
 * @param {UpdateCycleSettings} settings
 * @param {boolean} [pullAgreement]  [Team E2] the supplier is on a pull agreement.
 * @param {FeedstockRules} [rules]
 * @returns {WeeklyUpdateStatus}
 */
export function feedstockCycleStatus(
  supplierId,
  rows,
  nowIso,
  calendar,
  settings,
  pullAgreement = false,
  rules = FEEDSTOCK_RULES
) {
  if (rules.cadence === 'byPullAgreement' && pullAgreement)
    return dailyFeedstockStatus(supplierId, rows, nowIso, calendar);
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
 * [Team E2] the hub calendar day an instant falls in, as an update cycle:
 * from midnight WIB (exclusive of the instant before it) to the next midnight.
 * @param {string} iso
 * @param {WorkingCalendar} calendar
 * @returns {import('./updateCycle').UpdateCycle}
 */
export function feedstockDayFor(iso, calendar) {
  const HOUR = 3_600_000;
  const ms = Date.parse(iso);
  const wall = new Date(ms + calendar.utcOffsetHours * HOUR).toISOString().slice(0, 10);
  const midnight = Date.parse(`${wall}T00:00:00.000Z`) - calendar.utcOffsetHours * HOUR;
  return {
    start: new Date(midnight - 1).toISOString(),
    cutoff: new Date(midnight + 24 * HOUR - 1).toISOString()
  };
}

/**
 * [Team E2] BR-b for a supplier on a pull agreement: the same status as the
 * weekly one, over the hub's calendar day — confirmed today, still missing
 * today, and missed yesterday and still not confirmed since.
 * @param {string} supplierId
 * @param {readonly { readonly supplierId: string; readonly materialCode: string; readonly feedstockRecordedAt: string | null }[]} rows
 * @param {string} nowIso
 * @param {WorkingCalendar} calendar
 * @returns {WeeklyUpdateStatus}
 */
function dailyFeedstockStatus(supplierId, rows, nowIso, calendar) {
  const own = rows.filter((r) => r.supplierId === supplierId);
  const records = own.flatMap((r) =>
    r.feedstockRecordedAt === null
      ? []
      : [{ supplierId, materialCode: r.materialCode, declaredAt: r.feedstockRecordedAt }]
  );
  const assignments = own.map((r) => ({ supplierId, materialCode: r.materialCode }));
  const cycle = feedstockDayFor(nowIso, calendar);
  const closed = feedstockDayFor(cycle.start, calendar);
  const open = cycleStatus(supplierId, cycle, records, assignments);
  const before = cycleStatus(supplierId, closed, records, assignments);
  const missing = open.filter((s) => s.status === 'missing').map((s) => s.materialCode);
  return {
    cycle,
    total: open.length,
    updated: open.filter((s) => s.status === 'updated').map((s) => s.materialCode),
    missing,
    missed: before
      .filter((s) => s.status === 'missing' && missing.includes(s.materialCode))
      .map((s) => s.materialCode)
  };
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
