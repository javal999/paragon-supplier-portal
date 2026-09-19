import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import {
  OrderNotFound,
  PoFilterBanner,
  drilledPoNumber,
  usePoDrillFilter,
} from './orders/PoDrillFilter';
import { receiptsForPo } from './orders/orderSummaryModel';
import SapDataAgeBanner from '../components/ui-v2/SapDataAgeBanner';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import Data from '../components/ui-v2/Data';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { useToast } from '../hooks/useToast';
import { useRefusalText } from '../hooks/useRefusalText';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { formatDate, formatDateTime } from '../lib/format';
import { statusTone } from '../lib/statusTone';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { useASNs, useGoodsReceipts } from '../services/query/hooks';
import { useReceiptDiscrepancyAnswer } from '../services/query/commandHooks';
import type { ASN, GoodsReceipt } from '../services/data/types';
import {
  RECEIPT_INSPECTED_STATES,
  awaitsSupplierAnswer,
  compareReceipt,
  deriveHeaderDisposition,
  type ReceiptLineComparison,
} from '../services/transitions';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER GOODS RECEIPTS — REQ-E07-06 (goods receipt confirmation).
//
// The supplier's own receipts, one row per receipt against its ASN: shipped vs
// received vs rejected, the receipt date, and PTI's quality result (the result
// and rejected quantity only, never the internal checklist, BR-06). Whether a
// receipt has a discrepancy is derived at read time (BR-03 / BR-05). The
// supplier acknowledges or disputes it with a comment (AC-03).
// ─────────────────────────────────────────────────────────────────────────────

const sum = (rows: readonly ReceiptLineComparison[], k: 'shipped' | 'received' | 'rejected') =>
  rows.reduce((a, r) => a + r[k], 0);

const qty = (n: number) => n.toLocaleString('en-US');

/** The quality result a supplier may see: the rolled-up disposition, or pending. */
const qcResult = (gr: GoodsReceipt): string | null =>
  RECEIPT_INSPECTED_STATES.includes(gr.status)
    ? (() => {
        const d = deriveHeaderDisposition(gr.inspectionResults);
        return d === 'Pending' ? null : d;
      })()
    : null;

const SupplierGoodsReceipts: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const { identity } = useCurrentIdentity();
  const grQuery = useGoodsReceipts();
  const asnQuery = useASNs();
  const answer = useReceiptDiscrepancyAnswer();
  const respondAvailability = useVerbAvailability('receiptdiscrepancy:respond');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const crumb = [t('hub.nav.section.supplierOrders'), t('fc.gr.title')];
  // REQ-E07-03 — the drill-through filter, with the summary's own predicate.
  const drill = usePoDrillFilter();
  const drilledPo = drilledPoNumber(drill);

  const rows = useMemo(() => {
    const asns: readonly ASN[] = asnQuery.data?.items ?? [];
    const scoped =
      drilledPo === null
        ? (grQuery.data?.items ?? [])
        : receiptsForPo(grQuery.data?.items ?? [], drilledPo);
    return [...scoped]
      .sort((a, b) => b.receivedDate.localeCompare(a.receivedDate))
      .map((gr) => {
        const asn = asns.find((a) => a.asnNumber === gr.asnNumber) ?? null;
        const lines = compareReceipt(gr, asn);
        return {
          gr,
          // REQ-E07-06 — goods received with no ASN on record, said plainly.
          withoutAsn: asn === null,
          lines,
          flagged: lines.some((l) => l.flagged),
          awaiting: awaitsSupplierAnswer(gr, asn),
          qc: qcResult(gr),
        };
      });
  }, [grQuery.data, asnQuery.data, drilledPo]);

  // AC-03 — exactly one record behind the cell arrives OPEN, not as a list of one.
  const onlyGrId = drilledPo !== null && rows.length === 1 ? rows[0].gr.id : null;
  useEffect(() => {
    if (onlyGrId !== null) setSelectedId(onlyGrId);
  }, [onlyGrId]);

  if (!identity.supplierId) return <NoSupplierIdentity />;
  if (grQuery.isPending || asnQuery.isPending || drill.kind === 'pending')
    return <LoadingState breadcrumb={crumb} />;
  // AC-07 / AC-08 — identical refusal for an unknown PO and another supplier's.
  if (drill.kind === 'notFound') return <OrderNotFound persona="supplier" breadcrumb={crumb} />;
  if (grQuery.isError || asnQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={grQuery.error ?? asnQuery.error}
        onRetry={() => {
          grQuery.refetch();
          asnQuery.refetch();
        }}
      />
    );
  if (rows.length === 0)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('fc.gr.empty.title')}
        subtitle={t('fc.gr.empty.subtitle')}
        message={t('fc.gr.empty.message')}
      />
    );

  const awaiting = rows.filter((r) => r.awaiting).length;
  const selected = rows.find((r) => r.gr.id === selectedId) ?? null;

  const open = (id: string) => {
    setSelectedId(id);
    setComment('');
  };

  const send = (kind: 'acknowledge' | 'dispute') => {
    if (!selected) return;
    const grNumber = selected.gr.grNumber;
    answer.mutate(
      { receiptId: selected.gr.id, answer: kind, comment: comment.trim() },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('fc.gr.respond.failed', { grNumber }),
              description: refusalText(res.reason) ?? res.reason ?? '',
            });
            return;
          }
          toast({ variant: 'success', title: t(`fc.gr.respond.success.${kind}`, { grNumber }) });
          setComment('');
        },
        onError: () => toast({ variant: 'error', title: t('fc.gr.respond.failed', { grNumber }) }),
      },
    );
  };

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('fc.gr.title')} subtitle={t('fc.gr.subtitle')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('fc.gr.asOf')} <Data>{formatDate(DECLARED_PRESENT)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {/* REQ-E07-08 AC-03 — this page reads SAP data; say how old it is. */}
      <SapDataAgeBanner page="goodsReceipts" className="mb-4" />

      {/* REQ-E07-03 BR-04 / AC-02 — the filter, and the way back. */}
      <PoFilterBanner drill={drill} persona="supplier" count={rows.length} />

      {awaiting > 0 && (
        <div
          role="status"
          data-testid="supplier-gr-discrepancy-banner"
          className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 text-sm text-warning-hover flex items-center gap-2"
        >
          <AlertTriangle size={14} aria-hidden="true" />
          {awaiting === 1 ? t('fc.gr.banner.one') : t('fc.gr.banner.other', { count: awaiting })}
        </div>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('fc.gr.col.receipt')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.gr.col.asn')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.gr.col.po')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.gr.col.receivedOn')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('fc.gr.col.shipped')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('fc.gr.col.received')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('fc.gr.col.rejected')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.gr.col.qc')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.gr.col.discrepancy')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('fc.gr.col.action')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {rows.map(({ gr, lines, flagged, awaiting: needsAnswer, qc, withoutAsn }) => (
              <TableRow key={gr.id} data-testid={`supplier-gr-row-${gr.id}`}>
                <TableCell>
                  <Data className="text-xs font-bold text-text-primary whitespace-nowrap">{gr.grNumber}</Data>
                </TableCell>
                <TableCell>
                  <Data className="text-xs text-text-secondary whitespace-nowrap">{gr.asnNumber}</Data>
                  {withoutAsn && (
                    <span className="block text-xs text-warning-hover" data-testid={`gr-without-asn-${gr.id}`}>
                      {t('oc.drill.receipt.withoutAsn')}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Data className="text-xs text-text-secondary whitespace-nowrap">{gr.poNumber}</Data>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Data className="text-xs text-text-secondary">{formatDate(gr.receivedDate)}</Data>
                </TableCell>
                <TableCell className="text-right">
                  <Data>{qty(sum(lines, 'shipped'))}</Data>
                </TableCell>
                <TableCell className="text-right">
                  <Data>{qty(sum(lines, 'received'))}</Data>
                </TableCell>
                <TableCell className="text-right">
                  <Data className={sum(lines, 'rejected') > 0 ? 'text-danger font-semibold' : ''}>
                    {qty(sum(lines, 'rejected'))}
                  </Data>
                </TableCell>
                <TableCell>
                  {qc ? (
                    <StatusPill variant={statusTone(qc)}>{qc}</StatusPill>
                  ) : (
                    <span className="text-xs text-text-tertiary">{t('fc.gr.qc.pending')}</span>
                  )}
                </TableCell>
                <TableCell>
                  {gr.discrepancyResponse ? (
                    <StatusPill variant={statusTone(gr.discrepancyResponse.status)}>
                      {gr.discrepancyResponse.status}
                    </StatusPill>
                  ) : flagged ? (
                    <StatusPill variant="warning">{t('fc.gr.disc.flagged')}</StatusPill>
                  ) : (
                    <span className="text-xs text-text-tertiary">{t('fc.gr.disc.none')}</span>
                  )}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {needsAnswer && respondAvailability.kind !== 'held' ? (
                    <HandoffNotice availability={respondAvailability} testId="handoff-gr-respond" />
                  ) : (
                    <Button
                      variant={needsAnswer ? 'outline' : 'secondary'}
                      onClick={() => open(gr.id)}
                      aria-label={`${t(needsAnswer ? 'fc.gr.action.respond' : 'fc.gr.action.view')} ${gr.grNumber}`}
                    >
                      {t(needsAnswer ? 'fc.gr.action.respond' : 'fc.gr.action.view')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>

      <SidePanel
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected ? t('fc.gr.panel.title', { grNumber: selected.gr.grNumber }) : ''}
        footerActions={
          selected?.awaiting && respondAvailability.kind === 'held' ? (
            <>
              <Button
                variant="secondary"
                disabled={answer.isPending || comment.trim() === ''}
                onClick={() => send('dispute')}
              >
                {t('fc.gr.respond.dispute')}
              </Button>
              <Button
                variant="outline"
                disabled={answer.isPending || comment.trim() === ''}
                onClick={() => send('acknowledge')}
              >
                {t('fc.gr.respond.acknowledge')}
              </Button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-2">{t('fc.gr.panel.lines')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-text-tertiary uppercase">
                      <th className="text-left py-1">{t('fc.asn.col.material')}</th>
                      <th className="text-right py-1">{t('fc.gr.col.shipped')}</th>
                      <th className="text-right py-1">{t('fc.gr.col.received')}</th>
                      <th className="text-right py-1">{t('fc.gr.col.difference')}</th>
                      <th className="text-right py-1">{t('fc.gr.col.rejected')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((l) => (
                      <tr key={l.materialCode} className="border-t border-border-subtle">
                        <td className="py-1.5">
                          <Data as="div" className="text-[11px] text-text-tertiary">
                            {l.materialCode}
                          </Data>
                          <div className="text-text-primary">{l.description}</div>
                        </td>
                        <td className="py-1.5 text-right">
                          <Data>{qty(l.shipped)}</Data>
                        </td>
                        <td className="py-1.5 text-right">
                          <Data>{qty(l.received)}</Data>
                        </td>
                        <td
                          className={`py-1.5 text-right ${l.difference !== 0 ? 'text-warning-hover font-semibold' : ''}`}
                        >
                          <Data>{l.difference > 0 ? `+${qty(l.difference)}` : qty(l.difference)}</Data>
                        </td>
                        <td className={`py-1.5 text-right ${l.rejected > 0 ? 'text-danger font-semibold' : ''}`}>
                          <Data>{qty(l.rejected)}</Data>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-text-tertiary">{t('fc.gr.panel.shippedBasis')}</p>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-2">{t('fc.gr.panel.qc')}</h3>
              <div className="flex items-center gap-3 text-sm">
                {selected.qc ? (
                  <StatusPill variant={statusTone(selected.qc)}>{selected.qc}</StatusPill>
                ) : (
                  <span className="text-text-tertiary">{t('fc.gr.qc.pending')}</span>
                )}
                <span className="text-text-secondary">
                  {t('fc.gr.col.rejected')}: <Data>{qty(sum(selected.lines, 'rejected'))}</Data>
                </span>
              </div>
              <p className="mt-1 text-xs text-text-tertiary">{t('fc.gr.panel.qcNote')}</p>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-2">{t('fc.gr.respond.title')}</h3>
              {selected.gr.discrepancyResponse ? (
                <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
                  <dt className="text-text-tertiary">{t('fc.gr.response.status')}</dt>
                  <dd>
                    <StatusPill variant={statusTone(selected.gr.discrepancyResponse.status)}>
                      {selected.gr.discrepancyResponse.status}
                    </StatusPill>
                  </dd>
                  <dt className="text-text-tertiary">{t('fc.gr.response.yourComment')}</dt>
                  <dd className="text-text-primary">{selected.gr.discrepancyResponse.comment}</dd>
                  <dt className="text-text-tertiary">{t('fc.gr.response.answeredOn')}</dt>
                  <dd>
                    <Data>{formatDateTime(selected.gr.discrepancyResponse.respondedAt)}</Data>
                  </dd>
                  {selected.gr.discrepancyResponse.status === 'Disputed' && (
                    <dd className="col-span-2 text-xs text-text-secondary">{t('fc.gr.response.awaitingPti')}</dd>
                  )}
                  {selected.gr.discrepancyResponse.resolutionComment && (
                    <>
                      <dt className="text-text-tertiary">{t('fc.gr.response.ptiComment')}</dt>
                      <dd className="text-text-primary">{selected.gr.discrepancyResponse.resolutionComment}</dd>
                    </>
                  )}
                </dl>
              ) : selected.flagged ? (
                respondAvailability.kind === 'held' ? (
                  <div className="space-y-2">
                    <p className="text-sm text-text-secondary">{t('fc.gr.respond.intro')}</p>
                    <label htmlFor="gr-answer-comment" className="block text-label text-text-tertiary uppercase">
                      {t('fc.gr.respond.comment')}
                    </label>
                    <textarea
                      id="gr-answer-comment"
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
                    />
                  </div>
                ) : (
                  <HandoffNotice availability={respondAvailability} testId="handoff-gr-respond-panel" />
                )
              ) : (
                <p className="text-sm text-text-secondary">{t('fc.gr.noDiscrepancy')}</p>
              )}
            </section>
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default SupplierGoodsReceipts;
