import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Send,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Download,
  ChevronRight,
  ChevronDown,
  Upload,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import {
  OrderNotFound,
  PoFilterBanner,
  drilledPoNumber,
  usePoDrillFilter,
} from './orders/PoDrillFilter';
import { asnsForPo } from './orders/orderSummaryModel';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import Wizard, { WizardStep } from '../components/ui-v2/Wizard';
import FormSection from '../components/ui-v2/FormSection';
import Data from '../components/ui-v2/Data';
import { useVerbAvailabilities } from '../hooks/useVerbAvailability';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useTranslation } from 'react-i18next';
import { statusLabelKey } from '../lib/statusLabel';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import {
  useAdvanceShipNoticeCancel,
  useAdvanceShipNoticeCreate,
  useAdvanceShipNoticeSubmit,
} from '../services/query/commandHooks';
import { ASN_CANCELLABLE_STATES, type AvailableBatch } from '../services/transitions/fulfilmentRules';
import {
  EMPTY_LINE,
  batchModeOf,
  batchesByMaterial,
  openLinesFor,
  readLines,
  seedLines,
  type AsnLinesRead,
  type LineEntry,
  type OpenLine,
} from './shipments/asnLines';
import { POStatus } from '../services/data/types';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import {
  useCurrentSupplier,
  usePurchaseOrders,
  useASNs,
  useCallOffs,
  useInventory,
} from '../services/query/hooks';
import { isConfirmedAndAccepted } from '../services/transitions/callOffRules';
import type { AsnStatus, ASN, PurchaseOrder } from '../services/data/types';
import { useRefusalText } from '../hooks/useRefusalText';
import { refusalDetailOf } from '../services/transitions/refusalMessage';
import TrackingNumber from '../components/ui-v2/TrackingNumber';
import CarrierPicker, { carrierFor, defaultCarrier } from './shipments/CarrierPicker';
import { PicCell, PicFilter, PicHeader, usePicFilter } from './materials/picDisplay';

type TabKey = 'shipments' | 'create';
type StatusFilter = AsnStatus | 'All';

const STATUS_VARIANT: Record<AsnStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Draft: 'neutral',
  Submitted: 'neutral',
  'In Transit': 'warning',
  Delivered: 'success',
  Discrepancy: 'danger',
  Cancelled: 'neutral',
};

const fmtDate = (s: string): string => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

interface AsnForm {
  poId: string;
  /** BL-51 — the 3PL picked from the list, or '' for a carrier typed by name. */
  threePlId: string;
  carrier: string;
  trackingNumber: string;
  shipDate: string;
  eta: string;
  packages: string;
  weightKg: string;
  packingList: string;
  notes: string;
  confirmed: boolean;
  /** Keyed by material code. */
  lines: Record<string, LineEntry>;
  overShipReason: string;
  /** REQ-E09-03 BR-06 — the confirmed call-off this ASN ships, or '' for a PO-level ASN. */
  callOffId: string;
}

const EMPTY_FORM: AsnForm = {
  poId: '',
  // BL-51 — filled from the 3PL list when the form opens (`newAsnForm`).
  threePlId: '',
  carrier: '',
  trackingNumber: '',
  shipDate: '2026-04-07',
  eta: '',
  packages: '',
  weightKg: '',
  packingList: '',
  notes: '',
  confirmed: false,
  lines: {},
  overShipReason: '',
  callOffId: '',
};

/** A fresh ASN form, its carrier defaulted from the 3PL list in force. */
const newAsnForm = (): AsnForm => ({ ...EMPTY_FORM, ...defaultCarrier() });

/** Value of the batch picker's "type a batch" choice (edge case 4). */
const TYPE_BATCH = '__typed__';

/**
 * MR-6 BR-01 to BR-04 — the batch field. With declared batches on offer it is
 * a picker showing batch, available quantity and expiry, and picking one fills
 * the expiry; the supplier may still type a batch instead (edge case 4).
 * Without any, it is free text, marked as not in declared stock.
 */
const BatchCell: React.FC<{
  materialCode: string;
  entry: LineEntry;
  options: readonly AvailableBatch[];
  onChange: (patch: Partial<LineEntry>) => void;
}> = ({ materialCode, entry, options, onChange }) => {
  const { t } = useTranslation();
  const mode = batchModeOf(entry, options);
  const typed = (
    <>
      <input
        type="text"
        aria-label={
          options.length > 0
            ? t('fc.asn.batch.typedFor', { material: materialCode })
            : t('fc.asn.batchFor', { material: materialCode })
        }
        value={entry.batch}
        onChange={(ev) => onChange({ batch: ev.target.value, batchSource: 'typed' })}
        placeholder={t('supplierShipments.placeholder.batch')}
        className={`${inputClass} min-w-[110px] ${options.length > 0 ? 'mt-1' : ''}`}
      />
      <div className="mt-1 text-[11px] text-text-tertiary">{t('fc.asn.batch.notDeclaredNote')}</div>
    </>
  );
  if (options.length === 0) return typed;
  const pick = (value: string) => {
    if (value === TYPE_BATCH) {
      onChange({ batch: '', batchSource: 'typed' });
      return;
    }
    const o = options.find((x) => x.batchNumber === value);
    onChange({ batch: value, batchSource: 'declared', expiry: o?.expiryDate ?? '' });
  };
  return (
    <>
      <select
        aria-label={t('fc.asn.batchFor', { material: materialCode })}
        value={mode === 'declared' ? entry.batch.trim() : TYPE_BATCH}
        onChange={(ev) => pick(ev.target.value)}
        className={`${inputClass} min-w-[160px]`}
      >
        <option value="">{t('fc.asn.batch.choose')}</option>
        {options.map((o) => (
          <option key={o.batchNumber} value={o.batchNumber}>
            {o.expiryDate
              ? t('fc.asn.batch.option', {
                  batch: o.batchNumber,
                  available: o.available.toLocaleString('en-US'),
                  expiry: fmtDate(o.expiryDate),
                })
              : t('fc.asn.batch.optionNoExpiry', {
                  batch: o.batchNumber,
                  available: o.available.toLocaleString('en-US'),
                })}
          </option>
        ))}
        <option value={TYPE_BATCH}>{t('fc.asn.batch.typeOther')}</option>
      </select>
      {mode === 'typed' ? typed : null}
    </>
  );
};

/** The shared line editor: shipped quantity, batch and expiry per PO line. */
const AsnLinesEditor: React.FC<{
  open: readonly OpenLine[];
  entries: Record<string, LineEntry>;
  read: AsnLinesRead;
  batches: Readonly<Record<string, readonly AvailableBatch[]>>;
  onChange: (materialCode: string, patch: Partial<LineEntry>) => void;
  overShipReason: string;
  onReasonChange: (v: string) => void;
}> = ({ open, entries, read, batches, onChange, overShipReason, onReasonChange }) => {
  const { t } = useTranslation();
  if (open.length === 0) {
    return <p className="text-sm text-text-tertiary">{t('fc.asn.lines.empty')}</p>;
  }
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-text-tertiary uppercase">
              <th className="text-left py-1 pr-2">{t('fc.asn.col.material')}</th>
              <th className="text-right py-1 pr-2">{t('fc.asn.col.open')}</th>
              <th className="text-left py-1 pr-2">{t('fc.asn.col.shipped')}</th>
              <th className="text-left py-1 pr-2">{t('fc.asn.col.batch')}</th>
              <th className="text-left py-1">{t('fc.asn.col.expiry')}</th>
            </tr>
          </thead>
          <tbody>
            {open.map((l) => {
              const e = entries[l.materialCode] ?? EMPTY_LINE;
              const r = read.lines.find((x) => x.line.materialCode === l.materialCode);
              const bad = !!r && !r.qtyOk;
              const over = !!r && r.over;
              return (
                <tr key={l.materialCode} className="border-t border-border-subtle align-top">
                  <td className="py-1.5 pr-2">
                    <Data as="div" className="text-[11px] text-text-tertiary">
                      {l.materialCode}
                    </Data>
                    <div className="text-text-primary">{l.description}</div>
                  </td>
                  <td className="py-1.5 pr-2 text-right whitespace-nowrap">
                    <Data>{`${l.open.toLocaleString('en-US')} ${l.uom}`}</Data>
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={t('fc.asn.shippedFor', { material: l.materialCode })}
                      aria-invalid={bad || over}
                      value={e.qty}
                      onChange={(ev) => onChange(l.materialCode, { qty: ev.target.value })}
                      className={`${inputClass} min-w-[96px]`}
                    />
                    {bad && <div className="mt-1 text-[11px] text-danger">{t('fc.asn.qty.invalid')}</div>}
                  </td>
                  <td className="py-1.5 pr-2">
                    <BatchCell
                      materialCode={l.materialCode}
                      entry={e}
                      options={batches[l.materialCode] ?? []}
                      onChange={(patch) => onChange(l.materialCode, patch)}
                    />
                  </td>
                  <td className="py-1.5">
                    <input
                      type="date"
                      aria-label={t('fc.asn.expiryFor', { material: l.materialCode })}
                      value={e.expiry}
                      onChange={(ev) => onChange(l.materialCode, { expiry: ev.target.value })}
                      className={inputClass}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {read.overCount > 0 && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-3 py-2 space-y-2">
          <p role="alert" className="text-xs text-warning-hover">
            {read.overCount === 1
              ? t('fc.asn.overOpen.one')
              : t('fc.asn.overOpen.other', { count: read.overCount })}
          </p>
          <label className="block">
            <span className={labelClass}>{t('fc.asn.overOpen.reason')}</span>
            <textarea
              rows={2}
              value={overShipReason}
              onChange={(ev) => onReasonChange(ev.target.value)}
              className={`${inputClass} resize-y`}
            />
          </label>
        </div>
      )}
    </div>
  );
};

// BL-51 — the hard-coded carrier list that stood here is RETIRED. Its choices
// now come from the administrator's 3PL list (`threePlStore`, sample names
// held fictional by `carrierIdentity.test.ts`), and its "Other" option — which
// stored the word "Other" as the carrier — is replaced by a typed carrier name
// (`CarrierPicker`). Batch E's note still applies to the new list: option text
// is absent from `innerText`, so a render census does not see the names.


interface ShipmentsListProps {
  asns: ASN[];
  statusFilter: StatusFilter;
  expanded: Set<string>;
  onToggleExpand: (asnNumber: string) => void;
  onSubmitAsn: (asnNumber: string) => void;
  onCancelAsn: (asnNumber: string) => void;
  onCreateAsnForPO: (poId: string) => void;
  confirmedPOs: PurchaseOrder[];
}

const ShipmentsList: React.FC<ShipmentsListProps> = ({
  asns,
  statusFilter,
  expanded,
  onToggleExpand,
  onSubmitAsn,
  onCancelAsn,
  onCreateAsnForPO,
  confirmedPOs,
}) => {
  const { t } = useTranslation();
  // Material C4 — the PIC filter (by name: a supplier never sees the code). An
  // ASN is kept when any of its lines is that controller's material.
  const pic = usePicFilter();
  // ⚠️ TWO VERBS, TWO SLOTS — never one notice speaking for both (§76). They
  // are co-reachable on this page: a supplier with a confirmed PO and a draft
  // ASN sees the create row and the submit cell at the same time, so a single
  // collapsed notice would name an owner for an act the reader was not looking
  // at. Both atoms belong to FULFILMENT, and they are asked separately anyway
  // so the answer stays right if the lanes ever diverge.
  const asnVerbs = useVerbAvailabilities({
    create: 'asn:create',
    submit: 'asn:submit',
    // `asn:flag` is a `receiving` atom and this is the supplier side, so this
    // answer is `withheld` for every seat that can reach this page. It is asked
    // through the SAME resolver as the other two rather than hardcoded to a
    // notice: the day a supplier lane is granted the atom, the surface follows
    // the bundles instead of contradicting them.
    resolve: 'asn:flag',
    // REQ-E07-04 — withdrawing a notice before receipt.
    cancel: 'asn:cancel',
  } as const);
  const filtered = useMemo(
    () =>
      (statusFilter === 'All' ? asns : asns.filter((a) => a.status === statusFilter)).filter(
        (a) => pic.filter === '' || a.lineItems.some((li) => pic.matches(li.mrpController)),
      ),
    [statusFilter, asns, pic.filter, pic.matches],
  );

  const pendingPOs = useMemo(() => {
    const asnPoRefs = new Set(asns.map((a) => a.poReference));
    return confirmedPOs.filter((po) => !asnPoRefs.has(po.poNumber));
  }, [confirmedPOs, asns]);

  return (
    <div className="flex flex-col gap-5">
      {pendingPOs.length > 0 && (
        <section className="bg-warning-soft border-l-2 border-warning rounded-md px-4 py-3">
          <div className="text-sm font-semibold text-text-primary mb-3">
            {t(
              pendingPOs.length === 1
                ? 'supplierShipments.pending.awaiting.one'
                : 'supplierShipments.pending.awaiting.other',
              { count: pendingPOs.length },
            )}
          </div>
          <div className="flex flex-col gap-2">
            {pendingPOs.map((po) => {
              const first = po.lineItems[0];
              return (
                <div
                  key={po.id}
                  className="bg-bg-surface border border-border-subtle rounded-md px-3 py-2 grid grid-cols-1 sm:grid-cols-[140px_1fr_180px_140px] gap-3 items-center text-sm"
                >
                  <Data className="font-bold text-text-primary">
                    {po.poNumber}
                  </Data>
                  <span className="text-text-secondary">
                    {first?.description ?? '—'}
                  </span>
                  <span className="text-text-tertiary text-xs whitespace-nowrap">
                    {t('supplierShipments.pending.req')}{' '}
                    <Data>{fmtDate(po.requestedDeliveryDate)}</Data>
                  </span>
                  <div className="justify-self-end">
                    {asnVerbs.create.kind === 'held' ? (
                      <Button
                        variant="outline"
                        icon={Plus}
                        onClick={() => onCreateAsnForPO(po.id)}
                      >
                        {t('asn.create.action')}
                      </Button>
                    ) : (
                      <HandoffNotice
                        availability={asnVerbs.create}
                        testId="handoff-asn-create"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-section text-text-primary">
            {t('supplierShipments.list.heading')}
            {statusFilter !== 'All' && (
              <span className="text-text-tertiary font-normal ml-2 text-xs">
                ·{' '}
                {t('supplierShipments.list.filteredBy', {
                  status: t(statusLabelKey(statusFilter) ?? statusFilter),
                })}
              </span>
            )}
          </h3>
          <PicFilter
            refs={asns.flatMap((a) => a.lineItems.map((li) => li.mrpController))}
            persona="supplier"
            filter={pic.filter}
            setFilter={pic.setFilter}
            myCode={pic.myCode}
          />
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell className="w-8">
              <span className="sr-only">{t('supplierShipments.aria.expand')}</span>
            </TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.asn')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.poRef')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.status')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.carrier')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.tracking')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.eta')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('supplierShipments.col.actions')}
            </TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((asn) => {
              const isOpen = expanded.has(asn.asnNumber);
              return (
                <React.Fragment key={asn.asnNumber}>
                  <TableRow>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => onToggleExpand(asn.asnNumber)}
                        aria-label={
                          isOpen
                            ? t('supplierShipments.aria.collapse')
                            : t('supplierShipments.aria.expand')
                        }
                        className="text-text-tertiary hover:text-text-primary"
                      >
                        {isOpen ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Data className="text-xs font-bold text-text-primary whitespace-nowrap">
                        {asn.asnNumber}
                      </Data>
                    </TableCell>
                    <TableCell className="text-xs text-text-secondary whitespace-nowrap">
                      <Data>{asn.poReference}</Data>
                    </TableCell>
                    <TableCell>
                      <StatusPill variant={STATUS_VARIANT[asn.status]}>
                        {asn.status}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="text-text-secondary whitespace-nowrap">
                      {asn.carrier}
                    </TableCell>
                    <TableCell className="text-xs text-text-tertiary whitespace-nowrap">
                      {/* BL-51 — a link to the 3PL's tracking page, or plain text. */}
                      <TrackingNumber
                        threePlId={asn.threePlId}
                        trackingNumber={asn.trackingNumber}
                        testId={`asn-tracking-${asn.asnNumber}`}
                      />
                    </TableCell>
                    <TableCell className="text-text-tertiary whitespace-nowrap">
                      <Data>{asn.eta ? fmtDate(asn.eta) : '—'}</Data>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {asn.status === 'Draft' &&
                        (asnVerbs.submit.kind === 'held' ? (
                          <Button
                            variant="outline"
                            onClick={() => onSubmitAsn(asn.asnNumber)}
                          >
                            {t('asn.submit.action')}
                          </Button>
                        ) : (
                          <HandoffNotice
                            availability={asnVerbs.submit}
                            testId="handoff-asn-submit"
                          />
                        ))}
                      {/* ⚠️ **THIS WAS A BUTTON THAT LIED, AND IT IS NOW THE
                          WAIT.** It rendered "Resolve", fired an info toast
                          ("Discrepancy handling pending"), and changed nothing.
                          Both halves of that were wrong by the time it was read:
                          `t_asn_resolve_discrepancy` has been dispatchable since
                          it was authored, and its atom `asn:flag` lives in
                          `receiving` — a BUYER lane. **No supplier lane holds
                          it** (`commercial` / `fulfilment` / `back_office`
                          carry `asn:create` and `asn:submit`, never `:flag`),
                          so this control could never have been the supplier's
                          act however well it was wired. `availabilityOfAtom`
                          therefore returns `withheld` here on every supplier
                          seat that exists, and the notice names the dock. */}
                      {asn.status === 'Discrepancy' && (
                        <HandoffNotice
                          availability={asnVerbs.resolve}
                          testId="handoff-asn-resolve"
                        />
                      )}
                      {ASN_CANCELLABLE_STATES.includes(asn.status) &&
                        (asnVerbs.cancel.kind === 'held' ? (
                          <Button
                            variant="secondary"
                            className="ml-2"
                            onClick={() => onCancelAsn(asn.asnNumber)}
                            aria-label={`${t('fc.asn.cancel.action')} ${asn.asnNumber}`}
                          >
                            {t('fc.asn.cancel.action')}
                          </Button>
                        ) : (
                          <HandoffNotice
                            availability={asnVerbs.cancel}
                            testId="handoff-asn-cancel"
                          />
                        ))}
                      {!ASN_CANCELLABLE_STATES.includes(asn.status) &&
                        asn.status !== 'Discrepancy' && (
                          <span className="text-text-tertiary text-xs">—</span>
                        )}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <tr className="bg-bg-page border-t border-border-subtle">
                      <td
                        colSpan={8}
                        className="px-6 py-4"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5">
                          <div className="bg-bg-surface border border-border-subtle rounded-md p-4">
                            <div className="text-label text-text-tertiary uppercase mb-3">
                              {t('supplierShipments.detail.heading')}
                            </div>
                            <dl className="grid grid-cols-[160px_1fr] gap-y-1.5 text-xs">
                              <dt className="text-text-tertiary">
                                {t('supplierShipments.detail.origin')}
                              </dt>
                              {/* i18n-defer: mock/sample data (origin city) */}
                              <dd className="text-text-primary">
                                {asn.details.originCity}
                              </dd>
                              <dt className="text-text-tertiary">
                                {t('supplierShipments.detail.destinationWarehouse')}
                              </dt>
                              {/* i18n-defer: mock/sample data (warehouse name) */}
                              <dd className="text-text-primary">
                                {asn.details.destinationWarehouse}
                              </dd>
                              <dt className="text-text-tertiary">
                                {t('supplierShipments.detail.totalCartons')}
                              </dt>
                              <dd className="text-text-primary">
                                <Data>
                                  {asn.details.totalCartons
                                    ? asn.details.totalCartons.toLocaleString()
                                    : '—'}
                                </Data>
                              </dd>
                              <dt className="text-text-tertiary">
                                {t('supplierShipments.detail.grossWeight')}
                              </dt>
                              <dd className="text-text-primary">
                                <Data>
                                  {asn.details.grossWeightKg
                                    ? `${asn.details.grossWeightKg.toLocaleString()} kg`
                                    : '—'}
                                </Data>
                              </dd>
                              <dt className="text-text-tertiary">
                                {t('supplierShipments.detail.temperature')}
                              </dt>
                              {/* i18n-defer: mock/sample data (temperature requirement) */}
                              <dd className="text-text-primary">
                                {asn.details.temperatureRequirement}
                              </dd>
                              <dt className="text-text-tertiary">
                                {t('fc.asn.detail.shipDate')}
                              </dt>
                              <dd className="text-text-primary">
                                <Data>{asn.shipDate ? fmtDate(asn.shipDate) : t('fc.asn.detail.none')}</Data>
                              </dd>
                              <dt className="text-text-tertiary">
                                {t('fc.asn.detail.packingList')}
                              </dt>
                              <dd className="text-text-primary">
                                {asn.packingListFile ?? t('fc.asn.detail.none')}
                              </dd>
                              {asn.overShipReason && (
                                <>
                                  <dt className="text-text-tertiary">
                                    {t('fc.asn.detail.overShipReason')}
                                  </dt>
                                  <dd className="text-text-primary">{asn.overShipReason}</dd>
                                </>
                              )}
                            </dl>
                          </div>
                          <div className="bg-bg-surface border border-border-subtle rounded-md p-4">
                            <div className="text-label text-text-tertiary uppercase mb-3">
                              {t('supplierShipments.detail.lineItems', {
                                count: asn.lineItems.length,
                              })}
                            </div>
                            {asn.lineItems.length === 0 ? (
                              <div className="text-xs text-text-tertiary">
                                {t('supplierShipments.detail.noLineItems')}
                              </div>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-text-tertiary uppercase">
                                    <th className="text-left py-1">
                                      {t('supplierShipments.lineItems.col.material')}
                                    </th>
                                    <th className="text-left py-1">
                                      <PicHeader />
                                    </th>
                                    <th className="text-right py-1">
                                      {t('supplierShipments.lineItems.col.ordered')}
                                    </th>
                                    <th className="text-right py-1">
                                      {t('supplierShipments.lineItems.col.shipped')}
                                    </th>
                                    <th className="text-right py-1">
                                      {t('supplierShipments.lineItems.col.lot')}
                                    </th>
                                    <th className="text-right py-1">
                                      {t('fc.asn.col.expiryShort')}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {asn.lineItems.map((li) => {
                                    const short = li.shippedQty < li.orderedQty;
                                    return (
                                      <tr
                                        key={li.materialCode}
                                        className="border-t border-border-subtle"
                                      >
                                        <td className="py-1.5">
                                          <Data as="div" className="text-[10px] text-text-tertiary">
                                            {li.materialCode}
                                          </Data>
                                          {/* i18n-defer: mock/sample data (material description) */}
                                          <div className="text-text-primary">
                                            {li.description}
                                          </div>
                                        </td>
                                        <td className="py-1.5">
                                          <PicCell
                                            value={li.mrpController}
                                            testId={`asn-line-pic-${asn.asnNumber}-${li.materialCode}`}
                                          />
                                        </td>
                                        <td className="py-1.5 text-right text-text-secondary">
                                          <Data>{li.orderedQty.toLocaleString()}</Data>
                                        </td>
                                        <td
                                          className={`py-1.5 text-right font-semibold ${short ? 'text-warning-hover' : 'text-text-primary'}`}
                                        >
                                          <Data>{li.shippedQty.toLocaleString()}</Data>
                                        </td>
                                        <td className="py-1.5 text-right text-text-tertiary">
                                          <Data>{li.lotNumber}</Data>
                                        </td>
                                        <td className="py-1.5 text-right text-text-tertiary">
                                          <Data>{li.expiryDate ? fmtDate(li.expiryDate) : '—'}</Data>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  {t('supplierShipments.list.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

const SupplierShipments: React.FC = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const SHIPMENTS_CRUMB = [
    t('supplierShipments.crumb.transact'),
    t('supplierShipments.crumb.shipments'),
  ];
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const createAsnMutation = useAdvanceShipNoticeCreate();
  const submitAsnMutation = useAdvanceShipNoticeSubmit();
  const cancelAsnMutation = useAdvanceShipNoticeCancel();
  // ⚠️ **THE WIZARD TAB IS A SECOND ENTRY TO THE SAME VERBS, AND THE FIRST PASS
  // OF THIS BATCH MISSED IT** — `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01` for
  // the third time, on the seat that was applying the rule. The row-level create
  // inside `ShipmentsList` was gated; this tab opens a three-step wizard that
  // dispatches `t_asn_create` AND `t_asn_submit` at `onComplete`, and it stayed
  // live for a seat holding neither. **The unit suite could not see it** — no
  // spec drove the tab — and it was found by walking a narrowed seat across the
  // built bundle, which is exactly what that QA bar exists for.
  //
  // BOTH atoms, because the wizard fires both: offering it on a seat that can
  // create but not submit would strand a draft at the last click.
  const wizardVerbs = useVerbAvailabilities({
    create: 'asn:create',
    submit: 'asn:submit',
  } as const);
  const wizardHeld =
    wizardVerbs.create.kind === 'held' && wizardVerbs.submit.kind === 'held';
  const [tab, setTab] = useState<TabKey>('shipments');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AsnForm>(newAsnForm);
  const [submitTarget, setSubmitTarget] = useState<ASN | null>(null);
  const [submitForm, setSubmitForm] = useState({
    // BL-51 — replaced from the draft when the drawer opens (`carrierFor`).
    threePlId: '',
    carrier: '',
    trackingNumber: '',
    eta: '',
    shipDate: '',
    lines: {} as Record<string, LineEntry>,
    overShipReason: '',
  });
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const supplierQuery = useCurrentSupplier();
  const asnsQuery = useASNs();
  // REQ-E09-03 BR-06 — an ASN may ship a confirmed call-off on the chosen PO.
  const callOffsQuery = useCallOffs();
  // REQ-E07-04 — partial shipments: a PO stays shippable after a first receipt.
  const posQuery = usePurchaseOrders({
    status: [POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED],
  });

  // MR-6 BR-01 — the supplier's own stock positions, for the batch picker. Not
  // a gate on the page: without them the batch is typed, as BR-04 allows.
  const inventoryQuery = useInventory();

  const mySupplier = supplierQuery.data ?? null;
  const asns = useMemo(() => asnsQuery.data?.items ?? [], [asnsQuery.data]);
  const declaredBatches = useMemo(
    () => (supplierId ? batchesByMaterial(supplierId, inventoryQuery.data?.items ?? [], asns) : {}),
    [supplierId, inventoryQuery.data, asns],
  );
  // REQ-E07-03 — the drill-through filter. A supplier addressing another
  // supplier's PO gets `notFound`: its own PO read never returned it (BR-06).
  const drill = usePoDrillFilter();
  const drilledPo = drilledPoNumber(drill);
  /**
   * The ASNs this page lists when a PO filter is in play — the SAME predicate
   * the summary counted with (BR-09), so AC-10 cannot drift.
   */
  const visibleAsns = useMemo(
    () => (drilledPo === null ? asns : [...asnsForPo(asns, drilledPo)]),
    [asns, drilledPo],
  );
  const SHIPPABLE_POS = useMemo(
    () => posQuery.data?.items ?? [],
    [posQuery.data],
  );
  const CONFIRMED_POS = useMemo(
    () => SHIPPABLE_POS.filter((po) => po.status === POStatus.CONFIRMED),
    [SHIPPABLE_POS],
  );

  const counts = useMemo(() => {
    const base: Record<AsnStatus, number> = {
      Draft: 0,
      Submitted: 0,
      'In Transit': 0,
      Delivered: 0,
      Discrepancy: 0,
      Cancelled: 0,
    };
    for (const a of asns) base[a.status]++;
    return base;
  }, [asns]);

  // AC-03 — exactly one record behind the cell arrives OPEN, not as a list of one.
  const onlyAsn = drilledPo !== null && visibleAsns.length === 1 ? visibleAsns[0].asnNumber : null;
  useEffect(() => {
    if (onlyAsn === null) return;
    setExpanded((prev) => (prev.has(onlyAsn) ? prev : new Set(prev).add(onlyAsn)));
  }, [onlyAsn]);

  const toggleExpand = (asnNumber: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(asnNumber)) next.delete(asnNumber);
      else next.add(asnNumber);
      return next;
    });
  };

  const updateForm = (patch: Partial<AsnForm>) =>
    setForm((f) => ({ ...f, ...patch }));

  const setKpiFilter = (s: AsnStatus) => {
    setStatusFilter((prev) => (prev === s ? 'All' : s));
    setTab('shipments');
  };

  // Open the submit drawer for a Draft ASN — the required fields (carrier,
  // tracking, ETA) are collected here before dispatch. Fixture drafts store '—'
  // placeholders; normalize those to empty so the form starts genuinely blank.
  const openSubmitForm = (asnNumber: string) => {
    const asn = asns.find((a) => a.asnNumber === asnNumber);
    if (!asn) return;
    const real = (v: string) => (v && v !== '—' ? v : '');
    setSubmitTarget(asn);
    const entries: Record<string, LineEntry> = Object.fromEntries(
      submitLinesFor(asn).map((l) => {
        const stored = asn.lineItems.find((li) => li.materialCode === l.materialCode);
        return [
          l.materialCode,
          {
            qty: stored ? String(stored.shippedQty) : l.open > 0 ? String(l.open) : '',
            batch: stored ? real(stored.lotNumber) : '',
            expiry: stored?.expiryDate ?? '',
            // MR-6 BR-04 — a stored batch keeps how it was entered; a line stored
            // before the rule existed, with a batch, reads as typed.
            batchSource: stored?.batchSource ?? (stored && real(stored.lotNumber) ? 'typed' : 'declared'),
          },
        ];
      }),
    );
    setSubmitForm({
      ...carrierFor(asn),
      trackingNumber: real(asn.trackingNumber),
      eta: real(asn.eta),
      shipDate: asn.shipDate ?? '',
      lines: entries,
      overShipReason: asn.overShipReason ?? '',
    });
  };

  // The lines a draft is submitted with: its PO's lines (open quantity leaving
  // this draft out), plus any stored line whose material the PO does not carry.
  const submitLinesFor = (asn: ASN): OpenLine[] => {
    const po = SHIPPABLE_POS.find((p) => p.poNumber === asn.poReference);
    const fromPo = po ? openLinesFor(po, asns, asn.asnNumber) : [];
    const extra = asn.lineItems
      .filter((li) => !fromPo.some((l) => l.materialCode === li.materialCode))
      .map((li) => ({
        materialCode: li.materialCode,
        description: li.description,
        uom: li.uom ?? '',
        open: li.shippedQty,
      }));
    return [...fromPo, ...extra];
  };

  // The drawer's lines read by the one line rule (AR-11), leaving the draft
  // out of its own open quantity.
  const readSubmitLines = (asn: ASN) =>
    readLines(submitForm.lines, submitLinesFor(asn), {
      po: SHIPPABLE_POS.find((p) => p.poNumber === asn.poReference),
      asns,
      excludeAsn: asn.asnNumber,
      eta: submitForm.eta,
      overShipReason: submitForm.overShipReason,
      batches: declaredBatches,
    });

  // t_asn_submit (Draft → Submitted) with the collected fields. The dispatcher
  // is the source of truth: an incomplete form is honestly rejected (the
  // requiredFields enforcement), surfaced as a human-readable message.
  const doSubmitAsn = () => {
    if (!submitTarget) return;
    const asnNumber = submitTarget.asnNumber;
    const read = readSubmitLines(submitTarget);
    submitAsnMutation.mutate(
      {
        asnNumber,
        carrier: submitForm.carrier,
        // BL-51 — '' clears a 3PL the draft named (a carrier typed by name).
        threePlId: submitForm.threePlId,
        trackingNumber: submitForm.trackingNumber,
        eta: submitForm.eta,
        ...(submitForm.shipDate ? { shipDate: submitForm.shipDate } : {}),
        ...(read.lines.length > 0 ? { lines: read.lines.map((l) => l.input) } : {}),
        ...(submitForm.overShipReason.trim() ? { overShipReason: submitForm.overShipReason.trim() } : {}),
      },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            const missing = (res.reason ?? '').startsWith('MISSING_FIELDS');
            const incomplete = (res.reason ?? '').includes('INCOMPLETE_ASN');
            toast({
              variant: 'warning',
              title: t('asn.submit.failed.title', { asnNumber }),
              description: missing
                ? t('asn.submit.missingFields', { code: refusalDetailOf(res.reason) })
                : incomplete
                  ? `${t('fc.asn.submit.required')} (${refusalDetailOf(res.reason)})`
                  : (refusalText(res.reason) ?? t('asn.submit.failed.desc', { reason: res.reason ?? '' })),
            });
            return;
          }
          setSubmitTarget(null);
          toast({
            variant: 'success',
            title: t('asn.submit.success.title', { asnNumber }),
            description: t('asn.submit.success.desc', { correlationId: res.correlationId }),
          });
        },
        onError: () =>
          toast({ variant: 'error', title: t('asn.denied.title'), description: t('asn.denied.desc') }),
      },
    );
  };

  // t_asn_cancel — a Draft or Submitted ASN withdrawn before receipt.
  const doCancelAsn = () => {
    if (!cancelTarget) return;
    const asnNumber = cancelTarget;
    cancelAsnMutation.mutate(
      { asnNumber },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('fc.asn.cancel.failed', { asnNumber }),
              description: refusalText(res.reason) ?? res.reason ?? '',
            });
            return;
          }
          setCancelTarget(null);
          toast({ variant: 'success', title: t('fc.asn.cancel.success', { asnNumber }) });
        },
        onError: () =>
          toast({ variant: 'error', title: t('asn.denied.title'), description: t('asn.denied.desc') }),
      },
    );
  };

  // t_asn_create (creation) from a confirmed PO. Store assigns the number; the
  // list + "awaiting ASN" panel re-derive from the invalidated query.
  const createAsnForPO = (poId: string) => {
    const po = CONFIRMED_POS.find((p) => p.id === poId);
    if (!po) return;
    createAsnMutation.mutate(
      { poReference: po.poNumber },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'error',
              title: t('asn.create.failed.title'),
              description: refusalText(res.reason) ?? t('asn.create.failed.desc', { reason: res.reason ?? '' }),
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('asn.create.success.title', { asnNumber: res.entityId ?? '' }),
            description: t('asn.create.success.desc', {
              poNumber: po.poNumber,
              correlationId: res.correlationId,
            }),
          });
          setStatusFilter('All');
          setTab('shipments');
        },
        onError: () =>
          toast({ variant: 'error', title: t('asn.denied.title'), description: t('asn.denied.desc') }),
      },
    );
  };

  if (!supplierId) return <NoSupplierIdentity />;
  if (supplierQuery.isPending || asnsQuery.isPending || posQuery.isPending)
    return <LoadingState breadcrumb={SHIPMENTS_CRUMB} />;
  if (supplierQuery.isError || asnsQuery.isError || posQuery.isError)
    return (
      <ErrorState
        breadcrumb={SHIPMENTS_CRUMB}
        error={supplierQuery.error ?? asnsQuery.error ?? posQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          asnsQuery.refetch();
          posQuery.refetch();
        }}
      />
    );
  if (!mySupplier) return <NoSupplierIdentity />;
  // AC-07 / AC-08 — identical refusal for an unknown PO and another supplier's.
  if (drill.kind === 'pending') return <LoadingState breadcrumb={SHIPMENTS_CRUMB} />;
  if (drill.kind === 'notFound')
    return <OrderNotFound persona="supplier" breadcrumb={SHIPMENTS_CRUMB} />;
  if (asns.length === 0 && SHIPPABLE_POS.length === 0)
    return (
      <EmptyState
        breadcrumb={SHIPMENTS_CRUMB}
        title={t('supplierShipments.empty.title')}
        subtitle={t('supplierShipments.empty.subtitle')}
        message={t('supplierShipments.empty.message')}
      />
    );

  const selectedPO = SHIPPABLE_POS.find((p) => p.id === form.poId);
  const wizardOpenLines = selectedPO ? openLinesFor(selectedPO, asns) : [];
  // AR-11 — every line through the one line rule the verbs call.
  const wizardRead = readLines(form.lines, wizardOpenLines, {
    po: selectedPO,
    asns,
    eta: form.eta,
    overShipReason: form.overShipReason,
    batches: declaredBatches,
  });
  const step1Valid = form.poId !== '';
  // BR-04 required fields; `complete` carries each line's refusal, including
  // BR-02's reason when a line ships above open.
  const step2Valid =
    form.carrier !== '' &&
    form.trackingNumber !== '' &&
    form.shipDate !== '' &&
    form.eta !== '' &&
    form.eta >= form.shipDate &&
    wizardRead.complete;
  const step3Valid = form.confirmed;
  const isStepValid = (s: number): boolean =>
    s === 0 ? step1Valid : s === 1 ? step2Valid : step3Valid;

  // The wizard drafts a DETAILED ASN then submits it — create (t_asn_create,
  // store-assigned number) → submit (t_asn_submit). No fabricated document id;
  // honest outcome from the real command result.
  const completeWizard = async () => {
    if (!selectedPO) return;
    const detail = {
      carrier: form.carrier,
      ...(form.threePlId ? { threePlId: form.threePlId } : {}),
      trackingNumber: form.trackingNumber,
      eta: form.eta,
      shipDate: form.shipDate,
    };
    try {
      const createRes = await createAsnMutation.mutateAsync({
        poReference: selectedPO.poNumber,
        ...detail,
        lines: wizardRead.lines.map((l) => l.input),
        ...(form.packingList ? { packingListFile: form.packingList } : {}),
        ...(form.overShipReason.trim() ? { overShipReason: form.overShipReason.trim() } : {}),
        ...(form.callOffId ? { callOffId: form.callOffId } : {}),
      });
      if (createRes.status === 'failed' || !createRes.entityId) {
        toast({
          variant: 'error',
          title: t('asn.create.failed.title'),
          description: refusalText(createRes.reason) ?? t('asn.create.failed.desc', { reason: createRes.reason ?? '' }),
        });
        return;
      }
      const submitRes = await submitAsnMutation.mutateAsync({
        asnNumber: createRes.entityId,
        ...detail,
      });
      if (submitRes.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('asn.submit.failed.title', { asnNumber: createRes.entityId }),
          description: refusalText(submitRes.reason) ?? t('asn.submit.failed.desc', { reason: submitRes.reason ?? '' }),
        });
      } else {
        toast({
          variant: 'success',
          title: t('asn.submit.success.title', { asnNumber: createRes.entityId }),
          description: t('asn.submit.success.desc', { correlationId: submitRes.correlationId }),
        });
      }
    } catch {
      toast({ variant: 'error', title: t('asn.denied.title'), description: t('asn.denied.desc') });
    } finally {
      setStep(0);
      setForm(newAsnForm());
      setTab('shipments');
    }
  };

  const wizardSteps: WizardStep[] = [
    {
      id: 'select',
      title: t('supplierShipments.wizard.select.title'),
      shortTitle: t('supplierShipments.wizard.select.short'),
      description: t('supplierShipments.wizard.select.desc'),
      content: (
        <div className="flex flex-col gap-3">
          {SHIPPABLE_POS.length === 0 ? (
            <div className="bg-bg-hover border border-border-subtle rounded-md py-8 px-4 text-center text-sm text-text-tertiary">
              {t('supplierShipments.wizard.select.empty')}
            </div>
          ) : (
            SHIPPABLE_POS.map((po) => {
              const mat = po.lineItems[0];
              const selected = form.poId === po.id;
              const openTotal = openLinesFor(po, asns).reduce((a, l) => a + l.open, 0);
              return (
                <button
                  key={po.id}
                  type="button"
                  onClick={() =>
                    updateForm({
                      poId: po.id,
                      lines: seedLines(openLinesFor(po, asns)),
                      overShipReason: '',
                      callOffId: '',
                    })
                  }
                  aria-pressed={selected}
                  className={`text-left rounded-md p-4 border transition-colors ${
                    selected
                      ? 'border-action bg-action-soft'
                      : 'border-border-subtle bg-bg-surface hover:bg-bg-hover'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <Data as="div" className="text-sm font-bold text-text-primary">
                        {po.poNumber}
                      </Data>
                      <div className="text-sm text-text-secondary mt-1">
                        {mat?.description ?? '—'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-text-tertiary">
                        {t('supplierShipments.wizard.select.qty')}{' '}
                        <Data>{mat ? `${mat.quantity.toLocaleString()} ${mat.uom}` : '—'}</Data>
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {t('supplierShipments.wizard.select.delivery')}{' '}
                        <Data>{fmtDate(po.requestedDeliveryDate)}</Data>
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {t('fc.asn.select.open')}{' '}
                        <Data>{mat ? `${openTotal.toLocaleString()} ${mat.uom}` : '—'}</Data>
                      </div>
                    </div>
                  </div>
                  {selected && (
                    <div className="mt-3 pt-3 border-t border-teal/30 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-text-secondary">
                      <div>
                        <strong className="text-text-primary">
                          {t('supplierShipments.wizard.select.supplier')}
                        </strong>{' '}
                        {po.supplierName}
                      </div>
                      <div>
                        <strong className="text-text-primary">
                          {t('supplierShipments.wizard.select.requestedDelivery')}
                        </strong>{' '}
                        <Data>{fmtDate(po.requestedDeliveryDate)}</Data>
                      </div>
                      <div>
                        <strong className="text-text-primary">
                          {t('supplierShipments.wizard.select.deliveryAddress')}
                        </strong>{' '}
                        {/* i18n-defer: mock/sample data (delivery address) */}
                        NDC Jatake 6, Tangerang
                      </div>
                      <div>
                        <strong className="text-text-primary">
                          {t('supplierShipments.wizard.select.channel')}
                        </strong>{' '}
                        {po.channel}
                      </div>
                    </div>
                  )}
                </button>
              );
            })
          )}
          {selectedPO && (
            <div>
              <label htmlFor="asn-calloff" className="block text-label text-text-tertiary uppercase mb-1">
                {t('co.asn.callOff')}
              </label>
              <select
                id="asn-calloff"
                value={form.callOffId}
                onChange={(e) => updateForm({ callOffId: e.target.value })}
                className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
              >
                <option value="">{t('co.asn.noCallOff')}</option>
                {(callOffsQuery.data?.items ?? [])
                  .filter((c) => c.poId === selectedPO.id && isConfirmedAndAccepted(c))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {`${c.callOffNumber} · ${c.quantity.toLocaleString()} ${c.uom} · ${fmtDate(c.needDate)}`}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-text-tertiary">{t('co.asn.callOffHint')}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'details',
      title: t('supplierShipments.wizard.details.title'),
      shortTitle: t('supplierShipments.wizard.details.short'),
      description: t('supplierShipments.wizard.details.desc'),
      content: (
        <div className="flex flex-col gap-5">
          <FormSection
            eyebrow={t('supplierShipments.wizard.details.logistics.eyebrow')}
            title={t('supplierShipments.wizard.details.logistics.title')}
            description={t('supplierShipments.wizard.details.logistics.desc')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* BL-51 — the 3PL from the administrator's list, or a carrier by name. */}
              <CarrierPicker
                idPrefix="asn-wizard"
                label={t('supplierShipments.wizard.details.field.carrier')}
                labelClass={labelClass}
                inputClass={inputClass}
                value={{ threePlId: form.threePlId, carrier: form.carrier }}
                onChange={(v) => updateForm(v)}
              />
              <div>
                <label className={labelClass} htmlFor="asn-wizard-tracking">
                  {t('fc.asn.trackingOrVehicle')}
                </label>
                <input
                  id="asn-wizard-tracking"
                  type="text"
                  placeholder={t('supplierShipments.placeholder.tracking')}
                  value={form.trackingNumber}
                  onChange={(e) =>
                    updateForm({ trackingNumber: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block"><span className={labelClass}>
                  {t('supplierShipments.wizard.details.field.shipDate')}
                </span>
                <input
                  type="date"
                  value={form.shipDate}
                  onChange={(e) => updateForm({ shipDate: e.target.value })}
                  className={inputClass}
                /></label>
              </div>
              <div>
                <label className="block"><span className={labelClass}>
                  {t('supplierShipments.wizard.details.field.eta')}
                </span>
                <input
                  type="date"
                  value={form.eta}
                  onChange={(e) => updateForm({ eta: e.target.value })}
                  className={inputClass}
                /></label>
              </div>
            </div>
          </FormSection>

          <FormSection
            eyebrow={t('supplierShipments.wizard.details.logistics.eyebrow')}
            title={t('fc.asn.lines.title')}
            description={t('fc.asn.lines.desc')}
          >
            <AsnLinesEditor
              open={wizardOpenLines}
              entries={form.lines}
              read={wizardRead}
              batches={declaredBatches}
              onChange={(code, patch) =>
                setForm((f) => ({
                  ...f,
                  lines: {
                    ...f.lines,
                    [code]: { ...(f.lines[code] ?? EMPTY_LINE), ...patch },
                  },
                }))
              }
              overShipReason={form.overShipReason}
              onReasonChange={(v) => updateForm({ overShipReason: v })}
            />
          </FormSection>

          <FormSection
            eyebrow={t('supplierShipments.wizard.details.packaging.eyebrow')}
            title={t('supplierShipments.wizard.details.packaging.title')}
            description={t('supplierShipments.wizard.details.packaging.desc')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block"><span className={labelClass}>
                  {t('supplierShipments.wizard.details.field.packages')}
                </span>
                <input
                  type="number"
                  min={1}
                  placeholder="0"
                  value={form.packages}
                  onChange={(e) => updateForm({ packages: e.target.value })}
                  className={inputClass}
                /></label>
              </div>
              <div>
                <label className="block"><span className={labelClass}>
                  {t('supplierShipments.wizard.details.field.weight')}
                </span>
                <input
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={form.weightKg}
                  onChange={(e) => updateForm({ weightKg: e.target.value })}
                  className={inputClass}
                /></label>
              </div>
            </div>
          </FormSection>

          <FormSection
            eyebrow={t('supplierShipments.wizard.details.docs.eyebrow')}
            title={t('supplierShipments.wizard.details.docs.title')}
            description={t('supplierShipments.wizard.details.docs.desc')}
          >
            <div>
              <label className={labelClass}>
                {t('fc.asn.packingList')}
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) =>
                    updateForm({
                      packingList: e.target.files?.[0]?.name ?? '',
                    })
                  }
                />
                <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-border-input rounded-md text-sm text-teal-hover font-semibold bg-bg-surface">
                  <Upload size={14} />
                  {t('supplierShipments.wizard.details.chooseFile')}
                </span>
                <span
                  className={`text-xs ${form.packingList ? 'text-success' : 'text-text-tertiary'}`}
                >
                  {form.packingList || t('supplierShipments.wizard.details.noFile')}
                </span>
              </label>
            </div>
            <div>
              <label className="block"><span className={labelClass}>
                {t('supplierShipments.wizard.details.field.notes')}
              </span>
              <textarea
                value={form.notes}
                onChange={(e) => updateForm({ notes: e.target.value })}
                rows={3}
                placeholder={t('supplierShipments.placeholder.notes')}
                className={`${inputClass} resize-y`}
              /></label>
            </div>
          </FormSection>
        </div>
      ),
    },
    {
      id: 'review',
      title: t('supplierShipments.wizard.review.title'),
      shortTitle: t('supplierShipments.wizard.review.short'),
      description: t('supplierShipments.wizard.review.desc'),
      content: (
        <div className="flex flex-col gap-5">
          <FormSection
            eyebrow={t('supplierShipments.wizard.review.summary.eyebrow')}
            title={t('supplierShipments.wizard.review.summary.title')}
            description={t('supplierShipments.wizard.review.summary.desc')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                [t('supplierShipments.wizard.review.field.poNumber'), selectedPO?.poNumber ?? '—'],
                ...wizardRead.lines.map((l) => [
                  `${t('supplierShipments.wizard.review.field.material')} · ${l.line.materialCode}`,
                  `${l.line.description} · ${
                    Number.isFinite(l.input.shippedQty) ? l.input.shippedQty.toLocaleString() : '—'
                  } ${l.line.uom} · ${t('fc.asn.col.batch')} ${l.input.batchNumber || '—'}${
                    l.input.batchSource === 'typed' ? ` (${t('fc.asn.batch.notDeclared')})` : ''
                  }${
                    l.input.expiryDate ? ` · ${t('fc.asn.col.expiryShort')} ${fmtDate(l.input.expiryDate)}` : ''
                  }`,
                ]),
                [t('supplierShipments.wizard.review.field.carrier'), form.carrier],
                [t('fc.asn.trackingOrVehicle'), form.trackingNumber || '—'],
                [t('supplierShipments.wizard.review.field.shipDate'), fmtDate(form.shipDate)],
                [t('supplierShipments.wizard.review.field.eta'), form.eta ? fmtDate(form.eta) : '—'],
                [t('supplierShipments.wizard.review.field.packages'), form.packages || '—'],
                [t('fc.asn.packingList'), form.packingList || '—'],
                ...(form.overShipReason.trim()
                  ? [[t('fc.asn.detail.overShipReason'), form.overShipReason.trim()]]
                  : []),
              ].map(([k, v]) => (
                <div key={k} className="bg-bg-hover rounded-md px-3 py-2">
                  <div className="text-label text-text-tertiary uppercase mb-0.5">
                    {k}
                  </div>
                  <div className="text-sm font-semibold text-text-primary">
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          {/* MR-6 BR-03 — a warning, never a block: the stock record can be a cycle old. */}
          {wizardRead.aboveAvailable.length > 0 ? (
            <div
              role="alert"
              data-testid="asn-batch-above-available"
              className="bg-warning-soft border-l-2 border-warning rounded px-3 py-2 space-y-1 text-xs text-warning-hover"
            >
              {wizardRead.aboveAvailable.map((l) => (
                <p key={l.line.materialCode}>
                  {t('fc.asn.batch.aboveAvailable', {
                    material: l.line.materialCode,
                    qty: l.input.shippedQty.toLocaleString('en-US'),
                    batch: l.input.batchNumber,
                    available: (l.aboveAvailable ?? 0).toLocaleString('en-US'),
                  })}
                </p>
              ))}
              <p>{t('fc.asn.batch.aboveAvailableHint')}</p>
            </div>
          ) : null}

          <label className="flex items-start gap-3 px-4 py-3 bg-teal-soft border border-teal/30 rounded-md cursor-pointer text-sm text-text-primary">
            <input
              type="checkbox"
              checked={form.confirmed}
              onChange={(e) => updateForm({ confirmed: e.target.checked })}
              className="mt-0.5 accent-teal"
            />
            {t('supplierShipments.wizard.review.confirm')}
          </label>
        </div>
      ),
    },
  ];

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={SHIPMENTS_CRUMB}
        title={t('supplierShipments.header.title')}
        subtitle={t('supplierShipments.header.subtitle', { name: mySupplier.name })}
        actions={
          <BulkActionsBar
            actions={[
              {
                label: t('supplierShipments.action.exportEdi'),
                icon: Download,
                onClick: () =>
                  toast({
                    variant: 'info',
                    title: t('supplierShipments.toast.export.title'),
                    description: t('supplierShipments.toast.export.desc'),
                  }),
              },
            ]}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('supplierShipments.meta.summary', {
          shipments: asns.length,
          pos: SHIPPABLE_POS.length,
        })}
        {/* D-CENSUS-8 — PARTLY REAL, both axes. ASN create + submit dispatch through
            the wired `advanceShipNotice` target and cascade into goods receipt; the
            POs being shipped against are fixtures. */}
        <ProvenanceMarker capability="advanceShipNotices" className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <KpiCard
          eyebrow={t('supplierShipments.kpi.draft.eyebrow')}
          value={counts.Draft.toString()}
          icon={FileText}
          onClick={() => setKpiFilter('Draft')}
          active={statusFilter === 'Draft'}
        />
        <KpiCard
          eyebrow={t('supplierShipments.kpi.submitted.eyebrow')}
          value={counts.Submitted.toString()}
          icon={Send}
          onClick={() => setKpiFilter('Submitted')}
          active={statusFilter === 'Submitted'}
        />
        <KpiCard
          eyebrow={t('supplierShipments.kpi.inTransit.eyebrow')}
          value={counts['In Transit'].toString()}
          icon={Truck}
          onClick={() => setKpiFilter('In Transit')}
          active={statusFilter === 'In Transit'}
        />
        <KpiCard
          eyebrow={t('supplierShipments.kpi.delivered.eyebrow')}
          value={counts.Delivered.toString()}
          icon={CheckCircle2}
          onClick={() => setKpiFilter('Delivered')}
          active={statusFilter === 'Delivered'}
        />
        <KpiCard
          eyebrow={t('supplierShipments.kpi.discrepancy.eyebrow')}
          value={counts.Discrepancy.toString()}
          icon={AlertTriangle}
          onClick={() => setKpiFilter('Discrepancy')}
          active={statusFilter === 'Discrepancy'}
        />
      </div>

      {/* BR-04 / AC-02 — the filter is visible, and the way back is offered. */}
      <PoFilterBanner drill={drill} persona="supplier" count={visibleAsns.length} />

      <SubTabs<TabKey>
        options={[
          {
            id: 'shipments',
            label: t('supplierShipments.tab.myShipments'),
            count: visibleAsns.length,
          },
          // Withheld rather than disabled — §73's rule, applied to a tab: a seat
          // that cannot finish the wizard is not offered its first step.
          ...(wizardHeld
            ? [{ id: 'create' as TabKey, label: t('supplierShipments.tab.createAsn') }]
            : []),
        ]}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />

      {tab === 'shipments' && (
        <ShipmentsList
          asns={visibleAsns}
          statusFilter={statusFilter}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          onSubmitAsn={openSubmitForm}
          onCancelAsn={setCancelTarget}
          onCreateAsnForPO={createAsnForPO}
          confirmedPOs={CONFIRMED_POS}
        />
      )}

      {tab === 'create' && !wizardHeld && (
        // Belt AND braces here, unlike the dead-branch cases elsewhere: `tab` is
        // component STATE, so a seat narrowed WHILE the wizard is open lands
        // here with the tab already selected. That is reachable, so it is not a
        // dead branch — it is the one place on this page where the notice has to
        // answer in the body rather than in the tab row.
        <HandoffNotice
          availability={
            wizardVerbs.create.kind === 'held' ? wizardVerbs.submit : wizardVerbs.create
          }
          testId="handoff-asn-wizard"
        />
      )}

      {tab === 'create' && wizardHeld && (
        <Wizard
          steps={wizardSteps}
          currentStep={step}
          onStepChange={setStep}
          onCancel={() => {
            setStep(0);
            setForm(newAsnForm());
            setTab('shipments');
          }}
          onComplete={completeWizard}
          isStepValid={isStepValid}
          completeLabel={t('asn.submit.confirm')}
        />
      )}


      <SidePanel
        open={submitTarget !== null}
        onClose={() => setSubmitTarget(null)}
        title={
          submitTarget
            ? t('supplierShipments.submitPanel.title', {
                asnNumber: submitTarget.asnNumber,
              })
            : ''
        }
        footerActions={
          submitTarget && (
            <>
              <Button variant="secondary" onClick={() => setSubmitTarget(null)}>
                {t('supplierShipments.action.cancel')}
              </Button>
              <Button
                variant="outline"
                icon={Send}
                onClick={doSubmitAsn}
                disabled={submitAsnMutation.isPending}
              >
                {t('asn.submit.confirm')}
              </Button>
            </>
          )
        }
      >
        {submitTarget && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              {t('asn.submit.form.intro', { poNumber: submitTarget.poReference })}
            </p>
            {/* BL-51 — the 3PL from the administrator's list, or a carrier by name. */}
            <CarrierPicker
              idPrefix="asn-submit"
              label={t('asn.submit.form.carrier')}
              labelClass={labelClass}
              inputClass={inputClass}
              value={{ threePlId: submitForm.threePlId, carrier: submitForm.carrier }}
              onChange={(v) => setSubmitForm((f) => ({ ...f, ...v }))}
            />
            <label className="block">
              <span className={labelClass}>{t('fc.asn.trackingOrVehicle')}</span>
              <input
                type="text"
                value={submitForm.trackingNumber}
                onChange={(e) => setSubmitForm((f) => ({ ...f, trackingNumber: e.target.value }))}
                className={inputClass}
                placeholder={t('supplierShipments.placeholder.tracking')}
              />
            </label>
            <label className="block">
              <span className={labelClass}>{t('fc.asn.shipDate')}</span>
              <input
                type="date"
                value={submitForm.shipDate}
                onChange={(e) => setSubmitForm((f) => ({ ...f, shipDate: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>{t('asn.submit.form.eta')}</span>
              <input
                type="date"
                value={submitForm.eta}
                onChange={(e) => setSubmitForm((f) => ({ ...f, eta: e.target.value }))}
                className={inputClass}
              />
            </label>
            <div>
              <div className={labelClass}>{t('fc.asn.lines.title')}</div>
              <AsnLinesEditor
                open={submitLinesFor(submitTarget)}
                entries={submitForm.lines}
                read={readSubmitLines(submitTarget)}
                batches={declaredBatches}
                onChange={(code, patch) =>
                  setSubmitForm((f) => ({
                    ...f,
                    lines: {
                      ...f.lines,
                      [code]: { ...(f.lines[code] ?? EMPTY_LINE), ...patch },
                    },
                  }))
                }
                overShipReason={submitForm.overShipReason}
                onReasonChange={(v) => setSubmitForm((f) => ({ ...f, overShipReason: v }))}
              />
              <p className="mt-2 text-xs text-text-tertiary">{t('fc.asn.submit.required')}</p>
            </div>
          </div>
        )}
      </SidePanel>

      <SidePanel
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title={cancelTarget ? t('fc.asn.cancel.title', { asnNumber: cancelTarget }) : ''}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)}>
              {t('fc.asn.cancel.keep')}
            </Button>
            <Button variant="outline" onClick={doCancelAsn} disabled={cancelAsnMutation.isPending}>
              {t('fc.asn.cancel.confirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">{t('fc.asn.cancel.body')}</p>
      </SidePanel>
    </AppShellV2>
  );
};

export default SupplierShipments;
