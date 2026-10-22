// ─────────────────────────────────────────────────────────────────────────────
// THE HUB'S RULE VALUES — ONE REGISTRY (BL-32, REQ-E08-05 BR-03, §3.6).
//
// Section 3.6 says ADM can change every threshold; until BL-32 each value was a
// module constant and a change needed a developer. This file is the ONE list
// of values the Hub administrator may change, with, for each:
//
//   · its DEFAULT — the value the owner decided on 2026-09-21, or the named
//     placeholder while a decision is open (BL-54, BL-55, BL-56). This is the
//     only place a default is written; "reset to default" writes it back
//     through the same verb as any other change;
//   · its UNIT and its bounds, and the ORDER RULES that tie values together
//     (a band that would come out empty or inverted is refused by name);
//   · the RULE it belongs to (`CR-nn`) and the page section it is shown in.
//
// ⚠️ **PURE. NO STORE, NO CLOCK, NO IMPORTS FROM THE CONFIG MODULES.** The
// config modules read the value in force from `hubSettingsStore.js`, which
// reads this registry; an import back from a config module would be a cycle
// and, worse, a second place a default could be written.
//
// ⚠️ **THE POPULATION IS DERIVED, NOT LISTED FROM MEMORY.** Every value below
// was a constant exported by a config module (`callOffTolerance.js`,
// `fulfilmentConfig.js`, `forecastConfig.js`, `inventoryConfig.js`,
// `complianceGateConfig.js`). `hubSettings.bl32.test.js` scans those modules,
// asserts every former constant is gone, and pins the readers of each value.
// What stayed a constant, and why, is written beside it in its module.
// ─────────────────────────────────────────────────────────────────────────────

/** The admin page a value is changed on. */
/** @typedef {'tolerances' | 'alerts'} HubSettingSection */

/** How a value is read and shown. */
/**
 * a percentage, 0–100 unless the key says otherwise
 * calendar days
 * working days on the hub calendar
 * whole rupiah
 * × a lead time
 * whole weeks
 * whole calendar months
 * whole hours
 * a day of the week, 1 to 7, Monday = 1 (ISO 8601)
 * a time of day in WIB, as minutes after midnight, 0 to 1439
 * a share written as a fraction, 0 to 1
 *
 * @typedef {| 'pct'
 *   | 'days'
 *   | 'workingDays'
 *   | 'idr'
 *   | 'multiple'
 *   | 'weeks'
 *   | 'months'
 *   | 'hours'
 *   | 'weekday'
 *   | 'time'
 *   | 'weight'
 *   | 'boolean'} HubSettingUnit
 */

/** Who decides a value that is still a placeholder (the owner i18n key suffix). */
/** @typedef {'finance' | 'procurement' | 'warehousePlanner' | 'materialPlanner'} PlaceholderOwner */

/**
 * `rule`:  The requirement rule the value belongs to.
 * `integer`:  A whole number only.
 * `above`:  A strict lower bound (the value must be ABOVE it).
 * `placeholder`:  Set while the owner has not decided: the page says so, with the backlog id.
 *
 * @typedef {{
 *   readonly key: string;
 *   readonly section: HubSettingSection;
 *   readonly rule: string;
 *   readonly unit: HubSettingUnit;
 *   readonly integer?: boolean;
 *   readonly min?: number;
 *   readonly max?: number;
 *   readonly above?: number;
 *   readonly defaultValue: number | boolean;
 *   readonly placeholder?: { readonly owner: PlaceholderOwner; readonly backlogId: string };
 * }} HubSettingDef
 */

// ── The values ────────────────────────────────────────────────────────────────

const DEFS = /** @satisfies {readonly HubSettingDef[]} */ (
  /** @type {const} */ ([
    // CR-05 — call-off quantity and date tolerance (REQ-E09-03, BL-47).
    {
      key: 'callOff.overPct',
      section: 'tolerances',
      rule: 'CR-05',
      unit: 'pct',
      min: 0,
      max: 100,
      defaultValue: 5
    },
    {
      key: 'callOff.earlyAllowanceDays',
      section: 'tolerances',
      rule: 'CR-05',
      unit: 'days',
      integer: true,
      min: 0,
      max: 60,
      defaultValue: 0,
      placeholder: { owner: 'warehousePlanner', backlogId: 'BL-56' }
    },
    // REQ-E09-03 BR-05 — the supplier confirms a released call-off within 1 working day.
    {
      key: 'callOff.confirmWorkingDays',
      section: 'tolerances',
      rule: 'REQ-E09-03',
      unit: 'workingDays',
      integer: true,
      min: 1,
      max: 20,
      defaultValue: 1
    },
    // CR-12 — invoice price match (REQ-E07-07, BL-44).
    {
      key: 'invoice.contractPricePct',
      section: 'tolerances',
      rule: 'CR-12',
      unit: 'pct',
      min: 0,
      max: 100,
      defaultValue: 0
    },
    {
      key: 'invoice.standardPct',
      section: 'tolerances',
      rule: 'CR-12',
      unit: 'pct',
      min: 0,
      max: 100,
      defaultValue: 2
    },
    {
      key: 'invoice.standardCapIdr',
      section: 'tolerances',
      rule: 'CR-12',
      unit: 'idr',
      integer: true,
      min: 0,
      max: 1_000_000_000_000,
      defaultValue: 500_000,
      placeholder: { owner: 'finance', backlogId: 'BL-54' }
    },
    // CR-25 — goods receipt quantity tolerance (REQ-E07-06, BL-45). The default
    // for every material; per-material values stay in `fulfilmentConfig.js`.
    {
      key: 'receipt.overPct',
      section: 'tolerances',
      rule: 'CR-25',
      unit: 'pct',
      min: 0,
      max: 100,
      defaultValue: 0
    },
    {
      key: 'receipt.shortPct',
      section: 'tolerances',
      rule: 'CR-25',
      unit: 'pct',
      min: 0,
      max: 100,
      defaultValue: 2
    },
    // CR-21 — forecast commitment tolerance: the share below forecast accepted
    // without the planner, per zone.
    {
      key: 'commitment.firmShortfallPct',
      section: 'tolerances',
      rule: 'CR-21',
      unit: 'pct',
      min: 0,
      max: 100,
      defaultValue: 0
    },
    {
      key: 'commitment.tradeOffShortfallPct',
      section: 'tolerances',
      rule: 'CR-21',
      unit: 'pct',
      min: 0,
      max: 100,
      defaultValue: 10
    },
    // CR-26 — forecast commitment deadlines, in working days after publication.
    {
      key: 'commitment.firmDeadlineWorkingDays',
      section: 'tolerances',
      rule: 'CR-26',
      unit: 'workingDays',
      integer: true,
      min: 1,
      max: 20,
      defaultValue: 1
    },
    {
      key: 'commitment.otherDeadlineWorkingDays',
      section: 'tolerances',
      rule: 'CR-26',
      unit: 'workingDays',
      integer: true,
      min: 1,
      max: 20,
      defaultValue: 3
    },
    // CR-22 — commitment ÷ forecast gap colours, as a percentage of forecast.
    {
      key: 'gap.greenFromPct',
      section: 'tolerances',
      rule: 'CR-22',
      unit: 'pct',
      min: 1,
      max: 200,
      defaultValue: 100
    },
    {
      key: 'gap.amberFromPct',
      section: 'tolerances',
      rule: 'CR-22',
      unit: 'pct',
      min: 0,
      max: 200,
      defaultValue: 80
    },
    // CR-23 — the compliance gate's open values (A-05).
    {
      key: 'gate.minOtifPct',
      section: 'tolerances',
      rule: 'CR-23',
      unit: 'pct',
      min: 0,
      max: 100,
      defaultValue: 80,
      placeholder: { owner: 'procurement', backlogId: 'BL-55' }
    },
    {
      key: 'gate.noHistoryPasses',
      section: 'tolerances',
      rule: 'CR-23',
      unit: 'boolean',
      defaultValue: true,
      placeholder: { owner: 'procurement', backlogId: 'BL-55' }
    },

    // CR-24 — risk class against the supplier lead time (REQ-E08-05 BR-02).
    {
      key: 'risk.mediumBelowMultiple',
      section: 'alerts',
      rule: 'CR-24',
      unit: 'multiple',
      above: 1,
      max: 10,
      defaultValue: 1.5
    },
    // CR-02 — day bands, the fallback where no lead time is on record.
    {
      key: 'bands.criticalBelowDays',
      section: 'alerts',
      rule: 'CR-02',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 14
    },
    {
      key: 'bands.warningBelowDays',
      section: 'alerts',
      rule: 'CR-02',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 30
    },
    {
      key: 'bands.healthyUpToDays',
      section: 'alerts',
      rule: 'CR-02',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 60
    },
    // CR-03 — supplier coverage, as a percentage of firm demand.
    {
      key: 'coverage.coveredFromPct',
      section: 'alerts',
      rule: 'CR-03',
      unit: 'pct',
      min: 1,
      max: 500,
      defaultValue: 100
    },
    {
      key: 'coverage.atRiskFromPct',
      section: 'alerts',
      rule: 'CR-03',
      unit: 'pct',
      min: 0,
      max: 500,
      defaultValue: 80
    },
    // REQ-E08-01 — the stale period: a supplier figure older than this is stale.
    {
      key: 'stale.defaultDays',
      section: 'alerts',
      rule: 'REQ-E08-01',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 7
    },

    // ENG-D5 — the forecast engine's fill-rate targets per service tier
    // (REQ-E14-04 BR-02): 95% high-volume, 90% other, 85% slow movers.
    {
      key: 'engine.fillRateHighPct',
      section: 'tolerances',
      rule: 'ENG-D5',
      unit: 'pct',
      min: 50,
      max: 99.9,
      defaultValue: 95
    },
    {
      key: 'engine.fillRateStandardPct',
      section: 'tolerances',
      rule: 'ENG-D5',
      unit: 'pct',
      min: 50,
      max: 99.9,
      defaultValue: 90
    },
    {
      key: 'engine.fillRateSlowPct',
      section: 'tolerances',
      rule: 'ENG-D5',
      unit: 'pct',
      min: 50,
      max: 99.9,
      defaultValue: 85
    },
    // REQ-E14-04 BR-03 — the delay percentile the safety lead time covers.
    {
      key: 'engine.safetyLeadTimePercentile',
      section: 'tolerances',
      rule: 'REQ-E14-04',
      unit: 'pct',
      integer: true,
      min: 50,
      max: 100,
      defaultValue: 80
    },
    // ENG-D6 — the order-sizing cost rates (REQ-E14-05 BR-01). Finance and the
    // 3PL invoices will supply them; until then each is a PLACEHOLDER, named as
    // one wherever it is shown. The defaults are orders of magnitude only.
    {
      key: 'engine.holdingCostPctPerYear',
      section: 'tolerances',
      rule: 'ENG-D6',
      unit: 'pct',
      min: 0,
      max: 100,
      defaultValue: 25,
      placeholder: { owner: 'finance', backlogId: 'ENG-D6' }
    },
    {
      key: 'engine.orderCostIdr',
      section: 'tolerances',
      rule: 'ENG-D6',
      unit: 'idr',
      integer: true,
      min: 0,
      max: 1_000_000_000,
      defaultValue: 750_000,
      placeholder: { owner: 'finance', backlogId: 'ENG-D6' }
    },
    {
      key: 'engine.rentedSpaceIdrPerPalletWeek',
      section: 'tolerances',
      rule: 'ENG-D6',
      unit: 'idr',
      integer: true,
      min: 0,
      max: 100_000_000,
      defaultValue: 35_000,
      placeholder: { owner: 'finance', backlogId: 'ENG-D6' }
    },
    // REQ-E14-05 BR-03 — the change penalty inside the supplier lead time, per
    // pallet by which an already-planned order changes. A policy weight, not a
    // cost Finance reports, so the Material Planner sets it.
    {
      key: 'engine.changePenaltyIdrPerPallet',
      section: 'tolerances',
      rule: 'REQ-E14-05',
      unit: 'idr',
      integer: true,
      min: 0,
      max: 100_000_000,
      defaultValue: 150_000,
      placeholder: { owner: 'materialPlanner', backlogId: 'REQ-E14-05 BR-03' }
    },
    // ENG-D15 (decided by the owner 2026-09-24) — REQ-E14-13 BR-03: how many
    // weeks before its need week an open line must arrive before a reschedule-out
    // is proposed. 1 week to start; the Material Planner's value, beside the
    // E14-05 cost rates it is weighed with.
    // REQ-E14-05 edge case (BL-117) — the most rented space order sizing may
    // plan, as a share of owned capacity, beside the rented-space rate it caps.
    // A week that does not fit even with it is shown with its shortfall and the
    // planner's choice (rent beyond it, or a later delivery). 25% is a
    // PLACEHOLDER — what the 3PL contract allows is the Warehouse's to confirm.
    {
      key: 'engine.maxRentedSpacePct',
      section: 'tolerances',
      rule: 'REQ-E14-05',
      unit: 'pct',
      min: 0,
      max: 500,
      defaultValue: 25,
      placeholder: { owner: 'warehousePlanner', backlogId: 'REQ-E14-05' }
    },
    // DORMANT since DRC-15a: the daily feedstock reconcile reads no cycle; kept
    // until the owner rules on removing it (BL-201).
    // REQ-E06-04 BR-01 (owner, 2026-09-29) — the fixed stock reconcile cycle for
    // packaging, in weeks. 3 by default ("FS Reconcile end W3", ENG-D21); the
    // Monday it is counted from stays fixed (FS_RECONCILE_CYCLE_ANCHOR).
    {
      key: 'forecast.fsReconcileCycleWeeks',
      section: 'tolerances',
      rule: 'REQ-E06-04',
      unit: 'weeks',
      integer: true,
      min: 1,
      max: 13,
      defaultValue: 3
    },
    {
      key: 'engine.rescheduleOutWeeks',
      section: 'tolerances',
      rule: 'ENG-D15',
      unit: 'weeks',
      integer: true,
      min: 1,
      max: 26,
      defaultValue: 1
    },
    // ENG-D9 (decided by the owner 2026-09-23) — REQ-E14-06 BR-04: the weight on
    // the previously published value when a Trade-off period is damped before
    // publication. 50% to start, tuned from the backtest (E14-10). Below 100%:
    // at 100% a Trade-off period could never move. The Forecast zone's weight
    // stays 0 (ENG-D9, ENG-B34).
    {
      key: 'engine.dampingWeightPct',
      section: 'tolerances',
      rule: 'ENG-D9',
      unit: 'pct',
      min: 0,
      max: 90,
      defaultValue: 50
    },
    // ENG-D13 (OPEN — set after the first backtest) — REQ-E14-10 BR-03: the
    // largest plan instability (MASC, as a percentage of the SKU's seasonal-naive
    // error) a model may have and still be chosen. 0 = NOT SET: no limit is
    // enforced until the Material Planner sets one from the spread the Model
    // backtest page shows (ENG-B87). A limit of 0 would forbid every change, so 0
    // cannot be a real value.
    {
      key: 'engine.backtestMascLimitPct',
      section: 'tolerances',
      rule: 'ENG-D13',
      unit: 'pct',
      min: 0,
      max: 1000,
      defaultValue: 0,
      placeholder: { owner: 'materialPlanner', backlogId: 'ENG-D13' }
    },
    // REQ-E14-09 BR-01 (BL-111) — a quantile the administrator adds to the demand
    // range beside P50 and P90 (for example 95 for P95, which METHOD-SPEC D5 lists).
    // 0 = none; 50 and 90 are always produced (ENG-B98).
    {
      key: 'engine.rangeExtraQuantilePct',
      section: 'tolerances',
      rule: 'REQ-E14-09',
      unit: 'pct',
      integer: true,
      min: 0,
      max: 99,
      defaultValue: 0
    },
    // REQ-E14-01 BR-01, BR-05 — the freshness limit per engine feed, in days:
    // a feed whose last arrival is older than this is stale on the Data health
    // page and names the engine steps it affects. The defaults are the feed
    // spec's limits (FORECAST-ENGINE-FEED-SPEC.md §2); where the spec states a
    // refresh but no limit (FgPlanSnapshot, SalesOrderWeek, SapSafetyStock,
    // MaterialValue) the limit is the refresh period (ENG-B42). One key per feed
    // that has a limit; the Hub's own records and "on change" feeds have none.
    {
      key: 'engine.freshnessDays.poLines',
      section: 'tolerances',
      rule: 'REQ-E14-01',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 1
    },
    {
      key: 'engine.freshnessDays.scheduleChanges',
      section: 'tolerances',
      rule: 'REQ-E14-01',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 1
    },
    {
      key: 'engine.freshnessDays.receipts',
      section: 'tolerances',
      rule: 'REQ-E14-01',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 1
    },
    {
      key: 'engine.freshnessDays.sources',
      section: 'tolerances',
      rule: 'REQ-E14-01',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 7
    },
    {
      key: 'engine.freshnessDays.bom',
      section: 'tolerances',
      rule: 'REQ-E14-01',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 7
    },
    {
      key: 'engine.freshnessDays.stock',
      section: 'tolerances',
      rule: 'REQ-E14-01',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 1
    },
    {
      key: 'engine.freshnessDays.materialValues',
      section: 'tolerances',
      rule: 'REQ-E14-01',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 31
    },
    {
      key: 'engine.freshnessDays.finishedGoods',
      section: 'tolerances',
      rule: 'REQ-E14-01',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 7
    },
    {
      key: 'engine.freshnessDays.sales',
      section: 'tolerances',
      rule: 'REQ-E14-01',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 7
    },
    {
      key: 'engine.freshnessDays.fgPlan',
      section: 'tolerances',
      rule: 'REQ-E14-01',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 7
    },
    {
      key: 'engine.freshnessDays.salesOrders',
      section: 'tolerances',
      rule: 'REQ-E14-01',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 1
    },
    {
      key: 'engine.freshnessDays.sapSafetyStock',
      section: 'tolerances',
      rule: 'REQ-E14-01',
      unit: 'days',
      integer: true,
      min: 1,
      max: 365,
      defaultValue: 7
    },

    // ── SC Hub Material (MAT A3, AR-08). Set here so the later tasks only read.
    // MR-1 BR-01 — how often a system-connected supplier's stock is pulled.
    {
      key: 'stockSync.intervalHours',
      section: 'alerts',
      rule: 'MR-1',
      unit: 'hours',
      integer: true,
      min: 1,
      max: 24,
      defaultValue: 2
    },
    // MR-1 BR-05 (MAT-D8) — an API supplier is stale when its last good pull is older than this.
    {
      key: 'stale.apiHours',
      section: 'alerts',
      rule: 'MR-1',
      unit: 'hours',
      integer: true,
      min: 1,
      max: 168,
      defaultValue: 24
    },
    // MR-1 BR-03 (MAT-D7) — the weekly update cutoff for a manual supplier:
    // Thursday 23:59 WIB. The day is ISO (Monday = 1); the time is minutes after midnight.
    {
      key: 'stockUpdate.cutoffDay',
      section: 'alerts',
      rule: 'MR-1',
      unit: 'weekday',
      integer: true,
      min: 1,
      max: 7,
      defaultValue: 4
    },
    {
      key: 'stockUpdate.cutoffTime',
      section: 'alerts',
      rule: 'MR-1',
      unit: 'time',
      integer: true,
      min: 0,
      max: 1439,
      defaultValue: 1439
    },
    // MR-2 BR-04 — update compliance below warn is amber, below flag is red.
    {
      key: 'compliance.warnPct',
      section: 'tolerances',
      rule: 'MR-2',
      unit: 'pct',
      min: 0,
      max: 100,
      defaultValue: 80
    },
    {
      key: 'compliance.flagPct',
      section: 'tolerances',
      rule: 'MR-2',
      unit: 'pct',
      min: 0,
      max: 100,
      defaultValue: 60
    },
    // MR-2 BR-05 (MAT-D9) — the weight of update compliance in the performance score.
    {
      key: 'compliance.scoreWeight',
      section: 'tolerances',
      rule: 'MR-2',
      unit: 'weight',
      min: 0,
      max: 0.5,
      defaultValue: 0.1
    },
    // MR-6 BR-06 — the minimum remaining shelf life where the material master has none.
    {
      key: 'shelfLife.defaultMonths',
      section: 'tolerances',
      rule: 'MR-6',
      unit: 'months',
      integer: true,
      min: 0,
      max: 60,
      defaultValue: 6
    }
  ])
);

/** A fixed setting key. Stale-period overrides are keyed separately (below). */
/** @typedef {(typeof DEFS)[number]['key']} HubSettingKey */

/** The numeric keys — every key except the one boolean. */
/** @typedef {Exclude<HubSettingKey, 'gate.noHistoryPasses'>} NumericSettingKey */

/** @type {readonly HubSettingDef[]} */
export const HUB_SETTINGS = Object.freeze(DEFS.map((d) => Object.freeze({ ...d })));

const BY_KEY = /** @type {Map<string, HubSettingDef>} */ (
  new Map(HUB_SETTINGS.map((d) => [d.key, d]))
);

/**
 * @param {string} key
 * @returns {HubSettingDef | undefined}
 */
export const hubSettingDef = (key) => BY_KEY.get(key);

/**
 * @param {unknown} key
 * @returns {key is HubSettingKey}
 */
export const isHubSettingKey = (key) => typeof key === 'string' && BY_KEY.has(key);

// ── Stale-period overrides per supplier × material (REQ-E08-01 edge case) ────

/**
 * An override of the stale period for one supplier × material: the data-update
 * SLA "varies by material and supplier, because each moves differently".
 * Keyed `stale.override:<supplierId>|<materialCode>`; its value is whole days,
 * or `null` for "no override — the default stale period applies".
 */
export const STALE_OVERRIDE_PREFIX = 'stale.override:';
const STALE_OVERRIDE_KEY = /^stale\.override:(sup-[a-z0-9-]+)\|([A-Z0-9][A-Z0-9-]*)$/;

/**
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {string}
 */
export const staleOverrideKey = (supplierId, materialCode) =>
  `${STALE_OVERRIDE_PREFIX}${supplierId}|${materialCode}`;

/**
 * The supplier and material an override key names, or null when it is not one.
 * @param {unknown} key
 * @returns {{ supplierId: string; materialCode: string } | null}
 */
export function parseStaleOverrideKey(key) {
  if (typeof key !== 'string') return null;
  const m = STALE_OVERRIDE_KEY.exec(key);
  return m ? { supplierId: m[1], materialCode: m[2] } : null;
}

/** Bounds of an override: the same as the default stale period. */
export const STALE_OVERRIDE_BOUNDS = Object.freeze({ min: 1, max: 365 });

/**
 * THE SHIPPED OVERRIDES — sample master data (was `UPDATE_SLA_OVERRIDES` in
 * `inventoryConfig.js`). API-connected suppliers sync daily, so their stale
 * period is 1 day; sup-007's PET bottles are reviewed every 3 days. Resetting
 * one of these writes it back; resetting any other override removes it.
 * @type {Readonly<Record<string, number>>}
 */
export const SEEDED_STALE_OVERRIDES = Object.freeze({
  [staleOverrideKey('sup-001', 'RM-COCO-8200')]: 1,
  [staleOverrideKey('sup-001', 'RM-LAURIC-7200')]: 1,
  [staleOverrideKey('sup-003', 'FR-WARD-4410')]: 1,
  [staleOverrideKey('sup-003', 'FR-EMIN-4420')]: 1,
  [staleOverrideKey('sup-007', 'PK-PETB-8801')]: 3,
  [staleOverrideKey('sup-007', 'PK-PETB-8802')]: 3
});

// ── Times of day (unit `time`) ───────────────────────────────────────────────

/**
 * Minutes after midnight as `HH:MM` (1439 → `23:59`).
 * @param {number} minutes
 * @returns {string}
 */
export function formatMinutesOfDay(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * `HH:MM` (or `H:MM`) as minutes after midnight, or null when it is not a time of day.
 * @param {string} text
 * @returns {number | null}
 */
export function parseTimeOfDay(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59 ? h * 60 + min : null;
}

// ── Values ────────────────────────────────────────────────────────────────────

/** A stored value: a number, a yes/no, or (overrides only) "no override". */
/** @typedef {number | boolean | null} HubSettingValue */

/**
 * Any key the verb can address: a fixed key or a well-formed override key.
 * @param {unknown} key
 * @returns {key is string}
 */
export const isAddressableSettingKey = (key) =>
  isHubSettingKey(key) || parseStaleOverrideKey(key) !== null;

/**
 * Which page section a key's changes are shown in.
 * @param {string} key
 * @returns {HubSettingSection | null}
 */
export function sectionOfKey(key) {
  if (parseStaleOverrideKey(key)) return 'alerts';
  return hubSettingDef(key)?.section ?? null;
}

/**
 * The default of any addressable key (an override with no seed: `null`).
 * @param {string} key
 * @returns {HubSettingValue | undefined}
 */
export function defaultOfKey(key) {
  const def = hubSettingDef(key);
  if (def) return def.defaultValue;
  if (parseStaleOverrideKey(key)) return SEEDED_STALE_OVERRIDES[key] ?? null;
  return undefined;
}

/** The value of every fixed key, and the override map, as one state. */
/**
 * @typedef {{
 *   readonly values: Readonly<Record<string, number | boolean>>;
 *   readonly staleOverrides: Readonly<Record<string, number>>;
 * }} HubSettingState
 */

/** @type {HubSettingState} */
export const DEFAULT_SETTING_STATE = Object.freeze({
  values: Object.freeze(Object.fromEntries(HUB_SETTINGS.map((d) => [d.key, d.defaultValue]))),
  staleOverrides: SEEDED_STALE_OVERRIDES
});

/**
 * The state with one key changed. Assumes the change was checked.
 * @param {HubSettingState} state
 * @param {string} key
 * @param {HubSettingValue} value
 * @returns {HubSettingState}
 */
export function withSetting(state, key, value) {
  if (parseStaleOverrideKey(key)) {
    const staleOverrides = { ...state.staleOverrides };
    if (value === null) delete staleOverrides[key];
    else staleOverrides[key] = /** @type {number} */ (value);
    return { values: state.values, staleOverrides };
  }
  return {
    values: { ...state.values, [key]: /** @type {number | boolean} */ (value) },
    staleOverrides: state.staleOverrides
  };
}

/**
 * The value a key has in a state (an override with none: `null`).
 * @param {HubSettingState} state
 * @param {string} key
 * @returns {HubSettingValue | undefined}
 */
export function valueIn(state, key) {
  if (parseStaleOverrideKey(key)) return state.staleOverrides[key] ?? null;
  return state.values[key];
}

// ── The rule a change must pass — the verb's policy AND the store's re-read ──

/**
 * @param {HubSettingState} state
 * @param {HubSettingKey} key
 * @returns {number}
 */
const num = (state, key) => /** @type {number} */ (state.values[key]);

/**
 * THE ORDER RULES. Each names the keys it ties together and the sentence a
 * refusal says. Checked on the state AFTER the change, so a change that would
 * leave a band empty or inverted is refused whichever end it moves.
 * @type {readonly { readonly keys: readonly HubSettingKey[]; readonly holds: (s: HubSettingState) => boolean; readonly says: (s: HubSettingState) => string; }[]}
 */
const ORDER_RULES = [
  {
    keys: ['invoice.contractPricePct', 'invoice.standardPct'],
    holds: (s) => num(s, 'invoice.contractPricePct') <= num(s, 'invoice.standardPct'),
    says: (s) =>
      `a contract-price line may not be allowed more than a line without one (contract ${num(s, 'invoice.contractPricePct')}% > other lines ${num(s, 'invoice.standardPct')}%)`
  },
  {
    keys: ['commitment.firmShortfallPct', 'commitment.tradeOffShortfallPct'],
    holds: (s) =>
      num(s, 'commitment.firmShortfallPct') <= num(s, 'commitment.tradeOffShortfallPct'),
    says: (s) =>
      `Firm periods may not accept a larger shortfall than Trade-off periods (Firm ${num(s, 'commitment.firmShortfallPct')}% > Trade-off ${num(s, 'commitment.tradeOffShortfallPct')}%)`
  },
  {
    keys: ['commitment.firmDeadlineWorkingDays', 'commitment.otherDeadlineWorkingDays'],
    holds: (s) =>
      num(s, 'commitment.firmDeadlineWorkingDays') <= num(s, 'commitment.otherDeadlineWorkingDays'),
    says: (s) =>
      `the Firm deadline may not be later than the Trade-off and Forecast deadline (${num(s, 'commitment.firmDeadlineWorkingDays')} > ${num(s, 'commitment.otherDeadlineWorkingDays')} working days)`
  },
  {
    keys: ['gap.amberFromPct', 'gap.greenFromPct'],
    holds: (s) => num(s, 'gap.amberFromPct') < num(s, 'gap.greenFromPct'),
    says: (s) =>
      `amber must start below green (amber from ${num(s, 'gap.amberFromPct')}%, green from ${num(s, 'gap.greenFromPct')}%)`
  },
  {
    keys: ['bands.criticalBelowDays', 'bands.warningBelowDays'],
    holds: (s) => num(s, 'bands.criticalBelowDays') < num(s, 'bands.warningBelowDays'),
    says: (s) =>
      `bands out of order: Critical must end below where Warning ends (Critical below ${num(s, 'bands.criticalBelowDays')}, Warning below ${num(s, 'bands.warningBelowDays')} days)`
  },
  {
    keys: ['bands.warningBelowDays', 'bands.healthyUpToDays'],
    holds: (s) => num(s, 'bands.warningBelowDays') <= num(s, 'bands.healthyUpToDays'),
    says: (s) =>
      `bands out of order: Healthy would be empty (Warning below ${num(s, 'bands.warningBelowDays')}, Healthy up to ${num(s, 'bands.healthyUpToDays')} days)`
  },
  {
    keys: ['engine.fillRateSlowPct', 'engine.fillRateStandardPct'],
    holds: (s) => num(s, 'engine.fillRateSlowPct') <= num(s, 'engine.fillRateStandardPct'),
    says: (s) =>
      `slow movers may not be held to a higher fill rate than other materials (slow ${num(s, 'engine.fillRateSlowPct')}% > other ${num(s, 'engine.fillRateStandardPct')}%)`
  },
  {
    keys: ['engine.fillRateStandardPct', 'engine.fillRateHighPct'],
    holds: (s) => num(s, 'engine.fillRateStandardPct') <= num(s, 'engine.fillRateHighPct'),
    says: (s) =>
      `other materials may not be held to a higher fill rate than high-volume ones (other ${num(s, 'engine.fillRateStandardPct')}% > high-volume ${num(s, 'engine.fillRateHighPct')}%)`
  },
  {
    keys: ['compliance.flagPct', 'compliance.warnPct'],
    holds: (s) => num(s, 'compliance.flagPct') < num(s, 'compliance.warnPct'),
    says: (s) =>
      `the red flag must start below the amber warning (flag below ${num(s, 'compliance.flagPct')}%, warning below ${num(s, 'compliance.warnPct')}%)`
  },
  {
    keys: ['coverage.atRiskFromPct', 'coverage.coveredFromPct'],
    holds: (s) => num(s, 'coverage.atRiskFromPct') < num(s, 'coverage.coveredFromPct'),
    says: (s) =>
      `At risk must start below Covered (At risk from ${num(s, 'coverage.atRiskFromPct')}%, Covered from ${num(s, 'coverage.coveredFromPct')}%)`
  }
];

/**
 * Why a number is outside a definition's bounds, or null.
 * @param {string} label
 * @param {number} value
 * @param {Pick<HubSettingDef, 'integer' | 'min' | 'max' | 'above'>} def
 * @returns {string | null}
 */
function boundsRefusal(label, value, def) {
  if (def.integer && !Number.isInteger(value))
    return `${label} must be a whole number, got ${value}`;
  if (def.min !== undefined && value < def.min) {
    return def.min === 0
      ? `${label} cannot be negative, got ${value}`
      : `${label} must be at least ${def.min}, got ${value}`;
  }
  if (def.above !== undefined && value <= def.above)
    return `${label} must be more than ${def.above}, got ${value}`;
  if (def.max !== undefined && value > def.max)
    return `${label} must be at most ${def.max}, got ${value}`;
  return null;
}

/**
 * Why setting `key` to `value` in `state` is refused, or null when it is
 * acceptable. Every refusal names the key and what was wrong with the value.
 * The ONE predicate: the `t_setting_set` policy calls it, and the store calls
 * it again on every change it reads back from this browser.
 * @param {unknown} key
 * @param {unknown} value
 * @param {HubSettingState} state
 * @returns {string | null}
 */
export function settingRefusal(key, value, state) {
  if (!isAddressableSettingKey(key))
    return `'${String(key)}' is not a setting the administrator can change`;
  const override = parseStaleOverrideKey(key);
  if (override) {
    if (value === null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return `${key} must be a number of days or null (no override), got ${JSON.stringify(value)}`;
    }
    return boundsRefusal(key, value, { integer: true, ...STALE_OVERRIDE_BOUNDS });
  }
  const def = /** @type {NonNullable<ReturnType<typeof hubSettingDef>>} */ (hubSettingDef(key));
  if (def.unit === 'boolean') {
    return typeof value === 'boolean'
      ? null
      : `${key} must be true or false, got ${JSON.stringify(value)}`;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return `${key} must be a number, got ${JSON.stringify(value)}`;
  }
  const bounds = boundsRefusal(key, value, def);
  if (bounds) return bounds;
  const next = withSetting(state, key, value);
  for (const rule of ORDER_RULES) {
    if (/** @type {readonly string[]} */ (rule.keys).includes(key) && !rule.holds(next))
      return `${key}: ${rule.says(next)}`;
  }
  return null;
}
