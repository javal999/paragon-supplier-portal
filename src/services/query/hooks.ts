// ────────────────────────────────────────────────────────────────────────────
// Domain query hooks — one per read method. Pages import THESE, never useQuery
// or useServiceQuery directly, so TanStack stays swappable and page migration
// is mechanical. Each hook returns the standard TanStack result
// ({ data, isPending, isError, error, ... }); list hooks resolve to Page<T>.
//
// Filter/param args are folded into the query key so distinct filters cache
// separately (on top of the scopeKey appended by useServiceQuery).
// ────────────────────────────────────────────────────────────────────────────

import { useServiceQuery } from './useServiceQuery';
import type {
  POFilter,
  InventoryFilter,
  RFQFilter,
  QuotationFilter,
  ShipmentFilter,
  ASNFilter,
  GRFilter,
  InvoiceFilter,
  ContractFilter,
  ObligationFilter,
  PRFilter,
  TrendRange,
  ReliabilityWindowWeeks,
} from '../data/types';
import type { InviteeFilter } from '../transitions/rfxRules';

// ─── Suppliers ──────────────────────────────────────────────────────────────

export const useSuppliers = () =>
  useServiceQuery(['suppliers', 'list'], (svc, scope) => svc.suppliers.list(scope));

export const useSupplier = (id: string) =>
  useServiceQuery(['suppliers', 'byId', id], (svc, scope) =>
    svc.suppliers.getById(scope, id),
  );

export const useCurrentSupplier = () =>
  useServiceQuery(['suppliers', 'current'], (svc, scope) =>
    svc.suppliers.getCurrent(scope),
  );

/** Material A1 — each supplier's stock update mode and its change history. */
export const useStockUpdateModes = () =>
  useServiceQuery(['suppliers', 'stockUpdateModes'], (svc, scope) =>
    svc.suppliers.getStockUpdateModes(scope),
  );

// ─── Procurement ──────────────────────────────────────────────────────────

export const usePurchaseOrders = (filter?: POFilter) =>
  useServiceQuery(['procurement', 'purchaseOrders', filter], (svc, scope) =>
    svc.procurement.getPurchaseOrders(scope, filter),
  );

export const usePurchaseOrder = (id: string) =>
  useServiceQuery(['procurement', 'purchaseOrder', id], (svc, scope) =>
    svc.procurement.getPurchaseOrder(scope, id),
  );

export const useInventory = (filter?: InventoryFilter) =>
  useServiceQuery(['procurement', 'inventory', filter], (svc, scope) =>
    svc.procurement.getInventory(scope, filter),
  );

/** Supplier access to PTI stock (REQ-E08-03). A supplier reads its own grant. */
export const useStockAccess = () =>
  useServiceQuery(['procurement', 'stockAccess'], (svc, scope) => svc.procurement.getStockAccess(scope));

/** Material C2 — supplier trade names per assigned material (MR-3). A supplier reads its own. */
export const useMaterialNames = () =>
  useServiceQuery(['procurement', 'materialNames'], (svc, scope) => svc.procurement.getMaterialNames(scope));

/** Capacity against demand per supplier × planning group (REQ-E08-04, MR-8 BR-04). */
export const useCapacityPlans = () =>
  useServiceQuery(['procurement', 'capacityPlans'], (svc, scope) => svc.procurement.getCapacityPlans(scope));

/** Material C5 (MR-8) — the planning groups, their materials and changes. */
export const usePlanningGroups = () =>
  useServiceQuery(['procurement', 'planningGroups'], (svc, scope) => svc.procurement.getPlanningGroups(scope));

/** Inventory and capacity alerts (REQ-E08-05). */
export const useInventoryAlerts = () =>
  useServiceQuery(['procurement', 'inventoryAlerts'], (svc, scope) => svc.procurement.getInventoryAlerts(scope));

/** Published forecast versions with who viewed them (REQ-E06-01). */
export const useForecastVersions = () =>
  useServiceQuery(['procurement', 'forecastVersions'], (svc, scope) => svc.procurement.getForecastVersions(scope));

/** The current forecast lines with their commitments (REQ-E06-02 / REQ-E06-03). */
export const useForecastCommitments = () =>
  useServiceQuery(['procurement', 'forecastCommitments'], (svc, scope) => svc.procurement.getForecastCommitments(scope));

/** Supplier coverage per material against Firm demand (REQ-E06-03 BR-07). */
export const useForecastCoverage = () =>
  useServiceQuery(['procurement', 'forecastCoverage'], (svc, scope) => svc.procurement.getForecastCoverage(scope));

/**
 * REQ-E06-04 — the fixed stock reconcile per supplier × material × cycle. The
 * planner reads every supplier; a supplier reads only its own rows (scoped in the service).
 */
export const useFixedStockReconcile = () =>
  useServiceQuery(['procurement', 'fixedStockReconcile'], (svc, scope) => svc.procurement.getFixedStockReconcile(scope));

/**
 * REQ-E14-02 — supplier reliability and PTI's plan-change measures. The planner
 * reads every supplier; a supplier reads only its own row (scoped in the service).
 */
export const useSupplierReliability = (windowWeeks: ReliabilityWindowWeeks = 26) =>
  useServiceQuery(['procurement', 'supplierReliability', windowWeeks], (svc, scope) =>
    svc.procurement.getSupplierReliability(scope, windowWeeks),
  );

/**
 * REQ-E14-03 — the material requirement run (PTI only). `includeUnconfirmed`
 * is the planner's AC-02 choice: count unconfirmed open lines, marked.
 */
export const useMaterialRequirement = (includeUnconfirmed = false) =>
  useServiceQuery(['procurement', 'materialRequirement', includeUnconfirmed], (svc, scope) =>
    svc.procurement.getMaterialRequirement(scope, includeUnconfirmed),
  );

/** REQ-E14-04 — safety stock, safety lead time and reorder point (PTI only). */
export const useSafetyStock = () =>
  useServiceQuery(['procurement', 'safetyStock'], (svc, scope) => svc.procurement.getSafetyStock(scope));

/** REQ-E14-05 — the order plan: sized orders, warehouse fill and rented space (PTI only). */
export const useOrderPlan = () =>
  useServiceQuery(['procurement', 'orderPlan'], (svc, scope) => svc.procurement.getOrderPlan(scope));

/** REQ-E14-13 — reschedule or cancel open orders for warehouse relief (PTI only). */
export const useReschedule = () =>
  useServiceQuery(['procurement', 'reschedule'], (svc, scope) => svc.procurement.getReschedule(scope));

/** REQ-E14-06 — the plan stabilised before publication (PTI only). */
export const useStabilisedPlan = () =>
  useServiceQuery(['procurement', 'stabilisedPlan'], (svc, scope) => svc.procurement.getStabilisedPlan(scope));

/** REQ-E14-01 — data health of the forecast engine's inputs (PTI only). */
export const useDataHealth = () =>
  useServiceQuery(['procurement', 'dataHealth'], (svc, scope) => svc.procurement.getDataHealth(scope));

/** REQ-E14-07 — the finished-goods demand forecast (PTI only). */
export const useDemandForecast = () =>
  useServiceQuery(['procurement', 'demandForecast'], (svc, scope) => svc.procurement.getDemandForecast(scope));

/** REQ-E14-11 — forecast bias, the planner override ledger and override value (PTI only). */
export const useForecastBias = () =>
  useServiceQuery(['procurement', 'forecastBias'], (svc, scope) => svc.procurement.getForecastBias(scope));
/** REQ-E14-10 — the model backtest (PTI only). */
export const useModelBacktest = () =>
  useServiceQuery(['procurement', 'modelBacktest'], (svc, scope) => svc.procurement.getModelBacktest(scope));

// ── RFx management (REQ-E03-01 to REQ-E03-05) ──────────────────────────────

/**
 * REQ-E03-01 — the invitee search. The FILTER IS PART OF THE QUERY KEY, so two
 * different filters are two different cache entries rather than one entry whose
 * contents depend on whichever filter asked last.
 */
export const useInviteeCandidates = (filter?: InviteeFilter) =>
  useServiceQuery(['procurement', 'inviteeCandidates', filter], (svc, scope) =>
    svc.procurement.getInviteeCandidates(scope, filter),
  );

/** REQ-E03-02 — RFI events with their invitees and visible responses. */
export const useRfiEvents = () =>
  useServiceQuery(['procurement', 'rfiEvents'], (svc, scope) => svc.procurement.getRfiEvents(scope));

/** REQ-E03-04 — RFP events with their commercial terms and proposals. */
export const useRfpEvents = () =>
  useServiceQuery(['procurement', 'rfpEvents'], (svc, scope) => svc.procurement.getRfpEvents(scope));

/** REQ-E03-05 — negotiation rounds. A supplier reads only its own thread. */
export const useNegotiationRounds = () =>
  useServiceQuery(['procurement', 'negotiationRounds'], (svc, scope) =>
    svc.procurement.getNegotiationRounds(scope),
  );

/** NR-2 — firm-offer rounds on an RFP. A supplier reads only rounds it was asked to. */
export const useRfpOfferRounds = () =>
  useServiceQuery(['procurement', 'rfpOfferRounds'], (svc, scope) => svc.procurement.getRfpOfferRounds(scope));

/** RFx D2 — awards on an RFP. A supplier reads only its own outcome. */
export const useRfpAwards = () =>
  useServiceQuery(['procurement', 'rfpAwards'], (svc, scope) => svc.procurement.getRfpAwards(scope));

/** RFx spec 2026-09-21 — invitees' intent and confidentiality acceptance. */
export const useRfqEngagement = () =>
  useServiceQuery(['procurement', 'rfqEngagement'], (svc, scope) => svc.procurement.getRfqEngagement(scope));

/** RFx spec 2026-09-21 — clarification Q&A, as the reader may see it. */
export const useRfqClarifications = () =>
  useServiceQuery(['procurement', 'rfqClarifications'], (svc, scope) => svc.procurement.getRfqClarifications(scope));

/** CR-23 — the compliance gate for every invitee and bidder of one RFQ (PTI only). */
export const useRfqComplianceGate = (rfqId: string | null | undefined) =>
  useServiceQuery(['procurement', 'rfqComplianceGate', rfqId ?? ''], (svc, scope) =>
    rfqId ? svc.procurement.getRfqComplianceGate(scope, rfqId) : Promise.resolve({ items: [] }),
  );

/** REQ-E03-05 — recorded awards. A supplier reads only its own outcome. */
export const useAwards = () =>
  useServiceQuery(['procurement', 'awards'], (svc, scope) => svc.procurement.getAwards(scope));

export const useRFQs = (filter?: RFQFilter) =>
  useServiceQuery(['procurement', 'rfqs', filter], (svc, scope) =>
    svc.procurement.getRFQs(scope, filter),
  );

export const useQuotations = (filter?: QuotationFilter) =>
  useServiceQuery(['procurement', 'quotations', filter], (svc, scope) =>
    svc.procurement.getQuotations(scope, filter),
  );

export const useShipments = (filter?: ShipmentFilter) =>
  useServiceQuery(['procurement', 'shipments', filter], (svc, scope) =>
    svc.procurement.getShipments(scope, filter),
  );

export const useASNs = (filter?: ASNFilter) =>
  useServiceQuery(['procurement', 'asns', filter], (svc, scope) =>
    svc.procurement.getASNs(scope, filter),
  );

/** Call-offs under umbrella POs (REQ-E09-03). A supplier's read omits drafts. */
export const useCallOffs = () =>
  useServiceQuery(['procurement', 'callOffs'], (svc, scope) => svc.procurement.getCallOffs(scope));

export const useGoodsReceipts = (filter?: GRFilter) =>
  useServiceQuery(['procurement', 'goodsReceipts', filter], (svc, scope) =>
    svc.procurement.getGoodsReceipts(scope, filter),
  );

export const useBuyerInvoices = (filter?: InvoiceFilter) =>
  useServiceQuery(['procurement', 'buyerInvoices', filter], (svc, scope) =>
    svc.procurement.getBuyerInvoices(scope, filter),
  );

export const useSupplierInvoices = (filter?: InvoiceFilter) =>
  useServiceQuery(['procurement', 'supplierInvoices', filter], (svc, scope) =>
    svc.procurement.getSupplierInvoices(scope, filter),
  );

export const useContracts = (filter?: ContractFilter) =>
  useServiceQuery(['procurement', 'contracts', filter], (svc, scope) =>
    svc.procurement.getContracts(scope, filter),
  );

export const useObligations = (filter?: ObligationFilter) =>
  useServiceQuery(['procurement', 'obligations', filter], (svc, scope) =>
    svc.procurement.getObligations(scope, filter),
  );

export const useDocuments = () =>
  useServiceQuery(['procurement', 'documents'], (svc, scope) =>
    svc.procurement.getDocuments(scope),
  );

export const useStorefrontCatalog = (supplierId?: string) =>
  useServiceQuery(['procurement', 'storefrontCatalog', supplierId], (svc, scope) =>
    svc.procurement.getStorefrontCatalog(scope, supplierId),
  );

export const useStorefrontCerts = (supplierId?: string) =>
  useServiceQuery(['procurement', 'storefrontCerts', supplierId], (svc, scope) =>
    svc.procurement.getStorefrontCerts(scope, supplierId),
  );

export const useStorefrontProducts = (supplierId?: string) =>
  useServiceQuery(['procurement', 'storefrontProducts', supplierId], (svc, scope) =>
    svc.procurement.getStorefrontProducts(scope, supplierId),
  );

export const useKpis = () =>
  useServiceQuery(['procurement', 'kpis'], (svc, scope) => svc.procurement.getKpis(scope));

export const usePerformanceTrend = (range: TrendRange) =>
  useServiceQuery(['procurement', 'performanceTrend', range], (svc, scope) =>
    svc.procurement.getPerformanceTrend(scope, range),
  );

export const useSupplierScorecards = () =>
  useServiceQuery(['procurement', 'supplierScorecards'], (svc, scope) =>
    svc.procurement.getSupplierScorecards(scope),
  );

export const useRequisitions = (filter?: PRFilter) =>
  useServiceQuery(['procurement', 'requisitions', filter], (svc, scope) =>
    svc.procurement.getRequisitions(scope, filter),
  );

/**
 * The supplier applications a buyer reviews (B2).
 *
 * Buyer-only at the seam; a supplier scope resolves an empty page rather than a
 * refusal — see `getSupplierApplications` for why empty is the quieter answer.
 */
export const useSupplierApplications = () =>
  useServiceQuery(['procurement', 'supplierApplications'], (svc, scope) =>
    svc.procurement.getSupplierApplications(scope),
  );

export const useIntakeReview = () =>
  useServiceQuery(['procurement', 'prIntake'], (svc, scope) =>
    svc.procurement.getPrIntake(scope),
  );

export const useProductionLines = () =>
  useServiceQuery(['procurement', 'productionLines'], (svc, scope) =>
    svc.procurement.getProductionLines(scope),
  );

export const useSupplierHealth = () =>
  useServiceQuery(['procurement', 'supplierHealth'], (svc, scope) =>
    svc.procurement.getSupplierHealth(scope),
  );

// ─── Risk ─────────────────────────────────────────────────────────────────

export const useRiskAlerts = () =>
  useServiceQuery(['risk', 'alerts'], (svc, scope) => svc.risk.getRiskAlerts(scope));

export const useGeoRisks = () =>
  useServiceQuery(['risk', 'geo'], (svc, scope) => svc.risk.getGeoRisks(scope));

export const useExposure = () =>
  useServiceQuery(['risk', 'exposure'], (svc, scope) => svc.risk.getExposure(scope));

export const useScenarios = () =>
  useServiceQuery(['risk', 'scenarios'], (svc, scope) => svc.risk.getScenarios(scope));

export const useCompliance = () =>
  useServiceQuery(['risk', 'compliance'], (svc, scope) => svc.risk.getCompliance(scope));

// I3.1 — the canonical compliance registry (census #11–15). supplierId-keyed;
// consumed by the I3.2 surface re-point (BuyerCompliance → useDataService()).
export const useComplianceRegistry = () =>
  useServiceQuery(['risk', 'complianceRegistry'], (svc, scope) =>
    svc.risk.getComplianceRegistry(scope),
  );

export const useCommodities = () =>
  useServiceQuery(['risk', 'commodities'], (svc, scope) => svc.risk.getCommodities(scope));

// ─── Analytics (buyer-side; discrete per-read so each chart loads on its own) ─

export const useAnalyticsSummary = () =>
  useServiceQuery(['analytics', 'summary'], (svc, scope) =>
    svc.analytics.getSummary(scope),
  );

export const useSpendByCategory = () =>
  useServiceQuery(['analytics', 'spendByCategory'], (svc, scope) =>
    svc.analytics.getSpendByCategory(scope),
  );

export const useTopSuppliers = () =>
  useServiceQuery(['analytics', 'topSuppliers'], (svc, scope) =>
    svc.analytics.getTopSuppliers(scope),
  );

export const useOtifTrend = () =>
  useServiceQuery(['analytics', 'otifTrend'], (svc, scope) =>
    svc.analytics.getOtifTrend(scope),
  );

export const usePoVolumeTrend = () =>
  useServiceQuery(['analytics', 'poVolumeTrend'], (svc, scope) =>
    svc.analytics.getPoVolumeTrend(scope),
  );

export const useChannelMix = () =>
  useServiceQuery(['analytics', 'channelMix'], (svc, scope) =>
    svc.analytics.getChannelMix(scope),
  );

export const useSupplierPerformance = () =>
  useServiceQuery(['analytics', 'supplierPerformance'], (svc, scope) =>
    svc.analytics.getSupplierPerformance(scope),
  );

// ─── Discovery ──────────────────────────────────────────────────────────────

export const useRecommended = () =>
  useServiceQuery(['discovery', 'recommended'], (svc, scope) =>
    svc.discovery.getRecommended(scope),
  );

export const useQualifications = () =>
  useServiceQuery(['discovery', 'qualifications'], (svc, scope) =>
    svc.discovery.getQualifications(scope),
  );

export const useMarketIntel = () =>
  useServiceQuery(['discovery', 'marketIntel'], (svc, scope) =>
    svc.discovery.getMarketIntel(scope),
  );

export const useSingleSourceItems = () =>
  useServiceQuery(['discovery', 'singleSource'], (svc, scope) =>
    svc.discovery.getSingleSourceItems(scope),
  );

// ─── Enforcement (CP-3 · E4) ────────────────────────────────────────────────

/**
 * The append-only enforcement-setting LEDGER — every recorded act, oldest first.
 *
 * ⚠️ **THE LEDGER, NEVER THE ANSWER.** There is deliberately no
 * `useEffectiveEnforcement(checkId)`: the mode in force is clock-derived, so a
 * hook that answered it would have to read a clock the caller is supposed to
 * supply as an argument (law 0.5). Consumers call `effectiveEnforcement(ledger,
 * checkId, instant)` with an instant they captured themselves — the
 * `effectivePin` shape, and the reason the seam has one method.
 *
 * ⚠️ BUYER-SCOPED. A supplier persona gets `SCOPE_DENIED`, not an empty page.
 */
export const useEnforcementSettings = () =>
  useServiceQuery(['enforcement', 'settings'], (svc, scope) =>
    svc.enforcement.getEnforcementSettings(scope),
  );
