import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import {
  useASNs,
  useDocuments,
  useGoodsReceipts,
  usePurchaseOrders,
  useRFQs,
  useSupplierInvoices,
} from '../services/query/hooks';
import { POStatus } from '../services/data/types';
import { documentDisplayState } from '../services/data/documentDisplayState';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import TaskList, { type HomeTask } from './home/TaskList';
import { awaitsSupplierAnswer } from '../services/transitions/fulfilmentRules';
import { isDueWithoutHeadsUp } from '../services/transitions/callOffRules';
import { useCallOffViews } from './callOffs/callOffDisplay';

// Supplier Home — "To do" (REQUIREMENTS §3.8 SC-01): what Paragon is waiting for
// from this supplier. Filters match the supplier dashboard widgets they replace.

const SupplierHome: React.FC = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const supplierId = identity.supplierId;
  const pos = usePurchaseOrders();
  const rfqs = useRFQs();
  const invoices = useSupplierInvoices();
  const documents = useDocuments();
  const receipts = useGoodsReceipts();
  const asns = useASNs();
  // REQ-E09-03 / REQ-E09-04 — the supplier's own call-offs (the read is scoped).
  const callOffs = useCallOffViews();

  const tasks = useMemo<HomeTask[]>(() => {
    const poItems = pos.data?.items ?? [];
    const toConfirm = poItems.filter(
      (po) => po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED,
    );
    const readyToShip = poItems.filter((po) => po.status === POStatus.CONFIRMED);
    const now = Date.now();
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
    return [
      {
        id: 'confirm-orders',
        label: t('hub.home.task.sup.confirmOrders'),
        count: toConfirm.length,
        severity: 'critical',
        to: '/supplier/orders',
      },
      {
        // REQ-E09-03 — released call-offs waiting for this supplier's answer.
        id: 'confirm-calloffs',
        label: t('hub.home.task.sup.callOffsConfirm'),
        count: callOffs.views.filter((v) => v.callOff.status === 'Awaiting Confirmation').length,
        severity: callOffs.views.some((v) => v.confirmation === 'Escalated') ? 'critical' : 'warning',
        to: '/supplier/call-offs',
      },
      {
        // CR-09 — confirmed, due within 7 days, and no ASN or dispatch notice yet.
        id: 'calloffs-due',
        label: t('hub.home.task.sup.callOffsDue'),
        count: callOffs.views.filter((v) => isDueWithoutHeadsUp(v, callOffs.nowIso)).length,
        severity: 'warning',
        to: '/supplier/call-offs',
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
        to: '/supplier/shipments',
      },
      {
        id: 'receipt-discrepancies',
        label: t('hub.home.task.sup.receiptDiscrepancies'),
        count: toAnswer.length,
        severity: 'warning',
        to: '/supplier/goods-receipts',
      },
      {
        // REQ-E07-07 — Finance returned the invoice with a reason.
        id: 'returned-invoices',
        label: t('hub.home.task.sup.returnedInvoices'),
        count: returned.length,
        severity: 'critical',
        to: '/supplier/invoices',
      },
      {
        id: 'rfq',
        label: t('hub.home.task.sup.rfq'),
        count: openRfqs.length,
        severity: lateRfqs.length > 0 ? 'critical' : 'warning',
        to: '/supplier/rfqs',
      },
      {
        id: 'certs',
        label: t('hub.home.task.sup.certs'),
        count: expired.length + expiring.length,
        severity: expired.length > 0 ? 'critical' : 'warning',
        to: '/supplier/documents',
      },
      {
        id: 'invoices',
        label: t('hub.home.task.sup.invoices'),
        count: unpaid.length,
        severity: 'info',
        to: '/supplier/invoices',
      },
    ];
  }, [pos.data, rfqs.data, invoices.data, documents.data, receipts.data, asns.data, callOffs.views, callOffs.nowIso, supplierId, t]);

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
      <TaskList tasks={tasks} />
    </AppShellV2>
  );
};

export default SupplierHome;
