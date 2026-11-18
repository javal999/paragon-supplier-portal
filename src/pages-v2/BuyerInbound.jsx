/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import SubTabs from '@components/ui-v2/SubTabs';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { useASNs, useGoodsReceipts, useSuppliers } from '@services/query/hooks';
import { useInboundAcknowledge } from '@services/query/commandHooks';
import { inboundRows, outstandingInbounds } from '@services/transitions/inboundRules';
import { sdcClock } from '@services/sdc/clock';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useRefusalText } from '@hooks/useRefusalText';
import { useToast } from '@hooks/useToast';
import { formatDate, formatDateTime, formatNumber } from '@lib/format';
/** @import { InboundRow } from '@services/transitions/inboundRules' */

// ────────────────────────────────────────────────────────────────────────────
// PTI inbound acknowledgments (AIB-2, BL-350) — the Expeditor's list.
//
// The Expeditor reviews the inbound information (the supplier's ASN, the
// Surat Jalan, the quantity and date) and acknowledges it; the record says WHO
// and WHEN. SAP owns the goods receipt and the quality status — this page
// DISPLAYS the result SAP holds and the rejected quantity, and posts nothing
// (AIB-2 BR-03).
//
// ⚠️ **THE ACKNOWLEDGE ACTION IS GATED ON `inbound:acknowledge`**, the atom of
// the `expeditor` seat (AIB-D5). A seat without it reads the whole list and the
// handoff line naming the owner, never a missing button.
//
// FILTERS (the builder's call, recorded in the BL-350 report): status tabs
// (all · awaiting acknowledgment · overdue · acknowledged) and one search over
// the ASN number, PO, supplier and Surat Jalan. Overdue is the To-Do's own set
// (`outstandingInbounds`), so the tab and the Home task cannot disagree.
// ────────────────────────────────────────────────────────────────────────────

/** @typedef {'all' | 'awaiting' | 'overdue' | 'acknowledged'} InboundTab */

/**
 * The acknowledge button's row, or the wait naming the owner.
 * @type {React.FC<{ row: InboundRow; availability: ReturnType<typeof useVerbAvailability>; pending: boolean; onAcknowledge: (asnNumber: string) => void }>}
 */
const AckCell = ({ row, availability, pending, onAcknowledge }) => {
  const { t } = useTranslation();
  const ack = row.asn.inboundAcknowledgment;
  if (ack) {
    return (
      <span className="text-xs text-text-primary">
        {t('inbound.ack.by', {
          name: t(`roles.owner.${ack.seatRoles[0] ?? 'expeditor'}`),
          at: formatDateTime(ack.acknowledgedAt)
        })}
      </span>
    );
  }
  if (availability.kind !== 'held') {
    return (
      <HandoffNotice availability={availability} testId={`handoff-inbound-${row.asn.asnNumber}`} />
    );
  }
  return (
    <Button
      variant="outline"
      onClick={() => onAcknowledge(row.asn.asnNumber)}
      disabled={pending}
      data-testid={`inbound-ack-${row.asn.asnNumber}`}
    >
      {t('inbound.action.acknowledge')}
    </Button>
  );
};

/**
 * @param {object} args
 * @param {readonly InboundRow[]} args.rows
 * @param {readonly { id: string; name: string }[]} args.suppliers
 * @param {ReturnType<typeof useVerbAvailability>} args.availability
 * @param {boolean} args.pending
 * @param {(asnNumber: string) => void} args.onAcknowledge
 */
const InboundTable = ({ rows, suppliers, availability, pending, onAcknowledge }) => {
  const { t } = useTranslation();
  /** @param {string} supplierId */
  const supplierName = (supplierId) =>
    suppliers.find((s) => s.id === supplierId)?.name ?? supplierId;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="inbound-table">
        <thead>
          <tr className="text-label text-text-tertiary uppercase text-left border-b border-border-subtle">
            <th className="py-2 pr-3">{t('inbound.col.asn')}</th>
            <th className="py-2 pr-3">{t('inbound.col.supplier')}</th>
            <th className="py-2 pr-3">{t('inbound.col.po')}</th>
            <th className="py-2 pr-3">{t('inbound.col.sj')}</th>
            <th className="py-2 pr-3">{t('inbound.col.sequence')}</th>
            <th className="py-2 pr-3">{t('inbound.col.eta')}</th>
            <th className="py-2 pr-3 text-right">{t('inbound.col.qty')}</th>
            <th className="py-2 pr-3">{t('inbound.col.gr')}</th>
            <th className="py-2 pr-3">{t('inbound.col.due')}</th>
            <th className="py-2">{t('inbound.col.ack')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const qty = row.asn.lineItems.reduce(
              (sum, l) => sum + (Number.isFinite(l.shippedQty) ? l.shippedQty : 0),
              0
            );
            return (
              <tr
                key={row.asn.asnNumber}
                className="border-b border-border-subtle align-top"
                data-testid={`inbound-row-${row.asn.asnNumber}`}
              >
                <td className="py-2 pr-3">
                  <Data>{row.asn.asnNumber}</Data>
                </td>
                <td className="py-2 pr-3 text-text-primary">{supplierName(row.asn.supplierId)}</td>
                <td className="py-2 pr-3">
                  <Data>{row.asn.poReference}</Data>
                </td>
                <td className="py-2 pr-3">
                  <Data>{row.asn.externalId ?? t('inbound.none')}</Data>
                </td>
                <td className="py-2 pr-3">
                  <Data>{row.asn.sequence ?? t('inbound.none')}</Data>
                </td>
                <td className="py-2 pr-3">
                  <Data>{row.asn.eta ? formatDate(row.asn.eta) : t('inbound.none')}</Data>
                </td>
                <td className="py-2 pr-3 text-right">
                  <Data>{formatNumber(qty)}</Data>
                </td>
                <td className="py-2 pr-3">
                  {/* AIB-2 BR-03 / AC-03 — SAP's receipt result, read only. */}
                  {row.receipt ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-text-primary">
                        <Data>{row.receipt.grNumber}</Data>
                      </span>
                      <StatusPill variant={row.receipt.rejectedQty > 0 ? 'warning' : 'success'}>
                        {row.receipt.status}
                      </StatusPill>
                      {row.receipt.rejectedQty > 0 ? (
                        <span className="text-xs text-warning-hover">
                          {t('inbound.gr.rejected', {
                            qty: formatNumber(row.receipt.rejectedQty)
                          })}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-text-tertiary">{t('inbound.gr.notPosted')}</span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  {row.acknowledged ? (
                    <StatusPill variant="success">{t('inbound.due.acknowledged')}</StatusPill>
                  ) : row.overdue ? (
                    <StatusPill variant="danger">{t('inbound.due.overdue')}</StatusPill>
                  ) : row.dueAt ? (
                    <span className="text-xs text-text-secondary">
                      {t('inbound.due.by', {
                        at: formatDate(row.dueAt.toISOString().slice(0, 10))
                      })}
                    </span>
                  ) : (
                    <span className="text-xs text-text-tertiary">{t('inbound.none')}</span>
                  )}
                </td>
                <td className="py-2">
                  <AckCell
                    row={row}
                    availability={availability}
                    pending={pending}
                    onAcknowledge={onAcknowledge}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/** @type {React.FC} */
const BuyerInbound = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const breadcrumb = [t('hub.nav.section.orders'), t('inbound.header.title')];
  const asnsQuery = useASNs();
  const receiptsQuery = useGoodsReceipts();
  const suppliersQuery = useSuppliers();
  const acknowledge = useInboundAcknowledge();
  const availability = useVerbAvailability('inbound:acknowledge');
  const [tab, setTab] = useState(/** @type {InboundTab} */ ('all'));
  const [search, setSearch] = useState('');

  const rows = useMemo(
    () => inboundRows(asnsQuery.data?.items ?? [], receiptsQuery.data?.items ?? [], sdcClock.now()),
    [asnsQuery.data, receiptsQuery.data]
  );
  const suppliers = useMemo(() => suppliersQuery.data?.items ?? [], [suppliersQuery.data]);

  const counts = useMemo(() => {
    const overdue = outstandingInbounds(rows).length;
    const acknowledged = rows.filter((r) => r.acknowledged).length;
    return {
      all: rows.length,
      awaiting: rows.length - acknowledged,
      overdue,
      acknowledged
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byTab =
      tab === 'awaiting'
        ? rows.filter((r) => !r.acknowledged)
        : tab === 'overdue'
          ? outstandingInbounds(rows)
          : tab === 'acknowledged'
            ? rows.filter((r) => r.acknowledged)
            : rows;
    const searched = !q
      ? byTab
      : byTab.filter(
          (r) =>
            r.asn.asnNumber.toLowerCase().includes(q) ||
            r.asn.poReference.toLowerCase().includes(q) ||
            r.asn.supplierId.toLowerCase().includes(q) ||
            (r.asn.externalId ?? '').toLowerCase().includes(q) ||
            (suppliers.find((s) => s.id === r.asn.supplierId)?.name ?? '').toLowerCase().includes(q)
        );
    // The deadline first, then the oldest arrival — what needs a reviewer most.
    return [...searched].sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      return (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity);
    });
  }, [rows, tab, search, suppliers]);

  /** @param {string} asnNumber */
  const onAcknowledge = (asnNumber) => {
    acknowledge.mutate(
      { asnNumber },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('inbound.ack.failed', { asnNumber }),
              description: refusalText(res.reason) ?? res.reason ?? ''
            });
            return;
          }
          toast({ variant: 'success', title: t('inbound.ack.success', { asnNumber }) });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('asn.denied.title'),
            description: t('asn.denied.desc')
          })
      }
    );
  };

  if (asnsQuery.isPending || receiptsQuery.isPending || suppliersQuery.isPending)
    return <LoadingState breadcrumb={breadcrumb} />;
  if (asnsQuery.isError || receiptsQuery.isError || suppliersQuery.isError)
    return (
      <ErrorState
        breadcrumb={breadcrumb}
        error={asnsQuery.error ?? receiptsQuery.error ?? suppliersQuery.error}
        onRetry={() => {
          asnsQuery.refetch();
          receiptsQuery.refetch();
          suppliersQuery.refetch();
        }}
      />
    );
  if (rows.length === 0)
    return (
      <EmptyState
        breadcrumb={breadcrumb}
        title={t('inbound.empty.title')}
        subtitle={t('inbound.empty.subtitle')}
        message={t('inbound.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={breadcrumb}
        title={t('inbound.header.title')}
        subtitle={t('inbound.header.subtitle')}
      />
      <PageMetaLine className="mb-6">
        {t('inbound.meta.summary', { inbounds: counts.all, overdue: counts.overdue })}
        {/* The ASNs are supplied by the demo suppliers and the receipts are
            SAP-boundary fixtures: the list is real over sample data, and the
            marker says so. The acknowledgment itself is a real governed act. */}
        <ProvenanceMarker capability="advanceShipNotices" className="ml-3 align-middle" />
      </PageMetaLine>

      <SubTabs
        options={[
          { id: 'all', label: t('inbound.tab.all'), count: counts.all },
          { id: 'awaiting', label: t('inbound.tab.awaiting'), count: counts.awaiting },
          { id: 'overdue', label: t('inbound.tab.overdue'), count: counts.overdue },
          { id: 'acknowledged', label: t('inbound.tab.acknowledged'), count: counts.acknowledged }
        ]}
        value={tab}
        onChange={setTab}
        className="mb-4"
      />

      <div className="mb-4 max-w-sm">
        <label htmlFor="inbound-search" className="sr-only">
          {t('inbound.search.label')}
        </label>
        <input
          id="inbound-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('inbound.search.placeholder')}
          className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-text-secondary" data-testid="inbound-no-match">
          {t('inbound.list.empty')}
        </p>
      ) : (
        <InboundTable
          rows={filtered}
          suppliers={suppliers}
          availability={availability}
          pending={acknowledge.isPending}
          onAcknowledge={onAcknowledge}
        />
      )}
    </AppShellV2>
  );
};

export default BuyerInbound;
