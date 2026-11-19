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
import { COVER_WEEKS_MAX, COVER_WEEKS_MIN } from './bufferModelA';

/** @typedef {'z' | 'g' | 'f' | 'pullAgreement' | 'bottleneckLeadTimeDays' | 'safetyStockOn' | 'protectionBufferOn' | 'coverWeeks' | 'coverageWeeks' | 'materialBufferOn' | 'grace' | 'noMove' | 'pipo' | 'maxPti' | 'autoAbsorbMaxPct' | 'autoCarryMaxPct'} OsipParam */

/** @typedef {'material' | 'supplier' | 'supplierMaterial' | 'materialClass'} OsipParamScope */

/**
 * One value kind: what it is set per, and its bounds. `above`: a strict lower
 * bound. `boolean`: a yes/no value.
 * @typedef {{
 *   readonly scope: OsipParamScope;
 *   readonly question: string;
 *   readonly boolean?: boolean;
 *   readonly integer?: boolean;
 *   readonly reasonRequired?: boolean;
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
  // PEX-13 (BL-275) — per material, default on. Every change needs a reason.
  safetyStockOn: Object.freeze({
    scope: 'material',
    question: 'PEX-13',
    boolean: true,
    reasonRequired: true
  }),
  protectionBufferOn: Object.freeze({
    scope: 'material',
    question: 'PEX-13',
    boolean: true,
    reasonRequired: true
  }),
  // PSC-4 BR-03 (BL-339), owner ruling 2026-11-19 — the Protection Buffer's
  // cover setting P per material, in weeks. Default 4 (`COVER_WEEKS_DEFAULT`).
  // A change moves ROP Order only: recorded with DRC-D16, no DA version (BR-10).
  coverWeeks: Object.freeze({
    scope: 'material',
    question: 'PSC-4',
    integer: true,
    min: COVER_WEEKS_MIN,
    max: COVER_WEEKS_MAX
  }),
  // PSC-4 BR-05 (BL-339), owner ruling 2026-11-19 — the Material Buffer's OWN
  // coverage weeks per material. Default 2 (`COVERAGE_WEEKS_DEFAULT`): the
  // average weekly LTP A over the next N hub weeks, times N. Separate from the
  // Protection setting. ROP Order only: DRC-D16, no DA version (BR-10).
  coverageWeeks: Object.freeze({
    scope: 'material',
    question: 'PSC-4',
    integer: true,
    min: COVER_WEEKS_MIN,
    max: COVER_WEEKS_MAX
  }),
  // PSC-4 BR-07 (BL-339) — the planner's override of the Material Buffer
  // switch, with a required reason. The value in force: true/false overrides
  // the event calendar; null (cleared) follows it again. The override persists
  // across windows until it is cleared (PSC-4 edge case). ROP Order only:
  // recorded with DRC-D16, writes no DA version (BR-10, Q2).
  materialBufferOn: Object.freeze({
    scope: 'material',
    question: 'PSC-4',
    boolean: true,
    reasonRequired: true
  }),
  // PEX-7 BR-02..BR-04 [PEX-D7]: per supplier × material; default 14
  // (`PO_ON_HOLD_RULES`). PSC-6 BR-01 / PEX-D7 (owner, 2026-11-18): `grace` is
  // CALENDAR days; `noMove` stays WORKING days on the hub calendar.
  // Set on the PO On Hold panel, not on the OSIP values page, so they are not
  // in `OSIP_PARAM_KINDS`.
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
  }),
  // PEX-8 BR-02/BR-03 FG data [Proposed, owner away 2026-11-10]: the PIPO flag
  // per material (default no) and Max PTI per supplier × material (no default:
  // with none, the FG cap cannot be computed). Set on the PO On Hold panel.
  pipo: Object.freeze({ scope: 'material', question: 'PEX-8', boolean: true }),
  maxPti: Object.freeze({
    scope: 'supplierMaterial',
    question: 'PEX-8',
    integer: true,
    min: 0,
    max: 1_000_000_000
  }),
  // PEX-12 [Proposed, owner away 2026-11-12; Mba Septi has not given values]:
  // the share of a line's open PO quantity (OSPO) that PO On Hold may be for
  // the hub to RECOMMEND auto absorb (as FG) or auto carry-over (spread). Per
  // material class (the SAP material group, `MG-xx`). NO DEFAULT: with none
  // set the recommendation is "manual: no threshold set". Never executes.
  autoAbsorbMaxPct: Object.freeze({
    scope: 'materialClass',
    question: 'PEX-12',
    integer: true,
    min: 0,
    max: 100
  }),
  autoCarryMaxPct: Object.freeze({
    scope: 'materialClass',
    question: 'PEX-12',
    integer: true,
    min: 0,
    max: 100
  })
});

/** PEX-13 BR-02 — the shortest reason a switch change accepts, in characters. */
export const SWITCH_REASON_MIN_LENGTH = 10;

/**
 * PEX-13 BR-02 — why a reason would be refused for a kind, or null when it is
 * acceptable (or the kind needs none). A switch change, on or off, needs a
 * free-text reason of at least `SWITCH_REASON_MIN_LENGTH` characters.
 * @param {OsipParam} param
 * @param {unknown} reason
 * @returns {string | null}
 */
export function osipReasonRefusal(param, reason) {
  if (!OSIP_PARAMS[param]?.reasonRequired) return null;
  const text = typeof reason === 'string' ? reason.trim() : '';
  return text.length >= SWITCH_REASON_MIN_LENGTH
    ? null
    : `OSIP_REASON_REQUIRED: at least ${SWITCH_REASON_MIN_LENGTH} characters`;
}

/**
 * PEX-13 BR-01 — a switch is on unless its latest row says off.
 * @param {number | boolean | null | undefined} value  The value in force (null: the default, on).
 * @returns {boolean}
 */
export const switchIsOn = (value) => value !== false;

/** The kinds, in page order. @type {readonly OsipParam[]} */
export const OSIP_PARAM_KINDS = Object.freeze(
  /** @type {OsipParam[]} */ ([
    'z',
    'g',
    'f',
    'pullAgreement',
    'bottleneckLeadTimeDays',
    'safetyStockOn',
    'protectionBufferOn'
  ])
);

/**
 * The ledger key a value is kept under: `<param>|<materialCode>`,
 * `<param>|<supplierId>` or `<param>|<supplierId>|<materialCode>`.
 * @param {OsipParam} param
 * @param {{ readonly supplierId?: string; readonly materialCode?: string; readonly materialClass?: string }} at
 * @returns {string}
 */
export function osipParamKey(param, { supplierId, materialCode, materialClass }) {
  const scope = OSIP_PARAMS[param].scope;
  if (scope === 'materialClass') return `${param}|${materialClass}`;
  if (scope === 'material') return `${param}|${materialCode}`;
  if (scope === 'supplier') return `${param}|${supplierId}`;
  return `${param}|${supplierId}|${materialCode}`;
}

/**
 * What a ledger key names, or null when it is not one.
 * @param {unknown} key
 * @returns {{ param: OsipParam; supplierId: string | null; materialCode: string | null; materialClass?: string } | null}
 */
export function parseOsipParamKey(key) {
  if (typeof key !== 'string') return null;
  const [param, a, b, ...rest] = key.split('|');
  if (rest.length > 0 || !Object.prototype.hasOwnProperty.call(OSIP_PARAMS, param)) return null;
  const scope = OSIP_PARAMS[/** @type {OsipParam} */ (param)].scope;
  const p = /** @type {OsipParam} */ (param);
  if (scope === 'materialClass')
    return a && b === undefined
      ? { param: p, supplierId: null, materialCode: null, materialClass: a }
      : null;
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
