/** @import React from 'react' */
/** @import { Grade } from './const' */
import { useMemo, useState } from 'react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { PreferredChannel } from '@app-types/supplier.types';
import { POStatus } from '@services/data/types';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import OrdersToConfirmWidget from '../widgets/OrdersToConfirmWidget';
import SupplierInvoicePaymentWidget from '../widgets/SupplierInvoicePaymentWidget';
import SupplierRfqToRespondWidget from '../widgets/SupplierRfqToRespondWidget';
import SupplierCertsExpiringWidget from '../widgets/SupplierCertsExpiringWidget';
import {
  useCurrentSupplier,
  usePurchaseOrders,
  useSupplierInvoices,
  useDocuments
} from '@services/query/hooks';
import { documentDisplayState } from '@services/data/documentDisplayState';
import { daysUntil } from '@services/data/dayProjection';
import { sdcClock } from '@services/sdc/clock';
import { TODAY } from './const';
import { buildBriefingActions, perfVariant } from './utils';
import IdentityCard from './components/IdentityCard';
import KpiStrip from './components/KpiStrip';
import BriefingPanel from './components/BriefingPanel';
import RecentOrdersTable from './components/RecentOrdersTable';
import PerformancePanel from './components/PerformancePanel';
import DocumentsPanel from './components/DocumentsPanel';

// Channel labels map to i18n keys; resolved with t() at the call site.
/** @type {Record<PreferredChannel, string>} */
const CHANNEL_KEY = {
  [PreferredChannel.WHATSAPP]: 'supplierDashboard.channel.whatsapp',
  [PreferredChannel.WEB]: 'supplierDashboard.channel.web',
  [PreferredChannel.EMAIL]: 'supplierDashboard.channel.email',
  [PreferredChannel.API]: 'supplierDashboard.channel.api'
};

/**
 * The supplier home (`/supplier/dashboard`): identity card, KPI strip, the
 * module widgets, today's briefing, recent orders, performance and documents.
 * Owns every query, the derived counts and the dismissed-briefing state (kept
 * here so it survives the loading / error / empty early returns); the
 * sections live in `./components`. Split by Phase 5 (no behaviour change).
 * @type {React.FC}
 */
const SupplierDashboard = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const dashCrumb = [t('supplierDashboard.crumb.acquire'), t('supplierDashboard.crumb.dashboard')];
  const [dismissedActions, setDismissedActions] = useState(/** @type {string[]} */ ([]));

  const supplierQuery = useCurrentSupplier();
  const posQuery = usePurchaseOrders();
  const invoicesQuery = useSupplierInvoices();
  const documentsQuery = useDocuments();

  const mySupplier = supplierQuery.data ?? null;

  const MY_POS = useMemo(() => posQuery.data?.items ?? [], [posQuery.data]);

  const unpaidInvoices = useMemo(
    () =>
      (invoicesQuery.data?.items ?? []).filter(
        (inv) => inv.status !== 'Payment Released' && inv.status !== 'Remittance Received'
      ).length,
    [invoicesQuery.data]
  );

  // The instant every clock read on this page reckons against — the
  // convention `SupplierDocuments` and the certs widget already use, so all
  // three answer as of the same moment rather than three `Date.now()` calls.
  const nowIso = TODAY;

  const documents = useMemo(
    () => (documentsQuery.data?.items ?? []).slice(0, 4),
    [documentsQuery.data]
  );

  /**
   * The one certificate the briefing should be shouting about — the SOONEST
   * of those that actually compute `expiring` or `expired`, or none.
   *
   * ⚠️ Read from `documentsQuery` and NOT from `documents`, which is sliced
   * to the first four for the tile below. A briefing that only noticed an
   * expiry when it happened to fall in the first four rows would be a
   * population bug wearing a layout decision.
   */
  const expiringDoc = useMemo(() => {
    const due = (documentsQuery.data?.items ?? [])
      .map((doc) => ({ doc, days: daysUntil(doc.expiryDate, nowIso) ?? 0 }))
      .filter(({ doc }) => {
        const st = documentDisplayState(doc, nowIso);
        return st === 'expiring' || st === 'expired';
      })
      .sort((x, y) => x.days - y.days);
    return due[0] ?? null;
  }, [documentsQuery.data, nowIso]);

  /** @param {string} id */
  const dismiss = (id) => setDismissedActions((prev) => [...prev, id]);

  const openOrders = useMemo(
    () =>
      MY_POS.filter((po) => po.status !== POStatus.DELIVERED && po.status !== POStatus.CLOSED)
        .length,
    [MY_POS]
  );

  const pendingASNs = useMemo(
    () => MY_POS.filter((po) => po.status === POStatus.CONFIRMED).length,
    [MY_POS]
  );

  const needsConfirmCount = useMemo(
    () =>
      MY_POS.filter((po) => po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED)
        .length,
    [MY_POS]
  );

  const asnDueOrders = useMemo(
    () =>
      MY_POS.filter((po) => {
        if (po.status !== POStatus.CONFIRMED) return false;
        const delivery = new Date(po.requestedDeliveryDate);
        const today = new Date(TODAY);
        const daysLeft = Math.ceil((delivery.getTime() - today.getTime()) / 86_400_000);
        return daysLeft <= 7;
      }),
    [MY_POS]
  );

  if (!supplierId) return <NoSupplierIdentity />;
  if (
    supplierQuery.isPending ||
    posQuery.isPending ||
    invoicesQuery.isPending ||
    documentsQuery.isPending
  )
    return <LoadingState breadcrumb={dashCrumb} />;
  if (supplierQuery.isError || posQuery.isError || invoicesQuery.isError || documentsQuery.isError)
    return (
      <ErrorState
        breadcrumb={dashCrumb}
        error={supplierQuery.error ?? posQuery.error ?? invoicesQuery.error ?? documentsQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          posQuery.refetch();
          invoicesQuery.refetch();
          documentsQuery.refetch();
        }}
      />
    );
  if (!mySupplier)
    return (
      <EmptyState
        breadcrumb={dashCrumb}
        title={t('supplierDashboard.empty.title')}
        subtitle={t('supplierDashboard.empty.subtitle')}
        message={t('supplierDashboard.empty.message')}
      />
    );

  // REQ-E10-01 — the grade and the score are PROJECTED from the calculated
  // measures, so both are absent together when there is nothing to measure.
  const grade = /** @type {Grade | undefined} */ (mySupplier.scorecardGrade);
  const score = mySupplier.performanceScore;
  const channelLabel = t(CHANNEL_KEY[mySupplier.preferredChannel]);
  // REQ-E03-01 edge case — OTIF is OPTIONAL on the supplier master: a supplier
  // with nothing delivered yet has no record, and the honest answer is "No
  // history" rather than 0%, which would read as the worst performer in the
  // room. `hasOtif` is the one discriminator every OTIF site on this page reads.
  const otif = mySupplier.otif;
  const hasOtif = otif !== undefined;
  const otifVariant = hasOtif ? perfVariant(otif) : 'neutral';
  const otifStatusLabel = !hasOtif
    ? t('rfx.noHistory')
    : otif >= 90
      ? 'On Track'
      : otif >= 80
        ? 'Needs Attention'
        : 'At Risk';

  const allActions = buildBriefingActions({ t, needsConfirmCount, expiringDoc, asnDueOrders });

  const activeActions = allActions.filter((a) => !dismissedActions.includes(a.id));
  const remaining = activeActions.length;

  // ⚠️ **THE HUB CLOCK, BY RULING (operator, 2026-09-22).** This greeting was
  // held on the machine clock by the 2026-09-10 ruling ("a fact about THIS
  // reading"). Reversed: the demo hub runs on one clock, and a briefing that
  // says a different day from every badge beneath it tells the reader two
  // things at once. `anchoredSurfaces.guard.test.jsx` now asserts the greeting
  // is anchored AND that it names the declared present.
  const today = new Date(sdcClock.now()).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const sortedPOs = [...MY_POS].sort((a, b) => b.orderDate.localeCompare(a.orderDate));

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={dashCrumb}
        title={t('supplierDashboard.header.title', { name: mySupplier.name })}
        subtitle={t('supplierDashboard.header.subtitle', {
          // i18n-defer: mock/sample data — hardcoded last-login date.
          date: '5 April 2026',
          channel: channelLabel
        })}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('supplierDashboard.meta.identity', {
          country: mySupplier.country,
          category: mySupplier.category
        })}
        {/* REQ-E10-01 — the page-level marker is RETIRED, the same move phase 6b made
            on my-performance. D-CENSUS-8 put it here because the KPI tiles were the only
            unmarked figures on the page; since then the grade, the score and the OTIF
            beside them became MEASURED from this supplier's own call-offs, heads-ups,
            receipts and orders, and the identity card below is nothing but those three.
            A marker on the meta line reads over that card, so it moved down onto the KPI
            strip, which names the tile it does not speak for. The briefing block and the
            fixture-backed widgets keep their own markers. */}
      </PageMetaLine>

      <IdentityCard
        mySupplier={mySupplier}
        channelLabel={channelLabel}
        grade={grade}
        score={score}
        otifVariant={otifVariant}
        otifStatusLabel={otifStatusLabel}
        hasOtif={hasOtif}
        otif={otif}
        t={t}
      />

      <KpiStrip
        openOrders={openOrders}
        pendingASNs={pendingASNs}
        unpaidInvoices={unpaidInvoices}
        hasOtif={hasOtif}
        otif={otif}
        t={t}
      />

      {/* Supplier module-summary widget grid — live adapters over real stores,
          alongside the existing panels (briefing serves as the alerts bar). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
        <OrdersToConfirmWidget />
        <SupplierInvoicePaymentWidget />
        <SupplierRfqToRespondWidget />
        {/* Sample-data widget (live=false, amber pill) — document fixture, no
            upload command yet: honest by construction, never faked green. */}
        <SupplierCertsExpiringWidget />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-5">
        <div className="flex flex-col gap-5">
          <BriefingPanel
            today={today}
            activeActions={activeActions}
            remaining={remaining}
            toast={toast}
            dismiss={dismiss}
            t={t}
          />

          <RecentOrdersTable sortedPOs={sortedPOs} toast={toast} t={t} />
        </div>

        <div className="flex flex-col gap-5">
          <PerformancePanel
            mySupplier={mySupplier}
            grade={grade}
            hasOtif={hasOtif}
            otif={otif}
            t={t}
          />

          <DocumentsPanel documents={documents} nowIso={nowIso} toast={toast} t={t} />
        </div>
      </div>
    </AppShellV2>
  );
};

export default SupplierDashboard;
