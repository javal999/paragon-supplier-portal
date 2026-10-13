/** @import React from 'react' */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import { deepLink, sharedValue } from '@lib/deepLink';
import {
  useASNs,
  useBuyerInvoices,
  useCapacityPlans,
  useForecastCommitments,
  useInventoryAlerts,
  useGoodsReceipts,
  usePurchaseOrders,
  useQuotations,
  useRFQs,
  useNegotiationRounds
} from '@services/query/hooks';
import { useUnifiedChase } from '@services/query/chaseHooks';
/** @import { HubRole } from '@components/layout-v2/hubRole' */
import { useHubRole } from '@components/layout-v2/hubRole';
import * as d from './widgets/buyerDerivations';
/** @import { HomeTask } from './home/TaskList' */
import TaskList from './home/TaskList';
/** @import { UnratedTask } from './home/severityDisplay' */
import { withSeverity } from './home/severityDisplay';
import WeeklyPlanCard from './home/WeeklyPlanCard';
import { POStatus } from '@services/data/types';
import {
  completionMovedLater,
  isEscalated,
  responseDeadline
} from '@services/data/poResponseProjection';
import { isOpenDispute } from '@services/transitions/fulfilmentRules';
import { deliveryDrift, isDriftResult } from '@services/transitions/callOffRules';
import { useCallOffViews } from './callOffs/callOffDisplay';
import { gapWeeks, planStatus } from '@services/transitions/capacityRules';
import { deadlineState } from '@services/transitions/forecastRules';
import { isClosingSoon } from '@services/transitions/rfxRules';
import { forecastNow } from './forecasts/forecastDisplay';
import { rfxNow } from './rfx/rfxDisplay';
import { ordersNow } from './orders/PoCollaboration';
import { useSapInterface } from './interface/sapInterfaceDisplay';
import { isRetryable } from '@services/data/sapInterfaceRules';

// PTI Home — "My tasks" (REQUIREMENTS §3.8 SC-01). Tasks are filtered by the
// PTI role the menu is showing, so a Finance user is not handed a planner's work.

/**
 * A task before its severity is known, and the PTI roles it is shown to.
 * @typedef {UnratedTask & { readonly roles: readonly Exclude<HubRole, 'ALL'>[] }} RoleTask
 */

const DAY_MS = 86_400_000;

/** @type {React.FC} */
const BuyerHome = () => {
  const { t } = useTranslation();
  const [role] = useHubRole();
  const invoices = useBuyerInvoices();
  const pos = usePurchaseOrders();
  const rfqs = useRFQs();
  const quotes = useQuotations();
  const grs = useGoodsReceipts();
  const asns = useASNs();
  const chase = useUnifiedChase();
  // REQ-E09-03 / REQ-E09-04 — call-off reminders, derived at read time (CR-09).
  const callOffs = useCallOffViews();
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

  const tasks = /** @type {HomeTask[]} */ (
    useMemo(() => {
      // ⚠️ THE ORDER LANE'S CLOCK, NOT THE WALL CLOCK — the same reading the
      // negotiation task below takes, and for the same reason: the purchase-order
      // fixtures are dated relative to the declared present, which is frozen,
      // while `now` walks away from it. An order authored to sit inside its
      // response window would read Escalated here and the two tasks would
      // disagree with the order pages, which read `ordersNow()`. It is also the
      // "today" every task's severity is measured against (taskSeverity.js).
      const nowIso = ordersNow();
      const poItems = pos.data?.items ?? [];
      const invItems = invoices.data?.items ?? [];
      const rfqItems = rfqs.data?.items ?? [];
      const quoteItems = quotes.data?.items ?? [];
      const grItems = grs.data?.items ?? [];
      const asnItems = asns.data?.items ?? [];
      const chaseRows = chase.data ?? [];
      const escalatedPos = poItems.filter((po) => isEscalated(po, nowIso));
      const rejectedPos = poItems.filter((po) => po.status === POStatus.REJECTED);
      const adjustedPos = poItems.filter((po) => po.status === POStatus.ADJUSTED);
      const movedPos = poItems.filter(completionMovedLater);
      const awaitingCallOffs = callOffs.views.filter((v) => v.confirmation === 'Awaiting Approval');
      const escalatedCallOffs = callOffs.views.filter((v) => v.confirmation === 'Escalated');
      const atRiskCallOffs = callOffs.views.filter((v) => v.delivery === 'atRisk');
      const drift = deliveryDrift(callOffs.views);
      const driftKeys = new Set(drift.map((g) => `${g.supplierId}|${g.materialCode}`));
      const highAlerts = (alerts.data?.items ?? []).filter(
        (a) => a.status === 'open' && a.riskClass === 'high'
      );
      const gapPlans = (capacity.data?.items ?? []).filter((p) => planStatus(p) === 'gap');
      const lines = forecastLines.data?.items ?? [];
      const missingLines = lines.filter((l) => deadlineState(l, forecastNow()) === 'overdue');
      const exceptionLines = lines.filter((l) => l.state === 'exception');
      const closingRounds = (rounds.data?.items ?? []).filter(
        // ⚠️ THE RFx LANE'S OWN CLOCK, NOT `nowIso`. The RFx sample data is
        // dated relative to the declared present, and the wall clock drifts
        // away from it between bumps — so a round that closes in two days
        // would read as long overdue and the task would silently vanish. The
        // forecast tasks above read `forecastNow()` for the same reason.
        (r) => !r.closed && r.awaiting > 0 && isClosingSoon(r.deadline, rfxNow())
      );
      const awardRfqs = d.pendingAwardRfqs(rfqItems, quoteItems);
      const asnsDue = d.pendingAsns(asnItems);
      const overdueInv = d.overdueInvoices(invItems);
      // Each task names the deadline of every line item it counts and, for stock,
      // cover against lead time; taskSeverity.js decides URGENT / DUE SOON.
      /** @type {RoleTask[]} */
      const all = [
        {
          // REQ-E07-02 BR-09 — no response by the 1-working-day deadline. Derived
          // from the clock at read time, never stored.
          id: 'escalated-po',
          roles: ['MP'],
          label: t('hub.home.task.escalatedPo'),
          count: escalatedPos.length,
          deadlines: escalatedPos.map((po) => responseDeadline(po).toISOString()),
          to: deepLink('/buyer/orders', { tab: 'escalated' })
        },
        {
          // REQ-E07-02 BR-08 — a rejection is PTI's to act on.
          id: 'rejected-po',
          roles: ['MP'],
          label: t('hub.home.task.rejectedPo'),
          count: rejectedPos.length,
          deadlines: rejectedPos.map((po) => po.requestedDeliveryDate),
          to: deepLink('/buyer/orders', { tab: 'rejected' })
        },
        {
          id: 'counter-offers',
          roles: ['MP'],
          label: t('hub.home.task.counterOffers'),
          count: adjustedPos.length,
          deadlines: adjustedPos.map((po) => po.requestedDeliveryDate),
          to: deepLink('/buyer/orders', { tab: 'review' })
        },
        {
          // REQ-E07-05 — the supplier moved the expected completion date later.
          id: 'completion-moved',
          roles: ['MP'],
          label: t('hub.home.task.completionMoved'),
          count: movedPos.length,
          deadlines: movedPos.map((po) => po.requestedDeliveryDate),
          to: '/buyer/order-summary'
        },
        {
          id: 'calloffs-approval',
          roles: ['MP'],
          label: t('hub.home.task.callOffsApproval'),
          count: awaitingCallOffs.length,
          deadlines: awaitingCallOffs.map((v) => v.dueDate),
          to: deepLink('/buyer/call-offs', { status: 'awaitingApproval' })
        },
        {
          id: 'calloffs-escalated',
          roles: ['MP'],
          label: t('hub.home.task.callOffsEscalated'),
          count: escalatedCallOffs.length,
          deadlines: escalatedCallOffs.map((v) => v.deadline?.toISOString() ?? v.callOff.needDate),
          to: deepLink('/buyer/call-offs', { status: 'escalated' })
        },
        {
          id: 'calloffs-at-risk',
          roles: ['MP'],
          label: t('hub.home.task.callOffsAtRisk'),
          count: atRiskCallOffs.length,
          deadlines: atRiskCallOffs.map((v) => v.dueDate),
          to: deepLink('/buyer/call-offs', { status: 'atRisk' })
        },
        {
          id: 'calloffs-drift',
          roles: ['MP'],
          label: t('hub.home.task.callOffsDrift'),
          count: drift.length,
          // The approved dates of the late or missed deliveries behind the drift.
          deadlines: callOffs.views
            .filter((v) => driftKeys.has(`${v.callOff.supplierId}|${v.callOff.materialCode}`))
            .flatMap((v) => v.results.filter(isDriftResult).map((r) => r.approvedDate)),
          to: deepLink('/buyer/call-offs', { status: 'drift' })
        },
        {
          id: 'inventory-high-alerts',
          roles: ['MP'],
          label: t('hub.home.task.inventoryHighAlerts'),
          count: highAlerts.length,
          // MR-9 BR-03 — the day each risk bites: today + its days to impact.
          deadlines: highAlerts.map((a) =>
            new Date(Date.parse(nowIso) + a.daysToImpact * DAY_MS).toISOString()
          ),
          // CR-24 — cover against the supplier lead time, where one is on record.
          stock: highAlerts.flatMap((a) =>
            a.riskBasis.kind === 'leadTime'
              ? [{ daysOfCover: a.riskBasis.daysOfCover, leadTimeDays: a.riskBasis.leadTimeDays }]
              : []
          ),
          to: deepLink('/buyer/alerts', { tab: 'open', risk: 'high' })
        },
        {
          // REQ-E08-04 edge case — a submitted update that creates a gap notifies the planner.
          id: 'capacity-gaps',
          roles: ['MP'],
          label: t('hub.home.task.capacityGaps'),
          count: gapPlans.length,
          deadlines: gapPlans.map((p) => gapWeeks(p)[0]?.week),
          to: deepLink('/buyer/capacity', { gapsOnly: '1' })
        },
        {
          // REQ-E06-03 BR-06 — after the deadline, a missing commitment escalates to the planner.
          id: 'missing-commitments',
          roles: ['MP'],
          label: t('hub.home.task.missingCommitments'),
          count: missingLines.length,
          deadlines: missingLines.map((l) => l.dueAt),
          // D7 (PR #74 review): only narrow to a stream when every counted
          // line shares one — the count is over ALL overdue lines, and the
          // first line's stream alone can hide the rest.
          to: deepLink('/buyer/collaboration', {
            stream: sharedValue(missingLines, (l) => l.stream)
          })
        },
        {
          // REQ-E06-02 BR-05 — a commitment outside tolerance is an exception for the
          // planner. The supplier already answered, so the date that matters is the
          // start of the period the commitment covers.
          id: 'commitment-exceptions',
          roles: ['MP'],
          label: t('hub.home.task.commitmentExceptions'),
          count: exceptionLines.length,
          deadlines: exceptionLines.map((l) => l.periodStart),
          to: deepLink('/buyer/collaboration', {
            stream: sharedValue(exceptionLines, (l) => l.stream)
          })
        },
        {
          id: 'chase',
          roles: ['MP'],
          label: t('hub.home.task.chase'),
          count: chaseRows.length,
          deadlines: chaseRows.flatMap((r) => r.commitmentEntries.map((e) => e.dueDate)),
          to: '/buyer/chase'
        },
        {
          // No deadline is recorded on a goods receipt to review.
          id: 'receipts',
          roles: ['MP'],
          label: t('hub.home.task.receipts'),
          count: d.grNeedingAction(grItems).length,
          deadlines: [],
          to: '/buyer/goods-receipt'
        },
        {
          // REQ-E07-06 — a supplier disputed a receipt discrepancy; the planner
          // resolves it on the goods receipt page. No deadline is recorded.
          id: 'disputed-receipts',
          roles: ['MP'],
          label: t('hub.home.task.disputedReceipts'),
          count: grItems.filter(isOpenDispute).length,
          deadlines: [],
          to: '/buyer/goods-receipt'
        },
        {
          id: 'inbound-asn',
          roles: ['MP'],
          label: t('hub.home.task.inboundAsn'),
          count: asnsDue.length,
          deadlines: asnsDue.map((a) => a.eta),
          // D4 (PR #74 review): pendingAsns (Submitted/In Transit) is not the
          // shipments page's Pending-tab predicate (Pending ASN/ASN Received)
          // — link unfiltered rather than hiding every counted row.
          to: '/buyer/shipments'
        },
        {
          // REQ-E03-05 BR-03 — a round whose deadline is close and whose invitees
          // have not all answered. Derived from the clock at read (law 0.5).
          id: 'negotiation-closing',
          roles: ['BUY'],
          label: t('hub.home.task.negotiationClosing'),
          count: closingRounds.length,
          deadlines: closingRounds.map((r) => r.deadline),
          // D3 (PR #74 review): the round closing soon need not be Open, so
          // the Open tab can hide the one round this task counts — unfiltered.
          to: '/buyer/rfq'
        },
        {
          id: 'rfq-award',
          roles: ['BUY'],
          label: t('hub.home.task.rfqAward'),
          count: awardRfqs.length,
          deadlines: awardRfqs.map((r) => r.awardDeadline),
          // D2 (PR #74 review): pendingAwardRfqs is not the Pending tab's own
          // predicate (it also counts Closed/partially-answered Open rounds)
          // — link unfiltered.
          to: '/buyer/rfq'
        },
        {
          // REQ-E07-08 AC-02 — only a RETRYABLE failure is a task: a business
          // refusal is not something acting here can fix (CR-20). No deadline is recorded.
          id: 'sap-messages-failed',
          roles: ['MP'],
          label: t('hub.home.task.sapMessagesFailed'),
          count: sap.failures.filter(isRetryable).length,
          deadlines: [],
          to: '/buyer/interface-monitor'
        },
        {
          id: 'overdue-invoices',
          roles: ['FIN'],
          label: t('hub.home.task.overdueInvoices'),
          count: overdueInv.length,
          deadlines: overdueInv.map((i) => i.dueDate),
          to: deepLink('/buyer/invoices', { tab: 'queue', status: 'Overdue' })
        }
      ];
      // Rank only what the list shows: this role's tasks with something in them.
      return withSeverity(
        role === 'ALL' ? all : all.filter((task) => task.roles.includes(role)),
        nowIso,
        t
      );
    }, [
      role,
      pos.data,
      invoices.data,
      rfqs.data,
      quotes.data,
      grs.data,
      asns.data,
      chase.data,
      callOffs.views,
      alerts.data,
      capacity.data,
      forecastLines.data,
      rounds.data,
      sap.failures,
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
      <TaskList tasks={tasks} />
    </AppShellV2>
  );
};

export default BuyerHome;
