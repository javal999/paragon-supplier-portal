/** @import React from 'react' */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePlanningGroupLabel } from './inventory/planningGroupDisplay';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import {
  useASNs,
  useCapacityPlans,
  useDocuments,
  useForecastCommitments,
  useForecastVersions,
  useInventory,
  useInventoryAlerts,
  useGoodsReceipts,
  usePurchaseOrders,
  useRFQs,
  useRfiEvents,
  useRfpEvents,
  useNegotiationRounds,
  useSupplierInvoices
} from '@services/query/hooks';
import { POStatus } from '@services/data/types';
import { documentDisplayState } from '@services/data/documentDisplayState';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';
/** @import { HomeTask } from './home/TaskList' */
import TaskList from './home/TaskList';
/** @import { UnratedTask } from './home/severityDisplay' */
import { withSeverity } from './home/severityDisplay';
import { responseDeadline } from '@services/data/poResponseProjection';
import { effectiveDeadline } from '@services/transitions/rfxRules';
import { awaitsSupplierAnswer } from '@services/transitions/fulfilmentRules';
import { isDueWithoutHeadsUp } from '@services/transitions/callOffRules';
import { useCallOffViews } from './callOffs/callOffDisplay';
import { planStatus } from '@services/transitions/capacityRules';
import { positionRisk, stockFreshness } from '@services/transitions/inventoryRules';
import { alertHref } from '@services/transitions/inventoryAlertRules';
import { deadlineState } from '@services/transitions/forecastRules';
import { forecastNow } from './forecasts/forecastDisplay';
import Data from '@components/ui-v2/Data';
import { RiskPill, inventoryNow } from './inventory/inventoryDisplay';
import { sdcClock } from '@services/sdc/clock';
import { deepLink, sharedValue } from '@lib/deepLink';
import WeeklyUpdatePanel, { weeklyUpdateView } from './inventory/WeeklyUpdatePanel';

// Supplier Home — "To do" (REQUIREMENTS §3.8 SC-01): what Paragon is waiting for
// from this supplier. Filters match the supplier dashboard widgets they replace.
// Severity is computed from each task's own deadlines and stock cover
// (home/taskSeverity.js), the same rule as Buyer Home — never from its type.

/** @type {React.FC} */
const SupplierHome = () => {
  const { t } = useTranslation();
  const groupLabel = usePlanningGroupLabel();
  const { identity } = useCurrentIdentity();
  const supplierId = identity.supplierId;
  const pos = usePurchaseOrders();
  const rfqs = useRFQs();
  // REQ-E03-02 / REQ-E03-04 / REQ-E03-05 — the RFx invitations and this
  // supplier's own negotiation thread (Phase 6a).
  const rfiEvents = useRfiEvents();
  const rfpEvents = useRfpEvents();
  const rounds = useNegotiationRounds();
  const invoices = useSupplierInvoices();
  const documents = useDocuments();
  const receipts = useGoodsReceipts();
  const asns = useASNs();
  // REQ-E09-03 / REQ-E09-04 — the supplier's own call-offs (the read is scoped).
  const callOffs = useCallOffViews();
  // REQ-E08-01 / 04 / 05 — the supplier's stock freshness, capacity and alerts.
  const stock = useInventory();
  const capacity = useCapacityPlans();
  const alerts = useInventoryAlerts();
  const openAlerts = (alerts.data?.items ?? []).filter((a) => a.status === 'open');
  // REQ-E06-01 / REQ-E06-03 BR-06 — new versions and commitment reminders.
  const forecastLines = useForecastCommitments();
  const forecastVersions = useForecastVersions();

  const tasks = /** @type {HomeTask[]} */ (
    useMemo(() => {
      // One "today" for every lane, the clock the supplier pages read.
      const nowIso = sdcClock.now();
      const poItems = pos.data?.items ?? [];
      const toConfirm = poItems.filter(
        (po) => po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED
      );
      const readyToShip = poItems.filter((po) => po.status === POStatus.CONFIRMED);
      const noNotice = poItems.filter(
        (po) =>
          (po.status === POStatus.CONFIRMED || po.status === POStatus.PARTIALLY_DELIVERED) &&
          !po.shippingNotice?.expectedCompletionDate
      );
      const openRfqs = (rfqs.data?.items ?? []).filter(
        (r) => r.status === 'Open' && !!supplierId && !r.respondedSupplierIds.includes(supplierId)
      );
      const docs = documents.data?.items ?? [];
      const certsDue = docs.filter((doc) => {
        const state = documentDisplayState(doc, DECLARED_PRESENT);
        return state === 'expired' || state === 'expiring';
      });
      // The documents link narrows by kind; both kinds partition certsDue.
      const expired = certsDue.filter(
        (doc) => documentDisplayState(doc, DECLARED_PRESENT) === 'expired'
      );
      const expiring = certsDue.filter(
        (doc) => documentDisplayState(doc, DECLARED_PRESENT) === 'expiring'
      );
      const unpaid = (invoices.data?.items ?? []).filter(
        (i) => i.status !== 'Payment Released' && i.status !== 'Remittance Received'
      );
      const asnItems = asns.data?.items ?? [];
      // REQ-E07-06 — receipts that differ from what was shipped (or had quantity
      // rejected) and still wait for this supplier's answer. Derived at read time.
      const toAnswer = (receipts.data?.items ?? []).filter((gr) =>
        awaitsSupplierAnswer(
          gr,
          asnItems.find((a) => a.asnNumber === gr.asnNumber)
        )
      );
      const returned = (invoices.data?.items ?? []).filter((i) => i.stage === 'Returned');
      const toConfirmCallOffs = callOffs.views.filter(
        (v) => v.callOff.status === 'Awaiting Confirmation'
      );
      const dueCallOffs = callOffs.views.filter((v) => isDueWithoutHeadsUp(v, callOffs.nowIso));
      const positions = (stock.data?.items ?? []).filter((p) => p.supplierId === supplierId);
      const stalePositions = positions.filter(
        (p) => stockFreshness(p, inventoryNow()) !== 'current'
      );
      // Material B2 (MR-1 d step 2) — the in-hub reminder: from 09:00 WIB on the
      // working day before the cutoff, a manual supplier's materials still
      // missing this cycle. Derived, never stored.
      const weekly =
        supplierId && positions.length > 0 && !positions.some((p) => p.apiConnected)
          ? weeklyUpdateView(supplierId, positions, inventoryNow())
          : null;
      const weeklyMissing = weekly?.reminder ? weekly.status.missing : [];
      const capacityDue = (capacity.data?.items ?? []).filter(
        (p) => planStatus(p) === 'notStarted' || planStatus(p) === 'outdated'
      );
      const unviewed = (forecastVersions.data?.items ?? []).filter(
        (v) =>
          v.isCurrent && v.suppliers.some((s) => s.supplierId === supplierId && s.viewedAt === null)
      );
      const lines = forecastLines.data?.items ?? [];
      const unviewedLines = lines.filter((l) =>
        unviewed.some((v) => v.publicationId === l.publicationId)
      );
      const overdueLines = lines.filter((l) => deadlineState(l, forecastNow()) === 'overdue');
      const dueSoonLines = lines.filter((l) => deadlineState(l, forecastNow()) === 'dueSoon');
      const revisionLines = lines.filter((l) => l.state === 'revisionRequested');
      const openRfis = (rfiEvents.data?.items ?? []).filter(
        (e) => !e.closed && e.responses.every((r) => r.status !== 'Submitted')
      );
      const openRfps = (rfpEvents.data?.items ?? []).filter(
        (e) => !e.closed && e.responses.every((r) => r.status !== 'Submitted')
      );
      const openRounds = (rounds.data?.items ?? []).filter((r) => !r.closed && r.awaiting > 0);

      /**
       * CR-24 — this supplier's cover against its lead time, for the materials a
       * task is about. Only figures with a lead time on record take part.
       * @param {readonly string[]} codes
       * @returns {{ daysOfCover: number; leadTimeDays: number }[]}
       */
      const coverOf = (codes) =>
        positions
          .filter((p) => codes.includes(p.materialCode))
          .flatMap((p) => {
            const { basis } = positionRisk(p);
            return basis.kind === 'leadTime'
              ? [{ daysOfCover: basis.daysOfCover, leadTimeDays: basis.leadTimeDays }]
              : [];
          });
      /** @param {readonly { lineItems: readonly { materialCode: string }[] }[]} orders */
      const poMaterials = (orders) =>
        orders.flatMap((po) => po.lineItems.map((l) => l.materialCode));

      // Each task names the deadline of every record it counts and, where it is
      // about supply, this supplier's cover against lead time. severityDisplay.js
      // decides URGENT / DUE SOON. `noDeadlineAmber` — no deadline is defined for
      // these yet, so they stay "Due soon" (amber) until one is (owner ruling).
      /** @type {UnratedTask[]} */
      const rated = [
        {
          // REQ-E07-02 — the 1-working-day response deadline.
          id: 'confirm-orders',
          label: t('hub.home.task.sup.confirmOrders'),
          count: toConfirm.length,
          deadlines: toConfirm.map((po) => responseDeadline(po).toISOString()),
          stock: coverOf(poMaterials(toConfirm)),
          to: deepLink('/supplier/orders', { tab: 'action' })
        },
        {
          // REQ-E09-03 — released call-offs waiting for this supplier's answer.
          id: 'confirm-calloffs',
          label: t('hub.home.task.sup.callOffsConfirm'),
          count: toConfirmCallOffs.length,
          deadlines: toConfirmCallOffs.map((v) => v.deadline?.toISOString() ?? v.callOff.needDate),
          stock: coverOf(toConfirmCallOffs.map((v) => v.callOff.materialCode)),
          to: deepLink('/supplier/call-offs', { status: 'toConfirm' })
        },
        {
          // CR-09 — confirmed, due within 7 days, and no ASN or dispatch notice yet.
          id: 'calloffs-due',
          label: t('hub.home.task.sup.callOffsDue'),
          count: dueCallOffs.length,
          deadlines: dueCallOffs.map((v) => v.dueDate),
          stock: coverOf(dueCallOffs.map((v) => v.callOff.materialCode)),
          to: deepLink('/supplier/call-offs', { status: 'dueSoon' })
        },
        {
          // REQ-E08-01 AC-05 — figures past their data-update SLA, or never sent
          // (a figure never sent is due at this cycle's cutoff).
          id: 'stale-stock',
          label: t('hub.home.task.sup.staleStock'),
          count: stalePositions.length,
          deadlines: stalePositions.map((p) => p.staleAt ?? weekly?.status.cycle.cutoff),
          stock: coverOf(stalePositions.map((p) => p.materialCode)),
          to: deepLink('/supplier/inventory', { stale: 'stale' })
        },
        {
          id: 'weekly-update',
          label: t('hub.home.task.sup.weeklyUpdate'),
          count: weeklyMissing.length,
          deadlines: weekly ? [weekly.status.cycle.cutoff] : [],
          stock: coverOf(weeklyMissing),
          to: '/supplier/inventory'
        },
        {
          // REQ-E08-04 — a material group with no current capacity confirmation.
          // No due date is defined; the first week the plan does not cover stands in.
          id: 'capacity-due',
          label: t('hub.home.task.sup.capacityDue'),
          count: capacityDue.length,
          deadlines: capacityDue.map(
            (p) => p.weeks.find((w) => w.entry === null || w.needsReEntry === true)?.week
          ),
          stock: coverOf(capacityDue.flatMap((p) => p.materials)),
          // D7 (PR #74 review): only narrow to a group when every due plan
          // shares one.
          to: deepLink('/supplier/capacity', {
            group: sharedValue(capacityDue, (p) => p.planningGroupId)
          })
        },
        {
          // REQ-E06-01 — a published version this supplier has not opened yet. No
          // view-by date exists; the version's earliest commitment deadline stands in.
          id: 'new-forecast',
          label: t('hub.home.task.sup.newForecast'),
          count: unviewed.length,
          deadlines: unviewedLines.map((l) => l.dueAt),
          stock: coverOf(unviewedLines.map((l) => l.materialCode)),
          to: deepLink('/supplier/forecasts', {
            stream: sharedValue(unviewed, (v) => v.stream)
          })
        },
        {
          // REQ-E06-03 BR-06 — the reminder at the deadline.
          id: 'commitments-overdue',
          label: t('hub.home.task.sup.commitmentsOverdue'),
          count: overdueLines.length,
          deadlines: overdueLines.map((l) => l.dueAt),
          stock: coverOf(overdueLines.map((l) => l.materialCode)),
          to: deepLink('/supplier/forecasts', {
            stream: sharedValue(overdueLines, (l) => l.stream)
          })
        },
        {
          // REQ-E06-03 BR-06 — the reminder at half the deadline.
          id: 'commitments-due-soon',
          label: t('hub.home.task.sup.commitmentsDueSoon'),
          count: dueSoonLines.length,
          deadlines: dueSoonLines.map((l) => l.dueAt),
          stock: coverOf(dueSoonLines.map((l) => l.materialCode)),
          to: deepLink('/supplier/forecasts', {
            stream: sharedValue(dueSoonLines, (l) => l.stream)
          })
        },
        {
          // REQ-E06-03 BR-05 — the planner asked for a revision, with a note.
          id: 'commitments-revision',
          label: t('hub.home.task.sup.revisionRequested'),
          count: revisionLines.length,
          deadlines: [],
          stock: coverOf(revisionLines.map((l) => l.materialCode)),
          noDeadlineAmber: true,
          to: deepLink('/supplier/forecasts', {
            stream: sharedValue(revisionLines, (l) => l.stream)
          })
        },
        {
          // REQ-E07-05 — a confirmed order still owes its expected completion date.
          id: 'shipping-notice',
          label: t('hub.home.task.sup.shippingNotice'),
          count: noNotice.length,
          deadlines: [],
          stock: coverOf(poMaterials(noNotice)),
          noDeadlineAmber: true,
          to: '/supplier/order-summary'
        },
        {
          // Ship by the confirmed delivery date (several orders carry an empty
          // one), else the requested date.
          id: 'create-asn',
          label: t('hub.home.task.sup.createAsn'),
          count: readyToShip.length,
          deadlines: readyToShip.map((po) => po.confirmedDeliveryDate || po.requestedDeliveryDate),
          stock: coverOf(poMaterials(readyToShip)),
          to: deepLink('/supplier/shipments', { tab: 'create' })
        },
        {
          id: 'receipt-discrepancies',
          label: t('hub.home.task.sup.receiptDiscrepancies'),
          count: toAnswer.length,
          deadlines: [],
          stock: coverOf(toAnswer.flatMap((gr) => gr.inspectionResults.map((r) => r.materialCode))),
          noDeadlineAmber: true,
          to: deepLink('/supplier/goods-receipts', { status: 'awaiting' })
        },
        {
          // REQ-E07-07 — Finance returned the invoice with a reason.
          id: 'returned-invoices',
          label: t('hub.home.task.sup.returnedInvoices'),
          count: returned.length,
          deadlines: [],
          noDeadlineAmber: true,
          to: deepLink('/supplier/invoices', { stage: 'Returned' })
        },
        {
          // REQ-E03-03 BR-05 — this supplier's own deadline, extension included.
          id: 'rfq',
          label: t('hub.home.task.sup.rfq'),
          count: openRfqs.length,
          deadlines: openRfqs.map((r) =>
            effectiveDeadline(r.responseDeadline, r.inviteeDeadlines ?? [], supplierId ?? '')
          ),
          to: deepLink('/supplier/rfq', { tab: 'open' })
        },
        {
          // REQ-E03-02 — an information request still to answer: invited, and no
          // SUBMITTED response (a draft is still "to answer").
          id: 'rfi-answer',
          label: t('hub.home.task.rfiToAnswer'),
          count: openRfis.length,
          deadlines: openRfis.map((e) =>
            effectiveDeadline(e.responseDeadline, e.invitedSuppliers, supplierId ?? '')
          ),
          to: '/supplier/rfi'
        },
        {
          // REQ-E03-04 — a proposal request still to answer.
          id: 'rfp-answer',
          label: t('hub.home.task.rfpToAnswer'),
          count: openRfps.length,
          deadlines: openRfps.map((e) =>
            effectiveDeadline(e.responseDeadline, e.invitedSuppliers, supplierId ?? '')
          ),
          to: '/supplier/rfp'
        },
        {
          // REQ-E03-05 — PTI asked for a revised quote and this supplier has not
          // sent one. The read already narrows the round to its own thread.
          id: 'revised-quote',
          label: t('hub.home.task.revisedQuote'),
          count: openRounds.length,
          deadlines: openRounds.map((r) => r.deadline),
          to: '/supplier/rfq/rounds'
        },
        {
          // An expired certificate's deadline has passed; an expiring one is due
          // on its expiry date.
          id: 'certs',
          label: t('hub.home.task.sup.certs'),
          count: certsDue.length,
          deadlines: certsDue.map((doc) => doc.expiryDate),
          // D6 (PR #74 review): the page's `expiry` filter is single-valued
          // (all/expired/expiring). Narrow to whichever kind the count is
          // entirely made of; when both kinds are present, no single value
          // covers the whole count, so link unfiltered rather than hiding
          // half of it.
          to: deepLink('/supplier/documents', {
            expiry:
              expired.length > 0 && expiring.length === 0
                ? 'expired'
                : expiring.length > 0 && expired.length === 0
                  ? 'expiring'
                  : undefined
          })
        }
      ];
      return [
        ...withSeverity(rated, nowIso, t),
        // Money PTI owes this supplier, not something the supplier does: it stays
        // "To review", outside the urgency ranking, and last (`none` renders as
        // `info` but sorts below every due task).
        {
          id: 'invoices',
          label: t('hub.home.task.sup.invoices'),
          count: unpaid.length,
          severity: /** @type {const} */ ('none'),
          to: '/supplier/invoices'
        }
      ];
    }, [
      pos.data,
      rfqs.data,
      invoices.data,
      documents.data,
      receipts.data,
      asns.data,
      callOffs.views,
      callOffs.nowIso,
      stock.data,
      capacity.data,
      forecastLines.data,
      forecastVersions.data,
      rfiEvents.data,
      rfpEvents.data,
      rounds.data,
      supplierId,
      t
    ])
  );

  if (!supplierId) return <NoSupplierIdentity />;

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[t('hub.home.crumb'), t('hub.home.sup.title')]}
        title={t('hub.home.sup.title')}
        subtitle={t('hub.home.sup.subtitle')}
      />
      <div className="mb-4">
        <SampleDataBadge />
      </div>
      {/* Material B2 — the weekly update (manual) or the sync schedule (API). */}
      <WeeklyUpdatePanel
        supplierId={supplierId}
        positions={stock.data?.items ?? []}
        nowIso={inventoryNow()}
      />
      <TaskList tasks={tasks} />
      {openAlerts.length > 0 && (
        <section className="mt-6" data-testid="supplier-home-alerts">
          <h2 className="text-section text-text-primary mb-2">{t('inv.alerts.sup.title')}</h2>
          <ul className="bg-bg-surface border border-border-subtle rounded-lg divide-y divide-border-subtle">
            {openAlerts.map((a) => (
              <li key={a.key} className="px-4 py-3 flex flex-wrap items-center gap-3">
                <RiskPill riskClass={a.riskClass} />
                <span className="text-sm text-text-primary">
                  {t(`inv.alerts.sup.rule.${a.rule}`)}
                </span>
                <span className="text-xs text-text-secondary">
                  {a.rule === 'capacityBelowDemand' ? (
                    groupLabel(a.subject)
                  ) : (
                    <Data>{a.subject}</Data>
                  )}
                </span>
                <Link to={alertHref(a, 'supplier')} className="text-sm text-action hover:underline">
                  {t(
                    a.rule === 'capacityBelowDemand'
                      ? 'inv.alerts.openCapacity'
                      : a.rule === 'commitmentBelowForecast'
                        ? 'inv.alerts.openCommitments'
                        : 'inv.alerts.openInventory'
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShellV2>
  );
};

export default SupplierHome;
