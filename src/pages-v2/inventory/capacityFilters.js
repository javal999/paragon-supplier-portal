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
// ─────────────────────────────────────────────────────────────────────────────

/** @import { CapacityPlan } from '@services/data/types' */
import { isGapWeek } from '@services/transitions/capacityRules';
import { parseIdParam } from '../orders/orderSummaryDrill';

export const CAPACITY_FILTER_PARAMS = /** @type {const} */ ({
  supplier: 'supplier',
  planningGroup: 'planningGroup',
  material: 'materialCode',
  gapsOnly: 'gapsOnly'
});

/**
 * `ignoredMalformed`:  A value in the address was not id-shaped and was ignored.
 *
 * @typedef {{
 *     readonly supplierId: string | null;
 *     readonly planningGroupId: string | null;
 *     readonly materialCode: string | null;
 *     readonly gapsOnly: boolean;
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
  return { supplierId, planningGroupId, materialCode, gapsOnly, ignoredMalformed };
}

/**
 * @param {CapacityFilters} f
 * @returns {boolean}
 */
export const anyCapacityFilter = (f) =>
  f.supplierId !== null || f.planningGroupId !== null || f.materialCode !== null || f.gapsOnly;

/**
 * Write one filter into a COPY of the address, keeping every other parameter
 * (the PO drill's included). `null` / `false` removes the parameter.
 * @param {URLSearchParams} params
 * @param {keyof typeof CAPACITY_FILTER_PARAMS} key
 * @param {string | boolean | null} value
 * @returns {URLSearchParams}
 */
export function withCapacityFilter(params, key, value) {
  const next = new URLSearchParams(params);
  const name = CAPACITY_FILTER_PARAMS[key];
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
 * Does a plan pass the supplier, group, material and gaps-only filters?
 * @param {CapacityPlan} p
 * @param {CapacityFilters} f
 * @returns {boolean}
 */
export function planMatches(p, f) {
  if (f.supplierId !== null && p.supplierId !== f.supplierId) return false;
  if (f.planningGroupId !== null && p.planningGroupId !== f.planningGroupId) return false;
  if (f.materialCode !== null && !p.materials.includes(f.materialCode)) return false;
  if (f.gapsOnly && !p.weeks.some(isGapWeek)) return false;
  return true;
}

/**
 * The weeks a plan shows: every week, or only its gap weeks under gaps-only.
 * @param {CapacityPlan['weeks'][number]} w
 * @param {CapacityFilters} f
 * @returns {boolean}
 */
export const weekMatches = (w, f) => !f.gapsOnly || isGapWeek(w);
