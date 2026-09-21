// ─────────────────────────────────────────────────────────────────────────────
// PLANNER CAPACITY FILTERS — REQ-E08-04 BR-07, AC-04 (BL-63).
//
// Supplier, material group, material and gap weeks only, KEPT IN THE ADDRESS
// like the Order summary drill filter (`orderSummaryDrill.ts`), so a filtered
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

import type { CapacityPlan } from '../../services/data/types';
import { isGapWeek } from '../../services/transitions/capacityRules';
import { parseIdParam } from '../orders/orderSummaryDrill';

export const CAPACITY_FILTER_PARAMS = {
  supplier: 'supplier',
  materialGroup: 'materialGroup',
  material: 'materialCode',
  gapsOnly: 'gapsOnly',
} as const;

export interface CapacityFilters {
  readonly supplierId: string | null;
  readonly materialGroup: string | null;
  readonly materialCode: string | null;
  readonly gapsOnly: boolean;
  /** A value in the address was not id-shaped and was ignored. */
  readonly ignoredMalformed: boolean;
}

export function readCapacityFilters(params: URLSearchParams): CapacityFilters {
  let ignoredMalformed = false;
  const id = (name: string): string | null => {
    const parsed = parseIdParam(params.get(name));
    if (parsed.kind === 'malformed') ignoredMalformed = true;
    return parsed.kind === 'ok' ? parsed.value : null;
  };
  const supplierId = id(CAPACITY_FILTER_PARAMS.supplier);
  const materialGroup = id(CAPACITY_FILTER_PARAMS.materialGroup);
  const materialCode = id(CAPACITY_FILTER_PARAMS.material);
  const gapsOnly = params.get(CAPACITY_FILTER_PARAMS.gapsOnly) === '1';
  return { supplierId, materialGroup, materialCode, gapsOnly, ignoredMalformed };
}

export const anyCapacityFilter = (f: CapacityFilters): boolean =>
  f.supplierId !== null || f.materialGroup !== null || f.materialCode !== null || f.gapsOnly;

/**
 * Write one filter into a COPY of the address, keeping every other parameter
 * (the PO drill's included). `null` / `false` removes the parameter.
 */
export function withCapacityFilter(
  params: URLSearchParams,
  key: keyof typeof CAPACITY_FILTER_PARAMS,
  value: string | boolean | null,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const name = CAPACITY_FILTER_PARAMS[key];
  if (value === null || value === false || value === '') next.delete(name);
  else next.set(name, value === true ? '1' : value);
  return next;
}

/** The address with every capacity filter removed; the PO drill is untouched. */
export function withoutCapacityFilters(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const name of Object.values(CAPACITY_FILTER_PARAMS)) next.delete(name);
  return next;
}

/** Does a plan pass the supplier, group, material and gaps-only filters? */
export function planMatches(p: CapacityPlan, f: CapacityFilters): boolean {
  if (f.supplierId !== null && p.supplierId !== f.supplierId) return false;
  if (f.materialGroup !== null && p.materialGroup !== f.materialGroup) return false;
  if (f.materialCode !== null && !p.materials.includes(f.materialCode)) return false;
  if (f.gapsOnly && !p.weeks.some(isGapWeek)) return false;
  return true;
}

/** The weeks a plan shows: every week, or only its gap weeks under gaps-only. */
export const weekMatches = (w: CapacityPlan['weeks'][number], f: CapacityFilters): boolean => !f.gapsOnly || isGapWeek(w);
