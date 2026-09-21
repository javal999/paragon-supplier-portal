import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import NotFound from './NotFound';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/format';
import { BASE_CURRENCY } from '../lib/currencyPolicy';
import { scoreQuotations } from '../lib/quoteScore';
import {
  useAwards,
  useNegotiationRounds,
  useQuotations,
  useRFQs,
  useRfqComplianceGate,
  useSuppliers,
} from '../services/query/hooks';
import { useRfxCommand } from '../services/query/commandHooks';
import { awardSplitRefusal, effectiveDeadline, reliabilityScoreFor } from '../services/transitions/rfxRules';
import type { AwardLine } from '../services/sourcing/types';
import { DeadlinePill, EmptyRow, GateMarker, OtifOrNoHistory, money, qty, rfxNow } from './rfx/rfxDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// ONE SOURCING EVENT — REQ-E03-03 and REQ-E03-05 (BUY).
//
// The comparison, the negotiation rounds and the award, on the document they all
// belong to. Three things here are the requirement and not a layout choice:
//
//   · THE COMPARISON RANKS THE CURRENT VERSION OF EACH BID. A superseded quote
//     is kept and shown under "Quote versions" (AC-03) but never ranked beside
//     its own successor, which would show one supplier twice and let a stale
//     price win.
//   · NOTHING IS AWARDED AUTOMATICALLY (BR-02). The best-scored column is marked
//     and the page says the score supports the decision; the award form starts
//     empty.
//   · THE SPLIT MUST TOTAL 100% PER ITEM AND A DEPARTURE FROM THE BEST SCORE
//     NEEDS A REASON. Both are checked here for the message and enforced at the
//     verb for the act — the page cannot be the only thing standing in the way.
//
// ⚠️ **AND THE RESPONSE WINDOW MOVES HERE (BR-05), FOR EVERYONE OR FOR NAMED
// INVITEES — THE SAME TWO ACTS THE RFI SIDE OFFERS AND THE SAME DISTINCTION IN
// THE STORE.** Extending for everyone moves the event's deadline; extending for
// ticked suppliers records a PER-INVITEE one and leaves the event's alone, so
// "extended for everyone" and "extended for these two" stay distinguishable
// after the fact — and the quote gate reads the deadline IN FORCE FOR THIS
// SUPPLIER, which is what makes the per-invitee grant mean anything.
//
// It is offered while the event is Open or Closed, because that is where
// `t_rfq_extend` legally runs — reopening a window somebody asked for is not a
// step in the machine. After an award there is nothing to extend, and the page
// says so rather than offering a control the dispatcher would refuse.
// ─────────────────────────────────────────────────────────────────────────────

const BuyerSourcingEvent: React.FC = () => {
  const { t } = useTranslation();
  const { rfqId = '' } = useParams();
  const { toast } = useToast();
  const rfqs = useRFQs();
  const quotes = useQuotations({ rfqId });
  const rounds = useNegotiationRounds();
  const awards = useAwards();
  const suppliers = useSuppliers();
  // CR-23 — who passes the compliance gate on THIS event. Read from the same
  // model the award verb refuses on, so the page and the verb cannot disagree.
  const gates = useRfqComplianceGate(rfqId);
  const negotiate = useVerbAvailability('rfq:negotiate');
  const awardVerb = useVerbAvailability('rfq:award');
  // REQ-E03-03 BR-05 — moving the response window is the PUBLISH authority, the
  // same atom that sent the invitation out; it is not the award authority.
  const publish = useVerbAvailability('rfq:publish');
  const command = useRfxCommand();

  const [shortlist, setShortlist] = useState<string[]>([]);
  const [roundDeadline, setRoundDeadline] = useState('');
  const [roundMessage, setRoundMessage] = useState('');
  const [roundTarget, setRoundTarget] = useState('');
  const [bestAndFinal, setBestAndFinal] = useState(false);
  const [shares, setShares] = useState<Record<string, string>>({});
  const [awardReason, setAwardReason] = useState('');
  const [extendTo, setExtendTo] = useState('');
  const [extendOnly, setExtendOnly] = useState<string[]>([]);

  const crumb = [t('hub.nav.section.sourcing'), t('rfx.event.title')];
  const rfq = useMemo(() => (rfqs.data?.items ?? []).find((r) => r.id === rfqId) ?? null, [rfqs.data, rfqId]);

  const supplierName = (id: string) => suppliers.data?.items.find((s) => s.id === id)?.name ?? id;
  const supplierOtif = (id: string) => suppliers.data?.items.find((s) => s.id === id)?.otif ?? null;

  const allQuotes = useMemo(() => quotes.data?.items ?? [], [quotes.data]);
  /** The CURRENT version of each bid — a superseded one is history, not a rival. */
  const current = useMemo(() => {
    const superseded = new Set(allQuotes.map((q) => q.supersedesQuotationId).filter(Boolean) as string[]);
    return allQuotes.filter((q) => !superseded.has(q.id));
  }, [allQuotes]);

  const gateOf = (supplierId: string) => gates.data?.items.find((g) => g.supplierId === supplierId);
  /** REQ-E03-05 BR-01a — only a supplier that PASSES the gate is scored or awardable.
   *  No gate read yet = not qualified: a pass is never assumed. */
  const qualifies = (supplierId: string) => gateOf(supplierId)?.passes === true;
  const qualified = useMemo(
    () => current.filter((q) => gates.data?.items.some((g) => g.supplierId === q.supplierId && g.passes)),
    [current, gates.data],
  );

  const scoring = useMemo(
    () =>
      scoreQuotations(
        qualified.map((q) => ({
          id: q.id,
          unitPrice: q.unitPrice,
          currency: q.currency ?? BASE_CURRENCY,
          leadTimeDays: q.leadTimeDays,
          // CR-15 — reliability IS the supplier's OTIF; no history scores 50.
          reliabilityScore: reliabilityScoreFor(supplierOtif(q.supplierId)),
        })),
        { pins: rfq?.fxPins, now: new Date(rfxNow()) },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qualified, rfq?.fxPins, suppliers.data],
  );
  const scoreById = useMemo(
    () => new Map(scoring.kind === 'scored' ? scoring.scores.map((s) => [s.quoteId, s] as const) : []),
    [scoring],
  );
  const bestId = scoring.kind === 'scored' ? (scoring.scores.find((s) => s.topRanked)?.quoteId ?? null) : null;

  if (rfqs.isPending || quotes.isPending || gates.isPending) return <LoadingState breadcrumb={crumb} />;
  if (rfqs.isError) return <ErrorState breadcrumb={crumb} error={rfqs.error} onRetry={() => rfqs.refetch()} />;
  if (!rfq) return <NotFound />;

  const eventRounds = (rounds.data?.items ?? []).filter((r) => r.rfqId === rfq.id);
  const award = (awards.data?.items ?? []).find((a) => a.rfqId === rfq.id) ?? null;
  const currency = rfq.currency;

  /** The award lines the form currently describes. */
  const awardLines: AwardLine[] = qualified
    .map((q) => {
      const pct = Number(shares[q.id]);
      if (!Number.isFinite(pct) || pct <= 0) return null;
      const item = rfq.lineItems?.[0]?.materialCode ?? '';
      const total = rfq.lineItems?.[0]?.quantity ?? rfq.totalQty;
      return {
        supplierId: q.supplierId,
        quotationId: q.id,
        itemCode: item,
        sharePct: pct,
        quantity: Math.round((total * pct) / 100),
      };
    })
    .filter((l): l is AwardLine => l !== null);

  const splitRefusal = awardLines.length > 0 ? awardSplitRefusal(awardLines) : null;
  /** BL-64 — quotes exist and not one comes from a supplier passing CR-23: nothing can be awarded. */
  const noneAwardable = current.length > 0 && qualified.length === 0;
  const departs = bestId !== null && awardLines.length > 0 && !awardLines.some((l) => l.quotationId === bestId);

  const run = (vars: Parameters<typeof command.mutate>[0], successKey: string) =>
    command.mutate(vars, {
      onSuccess: (res) =>
        toast(
          res.status === 'failed'
            ? { variant: 'error', title: t('rfx.toast.refused', { reason: res.reason ?? '' }) }
            : { variant: 'success', title: t(successKey) },
        ),
      onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) }),
    });

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={rfq.title} subtitle={rfq.rfqNumber} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('rfx.asOf')} <Data>{formatDate(rfxNow())}</Data>
        <span className="ml-3">
          {t('rfx.deadline')} <Data>{formatDate(rfq.responseDeadline)}</Data>
        </span>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/buyer/sourcing" className="text-sm text-action hover:underline" data-testid="event-back">
          {t('rfx.event.back')}
        </Link>
        <StatusPill variant={rfq.status === 'Awarded' ? 'success' : 'info'}>{rfq.status}</StatusPill>
        {rfq.sourceRfiId && (
          <span className="text-xs text-text-tertiary" data-testid="event-from-rfi">
            {t('rfx.event.fromRfi', { event: rfq.sourceRfiId })}
          </span>
        )}
      </div>

      {/* — REQ-E03-03 BR-05: the response window, for everyone or for named invitees — */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border-subtle">
          <span className="text-sm font-semibold text-text-primary">{t('rfx.event.window')}</span>
          {publish.kind !== 'held' && (
            <HandoffNotice availability={publish} testId="handoff-rfq-extend" />
          )}
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfx.invite.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.invite.col.otif')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.deadline.own')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.rfi.extendSelected')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {rfq.invitedSupplierIds.map((supplierId) => {
              const own = effectiveDeadline(rfq.responseDeadline, rfq.inviteeDeadlines ?? [], supplierId);
              return (
                <TableRow key={supplierId} data-testid={`event-invitee-${supplierId}`}>
                  <TableCell>
                    {supplierName(supplierId)}
                    {/* BR-06 — still invited and still able to quote; it cannot be awarded. */}
                    <div className="mt-1">
                      <GateMarker gate={gateOf(supplierId)} testId={`event-gate-${supplierId}`} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <OtifOrNoHistory otif={supplierOtif(supplierId)} testId={`event-otif-${supplierId}`} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <DeadlinePill
                      deadline={own}
                      done={rfq.respondedSupplierIds.includes(supplierId)}
                      testId={`event-deadline-${supplierId}`}
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="accent-teal"
                      aria-label={supplierName(supplierId)}
                      checked={extendOnly.includes(supplierId)}
                      onChange={() =>
                        setExtendOnly((prev) =>
                          prev.includes(supplierId)
                            ? prev.filter((s) => s !== supplierId)
                            : [...prev, supplierId],
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {rfq.invitedSupplierIds.length === 0 && (
              <EmptyRow colSpan={4} testId="event-no-invitees">
                {t('rfx.invite.empty')}
              </EmptyRow>
            )}
          </tbody>
        </Table>
        {rfq.status === 'Open' || rfq.status === 'Closed' ? (
          <div className="flex flex-wrap items-end gap-3 px-4 py-3 border-t border-border-subtle">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="event-extend">
                {t('rfx.rfi.extend')}
              </label>
              <input
                id="event-extend"
                type="date"
                value={extendTo}
                onChange={(e) => setExtendTo(e.target.value)}
                className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
            </div>
            <Button
              variant="outline"
              disabled={publish.kind !== 'held' || !extendTo}
              data-testid="event-extend-btn"
              onClick={() =>
                run(
                  {
                    verb: 'extendRfq',
                    rfqId: rfq.id,
                    deadline: extendTo,
                    ...(extendOnly.length > 0 ? { supplierIds: extendOnly } : {}),
                  },
                  'rfx.toast.extended',
                )
              }
            >
              {extendOnly.length > 0 ? t('rfx.rfi.extendSelected') : t('rfx.rfi.extendAll')}
            </Button>
            <p className="text-xs text-text-tertiary flex-1 min-w-[16rem]">{t('rfx.event.windowRule')}</p>
          </div>
        ) : (
          <p
            className="px-4 py-3 text-xs text-text-tertiary border-t border-border-subtle"
            data-testid="event-extend-unavailable"
          >
            {t('rfx.event.extendClosed')}
          </p>
        )}
        {(rfq.extensions?.length ?? 0) > 0 && (
          <p className="px-4 pb-3 text-xs text-text-tertiary" data-testid="event-extended">
            {t('rfx.extended')}
          </p>
        )}
      </div>

      {/* — REQ-E03-03: the items being sourced, each answerable with its own price — */}
      {rfq.lineItems && rfq.lineItems.length > 0 && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
          <div className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
            {t('rfx.event.items')}
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('rfx.event.col.item')}</TableHeaderCell>
              <TableHeaderCell>{t('rfx.event.col.qty')}</TableHeaderCell>
              <TableHeaderCell>{t('rfx.event.col.spec')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {rfq.lineItems.map((li) => (
                <TableRow key={li.materialCode} data-testid={`event-item-${li.materialCode}`}>
                  <TableCell>
                    <Data>{li.materialCode}</Data>
                    <div className="text-sm text-text-primary">{li.description}</div>
                  </TableCell>
                  <TableCell>
                    <Data>
                      {qty(li.quantity)} {li.uom}
                    </Data>
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">{li.specification ?? '—'}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* — REQ-E03-05 AC-01: the comparison — */}
      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">{t('rfx.cmp.title')}</h2>
          <p className="text-xs text-text-tertiary mt-1">{t('rfx.cmp.basis')}</p>
          <p className="text-xs text-text-tertiary">{t('rfx.cmp.notAutomatic')}</p>
        </div>
        {scoring.kind === 'refused' ? (
          <p className="px-4 py-8 text-center text-sm text-warning-hover" data-testid="cmp-refused">
            {t('rfx.cmp.refused')}
          </p>
        ) : current.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-tertiary" data-testid="cmp-empty">
            {t('rfx.cmp.empty')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('rfx.cmp.col.criterion')}</TableHeaderCell>
              {current.map((q) => (
                <TableHeaderCell key={q.id}>
                  {supplierName(q.supplierId)}
                  {q.id === bestId && (
                    <StatusPill variant="success" className="ml-2">
                      {t('rfx.cmp.best')}
                    </StatusPill>
                  )}
                  {(q.roundNumber ?? 0) > 0 && (
                    <div className="text-xs font-normal normal-case text-text-tertiary">
                      {t('rfx.cmp.round', { round: q.roundNumber })}
                    </div>
                  )}
                </TableHeaderCell>
              ))}
            </TableHeader>
            <tbody>
              {(
                [
                  ['rfx.cmp.row.unitPrice', (id: string) => money(byId(current, id).unitPrice, byId(current, id).currency ?? currency)],
                  ['rfx.cmp.row.totalPrice', (id: string) => money(byId(current, id).totalPrice, byId(current, id).currency ?? currency)],
                  ['rfx.cmp.row.leadTime', (id: string) => `${byId(current, id).leadTimeDays} ${t('rfx.unit.days')}`],
                  ['rfx.cmp.row.moq', (id: string) => (byId(current, id).moq === undefined ? '—' : qty(byId(current, id).moq!))],
                  ['rfx.cmp.row.payment', (id: string) => byId(current, id).paymentTermsOffered],
                  ['rfx.cmp.row.priceScore', (id: string) => String(scoreById.get(id)?.priceScore ?? '—')],
                  ['rfx.cmp.row.leadTimeScore', (id: string) => String(scoreById.get(id)?.leadTimeScore ?? '—')],
                ] as const
              ).map(([labelKey, render]) => (
                <TableRow key={labelKey} data-testid={`cmp-row-${labelKey}`}>
                  <TableCell className="text-sm text-text-secondary">{t(labelKey)}</TableCell>
                  {current.map((q) => (
                    <TableCell key={q.id}>
                      <Data>{render(q.id)}</Data>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {/* CR-23 — compliance is a GATE, not a weighted axis: this row
                  says who is scored and names why a supplier is not. */}
              <TableRow data-testid="cmp-row-gate">
                <TableCell className="text-sm text-text-secondary">{t('rfx.cmp.row.gate')}</TableCell>
                {current.map((q) => (
                  <TableCell key={q.id}>
                    <GateMarker gate={gateOf(q.supplierId)} showPass testId={`cmp-gate-${q.supplierId}`} />
                  </TableCell>
                ))}
              </TableRow>
              {/* The reliability axis names its source, because "50" with no
                  explanation reads as a measurement rather than a default. */}
              <TableRow data-testid="cmp-row-reliability">
                <TableCell className="text-sm text-text-secondary">
                  {t('rfx.cmp.row.reliabilityScore')}
                </TableCell>
                {current.map((q) => (
                  <TableCell key={q.id}>
                    <Data>{scoreById.get(q.id)?.reliabilityScore ?? '—'}</Data>
                    <div className="text-xs text-text-tertiary">
                      <OtifOrNoHistory otif={supplierOtif(q.supplierId)} testId={`cmp-otif-${q.supplierId}`} />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow data-testid="cmp-row-weighted">
                <TableCell className="text-sm font-semibold text-text-primary">
                  {t('rfx.cmp.row.weighted')}
                </TableCell>
                {current.map((q) => (
                  <TableCell key={q.id} className={q.id === bestId ? 'bg-success-soft' : ''}>
                    {qualifies(q.supplierId) ? (
                      <Data className="font-semibold">{scoreById.get(q.id)?.composite ?? '—'}</Data>
                    ) : (
                      // BR-01a — the quote stays visible; it is not scored.
                      <span className="text-xs text-text-tertiary" data-testid={`cmp-not-scored-${q.supplierId}`}>
                        {t('rfx.gate.notScored')}
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </tbody>
          </Table>
        )}
        {current.length > 0 && qualified.length === 0 && scoring.kind === 'scored' && (
          <p className="px-4 py-2 text-xs text-warning-hover" data-testid="cmp-none-qualified">
            {t('rfx.gate.noneQualified')}
          </p>
        )}
        {current.length === 1 && (
          <p className="px-4 py-2 text-xs text-text-tertiary" data-testid="cmp-single">
            {t('rfx.cmp.single')}
          </p>
        )}
      </section>

      {/* — REQ-E03-05 AC-03: every quote version, kept and viewable — */}
      {allQuotes.length > current.length && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
          <div className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
            {t('rfx.cmp.versions')}
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('rfx.supplier')}</TableHeaderCell>
              <TableHeaderCell>{t('rfx.cmp.round')}</TableHeaderCell>
              <TableHeaderCell>{t('rfx.cmp.row.unitPrice')}</TableHeaderCell>
              <TableHeaderCell>{t('rfx.cmp.row.leadTime')}</TableHeaderCell>
              <TableHeaderCell>{t('rfx.deadline')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {[...allQuotes]
                .sort((a, b) => a.supplierId.localeCompare(b.supplierId) || (a.roundNumber ?? 0) - (b.roundNumber ?? 0))
                .map((q) => (
                  <TableRow key={q.id} data-testid={`quote-version-${q.id}`}>
                    <TableCell>{supplierName(q.supplierId)}</TableCell>
                    <TableCell>
                      {(q.roundNumber ?? 0) === 0
                        ? t('rfx.cmp.originalQuote')
                        : t('rfx.cmp.round', { round: q.roundNumber })}
                    </TableCell>
                    <TableCell>
                      <Data>{money(q.unitPrice, q.currency ?? currency)}</Data>
                    </TableCell>
                    <TableCell>
                      <Data>
                        {q.leadTimeDays} {t('rfx.unit.days')}
                      </Data>
                    </TableCell>
                    <TableCell>
                      <Data>{formatDate(q.submittedAt)}</Data>
                    </TableCell>
                  </TableRow>
                ))}
            </tbody>
          </Table>
        </section>
      )}

      {/* — REQ-E03-05 BR-03 / BR-04: negotiation rounds — */}
      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
          {t('rfx.neg.title')}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('rfx.cmp.round')}</TableHeaderCell>
              <TableHeaderCell>{t('rfx.neg.deadline')}</TableHeaderCell>
              <TableHeaderCell>{t('rfx.neg.shortlist')}</TableHeaderCell>
              <TableHeaderCell>{t('rfx.neg.message')}</TableHeaderCell>
              <TableHeaderCell>{''}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {eventRounds.map((round) => (
                <TableRow key={round.id} data-testid={`round-${round.id}`}>
                  <TableCell>
                    <Data>{t('rfx.cmp.round', { round: round.roundNumber })}</Data>
                    {round.bestAndFinal && (
                      <StatusPill variant="warning" className="ml-2">
                        {t('rfx.neg.bestAndFinal')}
                      </StatusPill>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <DeadlinePill deadline={round.deadline} done={round.closed} />
                  </TableCell>
                  <TableCell className="text-sm">
                    <ul>
                      {round.participants.map((p) => (
                        <li key={p.supplierId} data-testid={`round-participant-${round.id}-${p.supplierId}`}>
                          {p.supplierName}{' '}
                          <StatusPill variant={p.revisedQuotationId ? 'success' : 'neutral'}>
                            {t(p.revisedQuotationId ? 'rfx.neg.revised' : 'rfx.neg.notRevised')}
                          </StatusPill>
                        </li>
                      ))}
                    </ul>
                    <div className="text-xs text-text-tertiary mt-1">
                      {t('rfx.neg.awaiting', { count: round.awaiting })}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {round.message ?? '—'}
                    {round.targetUnitPrice !== undefined && (
                      <div className="text-xs text-text-tertiary">
                        {t('rfx.neg.target')}: <Data>{money(round.targetUnitPrice, currency)}</Data>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!round.closed && negotiate.kind === 'held' && (
                      <Button
                        variant="secondary"
                        onClick={() => run({ verb: 'closeRound', roundId: round.id }, 'rfx.toast.roundOpened')}
                        data-testid={`round-close-${round.id}`}
                      >
                        {t('rfx.neg.closeRound')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {eventRounds.length === 0 && (
                <EmptyRow colSpan={5} testId="rounds-empty">
                  {t('rfx.neg.empty')}
                </EmptyRow>
              )}
            </tbody>
          </Table>
        </div>

        {negotiate.kind !== 'held' ? (
          <div className="p-4">
            <HandoffNotice availability={negotiate} testId="handoff-rfq-negotiate" />
          </div>
        ) : (
          <div className="p-4 border-t border-border-subtle space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">{t('rfx.neg.new')}</h3>
            <div className="flex flex-wrap gap-4">
              <fieldset className="min-w-[14rem]">
                <legend className="text-xs font-semibold text-text-secondary mb-1">
                  {t('rfx.neg.shortlist')}
                </legend>
                {current.map((q) => (
                  <label key={q.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-teal"
                      checked={shortlist.includes(q.supplierId)}
                      onChange={() =>
                        setShortlist((prev) =>
                          prev.includes(q.supplierId)
                            ? prev.filter((s) => s !== q.supplierId)
                            : [...prev, q.supplierId],
                        )
                      }
                      data-testid={`shortlist-${q.supplierId}`}
                    />
                    {supplierName(q.supplierId)}
                  </label>
                ))}
              </fieldset>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="round-deadline">
                  {t('rfx.neg.deadline')}
                </label>
                <input
                  id="round-deadline"
                  type="date"
                  value={roundDeadline}
                  onChange={(e) => setRoundDeadline(e.target.value)}
                  className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="round-target">
                  {t('rfx.neg.target')}
                </label>
                <input
                  id="round-target"
                  type="number"
                  value={roundTarget}
                  onChange={(e) => setRoundTarget(e.target.value)}
                  className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                />
              </div>
              <div className="flex-1 min-w-[16rem]">
                <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="round-message">
                  {t('rfx.neg.message')}
                </label>
                <input
                  id="round-message"
                  type="text"
                  value={roundMessage}
                  onChange={(e) => setRoundMessage(e.target.value)}
                  className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-teal"
                checked={bestAndFinal}
                onChange={() => setBestAndFinal((v) => !v)}
                data-testid="round-bafo"
              />
              {t('rfx.neg.bestAndFinal')}
            </label>
            <Button
              variant="outline"
              disabled={shortlist.length === 0 || !roundDeadline}
              data-testid="round-open"
              onClick={() =>
                run(
                  {
                    verb: 'openRound',
                    rfqId: rfq.id,
                    deadline: roundDeadline,
                    invitedSupplierIds: shortlist,
                    ...(roundMessage ? { message: roundMessage } : {}),
                    ...(roundTarget ? { targetUnitPrice: Number(roundTarget) } : {}),
                    bestAndFinal,
                  },
                  'rfx.toast.roundOpened',
                )
              }
            >
              {t('rfx.neg.open')}
            </Button>
          </div>
        )}
      </section>

      {/* — REQ-E03-05 BR-06 to BR-09: the award — */}
      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
          {t('rfx.award.title')}
        </div>

        {award ? (
          <div className="p-4 space-y-3" data-testid="award-recorded">
            <p className="text-sm text-text-secondary">
              {t('rfx.award.recorded', { date: formatDate(award.awardedAt) })}
            </p>
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('rfx.award.col.supplier')}</TableHeaderCell>
                <TableHeaderCell>{t('rfx.award.col.share')}</TableHeaderCell>
                <TableHeaderCell>{t('rfx.award.col.qty')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {award.lines.map((line) => (
                  <TableRow key={`${line.supplierId}-${line.itemCode}`} data-testid={`award-line-${line.supplierId}`}>
                    <TableCell>{supplierName(line.supplierId)}</TableCell>
                    <TableCell>
                      <Data>{line.sharePct}%</Data>
                    </TableCell>
                    <TableCell>
                      <Data>
                        {qty(line.quantity)} {rfq.uom}
                      </Data>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
            {award.reason && <p className="text-sm text-text-secondary">{award.reason}</p>}
            {award.departedFromBestScore && (
              <p className="text-sm text-warning-hover" data-testid="award-departed">
                {t('rfx.award.departed')}
              </p>
            )}
            {award.notAwardedSupplierIds.length > 0 && (
              <p className="text-sm text-text-tertiary" data-testid="award-not-awarded">
                {t('rfx.award.notAwarded')}:{' '}
                {award.notAwardedSupplierIds.map((s) => supplierName(s)).join(', ')}
              </p>
            )}
            <p className="text-xs text-text-tertiary">{t('rfx.award.noPo')}</p>
          </div>
        ) : awardVerb.kind !== 'held' ? (
          <div className="p-4">
            <HandoffNotice availability={awardVerb} testId="handoff-rfq-award" />
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* BL-64 / BR-01a — every quoting supplier fails the gate: say the
                award is impossible, rather than show a split hint and a form no
                entry can ever complete. The table below still names each reason. */}
            {noneAwardable ? (
              <p className="text-sm text-warning-hover" role="status" data-testid="award-none-qualified">
                {t('rfx.gate.noAward')}
              </p>
            ) : (
              <p className="text-xs text-text-tertiary">{t('rfx.award.splitHint')}</p>
            )}
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('rfx.award.col.supplier')}</TableHeaderCell>
                <TableHeaderCell>{t('rfx.cmp.row.weighted')}</TableHeaderCell>
                <TableHeaderCell>{t('rfx.award.col.share')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {current.map((q) => (
                  <TableRow key={q.id} data-testid={`award-input-${q.supplierId}`}>
                    <TableCell>{supplierName(q.supplierId)}</TableCell>
                    <TableCell>
                      <Data>{scoreById.get(q.id)?.composite ?? '—'}</Data>
                    </TableCell>
                    <TableCell>
                      {/* BR-01a — a supplier that fails the gate cannot be
                          selected: no share field, and the reason instead. The
                          verb refuses it too, so this is the message, not the lock. */}
                      {!qualifies(q.supplierId) ? (
                        <GateMarker gate={gateOf(q.supplierId)} testId={`award-gate-${q.supplierId}`} />
                      ) : (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        aria-label={`${supplierName(q.supplierId)} — ${t('rfx.award.col.share')}`}
                        value={shares[q.id] ?? ''}
                        onChange={(e) => setShares((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        className="w-24 bg-white border border-border-input rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action"
                      />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {current.length === 0 && (
                  <EmptyRow colSpan={3} testId="award-no-quotes">
                    {t('rfx.cmp.empty')}
                  </EmptyRow>
                )}
              </tbody>
            </Table>

            {departs && (
              <div data-testid="award-reason-required">
                <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="award-reason">
                  {t('rfx.award.reason')}
                </label>
                <p className="text-xs text-warning-hover mb-1">{t('rfx.award.reasonRequired')}</p>
                <input
                  id="award-reason"
                  type="text"
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value)}
                  className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                />
              </div>
            )}
            {splitRefusal && (
              <p className="text-sm text-danger" data-testid="award-split-invalid">
                {t('rfx.award.splitHint')}
              </p>
            )}
            {!noneAwardable && (
              <Button
                variant="outline"
                disabled={awardLines.length === 0 || splitRefusal !== null || (departs && !awardReason.trim())}
                data-testid="award-confirm"
                onClick={() =>
                  run(
                    {
                      verb: 'award',
                      rfqId: rfq.id,
                      awardedQuotationId: awardLines[0].quotationId,
                      awardedSupplierId: awardLines[0].supplierId,
                      awardLines,
                      ...(awardReason.trim() ? { awardReason: awardReason.trim() } : {}),
                    },
                    'rfx.toast.awarded',
                  )
                }
              >
                {t('rfx.award.confirm')}
              </Button>
            )}
            <p className="text-xs text-text-tertiary">{t('rfx.award.noPo')}</p>
          </div>
        )}
      </section>
    </AppShellV2>
  );
};

/** The quote with this id — the comparison rows read it by id, never by index. */
function byId<T extends { id: string }>(rows: readonly T[], id: string): T {
  return rows.find((r) => r.id === id)!;
}

export default BuyerSourcingEvent;
