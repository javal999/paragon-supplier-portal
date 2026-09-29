import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlanningGroupLabel } from './inventory/planningGroupDisplay';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
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
  useSupplierInvoices,
} from '../services/query/hooks';
import { POStatus } from '../services/data/types';
import { documentDisplayState } from '../services/data/documentDisplayState';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import TaskList, { type HomeTask } from './home/TaskList';
import { awaitsSupplierAnswer } from '../services/transitions/fulfilmentRules';
import { isDueWithoutHeadsUp } from '../services/transitions/callOffRules';
import { useCallOffViews } from './callOffs/callOffDisplay';
import { planStatus } from '../services/transitions/capacityRules';
import { stockFreshness } from '../services/transitions/inventoryRules';
import { alertHref } from '../services/transitions/inventoryAlertRules';
import { deadlineState } from '../services/transitions/forecastRules';
import { forecastNow } from './forecasts/forecastDisplay';
import Data from '../components/ui-v2/Data';
import { RiskPill, inventoryNow } from './inventory/inventoryDisplay';
import { sdcClock } from '../services/sdc/clock';
import { deepLink } from '../lib/deepLink';
import WeeklyUpdatePanel, { weeklyUpdateView } from './inventory/WeeklyUpdatePanel';

// Supplier Home — "To do" (REQUIREMENTS §3.8 SC-01): what Paragon is waiting for
// from this supplier. Filters match the supplier dashboard widgets they replace.

const SupplierHome: React.FC = () => {
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

  const tasks = useMemo<HomeTask[]>(() => {
    const poItems = pos.data?.items ?? [];
    const toConfirm = poItems.filter(
      (po) => po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED,
    );
    const readyToShip = poItems.filter((po) => po.status === POStatus.CONFIRMED);
    const now = Date.parse(sdcClock.now());
    const openRfqs = (rfqs.data?.items ?? []).filter(
      (r) => r.status === 'Open' && !!supplierId && !r.respondedSupplierIds.includes(supplierId),
    );
    const lateRfqs = openRfqs.filter((r) => new Date(r.responseDeadline).getTime() < now);
    const docs = documents.data?.items ?? [];
    const expired = docs.filter((doc) => documentDisplayState(doc, DECLARED_PRESENT) === 'expired');
    const expiring = docs.filter((doc) => documentDisplayState(doc, DECLARED_PRESENT) === 'expiring');
    const unpaid = (invoices.data?.items ?? []).filter(
      (i) => i.status !== 'Payment Released' && i.status !== 'Remittance Received',
    );
    const asnItems = asns.data?.items ?? [];
    // REQ-E07-06 — receipts that differ from what was shipped (or had quantity
    // rejected) and still wait for this supplier's answer. Derived at read time.
    const toAnswer = (receipts.data?.items ?? []).filter((gr) =>
      awaitsSupplierAnswer(gr, asnItems.find((a) => a.asnNumber === gr.asnNumber)),
    );
    const returned = (invoices.data?.items ?? []).filter((i) => i.stage === 'Returned');
    const capacityDuePlans = (capacity.data?.items ?? []).filter(
      (p) => planStatus(p) === 'notStarted' || planStatus(p) === 'outdated',
    );
    const newForecastVersions = (forecastVersions.data?.items ?? []).filter(
      (v) => v.isCurrent && v.suppliers.some((s) => s.supplierId === supplierId && s.viewedAt === null),
    );
    const overdueLines = (forecastLines.data?.items ?? []).filter((l) => deadlineState(l, forecastNow()) === 'overdue');
    const dueSoonLines = (forecastLines.data?.items ?? []).filter((l) => deadlineState(l, forecastNow()) === 'dueSoon');
    const revisionLines = (forecastLines.data?.items ?? []).filter((l) => l.state === 'revisionRequested');
    return [
      {
        id: 'confirm-orders',
        label: t('hub.home.task.sup.confirmOrders'),
        count: toConfirm.length,
        severity: 'critical',
        to: deepLink('/supplier/orders', { tab: 'action' }),
      },
      {
        // REQ-E09-03 — released call-offs waiting for this supplier's answer.
        id: 'confirm-calloffs',
        label: t('hub.home.task.sup.callOffsConfirm'),
        count: callOffs.views.filter((v) => v.callOff.status === 'Awaiting Confirmation').length,
        severity: callOffs.views.some((v) => v.confirmation === 'Escalated') ? 'critical' : 'warning',
        to: deepLink('/supplier/call-offs', { status: 'toConfirm' }),
      },
      {
        // CR-09 — confirmed, due within 7 days, and no ASN or dispatch notice yet.
        id: 'calloffs-due',
        label: t('hub.home.task.sup.callOffsDue'),
        count: callOffs.views.filter((v) => isDueWithoutHeadsUp(v, callOffs.nowIso)).length,
        severity: 'warning',
        to: deepLink('/supplier/call-offs', { status: 'dueSoon' }),
      },
      {
        // REQ-E08-01 AC-05 — figures past their data-update SLA, or never sent.
        id: 'stale-stock',
        label: t('hub.home.task.sup.staleStock'),
        count: (stock.data?.items ?? []).filter((p) => stockFreshness(p, inventoryNow()) !== 'current').length,
        severity: 'warning',
        to: deepLink('/supplier/inventory', { stale: 'stale' }),
      },
      {
        // Material B2 (MR-1 d step 2) — the in-hub reminder: from 09:00 WIB on
        // the working day before the cutoff, a manual supplier's materials
        // still missing this cycle. Derived, never stored.
        id: 'weekly-update',
        label: t('hub.home.task.sup.weeklyUpdate'),
        count: (() => {
          const items = stock.data?.items ?? [];
          if (!supplierId || items.length === 0 || items.some((p) => p.apiConnected)) return 0;
          const view = weeklyUpdateView(supplierId, items, inventoryNow());
          return view.reminder === null ? 0 : view.status.missing.length;
        })(),
        severity: 'warning',
        to: '/supplier/inventory',
      },
      {
        // REQ-E08-04 — a material group with no current capacity confirmation.
        id: 'capacity-due',
        label: t('hub.home.task.sup.capacityDue'),
        count: capacityDuePlans.length,
        severity: 'warning',
        to: deepLink('/supplier/capacity', { group: capacityDuePlans[0]?.planningGroupId }),
      },
      {
        // REQ-E06-01 — a published version this supplier has not opened yet.
        id: 'new-forecast',
        label: t('hub.home.task.sup.newForecast'),
        count: newForecastVersions.length,
        severity: 'warning',
        to: deepLink('/supplier/forecasts', { stream: newForecastVersions[0]?.stream }),
      },
      {
        // REQ-E06-03 BR-06 — the reminder at the deadline.
        id: 'commitments-overdue',
        label: t('hub.home.task.sup.commitmentsOverdue'),
        count: overdueLines.length,
        severity: 'critical',
        to: deepLink('/supplier/forecasts', { stream: overdueLines[0]?.stream }),
      },
      {
        // REQ-E06-03 BR-06 — the reminder at half the deadline.
        id: 'commitments-due-soon',
        label: t('hub.home.task.sup.commitmentsDueSoon'),
        count: dueSoonLines.length,
        severity: 'warning',
        to: deepLink('/supplier/forecasts', { stream: dueSoonLines[0]?.stream }),
      },
      {
        // REQ-E06-03 BR-05 — the planner asked for a revision, with a note.
        id: 'commitments-revision',
        label: t('hub.home.task.sup.revisionRequested'),
        count: revisionLines.length,
        severity: 'warning',
        to: deepLink('/supplier/forecasts', { stream: revisionLines[0]?.stream }),
      },
      {
        // REQ-E07-05 — a confirmed order still owes its expected completion date.
        id: 'shipping-notice',
        label: t('hub.home.task.sup.shippingNotice'),
        count: poItems.filter(
          (po) =>
            (po.status === POStatus.CONFIRMED || po.status === POStatus.PARTIALLY_DELIVERED) &&
            !po.shippingNotice?.expectedCompletionDate,
        ).length,
        severity: 'warning',
        to: '/supplier/order-summary',
      },
      {
        id: 'create-asn',
        label: t('hub.home.task.sup.createAsn'),
        count: readyToShip.length,
        severity: 'warning',
        to: deepLink('/supplier/shipments', { tab: 'create' }),
      },
      {
        id: 'receipt-discrepancies',
        label: t('hub.home.task.sup.receiptDiscrepancies'),
        count: toAnswer.length,
        severity: 'warning',
        to: deepLink('/supplier/goods-receipts', { status: 'awaiting' }),
      },
      {
        // REQ-E07-07 — Finance returned the invoice with a reason.
        id: 'returned-invoices',
        label: t('hub.home.task.sup.returnedInvoices'),
        count: returned.length,
        severity: 'critical',
        to: deepLink('/supplier/invoices', { stage: 'Returned' }),
      },
      {
        id: 'rfq',
        label: t('hub.home.task.sup.rfq'),
        count: openRfqs.length,
        severity: lateRfqs.length > 0 ? 'critical' : 'warning',
        to: deepLink('/supplier/rfq', { tab: 'open' }),
      },
      {
        // REQ-E03-02 — an information request still to answer: invited, and no
        // SUBMITTED response (a draft is still "to answer").
        id: 'rfi-answer',
        label: t('hub.home.task.rfiToAnswer'),
        count: (rfiEvents.data?.items ?? []).filter(
          (e) => !e.closed && e.responses.every((r) => r.status !== 'Submitted'),
        ).length,
        severity: 'warning',
        to: '/supplier/rfi',
      },
      {
        // REQ-E03-04 — a proposal request still to answer.
        id: 'rfp-answer',
        label: t('hub.home.task.rfpToAnswer'),
        count: (rfpEvents.data?.items ?? []).filter(
          (e) => !e.closed && e.responses.every((r) => r.status !== 'Submitted'),
        ).length,
        severity: 'warning',
        to: '/supplier/rfp',
      },
      {
        // REQ-E03-05 — PTI asked for a revised quote and this supplier has not
        // sent one. The read already narrows the round to its own thread.
        id: 'revised-quote',
        label: t('hub.home.task.revisedQuote'),
        count: (rounds.data?.items ?? []).filter((r) => !r.closed && r.awaiting > 0).length,
        severity: 'critical',
        to: '/supplier/rfq/rounds',
      },
      {
        id: 'certs',
        label: t('hub.home.task.sup.certs'),
        count: expired.length + expiring.length,
        severity: expired.length > 0 ? 'critical' : 'warning',
        to: deepLink('/supplier/documents', { expiry: expired.length > 0 ? 'expired' : expiring.length > 0 ? 'expiring' : undefined }),
      },
      {
        id: 'invoices',
        label: t('hub.home.task.sup.invoices'),
        count: unpaid.length,
        severity: 'info',
        to: '/supplier/invoices',
      },
    ];
  }, [pos.data, rfqs.data, invoices.data, documents.data, receipts.data, asns.data, callOffs.views, callOffs.nowIso, stock.data, capacity.data, forecastLines.data, forecastVersions.data, rfiEvents.data, rfpEvents.data, rounds.data, supplierId, t]);

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
      <WeeklyUpdatePanel supplierId={supplierId} positions={stock.data?.items ?? []} nowIso={inventoryNow()} />
      <TaskList tasks={tasks} />
      {openAlerts.length > 0 && (
        <section className="mt-6" data-testid="supplier-home-alerts">
          <h2 className="text-section text-text-primary mb-2">{t('inv.alerts.sup.title')}</h2>
          <ul className="bg-bg-surface border border-border-subtle rounded-lg divide-y divide-border-subtle">
            {openAlerts.map((a) => (
              <li key={a.key} className="px-4 py-3 flex flex-wrap items-center gap-3">
                <RiskPill riskClass={a.riskClass} />
                <span className="text-sm text-text-primary">{t(`inv.alerts.sup.rule.${a.rule}`)}</span>
                <span className="text-xs text-text-secondary">
                  {a.rule === 'capacityBelowDemand' ? groupLabel(a.subject) : <Data>{a.subject}</Data>}
                </span>
                <Link to={alertHref(a, 'supplier')} className="text-sm text-action hover:underline">
                  {t(
                    a.rule === 'capacityBelowDemand'
                      ? 'inv.alerts.openCapacity'
                      : a.rule === 'commitmentBelowForecast'
                        ? 'inv.alerts.openCommitments'
                        : 'inv.alerts.openInventory',
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
