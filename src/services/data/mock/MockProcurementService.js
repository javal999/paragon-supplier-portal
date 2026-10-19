import { callOffStore } from './stores/callOffStore';
/** @import { CallOff } from '../types' */
/** @import { BlanketPoRunOut } from '../../transitions/blanketPoRules' */
/** @import { NpdReview } from '../../transitions/osipRopRules' */
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import {
  allAlerts,
  allBlanketPoRunOuts,
  allCapacityPlans,
  allPositions,
  grantFor,
  suppliersWithAssignments
} from './inventoryReadModel';
import { stockAccessStore } from './stores/inventoryHubStores';
import { allPlanningGroups } from './planningGroupReadModel';
import { allDemandAnticipationWithSupply } from './supplyBelowDemandReadModel';
import { withLtpFgDemandRead } from './ltpFgDemandReadModel';
import { osipSafetyInputs } from './osipSafetyReadModel';
import { npdReviews, osipRopInputs, systemRopSuppliers } from './osipRopReadModel';
import { ropFisikPrRecommendations } from './callOffTriggerReadModel';
/** @import { PrRecommendationView } from '../../transitions/callOffTriggerRules' */
/** @import { DemandAnticipationSupplyRow } from '../../transitions/supplyBelowDemandRules' */
/** @import { DaHistoryRow } from '../../transitions/demandAnticipationHistory' */
import { allDemandAnticipationHistory } from './demandAnticipationHistoryReadModel';
import { stockSimulationRows } from './stockSimulationReadModel';
import {
  allCommitmentLines,
  allCoverageRows,
  allVersionViews,
  currentPlanVersion,
  forecastSupplierName
} from './forecastReadModel';
import { allFeedstockRows } from './feedstockReadModel';
import { maskForSupplier } from '../../transitions/inventoryRules';
import { PTI_ONLY_RULES } from '../../transitions/inventoryAlertRules';
import { mockShipments } from '@data/mockShipments';
import { mockContracts } from '@data/mockContracts';
import { mockObligations } from '@data/mockObligations';
import { applySupplierScope } from '../scoping';
import { rfqStore } from './stores/rfqStore';
// RFx spec 2026-09-21 — the supplier's side of a tiered RFQ.
import { acceptanceOf } from './stores/rfqEngagementStores';
import { rfqClarificationViews, rfqEngagementViews } from './rfqEngagementReadModel';
/** @import { RfqClarificationView, RfqEngagementView } from '../../sourcing/rfqResponse' */
import { maskConfidential } from '../../sourcing/rfqResponse';
// REQ-E03-01 to REQ-E03-05 — the RFx read model. Every RFx read resolves through
// it, which is what keeps the draft-invisibility and own-thread rules in ONE
// place instead of once per surface.
import {
  awardViews,
  matchingInvitees,
  negotiationRoundViews,
  rfiEventViews,
  rfpEventViews,
  rfpAwardViews,
  rfpOfferRoundViews,
  rfqGateViews,
  rfxNow
} from './rfxReadModel';
/** @import { InviteeCandidate, InviteeFilter } from '../../transitions/rfxRules' */
/** @import { AwardView, NegotiationRoundView, RfiEventView, RfpEventView, RfpAwardView, RfpOfferRoundView, RfqSupplierGateView } from '../../sourcing/views' */
import { quotationStore } from './stores/quotationStore';
import { asnStore } from './stores/asnStore';
import { receiptDiscrepancyStore } from './stores/receiptDiscrepancyStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { invoiceStore } from './stores/invoiceStore';
import { toBuyerInvoice, toSupplierInvoice } from '../invoiceProjection';
import { DECLARED_PRESENT } from '../fixturePresent';
import { PRODUCTION_LINES, SUPPLIER_HEALTH } from './fixtures/buyerDashboard';
import { supplierDocumentStore } from './stores/supplierDocumentStore';
import { SUPPLIER_SCORECARDS } from './fixtures/buyerScorecard';
import { qualificationFor } from './qualificationReadModel';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import { supplierApplicationStore } from './stores/supplierApplicationStore';
import { INITIAL_CATALOG, INITIAL_CERTS, PRODUCTS_DEFAULT } from './fixtures/supplierStorefront';
import {
  KPIS,
  RADAR_DATA,
  WEEKLY_TREND,
  IMPROVEMENT_ACTIONS,
  SUP_007_SUPPLIER_ID
} from './fixtures/supplierPerformance';
/** @import { IProcurementService, Page, QueryScope, PurchaseOrder, POFilter, InventoryPosition, MaterialNameRow, StockAccessGrant, CapacityPlan, PlanningGroupView, StockSimulationFilter, StockSimulationRow, InventoryAlert, ForecastVersionView, ForecastCommitmentLine, ForecastCoverageRow, FixedStockReconcileRow, InventoryFilter, Shipment, ShipmentFilter, ASN, ASNFilter, GoodsReceipt, GRFilter, Contract, ContractFilter, ContractObligation, ObligationFilter, RFQ, RFQFilter, Quotation, QuotationFilter, BuyerInvoice, SupplierInvoice, InvoiceFilter, SupplierDocument, CatalogItem, ProfileCert, StorefrontProduct, KpiSnapshot, PerformancePoint, TrendRange, ProductionLineRow, SupplierHealthRow, SupplierScorecard, PurchaseRequisition, PRFilter, PrIntakeLine, SupplierApplication, ReliabilityWindowWeeks, SupplierReliabilityView, MaterialRequirementView, SafetyStockView, OrderPlanView, RescheduleView, StabiliseRunView, StabilisedPlanView, DataHealthView, DemandForecastView, ForecastBiasView, ModelBacktestView } from '../types' */
import { PR_INTAKE_LINES } from './fixtures/prIntake';
import { engineDataset } from './fixtures/engineDataset';
import { supplierReliability, trailingWindow } from '../../engine/reliability';
import {
  DEFAULT_RECEIPT_OPTIONS,
  defaultRequirementOptions,
  openReceipts
} from '../../engine/requirement';
/** @import { SafetyStockRun } from '../../engine/safetyStock' */
import {
  DEFAULT_SAFETY_STOCK_OPTIONS,
  previousRunDate,
  requirementInputs,
  safetyStockChanges,
  safetyStockRun
} from '../../engine/safetyStock';
import { plannedReceiptsOf, sizedRequirement } from '../../engine/orderSizing';
import {
  STREAM_MATERIAL_TYPE,
  backtestMascLimit,
  engineServiceTargets,
  feedFreshnessLimitsDays,
  orderSizingCosts,
  rescheduleOutThresholdWeeks,
  safetyLeadTimePercentile,
  stabiliseDampingWeight,
  demandRangeExtraQuantilePct,
  zoneLengthsFor
} from '../../transitions/forecastConfig';
/** @import { StabiliseRun } from '../../engine/stabilise' */
import { DEFAULT_STABILISE_PARAMS, stabilisePlan } from '../../engine/stabilise';
import { planHistoryInputs, stabiliseInputs, versionDays } from './stabiliseReadModel';
/** @import { LineTerms, OpenOrderLine } from '../../engine/reschedule' */
import { planChangeGuard, poOrderLines, reschedule, termsKey } from '../../engine/reschedule';
import { callOffViews } from '../../transitions/callOffRules';
import { callOffOrderLines } from './rescheduleReadModel';
import { sapChangeMarkStore } from './stores/sapChangeMarkStore';
import { warehouseDecisionStore } from './stores/warehouseDecisionStore';
import { addDays, dayOf } from '../../engine/dates';
/** @import { EngineDataset } from '../../engine/types' */
import { labelOf, materialEntry } from '../../sdc/materialMaster';
// Material C4 — each material's MRP controller, narrowed per reader (MR-5 BR-04).
import { withMrpController } from './mrpControllerReadModel';
// Material C2 — supplier trade names, narrowed per reader (MR-3 BR-03).
import { materialNameRowsFor, withTradeName } from './materialNameReadModel';
// BL-194 — the supplier's feedstock confirmation in force (DRC-8).
import { withFeedstock } from './feedstockConfirmationReadModel';
import { FEEDS, dataHealth } from '../../engine/dataHealth';
import { currentDemandForecast, currentForecastBias, withOverrides } from './demandForecastRun';
import { forecastOverrideStore } from './stores/forecastOverrideStore';
import { overrideValue } from '../../engine/forecastOverrides';
/** @import { PreparedBacktest } from '../../engine/modelBacktest' */
import { modelBacktest, prepareBacktest } from '../../engine/modelBacktest';
/** @import { DemandRangeRun, Replay } from '../../engine/demandRange' */
import {
  DEFAULT_DEMAND_RANGE_OPTIONS,
  demandRange,
  rangeLevels,
  replayForecasts
} from '../../engine/demandRange';
import { DEFAULT_STOCK_ACCURACY_TOLERANCE } from '../../engine/stock';
import { agreedCfot, supplierCfot } from '../../engine/cfot';
import { lineHistories } from '../../engine/lines';
import { sdcClock } from '../../sdc/clock';
import { withOwnQualificationWarnings } from '../../sourcing/sourcingType';

/** REQ-E14-10 — the backtest's heavy half per engine dataset, keyed by hub date and the values it reads. */
const backtestMemo =
  /** @type {WeakMap<EngineDataset, { key: string; prep: PreparedBacktest; ms: number }>} */ (
    new WeakMap()
  );
/** REQ-E14-09 — the replay and the range per engine dataset (see getDemandForecast). */
const demandRangeMemo =
  /** @type {WeakMap<EngineDataset, { asOf: string; replay: Replay; levels: string; range: DemandRangeRun }>} */ (
    new WeakMap()
  );

/**
 * @template T
 * @param {T} value
 * @param {T | T[] | undefined} filter
 * @returns {boolean}
 */
const matchesList = (value, filter) => {
  if (filter === undefined) return true;
  return Array.isArray(filter) ? filter.includes(value) : value === filter;
};

/** @type {KpiSnapshot} */
const EMPTY_KPI_SNAPSHOT = {
  kpis: [],
  radar: [],
  trend: [],
  improvementActions: []
};

/** @type {KpiSnapshot} */
const SUP_007_KPI_SNAPSHOT = {
  kpis: KPIS,
  radar: RADAR_DATA,
  trend: WEEKLY_TREND,
  improvementActions: IMPROVEMENT_ACTIONS
};

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ **FAN-OUT IS NOT DEFERRED. IT IS IMPOSSIBLE ON THIS DATA, AND THE SENTENCE
// THAT STOOD HERE WAS FALSE IN BOTH ITS HALVES.**
//
// It read: *"Today every relocated supplier fixture is tagged sup-007; the
// snapshot is only meaningful when scope resolves to that supplier … Fan-out
// across suppliers is a deferred follow-up."*
//
//   · **"tagged sup-007" is false.** `KPIS` / `RADAR_DATA` / `WEEKLY_TREND` /
//     `IMPROVEMENT_ACTIONS` carry NO `supplierId` field — nothing in
//     `KpiPoint`, `RadarPoint` or `PerformancePoint` has one. They are untagged
//     and merely ASSOCIATED with sup-007 by the two functions below.
//   · **"deferred follow-up" is false**, and it is the more expensive half:
//     deferring says the derivation becomes possible once somebody gets to it.
//     It does not. Nobody should pick this up as ready work.
//
// ── WHY IT IS IMPOSSIBLE, MEASURED ───────────────────────────────────────────
//   1. **The seeded tenant's own figures are AUTHORED, not computed.** `KPIS`
//      is hand-written strings — `'87%'`, `'1.4 days'`, `'42 hrs'`. Nothing
//      derives them from a transaction, which is exactly what
//      `SupplierPerformance` already declares with
//      `<ProvenanceMarker capability="scorecards" />`. So a fan-out would not
//      DERIVE eleven scorecards; it would AUTHOR eleven sets of invented
//      numbers and give them the same marker.
//   2. **No tenant carries a 12-week series.** `WEEKLY_TREND` is twelve
//      hand-written points. The richest tenant has purchase orders in **3
//      distinct months**; sup-002 has **1**. A rolling-12-week trend cannot be
//      bucketed out of that for anyone — sup-007 included.
//   3. **8 of the 11 tenants that carry any row have NO ASN**, so ASN Accuracy
//      has no denominator at all. Only sup-002, sup-005 and sup-007 have one,
//      and each of the first two has exactly ONE ASN.
//   4. **An on-time rate would render a fabricated zero.** No tenant has more
//      than 3 purchase orders. sup-002 has 2 and BOTH are late, so a "derived"
//      OTIF is 0% — the plausible-wrong-value this platform refuses, reached
//      through honest-looking arithmetic. A thin real number is worse than a
//      stated absence.
//
//   ⚠️ **THE FIGURES ABOVE ARE A MEASUREMENT, NOT A CLAIM — AND ONE OF THEM WAS
//   WRONG ON ITS FIRST TELLING** (`FLOOR-IN-PROSE-01`). Item 3 was first
//   reported as *"5 of 11"* and re-derived to 8; the fix is to name the
//   derivation, not to write a fresher number. Re-run it over
//   `purchaseOrderStore.all()` and `asnStore.all()`: tenants = the union of
//   their `supplierId`s; no-ASN = that union minus the ASN store's; months =
//   distinct `orderDate.slice(0, 7)` per tenant. Measured 2026-08-28.
//
// ── WHAT HAPPENS INSTEAD, AND IT IS ALREADY PINNED ───────────────────────────
//   A tenant with no authored scorecard reads the empty snapshot, and
//   `SupplierPerformance` short-circuits to its `EmptyState` on
//   `kpis.length === 0` — no chart is drawn on nothing, and no zero is
//   rendered as a performance figure. **Verified on the built bundle**, seat
//   sup-002: zero `<text>`/`<tspan>` nodes, no `0%`.
//
//   ⚠️ **DO NOT ADD A TEST FOR THIS — IT HAS TWO, AND THEY WERE PROBED.**
//   Returning the seeded snapshot to every tenant is killed by
//   `scoping.contract.test.ts` *"getKpis: improvement actions are wired into the
//   snapshot"* AND by `SupplierPerformance.test.jsx` *"empty: shows EmptyState
//   for a supplier with no published scorecard"*. Leaking ONLY `kpis` — the
//   shape that slips past the contract test, which asserts `improvementActions`
//   — is still killed by the surface test, because it renders sup-002 through
//   the real service and gates on the same field the page does.
//
// ── FILED, NOT CHANGED (operator-agreed): THE BUYER BRANCH ───────────────────
//   The first line of `snapshotForScope` hands sup-007's scorecard to ANY
//   buyer, unlabelled. It is unreachable today — `useKpis`' only consumer is
//   `SupplierPerformance`, which returns `<NoSupplierIdentity/>` before it
//   reads when `supplierId` is null. Its fix is a SEAM SIGNATURE CHANGE:
//   `getKpis(scope)` takes no supplier id, so a buyer cannot name which
//   supplier it means, and a shipped contract test asserts today's behaviour.
//   That is an F1/F2 design decision, not a mock-layer edit.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {QueryScope} scope
 * @returns {KpiSnapshot}
 */
function snapshotForScope(scope) {
  if (scope.personaType === 'buyer') return SUP_007_KPI_SNAPSHOT;
  if (scope.supplierId === SUP_007_SUPPLIER_ID) return SUP_007_KPI_SNAPSHOT;
  return EMPTY_KPI_SNAPSHOT;
}

/**
 * @param {QueryScope} scope
 * @returns {PerformancePoint[]}
 */
function trendForScope(scope) {
  if (scope.personaType === 'buyer') return [...WEEKLY_TREND];
  if (scope.supplierId === SUP_007_SUPPLIER_ID) return [...WEEKLY_TREND];
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// THE INVOICE READ CLOCK — `INVOICE_NOW`, and why it is not `new Date()`.
//
// ⚠️ **THIS WAS THE LAST CLOCK-PROJECTED LABEL IN THE TREE STILL READING THE
// WALL CLOCK, AND THE REASON IS STRUCTURAL RATHER THAN AN OVERSIGHT.** Every
// other anchored family projects its clock-derived state ON A PAGE, and nine
// pages already carry `const TODAY = DECLARED_PRESENT` (`BuyerShipments`,
// `BuyerGoodsReceipt`, `BuyerContracts`, `BuyerCompliance`, `BuyerRisk`,
// `BuyerSourcing`, `SupplierDashboard`, `SupplierDocuments`,
// `SupplierStorefront`, plus `BuyerInventory`'s own `formatRelativeTime`).
// The invoice labels are projected HERE, at the service seam, one layer BELOW
// where that convention reached — so the fixtures were anchored at #354 while
// the thing that reads them was not, and the convention had nowhere to land.
//
// ── WHAT IT COSTS TO LEAVE IT ───────────────────────────────────────────────
//   Measured on the shifted corpus by executing THIS seam day by day: the
//   corpus' authored intent (exactly one overdue row) breaks 18 days after `P`,
//   and 40 days after `P` BOTH `Pending Match` and `Approved` render ZERO —
//   which is precisely the state #354 was built to repair, returning on a
//   calendar day with no commit involved. **And nothing would have said so:**
//   `clockDrift` binds to families a reader can still see a STORED clock-state
//   on, and `invoice` stores none (law 0.5 — `Overdue` is computed at read), so
//   `familyDrift` returns `computed` and the scheduled drift gate is silent for
//   this family at every date.
//
// ── WHY A CONSTANT AND NOT AN INJECTED CLOCK ────────────────────────────────
//   `sdcClock` is the injectable shape, and it says in its own header that it
//   is **the SDC loop's clock alone** — *"Non-SDC command stamps (invoice / PO /
//   RFQ / quotation) keep their own clocks."* Reusing it here would make this
//   read a member of a lane it is not in. The page convention is the precedent
//   that actually fits, and it is a plain constant; a second injectable clock
//   would be a wider abstraction than this read path needs.
//
// ── ⚠️ THE WRITE SIDE IS DELIBERATELY NOT MOVED, AND IT IS MEASURED ─────────
//   Commands still stamp the wall clock: `submittedDate` (and `dueDate`, as
//   `submittedDate + 30d`) at invoice creation, and `paymentDate` on the payment
//   settle. Walked end to end against this seam, BOTH clocks produce the SAME
//   label at every step — a fresh row's `dueDate` is `wall + 30d`, which can
//   never fall before `P` while the wall clock is at or after it, so a fresh row
//   can never read `Overdue` here; and `paymentDate` is only ever written onto
//   `Payment Released`, which is not `OVERDUE_ELIGIBLE` and therefore cannot
//   reach a label at all. **What DOES differ is a rendered date** — a payment
//   minted today reads 15 days after the declared present. That is a display
//   honesty question about write stamps, not a wrong label, and moving the
//   write clock would change `t_invoice_create`'s semantics. It is named here
//   rather than fixed silently.
// ─────────────────────────────────────────────────────────────────────────────
const INVOICE_NOW = `${DECLARED_PRESENT}T00:00:00.000Z`;

/**
 * REQ-E14-04 on the engine dataset, at the hub's present (or `asOf`), with the values in force.
 * @param {string} [asOf]
 * @returns {SafetyStockRun}
 */
function engineSafetyStock(asOf = dayOf(sdcClock.now())) {
  return safetyStockRun(engineDataset(), {
    ...DEFAULT_SAFETY_STOCK_OPTIONS,
    asOf,
    targets: engineServiceTargets(),
    safetyLeadTimePercentile: safetyLeadTimePercentile()
  });
}

/**
 * REQ-E14-03 → E14-05 → E14-03 at a day, with the values in force: E14-04's
 * safety stock and safety lead time feed the netting, E14-05 sizes every
 * warehouse at the cost rates in force (ENG-D6 placeholders), and the netting
 * re-runs on the orders it chose.
 *
 * BR-03's "already-planned order" is LAST WEEK'S RUN: the same chain as of
 * seven days earlier, computed now from the dataset (itself without a previous
 * plan). ⚠️ It is recomputed rather than stored, so a confirmation or line the
 * dataset gained since then is not unwound — the previous plan is the one last
 * week's inputs would give on today's record of them.
 * @param {string} asOf
 * @param {boolean} includeUnconfirmed
 * @param {boolean} withPrevious
 * @returns {ReturnType<typeof sizedRequirement> & { readonly data: EngineDataset; readonly previousAsOf: string | null }}
 */
function engineSizing(asOf, includeUnconfirmed, withPrevious) {
  const data = engineDataset();
  const base = defaultRequirementOptions(asOf);
  /** @type {Map<string, Map<string, number>> | undefined} */
  const previous = withPrevious
    ? plannedReceiptsOf(engineSizing(addDays(asOf, -7), false, false).plan)
    : undefined;
  return {
    data,
    previousAsOf: withPrevious ? addDays(asOf, -7) : null,
    ...sizedRequirement(
      data,
      {
        ...base,
        receipts: { ...base.receipts, includeUnconfirmed },
        ...requirementInputs(engineSafetyStock(asOf))
      },
      { costs: orderSizingCosts(), ...(previous ? { previous } : {}) }
    )
  };
}

/** @implements {IProcurementService} */
export class MockProcurementService {
  // ─── Purchase orders ──────────────────────────────────────────────────────

  /**
   * @param {QueryScope} scope
   * @param {POFilter} [filter]
   * @returns {Promise<Page<PurchaseOrder>>}
   */
  async getPurchaseOrders(scope, filter) {
    // Reads resolve from the mutable store (Step 3.6) so a confirmed PO is
    // reflected after the command mutates it — no page-local seeded copy.
    let rows = applySupplierScope(scope, purchaseOrderStore.all());
    if (filter?.supplierId) rows = rows.filter((p) => p.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((p) => matchesList(p.status, filter.status));
    if (filter?.dateFrom)
      rows = rows.filter(
        (p) => p.orderDate >= /** @type {NonNullable<typeof filter.dateFrom>} */ (filter.dateFrom)
      );
    if (filter?.dateTo)
      rows = rows.filter(
        (p) => p.orderDate <= /** @type {NonNullable<typeof filter.dateTo>} */ (filter.dateTo)
      );
    return { items: rows };
  }

  /**
   * @param {QueryScope} scope
   * @param {string} id
   * @returns {Promise<PurchaseOrder | null>}
   */
  async getPurchaseOrder(scope, id) {
    const { items } = await this.getPurchaseOrders(scope);
    return items.find((p) => p.id === id) ?? null;
  }

  // ─── Inventory ────────────────────────────────────────────────────────────

  /**
   * @param {QueryScope} scope
   * @param {InventoryFilter} [filter]
   * @returns {Promise<Page<InventoryPosition>>}
   */
  async getInventory(scope, filter) {
    // REQ-E08-01 — ONE inventory model, projected at read from the stock
    // submissions, PTI's SAP stock, in-transit ASNs and dispatch notices, and
    // the forecast. A supplier sees its own rows, and PTI stock only for the
    // materials its access covers (REQ-E08-03 AC-01) — read from the access
    // store on EVERY read, so a removal applies on the next page load.
    let rows = applySupplierScope(scope, allPositions());
    if (scope.personaType === 'supplier') {
      const grant = scope.supplierId ? grantFor(scope.supplierId) : undefined;
      rows = rows.map((p) => maskForSupplier(p, grant));
    }
    if (filter?.supplierId) rows = rows.filter((r) => r.supplierId === filter.supplierId);
    if (filter?.materialCode) rows = rows.filter((r) => r.materialCode === filter.materialCode);
    // DRC-D15 (BL-196) — PTI reads the system's ROP Supplier beside the
    // supplier's own reorder point, which is display only. A supplier reads none.
    if (scope.personaType === 'buyer' && rows.length > 0) {
      const system = systemRopSuppliers();
      rows = rows.map((r) => ({
        ...r,
        systemRopSupplier: system.get(`${r.supplierId}|${r.materialCode}`) ?? null
      }));
    }
    // Material C2 — the supplier's approved trade name beside PTI's description.
    // BL-194 (DRC-8) — the feedstock in force, as its own field beside SOH.
    return {
      items: rows.map((r) =>
        withFeedstock(withTradeName(withMrpController(r, r.materialCode, scope)))
      )
    };
  }

  // Material C2 (MR-3 BR-03) — narrowed in the read model: a supplier reads its
  // own assigned materials and names only.
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<MaterialNameRow>>}
   */
  async getMaterialNames(scope) {
    return { items: materialNameRowsFor(scope) };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<StockAccessGrant>>}
   */
  async getStockAccess(scope) {
    // REQ-E08-03 — PTI sees every supplier in the inventory model (an inactive
    // row where nothing was ever granted); a supplier sees only its own grant.
    /** @type {StockAccessGrant[]} */
    const rows = suppliersWithAssignments().map(
      (s) =>
        stockAccessStore.get(s.supplierId) ?? {
          supplierId: s.supplierId,
          supplierName: s.supplierName,
          active: false,
          materials: [],
          log: []
        }
    );
    return { items: applySupplierScope(scope, rows) };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<CapacityPlan>>}
   */
  async getCapacityPlans(scope) {
    // REQ-E08-04 — capacity against demand per supplier × material group.
    return { items: applySupplierScope(scope, allCapacityPlans()) };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<BlanketPoRunOut>>}
   */
  async getBlanketPoRunOuts(scope) {
    // CAP-9 — PTI's projection of its own blanket POs against the LTP; a
    // supplier reads none (the call-off page and the alert are PTI's).
    if (scope.personaType !== 'buyer') return { items: [] };
    return { items: allBlanketPoRunOuts() };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<DemandAnticipationSupplyRow>>}
   */
  async getDemandAnticipation(scope) {
    // CAP-10 — PTI's own plan, frozen per horizon; a supplier reads none.
    if (scope.personaType !== 'buyer') return { items: [] };
    // CAP-12 — with open supply, the gap and its proposal per week.
    // DRC-18 (BL-203) — with FG demand, LTP − FG demand and the consumption
    // moving average per week, read only.
    return { items: withLtpFgDemandRead(allDemandAnticipationWithSupply()) };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<DaHistoryRow>>}
   */
  async getDemandAnticipationHistory(scope) {
    // DRC-3 (BL-189), [Owner A10] — the audit view of every publication. PTI's
    // own plan: a supplier reads none (persona scoping, as getDemandAnticipation).
    // No business-role gate (CLAUDE.md §65; owner decision 2026-10-19).
    if (scope.personaType !== 'buyer') return { items: [] };
    return { items: allDemandAnticipationHistory() };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<PlanningGroupView>>}
   */
  async getPlanningGroups(scope) {
    // Material C5 (MR-8) — PTI sees every group with its change log. A supplier
    // sees only the groups holding materials it has capacity for, narrowed to
    // those materials, and no log (MAT-R4: it never learns another supplier's
    // materials or who at PTI changed what).
    const groups = allPlanningGroups();
    if (scope.personaType === 'buyer') return { items: groups };
    const mine = new Set(applySupplierScope(scope, allCapacityPlans()).flatMap((p) => p.materials));
    return {
      items: groups
        .map((g) => ({ ...g, materials: g.materials.filter((m) => mine.has(m)), history: [] }))
        .filter((g) => g.materials.length > 0)
    };
  }

  /**
   * @param {QueryScope} scope
   * @param {string} [checkDate]
   * @param {StockSimulationFilter} [filter]
   * @returns {Promise<Page<StockSimulationRow>>}
   */
  async getStockSimulation(scope, checkDate, filter) {
    // Material E2 (MR-7) — PTI's estimate; a supplier scope reads none.
    return { items: stockSimulationRows(scope, checkDate, filter) };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<InventoryAlert>>}
   */
  async getInventoryAlerts(scope) {
    // REQ-E08-05 — a supplier sees alerts about its own materials, never the
    // rules that read PTI stock.
    const rows = applySupplierScope(scope, allAlerts());
    const visible =
      scope.personaType === 'supplier'
        ? rows.filter((a) => !PTI_ONLY_RULES.includes(a.rule))
        : rows;
    // Material C4 — a material alert names its MRP controller; a capacity
    // alert's subject is a material group, which carries none.
    return { items: visible.map((a) => withMrpController(a, a.subject, scope)) };
  }

  // ─── Forecast collaboration (REQ-E06-01 to REQ-E06-03) ─────────────────────

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<ForecastVersionView>>}
   */
  async getForecastVersions(scope) {
    // BR-07 — a supplier sees only versions carrying its own lines, and only
    // its own row of who viewed them.
    const rows = allVersionViews();
    if (scope.personaType === 'buyer') return { items: rows };
    const sid = scope.supplierId;
    return {
      items: rows
        .filter((v) => v.suppliers.some((s) => s.supplierId === sid))
        .map((v) => ({ ...v, suppliers: v.suppliers.filter((s) => s.supplierId === sid) }))
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<ForecastCommitmentLine>>}
   */
  async getForecastCommitments(scope) {
    // BR-10 — PTI never reads a draft; a supplier reads its own lines with its drafts.
    if (scope.personaType === 'buyer') return { items: allCommitmentLines(null) };
    return { items: applySupplierScope(scope, allCommitmentLines(scope.supplierId)) };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<ForecastCoverageRow>>}
   */
  async getForecastCoverage(scope) {
    // REQ-E06-03 BR-07 — the planner's view; a supplier reads nothing here.
    if (scope.personaType !== 'buyer') return { items: [] };
    return { items: allCoverageRows() };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<FixedStockReconcileRow>>}
   */
  async getFixedStockReconcile(scope) {
    // DRC-15a BR-04 (was REQ-E06-04 BR-12) — the FEEDSTOCK reconcile. The method
    // keeps its contract name (C1-methods) since FS now reads "feedstock". The
    // planner reads every supplier; a supplier reads only its own rows, scoped
    // HERE so another supplier's figures never reach the page.
    return { items: applySupplierScope(scope, allFeedstockRows()) };
  }

  /**
   * @param {QueryScope} scope
   * @param {ReliabilityWindowWeeks} [windowWeeks]
   * @returns {Promise<Page<SupplierReliabilityView>>}
   */
  async getSupplierReliability(scope, windowWeeks = 26) {
    // REQ-E14-02, computed at read on the hub clock. BR-07 / ENG-D3: a supplier
    // gets ONLY its own row — the scope filter runs HERE, in the service, so
    // another supplier's figures never reach the page at all.
    const w = trailingWindow(sdcClock.now(), windowWeeks);
    const data = engineDataset();
    // BL-82 — CFOT on the same rows, with the same early rule as OTIF.
    const cfot = agreedCfot(lineHistories(data), w);
    /** @type {SupplierReliabilityView[]} */
    const rows = supplierReliability(data, w).map((r) => ({
      ...r,
      supplierName: forecastSupplierName(r.supplierId),
      cfot: supplierCfot(cfot, r.supplierId),
      windowFrom: w.from,
      windowTo: w.to
    }));
    return { items: applySupplierScope(scope, rows) };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<MaterialRequirementView | null>}
   */
  async getMaterialRequirement(scope, includeUnconfirmed = false) {
    // REQ-E14-03, computed at read on the hub clock. X-03: simulated engine
    // output is PTI's only — a supplier scope gets nothing.
    if (scope.personaType === 'supplier') return null;
    // E14-04 feeds the netting (its safety stock, and its safety lead time on
    // the release timing, each marked with where it came from); E14-05 sizes
    // the planned orders, and the netting re-runs on them.
    const { data, sized: run } = engineSizing(dayOf(sdcClock.now()), includeUnconfirmed, true);
    return {
      ...run,
      materials: run.materials.map((m) => ({
        ...m,
        materialLabel: labelOf(m.materialCode),
        supplierName: m.supplierId ? forecastSupplierName(m.supplierId) : null
      })),
      finishedGoodNames: Object.fromEntries(data.finishedGoods.map((f) => [f.skuCode, f.name]))
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<OrderPlanView | null>}
   */
  async getOrderPlan(scope) {
    // REQ-E14-05, computed at read on the hub clock with the cost rates in
    // force (X-05; ENG-D6 placeholders). PTI only (X-03).
    if (scope.personaType === 'supplier') return null;
    const { plan, sized, previousAsOf } = engineSizing(dayOf(sdcClock.now()), false, true);
    return {
      ...plan,
      planMadeAt: sized.planMadeAt,
      previousAsOf,
      warehouses: plan.warehouses.map((w) => ({
        ...w,
        materials: w.materials.map((m) => ({
          ...m,
          materialLabel: labelOf(m.materialCode),
          supplierName: m.supplierId ? forecastSupplierName(m.supplierId) : null
        }))
      }))
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<RescheduleView | null>}
   */
  async getReschedule(scope) {
    // REQ-E14-13, computed at read on the hub clock: the same sized chain the
    // Order plan reads (E14-04 → E14-03 → E14-05 → E14-03), E14-03's open PO
    // lines plus the Hub's open call-offs (ENG-B19), the cost rates and the
    // ENG-D15 threshold in force. PTI only (X-03).
    if (scope.personaType === 'supplier') return null;
    const now = sdcClock.now();
    const asOf = dayOf(now);
    const { data, sized } = engineSizing(asOf, false, true);
    const engineMaterials = new Set(data.materials.map((m) => m.materialCode));
    const callOffs = callOffOrderLines(
      callOffViews(callOffStore.all(), asnStore.all(), goodsReceiptStore.all(), now),
      asOf,
      DEFAULT_RECEIPT_OPTIONS.overdueGraceDays,
      engineMaterials
    );
    /** @type {OpenOrderLine[]} */
    const lines = [...poOrderLines(data, sized), ...callOffs];
    // REQ-E06-01 BR-05 — zone lengths per supplier × material group; the Firm
    // zone is the lead time the source carries (the dataset takes it from here).
    const byCode = new Map(data.materials.map((m) => [m.materialCode, m]));
    const terms = /** @type {Map<string, LineTerms>} */ (
      new Map(
        data.sources.map((s) => {
          const m = byCode.get(s.materialCode);
          const z = m
            ? zoneLengthsFor(
                s.supplierId,
                m.materialGroup ?? m.materialCode,
                STREAM_MATERIAL_TYPE[m.kind]
              )
            : null;
          return [
            termsKey(s.supplierId, s.materialCode),
            {
              leadTimeDays: s.leadTimeDays,
              firmDays: z?.firmDays ?? s.leadTimeDays,
              tradeOffDays: z?.tradeOffDays ?? 0,
              moq: s.moq,
              orderMultiple: s.orderMultiple
            }
          ];
        })
      )
    );
    const WINDOW_WEEKS = 26;
    const guard = planChangeGuard(data, now, WINDOW_WEEKS, lines);
    const costs = orderSizingCosts();
    const perPallet = new Map(data.volumes.map((v) => [v.materialCode, v.unitsPerPallet]));
    const run = reschedule({
      asOf,
      weeks: sized.weeks,
      warehouses: data.warehouses,
      materials: sized.materials.map((m) => ({
        materialCode: m.materialCode,
        kind: m.kind,
        uom: m.uom,
        startStock: m.startStock,
        safetyStock: m.safetyStock,
        gross: m.weeks.map((w) => w.gross),
        planned: m.weeks.map((w) => w.plannedReceipt),
        unitsPerPallet: perPallet.get(m.materialCode) ?? null
      })),
      lines,
      terms,
      costs: {
        rentIdrPerPalletWeek: costs.rentIdrPerPalletWeek,
        changePenaltyIdrPerPallet: costs.changePenaltyIdrPerPallet
      },
      thresholdWeeks: rescheduleOutThresholdWeeks(),
      addsToPlanChange: guard.adds,
      insideLeadTimeByMeasure: guard.inside
    });
    const last = sized.weeks[sized.weeks.length - 1];
    const unconfirmedPoLines = openReceipts(lineHistories(data), asOf, {
      ...DEFAULT_RECEIPT_OPTIONS,
      includeUnconfirmed: true
    }).filter((r) => !r.confirmed && r.weekStart <= last).length;
    /**
     * @param {string} materialCode
     * @param {string} supplierId
     */
    const names = (materialCode, supplierId) => ({
      materialLabel: labelOf(materialCode),
      supplierName: forecastSupplierName(supplierId),
      uom: byCode.get(materialCode)?.uom ?? /** @type {const} */ ('PCS')
    });
    return {
      ...run,
      planMadeAt: sized.planMadeAt,
      warehouses: run.warehouses.map((w) => ({
        ...w,
        proposals: w.proposals.map((p) => ({
          ...p,
          ...names(p.line.materialCode, p.line.supplierId)
        })),
        info: w.info.map((i) => ({ ...i, ...names(i.line.materialCode, i.line.supplierId) }))
      })),
      planChange: guard.baseline,
      planChangeWindowWeeks: WINDOW_WEEKS,
      unconfirmedPoLines,
      sapMarks: [...sapChangeMarkStore.all()].reverse(),
      // FUX-D3 — the warehouse-week decisions and the version each is judged against.
      warehouseDecisions: warehouseDecisionStore.all(),
      planVersions: {
        packaging: currentPlanVersion('packaging'),
        rawMaterial: currentPlanVersion('rawMaterial')
      }
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<StabilisedPlanView | null>}
   */
  async getStabilisedPlan(scope) {
    // REQ-E14-06, computed at read on the hub clock with the damping weight in
    // force (X-05, ENG-D9). PTI only: engine output on synthetic data is never
    // shown to a supplier (X-03), so a supplier scope gets nothing at all.
    if (scope.personaType === 'supplier') return null;
    const now = sdcClock.now();
    const asOf = dayOf(now);
    const data = engineDataset();
    const params = { ...DEFAULT_STABILISE_PARAMS, tradeOffWeight: stabiliseDampingWeight() };
    const { inputs, current } = stabiliseInputs(data, asOf, (d) => engineSafetyStock(d));
    const uom = new Map(
      current.materials.map((m) => /** @type {const} */ ([m.materialCode, m.uom]))
    );
    /**
     * @param {StabiliseRun} run
     * @returns {StabiliseRunView}
     */
    const named = (run) => ({
      ...run,
      series: run.series.map((x) => ({
        ...x,
        supplierName: forecastSupplierName(x.supplierId),
        materialLabel: labelOf(x.materialCode),
        uom: uom.get(x.materialCode) ?? /** @type {const} */ ('PCS')
      }))
    });
    return {
      asOf,
      planMadeAt: current.planMadeAt,
      params,
      versions: {
        packaging: versionDays(asOf, 'packaging'),
        rawMaterial: versionDays(asOf, 'rawMaterial')
      },
      engine: named(stabilisePlan(inputs, params)),
      sapHistory: named(stabilisePlan(planHistoryInputs(data, now, inputs), params)),
      rangeBuilt: true,
      rangePublished: false
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<DataHealthView | null>}
   */
  async getDataHealth(scope) {
    // REQ-E14-01, computed at read on the hub clock with the freshness limits
    // in force (X-05). PTI only (X-03). ⚠️ The synthetic dataset is generated
    // at the hub's present on every read, so every feed "arrived" at that
    // instant (ENG-B41); a real feed will carry its own arrival time. The
    // stock-accuracy tolerance is the one E14-03 flags with (ENG-D2).
    if (scope.personaType === 'supplier') return null;
    const now = sdcClock.now();
    const data = engineDataset();
    const report = dataHealth({
      data,
      now,
      arrivals: Object.fromEntries(FEEDS.map((f) => [f.feed, now])),
      limitsDays: feedFreshnessLimitsDays(),
      stockAccuracyTolerance: DEFAULT_STOCK_ACCURACY_TOLERANCE,
      context: { masterUom: (code) => materialEntry(code)?.canonicalUom ?? null }
    });
    return { ...report, provenance: data.provenance };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<DemandForecastView | null>}
   */
  async getDemandForecast(scope) {
    // REQ-E14-07, computed at read on the hub's date (X-01). PTI only: engine
    // output on synthetic data is never shown to a supplier (X-03). The run is
    // memoised per dataset (the dataset is itself memoised per present).
    // The forecast shown carries the planner overrides in force (REQ-E14-11
    // X-06, ENG-B103); the engine's own values stay beside it.
    if (scope.personaType === 'supplier') return null;
    const data = engineDataset();
    const run = currentDemandForecast();
    const asOf = run.asOf;
    // REQ-E14-09 — the range around the engine's forecast, with the administrator's
    // levels in force (X-05). The replay depends on the date only; the range also on the levels.
    const levels = rangeLevels(demandRangeExtraQuantilePct());
    let memo = demandRangeMemo.get(data);
    if (!memo || memo.asOf !== asOf || memo.levels !== levels.join()) {
      const replay = memo && memo.asOf === asOf ? memo.replay : replayForecasts({ ...data, asOf });
      const range = demandRange(
        { ...data, asOf },
        run,
        { ...DEFAULT_DEMAND_RANGE_OPTIONS, levels },
        replay
      );
      memo = { asOf, replay, levels: levels.join(), range };
      demandRangeMemo.set(data, memo);
    }
    return {
      ...run,
      ...withOverrides(run, forecastOverrideStore.all()),
      range: memo.range,
      provenance: data.provenance,
      materialPlanningSource: 'sapPlan'
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<ForecastBiasView | null>}
   */
  async getForecastBias(scope) {
    // REQ-E14-11, computed at read on the hub's date (X-01). PTI only (X-03).
    // BR-01 replays the engine at past origins (memoised with the run); the
    // override ledger starts empty — no override history is invented.
    if (scope.personaType === 'supplier') return null;
    const data = engineDataset();
    const run = currentDemandForecast();
    const bias = currentForecastBias();
    const records = forecastOverrideStore.all();
    const shown = withOverrides(run, records);
    const sales = new Map(
      data.sales.map((x) => /** @type {const} */ ([`${x.skuCode}|${x.weekStart}`, x]))
    );
    /**
     * @param {string} sku
     * @param {string} week
     */
    const actualOf = (sku, week) => {
      const row = sales.get(`${sku}|${week}`);
      return row && !row.stockout ? row.quantity : null;
    };
    return {
      ...bias,
      provenance: data.provenance,
      current: { weeks: run.weeks, skus: shown.skus, total: shown.total },
      overrides: [...records].reverse(),
      value: overrideValue(records, actualOf, run.asOf),
      serviceJudgement: 'awaitsBacktest',
      materialPlanningSource: 'sapPlan'
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<ModelBacktestView | null>}
   */
  async getModelBacktest(scope) {
    // REQ-E14-10, computed at read on the hub's date (X-01) with the
    // administrator's values in force (X-05). PTI only (X-03). The replay is
    // the heavy half and runs once per dataset, date, targets and cost rates;
    // selection under the MASC limit (ENG-D13) is cheap and runs every read.
    if (scope.personaType === 'supplier') return null;
    const data = engineDataset();
    const asOf = dayOf(sdcClock.now());
    const targets = engineServiceTargets();
    const rates = orderSizingCosts();
    const costs = {
      orderCostIdr: rates.orderCostIdr,
      holdingRatePerYear: rates.holdingRatePerYear
    };
    const key = JSON.stringify([asOf, targets, costs]);
    let hit = backtestMemo.get(data);
    if (!hit || hit.key !== key) {
      const t0 = performance.now();
      const prep = prepareBacktest({ data, asOf, targets, costs });
      hit = { key, prep, ms: performance.now() - t0 };
      backtestMemo.set(data, hit);
    }
    return {
      ...modelBacktest(hit.prep, backtestMascLimit()),
      provenance: data.provenance,
      materialPlanningSource: 'sapPlan',
      computedInMs: Math.round(hit.ms)
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<SafetyStockView | null>}
   */
  async getSafetyStock(scope) {
    // REQ-E14-04, computed at read on the hub clock with the administrator's
    // targets in force (X-05). PTI only (X-03).
    if (scope.personaType === 'supplier') return null;
    const asOf = dayOf(sdcClock.now());
    const run = engineSafetyStock(asOf);
    // BR-06 (BL-116, ENG-B52) — the last run of each stream is the same pure
    // function at the previous run date of its cadence (X-04), recomputed now.
    const previousAsOf = {
      packaging: previousRunDate('packaging', asOf),
      rawMaterial: previousRunDate('rawMaterial', asOf)
    };
    const changes = safetyStockChanges(run, {
      packaging: engineSafetyStock(previousAsOf.packaging),
      rawMaterial: engineSafetyStock(previousAsOf.rawMaterial)
    });
    // BL-193 (DRC-7) / BL-197 (DRC-11) — the OSIP inputs per material; the
    // page applies the rules (the default, or a switch variant).
    const osip = osipSafetyInputs();
    // BL-196 (DRC-D11) / BL-198 (DRC-12a) — each material's level and NPD tags.
    const rop = osipRopInputs(run.materials.map((m) => m.materialCode));
    return {
      ...run,
      previousAsOf,
      materials: run.materials.map((m) => ({
        ...m,
        materialLabel: labelOf(m.materialCode),
        supplierName: m.supplierId ? forecastSupplierName(m.supplierId) : null,
        change: /** @type {import('../../engine/safetyStock').SafetyStockChange} */ (
          changes.get(m.materialCode)
        ),
        osip: /** @type {import('../../transitions/osipSafetyRules').MaterialOsipInputs} */ (
          osip.get(m.materialCode)
        ),
        rop: /** @type {import('../../transitions/osipRopRules').MaterialRopInputs} */ (
          rop.get(m.materialCode)
        )
      }))
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<PrRecommendationView>>}
   */
  async getRopFisikPrRecommendations(scope) {
    // BL-199 (DRC-13 BR-02) — "Create a PR in SAP" when no umbrella PO balance
    // is left at ROP Fisik. A recommendation only: the hub posts nothing to
    // SAP. PTI only (X-03).
    if (scope.personaType !== 'buyer') return { items: [] };
    return { items: ropFisikPrRecommendations() };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<NpdReview>>}
   */
  async getNpdReviews(scope) {
    // DRC-12a (BL-198) — the planner's "Review ROP after first order" tasks,
    // raised once when a material's NPD tag drops. PTI only (X-03).
    if (scope.personaType !== 'buyer') return { items: [] };
    return { items: npdReviews() };
  }

  // ─── Sourcing ─────────────────────────────────────────────────────────────

  /**
   * @param {QueryScope} scope
   * @param {RFQFilter} [filter]
   * @returns {Promise<Page<RFQ>>}
   */
  async getRFQs(scope, filter) {
    // Reads resolve from the mutable RFQ store (Step 4 batch iv) so an awarded
    // RFQ is reflected after the command mutates it. The store seeds from the
    // fixtures, so initial reads are identical. RFQ scoping is not supplierId-
    // based: an RFQ is visible to suppliers whose id ∈ invitedSupplierIds.
    /** @type {RFQ[]} */
    let rows = [...rfqStore.all()];
    if (scope.personaType === 'supplier') {
      if (!scope.supplierId) return { items: [] };
      // ⚠️ PF-1a — A `Draft` RFQ IS NOT VISIBLE TO SUPPLIERS, AND THIS LINE IS
      // WHAT MAKES PUBLICATION AN ACT RATHER THAN A RELABEL.
      //
      // Membership alone used to decide visibility. That was harmless only
      // because no Draft fixture carried an invited supplier; the moment D-1
      // moved `t_rfq_create` to birth at Draft, EVERY newly-raised RFQ became a
      // Draft carrying the wizard's invited list — so an unpublished sourcing
      // event would have been on the supplier's board before the buyer published
      // it, and `t_rfq_publish` would have changed a label and nothing else.
      // Reported as a finding before it was fixed (`PF1A-DRAFT-RFQ-VISIBLE-01`).
      rows = rows.filter(
        (r) =>
          r.status !== 'Draft' &&
          r.invitedSupplierIds.includes(
            /** @type {NonNullable<typeof scope.supplierId>} */ (scope.supplierId)
          )
      );
      // RFx spec 2026-09-21 — THE CONFIDENTIALITY GATE IS A READ RULE. A
      // confidential RFQ reaches a supplier without its spec values, item notes
      // and attachments until that supplier accepts the terms; a screen that
      // only hid them would still hold them in the payload it was handed.
      const sid = scope.supplierId;
      rows = rows.map((r) =>
        r.confidential && !acceptanceOf(r.id, sid) ? maskConfidential(r) : r
      );
      // BL-147 (MAT-R4) — the publish warning names other invitees' level and
      // missing documents; a supplier reads only its own row.
      rows = rows.map((r) => withOwnQualificationWarnings(r, sid));
    }
    if (filter?.status) rows = rows.filter((r) => matchesList(r.status, filter.status));
    if (filter?.category)
      rows = rows.filter((r) => matchesList(r.materialCategory, filter.category));
    if (filter?.invitedSupplierId)
      rows = rows.filter((r) =>
        r.invitedSupplierIds.includes(
          /** @type {NonNullable<typeof filter.invitedSupplierId>} */ (filter.invitedSupplierId)
        )
      );
    return { items: rows };
  }

  /**
   * @param {QueryScope} scope
   * @param {QuotationFilter} [filter]
   * @returns {Promise<Page<Quotation>>}
   */
  async getQuotations(scope, filter) {
    // Reads resolve from the mutable quotation store (Step 4 batch iv) so an
    // awarded/rejected quote is reflected after the award cascade mutates it.
    let rows = applySupplierScope(scope, [...quotationStore.all()]);
    if (filter?.rfqId) rows = rows.filter((q) => q.rfqId === filter.rfqId);
    if (filter?.supplierId) rows = rows.filter((q) => q.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((q) => matchesList(q.status, filter.status));
    return { items: rows };
  }

  // ─── RFx management (REQ-E03-01 to REQ-E03-05) ────────────────────────────

  /**
   * @param {QueryScope} scope
   * @param {InviteeFilter} [filter]
   * @returns {Promise<Page<InviteeCandidate>>}
   */
  async getInviteeCandidates(scope, filter) {
    // REQ-E03-01 — the invitee search is PTI's. A supplier has no business
    // reading the roster it competes against, so the answer is empty rather
    // than narrowed: there is no "own row" of a competitor list.
    if (scope.personaType !== 'buyer') return { items: [] };
    return { items: [...matchingInvitees(filter ?? {})] };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<RfiEventView>>}
   */
  async getRfiEvents(scope) {
    // REQ-E03-02 — a supplier sees the RFIs it was invited to (never a Draft)
    // and only its own answers; PTI sees every event and only SUBMITTED
    // responses, so a half-filled draft never reaches the comparison.
    return {
      items: [
        ...rfiEventViews(rfxNow(), scope.personaType === 'buyer' ? null : (scope.supplierId ?? ''))
      ]
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<RfpEventView>>}
   */
  async getRfpEvents(scope) {
    return {
      items: [
        ...rfpEventViews(rfxNow(), scope.personaType === 'buyer' ? null : (scope.supplierId ?? ''))
      ]
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<NegotiationRoundView>>}
   */
  async getNegotiationRounds(scope) {
    // REQ-E03-05 BR-05 — a supplier reads only its own thread.
    return {
      items: [
        ...negotiationRoundViews(
          rfxNow(),
          scope.personaType === 'buyer' ? null : (scope.supplierId ?? '')
        )
      ]
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<RfpOfferRoundView>>}
   */
  async getRfpOfferRounds(scope) {
    // NR-2 — a supplier reads only the rounds it was asked to, and only its own
    // offer and firm prices; the rule lives in the read model, once.
    return {
      items: [
        ...rfpOfferRoundViews(
          rfxNow(),
          scope.personaType === 'buyer' ? null : (scope.supplierId ?? '')
        )
      ]
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<RfpAwardView>>}
   */
  async getRfpAwards(scope) {
    // RFx D2 — a supplier reads only its own outcome; the rule lives in the
    // read model, once.
    return {
      items: [...rfpAwardViews(scope.personaType === 'buyer' ? null : (scope.supplierId ?? ''))]
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<RfqEngagementView>>}
   */
  async getRfqEngagement(scope) {
    // RFx spec 2026-09-21 — the buyer reads every invitee's intent (with the
    // decline reason and words) and every acceptance; a supplier reads its own.
    return {
      items: [
        ...rfqEngagementViews(scope.personaType === 'buyer' ? null : (scope.supplierId ?? ''))
      ]
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<RfqClarificationView>>}
   */
  async getRfqClarifications(scope) {
    // RFx spec 2026-09-21 — the visibility rule lives in the read model, once:
    // a supplier reads its own questions and every PUBLISHED answer on an RFQ it
    // is invited to, never who else asked.
    return {
      items: [
        ...rfqClarificationViews(scope.personaType === 'buyer' ? null : (scope.supplierId ?? ''))
      ]
    };
  }

  /**
   * @param {QueryScope} scope
   * @param {string} rfqId
   * @returns {Promise<Page<RfqSupplierGateView>>}
   */
  async getRfqComplianceGate(scope, rfqId) {
    // CR-23 — the gate names why a supplier cannot be awarded; that is PTI's
    // read, not a competitor's. A supplier gets nothing rather than a list.
    if (scope.personaType !== 'buyer') return { items: [] };
    const rfq = rfqStore.get(rfqId);
    return { items: rfq ? [...rfqGateViews(rfq, rfxNow())] : [] };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<AwardView>>}
   */
  async getAwards(scope) {
    // REQ-E03-05 AC-05 — a supplier sees its own outcome and nobody else's share.
    return {
      items: [...awardViews(scope.personaType === 'buyer' ? null : (scope.supplierId ?? ''))]
    };
  }

  // ─── Fulfilment ───────────────────────────────────────────────────────────

  /**
   * @param {QueryScope} scope
   * @param {ShipmentFilter} [filter]
   * @returns {Promise<Page<Shipment>>}
   */
  async getShipments(scope, filter) {
    let rows = applySupplierScope(scope, mockShipments);
    if (filter?.supplierId) rows = rows.filter((s) => s.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((s) => matchesList(s.status, filter.status));
    if (filter?.mode) rows = rows.filter((s) => matchesList(s.mode, filter.mode));
    return { items: rows };
  }

  /**
   * @param {QueryScope} scope
   * @param {ASNFilter} [filter]
   * @returns {Promise<Page<ASN>>}
   */
  async getASNs(scope, filter) {
    // Reads resolve from the mutable ASN store (Step 4 batch i) so a created /
    // submitted ASN is reflected after the command mutates it.
    let rows = applySupplierScope(scope, asnStore.all());
    if (filter?.status) rows = rows.filter((a) => matchesList(a.status, filter.status));
    // Material C4 — each line names its material's MRP controller (MR-5 BR-03).
    return {
      items: rows.map((a) => ({
        ...a,
        lineItems: a.lineItems.map((li) => withMrpController(li, li.materialCode, scope))
      }))
    };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<CallOff>>}
   */
  async getCallOffs(scope) {
    // REQ-E09-03 — call-offs resolve from the mutable store. A supplier sees its
    // own released call-offs only: a draft or a dismissed draft is the planner's.
    const rows = applySupplierScope(scope, callOffStore.all());
    // BL-199 — the ROP Fisik figures behind a hub-made draft are PTI's.
    const visible =
      scope.personaType === 'supplier'
        ? rows
            .filter((c) => c.status !== 'Draft' && c.status !== 'Dismissed')
            .map(({ trigger: _ptiOnly, ...c }) => c)
        : rows;
    // Material C4 — each call-off names its material's MRP controller (MR-5 BR-03).
    return { items: visible.map((c) => withMrpController(c, c.materialCode, scope)) };
  }

  /**
   * @param {QueryScope} scope
   * @param {GRFilter} [filter]
   * @returns {Promise<Page<GoodsReceipt>>}
   */
  async getGoodsReceipts(scope, filter) {
    // Reads resolve from the mutable GR store (Step 4 batch ii) so a created /
    // inspected / posted GR is reflected after the command mutates it — mirrors
    // getASNs. The store seeds from the fixtures, so initial reads are identical.
    // REQ-E07-06 — the supplier's answer to a discrepancy (and PTI's resolution)
    // lives in its own store and is joined onto the receipt it answers.
    let rows = applySupplierScope(
      scope,
      goodsReceiptStore.all().map((g) => {
        const response = receiptDiscrepancyStore.get(g.id);
        return response ? { ...g, discrepancyResponse: response } : g;
      })
    );
    if (filter?.supplierId) rows = rows.filter((g) => g.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((g) => matchesList(g.status, filter.status));
    return { items: rows };
  }

  // ─── Finance ──────────────────────────────────────────────────────────────

  // DR-7: both invoice reads project from the ONE canonical `invoiceStore`, so
  // the two persona surfaces can never contradict. The buyer sees every invoice
  // EXCEPT drafts (Draft is supplier-private); the supplier sees its own,
  // drafts included. Labels + Overdue are computed at read (invoiceProjection).
  /**
   * @param {QueryScope} scope
   * @param {InvoiceFilter} [filter]
   * @returns {Promise<Page<BuyerInvoice>>}
   */
  async getBuyerInvoices(scope, filter) {
    const now = INVOICE_NOW;
    let rows = applySupplierScope(
      scope,
      invoiceStore
        .all()
        .filter((inv) => inv.status !== 'Draft')
        .map((inv) => toBuyerInvoice(inv, now))
    );
    if (filter?.supplierId) rows = rows.filter((i) => i.supplierId === filter.supplierId);
    if (filter?.poNumber) rows = rows.filter((i) => i.poNumber === filter.poNumber);
    if (filter?.status) rows = rows.filter((i) => i.status === filter.status);
    return { items: rows };
  }

  /**
   * @param {QueryScope} scope
   * @param {InvoiceFilter} [filter]
   * @returns {Promise<Page<SupplierInvoice>>}
   */
  async getSupplierInvoices(scope, filter) {
    const now = INVOICE_NOW;
    let rows = applySupplierScope(
      scope,
      invoiceStore.all().map((inv) => toSupplierInvoice(inv, now))
    );
    if (filter?.supplierId) rows = rows.filter((i) => i.supplierId === filter.supplierId);
    if (filter?.poNumber) rows = rows.filter((i) => i.poNumber === filter.poNumber);
    if (filter?.status) rows = rows.filter((i) => i.status === filter.status);
    return { items: rows };
  }

  // ─── Contracts ────────────────────────────────────────────────────────────

  /**
   * @param {QueryScope} scope
   * @param {ContractFilter} [filter]
   * @returns {Promise<Page<Contract>>}
   */
  async getContracts(scope, filter) {
    let rows = applySupplierScope(scope, mockContracts);
    if (filter?.supplierId) rows = rows.filter((c) => c.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((c) => matchesList(c.status, filter.status));
    if (filter?.type) rows = rows.filter((c) => matchesList(c.type, filter.type));
    return { items: rows };
  }

  /**
   * @param {QueryScope} scope
   * @param {ObligationFilter} [filter]
   * @returns {Promise<Page<ContractObligation>>}
   */
  async getObligations(scope, filter) {
    // Obligation has no supplierId — scope via parent contract.
    const { items: scopedContracts } = await this.getContracts(scope);
    const allowedContractIds = new Set(scopedContracts.map((c) => c.id));
    let rows = mockObligations.filter((o) => allowedContractIds.has(o.contractId));
    if (filter?.contractId) rows = rows.filter((o) => o.contractId === filter.contractId);
    if (filter?.status) rows = rows.filter((o) => matchesList(o.status, filter.status));
    if (filter?.owner) rows = rows.filter((o) => o.owner === filter.owner);
    return { items: rows };
  }

  // ─── Supplier-side supporting data ────────────────────────────────────────

  // §82 — reads resolve from the STORE, not the frozen fixture module: the
  // supplier-document verbs are wired now, so a declaration made this session
  // must be visible to the next read. Scoping is unchanged — a buyer gets the
  // superset (which is what makes compliance's review queue possible at all),
  // a supplier gets only its own rows.
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<SupplierDocument>>}
   */
  async getDocuments(scope) {
    return { items: applySupplierScope(scope, supplierDocumentStore.all()) };
  }

  /**
   * @param {QueryScope} scope
   * @param {string} [supplierId]
   * @returns {Promise<Page<CatalogItem>>}
   */
  async getStorefrontCatalog(scope, supplierId) {
    let rows = applySupplierScope(scope, INITIAL_CATALOG);
    if (supplierId) rows = rows.filter((r) => r.supplierId === supplierId);
    return { items: rows };
  }

  /**
   * @param {QueryScope} scope
   * @param {string} [supplierId]
   * @returns {Promise<Page<ProfileCert>>}
   */
  async getStorefrontCerts(scope, supplierId) {
    let rows = applySupplierScope(scope, INITIAL_CERTS);
    if (supplierId) rows = rows.filter((r) => r.supplierId === supplierId);
    return { items: rows };
  }

  /**
   * @param {QueryScope} scope
   * @param {string} [supplierId]
   * @returns {Promise<Page<StorefrontProduct>>}
   */
  async getStorefrontProducts(scope, supplierId) {
    let rows = applySupplierScope(scope, PRODUCTS_DEFAULT);
    if (supplierId) rows = rows.filter((r) => r.supplierId === supplierId);
    return { items: rows };
  }

  // ─── KPIs / performance ───────────────────────────────────────────────────

  /**
   * @param {QueryScope} scope
   * @returns {Promise<KpiSnapshot>}
   */
  async getKpis(scope) {
    return snapshotForScope(scope);
  }

  /**
   * @param {QueryScope} scope
   * @param {TrendRange} _range
   * @returns {Promise<Page<PerformancePoint>>}
   */
  async getPerformanceTrend(scope, _range) {
    return { items: trendForScope(scope) };
  }

  // ─── Supplier scorecard (buyer-only portfolio grading) ────────────────────
  // Cross-network grading view. Suppliers do not see it — [] for the supplier
  // persona (mirrors the analytics/engagement buyer-only aggregate pattern).

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<SupplierScorecard>>}
   */
  async getSupplierScorecards(scope) {
    return {
      // Material G1 (MR-10 BR-09) — the standing shown is the computed level.
      items:
        scope.personaType === 'buyer'
          ? SUPPLIER_SCORECARDS.map((s) => ({ ...s, qualification: qualificationFor(s.id).level }))
          : []
    };
  }

  // ─── Purchase requisitions (buyer-only ACQUIRE stage) ─────────────────────

  /**
   * @param {QueryScope} scope
   * @param {PRFilter} [filter]
   * @returns {Promise<Page<PurchaseRequisition>>}
   */
  async getRequisitions(scope, filter) {
    if (scope.personaType !== 'buyer') return { items: [] };
    // G1.1 — reads the mutable store (seeded from the fixture), so a PR pushed
    // through t_pr_create is list-visible, exactly as PO/ASN/invoice reads work.
    let rows = [...purchaseRequisitionStore.all()];
    if (filter?.status) rows = rows.filter((r) => matchesList(r.status, filter.status));
    return { items: rows };
  }

  // ─── PR-intake review (buyer-only; C7 §2 — one shape, two producers) ──────
  // FORK-B=(b2): the intake REVIEW surface's real read. Buyer-only, exactly like
  // getRequisitions — suppliers never see PR intake. Reads the promoted intake
  // fixture (both producers). Honest render (SIMULATED × PLANNED) is enforced at
  // the page via the purchaseRequisitions capability, not here.
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<PrIntakeLine>>}
   */
  async getPrIntake(scope) {
    if (scope.personaType !== 'buyer') return { items: [] };
    return { items: [...PR_INTAKE_LINES] };
  }

  // ─── Supplier applications (B2, buyer-only) ───────────────────────────────
  //
  // Reads the mutable store, so a row grown through `t_application_submit` is
  // list-visible exactly as a dispatched PR is. The store SEEDS EMPTY by ruling
  // — nobody has ever applied — so an empty page here is the truth and not a
  // failure, and the surface says which.
  //
  // ⚠️ **THE PERSONA GATE IS THE WHOLE TENANCY ANSWER ON THIS COLLECTION.**
  // There is no `supplierId` to narrow by; see the seam declaration. A supplier
  // scope gets `[]` — not a refusal, because a refusal would tell a supplier
  // that a collection it may not read EXISTS, which is the same existence
  // signal the filed dispatcher leak is about. Empty is the quieter answer.
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<SupplierApplication>>}
   */
  async getSupplierApplications(scope) {
    if (scope.personaType !== 'buyer') return { items: [] };
    return { items: [...supplierApplicationStore.all()] };
  }

  // ─── Buyer command-center aggregates (buyer-only) ─────────────────────────

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<ProductionLineRow>>}
   */
  async getProductionLines(scope) {
    return { items: scope.personaType === 'buyer' ? [...PRODUCTION_LINES] : [] };
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<SupplierHealthRow>>}
   */
  async getSupplierHealth(scope) {
    return { items: scope.personaType === 'buyer' ? [...SUPPLIER_HEALTH] : [] };
  }
}
