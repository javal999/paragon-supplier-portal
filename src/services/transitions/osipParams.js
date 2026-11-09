// ─────────────────────────────────────────────────────────────────────────────
// OSIP VALUES PER MATERIAL AND PER SUPPLIER — the Material Planning team's
// answers of 2026-10-28, owner ruling 2026-10-28 (SC-HUB-MATERIAL-TEAM-ANSWERS-
// 2026-10 section 3; SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10 section 4).
//
// The rules block (`OSIP_RULES`) holds ONE default per key. The team answered
// that five of those values are data, not one constant: they differ by
// material or by supplier, and a person sets them. Each is one row kind here:
//
//   z                      per material   [Team B3] service-level factor; default
//                                         `OSIP_RULES.z` (1.65, a 95% service
//                                         level). It should come from SAP's
//                                         service-level master data by material
//                                         criticality once a feed exists; until
//                                         then the planner enters it.
//   g                      per material   [Team B7] fixed safety days; default
//                                         `OSIP_RULES.fixedSafetyDays` (1). Owners:
//                                         Logistics Operations for ROP Fisik,
//                                         Supply Sustainability for ROP Order.
//                                         The hub applies g where it applied it
//                                         before (ROP Fisik): whether ROP Order
//                                         reads g too is open (section 4, Q3).
//   f                      per supplier   [Team B6] the ROP Fisik replenishment
//                                         cycle (the call-off lead time), in
//                                         days; default by supply area
//                                         (`OSIP_RULES.replenishmentCycleDays`).
//   pullAgreement          per supplier   [Team E2] the supplier is on a pull
//                                         agreement: it confirms stock and
//                                         feedstock daily, else weekly with the
//                                         DA send (`feedstockRules`); default no
//                                         ([Proposed], owner 2026-10-28).
//   bottleneckLeadTimeDays per supplier   [Team B10] the supplier's bottleneck
//                          × material     production lead time, queueing
//                                         included, in days: ROP Supplier =
//                                         demand × it. No default: with none,
//                                         ROP Supplier says the lead time is
//                                         missing ([Proposed], owner 2026-10-28).
//
// A row's value `null` resets to the default. The row is the ledger's
// (`osipParamStore`); the latest row of a key is in force.
//
// Pure: no store, no clock. The policy hook and the page's form call the SAME
// `osipParamRefusal`, so the form cannot accept what the verb refuses.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { OsipRules, SupplyArea } from './osipRules' */
import { OSIP_RULES } from './osipRules';

/** @typedef {'z' | 'g' | 'f' | 'pullAgreement' | 'bottleneckLeadTimeDays' | 'grace' | 'noMove'} OsipParam */

/** @typedef {'material' | 'supplier' | 'supplierMaterial'} OsipParamScope */

/**
 * One value kind: what it is set per, and its bounds. `above`: a strict lower
 * bound. `boolean`: a yes/no value.
 * @typedef {{
 *   readonly scope: OsipParamScope;
 *   readonly question: string;
 *   readonly boolean?: boolean;
 *   readonly integer?: boolean;
 *   readonly above?: number;
 *   readonly min?: number;
 *   readonly max?: number;
 * }} OsipParamDef
 */

/** Every value kind, in page order. @type {Readonly<Record<OsipParam, OsipParamDef>>} */
export const OSIP_PARAMS = Object.freeze({
  z: Object.freeze({ scope: 'material', question: 'B3', above: 0, max: 5 }),
  g: Object.freeze({ scope: 'material', question: 'B7', min: 0, max: 60 }),
  f: Object.freeze({ scope: 'supplier', question: 'B6', above: 0, max: 60 }),
  pullAgreement: Object.freeze({ scope: 'supplier', question: 'E2', boolean: true }),
  bottleneckLeadTimeDays: Object.freeze({
    scope: 'supplierMaterial',
    question: 'B10',
    above: 0,
    max: 365
  }),
  // PEX-7 BR-02..BR-04 [PEX-D7]: days, per supplier × material; default 14
  // (`PO_ON_HOLD_RULES`). Set on the PO On Hold panel, not on the OSIP values
  // page, so they are not in `OSIP_PARAM_KINDS`.
  grace: Object.freeze({
    scope: 'supplierMaterial',
    question: 'PEX-7',
    integer: true,
    min: 0,
    max: 365
  }),
  noMove: Object.freeze({
    scope: 'supplierMaterial',
    question: 'PEX-7',
    integer: true,
    min: 0,
    max: 365
  })
});

/** The kinds, in page order. @type {readonly OsipParam[]} */
export const OSIP_PARAM_KINDS = Object.freeze(
  /** @type {OsipParam[]} */ (['z', 'g', 'f', 'pullAgreement', 'bottleneckLeadTimeDays'])
);

/**
 * The ledger key a value is kept under: `<param>|<materialCode>`,
 * `<param>|<supplierId>` or `<param>|<supplierId>|<materialCode>`.
 * @param {OsipParam} param
 * @param {{ readonly supplierId?: string; readonly materialCode?: string }} at
 * @returns {string}
 */
export function osipParamKey(param, { supplierId, materialCode }) {
  const scope = OSIP_PARAMS[param].scope;
  if (scope === 'material') return `${param}|${materialCode}`;
  if (scope === 'supplier') return `${param}|${supplierId}`;
  return `${param}|${supplierId}|${materialCode}`;
}

/**
 * What a ledger key names, or null when it is not one.
 * @param {unknown} key
 * @returns {{ param: OsipParam; supplierId: string | null; materialCode: string | null } | null}
 */
export function parseOsipParamKey(key) {
  if (typeof key !== 'string') return null;
  const [param, a, b, ...rest] = key.split('|');
  if (rest.length > 0 || !Object.prototype.hasOwnProperty.call(OSIP_PARAMS, param)) return null;
  const scope = OSIP_PARAMS[/** @type {OsipParam} */ (param)].scope;
  const p = /** @type {OsipParam} */ (param);
  if (scope === 'material')
    return a && b === undefined ? { param: p, supplierId: null, materialCode: a } : null;
  if (scope === 'supplier')
    return a && b === undefined ? { param: p, supplierId: a, materialCode: null } : null;
  return a && b ? { param: p, supplierId: a, materialCode: b } : null;
}

/**
 * Why a value would be refused for a kind, or null when it is acceptable.
 * `null` is always acceptable: back to the default.
 * @param {OsipParam} param
 * @param {unknown} value
 * @returns {string | null}
 */
export function osipParamRefusal(param, value) {
  const def = OSIP_PARAMS[param];
  if (!def) return 'OSIP_PARAM_UNKNOWN';
  if (value === null) return null;
  if (def.boolean)
    return typeof value === 'boolean' ? null : 'OSIP_PARAM_INVALID: a yes or no is expected';
  if (typeof value !== 'number' || !Number.isFinite(value))
    return 'OSIP_PARAM_INVALID: a number is expected';
  if (def.integer && !Number.isInteger(value))
    return 'OSIP_PARAM_INVALID: a whole number is expected';
  if (def.above !== undefined && !(value > def.above))
    return `OSIP_PARAM_INVALID: must be above ${def.above}`;
  if (def.min !== undefined && value < def.min) return `OSIP_PARAM_INVALID: at least ${def.min}`;
  if (def.max !== undefined && value > def.max) return `OSIP_PARAM_INVALID: at most ${def.max}`;
  return null;
}

/**
 * A key's value in force: its latest row's, or null (the default applies).
 * @param {readonly { readonly value: number | boolean | null }[]} rows  The key's rows, oldest first.
 * @returns {number | boolean | null}
 */
export function osipParamInForce(rows) {
  const last = rows[rows.length - 1];
  return last ? last.value : null;
}

/**
 * The values set for one supplier × material, each null when none is set (the
 * default applies). `pullAgreement` is false by default, never null here.
 * @typedef {{
 *   readonly z: number | null;
 *   readonly g: number | null;
 *   readonly f: number | null;
 *   readonly pullAgreement: boolean;
 *   readonly bottleneckLeadTimeDays: number | null;
 * }} OsipParamValues
 */

/** Nothing set. @type {OsipParamValues} */
export const NO_OSIP_PARAMS = Object.freeze({
  z: null,
  g: null,
  f: null,
  pullAgreement: false,
  bottleneckLeadTimeDays: null
});

/**
 * The rules one material runs on: the block with its own Z and g, when set.
 * @param {OsipRules} rules
 * @param {{ readonly z?: number | null; readonly g?: number | null }} values
 * @returns {OsipRules}
 */
export function rulesForMaterial(rules, { z, g }) {
  if ((z === null || z === undefined) && (g === null || g === undefined)) return rules;
  return {
    ...rules,
    ...(typeof z === 'number' ? { z } : {}),
    ...(typeof g === 'number' ? { fixedSafetyDays: g } : {})
  };
}

/**
 * [Team B6] — a supplier's replenishment cycle f in days: its own value when
 * set, else its supply area's default; null with neither.
 * @param {number | null | undefined} own
 * @param {SupplyArea | null} area
 * @param {OsipRules} [rules]
 * @returns {number | null}
 */
export function cycleDaysOf(own, area, rules = OSIP_RULES) {
  if (typeof own === 'number') return own;
  return area ? rules.replenishmentCycleDays[area] : null;
}
