// ─────────────────────────────────────────────────────────────────────────────
// PLANNER CAPACITY FILTERS — REQ-E08-04 BR-07, AC-04 (BL-63).
//
// Supplier, planning group (Material C5, MR-8 BR-07), material and gap weeks only, KEPT IN THE ADDRESS
// like the Order summary drill filter (`orderSummaryDrill.js`), so a filtered
// view can be bookmarked, shared and reloaded. The two compose — the drill
// narrows to the PO's supplier, groups and weeks, these narrow further.
//
// ⚠️ `supplier` is SHARED WITH THE DRILL ON PURPOSE: `drillHref` already writes
// `supplier=<the PO's supplier>` into a capacity link, with exactly this
// meaning, so arriving from the Order summary pre-selects the supplier filter
// and agrees with the drill. The other three names avoid the drill's own
// (`po`, `from`, `groups`, `weeks`, `materials` and its `material` alias), so
// clearing these filters never touches the PO filter.
//
// Values are read with the drill's own id-shape check (`parseIdParam`): a value
// that is not id-shaped is IGNORED rather than guessed at, and reported as such.
// Pure: the page reads and writes `URLSearchParams`, everything else is here.
//
// CAP-5 BR-02 (BL-174) — `reason` adds the supplier's shortfall reasons
// (`capacityShortfall` codes, comma-separated, "No reason" as `_none`). It
// narrows WEEKS together with gaps-only: a week shows when it passes both,
// and a plan shows when one of its weeks does — the same rule gaps-only
// already followed. It is not id-shaped, so it has its own reader
// (`parseReasonParam`).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { CapacityPlan } from '@services/data/types' */
import { isGapWeek } from '@services/transitions/capacityRules';
import { parseIdParam } from '../orders/orderSummaryDrill';
import { parseReasonParam, reasonMatches } from './reasonFilterRules';

export const CAPACITY_FILTER_PARAMS = /** @type {const} */ ({
  supplier: 'supplier',
  planningGroup: 'planningGroup',
  material: 'materialCode',
  gapsOnly: 'gapsOnly',
  reason: 'reason'
});

/**
 * `ignoredMalformed`:  A value in the address was not id-shaped and was ignored.
 *
 * @typedef {{
 *     readonly supplierId: string | null;
 *     readonly planningGroupId: string | null;
 *     readonly materialCode: string | null;
 *     readonly gapsOnly: boolean;
 *     readonly reasons: readonly string[];
 *     readonly ignoredMalformed: boolean;
 *   }} CapacityFilters
 */

/**
 * @param {URLSearchParams} params
 * @returns {CapacityFilters}
 */
export function readCapacityFilters(params) {
  let ignoredMalformed = false;
  /**
   * @param {string} name
   * @returns {string | null}
   */
  const id = (name) => {
    const parsed = parseIdParam(params.get(name));
    if (parsed.kind === 'malformed') ignoredMalformed = true;
    return parsed.kind === 'ok' ? parsed.value : null;
  };
  const supplierId = id(CAPACITY_FILTER_PARAMS.supplier);
  const planningGroupId = id(CAPACITY_FILTER_PARAMS.planningGroup);
  const materialCode = id(CAPACITY_FILTER_PARAMS.material);
  const gapsOnly = params.get(CAPACITY_FILTER_PARAMS.gapsOnly) === '1';
  const reason = parseReasonParam(params.get(CAPACITY_FILTER_PARAMS.reason));
  if (reason.kind === 'malformed') ignoredMalformed = true;
  const reasons = reason.kind === 'ok' ? reason.value : [];
  return { supplierId, planningGroupId, materialCode, gapsOnly, reasons, ignoredMalformed };
}

/**
 * @param {CapacityFilters} f
 * @returns {boolean}
 */
export const anyCapacityFilter = (f) =>
  f.supplierId !== null ||
  f.planningGroupId !== null ||
  f.materialCode !== null ||
  f.gapsOnly ||
  f.reasons.length > 0;

/**
 * Write one filter into a COPY of the address, keeping every other parameter
 * (the PO drill's included). `null` / `false` removes the parameter.
 * @param {URLSearchParams} params
 * A list (the reasons) is written comma-separated; an empty list removes it.
 * @param {keyof typeof CAPACITY_FILTER_PARAMS} key
 * @param {string | boolean | null | readonly string[]} value
 * @returns {URLSearchParams}
 */
export function withCapacityFilter(params, key, value) {
  const next = new URLSearchParams(params);
  const name = CAPACITY_FILTER_PARAMS[key];
  if (value !== null && typeof value === 'object') {
    if (value.length === 0) next.delete(name);
    else next.set(name, value.join(','));
    return next;
  }
  if (value === null || value === false || value === '') next.delete(name);
  else next.set(name, value === true ? '1' : value);
  return next;
}

/**
 * The address with every capacity filter removed; the PO drill is untouched.
 * @param {URLSearchParams} params
 * @returns {URLSearchParams}
 */
export function withoutCapacityFilters(params) {
  const next = new URLSearchParams(params);
  for (const name of Object.values(CAPACITY_FILTER_PARAMS)) next.delete(name);
  return next;
}

/**
 * The weeks a plan shows: every week, or only its gap weeks under gaps-only,
 * and only weeks whose reason was chosen under the reason filter (CAP-5).
 * @param {CapacityPlan['weeks'][number]} w
 * @param {Pick<CapacityFilters, 'gapsOnly' | 'reasons'>} f
 * @returns {boolean}
 */
export const weekMatches = (w, f) =>
  (!f.gapsOnly || isGapWeek(w)) && reasonMatches(w.entry?.reason, f.reasons);

/**
 * Does a plan pass the supplier, group, material and gaps-only filters?
 * @param {CapacityPlan} p
 * @param {CapacityFilters} f
 * @returns {boolean}
 */
export function planMatches(p, f) {
  if (f.supplierId !== null && p.supplierId !== f.supplierId) return false;
  if (f.planningGroupId !== null && p.planningGroupId !== f.planningGroupId) return false;
  if (f.materialCode !== null && !p.materials.includes(f.materialCode)) return false;
  if ((f.gapsOnly || f.reasons.length > 0) && !p.weeks.some((w) => weekMatches(w, f))) return false;
  return true;
}
