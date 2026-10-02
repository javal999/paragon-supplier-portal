import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import NotFound from './NotFound';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { formatDate } from '@lib/format';
import { BASE_CURRENCY } from '@lib/currencyPolicy';
import { compositeText, scoreQuotations, scoreStanding } from '@lib/quoteScore';
import {
  useAwards,
  useNegotiationRounds,
  useQuotations,
  useRFQs,
  useRfqComplianceGate,
  useSuppliers,
} from '@services/query/hooks';
import { RfqSourceLinks } from './rfx/rfqSources';
import { DocumentsStatus, SupplierDocumentsPanel } from './rfx/SupplierDocumentsPanel';
import { documentsOf } from '@services/transitions/rfxDocumentRules';
import { useRfxCommand } from '@services/query/commandHooks';
import { effectiveDeadline, reliabilityScoreFor } from '@services/transitions/rfxRules';
import type { AwardItem } from '@services/sourcing/awardShape';
import { awardsInForce, trailOfViews } from '@services/sourcing/awardStatus';
import {
  bestScoredByItemAt,
  defaultEvaluationTierQty,
  eventPiecesAt,
  isTieredRfq,
  quoteTotalAt,
  scoreRfqAt,
} from '@services/sourcing/rfqComparison';
import { DeadlinePill, EmptyRow, GateMarker, OtifOrNoHistory, money, qty, rfxNow } from './rfx/rfxDisplay';
import { EvaluationBreakSelect, RfqContentSection, TieredComparison } from './rfx/TieredRfq';
import { AwardPanel, type PanelAward } from './rfx/AwardPanel';
import {
  EligibilityMarker,
  QualificationWarningsNote,
  SourcingTypePill,
  useSourcingTypeMap,
} from './rfx/eligibilityDisplay';
import { sourcingTypeOf } from '@services/sourcing/sourcingType';
import { AwardRecords } from './rfx/AwardRecords';

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
  // Material G2 — a Draft reads its sourcing type from the map in force.
  const sourcingMap = useSourcingTypeMap();
  const negotiate = useVerbAvailability('rfq:negotiate');
  const awardVerb = useVerbAvailability('rfq:award');
  // RFx C3 (NR-3 BR-09, BR-10) — cancelling an award and marking it raised in
  // SAP are their own atoms, so a seat may hold one without the other.
  const cancelVerb = useVerbAvailability('rfq:award-cancel');
  const sapVerb = useVerbAvailability('rfq:award-sap');
  // REQ-E03-03 BR-05 — moving the response window is the PUBLISH authority, the
  // same atom that sent the invitation out; it is not the award authority.
  const publish = useVerbAvailability('rfq:publish');
  const command = useRfxCommand();

  const [shortlist, setShortlist] = useState<string[]>([]);
  const [roundDeadline, setRoundDeadline] = useState('');
  const [roundMessage, setRoundMessage] = useState('');
  const [roundTarget, setRoundTarget] = useState('');
  const [bestAndFinal, setBestAndFinal] = useState(false);
  const [extendTo, setExtendTo] = useState('');
  const [extendOnly, setExtendOnly] = useState<string[]>([]);
  // RFx spec "Evaluation and award" — the break a TIERED RFQ is compared and
  // awarded at. Unset = the default, the break nearest the RFQ's `totalQty`.
  const [chosenBreak, setChosenBreak] = useState<number | null>(null);

  // The eyebrow is the menu section alone: "Sourcing", as the board's is. It
  // read "Sourcing · Sourcing event", naming the section twice.
  const crumb = [t('hub.nav.section.sourcing')];
  const rfq = useMemo(() => (rfqs.data?.items ?? []).find((r) => r.id === rfqId) ?? null, [rfqs.data, rfqId]);
  const tiered = rfq !== null && isTieredRfq(rfq);
  const evalQty = rfq && tiered ? (chosenBreak ?? defaultEvaluationTierQty(rfq)) : null;

  const supplierName = (id: string) => suppliers.data?.items.find((s) => s.id === id)?.name ?? id;
  const supplierOtif = (id: string) => suppliers.data?.items.find((s) => s.id === id)?.otif ?? null;

  const allQuotes = useMemo(() => quotes.data?.items ?? [], [quotes.data]);
  /** The CURRENT version of each bid — a superseded one is history, not a rival. */
  const current = useMemo(() => {
    const superseded = new Set(allQuotes.map((q) => q.supersedesQuotationId).filter(Boolean) as string[]);
    return allQuotes.filter((q) => !superseded.has(q.id));
  }, [allQuotes]);

  const gateOf = (supplierId: string) => gates.data?.items.find((g) => g.supplierId === supplierId);
  /** Material G2 (MR-10 BR-07) — the supplier against the event's sourcing type, today. */
  const eligibilityOf = (supplierId: string) => gateOf(supplierId)?.eligibility;
  /** REQ-E03-05 BR-01a — only a supplier that PASSES the gate is scored or awardable.
   *  No gate read yet = not qualified: a pass is never assumed. */
  const qualifies = (supplierId: string) => gateOf(supplierId)?.passes === true;
  const qualified = useMemo(
    () => current.filter((q) => gates.data?.items.some((g) => g.supplierId === q.supplierId && g.passes)),
    [current, gates.data],
  );

  // CR-15 — reliability IS the supplier's OTIF; no history scores 50.
  const reliabilityOf = (id: string) => reliabilityScoreFor(supplierOtif(id));
  const scoringOpts = { pins: rfq?.fxPins, now: new Date(rfxNow()) };
  const scoring = useMemo(
    () =>
      // A TIERED RFQ scores PRICE AS TOTAL COST AT THE EVALUATION BREAK — the
      // same rule the award verb reads (`rfxReadModel.rfqScoring`). A legacy
      // RFQ scores its header unit price exactly as before.
      rfq && tiered && evalQty !== null
        ? scoreRfqAt(rfq, qualified, evalQty, reliabilityOf, scoringOpts)
        : scoreQuotations(
            qualified.map((q) => ({
              id: q.id,
              unitPrice: q.unitPrice,
              currency: q.currency ?? BASE_CURRENCY,
              leadTimeDays: q.leadTimeDays,
              reliabilityScore: reliabilityOf(q.supplierId),
            })),
            scoringOpts,
          ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qualified, rfq, tiered, evalQty, suppliers.data],
  );
  const scoreById = useMemo(
    () => new Map(scoring.kind === 'scored' ? scoring.scores.map((s) => [s.quoteId, s] as const) : []),
    [scoring],
  );
  const bestId = scoring.kind === 'scored' ? (scoring.scores.find((s) => s.topRanked)?.quoteId ?? null) : null;
  // ⚠️ TIE HONESTY. Two quotes can both READ "72" while one is best on the
  // unrounded score (Oslo at 3,000: 72.0 against 71.6) — the scores are then
  // shown to one decimal and the note states that rule. A GENUINE tie marks
  // every tied quote "Tied for best" and no single "Best scored": the engine's
  // stable pick is not a ranking, and presenting it as one would be invented.
  const standing = useMemo(
    () => scoreStanding(scoring.kind === 'scored' ? scoring.scores : []),
    [scoring],
  );
  const tied = standing.tiedIds.length > 1;

  // The board panel's "Award RFQ" / "View award details" open this page at its
  // award section (`?section=award`), so the footer lands where its act is.
  const [params] = useSearchParams();
  const loaded = !rfqs.isPending && !quotes.isPending && !gates.isPending && rfq !== null;
  useEffect(() => {
    if (loaded && params.get('section') === 'award') {
      document.getElementById('event-award')?.scrollIntoView?.({ block: 'start' });
    }
  }, [loaded, params]);

  if (rfqs.isPending || quotes.isPending || gates.isPending) return <LoadingState breadcrumb={crumb} />;
  if (rfqs.isError) return <ErrorState breadcrumb={crumb} error={rfqs.error} onRetry={() => rfqs.refetch()} />;
  if (!rfq) return <NotFound />;

  const eventRounds = (rounds.data?.items ?? []).filter((r) => r.rfqId === rfq.id);
  // RFx C3 — every award the event has had (cancelled ones are kept, AR-08),
  // and the ones still in force, derived with the rule the verbs use.
  const eventAwards = (awards.data?.items ?? []).filter((a) => a.eventType === 'rfq' && a.eventId === rfq.id);
  const inForce = awardsInForce(eventAwards, trailOfViews(eventAwards));
  const awardable = rfq.status === 'Open' || rfq.status === 'Closed' || rfq.status === 'Partly awarded';
  const currency = rfq.currency;

  /**
   * A tiered quote's figures AT THE EVALUATION BREAK — its total cost there and
   * that total per piece. `undefined` for a legacy RFQ, whose header figures
   * are the comparison, and for a quote with no price at the break.
   */
  const atBreak = (id: string): { total: number; perPiece: number } | undefined => {
    if (!tiered || evalQty === null) return undefined;
    const total = quoteTotalAt(rfq, byId(current, id), evalQty);
    const pieces = eventPiecesAt(rfq, evalQty);
    return total === null || pieces <= 0 ? undefined : { total, perPiece: total / pieces };
  };
  /** The price rows say which break they are read at, on a tiered RFQ. */
  const rowLabel = (labelKey: string): string => {
    if (tiered && evalQty !== null && labelKey === 'rfx.cmp.row.unitPrice') {
      return t('rfqCompare.cmp.unitAtBreak', { qty: qty(evalQty) });
    }
    if (tiered && evalQty !== null && labelKey === 'rfx.cmp.row.totalPrice') {
      return t('rfqCompare.cmp.eventTotal', { qty: qty(evalQty) });
    }
    return t(labelKey);
  };

  /** BL-64 — quotes exist and not one comes from a supplier passing CR-23: nothing can be awarded. */
  const noneAwardable = current.length > 0 && qualified.length === 0;
  /**
   * The best-scored quote for an item at a break — the reason rule's anchor,
   * read as the verb reads it: per item at that item's own break on a tiered
   * RFQ, the event's best on a legacy one. A genuine tie has no single best.
   */
  const bestOf = (item: AwardItem, breakQty: number): string | null =>
    item.tiered
      ? (bestScoredByItemAt(rfq, qualified, breakQty, reliabilityOf, scoringOpts).get(item.lineNo!) ?? null)
      : tied
        ? null
        : bestId;
  /** Dispatch the panel's award: `award` (final) or `awardPartial`, by whether an item stays open. */
  const sendAward = (a: PanelAward) => {
    // The verb's required principal: the first line, or — for a final award
    // with no lines ("Will not award the rest") — an award already in force.
    const principal = a.lines[0] ?? inForce.find((x) => x.lines.length > 0)?.lines[0];
    const base = {
      rfqId: rfq.id,
      awardedQuotationId: principal?.quotationId ?? '',
      awardedSupplierId: principal?.supplierId ?? '',
      awardLines: a.lines,
      ...(a.reason ? { awardReason: a.reason } : {}),
    };
    run(
      a.final
        ? { verb: 'award', ...base, ...(a.notAwardedItems.length > 0 ? { notAwardedItems: a.notAwardedItems } : {}) }
        : { verb: 'awardPartial', ...base },
      'rfx.toast.awarded',
    );
  };

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
        <Link to="/buyer/rfq" className="text-sm text-action-hover hover:underline" data-testid="event-back">
          {t('rfx.event.back')}
        </Link>
        <StatusPill variant={rfq.status === 'Awarded' ? 'success' : 'info'}>{rfq.status}</StatusPill>
        {/* Material G2 (MR-10 BR-06) — the type, fixed at publish. */}
        <SourcingTypePill
          type={sourcingTypeOf(
            {
              kind: 'rfq',
              status: rfq.status,
              materialCategory: rfq.materialCategory,
              ...(rfq.sourcingType ? { sourcingType: rfq.sourcingType } : {}),
            },
            sourcingMap,
          )}
          testId="event-sourcing-type"
        />
        <RfqSourceLinks rfq={rfq} rfqs={rfqs.data?.items ?? []} />
      </div>
      {/* BL-147 — the invitees published below the level on placeholder rules, as recorded. */}
      {!!rfq.qualificationWarnings && rfq.qualificationWarnings.length > 0 && (
        <div className="mb-4">
          <QualificationWarningsNote
            kind="published"
            warnings={rfq.qualificationWarnings}
            supplierName={supplierName}
            testId="event-published-warnings"
          />
        </div>
      )}

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
                    {/* Material G2 — invited and still able to quote (MAT-D14); flagged when below the level. */}
                    <div className="mt-1">
                      <EligibilityMarker eligibility={eligibilityOf(supplierId)} testId={`event-elig-${supplierId}`} />
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

      {/* — RFx spec: the tiered RFQ's content — items, spec, costs, files, breaks, questions, flags — */}
      {tiered && <RfqContentSection rfq={rfq} />}

      {/* — REQ-E03-05 AC-01: the comparison — */}
      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">{t('rfx.cmp.title')}</h2>
          <p className="text-xs text-text-tertiary mt-1">{t('rfx.cmp.basis')}</p>
          <p className="text-xs text-text-tertiary">{t('rfx.cmp.notAutomatic')}</p>
          {tiered && evalQty !== null && (
            <div className="mt-3">
              <EvaluationBreakSelect rfq={rfq} value={evalQty} onChange={setChosenBreak} />
            </div>
          )}
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
                  {!tied && q.id === bestId && (
                    <StatusPill variant="success" className="ml-2">
                      {t('rfx.cmp.best')}
                    </StatusPill>
                  )}
                  {tied && standing.tiedIds.includes(q.id) && (
                    <span className="ml-2" data-testid={`cmp-tied-${q.supplierId}`}>
                      <StatusPill variant="success">{t('rfx.cmp.tied')}</StatusPill>
                    </span>
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
                  ['rfx.cmp.row.unitPrice', (id: string) => money(atBreak(id)?.perPiece ?? byId(current, id).unitPrice, byId(current, id).currency ?? currency)],
                  ['rfx.cmp.row.totalPrice', (id: string) => money(atBreak(id)?.total ?? byId(current, id).totalPrice, byId(current, id).currency ?? currency)],
                  ['rfx.cmp.row.leadTime', (id: string) => `${byId(current, id).leadTimeDays} ${t('rfx.unit.days')}`],
                  ['rfx.cmp.row.moq', (id: string) => (byId(current, id).moq === undefined ? '—' : qty(byId(current, id).moq!))],
                  ['rfx.cmp.row.payment', (id: string) => byId(current, id).paymentTermsOffered],
                  ['rfx.cmp.row.priceScore', (id: string) => String(scoreById.get(id)?.priceScore ?? '—')],
                  ['rfx.cmp.row.leadTimeScore', (id: string) => String(scoreById.get(id)?.leadTimeScore ?? '—')],
                ] as const
              ).map(([labelKey, render]) => (
                <TableRow key={labelKey} data-testid={`cmp-row-${labelKey}`}>
                  <TableCell className="text-sm text-text-secondary">{rowLabel(labelKey)}</TableCell>
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
                  <TableCell
                    key={q.id}
                    className={(tied ? standing.tiedIds.includes(q.id) : q.id === bestId) ? 'bg-success-soft' : ''}
                  >
                    {qualifies(q.supplierId) ? (
                      <Data className="font-semibold">
                        {scoreById.has(q.id) ? compositeText(scoreById.get(q.id)!, standing) : '—'}
                      </Data>
                    ) : (
                      // BR-01a — the quote stays visible; it is not scored.
                      <span className="text-xs text-text-tertiary" data-testid={`cmp-not-scored-${q.supplierId}`}>
                        {t('rfx.gate.notScored')}
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
              {/* BL-126 (CE-11l) — NR-1 buyer step 6 on a LEGACY RFQ: the
                  required documents, per supplier. A tiered RFQ carries this
                  row in its own comparison below, so it is not repeated here. */}
              {!tiered && (
                <TableRow data-testid="cmp-row-documents">
                  <TableCell className="text-sm text-text-secondary">{t('rfxFiles.docs.row')}</TableCell>
                  {current.map((q) => (
                    <TableCell key={q.id}>
                      <DocumentsStatus
                        requests={rfq.documentRequests ?? []}
                        documents={documentsOf(q)}
                        testId={`cmp-documents-${q.supplierId}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </tbody>
          </Table>
        )}
        {(standing.oneDecimal || tied) && current.length > 0 && (
          <p className="px-4 py-2 text-xs text-text-tertiary" data-testid={tied ? 'cmp-tie-note' : 'cmp-decimal-note'}>
            {t(tied ? 'rfx.cmp.tieNote' : 'rfx.cmp.decimalNote')}
          </p>
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
        {tiered && evalQty !== null && current.length > 0 && (
          <div className="p-4 border-t border-border-subtle">
            <TieredComparison
              rfq={rfq}
              quotes={current}
              evalQty={evalQty}
              qualifies={qualifies}
              gateOf={gateOf}
              supplierName={supplierName}
              reliabilityOf={reliabilityOf}
              scoringOpts={scoringOpts}
            />
          </div>
        )}
      </section>

      {/* — RFx B5: every supplier file on the current quotes (NR-1 buyer step 5) — */}
      <div className="mb-6">
        <SupplierDocumentsPanel
          requests={rfq.documentRequests}
          responses={current.map((q) => ({
            id: q.id,
            supplierId: q.supplierId,
            supplierName: supplierName(q.supplierId),
            status: q.status,
            documents: documentsOf(q),
          }))}
          deadlineFor={(supplierId) =>
            effectiveDeadline(rfq.responseDeadline, rfq.inviteeDeadlines ?? [], supplierId)
          }
          testId="event-documents"
        />
      </div>

      {/* — REQ-E03-05 AC-03: every quote version, kept and viewable — */}
      {allQuotes.length > current.length && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
          <div className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
            {t('rfx.cmp.versions')}
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('rfx.supplier')}</TableHeaderCell>
              <TableHeaderCell>{t('rfx.cmp.roundColumn')}</TableHeaderCell>
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
              <TableHeaderCell>{t('rfx.cmp.roundColumn')}</TableHeaderCell>
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
      <section id="event-award" className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
          {t('rfx.award.title')}
        </div>

        {eventAwards.length > 0 && (
          <div className="p-4 border-b border-border-subtle">
            <AwardRecords
              rfq={rfq}
              awards={eventAwards}
              supplierName={supplierName}
              cancelVerb={cancelVerb}
              sapVerb={sapVerb}
              pending={command.isPending}
              onCancel={(award, cancelReason, partial) =>
                run(
                  { verb: partial ? 'cancelAwardPartial' : 'cancelAward', rfqId: rfq.id, awardId: award.id, cancelReason },
                  'rfx.toast.awardCancelled',
                )
              }
              onMarkSap={(award, sapDocumentNo) =>
                run({ verb: 'markAwardSapRaised', rfqId: rfq.id, awardId: award.id, sapDocumentNo }, 'rfx.toast.sapMarked')
              }
            />
          </div>
        )}
        {/* RFx C3 (NR-3 BR-02 to BR-07) — ONE award panel for every RFQ, while
            it can still be awarded: Open, Closed, or Partly awarded. */}
        {!awardable ? null : awardVerb.kind !== 'held' ? (
          <div className="p-4">
            <HandoffNotice availability={awardVerb} testId="handoff-rfq-award" />
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* BL-64 / BR-01a — every quoting supplier fails the gate: say the
                award is impossible. The rows below still name each reason. */}
            {noneAwardable && (
              <p className="text-sm text-warning-hover" role="status" data-testid="award-none-qualified">
                {t('rfx.gate.noAward')}
              </p>
            )}
            <AwardPanel
              // Keyed on the awards in force, so a recorded or cancelled award
              // starts the panel afresh over the items still open.
              key={inForce.map((a) => a.id).join('|')}
              rfq={rfq}
              quotes={current}
              inForce={inForce}
              defaultBreak={evalQty}
              bestOf={bestOf}
              qualifies={qualifies}
              gateOf={gateOf}
              eligibilityOf={eligibilityOf}
              supplierName={supplierName}
              noneAwardable={noneAwardable}
              pending={command.isPending}
              onAward={sendAward}
            />
          </div>
        )}
        {eventAwards.length === 0 && (
          <p className="px-4 pb-4 text-xs text-text-tertiary">{t('rfx.award.noPo')}</p>
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
