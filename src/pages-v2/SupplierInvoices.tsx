import React, { useEffect, useMemo, useState } from 'react';
import { useUrlEnumParam } from '../hooks/useUrlEnumParam';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Download,
  FileText,
  Send,
  Receipt,
  Wallet,
  Mail,
  MessageCircle,
  Globe,
  LucideIcon,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import {
  OrderNotFound,
  PoFilterBanner,
  drilledPoNumber,
  usePoDrillFilter,
} from './orders/PoDrillFilter';
import { invoicePoNumbers, invoicesForPo } from './orders/orderSummaryModel';
import SapDataAgeBanner from '../components/ui-v2/SapDataAgeBanner';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import Data from '../components/ui-v2/Data';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type {
  InvoiceLine,
  SupplierInvoice,
  SupplierInvoiceStage,
} from '../services/data/types';
import {
  useSupplierInvoices,
  useCurrentSupplier,
  useGoodsReceipts,
  usePurchaseOrders,
} from '../services/query/hooks';
import {
  useInvoiceCreate,
  useInvoiceResubmit,
  useInvoiceSubmit,
} from '../services/query/commandHooks';
import { invoicePriceTolerance } from '../services/transitions/fulfilmentConfig';
import {
  INVOICEABLE_PO_STATES,
  INVOICEABLE_RECEIPT_STATES,
  expectedInvoiceValue,
  isDuplicateInvoiceNumber,
  prefillInvoiceLines,
  remainingInvoiceableQty,
} from '../services/transitions/fulfilmentRules';
import { statusLabelKey } from '../lib/statusLabel';
import { statusTone } from '../lib/statusTone';
import {
  InvoiceLinesSection,
  MatchPill,
  MatchResult,
  fmtIdr,
  readQty,
} from './invoices/InvoiceCollaboration';
import { useVerbAvailability, useNextAct } from '../hooks/useVerbAvailability';
import NextActLine from '../components/ui-v2/NextActLine';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import type { QtyRefusalReason } from '../lib/localeNumber';
import { readInvoiceAmount } from './invoices/invoiceAmountModel';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '../components/ui-v2/GlossaryTermChip';
import { useRefusalText } from '../hooks/useRefusalText';

// CP-0 · W1 · 2f-d — each refusal names what to type instead. Replaces a
// hard-coded English literal ('PO and a positive amount are required') that
// covered three distinct causes in one untranslated sentence.
const INVOICE_AMOUNT_REFUSAL_KEY: Record<QtyRefusalReason, string> = {
  EMPTY_QTY: 'supplierInvoices.new.amount.refused.empty',
  NOT_NUMERIC: 'supplierInvoices.new.amount.refused.notNumeric',
  AMBIGUOUS_QTY: 'supplierInvoices.new.amount.refused.ambiguous',
};

const CHANNEL_ICON: Record<SupplierInvoice['channel'], LucideIcon> = {
  WhatsApp: MessageCircle,
  Email: Mail,
  Web: Globe,
  API: Send,
};

const fmtIDR = (n: number): string => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  return `Rp ${Math.round(n / 1_000_000)}jT`;
};

const fmtIDRFull = (n: number): string => `Rp ${n.toLocaleString('id-ID')}`;

const fmtDate = (s: string | null): string => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

type PanelMode = 'detail' | 'remittance';

/** REQ-E07-07 step 5 — Submitted → Verified → Scheduled for payment → Paid. */
// i18n-defer: canonical status tokens, localized at render through statusLabelKey
const STAGE_ORDER: readonly SupplierInvoiceStage[] = ['Submitted', 'Verified', 'Scheduled for payment', 'Paid'];

const buildTimeline = (inv: SupplierInvoice, t: TFunction): TimelineEvent[] => {
  const at = inv.stage === 'Returned' ? 0 : STAGE_ORDER.indexOf(inv.stage);
  const icons = [FileText, CheckCircle2, Clock, Wallet];
  return STAGE_ORDER.map((stage, i) => {
    const k = statusLabelKey(stage);
    return {
      id: stage,
      title: k ? t(k) : stage,
      timestamp:
        i === 0 && inv.stage !== 'Draft'
          ? fmtDate(inv.submittedDate)
          : i === 3 && inv.paymentDate
            ? fmtDate(inv.paymentDate)
            : undefined,
      status:
        inv.stage === 'Draft'
          ? 'pending'
          : i < at || (inv.stage === 'Paid' && i === at)
            ? 'completed'
            : i === at
              ? 'current'
              : 'pending',
      icon: icons[i],
    };
  });
};

const lineKey = (l: Pick<InvoiceLine, 'receiptId' | 'materialCode'>) => `${l.receiptId}|${l.materialCode}`;

const inputCls =
  'w-full text-sm border border-border-subtle rounded-md px-3 py-2 bg-bg-surface text-text-primary';
const labelCls = 'text-label text-text-tertiary uppercase block mb-1';

/** Editable quantities over a set of invoice lines, each bounded by what is left. */
const LineQtyTable: React.FC<{
  lines: readonly (InvoiceLine & { remaining: number | null })[];
  entries: Record<string, string>;
  onChange: (key: string, v: string) => void;
}> = ({ lines, entries, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-text-tertiary uppercase">
            <th className="text-left py-1 pr-2">{t('fc.inv.new.col.receipt')}</th>
            <th className="text-left py-1 pr-2">{t('fc.inv.new.col.material')}</th>
            <th className="text-left py-1 pr-2">{t('fc.inv.new.col.quantity')}</th>
            <th className="text-right py-1">{t('fc.inv.new.col.unitPrice')}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const key = lineKey(l);
            const raw = entries[key] ?? String(l.quantity);
            const q = readQty(raw);
            const bad = !(Number.isFinite(q) && q > 0);
            const over = !bad && l.remaining !== null && q > l.remaining;
            return (
              <tr key={key} className="border-t border-border-subtle align-top">
                <td className="py-1.5 pr-2">
                  <Data>{l.grNumber}</Data>
                </td>
                <td className="py-1.5 pr-2">
                  <Data as="div" className="text-[11px] text-text-tertiary">
                    {l.materialCode}
                  </Data>
                  <div className="text-text-primary">{l.description}</div>
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`${inputCls} min-w-[96px]`}
                    aria-label={t('fc.inv.new.quantityFor', { material: l.materialCode, grNumber: l.grNumber })}
                    aria-invalid={bad || over}
                    value={raw}
                    onChange={(e) => onChange(key, e.target.value)}
                  />
                  {l.remaining !== null && (
                    <div className="mt-0.5 text-[11px] text-text-tertiary">
                      {t('fc.inv.new.upTo', { qty: `${l.remaining.toLocaleString('en-US')} ${l.uom ?? ''}` })}
                    </div>
                  )}
                  {bad && <div className="text-[11px] text-danger">{t('fc.inv.new.qtyInvalid')}</div>}
                  {over && (
                    <div role="alert" className="text-[11px] text-danger">
                      {t('fc.inv.new.overInvoiced')}
                    </div>
                  )}
                </td>
                <td className="py-1.5 text-right whitespace-nowrap">
                  <Data>{fmtIdr(l.unitPrice)}</Data>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/** Apply typed quantities to lines; report whether every line is readable and in bounds. */
const applyEntries = (
  lines: readonly (InvoiceLine & { remaining: number | null })[],
  entries: Record<string, string>,
) => {
  const out = lines.map((l) => {
    const q = readQty(entries[lineKey(l)] ?? String(l.quantity));
    return { ...l, quantity: q };
  });
  const valid = out.every(
    (l, i) => Number.isFinite(l.quantity) && l.quantity > 0 && (lines[i].remaining === null || l.quantity <= lines[i].remaining!),
  );
  const clean: InvoiceLine[] = out.map(({ remaining: _r, ...l }) => l);
  return { lines: clean, valid };
};

const SupplierInvoices: React.FC = () => {
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
  const invCrumb = [
    t('supplierInvoices.crumb.settle'),
    t('supplierInvoices.crumb.invoices'),
  ];
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
    [INVOICES, RECEIPTS, drilledPo],
  );
  const [selected, setSelected] = useState<SupplierInvoice | null>(null);
  const [stageFilter, setStageFilter] = useState<'all' | 'Returned'>('all');
  // Deep-link read: `?stage=Returned` narrows the "returned invoices to
  // correct and resubmit" task to those Finance sent back.
  useUrlEnumParam<'all' | 'Returned'>('stage', ['all', 'Returned'], setStageFilter);
  const shown = stageFilter === 'Returned' ? listed.filter((i) => i.stage === 'Returned') : listed;
  // AC-03 — exactly one record behind the cell arrives OPEN, not as a list of one.
  const onlyInvoice = drilledPo !== null && listed.length === 1 ? listed[0] : null;
  useEffect(() => {
    if (onlyInvoice !== null) setSelected(onlyInvoice);
  }, [onlyInvoice]);
  const [panelMode, setPanelMode] = useState<PanelMode>('detail');

  // WHO ACTS NEXT (S2b). ⚠️ **READS `selected.status`, THE PROJECTION LABEL,
  // AND THAT IS DELIBERATE.** `SupplierInvoice` HAS no `lifecycleState` — the
  // supplier DTO carries only projections — so there is no canonical state to
  // prefer here. `Overdue` is a computed projection no transition names, so
  // those rows say nothing; reported, not repaired here.
  const nextAct = useNextAct('invoice', selected?.status);

  // New invoice (REQ-E07-07): PO → received receipts → pre-filled lines.
  const [newOpen, setNewOpen] = useState(false);
  const [newPoRef, setNewPoRef] = useState('');
  const [newReceiptIds, setNewReceiptIds] = useState<string[]>([]);
  const [newLineQty, setNewLineQty] = useState<Record<string, string>>({});
  const [newInvoiceNumber, setNewInvoiceNumber] = useState('');
  const [newInvoiceDate, setNewInvoiceDate] = useState('');
  const [newTaxFile, setNewTaxFile] = useState('');
  const [newAmount, setNewAmount] = useState('');

  // Correct and resubmit a returned invoice.
  const [fixTarget, setFixTarget] = useState<SupplierInvoice | null>(null);
  const [fixAmount, setFixAmount] = useState('');
  const [fixNumber, setFixNumber] = useState('');
  const [fixDate, setFixDate] = useState('');
  const [fixTaxFile, setFixTaxFile] = useState('');
  const [fixLineQty, setFixLineQty] = useState<Record<string, string>>({});

  // POs an invoice may bill against (confirmed, partly or fully delivered).
  const invoiceablePos = (posQuery.data?.items ?? []).filter((po) =>
    INVOICEABLE_PO_STATES.includes(po.status),
  );
  const newPo = invoiceablePos.find((po) => po.poNumber === newPoRef);

  // Received receipts of that PO with quantity left to invoice (BR-01, BR-02).
  const receiptOptions = useMemo(
    () =>
      newPo
        ? RECEIPTS.filter(
            (gr) =>
              gr.poNumber === newPo.poNumber &&
              INVOICEABLE_RECEIPT_STATES.includes(gr.status) &&
              gr.inspectionResults.some(
                (r) => remainingInvoiceableQty(gr, r.materialCode, INVOICES) > 0,
              ),
          )
        : [],
    [newPo, RECEIPTS, INVOICES],
  );
  const prefilled = useMemo(
    () =>
      newPo
        ? prefillInvoiceLines(
            receiptOptions.filter((gr) => newReceiptIds.includes(gr.id)),
            newPo,
            INVOICES,
          ).map((l) => ({ ...l, remaining: l.quantity }))
        : [],
    [newPo, receiptOptions, newReceiptIds, INVOICES],
  );
  const newRead = applyEntries(prefilled, newLineQty);
  const newExpected = expectedInvoiceValue(newRead.valid ? newRead.lines : []);
  const newDuplicate =
    !!supplierId &&
    newInvoiceNumber.trim() !== '' &&
    isDuplicateInvoiceNumber(newInvoiceNumber, supplierId, INVOICES);

  // ── CP-0 · W1 · 2f-d — THE ONE READ of the new-invoice amount ──────────────
  // The gate, the inline message and the dispatched payload all read this, so
  // none of them can disagree about the amount being invoiced.
  const amountRead = readInvoiceAmount(newAmount);
  const amountPositive = amountRead.ok && amountRead.value > 0;
  const newReady =
    !!newPo &&
    newRead.lines.length > 0 &&
    newRead.valid &&
    newInvoiceNumber.trim() !== '' &&
    !newDuplicate &&
    newInvoiceDate !== '' &&
    newTaxFile !== '' &&
    amountPositive;

  const resetNew = () => {
    setNewPoRef('');
    setNewReceiptIds([]);
    setNewLineQty({});
    setNewInvoiceNumber('');
    setNewInvoiceDate('');
    setNewTaxFile('');
    setNewAmount('');
  };

  const failToast = (title: string, reason?: string) =>
    toast({
      variant: 'warning',
      title,
      description: refusalText(reason) ?? t('invoice.create.failed.desc', { reason: reason ?? '' }),
    });

  const submitDraft = (inv: SupplierInvoice) => {
    submitMutation.mutate(
      { invoiceId: inv.id, amount: inv.amount },
      {
        onSuccess: (res) => {
          toast(
            res.status === 'failed'
              ? {
                  variant: 'warning',
                  title: t('invoice.submit.failed.title', { invoiceNumber: inv.invoiceNumber }),
                  description: refusalText(res.reason) ?? t('invoice.submit.failed.desc', { reason: res.reason ?? '' }),
                }
              : {
                  variant: 'success',
                  title: t('invoice.submit.success.title', { invoiceNumber: inv.invoiceNumber }),
                  description: t('invoice.submit.success.desc', { correlationId: res.correlationId }),
                },
          );
        },
        onError: () =>
          toast({ variant: 'error', title: t('invoice.denied.title'), description: t('invoice.denied.desc') }),
      },
    );
  };

  const createNewInvoice = async (andSubmit: boolean) => {
    // Each cause gets its OWN translated message.
    if (!newPoRef) {
      toast({
        variant: 'warning',
        title: t('invoice.create.failed.title'),
        description: t('supplierInvoices.new.po.required'),
      });
      return;
    }
    if (!amountRead.ok) {
      toast({
        variant: 'warning',
        title: t('invoice.create.failed.title'),
        description: t(INVOICE_AMOUNT_REFUSAL_KEY[amountRead.reason]),
      });
      return;
    }
    // The pre-existing `> 0` rule, PRESERVED VERBATIM.
    if (amountRead.value <= 0) {
      toast({
        variant: 'warning',
        title: t('invoice.create.failed.title'),
        description: t('supplierInvoices.new.amount.mustExceedZero'),
      });
      return;
    }
    const amount = amountRead.value;
    const invoiceNumber = newInvoiceNumber.trim();
    try {
      const res = await createMutation.mutateAsync({
        poReference: newPoRef,
        amount,
        lines: newRead.lines,
        invoiceNumber,
        invoiceDate: newInvoiceDate,
        taxInvoiceFile: newTaxFile,
      });
      if (res.status === 'failed' || !res.entityId) {
        failToast(t('invoice.create.failed.title'), res.reason);
        return;
      }
      if (andSubmit) {
        const sub = await submitMutation.mutateAsync({ invoiceId: res.entityId, amount });
        if (sub.status === 'failed') {
          failToast(t('invoice.submit.failed.title', { invoiceNumber }), sub.reason);
        } else {
          toast({ variant: 'success', title: t('fc.inv.submit.success', { invoiceNumber }) });
        }
      } else {
        toast({
          variant: 'success',
          title: t('invoice.create.success.title', { invoiceNumber }),
          description: t('invoice.create.success.desc', { poNumber: newPoRef, correlationId: res.correlationId }),
        });
      }
      setNewOpen(false);
      resetNew();
    } catch {
      toast({ variant: 'error', title: t('invoice.denied.title'), description: t('invoice.denied.desc') });
    }
  };

  // ── Correct and resubmit ────────────────────────────────────────────────
  const openFix = (inv: SupplierInvoice) => {
    setFixTarget(inv);
    setFixAmount(String(inv.amount));
    setFixNumber(inv.invoiceNumber);
    setFixDate(inv.invoiceDate ?? '');
    setFixTaxFile(inv.taxInvoiceFile ?? '');
    setFixLineQty({});
  };
  const fixLines = (fixTarget?.lines ?? []).map((l) => {
    const gr = RECEIPTS.find((g) => g.id === l.receiptId);
    return {
      ...l,
      remaining: gr ? remainingInvoiceableQty(gr, l.materialCode, INVOICES, fixTarget?.id) : null,
    };
  });
  const fixRead = applyEntries(fixLines, fixLineQty);
  const fixAmountRead = readInvoiceAmount(fixAmount);
  const fixDuplicate =
    !!fixTarget &&
    fixNumber.trim() !== '' &&
    isDuplicateInvoiceNumber(fixNumber, fixTarget.supplierId, INVOICES, fixTarget.id);
  const fixReady =
    !!fixTarget &&
    fixAmountRead.ok &&
    fixAmountRead.value > 0 &&
    fixRead.valid &&
    fixNumber.trim() !== '' &&
    !fixDuplicate;

  const doResubmit = () => {
    if (!fixTarget || !fixAmountRead.ok) return;
    const invoiceNumber = fixNumber.trim();
    resubmitMutation.mutate(
      {
        invoiceId: fixTarget.id,
        amount: fixAmountRead.value,
        ...(fixTarget.lines.length > 0 ? { lines: fixRead.lines } : {}),
        invoiceNumber,
        ...(fixDate ? { invoiceDate: fixDate } : {}),
        ...(fixTaxFile ? { taxInvoiceFile: fixTaxFile } : {}),
      },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            failToast(t('fc.inv.resubmit.failed', { invoiceNumber }), res.reason);
            return;
          }
          toast({ variant: 'success', title: t('fc.inv.resubmit.success', { invoiceNumber }) });
          setFixTarget(null);
          setSelected(null);
        },
        onError: () =>
          toast({ variant: 'error', title: t('invoice.denied.title'), description: t('invoice.denied.desc') }),
      },
    );
  };

  const sums = useMemo(() => {
    const sum = (filter: (i: SupplierInvoice) => boolean) =>
      INVOICES.filter(filter).reduce((a, b) => a + b.amount, 0);
    return {
      paid: sum((i) => i.stage === 'Paid'),
      pending: sum((i) => ['Submitted', 'Verified', 'Scheduled for payment'].includes(i.stage)),
      returned: sum((i) => i.stage === 'Returned'),
    };
  }, [INVOICES]);

  const counts = useMemo(() => {
    return {
      paid: INVOICES.filter((i) => i.stage === 'Paid').length,
      pending: INVOICES.filter((i) => ['Submitted', 'Verified', 'Scheduled for payment'].includes(i.stage)).length,
      returned: INVOICES.filter((i) => i.stage === 'Returned').length,
    };
  }, [INVOICES]);

  const returned = INVOICES.filter((i) => i.stage === 'Returned');

  const lastSubmitted = INVOICES.reduce(
    (acc, i) => (i.submittedDate > acc ? i.submittedDate : acc),
    INVOICES[0]?.submittedDate ?? '',
  );

  const openDetail = (inv: SupplierInvoice) => {
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
            t('supplierInvoices.empty.fallbackSupplier'),
        })}
        message={t('supplierInvoices.empty.message')}
      />
    );

  const dueCell = (inv: SupplierInvoice) => (
    <>
      <Data>{fmtDate(inv.dueDate)}</Data>
      {inv.overdue && (
        <div className="text-[11px] text-danger font-semibold">
          {inv.daysOutstanding === 1
            ? t('fc.inv.overdue.one')
            : t('fc.inv.overdue.other', { count: inv.daysOutstanding })}
        </div>
      )}
    </>
  );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={invCrumb}
        title={t('supplierInvoices.header.title')}
        subtitle={t('supplierInvoices.header.subtitle', {
          supplier: mySupplier?.name ?? identity.supplierName ?? '',
        })}
        actions={
          // The page-level create is WITHHELD rather than disabled (§73's
          // pattern). Export holds no atom and is not gated.
          <div className="flex items-center gap-3">
            <HandoffNotice
              availability={invoiceAvailability}
              testId="handoff-invoice-create"
            />
            <BulkActionsBar
              actions={[
                {
                  label: t('supplierInvoices.action.export'),
                  icon: Download,
                  onClick: () =>
                    toast({
                      variant: 'info',
                      title: t('supplierInvoices.toast.export.title'),
                    }),
                },
              ]}
              {...(invoiceAvailability.kind === 'held'
                ? {
                    primary: {
                      label: t('invoice.create.action'),
                      icon: Plus,
                      onClick: () => setNewOpen(true),
                    },
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
          { count: INVOICES.length },
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <KpiCard
          eyebrow={t('supplierInvoices.kpi.received.eyebrow')}
          value={fmtIDR(sums.paid)}
          subtitle={
            <span className="text-success">
              {t(
                counts.paid === 1
                  ? 'supplierInvoices.kpi.invoiceCount.one'
                  : 'supplierInvoices.kpi.invoiceCount.other',
                { count: counts.paid },
              )}
            </span>
          }
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow={t('supplierInvoices.kpi.pending.eyebrow')}
          value={fmtIDR(sums.pending)}
          subtitle={
            <span className="text-warning-hover">
              {t(
                counts.pending === 1
                  ? 'supplierInvoices.kpi.invoiceCount.one'
                  : 'supplierInvoices.kpi.invoiceCount.other',
                { count: counts.pending },
              )}
            </span>
          }
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('supplierInvoices.kpi.disputed.eyebrow')}
          value={fmtIDR(sums.returned)}
          subtitle={
            <span className="text-danger">
              {t(
                counts.returned === 1
                  ? 'supplierInvoices.kpi.invoiceCount.one'
                  : 'supplierInvoices.kpi.invoiceCount.other',
                { count: counts.returned },
              )}
            </span>
          }
          icon={AlertTriangle}
        />
      </div>

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

      <FilterChipsBar<'all' | 'Returned'>
        options={[
          { id: 'all', label: t('inv.filter.all') },
          { id: 'Returned', label: t('supplierInvoices.filter.returned'), count: counts.returned },
        ]}
        value={stageFilter}
        onChange={setStageFilter}
        className="mb-4"
      />

      {stageFilter !== 'all' && shown.length === 0 && (
        <p className="text-sm text-text-tertiary py-8 text-center" data-testid="supplier-invoices-filter-empty">
          {t('supplierInvoices.filter.empty')}
        </p>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('supplierInvoices.table.invoiceNo')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierInvoices.table.poRef')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('supplierInvoices.table.amount')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierInvoices.table.status')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.inv.col.match')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierInvoices.table.dueDate')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierInvoices.table.paymentDate')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('supplierInvoices.table.action')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {shown.map((inv) => {
              const Channel = CHANNEL_ICON[inv.channel];
              const isPaid = inv.stage === 'Paid';
              return (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer"
                  onClick={() => openDetail(inv)}
                >
                  <TableCell>
                    <Data as="div" className="text-xs font-bold text-text-primary">
                      {inv.invoiceNumber}
                    </Data>
                    <div className="inline-flex items-center gap-1 text-[10px] text-text-tertiary mt-0.5">
                      <Channel size={10} />
                      {t('supplierInvoices.table.via', { channel: inv.channel })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Data className="text-xs text-text-secondary">
                      {inv.poNumber}
                    </Data>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="font-semibold text-text-primary">
                      <Data>{fmtIDR(inv.amount)}</Data>
                    </div>
                    <div className="text-xs text-text-tertiary">
                      <Data>{fmtIDRFull(inv.amount)}</Data>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={statusTone(inv.stage)}>{inv.stage}</StatusPill>
                  </TableCell>
                  <TableCell>
                    {inv.stage === 'Draft' ? (
                      <span className="text-text-tertiary text-xs">—</span>
                    ) : (
                      <MatchPill status={inv.matchStatus} />
                    )}
                  </TableCell>
                  <TableCell className="text-text-tertiary text-xs whitespace-nowrap">
                    {dueCell(inv)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {inv.paymentDate ? (
                      <span className="text-success font-semibold">
                        <Data>{fmtDate(inv.paymentDate)}</Data>
                      </span>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {isPaid ? (
                      <Button
                        variant="outline"
                        icon={Receipt}
                        onClick={() => {
                          setSelected(inv);
                          setPanelMode('remittance');
                        }}
                      >
                        {t('supplierInvoices.action.remittance')}
                      </Button>
                    ) : inv.stage === 'Draft' || inv.stage === 'Returned' ? (
                      invoiceAvailability.kind === 'held' ? (
                        inv.stage === 'Draft' ? (
                          <Button
                            variant="outline"
                            disabled={submitMutation.isPending}
                            onClick={() => submitDraft(inv)}
                          >
                            {t('invoice.submit.action')}
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={() => openFix(inv)}>
                            {t('fc.inv.resubmit.action')}
                          </Button>
                        )
                      ) : (
                        <HandoffNotice
                          availability={invoiceAvailability}
                          testId={inv.stage === 'Draft' ? 'handoff-invoice-submit' : 'handoff-invoice-resubmit'}
                        />
                      )
                    ) : (
                      <Button variant="secondary" onClick={() => openDetail(inv)}>
                        {t('supplierInvoices.action.view')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>

      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-secondary flex items-start gap-2">
        <FileText size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          {t('supplierInvoices.ariba.pre')}
          <strong className="text-info">{t('supplierInvoices.ariba.strong')}</strong>
          {t('supplierInvoices.ariba.post')}
        </span>
      </div>

      <SidePanel
        open={selected !== null}
        onClose={closePanel}
        title={
          selected
            ? t('supplierInvoices.panel.detail.title', {
                invoiceNumber: selected.invoiceNumber,
              })
            : ''
        }
        footerActions={
          selected && (
            <>
              <Button variant="secondary" onClick={closePanel}>
                {t('supplierInvoices.panel.close')}
              </Button>
              {panelMode === 'detail' && selected.stage === 'Paid' && (
                <Button
                  variant="outline"
                  icon={Receipt}
                  onClick={() => setPanelMode('remittance')}
                >
                  {t('supplierInvoices.panel.viewRemittance')}
                </Button>
              )}
              {panelMode === 'detail' &&
                selected.stage === 'Returned' &&
                invoiceAvailability.kind === 'held' && (
                  <Button variant="outline" onClick={() => openFix(selected)}>
                    {t('fc.inv.resubmit.action')}
                  </Button>
                )}
              {panelMode === 'remittance' && (
                <Button
                  variant="outline"
                  icon={Download}
                  onClick={() =>
                    toast({
                      title: t('supplierInvoices.toast.downloadPdf.title'),
                    })
                  }
                >
                  {t('supplierInvoices.panel.downloadPdf')}
                </Button>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('supplierInvoices.section.keyFacts')}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.poReference')}</dt>
                  <Data as="dd" className="text-text-primary">
                    {selected.poNumber}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.amount')}</dt>
                  <dd className="text-text-primary font-semibold">
                    <Data>{fmtIDRFull(selected.amount)}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.submitted')}</dt>
                  <dd className="text-text-primary font-medium">
                    <Data>{fmtDate(selected.submittedDate)}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.dueDate')}</dt>
                  <dd className="text-text-primary font-medium">{dueCell(selected)}</dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.status')}</dt>
                  <dd>
                    <StatusPill variant={statusTone(selected.stage)}>{selected.stage}</StatusPill>
                    <span className="mt-1 block">
                      <NextActLine act={nextAct} testId="next-act-supplier-invoice" />
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.channel')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.channel}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.buyerContact')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.buyerContact}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.bankAccount')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.bankAccount}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.sapFiDoc')}</dt>
                  <Data
                    as="dd"
                    className={`text-xs ${
                      selected.sapFiDoc ? 'text-success' : 'text-text-tertiary'
                    }`}
                  >
                    {selected.sapFiDoc ?? t('supplierInvoices.field.pending')}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('supplierInvoices.field.paymentRef')}</dt>
                  <Data
                    as="dd"
                    className={`text-xs ${
                      selected.paymentRef
                        ? 'text-text-primary'
                        : 'text-text-tertiary'
                    }`}
                  >
                    {selected.paymentRef ?? t('supplierInvoices.field.pending')}
                  </Data>
                </div>
              </dl>
            </section>

            {selected.stage === 'Returned' && (
              <div
                role="status"
                className="bg-danger-soft border-l-2 border-danger rounded px-3 py-2 text-xs text-danger"
              >
                <strong>{t('fc.inv.detail.returned')}:</strong>{' '}
                {selected.returnReason ?? t('supplierInvoices.note.disputed')}
              </div>
            )}

            {panelMode === 'detail' && selected.stage !== 'Draft' && (
              <MatchResult status={selected.matchStatus} />
            )}

            {/* CR-12 (BL-44) — per line: which rule applied and why it is held. */}
            {panelMode === 'detail' && (
              <InvoiceLinesSection
                lines={selected.lines}
                invoiceDate={selected.invoiceDate}
                taxInvoiceFile={selected.taxInvoiceFile}
                amount={selected.amount}
                matchStatus={selected.matchStatus}
              />
            )}

            {panelMode === 'detail' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('supplierInvoices.section.lifecycle')}
                </h3>
                <Timeline events={buildTimeline(selected, t)} />
                {selected.overdue && (
                  <div className="mt-3 bg-danger-soft border-l-2 border-danger rounded px-3 py-2 text-xs text-danger">
                    {t('supplierInvoices.note.overdue')}
                  </div>
                )}
              </section>
            )}

            {panelMode === 'remittance' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('supplierInvoices.section.remittance')}
                </h3>
                <div className="bg-success-soft border-l-2 border-success rounded px-4 py-3 mb-3 text-sm text-success font-semibold flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  {t('supplierInvoices.remittance.processed')}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-text-tertiary">{t('supplierInvoices.remittance.invoiceNo')}</dt>
                    <Data as="dd" className="text-text-primary">
                      {selected.invoiceNumber}
                    </Data>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t('supplierInvoices.remittance.amountPaid')}</dt>
                    <dd className="text-text-primary font-semibold">
                      <Data>{fmtIDRFull(selected.amount)}</Data>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t('supplierInvoices.remittance.paymentDate')}</dt>
                    <dd className="text-text-primary font-medium">
                      <Data>{fmtDate(selected.paymentDate)}</Data>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t('supplierInvoices.remittance.bankCredited')}</dt>
                    <dd className="text-text-primary font-medium">
                      {selected.bankAccount}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-text-tertiary">{t('supplierInvoices.remittance.reference')}</dt>
                    <Data as="dd" className="text-text-primary">
                      {selected.paymentRef ?? '—'}
                    </Data>
                  </div>
                </dl>
                {selected.remittanceNote && (
                  <div className="mt-3 text-xs text-text-secondary bg-bg-hover rounded px-3 py-2 border border-border-subtle">
                    <strong className="text-text-primary">{t('supplierInvoices.remittance.paymentNote')}</strong>{' '}
                    {selected.remittanceNote}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </SidePanel>

      <SidePanel
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title={t('supplierInvoices.new.title')}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setNewOpen(false)}>
              {t('supplierInvoices.new.cancel')}
            </Button>
            {/* Disabled-under-refusal is UX; the verb's policies are the law. */}
            <Button
              variant="secondary"
              disabled={createMutation.isPending || !newReady}
              onClick={() => createNewInvoice(false)}
            >
              {t('supplierInvoices.new.createDraft')}
            </Button>
            <Button
              variant="outline"
              icon={Send}
              disabled={createMutation.isPending || submitMutation.isPending || !newReady}
              onClick={() => createNewInvoice(true)}
            >
              {t('fc.inv.new.submit')}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <p className="text-sm text-text-secondary">
            {t('supplierInvoices.new.intro')}
          </p>
          <div>
            <label htmlFor="new-po" className={labelCls}>
              {t('supplierInvoices.new.poLabel')}
            </label>
            <select
              id="new-po"
              className={inputCls}
              value={newPoRef}
              onChange={(e) => {
                setNewPoRef(e.target.value);
                setNewReceiptIds([]);
                setNewLineQty({});
              }}
            >
              <option value="">{t('supplierInvoices.new.poPlaceholder')}</option>
              {invoiceablePos.map((po) => (
                <option key={po.id} value={po.poNumber}>
                  {po.poNumber}
                </option>
              ))}
            </select>
            {invoiceablePos.length === 0 && (
              <div className="mt-1 text-xs text-text-tertiary">
                {t('supplierInvoices.new.noPos')}
              </div>
            )}
          </div>

          {newPo && (
            <fieldset>
              <legend className={labelCls}>{t('fc.inv.new.receipts')}</legend>
              {receiptOptions.length === 0 ? (
                <div className="text-xs text-text-tertiary">{t('fc.inv.new.noReceipts')}</div>
              ) : (
                <div className="space-y-1.5">
                  {receiptOptions.map((gr) => (
                    <label key={gr.id} className="flex items-center gap-2 text-sm text-text-primary">
                      <input
                        type="checkbox"
                        className="accent-action"
                        checked={newReceiptIds.includes(gr.id)}
                        onChange={(e) =>
                          setNewReceiptIds((ids) =>
                            e.target.checked ? [...ids, gr.id] : ids.filter((x) => x !== gr.id),
                          )
                        }
                      />
                      {t('fc.inv.new.receiptOption', { grNumber: gr.grNumber, date: fmtDate(gr.receivedDate) })}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          )}

          {prefilled.length > 0 && (
            <div>
              <div className={labelCls}>{t('fc.inv.new.lines')}</div>
              <LineQtyTable
                lines={prefilled}
                entries={newLineQty}
                onChange={(k, v) => setNewLineQty((m) => ({ ...m, [k]: v }))}
              />
              <div className="mt-2 text-xs text-text-secondary">
                {t('fc.inv.new.expected')}: <Data>{fmtIdr(newExpected)}</Data>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-invoice-number" className={labelCls}>
                {t('fc.inv.new.invoiceNumber')}
              </label>
              <input
                id="new-invoice-number"
                type="text"
                className={inputCls}
                value={newInvoiceNumber}
                aria-invalid={newDuplicate}
                onChange={(e) => setNewInvoiceNumber(e.target.value)}
              />
              {newDuplicate && (
                <div role="alert" data-testid="invoice-number-duplicate" className="mt-1 text-[11px] text-danger">
                  {t('fc.inv.new.duplicate')}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="new-invoice-date" className={labelCls}>
                {t('fc.inv.new.invoiceDate')}
              </label>
              <input
                id="new-invoice-date"
                type="date"
                className={inputCls}
                value={newInvoiceDate}
                onChange={(e) => setNewInvoiceDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="new-tax-invoice" className={labelCls}>
              {t('fc.inv.new.taxInvoice')}
            </label>
            <input
              id="new-tax-invoice"
              type="file"
              className="text-sm text-text-secondary"
              onChange={(e) => setNewTaxFile(e.target.files?.[0]?.name ?? '')}
            />
            <div className="mt-1 text-xs text-text-tertiary">{newTaxFile || t('fc.inv.new.noFile')}</div>
          </div>

          <div>
            <label htmlFor="new-amount" className={labelCls}>
              {t('supplierInvoices.new.amountLabel')}
            </label>
            {/* Ruling 6.2: text + inputMode. A negative is refused by
                `normalizeQty` as NOT_NUMERIC, where it is actually enforced. */}
            <input
              id="new-amount"
              type="text"
              inputMode="decimal"
              className={inputCls}
              placeholder={t('supplierInvoices.new.amountPlaceholder')}
              value={newAmount}
              aria-invalid={newAmount.trim() !== '' && !amountRead.ok}
              onChange={(e) => setNewAmount(e.target.value)}
            />
            <div className="mt-1 text-xs text-text-tertiary">{t('fc.inv.new.tolerance', {
                  contractPct: invoicePriceTolerance().contractPricePct,
                  pct: invoicePriceTolerance().standardPct,
                  cap: fmtIdr(invoicePriceTolerance().standardCapIdr),
                })}</div>
            {/* UNSEEDED field, so the 2e-a rule applies: an untouched blank does
                not nag on sight. */}
            {newAmount.trim() !== '' && !amountRead.ok && (
              <div
                role="alert"
                data-testid="invoice-amount-refusal"
                className="mt-1 text-[11px] text-danger"
              >
                {t(INVOICE_AMOUNT_REFUSAL_KEY[amountRead.reason])}{' '}
                <GlossaryTermChip
                  refTo={{ sourceType: 'QtyRefusalReason', term: amountRead.reason }}
                />
              </div>
            )}
            {amountRead.ok && amountRead.value <= 0 && (
              <div
                role="alert"
                data-testid="invoice-amount-zero"
                className="mt-1 text-[11px] text-danger"
              >
                {t('supplierInvoices.new.amount.mustExceedZero')}
              </div>
            )}
          </div>
        </div>
      </SidePanel>

      <SidePanel
        open={fixTarget !== null}
        onClose={() => setFixTarget(null)}
        title={fixTarget ? t('fc.inv.resubmit.title', { invoiceNumber: fixTarget.invoiceNumber }) : ''}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setFixTarget(null)}>
              {t('fc.inv.cancel')}
            </Button>
            <Button
              variant="outline"
              icon={Send}
              disabled={resubmitMutation.isPending || !fixReady}
              onClick={doResubmit}
            >
              {t('fc.inv.resubmit.confirm')}
            </Button>
          </>
        }
      >
        {fixTarget && (
          <div className="space-y-5">
            <div className="bg-danger-soft border-l-2 border-danger rounded px-3 py-2 text-sm text-danger">
              <strong>{t('fc.inv.resubmit.reason')}:</strong>{' '}
              {fixTarget.returnReason ?? t('supplierInvoices.note.disputed')}
            </div>
            {fixLines.length > 0 && (
              <div>
                <div className={labelCls}>{t('fc.inv.new.lines')}</div>
                <LineQtyTable
                  lines={fixLines}
                  entries={fixLineQty}
                  onChange={(k, v) => setFixLineQty((m) => ({ ...m, [k]: v }))}
                />
                <div className="mt-2 text-xs text-text-secondary">
                  {t('fc.inv.new.expected')}:{' '}
                  <Data>{fmtIdr(expectedInvoiceValue(fixRead.valid ? fixRead.lines : []))}</Data>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="fix-invoice-number" className={labelCls}>
                  {t('fc.inv.new.invoiceNumber')}
                </label>
                <input
                  id="fix-invoice-number"
                  type="text"
                  className={inputCls}
                  value={fixNumber}
                  aria-invalid={fixDuplicate}
                  onChange={(e) => setFixNumber(e.target.value)}
                />
                {fixDuplicate && (
                  <div role="alert" className="mt-1 text-[11px] text-danger">
                    {t('fc.inv.new.duplicate')}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="fix-invoice-date" className={labelCls}>
                  {t('fc.inv.new.invoiceDate')}
                </label>
                <input
                  id="fix-invoice-date"
                  type="date"
                  className={inputCls}
                  value={fixDate}
                  onChange={(e) => setFixDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="fix-tax-invoice" className={labelCls}>
                {t('fc.inv.new.taxInvoice')}
              </label>
              <input
                id="fix-tax-invoice"
                type="file"
                className="text-sm text-text-secondary"
                onChange={(e) => setFixTaxFile(e.target.files?.[0]?.name ?? fixTaxFile)}
              />
              <div className="mt-1 text-xs text-text-tertiary">{fixTaxFile || t('fc.inv.new.noFile')}</div>
            </div>
            <div>
              <label htmlFor="fix-amount" className={labelCls}>
                {t('supplierInvoices.new.amountLabel')}
              </label>
              <input
                id="fix-amount"
                type="text"
                inputMode="decimal"
                className={inputCls}
                value={fixAmount}
                aria-invalid={fixAmount.trim() !== '' && !fixAmountRead.ok}
                onChange={(e) => setFixAmount(e.target.value)}
              />
              {fixAmount.trim() !== '' && !fixAmountRead.ok && (
                <div role="alert" className="mt-1 text-[11px] text-danger">
                  {t(INVOICE_AMOUNT_REFUSAL_KEY[fixAmountRead.reason])}{' '}
                  <GlossaryTermChip
                    refTo={{ sourceType: 'QtyRefusalReason', term: fixAmountRead.reason }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default SupplierInvoices;
