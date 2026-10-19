/** @import React from 'react' */
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import NotFound from '../NotFound';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { formatDate } from '@lib/format';
import {
  useAwards,
  useNegotiationRounds,
  useQuotations,
  useRFQs,
  useRfqComplianceGate,
  useSuppliers
} from '@services/query/hooks';
import { SupplierDocumentsPanel } from '../rfx/SupplierDocumentsPanel';
import { documentsOf } from '@services/transitions/rfxDocumentRules';
import { daysToDeadline, effectiveDeadline } from '@services/transitions/rfxRules';
import { awardsInForce, trailOfViews } from '@services/sourcing/awardStatus';
import { rfxNow } from '../rfx/rfxDisplay';
import { RfqContentSection } from '../rfx/TieredRfq';
import { QualificationWarningsNote, useSourcingTypeMap } from '../rfx/eligibilityDisplay';
import { useEventCommand } from './hooks/useEventCommand';
import { useEventScoring } from './hooks/useEventScoring';
import { useNewRoundForm } from './hooks/useNewRoundForm';
import EventStatusBar from './components/EventStatusBar';
import ResponseWindowSection from './components/ResponseWindowSection';
import EventItemsSection from './components/EventItemsSection';
import ComparisonSection from './components/ComparisonSection';
import QuoteVersionsSection from './components/QuoteVersionsSection';
import NegotiationSection from './components/NegotiationSection';
import AwardSection from './components/AwardSection';
import EventStageBar from './components/EventStageBar';
import EventSectionNav from './components/EventSectionNav';

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
//
// PHASE 5 PAGE SPLIT: this file is the page — the queries, the page state and
// the section order. Each section is a component under `components/`; the
// scoring memos are `hooks/useEventScoring`, the command path
// `hooks/useEventCommand`, the new-round fields `hooks/useNewRoundForm`.
// Nothing rendered or dispatched changed in the move.
//
// RFx UX 1C (B-01): a stage bar (`EventStageBar`, derived by `rfqStageOf`) and
// a sticky "Jump to" nav (`EventSectionNav`) with counts sit above and beside
// the sections; each section is wrapped in the element the nav scrolls to.
// `?section=award` still lands on `#event-award`.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const BuyerSourcingEvent = () => {
  const { t } = useTranslation();
  const { rfqId = '' } = useParams();
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
  const { command, run } = useEventCommand();

  const roundForm = useNewRoundForm();
  const [extendTo, setExtendTo] = useState('');
  const [extendOnly, setExtendOnly] = useState(/** @type {string[]} */ ([]));
  // RFx spec "Evaluation and award" — the break a TIERED RFQ is compared and
  // awarded at. Unset = the default, the break nearest the RFQ's `totalQty`.
  const [chosenBreak, setChosenBreak] = useState(/** @type {number | null} */ (null));

  // The eyebrow is the menu section alone: "Sourcing", as the board's is. It
  // read "Sourcing · Sourcing event", naming the section twice.
  const crumb = [t('hub.nav.section.sourcing')];
  const {
    rfq,
    tiered,
    evalQty,
    supplierName,
    supplierOtif,
    allQuotes,
    current,
    gateOf,
    eligibilityOf,
    qualifies,
    qualified,
    reliabilityOf,
    scoringOpts,
    scoring,
    scoreById,
    bestId,
    standing,
    tied
  } = useEventScoring({
    rfqId,
    rfqsData: rfqs.data,
    quotesData: quotes.data,
    suppliersData: suppliers.data,
    gatesData: gates.data,
    chosenBreak
  });

  // The board panel's "Award RFQ" / "View award details" open this page at its
  // award section (`?section=award`), so the footer lands where its act is.
  const [params] = useSearchParams();
  const loaded = !rfqs.isPending && !quotes.isPending && !gates.isPending && rfq !== null;
  useEffect(() => {
    if (loaded && params.get('section') === 'award') {
      document.getElementById('event-award')?.scrollIntoView?.({ block: 'start' });
    }
  }, [loaded, params]);

  if (rfqs.isPending || quotes.isPending || gates.isPending)
    return <LoadingState breadcrumb={crumb} />;
  if (rfqs.isError)
    return <ErrorState breadcrumb={crumb} error={rfqs.error} onRetry={() => rfqs.refetch()} />;
  if (!rfq) return <NotFound />;

  const eventRounds = (rounds.data?.items ?? []).filter((r) => r.rfqId === rfq.id);
  // RFx C3 — every award the event has had (cancelled ones are kept, AR-08),
  // and the ones still in force, derived with the rule the verbs use.
  const eventAwards = (awards.data?.items ?? []).filter(
    (a) => a.eventType === 'rfq' && a.eventId === rfq.id
  );
  const inForce = awardsInForce(eventAwards, trailOfViews(eventAwards));
  const awardable =
    rfq.status === 'Open' || rfq.status === 'Closed' || rfq.status === 'Partly awarded';
  const currency = rfq.currency;
  // RFx UX 1C (B-01) — days left on the response window, while it is open.
  const daysLeft = daysToDeadline(rfq.responseDeadline, rfxNow());
  const hasItems = (rfq.lineItems?.length ?? 0) > 0 || tiered;
  const itemCount = rfq.items?.length ?? rfq.lineItems?.length ?? 0;
  const docCount = current.reduce((n, q) => n + documentsOf(q).length, 0);
  const openRounds = eventRounds.filter((r) => !r.closed).length;
  const navEntries = [
    {
      id: 'event-invitees',
      labelKey: 'rfx.nav.invitees',
      count: String(rfq.invitedSupplierIds.length)
    },
    ...(hasItems
      ? [{ id: 'event-items', labelKey: 'rfx.nav.items', count: String(itemCount) }]
      : []),
    { id: 'event-comparison', labelKey: 'rfx.nav.comparison', count: String(current.length) },
    {
      id: 'event-rounds',
      labelKey: 'rfx.nav.rounds',
      count:
        openRounds > 0
          ? t('rfx.stage.d.roundOpen', { count: openRounds })
          : String(eventRounds.length)
    },
    { id: 'event-documents', labelKey: 'rfx.nav.documents', count: String(docCount) },
    {
      id: 'event-award',
      labelKey: 'rfx.nav.award',
      count: inForce.length > 0 ? t(`rfx.status.${rfq.status}`) : t('rfx.nav.notYet')
    }
  ];

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={rfq.title} subtitle={rfq.rfqNumber} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('rfx.asOf')} <Data>{formatDate(rfxNow())}</Data>
        <span className="ml-3">
          {t('rfx.deadline')} <Data>{formatDate(rfq.responseDeadline)}</Data>
          {rfq.status === 'Open' && (
            <span className="ml-1" data-testid="event-days-left">
              ·{' '}
              {daysLeft >= 0 ? t('rfx.stage.daysLeft', { count: daysLeft }) : t('rfx.stage.passed')}
            </span>
          )}
        </span>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <EventStatusBar rfq={rfq} rfqs={rfqs.data?.items ?? []} sourcingMap={sourcingMap} />
      {/* RFx UX 1C (B-01) — where the event stands, and what the buyer does next. */}
      <EventStageBar
        rfq={rfq}
        quoted={new Set(current.map((q) => q.supplierId)).size}
        rounds={eventRounds}
        inForce={inForce}
      />
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

      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-6">
        <EventSectionNav entries={navEntries} />
        <div className="min-w-0">
          {/* — REQ-E03-03 BR-05: the response window, for everyone or for named invitees — */}
          <div id="event-invitees" className="scroll-mt-4">
            <ResponseWindowSection
              rfq={rfq}
              publish={publish}
              supplierName={supplierName}
              supplierOtif={supplierOtif}
              gateOf={gateOf}
              eligibilityOf={eligibilityOf}
              extendTo={extendTo}
              setExtendTo={setExtendTo}
              extendOnly={extendOnly}
              setExtendOnly={setExtendOnly}
              run={run}
            />
          </div>

          {/* — REQ-E03-03: the items being sourced, each answerable with its own price — */}
          <div id="event-items" className="scroll-mt-4">
            {rfq.lineItems && rfq.lineItems.length > 0 && (
              <EventItemsSection lineItems={rfq.lineItems} />
            )}

            {/* — RFx spec: the tiered RFQ's content — items, spec, costs, files, breaks, questions, flags — */}
            {tiered && <RfqContentSection rfq={rfq} />}
          </div>

          {/* — REQ-E03-05 AC-01: the comparison — */}
          <div id="event-comparison" className="scroll-mt-4">
            <ComparisonSection
              rfq={rfq}
              tiered={tiered}
              evalQty={evalQty}
              setChosenBreak={setChosenBreak}
              current={current}
              qualified={qualified}
              currency={currency}
              supplierName={supplierName}
              supplierOtif={supplierOtif}
              gateOf={gateOf}
              qualifies={qualifies}
              reliabilityOf={reliabilityOf}
              scoringOpts={scoringOpts}
              scoring={scoring}
              scoreById={scoreById}
              bestId={bestId}
              standing={standing}
              tied={tied}
            />
            {/* — REQ-E03-05 AC-03: every quote version, kept and viewable — */}
            {allQuotes.length > current.length && (
              <QuoteVersionsSection
                allQuotes={allQuotes}
                currency={currency}
                supplierName={supplierName}
              />
            )}
          </div>

          {/* — REQ-E03-05 BR-03 / BR-04: negotiation rounds — */}
          <div id="event-rounds" className="scroll-mt-4">
            <NegotiationSection
              rfq={rfq}
              eventRounds={eventRounds}
              current={current}
              currency={currency}
              negotiate={negotiate}
              supplierName={supplierName}
              form={roundForm}
              run={run}
            />
          </div>

          {/* — RFx B5: every supplier file on the current quotes (NR-1 buyer step 5) — */}
          <div id="event-documents" className="mb-6 scroll-mt-4">
            <SupplierDocumentsPanel
              requests={rfq.documentRequests}
              responses={current.map((q) => ({
                id: q.id,
                supplierId: q.supplierId,
                supplierName: supplierName(q.supplierId),
                status: q.status,
                documents: documentsOf(q)
              }))}
              deadlineFor={(supplierId) =>
                effectiveDeadline(rfq.responseDeadline, rfq.inviteeDeadlines ?? [], supplierId)
              }
              testId="event-documents"
            />
          </div>

          {/* — REQ-E03-05 BR-06 to BR-09: the award — */}
          <AwardSection
            rfq={rfq}
            eventAwards={eventAwards}
            inForce={inForce}
            awardable={awardable}
            awardVerb={awardVerb}
            cancelVerb={cancelVerb}
            sapVerb={sapVerb}
            pending={command.isPending}
            current={current}
            qualified={qualified}
            evalQty={evalQty}
            reliabilityOf={reliabilityOf}
            scoringOpts={scoringOpts}
            tied={tied}
            bestId={bestId}
            qualifies={qualifies}
            gateOf={gateOf}
            eligibilityOf={eligibilityOf}
            supplierName={supplierName}
            run={run}
          />
        </div>
      </div>
    </AppShellV2>
  );
};

export default BuyerSourcingEvent;
