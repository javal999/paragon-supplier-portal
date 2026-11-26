/** @import React from 'react' */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import {
  useASNs,
  useBuyerInvoices,
  useCallOffChase,
  useCapacityPlans,
  useForecastCommitments,
  useInventoryAlerts,
  useGoodsReceipts,
  usePurchaseOrders,
  useRFQs,
  useNegotiationRounds,
  useRequisitions,
  useDocuments,
  useNpdReviews,
  useRopFisikPrRecommendations,
  useMaterialNames,
  useComplianceRegistry
} from '@services/query/hooks';
import { useUnifiedChase } from '@services/query/chaseHooks';
import { useHubRole } from '@components/layout-v2/hubRole';
/** @import { HomeTask } from './home/TaskList' */
import TaskList from './home/TaskList';
import { withSeverity } from './home/severityDisplay';
import { buyerTodoTasks } from './home/buyerTodo';
import WeeklyPlanCard from './home/WeeklyPlanCard';
import { useCallOffViews } from './callOffs/callOffDisplay';
import { ordersNow } from './orders/PoCollaboration';
import { useSapInterface } from './interface/sapInterfaceDisplay';
import { atomsForSeat } from '@services/transitions/customRoles';

// PTI Home — "My tasks" (REQUIREMENTS §3.8 SC-01). Tasks are filtered by the
// PTI role the menu is showing, so a Finance user is not handed a planner's work.
//
// BL-361 — the ROWS are built by `home/buyerTodo.buyerTodoTasks`, the same
// function the top bar's PTI bell counts and lists. This page supplies the
// page hooks' reads and nothing else, so the bell and the page cannot drift.

/** @type {React.FC} */
const BuyerHome = () => {
  const { t } = useTranslation();
  const [role] = useHubRole();
  // AIB-2 BR-05 (BL-350) — the inbound acknowledgment is the EXPEDITOR's act,
  // so its To-Do is shown to a seat that holds `inbound:acknowledge` (a new
  // PTI seat, holdable from the identity panel and not seeded).
  const { identity } = useCurrentIdentity();
  // UCX-P1 (BL-362) — the rows follow the seat: its atoms, resolved through
  // `atomsForSeat` (a custom role included), gate the list.
  const seatAtoms = useMemo(() => atomsForSeat(identity.businessRoles), [identity.businessRoles]);
  const holdsInboundAck = seatAtoms.includes('inbound:acknowledge');
  const invoices = useBuyerInvoices();
  const pos = usePurchaseOrders();
  const rfqs = useRFQs();
  // IA P-03 — requisitions waiting for approval and supplier declarations
  // waiting for review (UC1 step 2, UC5 step 3).
  const requisitions = useRequisitions();
  const documents = useDocuments();
  const grs = useGoodsReceipts();
  const asns = useASNs();
  const chase = useUnifiedChase();
  // REQ-E09-03 / REQ-E09-04 — call-off reminders, derived at read time (CR-09).
  const callOffs = useCallOffViews();
  // AIB-3 (BL-351) — call-offs sent with no ASN, chased from the next working day.
  const missingAsn = useCallOffChase();
  // REQ-E08-04 / REQ-E08-05 — open High alerts and capacity gaps, derived at read.
  const alerts = useInventoryAlerts();
  const capacity = useCapacityPlans();
  // REQ-E06-02 / REQ-E06-03 — missing commitments past their deadline (the
  // escalation) and commitments outside tolerance, derived at read time.
  const forecastLines = useForecastCommitments();
  // REQ-E03-05 — negotiation rounds closing soon (Phase 6a).
  const rounds = useNegotiationRounds();
  // REQ-E07-08 — records that did not get through and can be sent again (CR-20).
  const sap = useSapInterface();
  // DRC-12a (BL-198) — materials whose NPD tag dropped, until the planner
  // sets or confirms their OSIP level.
  const npdReviews = useNpdReviews();
  // BL-199 (DRC-13 BR-02) — materials at ROP Fisik with no umbrella PO balance left.
  const ropFisikPrs = useRopFisikPrRecommendations();
  // UCX-P1 (BL-362) — the two new Planning/Compliance task sources.
  const tradeNames = useMaterialNames();
  const registry = useComplianceRegistry();

  const tasks = /** @type {HomeTask[]} */ (
    useMemo(() => {
      // ⚠️ THE ORDER LANE'S CLOCK, NOT THE WALL CLOCK — the same reading the
      // order tasks take, and for the same reason: the purchase-order fixtures
      // are dated relative to the declared present, which is frozen, while
      // `now` walks away from it. An order authored to sit inside its response
      // window would read Escalated here and disagree with the order pages,
      // which read `ordersNow()`. It is also the "today" every task's severity
      // is measured against (taskSeverity.js).
      const nowIso = ordersNow();
      return withSeverity(
        buyerTodoTasks({
          t,
          role,
          holdsInboundAck,
          nowIso,
          purchaseOrders: pos.data,
          buyerInvoices: invoices.data,
          rfqs: rfqs.data,
          requisitions: requisitions.data,
          documents: documents.data,
          goodsReceipts: grs.data,
          asns: asns.data,
          chase: chase.data,
          callOffViews: callOffs.views,
          missingAsnChase: missingAsn.data,
          inventoryAlerts: alerts.data,
          capacityPlans: capacity.data,
          forecastLines: forecastLines.data,
          negotiationRounds: rounds.data,
          sapFailures: sap.failures,
          npdReviews: npdReviews.data,
          ropFisikPrs: ropFisikPrs.data,
          tradeNames: tradeNames.data,
          registry: registry.data
        }),
        nowIso,
        t
      );
    }, [
      role,
      holdsInboundAck,
      pos.data,
      invoices.data,
      rfqs.data,
      requisitions.data,
      documents.data,
      grs.data,
      asns.data,
      chase.data,
      callOffs.views,
      missingAsn.data,
      alerts.data,
      capacity.data,
      forecastLines.data,
      rounds.data,
      sap.failures,
      npdReviews.data,
      ropFisikPrs.data,
      tradeNames.data,
      registry.data,
      t
    ])
  );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[t('hub.home.crumb'), t('hub.home.pti.title')]}
        title={t('hub.home.pti.title')}
        subtitle={t('hub.home.pti.subtitle')}
      />
      {/* FUX phase 2 B1 (F-03) — the planner's way into the weekly cycle. My
          tasks stays the landing page; This week is Weekly plan's first item.
          For MP and the ALL demo view it is the first thing under the header,
          a card rather than a text link, so the weekly routine is not the
          lightest thing on the page. BUY and FIN are not shown it. */}
      {(role === 'MP' || role === 'ALL') && <WeeklyPlanCard />}
      <div className="mb-4">
        <SampleDataBadge />
      </div>
      <TaskList tasks={tasks} seatAtoms={seatAtoms} scope="roles" />
    </AppShellV2>
  );
};

export default BuyerHome;
