/** @import { TFunction } from 'i18next' */
/** @import { HubRole } from '@components/layout-v2/hubRole' */
/** @import { UnratedTask } from './severityDisplay' */
/** @import {
 *   usePurchaseOrders,
 *   useBuyerInvoices,
 *   useRFQs,
 *   useRequisitions,
 *   useDocuments,
 *   useGoodsReceipts,
 *   useASNs,
 *   useCallOffChase,
 *   useInventoryAlerts,
 *   useCapacityPlans,
 *   useForecastCommitments,
 *   useNegotiationRounds,
 *   useNpdReviews,
 *   useRopFisikPrRecommendations,
 *   useMaterialNames,
 *   useComplianceRegistry
 * } from '@services/query/hooks' */
/** @import { useUnifiedChase } from '@services/query/chaseHooks' */
/** @import { callOffViews } from '@services/transitions/callOffRules' */
/** @import { useSapInterface } from '../interface/sapInterfaceDisplay' */

import { deepLink, sharedValue } from '@lib/deepLink';
import { POStatus } from '@services/data/types';
import { computeStatus } from '@services/data/complianceProjection';
import {
  completionMovedLater,
  isEscalated,
  responseDeadline
} from '@services/data/poResponseProjection';
import { isRetryable } from '@services/data/sapInterfaceRules';
import { isOpenDispute } from '@services/transitions/fulfilmentRules';
import { inboundRows, outstandingInbounds } from '@services/transitions/inboundRules';
import { deliveryDrift, isDriftResult } from '@services/transitions/callOffRules';
/** @import { TransitionRole } from '@services/transitions/schema' */
import { gapWeeks, planStatus } from '@services/transitions/capacityRules';
import { deadlineState } from '@services/transitions/forecastRules';
import { sdcClock } from '@services/sdc/clock';
import { grNeedingAction, overdueInvoices, pendingAsns } from '../widgets/buyerDerivations';
import { isReadyToAward, isRoundClosingSoon } from '../BuyerSourcing/utils';
import { forecastNow } from '../forecasts/forecastDisplay';
import { rfxNow } from '../rfx/rfxDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// The PTI Home To-do (REQUIREMENTS §3.8 SC-01) — the ONE derivation of the
// buyer's open work, and the reasons each row is here.
//
// BL-361 — IT IS EXTRACTED SO TWO SURFACES CANNOT DRIFT. `BuyerHome` renders
// these rows; the top bar's PTI bell counts and lists the SAME rows, because it
// calls this function rather than restating a predicate. The inputs are the
// reads, passed IN: the page supplies its page hooks, the shell supplies reads
// under the same query keys with shell options, and both reach this one body.
//
// Tasks are filtered by the PTI role the menu is showing (REQ §3.7), so a
// Finance user is not handed a planner's work. A caller applies
// `withSeverity` afterwards (`home/severityDisplay`); this module decides WHAT
// is open, never how urgent it is.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/**
 * A task before its severity is known, and the PTI roles it is shown to.
 * `act` is UCX-P1 (BL-362)'s seat gate: the atom the row asks for, resolved
 * through `atomsForSeat`; a row with no act is a read and always shows.
 * @typedef {UnratedTask & { readonly roles: readonly Exclude<HubRole, 'ALL'>[]; readonly act?: TransitionRole }} RoleTask
 */

/**
 * Every read the To-do is built from, the role being shown, and the clock its
 * deadlines are measured against. Each property is the `.data` of the matching
 * page hook (or the derived list), so the page and the shell pass the same
 * shapes.
 *
 * @typedef {object} BuyerTodoInput
 * @property {TFunction} t
 * @property {HubRole} role
 * @property {boolean} holdsInboundAck
 * @property {string} nowIso
 * @property {ReturnType<typeof usePurchaseOrders>['data']} purchaseOrders
 * @property {ReturnType<typeof useBuyerInvoices>['data']} buyerInvoices
 * @property {ReturnType<typeof useRFQs>['data']} rfqs
 * @property {ReturnType<typeof useRequisitions>['data']} requisitions
 * @property {ReturnType<typeof useDocuments>['data']} documents
 * @property {ReturnType<typeof useGoodsReceipts>['data']} goodsReceipts
 * @property {ReturnType<typeof useASNs>['data']} asns
 * @property {ReturnType<typeof useUnifiedChase>['data']} chase
 * @property {ReturnType<typeof callOffViews>} callOffViews
 * @property {ReturnType<typeof useCallOffChase>['data']} missingAsnChase
 * @property {ReturnType<typeof useInventoryAlerts>['data']} inventoryAlerts
 * @property {ReturnType<typeof useCapacityPlans>['data']} capacityPlans
 * @property {ReturnType<typeof useForecastCommitments>['data']} forecastLines
 * @property {ReturnType<typeof useNegotiationRounds>['data']} negotiationRounds
 * @property {ReturnType<typeof useSapInterface>['failures']} sapFailures
 * @property {ReturnType<typeof useNpdReviews>['data']} npdReviews
 * @property {ReturnType<typeof useRopFisikPrRecommendations>['data']} ropFisikPrs
 * @property {ReturnType<typeof useMaterialNames>['data']} tradeNames
 * @property {ReturnType<typeof useComplianceRegistry>['data']} registry
 */

/**
 * The open-work rows for the current seat and hub role. Rows keep their zero
 * counts; `withSeverity` drops them, exactly as the page did before BL-361.
 * @param {BuyerTodoInput} input
 * @returns {RoleTask[]}
 */
export function buyerTodoTasks({
  t,
  role,
  holdsInboundAck,
  nowIso,
  purchaseOrders,
  buyerInvoices,
  rfqs,
  requisitions,
  documents,
  goodsReceipts,
  asns,
  chase,
  callOffViews: views,
  missingAsnChase,
  inventoryAlerts,
  capacityPlans,
  forecastLines,
  negotiationRounds,
  sapFailures,
  npdReviews,
  ropFisikPrs,
  tradeNames,
  registry
}) {
  const poItems = purchaseOrders?.items ?? [];
  const invItems = buyerInvoices?.items ?? [];
  const rfqItems = rfqs?.items ?? [];
  const grItems = goodsReceipts?.items ?? [];
  const asnItems = asns?.items ?? [];
  const chaseRows = chase ?? [];
  const escalatedPos = poItems.filter((po) => isEscalated(po, nowIso));
  const rejectedPos = poItems.filter((po) => po.status === POStatus.REJECTED);
  const adjustedPos = poItems.filter((po) => po.status === POStatus.ADJUSTED);
  const movedPos = poItems.filter(completionMovedLater);
  const awaitingCallOffs = views.filter((v) => v.confirmation === 'Awaiting Approval');
  const escalatedCallOffs = views.filter((v) => v.confirmation === 'Escalated');
  const atRiskCallOffs = views.filter((v) => v.delivery === 'atRisk');
  // AIB-3 (BL-351) — the open missing-ASN chases; a closed or covered one is absent.
  const missingAsnChases = (missingAsnChase?.items ?? []).filter((r) => r.state === 'open');
  const drift = deliveryDrift(views);
  const driftKeys = new Set(drift.map((g) => `${g.supplierId}|${g.materialCode}`));
  const highAlerts = (inventoryAlerts?.items ?? []).filter(
    (a) => a.status === 'open' && a.riskClass === 'high'
  );
  const gapPlans = (capacityPlans?.items ?? []).filter((p) => planStatus(p) === 'gap');
  const reviews = npdReviews?.items ?? [];
  const prRecs = ropFisikPrs?.items ?? [];
  const lines = forecastLines?.items ?? [];
  const missingLines = lines.filter((l) => deadlineState(l, forecastNow()) === 'overdue');
  const exceptionLines = lines.filter((l) => l.state === 'exception');
  const closingRounds = (negotiationRounds?.items ?? []).filter(
    // ⚠️ THE RFx LANE'S OWN CLOCK, NOT `nowIso`. The RFx sample data is
    // dated relative to the declared present, and the wall clock drifts
    // away from it between bumps — so a round that closes in two days
    // would read as long overdue and the task would silently vanish. The
    // forecast tasks above read `forecastNow()` for the same reason.
    // IA P-08 — the RFQ board's rounds-closing view reads the same
    // predicate with the same clock.
    (r) => isRoundClosingSoon(r, rfxNow())
  );
  // IA P-08 (IA-B03) — the board's "Ready to award" predicate, so the task
  // and the tile count the same RFQs.
  const awardRfqs = rfqItems.filter(isReadyToAward);
  const receiptsToReview = grNeedingAction(grItems);
  const disputedReceipts = grItems.filter(isOpenDispute);
  const prsToApprove = (requisitions?.items ?? []).filter((pr) => pr.status === 'Pending Approval');
  const declarationsToReview = (documents?.items ?? []).filter(
    (doc) => doc.status === 'Under Review'
  );
  // UCX-P1 (BL-362) — the four duties that had no My tasks row.
  const awaitingException = asnItems.filter((a) => a.status === 'Awaiting exception');
  const rejectedCallOffs = views.filter((v) => v.callOff.status === 'Rejected');
  const tradeEntries = (tradeNames?.items ?? [])
    .flatMap((row) => row.history)
    .filter((name) => name.state === 'Awaiting approval');
  const expiringCerts = (registry?.items ?? []).filter(
    (entry) => computeStatus(entry, sdcClock.now()) === 'Expiring'
  );
  /**
   * The record a count of one names, else `undefined`.
   * @template T
   * @param {readonly T[]} items
   * @param {(item: T) => string} id
   * @returns {string | undefined}
   */
  const onlyOne = (items, id) => (items.length === 1 ? id(items[0]) : undefined);
  const closingRfqId = sharedValue(closingRounds, (r) => r.rfqId);
  const awardRfqId = onlyOne(awardRfqs, (r) => r.id);
  const asnsDue = pendingAsns(asnItems);
  // AIB-2 BR-05 (BL-350) — inbounds past their one-working-day deadline and
  // not acknowledged. Derived at read, like every other task here.
  const inboundDue = outstandingInbounds(inboundRows(asnItems, grItems, sdcClock.now()));
  const overdueInv = overdueInvoices(invItems);
  // Each task names the deadline of every line item it counts and, for stock,
  // cover against lead time; taskSeverity.js decides URGENT / DUE SOON.
  /** @type {RoleTask[]} */
  const all = [
    {
      // REQ-E07-02 BR-09 — no response by the 1-working-day deadline. Derived
      // from the clock at read time, never stored.
      id: 'escalated-po',
      act: 'po:review-response',
      roles: ['MP'],
      label: t('hub.home.task.escalatedPo'),
      count: escalatedPos.length,
      deadlines: escalatedPos.map((po) => responseDeadline(po).toISOString()),
      to: deepLink('/buyer/orders', { tab: 'escalated' })
    },
    {
      // REQ-E07-02 BR-08 — a rejection is PTI's to act on.
      id: 'rejected-po',
      act: 'po:review-response',
      roles: ['MP'],
      label: t('hub.home.task.rejectedPo'),
      count: rejectedPos.length,
      deadlines: rejectedPos.map((po) => po.requestedDeliveryDate),
      to: deepLink('/buyer/orders', { tab: 'rejected' })
    },
    {
      id: 'counter-offers',
      act: 'po:review-response',
      roles: ['MP'],
      label: t('hub.home.task.counterOffers'),
      count: adjustedPos.length,
      deadlines: adjustedPos.map((po) => po.requestedDeliveryDate),
      to: deepLink('/buyer/orders', { tab: 'review' })
    },
    {
      // REQ-E07-05 — the supplier moved the expected completion date later.
      id: 'completion-moved',
      act: 'po:review-response',
      roles: ['MP'],
      label: t('hub.home.task.completionMoved'),
      count: movedPos.length,
      deadlines: movedPos.map((po) => po.requestedDeliveryDate),
      // IA P-02 — Order summary is the `?view=summary` view of Purchase
      // orders; a count of one opens that order.
      // IA review item 2 — one order opens it; several open the Summary
      // view filtered to exactly the orders this task counts.
      to:
        movedPos.length === 1
          ? deepLink('/buyer/orders', { po: movedPos[0].id })
          : deepLink('/buyer/orders', { view: 'summary', moved: '1' })
    },
    {
      id: 'calloffs-approval',
      act: 'calloff:review',
      roles: ['MP'],
      label: t('hub.home.task.callOffsApproval'),
      count: awaitingCallOffs.length,
      deadlines: awaitingCallOffs.map((v) => v.dueDate),
      to: deepLink('/buyer/call-offs', { status: 'awaitingApproval' })
    },
    {
      id: 'calloffs-escalated',
      act: 'calloff:review',
      roles: ['MP'],
      label: t('hub.home.task.callOffsEscalated'),
      count: escalatedCallOffs.length,
      deadlines: escalatedCallOffs.map((v) => v.deadline?.toISOString() ?? v.callOff.needDate),
      to: deepLink('/buyer/call-offs', { status: 'escalated' })
    },
    {
      id: 'calloffs-at-risk',
      act: 'calloff:plan',
      roles: ['MP'],
      label: t('hub.home.task.callOffsAtRisk'),
      count: atRiskCallOffs.length,
      deadlines: atRiskCallOffs.map((v) => v.dueDate),
      to: deepLink('/buyer/call-offs', { status: 'atRisk' })
    },
    {
      id: 'calloffs-drift',
      act: 'calloff:plan',
      roles: ['MP'],
      label: t('hub.home.task.callOffsDrift'),
      count: drift.length,
      // The approved dates of the late or missed deliveries behind the drift.
      deadlines: views
        .filter((v) => driftKeys.has(`${v.callOff.supplierId}|${v.callOff.materialCode}`))
        .flatMap((v) => v.results.filter(isDriftResult).map((r) => r.approvedDate)),
      to: deepLink('/buyer/call-offs', { status: 'drift' })
    },
    {
      // AIB-3 (BL-351) — a call-off the planner sent with no ASN, chased
      // from the next working day. CR-09's 7-day reminder is separate (BR-02).
      id: 'calloffs-missing-asn',
      act: 'calloffchase:close',
      roles: ['MP'],
      label: t('hub.home.task.callOffsMissingAsn'),
      count: missingAsnChases.length,
      deadlines: missingAsnChases.map((r) => r.dueAt),
      to: deepLink('/buyer/call-offs', { tab: 'chase' })
    },
    {
      id: 'inventory-high-alerts',
      act: 'inventoryalert:close',
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
      act: 'capacitydecision:accept',
      roles: ['MP'],
      label: t('hub.home.task.capacityGaps'),
      count: gapPlans.length,
      deadlines: gapPlans.map((p) => gapWeeks(p)[0]?.week),
      to: deepLink('/buyer/capacity', { gapsOnly: '1' })
    },
    {
      // DRC-12a (BL-198) — raised once when a material's NPD tag drops: the
      // planner reviews its ROP on CO and IR, the real demand. No deadline
      // is recorded, so its severity is the computed "due soon" grey. The
      // link opens the material on Safety stock targets when every counted
      // material is the same one, else the page unfiltered.
      id: 'npd-rop-review',
      act: 'osiplevel:set',
      roles: ['MP'],
      label: t('hub.home.task.npdRopReview'),
      count: reviews.length,
      deadlines: [],
      to: deepLink('/buyer/safety-stock', {
        material: sharedValue(reviews, (r) => r.materialCode)
      })
    },
    {
      // BL-199 (DRC-13 BR-02) — PTI SOH reached ROP Fisik and no umbrella PO
      // balance is left: the planner creates a PR in SAP. No deadline is
      // recorded; the severity is computed from each material's cover
      // (SOH ÷ its ROP Fisik demand per day) against its supplier lead time.
      id: 'rop-fisik-pr',
      roles: ['MP'],
      label: t('hub.home.task.ropFisikPr'),
      count: prRecs.length,
      deadlines: [],
      stock: prRecs.flatMap((r) => {
        const f = r.figures.value;
        return f.demandPerDay !== null && f.demandPerDay > 0 && f.leadTimeDays !== null
          ? [{ daysOfCover: f.soh / f.demandPerDay, leadTimeDays: f.leadTimeDays }]
          : [];
      }),
      to: deepLink('/buyer/order-plan')
    },
    {
      // REQ-E06-03 BR-06 — after the deadline, a missing commitment escalates to the planner.
      id: 'missing-commitments',
      act: 'requirementresponse:review',
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
      act: 'requirementresponse:review',
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
      act: 'supplierask:raise',
      roles: ['MP'],
      label: t('hub.home.task.chase'),
      count: chaseRows.length,
      deadlines: chaseRows.flatMap((r) => r.commitmentEntries.map((e) => e.dueDate)),
      // IA P-05 — the follow-up tab of Supplier follow-ups lists every
      // supplier this count is over.
      to: deepLink('/buyer/comm-hub', { tab: 'follow-up' })
    },
    {
      // No deadline is recorded on a goods receipt to review.
      id: 'receipts',
      act: 'gr:inspect',
      roles: ['MP'],
      label: t('hub.home.task.receipts'),
      count: receiptsToReview.length,
      deadlines: [],
      // IA P-08 — the "Needs action" tab holds exactly these receipts; a
      // count of one opens the receipt.
      to: deepLink('/buyer/goods-receipt', {
        tab: 'action',
        open: onlyOne(receiptsToReview, (gr) => gr.id)
      })
    },
    {
      // REQ-E07-06 — a supplier disputed a receipt discrepancy; the planner
      // resolves it on the goods receipt page. No deadline is recorded.
      id: 'disputed-receipts',
      act: 'receiptdiscrepancy:resolve',
      roles: ['MP'],
      label: t('hub.home.task.disputedReceipts'),
      count: disputedReceipts.length,
      deadlines: [],
      // IA P-08 — the disputes section lists exactly these receipts.
      to: deepLink('/buyer/goods-receipt', { section: 'disputes' })
    },
    {
      id: 'inbound-asn',
      act: 'gr:receive',
      roles: ['MP'],
      label: t('hub.home.task.inboundAsn'),
      count: asnsDue.length,
      deadlines: asnsDue.map((a) => a.eta),
      // D4 (PR #74 review): pendingAsns (Submitted/In Transit) counts ASNs,
      // not the shipment rows the page's tabs filter. IA P-08 — the page
      // lists exactly these ASNs under `?asns=toReceive`; one arrives open.
      to: deepLink('/buyer/shipments', { asns: 'toReceive' })
    },
    // AIB-2 BR-05 (BL-350) — an inbound with no Expeditor acknowledgment,
    // past the one-working-day deadline. Shown only to a seat holding
    // `inbound:acknowledge`, because it is that seat's task.
    ...(holdsInboundAck
      ? [
          {
            id: 'inbound-acknowledgment',
            act: 'inbound:acknowledge',
            roles: /** @type {const} */ (['MP']),
            label: t('hub.home.task.inboundAcknowledgment'),
            count: inboundDue.length,
            deadlines: inboundDue.flatMap((r) => (r.dueAt ? [r.dueAt.toISOString()] : [])),
            to: '/buyer/inbound'
          }
        ]
      : []),
    {
      // REQ-E03-05 BR-03 — a round whose deadline is close and whose invitees
      // have not all answered. Derived from the clock at read (law 0.5).
      id: 'negotiation-closing',
      act: 'rfq:negotiate',
      roles: ['BUY'],
      label: t('hub.home.task.negotiationClosing'),
      count: closingRounds.length,
      deadlines: closingRounds.map((r) => r.deadline),
      // D3 (PR #74 review): the round closing soon need not be Open, so no
      // status tab holds it. IA P-08 — the board's rounds-closing view
      // shows the RFQs holding these rounds; when they are all on one RFQ,
      // its event page opens at its rounds.
      to: closingRfqId
        ? deepLink(`/buyer/rfq/${closingRfqId}`, { section: 'rounds' })
        : deepLink('/buyer/rfq', { view: 'roundsClosing' })
    },
    {
      id: 'rfq-award',
      act: 'rfq:award',
      roles: ['BUY'],
      label: t('hub.home.task.rfqAward'),
      count: awardRfqs.length,
      deadlines: awardRfqs.map((r) => r.awardDeadline),
      // IA P-08 — the "Ready to award" tile filters to exactly these RFQs;
      // a count of one opens the RFQ at its award section.
      to: awardRfqId
        ? deepLink(`/buyer/rfq/${awardRfqId}`, { section: 'award' })
        : deepLink('/buyer/rfq', { kpi: 'ready' })
    },
    {
      // IA P-03 (IA-B01) — UC1 step 2: a requisition waiting for Procurement's approval.
      id: 'requisitions-to-approve',
      act: 'pr:approve',
      roles: ['BUY'],
      label: t('hub.home.task.requisitionsToApprove'),
      count: prsToApprove.length,
      deadlines: prsToApprove.map((pr) => pr.requiredDate),
      to: deepLink('/buyer/purchase-requisition', {
        ...(prsToApprove.length === 1
          ? { open: prsToApprove[0].id }
          : { status: 'Pending Approval' })
      })
    },
    {
      // IA P-03 (IA-B02) — UC5 step 3: a certificate a supplier declared,
      // waiting for PTI to verify or reject it. No deadline is recorded.
      id: 'certs-to-review',
      act: 'supplierdoc:verify',
      roles: ['BUY'],
      label: t('hub.home.task.certsToReview'),
      count: declarationsToReview.length,
      deadlines: [],
      to: deepLink('/buyer/compliance', { section: 'review' })
    },
    {
      // UCX-P1 (BL-362) — UCX-PD6: a shelf-life exception waits for Quality.
      id: 'shelf-life-exceptions',
      act: 'asn:approve-shelf-life',
      roles: ['BUY'],
      label: t('hub.home.task.shelfLifeExceptions'),
      count: awaitingException.length,
      deadlines: [],
      noDeadlineAmber: true,
      to: '/buyer/shipments'
    },
    {
      // UCX-P1 (BL-362) — UCX-PD10: the supplier rejected; PTI changes and resends.
      id: 'rejected-calloffs',
      act: 'calloff:plan',
      roles: ['MP'],
      label: t('hub.home.task.rejectedCallOffs'),
      count: rejectedCallOffs.length,
      deadlines: [],
      noDeadlineAmber: true,
      to: '/buyer/call-offs'
    },
    {
      // UCX-P1 (BL-362) — UCX-PD24: a trade name waits for Material Planning.
      id: 'trade-names',
      act: 'materialname:review',
      roles: ['MP'],
      label: t('hub.home.task.tradeNames'),
      count: tradeEntries.length,
      deadlines: [],
      noDeadlineAmber: true,
      to: '/buyer/materials/trade-names'
    },
    {
      // UCX-P1 (BL-362) — UCX-PD14: an expiring certificate needs a renewal ask.
      id: 'certificate-renewals',
      act: 'supplierdoc:request',
      roles: ['BUY'],
      label: t('hub.home.task.certificateRenewals'),
      count: expiringCerts.length,
      deadlines: expiringCerts.flatMap((e) => (e.expiryDate ? [e.expiryDate] : [])),
      to: '/buyer/compliance'
    },
    {
      // REQ-E07-08 AC-02 — only a RETRYABLE failure is a task: a business
      // refusal is not something acting here can fix (CR-20). No deadline is recorded.
      id: 'sap-messages-failed',
      roles: ['MP'],
      label: t('hub.home.task.sapMessagesFailed'),
      count: sapFailures.filter(isRetryable).length,
      deadlines: [],
      to: '/buyer/interface-monitor'
    },
    {
      id: 'overdue-invoices',
      act: 'invoice:pay',
      roles: ['FIN'],
      label: t('hub.home.task.overdueInvoices'),
      count: overdueInv.length,
      deadlines: overdueInv.map((i) => i.dueDate),
      to: deepLink('/buyer/invoices', { tab: 'queue', status: 'Overdue' })
    }
  ];
  return role === 'ALL' ? all : all.filter((task) => task.roles.includes(role));
}
