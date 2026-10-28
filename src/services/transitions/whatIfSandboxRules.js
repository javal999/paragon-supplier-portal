// ─────────────────────────────────────────────────────────────────────────────
// WHAT-IF SANDBOX — BL-202 (DRC-17), SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10
// section 3 "DRC-17 What-if sandbox", scope accepted by the owner 2026-10-16.
//
// A planner changes the input numbers of ONE supplier × material and sees what
// the live plan's own functions make of them. Nothing here is a formula: every
// figure is the function the live plan calls, handed the scenario's inputs and
// the scenario's rules (design rule 1):
//   · DA per week, carry-over, OSPO, PR need, plan check
//                         `rollingDaFigure`            DRC-2, DRC-4 (BL-188/190)
//   · safety order, ROP Fisik safety
//                         `osipSafety`                 DRC-7 (BL-193)
//   · ROP Order, ROP Fisik by level, Max, supplier-side ROPs
//                         `osipRops`                   DRC-10 (BL-196)
//   · the call-offs the trigger would draft, the PR recommendation
//                         `sohCheck`, `allocateCallOffs`, `triggerStep`
//                                                      DRC-13 (BL-199)
//   · projected SOH       `projectedSoh`               PPT 7 (BL-187)
//   · lead time           `leadTimeBreakdown`          DRC-6 (BL-192)
//
// What this file adds is the WEEK LOOP that strings the trigger through the
// horizon (BR-03 "call-offs the trigger would draft", "projected SOH", "first
// shortage week", "weeks above Max"), and the switch catalogue (BR-02). Both
// are readings, one key each in `WHAT_IF_RULES`, reported as build decisions.
//
// BR-06 — ANALYSIS ONLY. Pure: plain data in, plain data out. No store, no
// clock, no dispatch. Nothing here changes DA, POs, call-offs, levels,
// settings or SAP.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { Carry, OsipRules, SupplyArea } from './osipRules' */
/** @import { OsipSafetyFigures, OsipSafetyInput } from './osipSafetyRules' */
/** @import { NpdRule, OsipRopFigures } from './osipRopRules' */
/** @import { PtiPlant, TriggerLine } from './callOffTriggerRules' */
/** @import { RollingDaFigure } from './demandAnticipationRules' */
/** @import { LeadTimeRoute, LeadTimeStep } from '../engine/types' */
import {
  OSIP_RULES,
  RULES_VERSION,
  horizonWeeksOf,
  maxRoundingUnit,
  projectedSoh
} from './osipRules';
import { OSIP_SAFETY_QUESTIONS, osipSafety } from './osipSafetyRules';
import { rulesForMaterial } from './osipParams';
import {
  NPD_RULES,
  OSIP_LEVELS,
  OSIP_ROP_QUESTIONS,
  OSIP_ROP_READ,
  npdLtpWeeks,
  osipRops
} from './osipRopRules';
import {
  CALL_OFF_TRIGGER_QUESTIONS,
  CALL_OFF_TRIGGER_RULES,
  PTI_PLANTS,
  allocateCallOffs,
  sohCheck,
  triggerStep
} from './callOffTriggerRules';
import { DA_PROVISIONAL_QUESTIONS, rollingDaFigure } from './demandAnticipationRules';
import { BUFFER_RULES, PRODUCTION_LIMIT_QUESTION } from './drcBufferRules';
import { streamOfMaterialType } from './forecastConfig';
import { leadTimeBreakdown } from '../engine/leadTimeSteps';

/** @typedef {'RM' | 'PM'} MaterialClass */

/**
 * The sandbox's own values and readings, one key each (design rule 2).
 */
export const WHAT_IF_RULES = Object.freeze({
  /** DRC-17 BR-04 — the weeks the sandbox runs: 52 for raw material, 24 for packaging. */
  horizonWeeks: Object.freeze(/** @type {Record<MaterialClass, number>} */ ({ RM: 52, PM: 24 })),
  /** DRC-17 BR-05 — saved scenarios compared beside the current plan. */
  compareMax: 3,
  /** DRC-17 BR-05 — the longest scenario name. */
  nameMaxLength: 60,
  /** [Default, wave 2] MPQ = orderMultiple until the master data feed carries MPQ (wave 2 default). */
  mpqSource: /** @type {'orderMultiple'} */ ('orderMultiple'),
  /**
   * Reading (BR-03) — a week is a SHORTAGE when SOH falls below this on any of
   * its days. 0: the stock runs out; the projection keeps the negative figure
   * as unmet demand.
   */
  shortageBelow: 0,
  /**
   * Reading (BR-03) — the planner approves each call-off the trigger drafts,
   * and it arrives on its need date, today + f (DRC-13 BR-01a). This planning
   * week's released call-offs arrive on its first day.
   */
  callOffArrival: /** @type {'needDate'} */ ('needDate'),
  /** DRC-B4 — the trigger is checked once a day; a week's LTP is used evenly over its 7 days. */
  daysPerWeek: 7,
  /**
   * Reading (BR-02) — festive uplift: a percentage added to the LTP of the
   * weeks whose Monday falls in a month of a festive window (Ramadan to
   * Lebaran, the demand-event calendar DRC-9a reads, DRC-B28). 0 = the LTP as
   * published.
   */
  upliftWeeks: /** @type {'festiveWindow'} */ ('festiveWindow')
});

// ─── Inputs and switches (BR-02) ────────────────────────────────────────────

/**
 * One scenario's inputs, prefilled with today's live values (BR-02).
 * `weeks` / `ltp`:  The horizon from the planning week (BR-04), LTP per week as published.
 * `festiveWeeks`:  The horizon weeks the festive uplift applies to.
 * `upliftPct`:  Festive uplift, percent (0 = none).
 * `leadTime`:  The source's lead time: route, steps (DRC-6) and total days; null when none is on record.
 * `supplyArea` / `f`:  The supply area and its replenishment cycle f in days (null = the rules' value).
 * `consumption`:  The supplier's share of recorded weekly consumption, oldest first.
 * `sd`:  BL-210 — a typed SD for the safety order; null (or absent, a scenario
 *   saved before it existed) = computed per `sdSource` [Default B2].
 * `mpq`:  [Default, wave 2] MPQ = orderMultiple until the master data feed carries MPQ.
 * `maxOverride`:  A PTI Max typed by the planner; null = the system's Max (DRC-10).
 * `soh`:  PTI SOH per plant (DRC-D12), this supplier's share; `stockOnRecord` false = SAP holds no stock.
 * `ospoStart`:  The OSPO chain's start: last week's published OSPO when `previous`, else open PO not called off.
 * `newPoPrev` / `callOffPrev`:  Last planning week's additional PO and call-offs (the chain, [Default A9]).
 * `callOff`:  Released call-offs needed this planning week.
 * `carries`:  Remainders earlier planning weeks moved forward.
 * `agreedFirstOutside`:  The supplier agreed to take the remainder outside the horizon [Owner A8].
 * `carryOverLimit`:  [Default A8b] the limit quantity; null = not applied (the hub holds no sales-order quantity).
 * `ospr`:  Open PR quantity; null = the hub holds none (DRC-B17).
 * `feedstock`:  The supplier's confirmed feedstock (DRC-8). Shown only: no rule reads it ([Default E1] LT spare 0).
 * `level`:  OSIP level (DRC-D11).
 * `npd`:  The material's NPD tag under each NPD rule (DRC-12a).
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly materialClass: MaterialClass;
 *   readonly planningWeek: string;
 *   readonly weeks: readonly string[];
 *   readonly ltp: readonly number[];
 *   readonly festiveWeeks: readonly string[];
 *   readonly upliftPct: number;
 *   readonly leadTime: { readonly route: LeadTimeRoute | null; readonly steps: readonly LeadTimeStep[]; readonly days: number } | null;
 *   readonly supplyArea: SupplyArea | null;
 *   readonly f: number | null;
 *   readonly consumption: readonly number[];
 *   readonly sd?: number | null;
 *   readonly bottleneckLeadTimeDays?: number | null;
 *   readonly mpq: number;
 *   readonly moq: number;
 *   readonly koli: number | null;
 *   readonly maxOverride: number | null;
 *   readonly soh: Readonly<Record<PtiPlant, number>>;
 *   readonly stockOnRecord: boolean;
 *   readonly previous: boolean;
 *   readonly ospoStart: number;
 *   readonly newPoPrev: number;
 *   readonly callOffPrev: number;
 *   readonly callOff: number;
 *   readonly carries: readonly Carry[];
 *   readonly agreedFirstOutside: boolean;
 *   readonly carryOverLimit: number | null;
 *   readonly ospr: number | null;
 *   readonly feedstock: number | null;
 *   readonly level: number;
 *   readonly npd: Readonly<Record<NpdRule, boolean>>;
 * }} WhatIfInputs
 */

/**
 * Every rule switch the sandbox runs under (BR-02): the whole `OSIP_RULES`
 * block plus the switches the later modules added.
 * @typedef {{
 *   readonly osip: OsipRules;
 *   readonly npdRule: NpdRule;
 *   readonly plantComparison: 'combined' | 'perPlant';
 *   readonly maxCap: 'mpqMultiple' | 'exact';
 *   readonly quantityRule: 'minimumDelivery' | 'fillToMax';
 *   readonly minimumDeliveryAboveMax: 'callOff' | 'wait';
 *   readonly productionLimitSource: 'allocatedCapacity' | 'sadrFeed';
 * }} WhatIfSwitches
 */

/** The switches in force: the live plan's rules. @type {WhatIfSwitches} */
export const DEFAULT_SWITCHES = Object.freeze({
  osip: OSIP_RULES,
  npdRule: OSIP_ROP_READ.npdRule,
  plantComparison: CALL_OFF_TRIGGER_RULES.plantComparison,
  maxCap: CALL_OFF_TRIGGER_RULES.maxCap,
  quantityRule: CALL_OFF_TRIGGER_RULES.quantityRule,
  minimumDeliveryAboveMax: CALL_OFF_TRIGGER_RULES.minimumDeliveryAboveMax,
  productionLimitSource: BUFFER_RULES.productionLimitSource
});

/**
 * One editable switch (BR-02), named with its question ID.
 * `path`:  `osip.<key>` for an `OSIP_RULES` key, else the `WhatIfSwitches` key.
 * `feeds`:  Whether a sandbox figure reads it. A switch that feeds none is still
 *   listed (BR-02 "every switch") and says why on the page (`note`).
 * @typedef {{
 *   readonly path: string;
 *   readonly question: string;
 *   readonly kind: 'number' | 'boolean' | 'choice';
 *   readonly options?: readonly string[];
 *   readonly feeds: boolean;
 *   readonly note?: 'cvOnly' | 'carryTarget' | 'unitName' | 'capacity' | 'levelInput';
 * }} SwitchSpec
 */

/**
 * BR-02 — every rule switch, in the order the page lists them. Every
 * `OSIP_RULES` key is here except `replenishmentCycleDays`, which the page edits
 * as f under "Lead time and replenishment" (`whatIfSandbox.test` derives it).
 * @type {readonly SwitchSpec[]}
 */
export const SWITCH_CATALOG = Object.freeze([
  {
    path: 'osip.daSafetyPlacement',
    question: 'A1',
    kind: 'choice',
    options: ['week1', 'spread'],
    feeds: true
  },
  {
    path: 'osip.planCheckBasis',
    question: 'A2',
    kind: 'choice',
    options: ['totalOspo', 'sohOspoOsprPr', 'ospoOsprPr'],
    feeds: true
  },
  // [Owner A8] — the live DA picks the target from the recorded agreement
  // (`rollingDaFigure` passes `carryTo`), so this key moves no live figure.
  {
    path: 'osip.carryOverTarget',
    question: 'A8',
    kind: 'choice',
    options: ['lastWeek', 'firstOutside'],
    feeds: false,
    note: 'carryTarget'
  },
  {
    path: 'osip.carryOverLimit',
    question: 'A8b',
    kind: 'choice',
    options: ['salesOrderQty4w'],
    feeds: false,
    note: 'unitName'
  },
  { path: 'osip.ospoIncludesNewPo', question: 'A9', kind: 'boolean', feeds: true },
  // BL-212 — the NPD demand's LTP window (`npdLtpWeeks(rules)`) reads this key from the rules in use.
  // BL-210 — `osipSafety` reads the ROP Fisik consumption window from the rules in use.
  { path: 'osip.consumptionMovingAvgWeeks', question: 'A11', kind: 'number', feeds: true },
  {
    path: 'osip.fisikSafety',
    question: 'B1',
    kind: 'choice',
    options: ['deck', 'sheet'],
    feeds: true
  },
  {
    path: 'osip.sdSource',
    question: 'B2',
    kind: 'choice',
    options: ['ltp13w', 'ltp', 'consumption12w'],
    feeds: true
  },
  { path: 'osip.ltpSdWeeks', question: 'B2', kind: 'number', feeds: true },
  { path: 'osip.consumptionSdWeeks', question: 'B2', kind: 'number', feeds: true },
  { path: 'osip.z', question: 'B3', kind: 'number', feeds: true },
  {
    path: 'osip.safetyRounding',
    question: 'B4',
    kind: 'choice',
    options: ['mpq', 'koli', 'moq'],
    feeds: true
  },
  { path: 'osip.fisikDemandIncludesLtp', question: 'B5', kind: 'boolean', feeds: true },
  { path: 'osip.fixedSafetyDays', question: 'B7', kind: 'number', feeds: true },
  {
    path: 'osip.maxRule',
    question: 'B8',
    kind: 'choice',
    options: ['deck', 'sheetGuidance'],
    feeds: true
  },
  { path: 'osip.cvThreshold', question: 'C1', kind: 'number', feeds: false, note: 'cvOnly' },
  {
    path: 'osip.cvBucket',
    question: 'C1',
    kind: 'choice',
    options: ['month', 'week'],
    feeds: false,
    note: 'cvOnly'
  },
  { path: 'osip.cvWindowMonths', question: 'C1', kind: 'number', feeds: false, note: 'cvOnly' },
  { path: 'osip.cvWindowWeeks', question: 'C1', kind: 'number', feeds: false, note: 'cvOnly' },
  { path: 'osip.defaultLevel', question: 'C2', kind: 'number', feeds: true, note: 'levelInput' },
  { path: 'npdRule', question: 'D1', kind: 'choice', options: NPD_RULES, feeds: true },
  {
    path: 'productionLimitSource',
    question: PRODUCTION_LIMIT_QUESTION,
    kind: 'choice',
    options: ['allocatedCapacity', 'sadrFeed'],
    feeds: false,
    note: 'capacity'
  },
  {
    path: 'plantComparison',
    question: 'F1',
    kind: 'choice',
    options: ['combined', 'perPlant'],
    feeds: true
  },
  {
    path: 'maxCap',
    question: 'A7',
    kind: 'choice',
    options: ['mpqMultiple', 'exact'],
    feeds: true
  },
  {
    path: 'quantityRule',
    question: 'F5',
    kind: 'choice',
    options: ['minimumDelivery', 'fillToMax'],
    feeds: true
  },
  {
    path: 'minimumDeliveryAboveMax',
    question: 'F5',
    kind: 'choice',
    options: ['callOff', 'wait'],
    feeds: true
  }
]);

/**
 * A switch's value in a set of switches.
 * @param {WhatIfSwitches} switches
 * @param {string} path
 * @returns {unknown}
 */
export function switchValue(switches, path) {
  if (path.startsWith('osip.')) {
    return /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (switches.osip))[
      path.slice(5)
    ];
  }
  return /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (switches))[path];
}

/**
 * A copy of the switches with one changed.
 * @param {WhatIfSwitches} switches
 * @param {string} path
 * @param {unknown} value
 * @returns {WhatIfSwitches}
 */
export function withSwitch(switches, path, value) {
  if (path.startsWith('osip.'))
    return { ...switches, osip: { ...switches.osip, [path.slice(5)]: value } };
  return { ...switches, [path]: value };
}

/**
 * The switches a scenario differs from the rules in force on (or from `base`,
 * the PPT 7 preset's own switches).
 * @param {WhatIfSwitches} switches
 * @param {WhatIfSwitches} [base]
 * @returns {string[]}
 */
export function changedSwitches(switches, base = DEFAULT_SWITCHES) {
  return SWITCH_CATALOG.filter(
    (s) => switchValue(switches, s.path) !== switchValue(base, s.path)
  ).map((s) => s.path);
}

/**
 * [Team B3, B7] the switches a pair opens on: `base` with the material's own
 * Z and g (`osipParams`), when the planner set them.
 * @param {WhatIfSwitches} base
 * @param {{ readonly z?: number | null; readonly g?: number | null }} own
 * @returns {WhatIfSwitches}
 */
export function switchesForMaterial(base, own) {
  const osip = rulesForMaterial(base.osip, own);
  return osip === base.osip ? base : { ...base, osip };
}

/**
 * Stored switches over the rules in force: a key a later rules version added
 * takes today's value, so an older scenario still runs (BR-05).
 * @param {Partial<WhatIfSwitches> & { readonly osip?: Partial<OsipRules> }} stored
 * @returns {WhatIfSwitches}
 */
export function mergeSwitches(stored) {
  return {
    ...DEFAULT_SWITCHES,
    ...stored,
    osip: { ...OSIP_RULES, ...(stored.osip ?? {}) }
  };
}

/**
 * Whether a switch holds a value its catalogue entry allows.
 * @param {SwitchSpec} spec
 * @param {unknown} value
 * @returns {boolean}
 */
const validSwitch = (spec, value) =>
  spec.kind === 'number'
    ? typeof value === 'number' && Number.isFinite(value) && value >= 0
    : spec.kind === 'boolean'
      ? typeof value === 'boolean'
      : (spec.options ?? []).includes(/** @type {string} */ (value));

// ─── Material class and horizon (BR-04) ─────────────────────────────────────

/**
 * BR-04 — RM or PM the way the hub already classifies a material: its SAP
 * material type through the forecast streams (`streamOfMaterialType`: VERP =
 * packaging, anything else = raw material). A code the master does not hold
 * falls back to the engine dataset's warehouse kind.
 * @param {import('../sdc/types').MaterialMasterEntry['materialType'] | null} materialType
 * @param {'packaging' | 'rawMaterial' | null} [engineKind]
 * @returns {MaterialClass}
 */
export function materialClassOf(materialType, engineKind = null) {
  const stream = materialType ? streamOfMaterialType(materialType) : engineKind;
  return stream === 'packaging' ? 'PM' : 'RM';
}

/**
 * BR-04 — the sandbox's horizon in weeks for a material class.
 * @param {MaterialClass} materialClass
 * @returns {number}
 */
export const horizonOf = (materialClass) => WHAT_IF_RULES.horizonWeeks[materialClass];

// ─── The run (BR-03) ────────────────────────────────────────────────────────

/**
 * One week of the run.
 * `ltp`:  The LTP with the festive uplift.
 * `da`:  DA in force (after the plan check) in the DA horizon; null outside it.
 * `incoming`:  Released call-offs plus the trigger's call-offs, arriving that week.
 * `drafted`:  What the trigger drafts at ROP Fisik that week (BR-03).
 * `shortage`:  SOH fell below `shortageBelow` on a day of the week.
 * `prQty`:  The PR the trigger recommends that week (no blanket balance left, DRC-13 BR-02).
 * `soh`:  Projected SOH at the end of the week (`projectedSoh`).
 * @typedef {{
 *   readonly week: string;
 *   readonly ltp: number;
 *   readonly da: number | null;
 *   readonly incoming: number;
 *   readonly drafted: number;
 *   readonly prQty: number;
 *   readonly soh: number;
 *   readonly shortage: boolean;
 *   readonly aboveMax: boolean;
 * }} WhatIfWeek
 */

/**
 * Why a figure is shown as not available, beyond the module functions' own.
 *   · LEAD_TIME_BEYOND_HORIZON — the lead time is longer than the sandbox horizon: no DA.
 *   · NO_TRIGGER — no ROP Fisik or no Max: the trigger drafts nothing (projected SOH has no call-offs).
 * (BL-210 retired DA_SAFETY_LTP_ONLY and DA_SAFETY_MPQ_ONLY: `rollingDaFigure`
 * now takes the consumption, MOQ and koli ROP Order's safety order reads.)
 * @typedef {'LEAD_TIME_BEYOND_HORIZON' | 'NO_TRIGGER'} WhatIfFlag
 */

/**
 * The figures of one run.
 * `leadTimeWeeks`:  `leadTimeBreakdown(...).totalWeeks`; null with no lead time.
 * `safety` / `rops`:  `osipSafety` and `osipRops` under the scenario's rules.
 * `da`:  `rollingDaFigure`; null when the lead time is beyond the horizon.
 * `max`:  The Max the trigger and "weeks above Max" use: the override, else the system's.
 * `prNeed`:  The PR ZPE007 would generate from ROP Order (= −PR generated), DRC-4.
 * `triggerPr`:  The PR quantity the trigger recommends over the horizon (DRC-13 BR-02).
 * `firstShortageWeek`:  The first week projected below `shortageBelow`, or null.
 * `weeksAboveMax`:  The weeks projected above Max.
 * @typedef {{
 *   readonly leadTimeWeeks: number | null;
 *   readonly safety: OsipSafetyFigures;
 *   readonly rops: OsipRopFigures;
 *   readonly da: RollingDaFigure | null;
 *   readonly max: number | null;
 *   readonly maxSource: 'system' | 'override';
 *   readonly soh: number;
 *   readonly prNeed: number | null;
 *   readonly prRecommendation: number | null;
 *   readonly totalDa: number | null;
 *   readonly totalDrafted: number;
 *   readonly triggerPr: number;
 *   readonly callOffs: readonly { readonly week: string; readonly qty: number }[];
 *   readonly weeks: readonly WhatIfWeek[];
 *   readonly firstShortageWeek: string | null;
 *   readonly weeksAboveMax: readonly string[];
 *   readonly flags: readonly WhatIfFlag[];
 * }} WhatIfRun
 */

/**
 * The LTP of the horizon with the festive uplift on the festive weeks, whole units.
 * @param {WhatIfInputs} inputs
 * @returns {number[]}
 */
export function upliftedLtp(inputs) {
  const factor = 1 + (inputs.upliftPct ?? 0) / 100;
  return inputs.weeks.map((w, i) => {
    const q = inputs.ltp[i] ?? 0;
    return inputs.festiveWeeks.includes(w) ? Math.round(q * factor) : q;
  });
}

/**
 * One day's part of a week's LTP in whole units: the week spread evenly over
 * its 7 days, the odd units on the first days, so the days add up to the week.
 * @param {number} weekQty
 * @param {number} day  0 to 6.
 * @returns {number}
 */
export function dailyShare(weekQty, day) {
  const days = WHAT_IF_RULES.daysPerWeek;
  const base = Math.floor(weekQty / days);
  return base + (day < weekQty - base * days ? 1 : 0);
}

/**
 * The run's PTI SOH, all plants combined.
 * @param {WhatIfInputs} inputs
 * @returns {number}
 */
export const sohOf = (inputs) => PTI_PLANTS.reduce((n, p) => n + (inputs.soh[p] ?? 0), 0);

/**
 * DRC-17 BR-03 — every output figure of one scenario, from the live plan's own
 * functions under the scenario's switches.
 *
 * The day loop (the sandbox's reading, `WHAT_IF_RULES`): each day of the
 * horizon, after that day's arrivals and before its demand (the week's LTP
 * spread over 7 days in whole units, `dailyShare`), the trigger compares SOH with ROP Fisik (`sohCheck`, per
 * `plantComparison` [Default F1]); at or below, it fills up to Max less what is
 * on its way, from the OSPO balance (`allocateCallOffs`, rounded per `maxCap`),
 * armed as `triggerStep` says; what no balance covers is a PR recommendation.
 * A call-off arrives f days later (`callOffArrival`). The end-of-week SOH is
 * `projectedSoh` over the weekly incoming and LTP.
 * @param {WhatIfInputs} inputs
 * @param {WhatIfSwitches} [switches]
 * @returns {WhatIfRun}
 */
export function runWhatIf(inputs, switches = DEFAULT_SWITCHES) {
  /** @type {WhatIfFlag[]} */
  const flags = [];
  const area = inputs.supplyArea;
  // BR-02 — f is the area's replenishment cycle [Default B6]; the scenario's f
  // replaces the area's value in its own copy of the rules.
  /** @type {OsipRules} */
  const rules =
    area !== null && inputs.f !== null
      ? {
          ...switches.osip,
          replenishmentCycleDays: { ...switches.osip.replenishmentCycleDays, [area]: inputs.f }
        }
      : switches.osip;
  const ltp = upliftedLtp(inputs);

  // DRC-6 — the lead time from its steps (or its total days).
  const lt = inputs.leadTime
    ? leadTimeBreakdown({
        leadTimeDays: inputs.leadTime.days,
        ...(inputs.leadTime.route ? { leadTimeRoute: inputs.leadTime.route } : {}),
        leadTimeSteps: inputs.leadTime.steps
      })
    : null;
  const leadTimeWeeks = lt ? lt.totalWeeks : null;

  // DRC-7 / DRC-10 — exactly the inputs `osipSafetyInputs` gathers, under the scenario's rules.
  /** @type {OsipSafetyInput} */
  const osipInput = {
    supplierId: inputs.supplierId,
    materialCode: inputs.materialCode,
    ltp,
    leadTimeWeeks: leadTimeWeeks ?? 0,
    // [Default, wave 2] MPQ = orderMultiple until the master data feed carries MPQ (wave 2 default).
    mpq: inputs.mpq,
    moq: inputs.moq,
    koli: inputs.koli,
    consumption: inputs.consumption,
    supplyArea: area,
    leadTimeSteps: lt ? lt.steps : [],
    // BL-212 — the NPD window from the scenario's rules.
    ltpNext3m: ltp.slice(0, npdLtpWeeks(rules)),
    npd: inputs.npd[switches.npdRule],
    // BL-210 — the typed SD, when there is one.
    sd: inputs.sd ?? null,
    // [Team B10] ROP Supplier's bottleneck production lead time.
    bottleneckLeadTimeDays: inputs.bottleneckLeadTimeDays ?? null
  };
  const safety = osipSafety(osipInput, rules);
  const rops = osipRops(osipInput, safety, inputs.level, rules);

  // DRC-2 / DRC-4 — the live DA function, on the scenario's position.
  const soh = sohOf(inputs);
  const daHorizon = horizonWeeksOf(leadTimeWeeks ?? 0);
  /** @type {RollingDaFigure | null} */
  let da = null;
  if (leadTimeWeeks !== null && daHorizon > inputs.weeks.length) {
    flags.push('LEAD_TIME_BEYOND_HORIZON');
  } else {
    da = rollingDaFigure(
      {
        weeks: inputs.weeks,
        ltp,
        leadTimeWeeks,
        mpq: inputs.mpq,
        soh: inputs.stockOnRecord ? soh : null,
        ospoOpen: inputs.ospoStart,
        previous: inputs.previous
          ? { ospo: inputs.ospoStart, additionalPo: inputs.newPoPrev }
          : null,
        callOffPrev: inputs.callOffPrev,
        carries: inputs.carries,
        callOff: inputs.callOff,
        agreedFirstOutside: inputs.agreedFirstOutside,
        salesOrderQty4w: inputs.carryOverLimit,
        ospr: inputs.ospr,
        // BL-210 — the same consumption, MOQ, koli and SD as ROP Order's safety order.
        consumption: inputs.consumption,
        moq: inputs.moq,
        koli: inputs.koli,
        sd: inputs.sd ?? null
      },
      rules
    );
  }

  // DRC-13 — the trigger through the horizon, day by day (BR-04: "the check
  // runs on every SOH update"; ROP Fisik and f are in days, DRC-B4).
  const ropF = rops.ropFisik.value;
  const max = inputs.maxOverride ?? rops.max.value;
  const trigRules = {
    ...CALL_OFF_TRIGGER_RULES,
    plantComparison: switches.plantComparison,
    maxCap: switches.maxCap,
    quantityRule: switches.quantityRule,
    minimumDeliveryAboveMax: switches.minimumDeliveryAboveMax
  };
  const plantShare = PTI_PLANTS.map((p) =>
    soh > 0 ? (inputs.soh[p] ?? 0) / soh : p === 'J6' ? 1 : 0
  );
  const f = area !== null ? rules.replenishmentCycleDays[area] : null;
  if (ropF === null || max === null) flags.push('NO_TRIGGER');
  const days = WHAT_IF_RULES.daysPerWeek;
  const horizonDays = inputs.weeks.length * days;
  let balance = Math.max(0, da ? da.ospo : inputs.ospoStart);
  let level = soh;
  /** @type {{ armed: boolean } | undefined} */
  let prev;
  /** Quantities on their way, by the day they arrive. @type {Map<number, number>} */
  const pending = new Map([[0, inputs.callOff]]);
  const incoming = inputs.weeks.map(() => 0);
  const drafted = inputs.weeks.map(() => 0);
  const prQtys = inputs.weeks.map(() => 0);
  const shortage = inputs.weeks.map(() => false);
  for (let d = 0; d < horizonDays; d += 1) {
    const i = Math.floor(d / days);
    // A call-off arrives on its need date (`callOffArrival`).
    const arriving = pending.get(d) ?? 0;
    pending.delete(d);
    level += arriving;
    incoming[i] += arriving;
    if (ropF !== null && max !== null) {
      const openSupply = [...pending.values()].reduce((n, q) => n + q, 0);
      const check = sohCheck(
        PTI_PLANTS.map((plant, k) => ({
          materialCode: inputs.materialCode,
          plant,
          ptiSoh: level * plantShare[k]
        })),
        ropF,
        trigRules
      );
      /** @type {TriggerLine[]} */
      const lines =
        balance > 0
          ? [
              {
                poId: 'ospo',
                poNumber: 'OSPO',
                orderDate: inputs.planningWeek,
                lineId: '1',
                balance,
                supplierId: inputs.supplierId,
                mpq: inputs.mpq,
                f,
                // [Team F5] MDQ = MOQ; rounded the way max stock rounds.
                mdq: inputs.moq > 0 ? inputs.moq : null,
                roundTo: maxRoundingUnit({ area, koli: inputs.koli, moq: inputs.moq }, rules)
              }
            ]
          : [];
      const allocation = allocateCallOffs({ max, soh: level, openSupply, lines }, trigRules);
      const step = triggerStep(prev, {
        ropAvailable: true,
        atOrBelow: check.atOrBelow,
        // Reading (`callOffArrival`): the planner approves each draft the
        // trigger makes, so it is open supply until it arrives, never a draft
        // still waiting.
        pendingDraft: false,
        allocation
      });
      prev = { armed: step.armed };
      if (step.draft) {
        const qty = allocation.callOffs.reduce((n, c) => n + c.qty, 0);
        drafted[i] += qty;
        balance -= qty;
        const at = d + (f ?? 0);
        // Arriving today (f = 0) or later; what lands after the horizon is not shown.
        if (at === d) {
          level += qty;
          incoming[i] += qty;
        } else pending.set(at, (pending.get(at) ?? 0) + qty);
      }
      prQtys[i] += step.prQty;
    }
    level -= dailyShare(ltp[i], d % days);
    if (level < WHAT_IF_RULES.shortageBelow - 1e-9) shortage[i] = true;
  }
  // PPT 7 — the end-of-week SOH from the weekly sums, the module's own function.
  const projected = projectedSoh(soh, incoming, ltp);

  const daHorizonWeeks = da ? da.horizonWeeks : [];
  /** @type {WhatIfWeek[]} */
  const weeks = inputs.weeks.map((week, i) => {
    const at = daHorizonWeeks.indexOf(week);
    return {
      week,
      ltp: ltp[i],
      da: da && at >= 0 ? da.daInForce[at] : null,
      incoming: incoming[i],
      drafted: drafted[i],
      prQty: prQtys[i],
      soh: projected[i],
      shortage: shortage[i],
      aboveMax: max !== null && projected[i] > max
    };
  });
  return {
    leadTimeWeeks,
    safety,
    rops,
    da,
    max,
    maxSource: inputs.maxOverride !== null ? 'override' : 'system',
    soh,
    prNeed: da ? da.pr : null,
    prRecommendation: da ? da.prRecommendation : null,
    totalDa: da ? da.totalDa : null,
    totalDrafted: drafted.reduce((a, b) => a + b, 0),
    triggerPr: prQtys.reduce((a, b) => a + b, 0),
    callOffs: weeks.filter((w) => w.drafted > 0).map((w) => ({ week: w.week, qty: w.drafted })),
    weeks,
    firstShortageWeek: weeks.find((w) => w.shortage)?.week ?? null,
    weeksAboveMax: weeks.filter((w) => w.aboveMax).map((w) => w.week),
    flags
  };
}

// ─── Comparing (BR-03, BR-05) ───────────────────────────────────────────────

/**
 * The headline figures compared against the current plan, in display order.
 * @typedef {'ropOrder' | 'ropFisik' | 'max' | 'safetyOrder' | 'totalDa' | 'prNeed' | 'prRecommendation' | 'callOffs' | 'triggerPr' | 'remainder' | 'carried' | 'firstShortageWeek' | 'weeksAboveMax'} HeadlineKey
 */

/** @type {readonly HeadlineKey[]} */
export const HEADLINE_KEYS = Object.freeze(
  /** @type {HeadlineKey[]} */ ([
    'ropOrder',
    'ropFisik',
    'max',
    'safetyOrder',
    'totalDa',
    'prNeed',
    'prRecommendation',
    'callOffs',
    'triggerPr',
    'remainder',
    'carried',
    'firstShortageWeek',
    'weeksAboveMax'
  ])
);

/**
 * Design rule 5 — the [Default] question IDs each headline figure is built on,
 * for its "Provisional" label. `MPQ` names the wave 2 MPQ default.
 * @type {Readonly<Record<HeadlineKey, readonly string[]>>}
 */
export const HEADLINE_QUESTIONS = Object.freeze({
  ropOrder: OSIP_ROP_QUESTIONS.ropOrder,
  ropFisik: OSIP_ROP_QUESTIONS.ropFisik,
  max: OSIP_ROP_QUESTIONS.max,
  safetyOrder: OSIP_SAFETY_QUESTIONS.safetyOrder,
  totalDa: DA_PROVISIONAL_QUESTIONS,
  prNeed: Object.freeze([...OSIP_ROP_QUESTIONS.ropOrder, 'A9']),
  prRecommendation: Object.freeze([...DA_PROVISIONAL_QUESTIONS, 'B9']),
  callOffs: CALL_OFF_TRIGGER_QUESTIONS,
  triggerPr: CALL_OFF_TRIGGER_QUESTIONS,
  remainder: DA_PROVISIONAL_QUESTIONS,
  carried: Object.freeze(['A8b']),
  firstShortageWeek: CALL_OFF_TRIGGER_QUESTIONS,
  weeksAboveMax: Object.freeze([...CALL_OFF_TRIGGER_QUESTIONS])
});

/**
 * A headline figure of a run: a number, a week, or null when not available.
 * @param {WhatIfRun} run
 * @param {HeadlineKey} key
 * @returns {number | string | null}
 */
export function headline(run, key) {
  switch (key) {
    case 'ropOrder':
      return run.rops.ropOrder.value;
    case 'ropFisik':
      return run.rops.ropFisik.value;
    case 'max':
      return run.max;
    case 'safetyOrder':
      return run.safety.safetyOrder.value;
    case 'totalDa':
      return run.totalDa;
    case 'prNeed':
      return run.prNeed;
    case 'prRecommendation':
      return run.prRecommendation;
    case 'callOffs':
      return run.totalDrafted;
    case 'triggerPr':
      return run.triggerPr;
    case 'remainder':
      return run.da ? run.da.remainder : null;
    case 'carried':
      return run.da ? (run.da.carry?.qty ?? 0) : null;
    case 'firstShortageWeek':
      return run.firstShortageWeek;
    case 'weeksAboveMax':
      return run.weeksAboveMax.length;
  }
}

/**
 * One headline figure against the current plan.
 * `delta`:  scenario − plan for a number; null for a week or when either side is not available.
 * `changed`:  The two differ.
 * @typedef {{
 *   readonly key: HeadlineKey;
 *   readonly plan: number | string | null;
 *   readonly scenario: number | string | null;
 *   readonly delta: number | null;
 *   readonly changed: boolean;
 * }} HeadlineDiff
 */

/**
 * BR-03 — each headline figure of a scenario against the current plan.
 * @param {WhatIfRun} plan
 * @param {WhatIfRun} scenario
 * @returns {HeadlineDiff[]}
 */
export function compareRuns(plan, scenario) {
  return HEADLINE_KEYS.map((key) => {
    const a = headline(plan, key);
    const b = headline(scenario, key);
    return {
      key,
      plan: a,
      scenario: b,
      delta: typeof a === 'number' && typeof b === 'number' ? b - a : null,
      changed: a !== b
    };
  });
}

// ─── Saved scenarios (BR-05) ────────────────────────────────────────────────

/**
 * The headline figures as they stood when the scenario was saved, stamped with
 * the rules version (DRC-D16): a later rules change can say what moved.
 * @typedef {Readonly<Record<HeadlineKey, number | string | null>>} HeadlineFigures
 */

/**
 * @param {WhatIfRun} run
 * @returns {HeadlineFigures}
 */
export function headlinesOf(run) {
  return /** @type {HeadlineFigures} */ (
    Object.fromEntries(HEADLINE_KEYS.map((k) => [k, headline(run, k)]))
  );
}

/**
 * BR-05 — a scenario saved under `rulesVersion` was made under other rules than
 * the ones in force.
 * @param {{ readonly rulesVersion: string }} scenario
 * @param {string} [current]
 * @returns {boolean}
 */
export const rulesChangedSince = (scenario, current = RULES_VERSION) =>
  scenario.rulesVersion !== current;

/**
 * @param {unknown} v
 * @returns {v is number}
 */
const isQty = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/**
 * @param {unknown} v
 * @returns {boolean}
 */
const isQtyOrNull = (v) => v === null || isQty(v);

/**
 * @param {unknown} v
 * @returns {boolean}
 */
const isQtyList = (v) => Array.isArray(v) && v.every(isQty);

/**
 * The input check the save verb and the page share. Null when the inputs are
 * well formed; else the field that is not.
 * @param {unknown} raw
 * @returns {string | null}
 */
export function inputsProblem(raw) {
  if (raw === null || typeof raw !== 'object') return 'inputs';
  const i = /** @type {Record<string, unknown>} */ (raw);
  const weeks = i.weeks;
  if (!Array.isArray(weeks) || weeks.length === 0 || weeks.some((w) => typeof w !== 'string'))
    return 'weeks';
  if (!isQtyList(i.ltp) || /** @type {unknown[]} */ (i.ltp).length !== weeks.length) return 'ltp';
  if (!Array.isArray(i.festiveWeeks)) return 'festiveWeeks';
  if (typeof i.upliftPct !== 'number' || !Number.isFinite(i.upliftPct) || i.upliftPct < -100)
    return 'upliftPct';
  const lt = /** @type {Record<string, unknown> | null} */ (i.leadTime);
  if (lt !== null && (typeof lt !== 'object' || !isQty(lt.days) || !Array.isArray(lt.steps)))
    return 'leadTime';
  if (
    lt &&
    /** @type {unknown[]} */ (lt.steps).some(
      (s) => !isQty(/** @type {{ days?: unknown }} */ (s)?.days)
    )
  )
    return 'leadTime';
  if (!isQtyOrNull(i.f)) return 'f';
  if (!isQtyList(i.consumption)) return 'consumption';
  // BL-210 — absent in a scenario saved before the typed SD existed.
  if (i.sd !== undefined && !isQtyOrNull(i.sd)) return 'sd';
  // [Team B10] absent in a scenario saved before 2026-10-28.
  if (i.bottleneckLeadTimeDays !== undefined && !isQtyOrNull(i.bottleneckLeadTimeDays))
    return 'bottleneckLeadTimeDays';
  for (const k of ['mpq', 'moq', 'ospoStart', 'newPoPrev', 'callOffPrev', 'callOff'])
    if (!isQty(i[k])) return k;
  for (const k of ['koli', 'maxOverride', 'carryOverLimit', 'ospr', 'feedstock'])
    if (!isQtyOrNull(i[k])) return k;
  const soh = /** @type {Record<string, unknown> | null} */ (i.soh);
  if (!soh || typeof soh !== 'object' || PTI_PLANTS.some((p) => !isQty(soh[p]))) return 'soh';
  if (!OSIP_LEVELS.includes(/** @type {number} */ (i.level))) return 'level';
  const npd = /** @type {Record<string, unknown> | null} */ (i.npd);
  if (!npd || typeof npd !== 'object' || NPD_RULES.some((r) => typeof npd[r] !== 'boolean'))
    return 'npd';
  return null;
}

/**
 * BR-05 — why a save would be refused, or null when it may proceed. The page's
 * form calls the same rule.
 *   · NAME_REQUIRED / NAME_TOO_LONG — the scenario's name.
 *   · UNKNOWN_PAIR — the supplier × material is not one the sandbox offers.
 *   · INPUTS_INVALID:<field> — an input is not a number of 0 or more (or the wrong shape).
 *   · SWITCHES_INVALID:<path> — a switch holds a value its catalogue entry does not allow.
 * @param {Record<string, unknown>} payload
 * @param {{ readonly pairKnown: (supplierId: string, materialCode: string) => boolean }} ctx
 * @returns {string | null}
 */
export function scenarioRefusal(payload, ctx) {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (name === '') return 'NAME_REQUIRED';
  if (name.length > WHAT_IF_RULES.nameMaxLength) return 'NAME_TOO_LONG';
  const sid = typeof payload.supplierId === 'string' ? payload.supplierId : '';
  const code = typeof payload.materialCode === 'string' ? payload.materialCode : '';
  if (!ctx.pairKnown(sid, code)) return 'UNKNOWN_PAIR';
  const problem = inputsProblem(payload.inputs);
  if (problem !== null) return `INPUTS_INVALID:${problem}`;
  const inputs = /** @type {Record<string, unknown>} */ (payload.inputs);
  if (inputs.supplierId !== sid || inputs.materialCode !== code) return 'INPUTS_INVALID:pair';
  const sw = payload.switches;
  if (sw === null || typeof sw !== 'object') return 'SWITCHES_INVALID:switches';
  const merged = mergeSwitches(/** @type {Partial<WhatIfSwitches>} */ (sw));
  for (const spec of SWITCH_CATALOG)
    if (!validSwitch(spec, switchValue(merged, spec.path))) return `SWITCHES_INVALID:${spec.path}`;
  return null;
}

// ─── The PPT 7 preset (BR-08) ───────────────────────────────────────────────

/**
 * BR-08 — the PPT 7 golden case is offered beside the live pairs under this
 * supplier id, so its scenarios save, compare and recalculate like any other
 * (DRC-17: "record which result they confirm"). It names no real supplier.
 */
export const PPT7_SUPPLIER_ID = 'ppt7-golden';

/**
 * BR-08 — the switches the PPT 7 case opens on. The slide's figures come from
 * the earlier readings the owner kept as variants on 2026-10-28: the safety
 * order's SD over the lead-time weeks (`sdSource: 'ltp'`, B2; 13 weeks gives
 * SS 183,672) and the plan check against SOH + OSPO + OSPR + PR
 * (`planCheckBasis: 'sohOspoOsprPr'`, A2; PR −645,559 is that arithmetic).
 * The owner ruled PPT 7 stays on these readings [Owner, 2026-10-28, BL-231].
 * @type {WhatIfSwitches}
 */
export const PPT7_SWITCHES = Object.freeze({
  ...DEFAULT_SWITCHES,
  osip: Object.freeze({
    ...OSIP_RULES,
    sdSource: /** @type {const} */ ('ltp'),
    planCheckBasis: /** @type {const} */ ('sohOspoOsprPr')
  })
});

/**
 * The golden case PPT 7 as `__fixtures__/osipGolden.json` holds it.
 * @typedef {{
 *   readonly material: string;
 *   readonly ltp: readonly number[];
 *   readonly leadTimeWeeks: number;
 *   readonly mpq: number;
 *   readonly soh: number;
 *   readonly ospo: number;
 *   readonly ospr: number;
 * }} GoldenPpt7
 */

/**
 * BR-08 — the PPT 7 golden case (bottle 2000041501) as sandbox inputs, so the
 * material team sees ROP Order 761,888 and safety order 244,896 reproduce,
 * then flips switches. Packaging (a bottle), so the 24-week PM horizon; the
 * slide's 12 weeks of LTP, then 0. The slide's weeks are labels (W33…); the
 * run uses the hub's own Mondays from `weeks[0]`. The slide states no
 * consumption, supply area, MOQ or pallet size, so the figures that need them
 * (ROP Fisik, Max, the trigger) read "not available", as the live plan would.
 * SOH sits in plant J2, the packaging plant (DRC-B39).
 * @param {GoldenPpt7} golden
 * @param {readonly string[]} weeks  The hub's Mondays from the planning week, at least 24.
 * @returns {WhatIfInputs}
 */
export function ppt7Inputs(golden, weeks) {
  const n = horizonOf('PM');
  const horizon = weeks.slice(0, n);
  return {
    supplierId: PPT7_SUPPLIER_ID,
    materialCode: golden.material,
    materialClass: 'PM',
    planningWeek: horizon[0],
    weeks: horizon,
    ltp: horizon.map((_, i) => golden.ltp[i] ?? 0),
    festiveWeeks: [],
    upliftPct: 0,
    leadTime: { route: null, steps: [], days: golden.leadTimeWeeks * 7 },
    supplyArea: null,
    f: null,
    consumption: [],
    sd: null,
    mpq: golden.mpq,
    moq: 0,
    koli: null,
    maxOverride: null,
    soh: { J6: 0, J2: golden.soh },
    stockOnRecord: true,
    previous: false,
    ospoStart: golden.ospo,
    newPoPrev: 0,
    callOffPrev: 0,
    callOff: 0,
    carries: [],
    agreedFirstOutside: false,
    carryOverLimit: null,
    ospr: golden.ospr,
    feedstock: null,
    level: OSIP_RULES.defaultLevel,
    npd: { firstOrderFulfilled: false, oneYearAfterLaunch: false, '52WeeksHistory': false }
  };
}
