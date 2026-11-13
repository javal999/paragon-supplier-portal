/** @import React from 'react' */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, Download, FileText } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import {
  OrderNotFound,
  PoFilterBanner,
  drilledPoNumber,
  usePoDrillFilter
} from '../orders/PoDrillFilter';
import { invoicePoNumbers, invoicesForPo } from '../orders/orderSummaryModel';
import SapDataAgeBanner from '@components/ui-v2/SapDataAgeBanner';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import BulkActionsBar from '@components/ui-v2/BulkActionsBar';
import Data from '@components/ui-v2/Data';
import { useToast } from '@hooks/useToast';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { useTranslation } from 'react-i18next';
/** @import { SupplierInvoice } from '@services/data/types' */
/** @import { PanelMode } from './components/InvoiceRow' */
import {
  useSupplierInvoices,
  useCurrentSupplier,
  useGoodsReceipts,
  usePurchaseOrders
} from '@services/query/hooks';
import {
  useInvoiceCreate,
  useInvoiceResubmit,
  useInvoiceSubmit
} from '@services/query/commandHooks';
import { useVerbAvailability, useNextAct } from '@hooks/useVerbAvailability';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useRefusalText } from '@hooks/useRefusalText';
import { fmtDate } from './utils';
import { useNewInvoice } from './hooks/useNewInvoice';
import { useFixInvoice } from './hooks/useFixInvoice';
import InvoiceKpis from './components/InvoiceKpis';
import InvoiceTable from './components/InvoiceTable';
import InvoiceDetailPanel from './components/InvoiceDetailPanel';
import NewInvoicePanel from './components/NewInvoicePanel';
import FixInvoicePanel from './components/FixInvoicePanel';

/**
 * The supplier's invoices page (`/supplier/invoices`): KPI tiles, the returned
 * banner, the PO drill-through filter and the `?stage=` chips, the invoice
 * table, and the detail, new-invoice and correct-and-resubmit side panels.
 * Owns every piece of state that must survive the loading / empty early
 * returns (selection, panel mode, stage filter, and — through `useNewInvoice`
 * and `useFixInvoice` — both forms). Split into a page folder by Phase 5 (no
 * behaviour change).
 * @type {React.FC}
 */
const SupplierInvoices = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const invoicesQuery = useSupplierInvoices();
  const supplierQuery = useCurrentSupplier();
  const posQuery = usePurchaseOrders();
  const receiptsQuery = useGoodsReceipts();
  const createMutation = useInvoiceCreate();
  const submitMutation = useInvoiceSubmit();
  const resubmitMutation = useInvoiceResubmit();
  // ⚠️ ONE ATOM, THREE VERBS. `t_invoice_create`, `t_invoice_submit` and
  // `t_invoice_resubmit` all require `invoice:submit`, so one availability
  // answers for the page-level create, the row-level submit AND the correction
  // of a returned invoice — and each needs a slot, because
  // `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01` is exactly the page that
  // guarded its rows and shipped a live create in its header.
  const invoiceAvailability = useVerbAvailability('invoice:submit');
  const invCrumb = [t('supplierInvoices.crumb.settle'), t('supplierInvoices.crumb.invoices')];
  const INVOICES = useMemo(() => invoicesQuery.data?.items ?? [], [invoicesQuery.data]);
  const RECEIPTS = useMemo(() => receiptsQuery.data?.items ?? [], [receiptsQuery.data]);
  const mySupplier = supplierQuery.data ?? null;
  // ── REQ-E07-03 · the drill-through filter ─────────────────────────────────
  // ⚠️ **ONLY THE LIST NARROWS, NEVER `INVOICES`.** The duplicate-number check
  // and the remaining-invoiceable-quantity rule are asked of the supplier's
  // WHOLE population; narrowing that to one PO would let a duplicate through
  // and over-invoice a receipt. So the filter produces a separate `listed` set
  // and the business rules keep reading `INVOICES`.
  const drill = usePoDrillFilter();
  const drilledPo = drilledPoNumber(drill);
  const listed = useMemo(
    () => (drilledPo === null ? INVOICES : [...invoicesForPo(INVOICES, drilledPo, RECEIPTS)]),
    [INVOICES, RECEIPTS, drilledPo]
  );
  const [selected, setSelected] = useState(/** @type {SupplierInvoice | null} */ (null));
  // AC-03 — exactly one record behind the cell arrives OPEN, not as a list of one.
  const onlyInvoice = drilledPo !== null && listed.length === 1 ? listed[0] : null;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- AC-03: a drill-down to one record opens it
    if (onlyInvoice !== null) setSelected(onlyInvoice);
  }, [onlyInvoice]);
  const [panelMode, setPanelMode] = useState(/** @type {PanelMode} */ ('detail'));
  const [stageFilter, setStageFilter] = useState(/** @type {'all' | 'Returned'} */ ('all'));
  // Deep-link read: `?stage=Returned` narrows "returned invoices to correct"
  // to the invoices Finance returned.
  useUrlEnumParam(
    'stage',
    /** @type {('all' | 'Returned')[]} */ (['all', 'Returned']),
    setStageFilter
  );
  const shown = stageFilter === 'Returned' ? listed.filter((i) => i.stage === 'Returned') : listed;

  // WHO ACTS NEXT (S2b). ⚠️ **READS `selected.status`, THE PROJECTION LABEL,
  // AND THAT IS DELIBERATE.** `SupplierInvoice` HAS no `lifecycleState` — the
  // supplier DTO carries only projections — so there is no canonical state to
  // prefer here. `Overdue` is a computed projection no transition names, so
  // those rows say nothing; reported, not repaired here.
  const nextAct = useNextAct('invoice', selected?.status);

  // New invoice (REQ-E07-07) and correct-and-resubmit: state owned here.
  const nw = useNewInvoice(INVOICES, RECEIPTS, posQuery.data?.items, supplierId);
  const fx = useFixInvoice(INVOICES, RECEIPTS);
  const { setNewOpen } = nw;
  const { openFix } = fx;

  /**
   * @param {string} title
   * @param {string} [reason]
   */
  const failToast = (title, reason) =>
    toast({
      variant: 'warning',
      title,
      description: refusalText(reason) ?? t('invoice.create.failed.desc', { reason: reason ?? '' })
    });

  /** @param {SupplierInvoice} inv */
  const submitDraft = (inv) => {
    submitMutation.mutate(
      { invoiceId: inv.id, amount: inv.amount },
      {
        onSuccess: (res) => {
          toast(
            res.status === 'failed'
              ? {
                  variant: 'warning',
                  title: t('invoice.submit.failed.title', { invoiceNumber: inv.invoiceNumber }),
                  description:
                    refusalText(res.reason) ??
                    t('invoice.submit.failed.desc', { reason: res.reason ?? '' })
                }
              : {
                  variant: 'success',
                  title: t('invoice.submit.success.title', { invoiceNumber: inv.invoiceNumber }),
                  description: t('invoice.submit.success.desc')
                }
          );
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('invoice.denied.title'),
            description: t('invoice.denied.desc')
          })
      }
    );
  };

  const sums = useMemo(() => {
    /** @param {(i: SupplierInvoice) => boolean} filter */
    const sum = (filter) => INVOICES.filter(filter).reduce((a, b) => a + b.amount, 0);
    return {
      paid: sum((i) => i.stage === 'Paid'),
      pending: sum((i) => ['Submitted', 'Verified', 'Scheduled for payment'].includes(i.stage)),
      returned: sum((i) => i.stage === 'Returned')
    };
  }, [INVOICES]);

  const counts = useMemo(() => {
    return {
      paid: INVOICES.filter((i) => i.stage === 'Paid').length,
      pending: INVOICES.filter((i) =>
        ['Submitted', 'Verified', 'Scheduled for payment'].includes(i.stage)
      ).length,
      returned: INVOICES.filter((i) => i.stage === 'Returned').length
    };
  }, [INVOICES]);

  const returned = INVOICES.filter((i) => i.stage === 'Returned');

  const lastSubmitted = INVOICES.reduce(
    (acc, i) => (i.submittedDate > acc ? i.submittedDate : acc),
    INVOICES[0]?.submittedDate ?? ''
  );

  /** @param {SupplierInvoice} inv */
  const openDetail = (inv) => {
    setSelected(inv);
    setPanelMode('detail');
  };

  const closePanel = () => {
    setSelected(null);
    setPanelMode('detail');
  };

  if (!supplierId) return <NoSupplierIdentity />;
  // AC-07 / AC-08 — identical refusal for an unknown PO and another supplier's.
  if (drill.kind === 'pending') return <LoadingState breadcrumb={invCrumb} />;
  if (drill.kind === 'notFound') return <OrderNotFound persona="supplier" breadcrumb={invCrumb} />;
  if (invoicesQuery.isPending || supplierQuery.isPending)
    return <LoadingState breadcrumb={invCrumb} />;
  if (invoicesQuery.isError || supplierQuery.isError)
    return (
      <ErrorState
        breadcrumb={invCrumb}
        error={invoicesQuery.error ?? supplierQuery.error}
        onRetry={() => {
          invoicesQuery.refetch();
          supplierQuery.refetch();
        }}
      />
    );
  if (INVOICES.length === 0)
    return (
      <EmptyState
        breadcrumb={invCrumb}
        title={t('supplierInvoices.empty.title')}
        subtitle={t('supplierInvoices.empty.subtitle', {
          supplier:
            mySupplier?.name ??
            identity.supplierName ??
            t('supplierInvoices.empty.fallbackSupplier')
        })}
        message={t('supplierInvoices.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={invCrumb}
        title={t('supplierInvoices.header.title')}
        subtitle={t('supplierInvoices.header.subtitle', {
          supplier: mySupplier?.name ?? identity.supplierName ?? ''
        })}
        actions={
          // The page-level create is WITHHELD rather than disabled (§73's
          // pattern). Export holds no atom and is not gated.
          <div className="flex items-center gap-3">
            <HandoffNotice availability={invoiceAvailability} testId="handoff-invoice-create" />
            <BulkActionsBar
              actions={[
                {
                  label: t('supplierInvoices.action.export'),
                  icon: Download,
                  onClick: () =>
                    toast({
                      variant: 'info',
                      title: t('supplierInvoices.toast.export.title')
                    })
                }
              ]}
              {...(invoiceAvailability.kind === 'held'
                ? {
                    primary: {
                      label: t('invoice.create.action'),
                      icon: Plus,
                      onClick: () => setNewOpen(true)
                    }
                  }
                : {})}
            />
          </div>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(
          INVOICES.length === 1
            ? 'supplierInvoices.meta.summary.one'
            : 'supplierInvoices.meta.summary.other',
          { count: INVOICES.length }
        )}{' '}
        <Data>{fmtDate(lastSubmitted)}</Data>
        {/* D-CENSUS-8 — PARTLY REAL, both axes. Invoice create, submit and
            resubmit dispatch through the wired `invoice` target (DR-7); the POs
            and receipts backing them are fixtures, and nothing reaches e-Faktur
            or SAP. */}
        <ProvenanceMarker capability="invoices" className="ml-3 align-middle" />
      </PageMetaLine>

      {/* REQ-E07-08 AC-03 — this page reads SAP data; say how old it is. */}
      <SapDataAgeBanner page="invoices" className="mb-4" />

      <InvoiceKpis sums={sums} counts={counts} t={t} />

      {returned.length > 0 && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-6 flex items-start gap-2 text-sm text-warning-hover">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>{t('supplierInvoices.banner.dispute.label')}</strong>
            <Data>{returned.map((i) => i.invoiceNumber).join(', ')}</Data>{' '}
            {t('supplierInvoices.banner.dispute.body')}
          </div>
        </div>
      )}

      {/* BR-04 / AC-02 — the filter, and the way back. */}
      <PoFilterBanner drill={drill} persona="supplier" count={listed.length} />
      {drilledPo !== null && listed.some((i) => invoicePoNumbers(i, RECEIPTS).length > 1) && (
        <p className="text-sm text-text-tertiary mb-4" data-testid="invoice-multi-po-note">
          {t('oc.drill.invoice.multiPo')}
        </p>
      )}

      <FilterChipsBar
        options={[
          { id: 'all', label: t('inv.filter.all') },
          { id: 'Returned', label: t('supplierInvoices.filter.returned'), count: counts.returned }
        ]}
        value={stageFilter}
        onChange={setStageFilter}
        className="mb-4"
      />

      {stageFilter !== 'all' && shown.length === 0 && (
        <p
          className="text-sm text-text-tertiary py-8 text-center"
          data-testid="supplier-invoices-filter-empty"
        >
          {t('supplierInvoices.filter.empty')}
        </p>
      )}

      <InvoiceTable
        shown={shown}
        invoiceAvailability={invoiceAvailability}
        submitPending={submitMutation.isPending}
        openDetail={openDetail}
        submitDraft={submitDraft}
        openFix={openFix}
        setSelected={setSelected}
        setPanelMode={setPanelMode}
        t={t}
      />

      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-secondary flex items-start gap-2">
        <FileText size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          {t('supplierInvoices.ariba.pre')}
          <strong className="text-info">{t('supplierInvoices.ariba.strong')}</strong>
          {t('supplierInvoices.ariba.post')}
        </span>
      </div>

      <InvoiceDetailPanel
        selected={selected}
        panelMode={panelMode}
        setPanelMode={setPanelMode}
        closePanel={closePanel}
        openFix={openFix}
        invoiceAvailability={invoiceAvailability}
        nextAct={nextAct}
        toast={toast}
        t={t}
      />

      <NewInvoicePanel
        nw={nw}
        createMutation={createMutation}
        submitMutation={submitMutation}
        toast={toast}
        failToast={failToast}
        t={t}
      />

      <FixInvoicePanel
        fx={fx}
        resubmitMutation={resubmitMutation}
        toast={toast}
        failToast={failToast}
        setSelected={setSelected}
        t={t}
      />
    </AppShellV2>
  );
};

export default SupplierInvoices;
