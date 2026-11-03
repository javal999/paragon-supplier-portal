// ────────────────────────────────────────────────────────────────────────────
// BL-32 · THE HUB'S RULE VALUES — changed by the administrator, read by every
// rule at the moment it runs. Through the REAL dispatcher and the REAL store.
//
// Proved here, by named case:
//   1. THE POPULATION IS DERIVED from the config modules, with a known-true and
//      a known-false member, and every constant a rule used to read is GONE
//      from shipped code (a stale module constant cannot survive by accident).
//   2. THE READERS ARE DERIVED from source per accessor, pinned by name, with
//      controls — so a new reader is a visible change, and none is missed.
//   3. EVERY VALUE IN THE REGISTRY FLIPS A RULE OUTCOME when the verb changes
//      it, and flips it back when the verb resets it to the default. The table
//      is pinned EQUAL to the registry, so a new value without a flip is red.
//   4. The verb is governed: `setting:set` held by compliance and admin, and
//      refused to the lanes the values judge; suppliers refused at scope; every
//      change in the audit trail; `previous` and `setAt` minted by the store.
//   5. Nonsense is refused BY NAME, and a known-good change of the same key
//      passes (the guard probed both ways).
//   6. Stored changes survive a reload and are RE-CHECKED on read, in order.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { MockCommandService, commandAuditSink } from './MockCommandService';
/** @import { CallOff, InventoryPosition, QueryScope } from '../types' */
import { DataError } from '../types';
import { allPositions } from './inventoryReadModel';
import { PERSONA_SYSTEM_ROLES, SYSTEM_ROLES, rolesHolding } from '../../transitions/businessRoles';
import {
  HUB_SETTINGS,
  SEEDED_STALE_OVERRIDES,
  staleOverrideKey
} from '../../transitions/hubSettings';
import {
  HUB_SETTINGS_KEY,
  hubSettingsStore,
  settingValue,
  stalePeriodFor
} from '../../transitions/hubSettingsStore';
import { checkTolerance, isCallOffEscalated } from '../../transitions/callOffRules';
import { checkPrice } from '../../transitions/invoiceRollup';
import { receiptQtyOutcome, shelfLifeLineView } from '../../transitions/fulfilmentRules';
import { commitmentDueAt, gapColour, toleranceOutcome } from '../../transitions/forecastRules';
import { otifPassesGate } from '../../sourcing/complianceGate';
import { coverage, riskFor, stockFreshness, supplyBand } from '../../transitions/inventoryRules';
import {
  complianceThresholds,
  staleApiHours,
  stockSyncIntervalHours,
  updateCycleSettings,
  updateSlaFor
} from '../../transitions/inventoryConfig';
import { compliancePill } from '../../transitions/updateCompliance';
import { assessmentScore } from '../performanceRules';
import { nextSyncAt, staleAtFor, updateCycleFor } from '../../transitions/updateCycle';
import { hubWorkingCalendar } from '../../transitions/workingCalendarStore';
import { coverageBands } from '../../sdc/consolidation';
import {
  backtestMascLimit,
  engineServiceTargets,
  feedFreshnessLimitsDays,
  orderSizingCosts,
  rescheduleOutThresholdWeeks,
  fsReconcileCycleWeeks,
  FS_RECONCILE_CYCLE_ANCHOR,
  cycleOfDay,
  safetyLeadTimePercentile,
  stabiliseDampingWeight,
  demandRangeExtraQuantilePct
} from '../../transitions/forecastConfig';
import { DEFAULT_STABILISE_PARAMS, stabilisePeriod } from '../../engine/stabilise';
import { freshnessOf } from '../../engine/dataHealth';
import { rangeLevels } from '../../engine/demandRange';
import { empiricalQuantile, fillRateSafetyStock } from '../../engine/safetyStock';
/** @import { SizingItem } from '../../engine/orderSizing' */
import { singleItemSolver } from '../../engine/orderSizing';
/** @import { CandidateScore } from '../../engine/modelBacktest' */
import { selectModel } from '../../engine/modelBacktest';
import { reschedule, termsKey } from '../../engine/reschedule';
import { addDays } from '../../engine/dates';
import { getKnownFlows } from '../../transitions';
import { sdcClock } from '../../sdc';

const svc = new MockCommandService();
const NOBODY = /** @type {const} */ ({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });

/**
 * @param {...string} roles
 * @returns {QueryScope}
 */
const seat = (...roles) => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  actor: NOBODY
});
/** @type {QueryScope} */
const supplier = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NOBODY
};

/**
 * @param {string} key
 * @param {unknown} value
 * @param {Record<string, unknown>} [extra]
 */
const setCmd = (key, value, extra = {}) => ({
  transitionId: 't_setting_set',
  entity: 'hubSetting',
  entityId: key,
  payload: { value, setBy: NOBODY, ...extra }
});

/**
 * Change a value through the verb, as the Hub administrator's lane.
 * @param {string} key
 * @param {unknown} value
 * @returns {Promise<void>}
 */
async function set(key, value) {
  const r = await svc.dispatch(seat('compliance'), setCmd(key, value));
  expect(r.status, `${key}=${JSON.stringify(value)}: ${r.reason}`).toBe('done');
}

/**
 * The refusal KIND, or the thrown DataError code.
 * @param {QueryScope} scope
 * @param {ReturnType<typeof setCmd>} cmd
 * @returns {Promise<string>}
 */
async function outcomeOf(scope, cmd) {
  try {
    const r = await svc.dispatch(scope, cmd);
    return r.status === 'failed' ? `failed/${r.reason ?? ''}` : `ok/${r.status}`;
  } catch (e) {
    return e instanceof DataError ? `throw/${e.code}` : `throw/${/** @type {Error} */ (e).name}`;
  }
}

beforeEach(() => {
  hubSettingsStore.reset();
  commandAuditSink.clear();
});
afterEach(() => hubSettingsStore.reset());

// ── 1 · The population, derived ───────────────────────────────────────────────

const SRC = join(process.cwd(), 'src');

/**
 * @param {string} dir
 * @param {string[]} [out]
 * @returns {string[]}
 */
function shipped(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) shipped(full, out);
    else if (/\.[jt]sx?$/.test(name) && !name.includes('.test.')) out.push(full);
  }
  return out;
}
/** @param {string} f */
const rel = (f) => relative(process.cwd(), f).split('\\').join('/');
/**
 * Comments stripped, so a sentence naming a constant is not a read of it.
 * @param {string} source
 * @returns {string}
 */
const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const SHIPPED = shipped(SRC).map((f) => ({ path: rel(f), code: code(readFileSync(f, 'utf8')) }));

/** The config modules: every `*Config.ts` under src/services, and the call-off tolerance module. */
const CONFIG_MODULES = SHIPPED.filter(
  (f) =>
    f.path.startsWith('src/services/') &&
    (/Config\.[jt]s$/.test(f.path) || f.path.endsWith('/callOffTolerance.js'))
);

/**
 * Exported `const` names of a module — what a reader could import as a constant.
 * @param {string} src
 * @returns {string[]}
 */
const exportedConsts = (src) =>
  [...src.matchAll(/export const ([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]).sort();

/**
 * Every constant a rule used to compare against, retired at BL-32. The list is
 * the pre-BL-32 exports of the config modules that held a value the registry
 * now holds (derived from `git show origin/main:<module>` when this was
 * written, and pinned here so a re-introduction is red).
 */
const RETIRED = [
  'CALL_OFF_OVER_PCT',
  'CALL_OFF_EARLY_ALLOWANCE_DAYS',
  'CALL_OFF_TOLERANCE',
  'CALL_OFF_CONFIRM_WORKING_DAYS',
  'INVOICE_PRICE_TOLERANCE',
  'RECEIPT_QTY_TOLERANCE_DEFAULT',
  'LEAD_TIME_RISK',
  'SUPPLY_BANDS',
  'COVERAGE_THRESHOLDS',
  'DEFAULT_UPDATE_SLA',
  'UPDATE_SLA_OVERRIDES',
  'COMMITMENT_TOLERANCE',
  'GAP_COLOUR_THRESHOLDS',
  'FIRM_DEADLINE_WORKING_DAYS',
  'OTHER_DEADLINE_WORKING_DAYS',
  'GATE_MIN_OTIF_PCT',
  'GATE_NO_HISTORY_PASSES',
  // Not a config module's, but a second copy of CR-03 found by deriving its readers.
  'COVERAGE_AT_RISK_FLOOR'
];

describe('BL32-POP · the population of rule values is derived from the config modules', () => {
  it('BL32-POP-01 · the config modules are found — known-true present, known-false absent', () => {
    const paths = CONFIG_MODULES.map((f) => f.path);
    expect(paths).toContain('src/services/transitions/callOffTolerance.js');
    expect(paths).toContain('src/services/sourcing/complianceGateConfig.js');
    expect(paths).toEqual([
      'src/services/sourcing/complianceGateConfig.js',
      'src/services/sourcing/rfxConfig.js',
      'src/services/transitions/callOffTolerance.js',
      'src/services/transitions/forecastConfig.js',
      'src/services/transitions/fulfilmentConfig.js',
      'src/services/transitions/inventoryConfig.js'
    ]);
    // Known-false: the menu's config is UI, not a rule value, and lives outside services.
    expect(paths).not.toContain('src/components/layout-v2/navConfig.js');
  });

  it('BL32-POP-02 · no retired constant survives anywhere in shipped code', () => {
    for (const name of RETIRED) {
      const hits = SHIPPED.filter((f) => new RegExp(`\\b${name}\\b`).test(f.code)).map(
        (f) => f.path
      );
      expect(hits, name).toEqual([]);
    }
    // Control: the matcher finds a constant that DOES still exist.
    expect(SHIPPED.filter((f) => /\bDEMAND_WINDOW\b/.test(f.code)).map((f) => f.path)).toContain(
      'src/services/transitions/inventoryConfig.js'
    );
  });

  it('BL32-POP-03 · what stays a constant in each config module is pinned, each with its reason at the site', () => {
    const byModule = Object.fromEntries(
      CONFIG_MODULES.map((f) => [f.path, exportedConsts(f.code)])
    );
    // Rule values: none left. What remains is structure, master data, lists
    // and the RFx library — the reason is written beside each in its module.
    expect(byModule['src/services/transitions/callOffTolerance.js']).toEqual([]);
    expect(byModule['src/services/sourcing/complianceGateConfig.js']).toEqual([]);
    expect(byModule['src/services/transitions/fulfilmentConfig.js']).toEqual([
      'RECEIPT_QTY_TOLERANCE_BY_MATERIAL'
    ]);
    expect(byModule['src/services/transitions/inventoryConfig.js']).toEqual(
      expect.arrayContaining(['CAPACITY_HORIZON_WEEKS', 'DEMAND_WINDOW'])
    );
    expect(byModule['src/services/transitions/forecastConfig.js']).toEqual(
      expect.arrayContaining([
        'DEFAULT_LEAD_TIME_DAYS',
        'FORECAST_HORIZON',
        'REMINDER_FRACTION',
        'SUPPLIER_LEAD_TIME_DAYS'
      ])
    );
    // Known-false: the RFx library is Procurement's (CE-05: changed by IT on request), not a rule value.
    expect(byModule['src/services/sourcing/rfxConfig.js']).toContain('PURCHASING_GROUPS');
    expect(HUB_SETTINGS.map((d) => d.key)).not.toContain('PURCHASING_GROUPS');
  });

  it('BL32-POP-04 · the registry holds the values the brief names at minimum (known-true members)', () => {
    const keys = HUB_SETTINGS.map((d) => d.key);
    for (const k of [
      'callOff.overPct',
      'callOff.earlyAllowanceDays',
      'invoice.contractPricePct',
      'invoice.standardPct',
      'invoice.standardCapIdr',
      'receipt.overPct',
      'receipt.shortPct',
      'commitment.firmShortfallPct',
      'commitment.tradeOffShortfallPct',
      'commitment.firmDeadlineWorkingDays',
      'commitment.otherDeadlineWorkingDays',
      'gate.minOtifPct',
      'gate.noHistoryPasses',
      'risk.mediumBelowMultiple',
      'bands.criticalBelowDays',
      'bands.warningBelowDays',
      'bands.healthyUpToDays',
      'coverage.coveredFromPct',
      'coverage.atRiskFromPct',
      'stale.defaultDays'
    ]) {
      expect(keys, k).toContain(k);
    }
    // The placeholders say whose decision they wait on.
    const ph = Object.fromEntries(
      HUB_SETTINGS.filter((d) => d.placeholder).map((d) => [
        d.key,
        /** @type {NonNullable<typeof d.placeholder>} */ (d.placeholder).backlogId
      ])
    );
    expect(ph).toEqual({
      'invoice.standardCapIdr': 'BL-54',
      'gate.minOtifPct': 'BL-55',
      'gate.noHistoryPasses': 'BL-55',
      // ENG-D6 — Finance's cost rates; REQ-E14-05 BR-03 — the Material Planner's penalty.
      'engine.holdingCostPctPerYear': 'ENG-D6',
      'engine.orderCostIdr': 'ENG-D6',
      'engine.rentedSpaceIdrPerPalletWeek': 'ENG-D6',
      'engine.changePenaltyIdrPerPallet': 'REQ-E14-05 BR-03',
      // BL-117 — the Warehouse's cap on rented space (the 3PL contract).
      'engine.maxRentedSpacePct': 'REQ-E14-05',
      // ENG-D13 — the Material Planner sets the MASC limit after the first backtest.
      'engine.backtestMascLimitPct': 'ENG-D13'
    });
  });
});

// ── 2 · The readers, derived ──────────────────────────────────────────────────

/**
 * @param {string} fn
 * @returns {string[]}
 */
const callersOf = (fn) =>
  SHIPPED.filter((f) => new RegExp(`\\b${fn}\\s*\\(`).test(f.code))
    .map((f) => f.path)
    .sort();

describe('BL32-READ · every reader of a value reads it through its accessor, at call time', () => {
  it('BL32-READ-01 · the store is read only by the accessors (config modules), the policy, the target and the admin page', () => {
    const readers = callersOf('hubSetting');
    expect(readers).toEqual(
      [
        'src/services/transitions/callOffTolerance.js',
        'src/services/transitions/forecastConfig.js',
        'src/services/transitions/fulfilmentConfig.js',
        'src/services/transitions/hubSettingsStore.js',
        'src/services/transitions/inventoryConfig.js'
      ]
        .concat(['src/services/sourcing/complianceGateConfig.js'])
        .sort()
    );
    // Known-false: no page reads the store behind the accessors' back.
    expect(readers).not.toContain('src/pages-v2/invoices/InvoiceCollaboration.jsx');
  });

  it('BL32-READ-02 · the readers of each accessor, pinned by name', () => {
    /** @type {Record<string, string[]>} */
    const table = {
      callOffTolerance: [
        'src/pages-v2/BuyerCallOffs/components/NewCallOffPanel.jsx',
        'src/services/transitions/callOffRules.js',
        'src/services/transitions/callOffTolerance.js'
      ],
      callOffConfirmWorkingDays: [
        'src/pages-v2/BuyerCallOffs/components/CallOffBanner.jsx',
        'src/services/transitions/callOffRules.js',
        'src/services/transitions/callOffTolerance.js'
      ],
      invoicePriceTolerance: [
        'src/pages-v2/BuyerInvoices/components/MatchSection.jsx',
        'src/pages-v2/SupplierInvoices/components/AmountFields.jsx',
        'src/pages-v2/invoices/InvoiceCollaboration.jsx',
        'src/services/transitions/fulfilmentConfig.js',
        'src/services/transitions/invoiceRollup.js'
      ],
      receiptQtyToleranceFor: [
        'src/pages-v2/receipts/ReceiptToleranceNote.jsx',
        'src/services/transitions/fulfilmentConfig.js',
        'src/services/transitions/fulfilmentRules/goodsReceipt.js'
      ],
      // MR-6 BR-06 (D2) — the ASN line rule reads the minimum through the master.
      shelfLifeDefaultMonths: ['src/services/transitions/fulfilmentConfig.js'],
      shelfLifeRuleFor: [
        'src/services/transitions/fulfilmentConfig.js',
        'src/services/transitions/fulfilmentRules/asn.js',
        'src/services/transitions/fulfilmentRules/shelfLife.js'
      ],
      commitmentTolerance: [
        'src/services/transitions/forecastConfig.js',
        'src/services/transitions/forecastRules.js'
      ],
      commitmentDeadlineWorkingDays: [
        'src/pages-v2/BuyerCommitments/index.jsx',
        'src/pages-v2/SupplierForecastCommitments/components/DueRuleNote.jsx',
        'src/services/transitions/forecastConfig.js',
        'src/services/transitions/forecastRules.js'
      ],
      gapColourThresholds: [
        'src/pages-v2/BuyerCommitments/components/CommitmentGrid.jsx',
        'src/services/transitions/forecastConfig.js',
        'src/services/transitions/forecastRules.js'
      ],
      gateMinOtifPct: [
        'src/pages-v2/rfx/rfxDisplay.jsx',
        'src/services/sourcing/complianceGate.js',
        'src/services/sourcing/complianceGateConfig.js'
      ],
      gateNoHistoryPasses: [
        'src/services/sourcing/complianceGate.js',
        'src/services/sourcing/complianceGateConfig.js'
      ],
      leadTimeRisk: [
        'src/services/transitions/inventoryConfig.js',
        'src/services/transitions/inventoryRules.js'
      ],
      supplyBands: [
        'src/services/transitions/inventoryConfig.js',
        'src/services/transitions/inventoryRules.js'
      ],
      coverageThresholds: [
        'src/pages-v2/BuyerCommitments/components/SupplierCoverage.jsx',
        'src/services/sdc/consolidation.js',
        'src/services/transitions/inventoryConfig.js',
        'src/services/transitions/inventoryRules.js'
      ],
      updateSlaFor: [
        'src/services/transitions/inventoryConfig.js',
        'src/services/transitions/inventoryRules.js'
      ],
      // Material B1 — MR-1 BR-03 and BR-05, read when the positions are built.
      // Material B2 and B3 — the weekly-update panel and the compliance read model read the cutoff.
      updateCycleSettings: [
        // BL-194 (DRC-8 BR-b, [Default E2]) — the feedstock confirmation is due
        // with the same weekly stock update cycle.
        'src/pages-v2/inventory/FeedstockConfirmPanel.jsx',
        'src/pages-v2/inventory/WeeklyUpdatePanel.jsx',
        'src/services/data/mock/updateComplianceReadModel.js',
        'src/services/transitions/inventoryConfig.js',
        'src/services/transitions/inventoryRules.js'
      ],
      // Material B2 — the admin row names the API hours.
      staleApiHours: [
        'src/pages-v2/admin/AdminRuleValues/components/StalePeriodRow.jsx',
        'src/services/transitions/inventoryConfig.js',
        'src/services/transitions/inventoryRules.js'
      ],
      // Material B2 — MR-1 BR-01, the API panel's "Next sync".
      stockSyncIntervalHours: [
        'src/pages-v2/inventory/WeeklyUpdatePanel.jsx',
        'src/services/transitions/inventoryConfig.js'
      ],
      staleOverrideDaysFor: [
        'src/services/transitions/inventoryConfig.js',
        'src/services/transitions/inventoryRules.js'
      ],
      // Material B3 — MR-2 BR-05, read by the score at call time; the card states it.
      complianceScoreWeight: [
        'src/pages-v2/performance/UpdateComplianceCard.jsx',
        'src/services/data/performanceRules.js',
        'src/services/transitions/inventoryConfig.js'
      ],
      // Material B4 — MR-2 BR-04 and BR-06: the award pill, the reason line and
      // the verbs' flag read the thresholds at call time.
      complianceThresholds: [
        'src/pages-v2/rfx/AwardPanel/components/ItemAwardForm.jsx',
        'src/pages-v2/rfx/ComplianceAwardPill.jsx',
        'src/services/data/mock/updateComplianceReadModel.js',
        'src/services/transitions/inventoryConfig.js'
      ],
      // ENG-D5 / REQ-E14-04 — read by the service that runs the engine, which
      // takes them as arguments (X-01); the engine never reads the store.
      engineServiceTargets: [
        'src/services/data/mock/MockProcurementService.js',
        'src/services/transitions/forecastConfig.js'
      ],
      safetyLeadTimePercentile: [
        'src/services/data/mock/MockProcurementService.js',
        'src/services/transitions/forecastConfig.js'
      ],
      // ENG-D6 / REQ-E14-05 — the same shape: the service passes them to the engine.
      orderSizingCosts: [
        'src/services/data/mock/MockProcurementService.js',
        'src/services/transitions/forecastConfig.js'
      ],
      // ENG-D15 / REQ-E14-13 — the same shape: the service passes it to the engine.
      rescheduleOutThresholdWeeks: [
        'src/services/data/mock/MockProcurementService.js',
        'src/services/transitions/forecastConfig.js'
      ],
      // REQ-E06-04 BR-01 — DORMANT since DRC-15a: the daily feedstock reconcile
      // reads no cycle, so no page or read model calls it (BL-201 report).
      fsReconcileCycleWeeks: ['src/services/transitions/forecastConfig.js'],
      // ENG-D9 / REQ-E14-06 — the same shape: the service passes it to the engine.
      stabiliseDampingWeight: [
        'src/services/data/mock/MockProcurementService.js',
        'src/services/transitions/forecastConfig.js'
      ],
      // REQ-E14-01 — the same shape: the service passes the limits to the data-health check.
      feedFreshnessLimitsDays: [
        'src/services/data/mock/MockProcurementService.js',
        'src/services/transitions/forecastConfig.js'
      ],
      // ENG-D13 / REQ-E14-10 — the same shape: the service passes the limit to the backtest.
      backtestMascLimit: [
        'src/services/data/mock/MockProcurementService.js',
        'src/services/transitions/forecastConfig.js'
      ],
      // REQ-E14-09 — the same shape: the service passes the levels to the demand range.
      demandRangeExtraQuantilePct: [
        'src/services/data/mock/MockProcurementService.js',
        'src/services/transitions/forecastConfig.js'
      ]
    };
    for (const [fn, files] of Object.entries(table)) expect(callersOf(fn), fn).toEqual(files);
    // Known-true through a second door: the SDC coverage indicator never
    // imported a config module, and reads CR-03 now.
    expect(callersOf('coverageThresholds')).toContain('src/services/sdc/consolidation.js');
    // Known-false: an admin page that shows a value does not decide with it.
    expect(callersOf('invoicePriceTolerance')).not.toContain(
      'src/pages-v2/admin/AdminWorkingCalendar.jsx'
    );
  });
});

// ── 3 · Every value flips a rule outcome, and reset flips it back ─────────────

const CALL_OFF = { quantity: 1000, needDate: '2026-09-10' };
/**
 * ENG-D13's flip: the floor (Comb) against a better-filling but less stable Theta.
 * @param {CandidateScore['candidate']} candidate
 * @param {number} fillRate
 * @param {number} masc
 * @returns {CandidateScore}
 */
const masCase = (candidate, fillRate, masc) => ({
  candidate,
  fillRate,
  orderCompleteRate: fillRate,
  unitFillRate: fillRate,
  palletWeeks: 1000,
  masc,
  wape: null,
  bias: null,
  counts: {
    lines: 100,
    fullLines: Math.round(fillRate * 100),
    orderWeeks: 100,
    completeWeeks: Math.round(fillRate * 100)
  }
});
/** @type {CandidateScore[]} */
const MASC_CASE = [masCase('comb', 0.9, 0.4), masCase('theta', 0.97, 1.8)];
const API_PULL = '2026-09-01T02:00:00.000Z';
const MAT = 'PK-PETB-8801';
/** @type {CallOff} */
const RELEASED = /** @type {CallOff} */ (
  /** @type {unknown} */ ({
    status: 'Awaiting Confirmation',
    releasedAt: '2026-09-07T02:00:00.000Z'
  })
);
const PUBLISHED = '2026-09-07T02:00:00.000Z';
/**
 * @param {number} soh
 * @returns {Pick<InventoryPosition, 'supplierSoh' | 'avgDailyDemand' | 'incoming'>}
 */
const pos = (soh) => ({
  supplierSoh: soh,
  avgDailyDemand: 10,
  incoming: []
});
const NOW = '2026-09-10T12:00:00.000Z';
const EIGHT_DAYS_AGO = '2026-09-02T11:00:00.000Z';

/**
 * `to`:  The new value the verb records.
 * `read`:  A rule outcome that depends on the value.
 * `atDefault`:  The outcome at the default, and after the change.
 *
 * @typedef {{
 *   readonly to: number | boolean;
 *   readonly read: () => unknown;
 *   readonly atDefault: unknown;
 *   readonly afterChange: unknown;
 * }} Flip
 */

/** REQ-E14-04's worked example: ten plan errors, a 5,000 order per cycle, and ten delivery delays. */
const PLAN_ERRORS = [600, -800, 2600, 0, -1200, 1500, 200, -300, 900, 400];
const DELAYS = [0, 0, 0, 1, 1, 2, 2, 3, 5, 9];

/**
 * REQ-E14-05's worked example, priced with the rates in force: 1,000 a week for
 * 3 weeks of a material worth Rp 50,000 a unit, 100 units a pallet. The rule
 * outcome is how many orders the sizing places. `space` adds a 15-pallet
 * warehouse; `previous` is last run's weekly plan, all inside the lead time.
 * @param {{ space?: boolean; cap?: boolean; previous?: number[] }} [opts]
 * @returns {number}
 */
const ordersPlaced = (opts = {}) => {
  const c = orderSizingCosts();
  /** @type {SizingItem} */
  const item = {
    materialCode: 'PK-PETB-8801',
    startStock: 0,
    gross: [1000, 1000, 1000],
    receipts: [0, 0, 0],
    safetyStock: 0,
    moq: 0,
    orderMultiple: 1,
    offsetWeeks: 3,
    palletsPerUnit: 1 / 100,
    holdingPerUnitWeek: (50_000 * c.holdingRatePerYear) / 52,
    ...(opts.previous ? { previous: opts.previous } : {})
  };
  const space = opts.space
    ? {
        capacityPallets: 15,
        rentIdrPerPalletWeek: c.rentIdrPerPalletWeek,
        // BL-117 — the cap on rented space in force, as the service passes it.
        ...(opts.cap ? { limitPallets: 15 + 15 * c.maxRentedShare } : {})
      }
    : { capacityPallets: Infinity, rentIdrPerPalletWeek: 0 };
  return singleItemSolver(item, [0, 0, 0], space, c)
    .plan()
    .filter((x) => x > 0).length;
};

/**
 * ENG-D15 at its default: REQ-E14-13's worked example — a 20,000-unit call-off
 * due in week 3 is not needed until week 5, two weeks early. The rule outcome is
 * the proposal type for it ('none' when nothing is proposed).
 * @returns {string}
 */
const rescheduleFor = () => {
  const weeks = Array.from({ length: 8 }, (_, i) => addDays('2026-09-14', 7 * i));
  const c = orderSizingCosts();
  const run = reschedule({
    asOf: '2026-09-07',
    weeks,
    warehouses: [{ warehouseId: 'WH-PK', kind: 'packaging', capacityPallets: 4 }],
    materials: [
      {
        materialCode: 'PK-CART-9910',
        kind: 'packaging',
        uom: 'PCS',
        startStock: 40_000,
        safetyStock: 8_000,
        gross: weeks.map(() => 8_000),
        planned: weeks.map(() => 0),
        unitsPerPallet: 2_000
      }
    ],
    lines: [
      {
        id: 'co:x',
        kind: 'callOff',
        reference: 'CO-X',
        callOffId: 'x',
        poNumber: 'PO-X',
        poLine: null,
        supplierId: 'sup-008',
        materialCode: 'PK-CART-9910',
        quantity: 20_000,
        receivedQuantity: 0,
        firstQuantity: 20_000,
        date: weeks[2],
        confirmed: true,
        info: null
      }
    ],
    terms: new Map([
      [
        termsKey('sup-008', 'PK-CART-9910'),
        { leadTimeDays: 14, firmDays: 14, tradeOffDays: 42, moq: 0, orderMultiple: 1 }
      ]
    ]),
    costs: {
      rentIdrPerPalletWeek: c.rentIdrPerPalletWeek,
      changePenaltyIdrPerPallet: c.changePenaltyIdrPerPallet
    },
    thresholdWeeks: rescheduleOutThresholdWeeks()
  });
  return run.warehouses[0].proposals[0]?.type ?? 'none';
};

/**
 * REQ-E14-01 — a feed's freshness at an age one day past its DEFAULT limit:
 * stale at the default, fresh once the limit is raised by five days. Read
 * through the accessor the service passes to the data-health check.
 */
const FRESHNESS_KEYS = HUB_SETTINGS.filter((d) => d.key.startsWith('engine.freshnessDays.'));
/** @type {Record<string, Flip>} */
const freshnessFlips = Object.fromEntries(
  FRESHNESS_KEYS.map((d) => {
    const feed = /** @type {keyof ReturnType<typeof feedFreshnessLimitsDays>} */ (
      d.key.slice('engine.freshnessDays.'.length)
    );
    const age = /** @type {number} */ (d.defaultValue) + 1;
    return [
      d.key,
      {
        to: age + 4,
        read: () => freshnessOf(age, feedFreshnessLimitsDays()[feed]),
        atDefault: 'stale',
        afterChange: 'fresh'
      }
    ];
  })
);

/**
 * SC Hub Material (MAT A3) — the values were in the registry before any rule
 * read them. Each task that added a reader replaced its key's placeholder row
 * with a rule outcome (B1: `stale.apiHours`, `stockUpdate.cutoffDay`,
 * `stockUpdate.cutoffTime`; B2: `stockSync.intervalHours`; B3:
 * `compliance.scoreWeight`; B4: `compliance.warnPct`, `compliance.flagPct`).
 * @type {Record<string, Flip>}
 */
const FLIPS = {
  ...freshnessFlips,
  // MR-2 BR-04 (Material B4): 85% is a plain pill at the 80% warning, amber at 90%.
  'compliance.warnPct': {
    to: 90,
    read: () => compliancePill(85, complianceThresholds()),
    atDefault: 'plain',
    afterChange: 'amber'
  },
  // MR-2 BR-04 / BR-06 (Material B4): 55% is a red pill at the 60% flag, amber at 50%.
  'compliance.flagPct': {
    to: 50,
    read: () => compliancePill(55, complianceThresholds()),
    atDefault: 'red',
    afterChange: 'amber'
  },
  'callOff.overPct': {
    to: 10,
    read: () => checkTolerance(CALL_OFF, [{ quantity: 1070, date: CALL_OFF.needDate }]).within,
    atDefault: false,
    afterChange: true
  },
  'callOff.earlyAllowanceDays': {
    to: 2,
    read: () => checkTolerance(CALL_OFF, [{ quantity: 1000, date: '2026-09-08' }]).within,
    atDefault: false,
    afterChange: true
  },
  'callOff.confirmWorkingDays': {
    to: 2,
    read: () => isCallOffEscalated(RELEASED, '2026-09-09T00:30:00.000Z'),
    atDefault: true,
    afterChange: false
  },
  'invoice.contractPricePct': {
    to: 1,
    read: () => checkPrice('contract', 1_000_000, 1_000_500).held,
    atDefault: true,
    afterChange: false
  },
  'invoice.standardPct': {
    to: 3,
    read: () => checkPrice('standard', 1_000_000, 1_025_000).outcome,
    atDefault: 'overPercent',
    afterChange: 'withinTolerance'
  },
  'invoice.standardCapIdr': {
    // INV-2026-BRL-0064's line: 25,000 × Rp 1,233 billed at Rp 31,425,000.
    to: 600_000,
    read: () => checkPrice('standard', 30_825_000, 31_425_000).outcome,
    atDefault: 'overCap',
    afterChange: 'withinTolerance'
  },
  // MR-6 BR-05 / BR-06 (D2): RM-EMUL-3310 is raw material with no minimum in
  // the master, so the default applies — expiry 8 months after ETA passes at 6
  // and fails at 12.
  'shelfLife.defaultMonths': {
    to: 12,
    read: () =>
      shelfLifeLineView({
        materialCode: 'RM-EMUL-3310',
        eta: '2026-10-01',
        expiryDate: '2027-06-01'
      })?.ok,
    atDefault: true,
    afterChange: false
  },
  'receipt.overPct': {
    to: 1,
    read: () => receiptQtyOutcome(MAT, 1000, 1010),
    atDefault: 'over',
    afterChange: 'overWithin'
  },
  'receipt.shortPct': {
    to: 3,
    read: () => receiptQtyOutcome(MAT, 1000, 970),
    atDefault: 'shortOver',
    afterChange: 'shortWithin'
  },
  'commitment.firmShortfallPct': {
    to: 1,
    read: () => toleranceOutcome('firm', 1000, 990),
    atDefault: 'outside',
    afterChange: 'within'
  },
  'commitment.tradeOffShortfallPct': {
    to: 15,
    read: () => toleranceOutcome('tradeOff', 1000, 850),
    atDefault: 'outside',
    afterChange: 'within'
  },
  'commitment.firmDeadlineWorkingDays': {
    to: 2,
    read: () => commitmentDueAt('firm', PUBLISHED),
    atDefault: '2026-09-08T02:00:00.000Z',
    afterChange: '2026-09-09T02:00:00.000Z'
  },
  'commitment.otherDeadlineWorkingDays': {
    to: 4,
    read: () => commitmentDueAt('tradeOff', PUBLISHED),
    atDefault: '2026-09-10T02:00:00.000Z',
    afterChange: '2026-09-11T02:00:00.000Z'
  },
  'gap.greenFromPct': {
    to: 95,
    read: () => gapColour(0.95),
    atDefault: 'amber',
    afterChange: 'green'
  },
  'gap.amberFromPct': {
    to: 70,
    read: () => gapColour(0.75),
    atDefault: 'red',
    afterChange: 'amber'
  },
  'gate.minOtifPct': {
    // rfq-019's sup-020: 11 of 14, shown 79% — 78.57% measured.
    to: 78,
    read: () => otifPassesGate((11 / 14) * 100),
    atDefault: false,
    afterChange: true
  },
  'gate.noHistoryPasses': {
    to: false,
    read: () => otifPassesGate(null),
    atDefault: true,
    afterChange: false
  },
  'risk.mediumBelowMultiple': {
    to: 1.2,
    read: () => riskFor(17, 14).riskClass,
    atDefault: 'medium',
    afterChange: 'low'
  },
  'bands.criticalBelowDays': {
    to: 10,
    read: () => supplyBand(13),
    atDefault: 'critical',
    afterChange: 'warning'
  },
  'bands.warningBelowDays': {
    to: 25,
    read: () => supplyBand(26),
    atDefault: 'warning',
    afterChange: 'healthy'
  },
  'bands.healthyUpToDays': {
    to: 70,
    read: () => supplyBand(61),
    atDefault: 'excess',
    afterChange: 'healthy'
  },
  'coverage.coveredFromPct': {
    to: 90,
    read: () => [coverage(pos(285)).status, coverageBands().coveredFrom],
    atDefault: ['atRisk', 1],
    afterChange: ['covered', 0.9]
  },
  'coverage.atRiskFromPct': {
    to: 70,
    read: () => [coverage(pos(225)).status, coverageBands().atRiskFrom],
    atDefault: ['uncovered', 0.8],
    afterChange: ['atRisk', 0.7]
  },
  'engine.fillRateHighPct': {
    to: 90,
    read: () => fillRateSafetyStock(PLAN_ERRORS, 5000, engineServiceTargets().high),
    atDefault: 834,
    afterChange: 200
  },
  'engine.fillRateStandardPct': {
    to: 85,
    read: () => fillRateSafetyStock(PLAN_ERRORS, 5000, engineServiceTargets().standard),
    atDefault: 200,
    afterChange: 0
  },
  'engine.fillRateSlowPct': {
    to: 90,
    read: () => fillRateSafetyStock(PLAN_ERRORS, 5000, engineServiceTargets().slow),
    atDefault: 0,
    afterChange: 200
  },
  // ENG-D6 at the placeholders: one order of 3,000 (Rp 750,000 + 3,000 unit-weeks × Rp 240).
  'engine.orderCostIdr': { to: 250_000, read: () => ordersPlaced(), atDefault: 1, afterChange: 2 },
  'engine.holdingCostPctPerYear': {
    to: 100,
    read: () => ordersPlaced(),
    atDefault: 1,
    afterChange: 3
  },
  // 15 pallets of room: one order spills 5 pallets for a week; at Rp 100,000 a pallet two orders win.
  'engine.rentedSpaceIdrPerPalletWeek': {
    to: 100_000,
    read: () => ordersPlaced({ space: true }),
    atDefault: 1,
    afterChange: 2
  },
  // BL-117: at 25% the one-order plan's 20 pallets pass 15 + 3.75 — no plan may rent past the cap, so two
  // orders; at 50% (22.5) it fits and renting is cheaper, so one.
  'engine.maxRentedSpacePct': {
    to: 50,
    read: () => ordersPlaced({ space: true, cap: true }),
    atDefault: 2,
    afterChange: 1
  },
  // BR-03: last run planned 1,000 a week, all inside the lead time; with no penalty the plan re-sizes.
  'engine.changePenaltyIdrPerPallet': {
    to: 0,
    read: () => ordersPlaced({ previous: [1000, 1000, 1000] }),
    atDefault: 3,
    afterChange: 1
  },
  // ENG-D9: REQ-E14-06's worked example — 1,200 → 1,500 damps to 1,350 at 50%,
  // beyond the band, so 1,320 is published; at 90% it damps to 1,230, inside.
  'engine.dampingWeightPct': {
    to: 90,
    read: () =>
      stabilisePeriod(
        { period: '2026-10-12', zone: 'tradeOff', raw: 1500, previous: 1200, first: 1200 },
        { ...DEFAULT_STABILISE_PARAMS, tradeOffWeight: stabiliseDampingWeight() }
      ).published,
    atDefault: 1320,
    afterChange: 1230
  },
  // ENG-D13: not set (0) → no limit, the better but less stable Theta is chosen;
  // at 100% (MASC 1.0) Theta's 1.8 is over the limit and the Comb floor stays.
  'engine.backtestMascLimitPct': {
    to: 100,
    read: () => selectModel(MASC_CASE, 'comb', backtestMascLimit()).chosen,
    atDefault: 'theta',
    afterChange: 'comb'
  },
  // REQ-E14-09 BR-01: P50 and P90 only at the default of 0; at 95 the range adds P95.
  'engine.rangeExtraQuantilePct': {
    to: 95,
    read: () => rangeLevels(demandRangeExtraQuantilePct()),
    atDefault: [0.5, 0.9],
    afterChange: [0.5, 0.9, 0.95]
  },
  // ENG-D15: two weeks early is proposed at the default of 1; at 3 it is not.
  // REQ-E06-04 BR-01: 14 Sep 2026 is W3 of the cycle from 31 Aug at 3 weeks, and opens one at 2.
  'forecast.fsReconcileCycleWeeks': {
    to: 2,
    read: () =>
      cycleOfDay('packaging', '2026-09-14', {
        anchor: FS_RECONCILE_CYCLE_ANCHOR,
        cycleWeeks: fsReconcileCycleWeeks()
      }).start,
    atDefault: '2026-08-31',
    afterChange: '2026-09-14'
  },
  'engine.rescheduleOutWeeks': {
    to: 3,
    read: () => rescheduleFor(),
    atDefault: 'rescheduleOut',
    afterChange: 'none'
  },
  'engine.safetyLeadTimePercentile': {
    to: 90,
    read: () => empiricalQuantile(DELAYS, safetyLeadTimePercentile()),
    atDefault: 3,
    afterChange: 5
  },
  // MR-1 BR-05 (MAT-D8): a pull 30 hours ago is stale at 24 hours, current at 48.
  'stale.apiHours': {
    to: 48,
    read: () =>
      stockFreshness(
        {
          lastUpdatedAt: API_PULL,
          updateSla: 7,
          lastSync: null,
          staleAt: staleAtFor({
            lastUpdatedAt: API_PULL,
            mode: 'api',
            lastSuccessfulPullAt: API_PULL,
            overrideDays: null,
            calendar: hubWorkingCalendar(),
            cycle: updateCycleSettings(),
            apiHours: staleApiHours()
          })
        },
        '2026-09-02T08:00:00.000Z'
      ),
    atDefault: 'stale',
    afterChange: 'current'
  },
  // MR-1 BR-01 (Material B2): after an attempt at 10:00 UTC the next pull is
  // due 2 hours later; at a 4-hour interval, 4 hours later.
  'stockSync.intervalHours': {
    to: 4,
    read: () => nextSyncAt('2026-09-07T10:00:00.000Z', stockSyncIntervalHours()),
    atDefault: '2026-09-07T12:00:00.000Z',
    afterChange: '2026-09-07T14:00:00.000Z'
  },
  // MR-1 BR-03 (MAT-D7): on Wednesday 9 Sep the cycle closes on Thursday 10 Sep;
  // with a Friday cutoff it closes on Friday 11 Sep.
  // MR-2 BR-05 (MAT-D9, AC-03): a delivery score of 90 with 50% update
  // compliance is 86 at weight 0.10, and 84 at 0.15.
  'compliance.scoreWeight': {
    to: 0.15,
    read: () => assessmentScore(90, 90, 0, 50),
    atDefault: 86,
    afterChange: 84
  },
  'stockUpdate.cutoffDay': {
    to: 5,
    read: () =>
      updateCycleFor('2026-09-09T03:00:00.000Z', hubWorkingCalendar(), updateCycleSettings())
        .cutoff,
    atDefault: '2026-09-10T16:59:00.000Z',
    afterChange: '2026-09-11T16:59:00.000Z'
  },
  // MR-1 BR-03: an upload on Thursday at 18:00 WIB is inside the 23:59 cycle;
  // with a 17:00 cutoff it falls in the next one (edge case 4).
  'stockUpdate.cutoffTime': {
    to: 1020,
    read: () =>
      updateCycleFor('2026-09-03T11:00:00.000Z', hubWorkingCalendar(), updateCycleSettings())
        .cutoff,
    atDefault: '2026-09-03T16:59:00.000Z',
    afterChange: '2026-09-10T10:00:00.000Z'
  },
  'stale.defaultDays': {
    to: 10,
    read: () =>
      stockFreshness(
        {
          lastUpdatedAt: EIGHT_DAYS_AGO,
          updateSla: updateSlaFor('sup-999', 'X-NONE'),
          lastSync: null
        },
        NOW
      ),
    atDefault: 'stale',
    afterChange: 'current'
  }
};

describe('BL32-FLIP · every value in the registry changes a rule outcome, and reset changes it back', () => {
  it('BL32-FLIP-00 · the flip table covers the registry exactly — a new value without a flip is red', () => {
    expect(Object.keys(FLIPS).sort()).toEqual(HUB_SETTINGS.map((d) => d.key).sort());
  });

  it.each(HUB_SETTINGS.map((d) => d.key))('BL32-FLIP · %s', async (key) => {
    const f = FLIPS[key];
    const def = /** @type {import('../../transitions/hubSettings').HubSettingDef} */ (
      HUB_SETTINGS.find((d) => d.key === key)
    );
    expect(f.read(), 'at the default').toEqual(f.atDefault);
    await set(key, f.to);
    expect(settingValue(key)).toBe(f.to);
    expect(f.read(), 'after the change').toEqual(f.afterChange);
    // Reset to default is the SAME verb writing the default back.
    await set(key, def.defaultValue);
    expect(f.read(), 'after reset').toEqual(f.atDefault);
    expect(hubSettingsStore.changes().map((c) => [c.key, c.previous, c.value])).toEqual([
      [key, def.defaultValue, f.to],
      [key, f.to, def.defaultValue]
    ]);
  });

  it('BL32-FLIP-STALE · an override for one supplier × material makes a REAL stock figure go stale, and removing it restores it', async () => {
    const now = sdcClock.now();
    const fresh = () =>
      allPositions(now).filter(
        (p) => p.lastUpdatedAt !== null && stockFreshness(p, now) === 'current'
      );
    // Candidates whose figure is more than a day old but still current.
    const candidates = fresh().filter(
      (p) =>
        Date.parse(now) -
          Date.parse(/** @type {NonNullable<typeof p.lastUpdatedAt>} */ (p.lastUpdatedAt)) >
        86_400_000
    );
    const target = /** @type {InventoryPosition} */ (
      candidates.find(
        (p) => SEEDED_STALE_OVERRIDES[staleOverrideKey(p.supplierId, p.materialCode)] === undefined
      )
    );
    expect(target, 'a current, unseeded pair exists in the sample data').toBeDefined();
    const key = staleOverrideKey(target.supplierId, target.materialCode);
    const find = () =>
      /** @type {InventoryPosition} */ (
        allPositions(now).find(
          (p) => p.supplierId === target.supplierId && p.materialCode === target.materialCode
        )
      );
    expect(stockFreshness(find(), now)).toBe('current');
    await set(key, 1);
    expect(stalePeriodFor(target.supplierId, target.materialCode)).toBe(1);
    expect(find().updateSla).toBe(1);
    expect(stockFreshness(find(), now)).toBe('stale');
    // Removing the override (null) is the reset for an unseeded pair.
    await set(key, null);
    expect(stockFreshness(find(), now)).toBe('current');
    expect(settingValue(key)).toBeNull();
  });

  it('BL32-FLIP-SEED · a shipped override resets to its shipped value, and can be removed to use the default', async () => {
    const key = staleOverrideKey('sup-001', 'RM-COCO-8200');
    expect(stalePeriodFor('sup-001', 'RM-COCO-8200')).toBe(1);
    await set(key, null);
    expect(stalePeriodFor('sup-001', 'RM-COCO-8200')).toBe(7);
    await set(key, SEEDED_STALE_OVERRIDES[key]);
    expect(stalePeriodFor('sup-001', 'RM-COCO-8200')).toBe(1);
  });
});

// ── 4 · Governance ───────────────────────────────────────────────────────────

describe('BL32-GOV · t_setting_set — the recorded act and who may perform it', () => {
  it('BL32-GOV-01 · the flow is registered, surfaced, statePreserving, on the setting:set atom', () => {
    const flow = getKnownFlows().find((f) => f.entity === 'hubSetting');
    const t = flow?.transitions.find((x) => x.id === 't_setting_set');
    expect(t?.requiredRole).toBe('setting:set');
    expect(t?.statePreserving).toBe(true);
    expect(t?.surfaceable).toEqual({ surfaced: true });
  });

  it('BL32-GOV-02 · compliance and admin (ADM) hold setting:set; the lanes the values judge do not', () => {
    expect(rolesHolding('setting:set')).toEqual(['compliance']);
    expect(SYSTEM_ROLES.admin).toContain('setting:set');
    for (const lane of /** @type {const} */ ([
      'planning',
      'procurement',
      'receiving',
      'finance',
      'requisitioner'
    ])) {
      expect(SYSTEM_ROLES[lane], lane).not.toContain('setting:set');
    }
    for (const lane of PERSONA_SYSTEM_ROLES.supplier)
      expect(SYSTEM_ROLES[lane], lane).not.toContain('setting:set');
  });

  it('BL32-GOV-03 · admin can change a value; planning, procurement and finance are refused at the ROLE gate', async () => {
    expect((await svc.dispatch(seat('admin'), setCmd('callOff.overPct', 6))).status).toBe('done');
    for (const lane of ['planning', 'procurement', 'finance']) {
      const r = await svc.dispatch(seat(lane), setCmd('callOff.overPct', 50));
      expect(r.reason, lane).toMatch(/^ROLE_NOT_PERMITTED/);
    }
    expect(settingValue('callOff.overPct')).toBe(6);
  });

  it('BL32-GOV-04 · a supplier is refused at SCOPE, and nothing is recorded', async () => {
    expect(await outcomeOf(supplier, setCmd('callOff.overPct', 50))).toBe('throw/SCOPE_DENIED');
    expect(hubSettingsStore.changes()).toHaveLength(0);
  });

  it('BL32-GOV-05 · every change lands in the DR-10 trail; previous and setAt are minted by the store', async () => {
    const r = await svc.dispatch(
      seat('compliance'),
      setCmd('gate.minOtifPct', 75, { previous: 1, setAt: '1999-01-01T00:00:00.000Z' })
    );
    expect(r.status).toBe('done');
    expect(commandAuditSink.byEvent('t_setting_set')).toHaveLength(1);
    const [c] = hubSettingsStore.changes();
    expect(c).toMatchObject({ key: 'gate.minOtifPct', value: 75, previous: 80, setBy: NOBODY });
    expect(c.setAt).not.toBe('1999-01-01T00:00:00.000Z');
  });
});

// ── 5 · Refusals, each by name — and the known-good of the same key ──────────

describe('BL32-POL · nonsense is refused and the refusal names it', () => {
  it.each([
    ['negative %', 'callOff.overPct', -1, /callOff\.overPct cannot be negative, got -1/],
    ['over 100%', 'invoice.standardPct', 101, /at most 100/],
    ['fractional days', 'callOff.earlyAllowanceDays', 1.5, /whole number/],
    ['a zero deadline', 'commitment.firmDeadlineWorkingDays', 0, /at least 1/],
    ['not a number', 'invoice.standardCapIdr', 'lots', /must be a number, got "lots"/],
    ['a number for a yes/no', 'gate.noHistoryPasses', 1, /must be true or false/],
    ['bands out of order', 'bands.criticalBelowDays', 30, /bands out of order: Critical/],
    [
      'an empty Healthy band',
      'bands.healthyUpToDays',
      20,
      /bands out of order: Healthy would be empty/
    ],
    ['amber not below green', 'gap.amberFromPct', 100, /amber must start below green/],
    [
      'At risk not below Covered',
      'coverage.atRiskFromPct',
      120,
      /At risk must start below Covered/
    ],
    [
      'min above max (firm > trade-off)',
      'commitment.firmShortfallPct',
      20,
      /Firm periods may not accept a larger shortfall/
    ],
    [
      'contract looser than other lines',
      'invoice.contractPricePct',
      5,
      /contract-price line may not be allowed more/
    ],
    [
      'Firm deadline after the others',
      'commitment.firmDeadlineWorkingDays',
      5,
      /Firm deadline may not be later/
    ],
    ['a multiple of 1 or less', 'risk.mediumBelowMultiple', 1, /must be more than 1/]
  ])('BL32-POL · %s', async (_label, key, value, why) => {
    const r = await svc.dispatch(seat('compliance'), setCmd(key, value));
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(why);
    expect(hubSettingsStore.changes()).toHaveLength(0);
  });

  it('BL32-POL-GOOD · the same keys accept a sensible value (the guard probed both ways)', async () => {
    await set('callOff.overPct', 0);
    await set('bands.criticalBelowDays', 20);
    await set('gap.amberFromPct', 99.5);
    await set('commitment.firmShortfallPct', 10);
    await set('gate.noHistoryPasses', false);
    expect(hubSettingsStore.changes()).toHaveLength(5);
  });

  it('BL32-POL-ORDER · moving both ends of a band works in the right order', async () => {
    await set('bands.healthyUpToDays', 120);
    await set('bands.warningBelowDays', 90);
    await set('bands.criticalBelowDays', 60);
    expect(supplyBand(59)).toBe('critical');
    expect(supplyBand(100)).toBe('healthy');
  });

  it('BL32-POL-KEY · an unknown key, or an override for a pair nobody supplies, is NOT_FOUND', async () => {
    expect(await outcomeOf(seat('compliance'), setCmd('callOff.underPct', 5))).toBe(
      'throw/NOT_FOUND'
    );
    expect(
      await outcomeOf(seat('compliance'), setCmd(staleOverrideKey('sup-007', 'RM-NOPE-0000'), 3))
    ).toBe('throw/NOT_FOUND');
    // Known-good: an assigned pair is addressable.
    expect(
      await outcomeOf(seat('compliance'), setCmd(staleOverrideKey('sup-007', 'PK-PETB-8801'), 2))
    ).toBe('ok/done');
  });

  it('BL32-POL-VALUE · a change with no value at all is refused by name (null is a value)', async () => {
    const r = await svc.dispatch(seat('compliance'), {
      transitionId: 't_setting_set',
      entity: 'hubSetting',
      entityId: 'callOff.overPct',
      payload: { setBy: NOBODY }
    });
    expect(r.reason).toMatch(/value is required for callOff\.overPct/);
    const nullOnFixed = await svc.dispatch(seat('compliance'), setCmd('callOff.overPct', null));
    expect(nullOnFixed.reason).toMatch(/must be a number, got null/);
  });
});

// ── 6 · Persistence, re-checked on read ──────────────────────────────────────

describe('BL32-STORE · the changes survive a reload and are re-checked on read', () => {
  it('BL32-STORE-01 · a change survives a reload (rehydrate reads localStorage)', async () => {
    await set('invoice.standardCapIdr', 600_000);
    hubSettingsStore.rehydrate();
    expect(settingValue('invoice.standardCapIdr')).toBe(600_000);
    expect(window.localStorage.getItem(HUB_SETTINGS_KEY)).toContain('invoice.standardCapIdr');
  });

  it('BL32-STORE-02 · a hand-edited nonsense row is refused on read and NAMED; the good row still applies', () => {
    /**
     * @param {string} key
     * @param {unknown} value
     */
    const row = (key, value) => ({
      key,
      value,
      previous: null,
      setBy: NOBODY,
      setAt: '2026-09-21T00:00:00.000Z'
    });
    window.localStorage.setItem(
      HUB_SETTINGS_KEY,
      JSON.stringify({
        v: 1,
        changes: [row('callOff.overPct', 8), row('invoice.standardPct', -3), row('no.such', 1)]
      })
    );
    hubSettingsStore.rehydrate();
    expect(settingValue('callOff.overPct')).toBe(8);
    expect(settingValue('invoice.standardPct')).toBe(2);
    const rs = hubSettingsStore.readState();
    expect(rs.rejected.map((r) => r.row)).toEqual(['invoice.standardPct', 'row 2']);
    expect(rs.rejected[0].reason).toMatch(/cannot be negative/);
  });

  it('BL32-STORE-03 · rows are replayed IN ORDER: a band move valid only after an earlier row is kept', () => {
    /**
     * @param {string} key
     * @param {unknown} value
     */
    const row = (key, value) => ({ key, value, setBy: NOBODY, setAt: '2026-09-21T00:00:00.000Z' });
    window.localStorage.setItem(
      HUB_SETTINGS_KEY,
      JSON.stringify({
        v: 1,
        changes: [row('bands.healthyUpToDays', 120), row('bands.warningBelowDays', 90)]
      })
    );
    hubSettingsStore.rehydrate();
    expect(settingValue('bands.warningBelowDays')).toBe(90);
    // Reversed, the second row would be refused — the order is the rule.
    window.localStorage.setItem(
      HUB_SETTINGS_KEY,
      JSON.stringify({
        v: 1,
        changes: [row('bands.warningBelowDays', 90), row('bands.healthyUpToDays', 120)]
      })
    );
    hubSettingsStore.rehydrate();
    expect(settingValue('bands.warningBelowDays')).toBe(30);
    expect(hubSettingsStore.readState().rejected.map((r) => r.row)).toEqual([
      'bands.warningBelowDays'
    ]);
  });

  it('BL32-STORE-04 · an unparseable store is UNREADABLE, distinct from "no changes"', () => {
    window.localStorage.setItem(HUB_SETTINGS_KEY, '{not json');
    hubSettingsStore.rehydrate();
    expect(hubSettingsStore.readState().unreadable).toBe(true);
    expect(settingValue('callOff.overPct')).toBe(5);
    hubSettingsStore.reset();
    expect(hubSettingsStore.readState().unreadable).toBe(false);
  });

  it('BL32-STORE-05 · the store itself refuses a change the rule would refuse (no back door)', () => {
    expect(
      hubSettingsStore.append({
        key: 'callOff.overPct',
        value: -5,
        setBy: NOBODY,
        setAt: '2026-09-21T00:00:00.000Z'
      })
    ).toBe(false);
    expect(hubSettingsStore.changes()).toHaveLength(0);
  });
});
