/** @import React from 'react' */
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LegacyRedirect from './LegacyRedirect';
import { CurrentIdentityProvider } from '@context/CurrentIdentityContext';
import { mockIdentitySource } from '@context/identitySources';
import LoadingState from '@components/ui-v2/LoadingState';
import Login from '@pages/auth/Login';

// V2 pages (canonical)
import BuyerDashboard from '@pages-v2/BuyerDashboard';
import BuyerHome from '@pages-v2/BuyerHome';
import SupplierHome from '@pages-v2/SupplierHome';
import BuyerOrderSummary from '@pages-v2/BuyerOrderSummary';
import SupplierOrderSummary from '@pages-v2/SupplierOrderSummary';
import BuyerSuppliers from '@pages-v2/BuyerSuppliers';
import BuyerSupplierProfile from '@pages-v2/BuyerSupplierProfile';
import Marketplace from '@pages-v2/Marketplace';
import SupplierStorefrontV2 from '@pages-v2/SupplierStorefront';
import BuyerOrders from '@pages-v2/BuyerOrders';
import BuyerSourcing from '@pages-v2/BuyerSourcing';
import BuyerRfi from '@pages-v2/BuyerRfi';
import BuyerRfp from '@pages-v2/BuyerRfp';
import BuyerRfpEvent from '@pages-v2/BuyerRfp/BuyerRfpEvent';
import BuyerRfiEvent from '@pages-v2/BuyerRfiEvent';
import BuyerSourcingEvent from '@pages-v2/BuyerSourcingEvent';
import SupplierRfi from '@pages-v2/SupplierRfi';
import SupplierRfp from '@pages-v2/SupplierRfp';
import SupplierNegotiations from '@pages-v2/SupplierNegotiations';
import BuyerContracts from '@pages-v2/BuyerContracts';
import BuyerContractDetail from '@pages-v2/BuyerContractDetail';
import BuyerDeliveryAgreements from '@pages-v2/BuyerDeliveryAgreements';
import BuyerCallOffs from '@pages-v2/BuyerCallOffs';
import BuyerChase from '@pages-v2/BuyerChase';
import BuyerInventory from '@pages-v2/BuyerInventory';
import BuyerStockSimulation from '@pages-v2/BuyerStockSimulation';
import BuyerCapacity from '@pages-v2/BuyerCapacity';
import BuyerAlerts from '@pages-v2/BuyerAlerts';
import BuyerSupplierAccess from '@pages-v2/BuyerSupplierAccess';
import BuyerShipments from '@pages-v2/BuyerShipments';
import BuyerGoodsReceipt from '@pages-v2/BuyerGoodsReceipt';
import BuyerDiscovery from '@pages-v2/BuyerDiscovery';
import BuyerRequisitions from '@pages-v2/BuyerRequisitions';
import BuyerSupplierApplications from '@pages-v2/BuyerSupplierApplications';
import IntakeReview from '@pages-v2/IntakeReview';
import BuyerInvoices from '@pages-v2/BuyerInvoices';
import BuyerScorecard from '@pages-v2/BuyerScorecard';
import BuyerAnalytics from '@pages-v2/BuyerAnalytics';
import BuyerRisk from '@pages-v2/BuyerRisk';
import BuyerCommHub from '@pages-v2/BuyerCommHub';
import BuyerCompliance from '@pages-v2/BuyerCompliance';
import ProcessFlows from '@pages-v2/ProcessFlows';
import InterfaceMonitor from '@pages-v2/InterfaceMonitor';
import AdminWorkingCalendar from '@pages-v2/admin/AdminWorkingCalendar';
import AdminThreePls from '@pages-v2/admin/AdminThreePls';
import AdminSuppliers from '@pages-v2/admin/AdminSuppliers';
import AdminQualification from '@pages-v2/admin/AdminQualification';
import AdminSourcingTypes from '@pages-v2/admin/AdminSourcingTypes';
import AdminPlanningGroups from '@pages-v2/admin/AdminPlanningGroups';
import AdminMrpControllers from '@pages-v2/admin/AdminMrpControllers';
import BuyerTradeNames from '@pages-v2/materials/BuyerTradeNames';
import { AdminAlertThresholds, AdminTolerances } from '@pages-v2/admin/AdminRuleValues';
import AdminReasonCodes from '@pages-v2/admin/AdminReasonCodes';
import RolesCatalogue from '@pages-v2/RolesCatalogue';
import RoleDetail from '@pages-v2/RoleDetail';
// GL-1 — the glossary surface. PERSONA-NEUTRAL by route, deliberately: the term
// chips that lead here sit on buyer AND supplier refusal sites, so a
// `/buyer/...` path would have sent every supplier out of their own shell.
import Glossary from '@pages-v2/Glossary';
import SupplierDashboardV2 from '@pages-v2/SupplierDashboard';
import SupplierMyStorefront from '@pages-v2/SupplierMyStorefront';
import SupplierDocumentsV2 from '@pages-v2/SupplierDocuments';
import SupplierWhatsApp from '@pages-v2/SupplierWhatsApp';
import CommHubInbound from '@pages-v2/CommHubInbound';
import SupplierOrders from '@pages-v2/SupplierOrders';
import SupplierRFQsV2 from '@pages-v2/SupplierRFQs';
import SupplierShipments from '@pages-v2/SupplierShipments';
import SupplierGoodsReceipts from '@pages-v2/SupplierGoodsReceipts';
import SupplierInvoicesV2 from '@pages-v2/SupplierInvoices';
import SupplierInventoryV2 from '@pages-v2/SupplierInventory';
import SupplierRegistrationV2 from '@pages-v2/SupplierRegistration';
import SupplierDeliveryAgreements from '@pages-v2/SupplierDeliveryAgreements';
import SupplierCallOffs from '@pages-v2/SupplierCallOffs';
import SupplierCapacity from '@pages-v2/SupplierCapacity';
import SupplierDemandAnticipation from '@pages-v2/SupplierDemandAnticipation';
import BuyerCommitments from '@pages-v2/BuyerCommitments';
import BuyerReliability from '@pages-v2/BuyerReliability';
import {
  BuyerFixedStockReconcile,
  SupplierFixedStockReconcile
} from '@pages-v2/FixedStockReconcile';
import BuyerMaterialRequirement from '@pages-v2/BuyerMaterialRequirement';
import BuyerSafetyStock from '@pages-v2/BuyerSafetyStock';
import BuyerOrderPlan from '@pages-v2/BuyerOrderPlan';
import BuyerThisWeek from '@pages-v2/BuyerThisWeek';
import BuyerReschedule from '@pages-v2/BuyerReschedule';
import BuyerDemandAnticipation from '@pages-v2/BuyerDemandAnticipation';
import BuyerDemandAnticipationHistory from '@pages-v2/BuyerDemandAnticipationHistory';
import BuyerWhatIfSandbox from '@pages-v2/BuyerWhatIfSandbox';
import BuyerStabilise from '@pages-v2/BuyerStabilise';
import BuyerDataHealth from '@pages-v2/BuyerDataHealth';
import BuyerDemandForecast from '@pages-v2/BuyerDemandForecast';
import BuyerModelBacktest from '@pages-v2/BuyerModelBacktest';
import SupplierForecastCommitments from '@pages-v2/SupplierForecastCommitments';
import SupplierPerformance from '@pages-v2/SupplierPerformance';
import NotFound from '@pages-v2/NotFound';

// Stage G · G1.2a — the FIRST route-split on main. The react-datasheet-grid
// engine ships in this page's own async chunk (lazy import), so it never enters
// the main entry chunk; first paint stays flat.
const PlanGrid = lazy(() => import('@pages-v2/PlanGrid'));
// SDC-1b — the second DSG consumer. Also lazy, so Vite hoists the shared
// engine into one common async chunk; the entry chunk stays flat.
const BuyerCollaboration = lazy(() => import('@pages-v2/BuyerCollaboration'));
// SDC-2b — the P1 supplier submission surface (no DSG; lazy keeps the SDC
// module out of the entry chunk).
const SupplierForecasts = lazy(() => import('@pages-v2/SupplierForecasts'));

import { ToastProvider } from '@hooks/useToast';
import Toaster from '@components/ui-v2/Toaster';

/** @type {React.FC} */
const AppRouter = () => {
  return (
    <HashRouter>
      <ToastProvider>
        <Toaster />
        <CurrentIdentityProvider source={mockIdentitySource}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<SupplierRegistrationV2 />} />
            <Route path="/buyer/home" element={<BuyerHome />} />
            <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
            <Route path="/buyer/suppliers" element={<BuyerSuppliers />} />
            <Route path="/buyer/suppliers/:id" element={<BuyerSupplierProfile />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/supplier/:id" element={<SupplierStorefrontV2 />} />
            <Route path="/buyer/order-summary" element={<BuyerOrderSummary />} />
            <Route path="/buyer/orders" element={<BuyerOrders />} />
            {/* Operator decision 2026-09-21 — RFI, RFQ and RFP are three modules,
              each with its own menu item and route (reverses NV-06's one
              sourcing item). An event's detail page sits under /buyer/rfq, so
              NV-03's "a menu item stays highlighted on its detail pages" holds. */}
            <Route path="/buyer/rfi" element={<BuyerRfi />} />
            {/* RFx UX 2A (B-09, owner ruling 2026-10-19) — the RFI and RFP
              details are their own pages, like the RFQ event page. The old
              `?open=<id>` deep links redirect here from the list pages. */}
            <Route path="/buyer/rfi/:rfiId" element={<BuyerRfiEvent />} />
            <Route path="/buyer/rfq" element={<BuyerSourcing />} />
            <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
            <Route path="/buyer/rfp" element={<BuyerRfp />} />
            <Route path="/buyer/rfp/:rfpId" element={<BuyerRfpEvent />} />
            {/* The retired paths redirect, keeping query, state and params, so old
              links in tasks, toasts and notifications still land. */}
            <Route path="/buyer/sourcing" element={<LegacyRedirect to="/buyer/rfq" />} />
            <Route path="/buyer/sourcing/rfi" element={<LegacyRedirect to="/buyer/rfi" />} />
            <Route path="/buyer/sourcing/rfp" element={<LegacyRedirect to="/buyer/rfp" />} />
            <Route
              path="/buyer/sourcing/rfq/:rfqId"
              element={<LegacyRedirect to="/buyer/rfq/:rfqId" />}
            />
            {/* Phase A/1 — the recommend-first triage that precedes the plan-grid
              push. Plain DOM (no grid engine) — stays in the entry chunk. */}
            <Route path="/buyer/intake-review" element={<IntakeReview />} />
            <Route
              path="/buyer/plan-grid"
              element={
                <Suspense fallback={<LoadingState />}>
                  <PlanGrid />
                </Suspense>
              }
            />
            {/* REQ-E06-01 / REQ-E06-03 — Forecast: versions, then commitments & gaps.
              The earlier response review stays reachable under the same menu item. */}
            {/* FUX phase 2 B2 (FUX2-R1) — Published versions is a tab of Publish to suppliers. */}
            <Route
              path="/buyer/forecasts"
              element={<Navigate to="/buyer/stabilise?tab=versions" replace />}
            />
            <Route path="/buyer/collaboration" element={<BuyerCommitments />} />
            {/* DRC-15a — feedstock reconcile per supplier × material, daily (path kept, BR-05). */}
            <Route path="/buyer/fs-reconcile" element={<BuyerFixedStockReconcile />} />
            {/* REQ-E14-02 — supplier reliability and PTI's plan-change measures (BL-99). */}
            <Route path="/buyer/reliability" element={<BuyerReliability />} />
            {/* REQ-E14-03 — material requirement (forecast engine, SIMULATED). */}
            <Route path="/buyer/material-requirement" element={<BuyerMaterialRequirement />} />
            {/* REQ-E14-04 — safety stock, safety lead time and reorder point (SIMULATED). */}
            <Route path="/buyer/safety-stock" element={<BuyerSafetyStock />} />
            {/* FUX phase 2 B1 (F-03) — the weekly cycle's start page (SIMULATED figures). */}
            <Route path="/buyer/this-week" element={<BuyerThisWeek />} />
            <Route path="/buyer/order-plan" element={<BuyerOrderPlan />} />
            {/* REQ-E14-13 — reschedule or cancel open orders for warehouse relief (SIMULATED). */}
            <Route path="/buyer/reschedule" element={<BuyerReschedule />} />
            {/* CAP-10 — demand anticipation, frozen per 4-week horizon (sample data). */}
            <Route path="/buyer/demand-anticipation" element={<BuyerDemandAnticipation />} />
            {/* DRC-3 (BL-189) — the publication history and audit view. */}
            <Route
              path="/buyer/demand-anticipation-history"
              element={<BuyerDemandAnticipationHistory />}
            />
            {/* DRC-17 (BL-202) — the what-if sandbox: analysis only, never pushed to the plan. */}
            <Route path="/buyer/what-if" element={<BuyerWhatIfSandbox />} />
            {/* REQ-E14-06 — stabilise and publish the plan to suppliers (SIMULATED; never shown to a supplier). */}
            <Route path="/buyer/stabilise" element={<BuyerStabilise />} />
            {/* REQ-E14-01 — data health of the engine's inputs (SIMULATED). */}
            <Route path="/buyer/data-health" element={<BuyerDataHealth />} />
            {/* REQ-E14-07 — the finished-goods demand forecast (SIMULATED; PTI only). */}
            <Route path="/buyer/demand-forecast" element={<BuyerDemandForecast />} />
            {/* REQ-E14-11 — forecast bias and planner overrides: now Forecast quality's bias tab (FUX phase 2 B5, FUX2-R1). */}
            <Route
              path="/buyer/forecast-bias"
              element={<Navigate to="/buyer/demand-forecast?tab=bias" replace />}
            />
            {/* REQ-E14-10 — choosing each SKU's model by simulated service (SIMULATED; PTI only). */}
            <Route path="/buyer/model-backtest" element={<BuyerModelBacktest />} />
            <Route
              path="/buyer/collaboration/responses"
              element={
                <Suspense fallback={<LoadingState />}>
                  <BuyerCollaboration />
                </Suspense>
              }
            />
            <Route path="/buyer/contracts" element={<BuyerContracts />} />
            {/* Nested contract detail — the traceability spine's leaf (Overview |
              Delivery Agreements | Docs). Must sit AFTER the list route. */}
            <Route path="/buyer/contracts/:id" element={<BuyerContractDetail />} />
            <Route path="/buyer/delivery-agreements" element={<BuyerDeliveryAgreements />} />
            <Route path="/buyer/call-offs" element={<BuyerCallOffs />} />
            <Route path="/buyer/chase" element={<BuyerChase />} />
            <Route path="/buyer/inventory" element={<BuyerInventory />} />
            {/* Material E2 — the stock simulation (MR-7; PTI only). */}
            <Route path="/buyer/stock-simulation" element={<BuyerStockSimulation />} />
            <Route path="/buyer/capacity" element={<BuyerCapacity />} />
            <Route path="/buyer/alerts" element={<BuyerAlerts />} />
            <Route path="/buyer/supplier-access" element={<BuyerSupplierAccess />} />
            <Route path="/buyer/shipments" element={<BuyerShipments />} />
            <Route path="/buyer/goods-receipt" element={<BuyerGoodsReceipt />} />
            <Route path="/buyer/discovery" element={<BuyerDiscovery />} />
            <Route path="/buyer/purchase-requisition" element={<BuyerRequisitions />} />
            <Route path="/buyer/supplier-applications" element={<BuyerSupplierApplications />} />
            <Route path="/buyer/invoices" element={<BuyerInvoices />} />
            <Route path="/buyer/scorecard" element={<BuyerScorecard />} />
            <Route path="/buyer/analytics" element={<BuyerAnalytics />} />
            <Route path="/buyer/risk" element={<BuyerRisk />} />
            {/* Comm Hub C4a — the buyer/planner front door (chase-derived outbound
              queue + channel-sourced provenance trail). Replaces the retired
              WhatsApp-Hub engagement mock. */}
            <Route path="/buyer/comm-hub" element={<BuyerCommHub />} />
            <Route path="/buyer/compliance" element={<BuyerCompliance />} />
            {/* PF-1 — the Process Flows module: the surface for the PF-0
              flow-graph analyzer. Everything it draws is derived from
              getKnownFlows(); there is no second copy of any machine. */}
            <Route path="/buyer/process-flows" element={<ProcessFlows />} />
            <Route path="/buyer/interface-monitor" element={<InterfaceMonitor />} />
            {/* BL-50 — administration (ADM). The area opens on its first section. */}
            <Route
              path="/buyer/admin"
              element={<Navigate to="/buyer/admin/working-calendar" replace />}
            />
            <Route path="/buyer/admin/working-calendar" element={<AdminWorkingCalendar />} />
            {/* BL-51 — administration (ADM): the 3PL list behind every ASN tracking link. */}
            <Route path="/buyer/admin/3pl-tracking" element={<AdminThreePls />} />
            {/* Material A1 — administration (ADM): each supplier's stock update mode. */}
            <Route path="/buyer/admin/suppliers" element={<AdminSuppliers />} />
            {/* Material G1 — administration: the documents each qualification level requires. */}
            <Route path="/buyer/admin/qualification" element={<AdminQualification />} />
            {/* Material G2 — administration: each sourcing category and purchasing group, Direct or Indirect. */}
            <Route path="/buyer/admin/sourcing-types" element={<AdminSourcingTypes />} />
            {/* Material C5 — administration: the planning groups capacity is kept by (MR-8). */}
            <Route path="/buyer/admin/planning-groups" element={<AdminPlanningGroups />} />
            {/* Material C4 — administration (ADM): who each SAP MRP controller code is. */}
            <Route path="/buyer/admin/mrp-controllers" element={<AdminMrpControllers />} />
            <Route path="/buyer/materials/trade-names" element={<BuyerTradeNames />} />
            {/* BL-32 — administration (ADM): the rule values that lived in configuration files. */}
            <Route path="/buyer/admin/tolerances" element={<AdminTolerances />} />
            <Route path="/buyer/admin/alert-thresholds" element={<AdminAlertThresholds />} />
            <Route path="/buyer/admin/reason-codes" element={<AdminReasonCodes />} />
            <Route path="/buyer/roles" element={<RolesCatalogue />} />
            <Route path="/buyer/roles/:roleId" element={<RoleDetail />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/supplier/home" element={<SupplierHome />} />
            <Route path="/supplier/dashboard" element={<SupplierDashboardV2 />} />
            <Route path="/supplier/storefront" element={<SupplierMyStorefront />} />
            <Route path="/supplier/documents" element={<SupplierDocumentsV2 />} />
            <Route path="/supplier/whatsapp" element={<SupplierWhatsApp />} />
            {/* Comm Hub C2 — inbound reply triage (confirm-before-commit). */}
            <Route path="/supplier/comm-hub" element={<CommHubInbound />} />
            <Route path="/supplier/order-summary" element={<SupplierOrderSummary />} />
            <Route path="/supplier/orders" element={<SupplierOrders />} />
            {/* Operator decision 2026-09-21 — one route per event type. The
              supplier's negotiation thread sits under /supplier/rfq, so the RFQ
              menu item stays highlighted on it (NV-03). */}
            <Route path="/supplier/rfi" element={<SupplierRfi />} />
            <Route path="/supplier/rfq" element={<SupplierRFQsV2 />} />
            <Route path="/supplier/rfq/rounds" element={<SupplierNegotiations />} />
            <Route path="/supplier/rfp" element={<SupplierRfp />} />
            <Route path="/supplier/rfqs" element={<LegacyRedirect to="/supplier/rfq" />} />
            <Route path="/supplier/rfqs/rfi" element={<LegacyRedirect to="/supplier/rfi" />} />
            <Route path="/supplier/rfqs/rfp" element={<LegacyRedirect to="/supplier/rfp" />} />
            <Route
              path="/supplier/rfqs/rounds"
              element={<LegacyRedirect to="/supplier/rfq/rounds" />}
            />
            {/* REQ-E06-01 / REQ-E06-02 — the supplier's forecast versions and commitments.
              The earlier responses and shipment reports stay reachable beneath it;
              its Stock tab only points to the Stock page (BL-60, one stock entry). */}
            <Route path="/supplier/forecasts" element={<SupplierForecastCommitments />} />
            {/* BL-204 (DRC-1) — the supplier's own published demand anticipation; shows
              "not available yet" while SUPPLIER_DA_VIEW_ENABLED is off (DRC-D10). */}
            <Route path="/supplier/demand-anticipation" element={<SupplierDemandAnticipation />} />
            {/* DRC-15a — the supplier's own feedstock reconcile rows (path kept, BR-05). */}
            <Route path="/supplier/fs-reconcile" element={<SupplierFixedStockReconcile />} />
            <Route
              path="/supplier/forecasts/responses"
              element={
                <Suspense fallback={<LoadingState />}>
                  <SupplierForecasts />
                </Suspense>
              }
            />
            <Route path="/supplier/shipments" element={<SupplierShipments />} />
            <Route path="/supplier/goods-receipts" element={<SupplierGoodsReceipts />} />
            <Route path="/supplier/invoices" element={<SupplierInvoicesV2 />} />
            <Route path="/supplier/inventory" element={<SupplierInventoryV2 />} />
            <Route path="/supplier/delivery-agreements" element={<SupplierDeliveryAgreements />} />
            <Route path="/supplier/call-offs" element={<SupplierCallOffs />} />
            <Route path="/supplier/capacity" element={<SupplierCapacity />} />
            <Route path="/supplier/performance" element={<SupplierPerformance />} />
            <Route path="/" element={<Navigate to="/buyer/home" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CurrentIdentityProvider>
      </ToastProvider>
    </HashRouter>
  );
};

export default AppRouter;
