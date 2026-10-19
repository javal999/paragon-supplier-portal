/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import SubTabs from '@components/ui-v2/SubTabs';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import {
  useCurrentSupplier,
  useRFQs,
  useQuotations,
  useRfqClarifications,
  useRfqEngagement,
  useAwards,
  useNegotiationRounds
} from '@services/query/hooks';
import { supplierRfqOutcome } from '@services/sourcing/supplierOutcome';
/** @import { AwardView, NegotiationRoundView } from '@services/sourcing/views' */
/** @import { RFQ, Quotation, Supplier } from '@services/data/types' */
import { rfxNow } from '../rfx/rfxDisplay';
import { buildAwardRows, buildSubmittedQuotes, toOpenRfq } from './utils';
/** @import { AwardRow, OpenRFQ } from './utils' */
/** @import { TabKey } from './const' */
import { useQuoteSubmission } from './hooks/useQuoteSubmission';
import RfqPageHeader from './components/RfqPageHeader';
import RfqKpiRow from './components/RfqKpiRow';
import OpenRFQsTab from './components/OpenRFQsTab';
import MyQuotesTab from './components/MyQuotesTab';
import AwardsTab from './components/AwardsTab';
import RfqEventStrips from './components/RfqEventStrips';
import QuotePanel from './components/QuotePanel';

/**
 * @typedef {object} RfqWorkspaceProps
 * @property {Supplier} mySupplier
 * @property {string} supplierId
 * @property {OpenRFQ[]} initialRfqs
 * @property {Quotation[]} quotations
 * @property {Map<string, RFQ>} rfqById
 * @property {AwardRow[]} awardRows
 * @property {readonly AwardView[]} awards This supplier's narrowed RFQ award read (RFX-R4).
 * @property {readonly NegotiationRoundView[]} rounds This supplier's own revision rounds.
 * @property {string} nowIso
 */

/**
 * The supplier's RFQ workspace, inside the app shell: the header and KPI row,
 * the three tabs (open RFQs, my quotes, award history), and the quote panel.
 * It derives the open list (pruned of RFQs this supplier already quoted), the
 * counts, and the submitted-quote rows from the reads the page passes in; the
 * quote panel's state and submit live in `useQuoteSubmission`.
 * @type {React.FC<RfqWorkspaceProps>}
 */
const RfqWorkspace = ({
  mySupplier,
  supplierId,
  initialRfqs,
  quotations,
  rfqById,
  awardRows,
  awards,
  rounds,
  nowIso
}) => {
  const { t } = useTranslation();
  // The eyebrow is the menu section alone (the `PageHeader` rule).
  const crumb = [t('hub.nav.section.sourcing')];
  const [activeTab, setActiveTab] = useState(/** @type {TabKey} */ ('open'));
  // Deep-link read: `?tab=open` lands "sourcing invitations to answer" on
  // the Open tab (already this page's default — kept explicit for the shared
  // deep-link convention, and in case that default ever changes).
  useUrlEnumParam('tab', /** @type {TabKey[]} */ (['open', 'quotes', 'history']), setActiveTab);
  const submission = useQuoteSubmission({
    supplierId,
    rfqById,
    nowIso,
    onSubmitted: () => setActiveTab('quotes')
  });
  const engagementQuery = useRfqEngagement();
  const clarificationsQuery = useRfqClarifications();
  const engagementByRfq = useMemo(
    () =>
      new Map((engagementQuery.data?.items ?? []).map((e) => /** @type {const} */ ([e.rfqId, e]))),
    [engagementQuery.data]
  );
  const clarifications = clarificationsQuery.data?.items ?? [];

  // The supplier's OWN submitted quotations (real read) drive My-Quotes AND prune
  // the open list — an RFQ this supplier has already quoted drops from "Open" (the
  // honest replacement for the retired local-state fake; after a real submit the
  // invalidated useQuotations re-read re-derives both). respondedSupplierIds on
  // the RFQ is NOT synced this batch (3b-D, registered finding) — the open-list
  // prune reads the supplier's own quotes, not the RFQ roster.
  const submittedQuotes = useMemo(
    () => buildSubmittedQuotes(quotations, rfqById, t),
    [quotations, rfqById, t]
  );
  const quotedRfqIds = useMemo(() => new Set(quotations.map((q) => q.rfqId)), [quotations]);
  const openRFQs = useMemo(
    () => initialRfqs.filter((r) => !quotedRfqIds.has(r.id)),
    [initialRfqs, quotedRfqIds]
  );

  // A declined RFQ stays on the list with its decline stated, and leaves the
  // count: it is no longer waiting on this supplier.
  const openCount = openRFQs.filter(
    (r) => engagementByRfq.get(r.id)?.intent?.intent !== 'decline'
  ).length;
  const submittedCount = submittedQuotes.length;
  // 2e-b-3 (COS-03) — DERIVED, not a literal. This was `= 1`: a hardcoded
  // number rendered as a live KPI reading "Awaiting Award · Decision pending".
  // It is display-only — nothing is stored, ranked or dispatched from it — but a
  // fabricated figure on a KPI tile is the same honesty class as a fabricated
  // score, just cheaper: it told every supplier the same thing regardless of
  // what they had actually submitted, including a supplier with none.
  //
  // The honest reading is the supplier's own quotations that have been submitted
  // and NOT yet decided. `Awarded` / `Rejected` are the terminal states (the
  // pair `buildAwardRows` reads), so awaiting = the other two, filtered
  // explicitly rather than by subtraction — a subtraction would silently absorb
  // any future status that belongs in neither bucket.
  const awaitingCount = useMemo(
    () => quotations.filter((q) => q.status === 'Submitted' || q.status === 'Under Review').length,
    [quotations]
  );

  // RFx UX S-04 / S-05 — the latest round and the award outcome of an RFQ, as
  // strips on its card. A round counts as revised once this supplier holds a
  // quote version for that round number.
  /** @param {string} rfqId */
  const strips = (rfqId) => {
    const round = rounds
      .filter((r) => r.rfqId === rfqId)
      .slice()
      .sort((a, b) => a.roundNumber - b.roundNumber)
      .pop();
    const rfq = rfqById.get(rfqId);
    return (
      <RfqEventStrips
        rfqId={rfqId}
        round={round}
        revised={
          !!round &&
          quotations.some((q) => q.rfqId === rfqId && q.roundNumber === round.roundNumber)
        }
        outcome={rfq ? supplierRfqOutcome(rfq, awards, supplierId) : null}
        nowIso={nowIso}
      />
    );
  };

  return (
    <AppShellV2>
      <RfqPageHeader
        crumb={crumb}
        supplierName={mySupplier.name}
        openCount={openCount}
        submittedCount={submittedCount}
      />

      <RfqKpiRow
        openCount={openCount}
        submittedCount={submittedCount}
        awaitingCount={awaitingCount}
      />

      <SubTabs
        options={[
          { id: 'open', label: t('rfqs.tab.open'), count: openCount },
          { id: 'quotes', label: t('rfqs.tab.quotes'), count: submittedCount },
          { id: 'history', label: t('rfqs.tab.history'), count: awardRows.length }
        ]}
        value={activeTab}
        onChange={setActiveTab}
        className="mb-5"
      />

      {activeTab === 'open' && (
        <OpenRFQsTab
          rfqs={openRFQs}
          onSubmitQuote={submission.handleSubmitQuote}
          supplierId={supplierId}
          engagementByRfq={engagementByRfq}
          clarifications={clarifications}
        />
      )}
      {activeTab === 'quotes' && (
        <MyQuotesTab
          quotes={submittedQuotes}
          canRevise={submission.canRevise}
          onRevise={submission.handleRevise}
          strips={strips}
        />
      )}
      {activeTab === 'history' && <AwardsTab rows={awardRows} />}

      <QuotePanel submission={submission} />
    </AppShellV2>
  );
};

// Wrapper: reads the supplier + invited RFQs + quotations through the scoped
// hooks and renders the four honest states; the workspace inner holds the local
// (Phase-2′, non-persisting) quote-submission state seeded from the mapped read.
// Partial migration (ruling B): the open-RFQ list + counts are wired; the RFQ
// entity's missing supplier-facing detail is sampled and pilled per card, and
// the quote/award tabs stay illustrative (pilled).
/** @type {React.FC} */
const SupplierRFQs = () => {
  const { t } = useTranslation();
  // The eyebrow is the menu section alone (the `PageHeader` rule).
  const crumb = [t('hub.nav.section.sourcing')];
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const supplierQuery = useCurrentSupplier();
  const rfqsQuery = useRFQs();
  const quotationsQuery = useQuotations();
  // RFx UX S-03 / S-04 / S-05 — the award record and the rounds. Neither holds
  // the page: until they arrive the history is empty and no strip shows.
  const awardsQuery = useAwards();
  const roundsQuery = useNegotiationRounds();
  // ONE clock read, captured once — the replacement for the deleted
  // `RFQ_TODAY_MS` pin. ⚠️ It sits ABOVE every early return deliberately: this
  // component returns early four ways, and a hook below them is a CONDITIONAL
  // hook ("Rendered more hooks than during the previous render"), which is how
  // the first draft of this change took 44 specs down.
  // ⚠️ THE HUB'S REFERENCE CLOCK, NOT THE WALL CLOCK. This read `new Date()`,
  // so the card counted Oslo's deadline against real time ("0 days remaining")
  // while every buyer RFx page reads "As of" the simulated `rfxNow()` — the same
  // deadline, two day-counts, depending on who was looking.
  const nowIso = useMemo(() => rfxNow(), []);

  if (!supplierId) return <NoSupplierIdentity />;
  if (supplierQuery.isPending || rfqsQuery.isPending || quotationsQuery.isPending)
    return <LoadingState breadcrumb={crumb} />;
  if (supplierQuery.isError || rfqsQuery.isError || quotationsQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={supplierQuery.error ?? rfqsQuery.error ?? quotationsQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          rfqsQuery.refetch();
          quotationsQuery.refetch();
        }}
      />
    );

  const mySupplier = supplierQuery.data ?? null;
  if (!mySupplier) return <NoSupplierIdentity />;

  const rfqs = rfqsQuery.data?.items ?? [];
  const quotations = quotationsQuery.data?.items ?? [];
  const quoteCount = quotations.length;
  if (rfqs.length === 0 && quoteCount === 0)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('rfqs.empty.title')}
        subtitle={t('rfqs.empty.subtitle', { supplier: mySupplier.name })}
        message={t('rfqs.empty.message')}
      />
    );

  const initialRfqs = rfqs.filter((r) => r.status === 'Open').map((r) => toOpenRfq(r, nowIso, t));

  // RFx UX S-03 — award history is read from the AWARD RECORD (one row per
  // event), not from the quotation statuses, which listed an RFQ once per quote
  // version and dated it with the planned award deadline.
  const rfqById = new Map(rfqs.map((r) => [r.id, r]));
  const awards = awardsQuery.data?.items ?? [];
  const awardRows = buildAwardRows(awards, rfqById, quotations, supplierId, t);

  return (
    <RfqWorkspace
      mySupplier={mySupplier}
      supplierId={supplierId}
      initialRfqs={initialRfqs}
      quotations={quotations}
      rfqById={rfqById}
      awardRows={awardRows}
      awards={awards}
      rounds={roundsQuery.data?.items ?? []}
      nowIso={nowIso}
    />
  );
};

export default SupplierRFQs;
