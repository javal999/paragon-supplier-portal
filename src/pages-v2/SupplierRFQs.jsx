/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
/** @import { TFunction } from 'i18next' */
/** @import { LucideIcon } from 'lucide-react' */
import {
  Inbox,
  Send,
  Trophy,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Mail,
  MessageCircle,
  Globe,
  Lock
} from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import KpiCard from '@components/ui-v2/KpiCard';
import SubTabs from '@components/ui-v2/SubTabs';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import FormSection from '@components/ui-v2/FormSection';
import Data from '@components/ui-v2/Data';
import { useToast } from '@hooks/useToast';
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
  useRfqEngagement
} from '@services/query/hooks';
/** @import { DocumentDraft } from './rfx/ResponseDocumentsSection' */
import ResponseDocumentsSection from './rfx/ResponseDocumentsSection';
import TieredQuoteForm, { SampleOfferFields } from './rfqs/TieredQuoteForm';
import {
  RfqClarifications,
  RfqConfidentialityGate,
  RfqIntentControls
} from './rfqs/RfqEngagementControls';
/** @import { TieredDraft } from './rfqs/tieredQuoteModel' */
import {
  draftFromQuote,
  emptyTieredDraft,
  readTieredDraft,
  refusalItem
} from './rfqs/tieredQuoteModel';
import { rfqResponseRefusal } from './rfqs/rfqResponseText';
import { tiersForItem } from '@services/sourcing/rfqModel';
import { documentsOf, responseDocumentsRefusal } from '@services/transitions/rfxDocumentRules';
/** @import { RfqClarificationView, RfqEngagementView } from '@services/sourcing/rfqResponse' */
import { useQuotationSubmit } from '@services/query/commandHooks';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { buildQuotationSubmitPayload, isCurrencyRefusal } from './rfqs/quotationSubmitModel';
/** @import { PriceRefusalReason } from './rfqs/quotationPrice' */
import { readBidPrice } from './rfqs/quotationPrice';
/** @import { BidCurrency } from '@lib/currencyPolicy' */
import { BASE_CURRENCY, BID_CURRENCIES, isBidCurrency } from '@lib/currencyPolicy';
/** @import { LeadTimeRefusalReason, LeadTimeUnit } from './rfqs/quotationLeadTime' */
import { readLeadTimeDays } from './rfqs/quotationLeadTime';
/** @import { MoqRefusalReason } from './rfqs/quotationMoq' */
import { readMoq } from './rfqs/quotationMoq';
import { daysUntil } from '@services/data/dayProjection';
/** @import { RFQ, Quotation, Supplier } from '@services/data/types' */
import { CHART_SERIES } from '@lib/chartPalette';
import { CRITERIA_WEIGHTS } from '@lib/quoteScore';
import { rfxNow } from './rfx/rfxDisplay';
import { formatDate, formatMoney, formatNumber } from '@lib/format';
import { useRefusalText } from '@hooks/useRefusalText';

/**
 * @typedef {object} OpenRFQ
 * @property {string} id
 * @property {string} rfqNumber
 * @property {string} material
 * @property {string} category
 * @property {string} qty -  The RFQ quantity formatted for display ("200,000 PCS"). Presentation only.
 * @property {number} totalQty -  The same quantity as a number — what the total-price preview multiplies.
 * @property {RFQ} rfq -  The RFQ itself, for the tiered response (items, breaks, questions).
 * @property {string} delivery -  The delivery terms the RFQ states (its incoterms).
 * @property {string} awardBy -  The date the buyer means to award by.
 * @property {string} deadline
 * @property {number} daysRemaining
 * @property {{ text: string; sample: boolean }} specialRequirements What the RFQ itself asks beyond the price: item notes, samples requested,
 *   alternatives allowed. `sample: true` when the RFQ states none of it and the
 *   card shows illustrative text, marked as such.
 * @property {{ price: number; leadTime: number; reliability: number; }} evaluationCriteria -  How the quote is scored — the platform's CR-15 weights, in percent.
 * @property {string} status
 * @property {string} receivedVia
 * @property {string} receivedDate
 */

/**
 * @typedef {object} SubmittedQuote
 * @property {string} rfqNumber
 * @property {string} quoteNumber
 * @property {string} material
 * @property {string} submittedDate
 * @property {string} unitPrice
 * @property {string} totalPrice
 * @property {string} leadTime
 * @property {string} moq -  The stated minimum order quantity, or the "same as RFQ qty" default (2e-b-2).
 * @property {string} validUntil
 * @property {string} status
 * @property {Quotation} quote -  The quotation itself, for a revision.
 * @property {boolean} current -  False once a later version supersedes this one.
 */

// The supplier's OWN submitted quotations (Task 3b), joined to their RFQ for
// display. HONEST-BY-CONSTRUCTION (3b-C): own quote facts + status ONLY — NO
// score, NO competitive rank. A score/rank would need the sibling set (rival
// suppliers' quotes), which per-supplier scoping hides; surfacing it would be
// fabrication or a data leak. The BUYER sees scores (engine, at read, #78); the
// supplier sees its own facts. Replaces the retired SUBMITTED_QUOTE fixture.
/**
 * @param {Quotation[]} quotations
 * @param {Map<string, RFQ>} rfqById
 * @param {TFunction} t
 * @returns {SubmittedQuote[]}
 */
const buildSubmittedQuotes = (quotations, rfqById, t) => {
  const superseded = new Set(
    /** @type {string[]} */ (quotations.map((q) => q.supersedesQuotationId).filter(Boolean))
  );
  return quotations.map((q) => {
    const rfq = rfqById.get(q.rfqId);
    return {
      quote: q,
      current: !superseded.has(q.id),
      rfqNumber: rfq?.rfqNumber ?? q.rfqId,
      quoteNumber: q.id,
      material: rfq?.title ?? '—',
      submittedDate: formatDate(q.submittedAt),
      // COS-05, CLOSED (2e-c-2). These were unconditional `formatIDR`, so a
      // supplier who quoted USD 2.85 read their own bid back as "Rp 3" — the
      // platform overruling the currency the supplier had just chosen. Latent
      // until now only because `identitySources` seeds sup-007 alone; it goes
      // live the moment a foreign supplier has a persona, and this batch is what
      // makes foreign bids storable in the first place.
      //
      // A supplier must read their bid back in the SAME format the buyer scores
      // it in — one ruling, both surfaces — so this is the shared `formatMoney`,
      // not a second currency-aware formatter living on the supplier side.
      unitPrice: formatMoney(q.unitPrice, q.currency ?? BASE_CURRENCY),
      totalPrice: formatMoney(q.totalPrice, q.currency ?? BASE_CURRENCY),
      // 2e-b-3 (COS-07) — the day count goes through i18n's plural selection
      // like every other counted noun on this page (`rfqs.meta.event.*`), and
      // through `formatNumber` like every other quantity. It was raw string
      // interpolation: "1 days" in EN, and an ungrouped number for a lead time
      // long enough to need grouping. The buyer side already reads this axis
      // through a count form; the supplier's own record of the same quote did not.
      leadTime: t(
        q.leadTimeDays === 1 ? 'rfqs.quotes.leadTimeDays.one' : 'rfqs.quotes.leadTimeDays.other',
        { count: q.leadTimeDays, days: formatNumber(q.leadTimeDays) }
      ),
      // 2e-b-2 — the minimum the supplier stated, read back to them. An ABSENT
      // minimum renders the default it means ("same as RFQ qty"), never a 0 and
      // never a dash: the supplier said something, and it was "no minimum".
      moq:
        q.moq === undefined
          ? t('rfqs.quotes.moqNone')
          : `${formatNumber(q.moq)} ${rfq?.uom ?? ''}`.trim(),
      validUntil: formatDate(q.validUntil),
      status: q.status
    };
  });
};

/**
 * @typedef {object} AwardRow
 * @property {string} quotationId The quotation this outcome belongs to — the row's identity and React key.
 *   rfqNumber is not a safe key: nothing guarantees one decided quotation per
 *   RFQ for a supplier, and it falls back to rfqId when the RFQ is missing.
 * @property {string} rfqNumber
 * @property {string} material
 * @property {'Awarded' | 'Not Awarded'} result
 * @property {string} awardDate
 * @property {string} contractValue
 * @property {string} poIssued
 */

// Award outcome is a REAL read (batch iv): the supplier's own quotations that
// reached a terminal award decision (Awarded / Rejected via the RFQ-award
// cascade), joined to their RFQ for display. `poIssued` is honestly always '—' —
// award mints NO PO (PO issuance is a separate buyer verb, a future batch).
/**
 * @param {Quotation[]} quotations
 * @param {Map<string, RFQ>} rfqById
 * @returns {AwardRow[]}
 */
const buildAwardRows = (quotations, rfqById) =>
  quotations
    .filter((q) => q.status === 'Awarded' || q.status === 'Rejected')
    .map((q) => {
      const rfq = rfqById.get(q.rfqId);
      const won = q.status === 'Awarded';
      return {
        quotationId: q.id,
        rfqNumber: rfq?.rfqNumber ?? q.rfqId,
        material: rfq?.title ?? '—',
        result: won ? 'Awarded' : 'Not Awarded',
        awardDate: rfq ? formatDate(rfq.awardDeadline) : '—',
        // COS-05, same leg: an awarded foreign quote's contract value is stated
        // in the currency it was awarded in. Rupiah here would misprice the
        // award itself, which is the row a supplier is most likely to act on.
        contractValue: won ? formatMoney(q.totalPrice, q.currency ?? BASE_CURRENCY) : '—',
        poIssued: '—'
      };
    });

/** @typedef {'open' | 'quotes' | 'history'} TabKey */

/** @type {{ key: keyof OpenRFQ['evaluationCriteria']; labelKey: string; color: string; }[]} */
const EVAL_SEGMENTS = [
  // DP-2: single teal→navy ramp (chartPalette CHART_SERIES), not a rainbow.
  { key: 'price', labelKey: 'rfqs.eval.price', color: CHART_SERIES[0] },
  { key: 'leadTime', labelKey: 'rfqs.eval.leadTime', color: CHART_SERIES[1] },
  { key: 'reliability', labelKey: 'rfqs.eval.reliability', color: CHART_SERIES[2] }
];

/** @type {Record<string, LucideIcon>} */
const CHANNEL_ICON = {
  'Web Portal': Globe,
  Web: Globe,
  Email: Mail,
  WhatsApp: MessageCircle,
  API: Send
};

// CP-0 · W1 · 2e-a — each bid-price refusal names its own rule. A supplier who
// typed something unreadable, a supplier who typed nothing, and a supplier who
// typed 0 have made three different mistakes and need three different answers.
/** @type {Record<PriceRefusalReason, string>} */
const PRICE_REFUSAL_KEY = {
  EMPTY_QTY: 'rfqs.panel.price.refused.empty',
  NOT_NUMERIC: 'rfqs.panel.price.refused.notNumeric',
  AMBIGUOUS_QTY: 'rfqs.panel.price.refused.ambiguous',
  ZERO_PRICE: 'rfqs.panel.price.refused.zero'
};

// CP-0 · W1 · 2e-b-1a — the lead-time refusals. `EMPTY_QTY` is BACK: a blank is
// a refusal again, because a bid with no delivery promise is incomplete.
/** @type {Record<LeadTimeRefusalReason, string>} */
const LEAD_TIME_REFUSAL_KEY = {
  EMPTY_QTY: 'rfqs.panel.leadTime.refused.empty',
  NOT_NUMERIC: 'rfqs.panel.leadTime.refused.notNumeric',
  AMBIGUOUS_QTY: 'rfqs.panel.leadTime.refused.ambiguous',
  FRACTIONAL_DAYS: 'rfqs.panel.leadTime.refused.fractional'
};

// CP-0 · W1 · 2e-b-2 — the minimum-order-quantity refusals. There is no
// `EMPTY_QTY` entry because the type has no such member: a blank is this field's
// documented default ("same as RFQ qty"), so it is answered, not refused.
/** @type {Record<MoqRefusalReason, string>} */
const MOQ_REFUSAL_KEY = {
  NOT_NUMERIC: 'rfqs.panel.moq.refused.notNumeric',
  AMBIGUOUS_QTY: 'rfqs.panel.moq.refused.ambiguous',
  ZERO_MOQ: 'rfqs.panel.moq.refused.zero'
};

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

/**
 * @typedef {object} QuoteForm
 * @property {string} unitPrice
 * @property {BidCurrency} currency 2e-c-1 — narrowed from `string`. It was wider than the three options the
 *   select actually renders, so the type permitted currencies the UI never
 *   offered and the entity could never hold. It is now the same `BidCurrency`
 *   the options are generated from and the Quotation field is typed as: one
 *   list, one type, three places that cannot disagree.
 * @property {string} leadTimeNum
 * @property {LeadTimeUnit} leadTimeUnit The unit is half of what the typed lead-time number means, so the parse
 *   boundary takes it as a closed type rather than free text.
 * @property {boolean} sameDayAck -  The same-day (0-day) acknowledgement — see `requiresSameDayAck`.
 * @property {string} validUntil
 * @property {string} moq
 * @property {string} notes
 * @property {boolean | null} canSample -  RFx spec — the offer is saved now. `null` = not answered.
 * @property {string} sampleReadyDate
 * @property {string} paymentTermsOffered
 * @property {readonly DocumentDraft[]} documents -  NR-1 — the Documents section: the requested slots and "Other documents".
 */

/** @type {QuoteForm} */
const emptyQuoteForm = {
  unitPrice: '',
  currency: BASE_CURRENCY,
  leadTimeNum: '',
  leadTimeUnit: 'days',
  sameDayAck: false,
  validUntil: '',
  moq: '',
  notes: '',
  canSample: null,
  sampleReadyDate: '',
  paymentTermsOffered: '',
  documents: []
};

/** @type {React.FC<{ criteria: OpenRFQ['evaluationCriteria'] }>} */
const EvalBar = ({ criteria }) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden mb-2">
        {EVAL_SEGMENTS.map((seg) => (
          <div
            key={seg.key}
            style={{ width: `${criteria[seg.key]}%`, background: seg.color }}
            title={`${t(seg.labelKey)}: ${criteria[seg.key]}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {EVAL_SEGMENTS.map((seg) => (
          <span
            key={seg.key}
            className="inline-flex items-center gap-1.5 text-[10px] text-text-tertiary"
          >
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: seg.color }} />
            {t(seg.labelKey)} {criteria[seg.key]}%
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * @typedef {object} RFQCardProps
 * @property {OpenRFQ} rfq
 * @property {(rfq: OpenRFQ) => void} onSubmitQuote
 * @property {string} supplierId
 * @property {RfqEngagementView | undefined} engagement
 * @property {readonly RfqClarificationView[]} clarifications
 */

/** @type {React.FC<RFQCardProps>} */
const RFQCard = ({ rfq, onSubmitQuote, supplierId, engagement, clarifications }) => {
  const { t } = useTranslation();
  const quoteAvailability = useVerbAvailability('quotation:submit');
  const [expanded, setExpanded] = useState(false);
  const [asking, setAsking] = useState(false);
  const urgent = rfq.daysRemaining <= 7;
  const Icon = CHANNEL_ICON[rfq.receivedVia] ?? Inbox;
  const accentClass = urgent ? 'border-l-warning' : 'border-l-teal';
  const reqs = rfq.specialRequirements;
  const showLongReqs = reqs.text.length > 80;
  const items = rfq.rfq.items ?? [];
  const tiered = items.length > 0;
  const intent = engagement?.intent?.intent;
  const declined = intent === 'decline';
  // RFx spec 2026-09-21 — on the rebuilt (tiered) RFQ the supplier first says
  // it will respond, and on a confidential one accepts the terms, before the
  // quote grid opens. A legacy RFQ keeps today's single-price entrance: quoting
  // it is itself the statement of intent.
  const termsOpen = !rfq.rfq.confidential || Boolean(engagement?.confidentialityAcceptedAt);
  const quoteReady = !declined && (!tiered || (intent === 'respond' && termsOpen));

  return (
    <div
      className={`bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-4 border-l-2 ${accentClass} overflow-hidden`}
      data-testid={`rfq-card-${rfq.id}`}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle flex-wrap">
        <Data className="text-sm font-bold text-text-primary">{rfq.rfqNumber}</Data>
        <StatusPill variant={urgent ? 'warning' : 'info'}>
          {urgent
            ? t('rfqs.card.daysRemaining', { count: rfq.daysRemaining })
            : t('rfqs.card.daysToDeadline', { count: rfq.daysRemaining })}
        </StatusPill>
        {rfq.rfq.projectName && <StatusPill variant="neutral">{rfq.rfq.projectName}</StatusPill>}
        {rfq.rfq.confidential && (
          <StatusPill variant="neutral">
            <Lock size={11} className="mr-1" />
            {t('rfqResponse.card.confidential')}
          </StatusPill>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-text-tertiary">
          <Icon size={12} />
          {t('rfqs.card.via', { channel: rfq.receivedVia })}
        </span>
        <span className="text-xs text-text-tertiary">
          {t('rfqs.card.received', { date: rfq.receivedDate })}
        </span>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="text-base font-bold text-text-primary">{rfq.material}</span>
          <StatusPill variant="info">{rfq.category}</StatusPill>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-tertiary mb-3">
          <span>
            {t('rfqs.card.qty')} <strong className="text-text-primary">{rfq.qty}</strong>
          </span>
          <span>
            {t('rfqResponse.card.delivery')}{' '}
            <strong className="text-text-primary">{rfq.delivery || '—'}</strong>
          </span>
          <span>
            {t('rfqResponse.card.awardBy')}{' '}
            <strong className="text-text-primary">{rfq.awardBy}</strong>
          </span>
          <span>
            {t('rfqs.card.deadline')}{' '}
            <strong className={urgent ? 'text-danger' : 'text-text-primary'}>{rfq.deadline}</strong>
          </span>
        </div>

        {tiered && (
          <ul className="mb-3 space-y-1 text-xs" data-testid={`rfq-items-${rfq.id}`}>
            {items.map((item) => (
              <li key={item.lineNo} className="flex flex-wrap gap-x-2">
                <span className="font-semibold text-text-primary">{item.description}</span>
                <span className="text-text-tertiary">
                  {t('rfqResponse.grid.variants', { count: item.variantCount, uom: item.uom })}
                </span>
                <span className="text-text-tertiary">
                  {t('rfqResponse.card.breaks')}{' '}
                  <Data>
                    {tiersForItem(rfq.rfq, item)
                      .map((b) => formatNumber(b.qty))
                      .join(' / ')}
                  </Data>{' '}
                  {t(
                    tiersForItem(rfq.rfq, item)[0]?.basis === 'perVariant'
                      ? 'rfqResponse.basis.perVariant'
                      : 'rfqResponse.basis.total'
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="bg-bg-hover rounded-md px-3 py-2 mb-3">
          <div className="text-label text-text-tertiary uppercase mb-1 flex items-center gap-2">
            {t('rfqs.card.specialReqs')}
            {/* Still illustrative where the RFQ states nothing of its own. */}
            {reqs.sample && (
              <StatusPill variant="neutral">{t('rfqs.card.sampleDetail')}</StatusPill>
            )}
          </div>
          <div className="text-xs text-text-secondary leading-relaxed">
            {expanded || !showLongReqs ? reqs.text : reqs.text.slice(0, 80) + '…'}
          </div>
          {showLongReqs && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs font-semibold text-teal-hover hover:text-teal-hover inline-flex items-center gap-1"
            >
              {expanded ? (
                <>
                  {t('rfqs.card.showLess')} <ChevronUp size={11} />
                </>
              ) : (
                <>
                  {t('rfqs.card.showMore')} <ChevronDown size={11} />
                </>
              )}
            </button>
          )}
        </div>

        <div className="mb-4">
          <div className="text-label text-text-tertiary uppercase mb-2">
            {t('rfqs.card.evalCriteria')}
          </div>
          {/* The REAL scoring (CR-15, after the CR-23 gate) — the weights PTI's
              comparison actually applies. The invented five-way split that
              stood here ("Quality 25%, Sustainability 10%…") is gone. */}
          <EvalBar criteria={rfq.evaluationCriteria} />
          <p className="text-xs text-text-tertiary mt-1" data-testid={`rfq-eval-gate-${rfq.id}`}>
            {t('rfqs.eval.gate')}
          </p>
        </div>

        <div className="mb-3 space-y-3">
          <RfqConfidentialityGate rfq={rfq.rfq} supplierId={supplierId} engagement={engagement} />
          <RfqIntentControls
            rfq={rfq.rfq}
            supplierId={supplierId}
            engagement={engagement}
            hasQuote={false}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* ⚠️ `quotation:submit` IS COMMERCIAL'S. A fulfilment or back-office
              seat reads the wait with the lane named, in the slot the button
              occupied — the ENTRY into the quote panel, so the panel's own
              commit stays unreachable behind one statement rather than two. */}
          {!declined &&
            (quoteAvailability.kind === 'held' ? (
              quoteReady ? (
                <Button variant="outline" onClick={() => onSubmitQuote(rfq)}>
                  {t('rfqs.card.submitQuote')}
                </Button>
              ) : (
                <span className="text-xs text-text-tertiary" data-testid={`quote-waits-${rfq.id}`}>
                  {t(
                    intent === 'respond'
                      ? 'rfqResponse.card.acceptFirst'
                      : 'rfqResponse.card.respondFirst'
                  )}
                </span>
              )
            ) : (
              <HandoffNotice availability={quoteAvailability} testId="handoff-quotation-submit" />
            ))}
          {/* Opening the question box holds no atom; SENDING a question does,
              and the box says whose act it is when this seat cannot. */}
          <Button variant="secondary" icon={MessageSquare} onClick={() => setAsking(!asking)}>
            {t('rfqs.card.askQuestion')}
          </Button>
        </div>
        <div className="mt-3">
          <RfqClarifications
            rfq={rfq.rfq}
            supplierId={supplierId}
            clarifications={clarifications}
            open={asking}
            onToggle={() => setAsking(!asking)}
          />
        </div>
      </div>
    </div>
  );
};

/** @type {React.FC<{ rfqs: OpenRFQ[]; onSubmitQuote: (rfq: OpenRFQ) => void; supplierId: string; engagementByRfq: Map<string, RfqEngagementView>; clarifications: readonly RfqClarificationView[]; }>} */
const OpenRFQsTab = ({ rfqs, onSubmitQuote, supplierId, engagementByRfq, clarifications }) => {
  const { t } = useTranslation();
  if (rfqs.length === 0) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
          <Inbox size={20} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          {t('rfqs.open.emptyTitle')}
        </div>
        <div className="text-sm text-text-tertiary">{t('rfqs.open.emptyBody')}</div>
      </div>
    );
  }
  return (
    <div>
      {rfqs.map((rfq) => (
        <RFQCard
          key={rfq.id}
          rfq={rfq}
          onSubmitQuote={onSubmitQuote}
          supplierId={supplierId}
          engagement={engagementByRfq.get(rfq.id)}
          clarifications={clarifications}
        />
      ))}
    </div>
  );
};

/**
 * `canRevise`:  Whether a version can still be revised: current, and its RFQ still open.
 * @type {React.FC<{ quotes: SubmittedQuote[]; canRevise: (q: SubmittedQuote) => boolean; onRevise: (q: SubmittedQuote) => void; }>}
 */
const MyQuotesTab = ({ quotes, canRevise, onRevise }) => {
  const { t } = useTranslation();
  const quoteAvailability = useVerbAvailability('quotation:submit');

  if (quotes.length === 0) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
          <Send size={20} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          {t('rfqs.quotes.emptyTitle')}
        </div>
        <div className="text-sm text-text-tertiary">{t('rfqs.quotes.emptyBody')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {quotes.map((q) => (
        <div
          key={q.quoteNumber}
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm border-l-2 border-l-teal p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Data className="text-sm font-bold text-text-primary">{q.rfqNumber}</Data>
                <Data className="text-xs bg-bg-hover text-text-secondary rounded-full px-2 py-0.5 font-semibold">
                  {q.quoteNumber}
                </Data>
              </div>
              <div className="text-base font-semibold text-text-primary mt-1">{q.material}</div>
            </div>
            {/* Status only — a competitive score/rank needs the sibling set that
                per-supplier scoping hides (3b-C); the supplier never sees it. */}
            <div className="flex items-center gap-2">
              {!q.current && (
                <StatusPill variant="neutral">{t('rfqResponse.quotes.superseded')}</StatusPill>
              )}
              <StatusPill variant="neutral">{q.status}</StatusPill>
              {/* RFx spec — revising before the deadline mints a new version
                  that names this one; every version is kept (AC-03). */}
              {canRevise(q) &&
                (quoteAvailability.kind === 'held' ? (
                  <Button
                    variant="outline"
                    data-testid={`revise-${q.quoteNumber}`}
                    onClick={() => onRevise(q)}
                  >
                    {t('rfqResponse.quotes.revise')}
                  </Button>
                ) : (
                  <HandoffNotice
                    availability={quoteAvailability}
                    testId="handoff-quotation-submit"
                  />
                ))}
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {[
              { label: t('rfqs.quotes.col.quoteNo'), value: q.quoteNumber },
              { label: t('rfqs.quotes.col.submitted'), value: q.submittedDate },
              { label: t('rfqs.quotes.col.unitPrice'), value: q.unitPrice },
              { label: t('rfqs.quotes.col.totalPrice'), value: q.totalPrice },
              { label: t('rfqs.quotes.col.leadTime'), value: q.leadTime },
              // 2e-b-2 — the minimum order quantity appears here for the first
              // time. It was collected on the form and dropped before this card
              // existed, so the supplier's own record of their quote silently
              // omitted a term they had stated.
              { label: t('rfqs.quotes.col.moq'), value: q.moq },
              { label: t('rfqs.quotes.col.validUntil'), value: q.validUntil }
            ].map((d) => (
              <div key={d.label} className="bg-bg-hover rounded-md px-3 py-2">
                <dt className="text-label text-text-tertiary uppercase mb-0.5">{d.label}</dt>
                <Data as="dd" className="text-sm font-semibold text-text-primary">
                  {d.value}
                </Data>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
};

/** @type {React.FC<{ rows: AwardRow[] }>} */
const AwardsTab = ({ rows }) => {
  const { t } = useTranslation();
  const awarded = rows.filter((r) => r.result === 'Awarded').length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((awarded / total) * 100) : 0;

  if (total === 0) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
          <Trophy size={20} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          {t('rfqs.awards.emptyTitle')}
        </div>
        <div className="text-sm text-text-tertiary">{t('rfqs.awards.emptyBody')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfqs.awards.col.rfq')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.result')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.awardDate')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('rfqs.awards.col.contractValue')}
            </TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.poIssued')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.notes')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {rows.map((row) => (
              <TableRow key={row.quotationId}>
                <TableCell>
                  <Data className="text-xs font-bold text-text-primary">{row.rfqNumber}</Data>
                </TableCell>
                <TableCell className="text-text-primary">{row.material}</TableCell>
                <TableCell>
                  <StatusPill variant={row.result === 'Awarded' ? 'success' : 'neutral'}>
                    {row.result}
                  </StatusPill>
                </TableCell>
                <TableCell className="text-text-tertiary text-sm whitespace-nowrap">
                  <Data>{row.awardDate}</Data>
                </TableCell>
                <TableCell
                  className={`text-right font-semibold whitespace-nowrap ${
                    row.contractValue !== '—' ? 'text-success' : 'text-text-tertiary'
                  }`}
                >
                  <Data>{row.contractValue}</Data>
                </TableCell>
                <TableCell
                  className={`text-xs ${row.poIssued !== '—' ? 'text-info' : 'text-text-tertiary'}`}
                >
                  <Data>{row.poIssued}</Data>
                </TableCell>
                <TableCell className="text-xs text-text-secondary max-w-[16rem]">
                  {t(row.result === 'Awarded' ? 'rfqs.awards.note.won' : 'rfqs.awards.note.lost')}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm px-5 py-4 flex items-center gap-5 flex-wrap">
        <div className="flex-1 min-w-[16rem]">
          <div className="text-sm text-text-primary mb-2">
            <strong>
              {t(total === 1 ? 'rfqs.awards.winRate.one' : 'rfqs.awards.winRate.other', {
                awarded,
                total,
                pct
              })}
            </strong>
          </div>
          <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="text-center shrink-0">
          <div className="text-kpi font-mono tabular-nums text-success">{pct}%</div>
          <div className="text-xs text-text-tertiary">{t('rfqs.awards.winRateLabel')}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * CR-15's weights as percentages — read from the policy, never restated.
 * @type {OpenRFQ['evaluationCriteria']}
 */
const EVAL_WEIGHTS = {
  price: Math.round(CRITERIA_WEIGHTS.price * 100),
  leadTime: Math.round(CRITERIA_WEIGHTS.leadTime * 100),
  reliability: Math.round(CRITERIA_WEIGHTS.reliability * 100)
};

// Adapter: canonical RFQ → the page's OpenRFQ display shape. Real fields come
// from the read (number, material, category, qty, deadline, received date);
// the evaluation weights are the platform's own CR-15 policy (`CRITERIA_WEIGHTS`);
// the detail the RFQ entity does NOT carry — special requirements on a legacy
// RFQ, received-via — is illustrative sample, flagged with a "Sample detail"
// pill (partial migration).
// ⚠️ `RFQ_TODAY_MS = new Date('2026-04-25')` IS DELETED. It was the SECOND pin
// in this app and it disagreed with `BuyerSourcing`'s by 23 days, so the same
// RFQ deadline produced two different day-counts depending on which persona was
// looking. `now` is injected from the component and the arithmetic lives in
// `services/data/dayProjection`.
//
// ⚠️ **THE `Math.max(0, …)` CLAMP IS PRESERVED VERBATIM AND IS NOT DEFENDED.**
// It is behaviour this batch did not rule on, and changing it here would hide a
// second defect inside a clock fix. With the pin gone the clamp is now visible
// for what it is: a deadline 111 days past renders "0 days remaining", which
// reads as *due today*. Filed, not fixed.
/**
 * What the RFQ itself asks beyond the price. Real where the rebuilt RFQ carries
 * it (item notes, samples requested, alternatives allowed); a legacy RFQ states
 * none of it, so the card keeps the illustrative line and marks it sample.
 * @param {RFQ} r
 * @param {TFunction} t
 * @returns {OpenRFQ['specialRequirements']}
 */
const specialRequirementsOf = (r, t) => {
  const parts = [
    ...(r.items ?? []).filter((i) => i.note).map((i) => `${i.description}: ${i.note}`),
    ...(r.samplesRequested
      ? [
          t('rfqResponse.card.samplesRequested', {
            qty: formatNumber(r.samplesRequested.qty),
            date: formatDate(r.samplesRequested.neededBy)
          })
        ]
      : []),
    ...(r.allowAlternatives ? [t('rfqResponse.card.alternativesAllowed')] : [])
  ];
  return parts.length > 0
    ? { text: parts.join(' · '), sample: false }
    : { text: t('rfqResponse.card.sampleRequirements'), sample: true };
};

/**
 * @param {RFQ} r
 * @param {string} nowIso
 * @param {TFunction} t
 * @returns {OpenRFQ}
 */
const toOpenRfq = (r, nowIso, t) => {
  const daysRemaining = Math.max(0, daysUntil(r.responseDeadline, nowIso) ?? 0);
  return {
    id: r.id,
    rfqNumber: r.rfqNumber,
    material: r.title,
    category: r.materialCategory,
    // 2e-b-3 (COS-02) — `formatNumber` (pinned id-ID), not bare
    // `toLocaleString()`, whose grouping followed the RUNTIME locale. The same
    // card rendered this quantity one way and the minimum order quantity
    // another (`formatNumber`, 40 lines below), so two quantities side by side
    // could disagree about what a thousands separator looks like.
    qty: `${formatNumber(r.totalQty)} ${r.uom}`,
    // The quantity as the NUMBER it is, carried alongside its display form so
    // the total-price preview never has to parse `qty` back out of its own
    // formatting (CP-0 2e-a).
    totalQty: r.totalQty,
    rfq: r,
    // RFx spec 2026-09-21 — the delivery terms are the RFQ's own incoterms; the
    // hard-coded warehouse that stood here was sample text on every card.
    delivery: r.incoterms,
    awardBy: r.awardDeadline,
    deadline: r.responseDeadline,
    daysRemaining,
    specialRequirements: specialRequirementsOf(r, t),
    evaluationCriteria: EVAL_WEIGHTS,
    status: r.status === 'Open' ? 'Open — Awaiting Your Quote' : r.status,
    receivedVia: 'Web Portal',
    receivedDate: r.createdAt
  };
};

/**
 * @typedef {object} RfqWorkspaceProps
 * @property {Supplier} mySupplier
 * @property {string} supplierId
 * @property {OpenRFQ[]} initialRfqs
 * @property {Quotation[]} quotations
 * @property {Map<string, RFQ>} rfqById
 * @property {AwardRow[]} awardRows
 * @property {string} nowIso
 */

/** @type {React.FC<RfqWorkspaceProps>} */
const RfqWorkspace = ({
  mySupplier,
  supplierId,
  initialRfqs,
  quotations,
  rfqById,
  awardRows,
  nowIso
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  // The eyebrow is the menu section alone (the `PageHeader` rule).
  const crumb = [t('hub.nav.section.sourcing')];
  const submitMutation = useQuotationSubmit();
  const [activeTab, setActiveTab] = useState(/** @type {TabKey} */ ('open'));
  const quoteAvailability = useVerbAvailability('quotation:submit');
  const [quotePanelRFQ, setQuotePanelRFQ] = useState(/** @type {OpenRFQ | null} */ (null));
  // ⚠️ **THE PANEL IS DERIVED, NOT READ — `SupplierOrders.effectivePanelMode`'s
  // CONSTRUCTION, NOT A SECOND ONE.** `quotation:submit` is COMMERCIAL's, and
  // the entrance is correctly guarded: `RFQCard` renders the handoff notice in
  // the button's own slot for a seat that does not hold it. But the OPEN panel
  // is component state in THIS component, and component state outlives the
  // seat — a seat narrowed WHILE the panel stands open kept a live `submitQuote`
  // behind a door that was already shut. Reachable, not a dead branch, and
  // `SupplierShipments` states the same reason for gating its wizard TAB rather
  // than the button that opens it.
  //
  // Collapsing to `null` answers every entrance in ONE statement and keeps §76
  // intact: the seat lands back on the card, where the notice for this verb
  // ALREADY IS, rather than meeting a second one inside the panel. `open=`, the
  // title, the body and `submitQuote`'s own early return all read the derived
  // value, so there is no door left that reads the raw one. The raw state is
  // left alone rather than cleared: a seat that is widened again finds its
  // panel where it left it, which is `effectivePanelMode`'s behaviour too.
  const effectiveQuotePanelRFQ = quoteAvailability.kind === 'held' ? quotePanelRFQ : null;
  const [form, setForm] = useState(/** @type {QuoteForm} */ (emptyQuoteForm));
  // RFx spec 2026-09-21 — the tiered grid's own state, and the version a
  // revision supersedes (absent on a first quote).
  const [tieredDraft, setTieredDraft] = useState(/** @type {TieredDraft | null} */ (null));
  const [supersedes, setSupersedes] = useState(/** @type {string | null} */ (null));
  const [gridRefusal, setGridRefusal] = useState(/** @type {string | null} */ (null));
  const engagementQuery = useRfqEngagement();
  const clarificationsQuery = useRfqClarifications();
  const engagementByRfq = useMemo(
    () =>
      new Map((engagementQuery.data?.items ?? []).map((e) => /** @type {const} */ ([e.rfqId, e]))),
    [engagementQuery.data]
  );
  const clarifications = clarificationsQuery.data?.items ?? [];
  const panelTiered = (effectiveQuotePanelRFQ?.rfq.items ?? []).length > 0;

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

  /** @param {OpenRFQ} rfq */
  const handleSubmitQuote = (rfq) => {
    setQuotePanelRFQ(rfq);
    setForm({ ...emptyQuoteForm, paymentTermsOffered: rfq.rfq.paymentTerms });
    setTieredDraft((rfq.rfq.items ?? []).length > 0 ? emptyTieredDraft(rfq.rfq) : null);
    setSupersedes(null);
    setGridRefusal(null);
  };

  // RFx spec — revising before the deadline: the panel opens on the supplier's
  // own last version, and the new one names it (`supersedesQuotationId`).
  /**
   * @param {SubmittedQuote} q
   * @returns {boolean}
   */
  const canRevise = (q) => {
    const rfq = rfqById.get(q.quote.rfqId);
    return (
      q.current &&
      (q.status === 'Submitted' || q.status === 'Under Review') &&
      rfq?.status === 'Open' &&
      (daysUntil(rfq.responseDeadline, nowIso) ?? -1) >= 0
    );
  };
  /** @param {SubmittedQuote} q */
  const handleRevise = (q) => {
    const rfq = rfqById.get(q.quote.rfqId);
    if (!rfq) return;
    setQuotePanelRFQ(toOpenRfq(rfq, nowIso, t));
    setForm({
      ...emptyQuoteForm,
      unitPrice: String(q.quote.unitPrice),
      currency: q.quote.currency ?? BASE_CURRENCY,
      leadTimeNum: String(q.quote.leadTimeDays),
      validUntil: q.quote.validUntil,
      moq: q.quote.moq === undefined ? '' : String(q.quote.moq),
      notes: q.quote.notes ?? '',
      paymentTermsOffered: q.quote.paymentTermsOffered,
      canSample: q.quote.sampleOffer ? q.quote.sampleOffer.canSample : null,
      sampleReadyDate: q.quote.sampleOffer?.readyDate ?? '',
      // A quote from before NR-1 carries `attachments`: read as documents.
      documents: documentsOf(q.quote)
    });
    setTieredDraft((rfq.items ?? []).length > 0 ? draftFromQuote(rfq, q.quote) : null);
    setSupersedes(q.quote.id);
    setGridRefusal(null);
  };

  // ── CP-0 · W1 · 2e-a — the ONE read of the bid price ──────────────────────
  // The total preview, the submit gate, and the dispatched payload ALL read this
  // one result. Before, each re-read `form.unitPrice` with its own recipe, so the
  // number the supplier was shown, the number the gate approved, and the number
  // the award engine ranked could be three different numbers.
  const bidPrice = readBidPrice(form.unitPrice);

  // CP-0 · W1 · 2e-b-1 — the ONE read of the lead time. Four states, and the
  // hard gate: a stated 0 is legal and BEST on the axis, so it may not reach the
  // payload until the supplier affirms they meant same-day. Blank owes nothing.
  const leadTime = readLeadTimeDays(form.leadTimeNum, form.leadTimeUnit);
  const sameDayAckOwed = leadTime.ok && leadTime.requiresSameDayAck && !form.sameDayAck;

  // CP-0 · W1 · 2e-b-2 — the ONE read of the minimum order quantity. Blank is
  // LEGAL and resolves to an absence; only a stated-but-unreadable minimum
  // blocks, because a constraint nobody can read is worse than the default it
  // would otherwise fall back to.
  const moq = readMoq(form.moq);

  const submitBlocked = !leadTime.ok || sameDayAckOwed || !moq.ok;

  // A price nobody can read has no total. The preview is only ASKABLE of a price
  // that exists — it never renders a product of a guessed value. The RFQ quantity
  // is the NUMBER it already is; it used to be re-parsed out of the formatted
  // display string ("200,000 PCS" → strip → 200000), a fact round-tripping
  // through its own presentation.
  //
  // 2e-b-3 (COS-01) — the DISPLAY half of the :686 residue. The parse half
  // closed at 2e-a; this `.toLocaleString()` is the retired expression's last
  // surviving fragment, and its grouping followed the RUNTIME locale rather than
  // the app's. `formatNumber` pins id-ID, as every other quantity on the page does.
  //
  // COS-01 (label half), CLOSED (2e-c-2). 2e-b-3 fixed the GROUPING half and
  // deliberately stopped short of `formatIDR`, because the value was labelled
  // with `form.currency` — a label the payload then discarded, so hardcoding
  // "Rp" would have made the platform contradict itself. The register entry said
  // it plainly: "the label cannot be made honest until the field it names
  // survives the submit." It survives now, so the preview renders through the
  // same currency-aware formatter as the stored quote and the buyer's
  // comparison — one rendering of a bid, from preview to award.
  const totalPrice =
    effectiveQuotePanelRFQ && bidPrice.ok
      ? formatMoney(bidPrice.value * effectiveQuotePanelRFQ.totalQty, form.currency)
      : '—';

  // REAL submit — dispatches t_quotation_submit through the command spine (the
  // ONE supplier-owned creation verb). Persists RAW FACTS only; the engine scores
  // at read (#78). On a non-failed outcome the hook invalidates → the supplier's
  // quotations re-read, the quote lands in My-Quotes, and its RFQ leaves the open
  // list. Replaces the retired local-state masquerade.
  /**
   * Dispatch a built payload and say what the verb decided.
   * @param {Record<string, unknown>} payload
   * @param {string} rfqNumber
   * @param {string} deadline
   */
  const dispatchQuote = async (payload, rfqNumber, deadline) => {
    try {
      const res = await submitMutation.mutateAsync({ payload });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('rfqs.toast.submitFailed.title'),
          description: isCurrencyRefusal(res.reason)
            ? t('rfqs.toast.currencyRefused.body', {
                currency: String(payload.currency),
                permitted: BID_CURRENCIES.join(', ')
              })
            : (refusalText(res.reason) ??
              rfqResponseRefusal(t, res.reason ?? '') ??
              t('rfqs.toast.submitFailed.body'))
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('rfqs.toast.submitted.title', { rfq: rfqNumber }),
        description: t('rfqs.toast.submitted.body', { date: deadline })
      });
      setQuotePanelRFQ(null);
      setForm(emptyQuoteForm);
      setTieredDraft(null);
      setSupersedes(null);
      setActiveTab('quotes');
    } catch {
      toast({
        variant: 'error',
        title: t('rfqs.toast.submitFailed.title'),
        description: t('rfqs.toast.submitFailed.body')
      });
    }
  };

  // RFx spec 2026-09-21 — THE TIERED SUBMIT. One read of the grid
  // (`readTieredDraft`), judged by the verb's own rule; a refusal is said on the
  // panel, naming the item, and nothing is sent.
  const submitTiered = async () => {
    if (!effectiveQuotePanelRFQ || !tieredDraft) return;
    const read = readTieredDraft(effectiveQuotePanelRFQ.rfq, supplierId, tieredDraft, (id) =>
      t(`rfqAuthoring.cost.${id}`)
    );
    if (!read.ok) {
      setGridRefusal(read.reason);
      return;
    }
    setGridRefusal(null);
    await dispatchQuote(
      { ...read.payload, ...(supersedes ? { supersedesQuotationId: supersedes } : {}) },
      effectiveQuotePanelRFQ.rfqNumber,
      effectiveQuotePanelRFQ.deadline
    );
  };

  const submitQuote = async () => {
    if (!effectiveQuotePanelRFQ) return;
    if (panelTiered) return submitTiered();
    // The price gate fires FIRST and alone, and it BLOCKS: a price that cannot be
    // read — or a zero, which reads fine but is not a bid — must never become a
    // submitted quotation, because a submitted quotation is immediately a
    // scoreable fact that re-anchors every rival's price score. The refusal is
    // named rather than folded into the generic "required fields missing" list:
    // "we cannot tell which number you mean" and "zero is not a price" ask the
    // supplier for different things, and neither is "you left this blank".
    if (!bidPrice.ok) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.priceRefused.title'),
        description: t(PRICE_REFUSAL_KEY[bidPrice.reason])
      });
      return;
    }
    // The lead-time gate. It used to be a `parseFloat(...) > 0` presence check
    // that only ever said "you left this blank" — so an unreadable lead time
    // fell through to `Number(...) || 0` and became a 0-day promise, the best
    // score on the axis. Blank is deliberately NOT gated here: it is legal.
    if (!leadTime.ok) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.leadTimeRefused.title'),
        description: t(LEAD_TIME_REFUSAL_KEY[leadTime.reason])
      });
      return;
    }
    // The hard gate on a stated 0. The submit control is disabled while the ack
    // is owed; this is the second lock, so a programmatic or race-y submit
    // cannot slip a same-day commitment through unaffirmed.
    if (sameDayAckOwed) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.sameDayAck.title'),
        description: t('rfqs.toast.sameDayAck.body')
      });
      return;
    }
    // The minimum-order-quantity gate (2e-b-2). It fires ONLY on a stated value
    // that cannot be read — a blank falls through, because blank is the field's
    // answer, not its absence. Refusing rather than dropping is the whole point:
    // the retired path discarded every value here, readable or not.
    if (!moq.ok) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.moqRefused.title'),
        description: t(MOQ_REFUSAL_KEY[moq.reason])
      });
      return;
    }
    // NR-1 BR-03 to BR-05 — the rule `quotation_documents_complete` binds,
    // said before anything is sent; the section names the slot too.
    const documentRefusal = responseDocumentsRefusal(
      effectiveQuotePanelRFQ.rfq.documentRequests ?? [],
      form.documents,
      0
    );
    if (documentRefusal) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.submitFailed.title'),
        description: rfqResponseRefusal(t, documentRefusal)
      });
      return;
    }
    /** @type {string[]} */
    const missing = [];
    if (!form.validUntil.trim()) missing.push(t('rfqs.field.validUntil'));
    if (missing.length > 0) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.missing.title'),
        description: t('rfqs.toast.missing.body', { fields: missing.join(', ') })
      });
      return;
    }
    const payload = buildQuotationSubmitPayload({
      rfqId: effectiveQuotePanelRFQ.id,
      supplierId,
      // The SAME parsed value the gate above judged — the builder can no longer
      // re-read the string and reach a different number (CP-0 §4).
      unitPrice: bidPrice.value,
      // 2e-c-2 — the argument that makes the price a price (see the draft type).
      currency: form.currency,
      // The days/weeks conversion already happened inside the ONE parse above.
      leadTimeDays: leadTime.days,
      // The SAME parsed value the gate above judged (2e-b-2).
      moq: moq.moq,
      validUntil: form.validUntil,
      // RFx spec 2026-09-21 — payment terms offered are a real field now. They
      // were always sent as `''`.
      paymentTermsOffered: form.paymentTermsOffered.trim(),
      notes: form.notes
    });
    await dispatchQuote(
      {
        ...payload,
        // RFx spec 2026-09-21 — the sample offer is SAVED now (it was collected
        // and dropped). NR-1 — the files travel as `documents` (B4).
        ...(form.canSample !== null
          ? {
              sampleOffer: form.canSample
                ? {
                    canSample: true,
                    ...(form.sampleReadyDate ? { readyDate: form.sampleReadyDate } : {})
                  }
                : { canSample: false }
            }
          : {}),
        ...(form.documents.length > 0 ? { documents: form.documents.map((d) => ({ ...d })) } : {}),
        ...(supersedes ? { supersedesQuotationId: supersedes } : {})
      },
      effectiveQuotePanelRFQ.rfqNumber,
      effectiveQuotePanelRFQ.deadline
    );
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('rfqs.header.title')}
        count={openCount}
        subtitle={t('rfqs.header.subtitle', { supplier: mySupplier.name })}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {openCount} {t(openCount !== 1 ? 'rfqs.meta.event.other' : 'rfqs.meta.event.one')} ·{' '}
        {submittedCount} {t(submittedCount !== 1 ? 'rfqs.meta.quote.other' : 'rfqs.meta.quote.one')}
        {/* D-CENSUS-8 — PARTLY REAL, both axes. Quotation submit dispatches through
            the wired `quotation` target and drives the real RFQ→award cascade; the
            RFQs being answered are fixtures. */}
        <ProvenanceMarker capability="rfqs" className="ml-3 align-middle" />
      </PageMetaLine>

      {/* The supplier's negotiation thread sits under this module (its route is
          /supplier/rfq/rounds), so it is reached from here and the RFQ menu item
          stays highlighted on it (NV-03). */}
      <div className="flex justify-end mb-4">
        <Link
          to="/supplier/rfq/rounds"
          className="text-sm text-action hover:underline"
          data-testid="rfq-rounds-link"
        >
          {t('rfqs.rounds.link')}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <KpiCard
          eyebrow={t('rfqs.kpi.open.eyebrow')}
          value={openCount.toString()}
          subtitle={t('rfqs.kpi.open.subtitle')}
          icon={Inbox}
        />
        <KpiCard
          eyebrow={t('rfqs.kpi.submitted.eyebrow')}
          value={submittedCount.toString()}
          subtitle={t('rfqs.kpi.submitted.subtitle')}
          icon={Send}
        />
        <KpiCard
          eyebrow={t('rfqs.kpi.award.eyebrow')}
          value={awaitingCount.toString()}
          subtitle={<span className="text-warning-hover">{t('rfqs.kpi.award.subtitle')}</span>}
          icon={Trophy}
        />
      </div>

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
          onSubmitQuote={handleSubmitQuote}
          supplierId={supplierId}
          engagementByRfq={engagementByRfq}
          clarifications={clarifications}
        />
      )}
      {activeTab === 'quotes' && (
        <MyQuotesTab quotes={submittedQuotes} canRevise={canRevise} onRevise={handleRevise} />
      )}
      {activeTab === 'history' && <AwardsTab rows={awardRows} />}

      <SidePanel
        open={effectiveQuotePanelRFQ !== null}
        onClose={() => setQuotePanelRFQ(null)}
        title={
          effectiveQuotePanelRFQ
            ? t('rfqs.panel.title', { rfq: effectiveQuotePanelRFQ.rfqNumber })
            : ''
        }
        // ⚠️ **THE FOOTER IS MOUNTED BY THE DERIVED VALUE, NOT BY `open`, BECAUSE
        //    `SidePanel` KEEPS ITS SUBTREE IN THE DOM WHEN CLOSED.** Closing is a
        //    `translate-x-full` plus `aria-hidden` — the overlay takes
        //    `pointer-events-none`, the `aside` does not — so a "closed" panel
        //    still holds a live, clickable submit button. Deriving `open=` alone
        //    would have moved the commit off-screen and called it gated, which is
        //    the same shape as gating one door out of three. The BODY below was
        //    already conditional; the footer now matches it.
        footerActions={
          effectiveQuotePanelRFQ ? (
            <>
              <Button variant="secondary" onClick={() => setQuotePanelRFQ(null)}>
                {t('rfqs.panel.cancel')}
              </Button>
              <Button
                variant="outline"
                icon={Send}
                // 2e-b-1 — disabled while an unreadable lead time stands, and
                // while a same-day acknowledgement is owed. `submitQuote` re-checks
                // both; this is the visible half of the same gate.
                disabled={submitMutation.isPending || (!panelTiered && submitBlocked)}
                onClick={submitQuote}
              >
                {submitMutation.isPending ? t('rfqs.panel.submitting') : t('rfqs.panel.submit')}
              </Button>
            </>
          ) : undefined
        }
      >
        {effectiveQuotePanelRFQ && (
          <div className="space-y-5">
            <section className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3">
              <div className="text-sm font-semibold text-text-primary">
                {effectiveQuotePanelRFQ.material}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-tertiary">
                <span>
                  {t('rfqs.card.qty')}{' '}
                  <strong className="text-text-primary">{effectiveQuotePanelRFQ.qty}</strong>
                </span>
                <span>
                  {t('rfqs.card.deadline')}{' '}
                  <strong
                    className={
                      effectiveQuotePanelRFQ.daysRemaining <= 7
                        ? 'text-danger'
                        : 'text-text-primary'
                    }
                  >
                    {effectiveQuotePanelRFQ.deadline}
                  </strong>
                </span>
              </div>
            </section>

            {supersedes && (
              <p className="text-xs text-text-secondary" data-testid="quote-revision-note">
                {t('rfqResponse.quotes.revising', { quote: supersedes })}
              </p>
            )}
            {panelTiered && tieredDraft && (
              <>
                {gridRefusal && (
                  <div
                    role="alert"
                    data-testid="grid-refusal"
                    className="text-sm text-danger border-l-2 border-danger pl-2"
                  >
                    {rfqResponseRefusal(t, gridRefusal)}
                  </div>
                )}
                <TieredQuoteForm
                  rfq={effectiveQuotePanelRFQ.rfq}
                  draft={tieredDraft}
                  onChange={(next) => {
                    setTieredDraft(next);
                    setGridRefusal(null);
                  }}
                  flaggedItem={gridRefusal ? refusalItem(gridRefusal) : null}
                />
              </>
            )}
            {!panelTiered && (
              <>
                <FormSection
                  eyebrow={t('rfqs.panel.step1.eyebrow')}
                  title={t('rfqs.panel.step1.title')}
                  description={t('rfqs.panel.step1.desc')}
                >
                  <div>
                    <label className={labelClass}>{t('rfqs.panel.unitPrice')}</label>
                    <div className="flex gap-2">
                      {/* Ruling 6.2 — `type="number"` filtered the input space to what
                      `Number` happens to accept, which is what made the parse look
                      optional: the browser silently ate "15.000,50" before any of
                      our code could refuse it, and let the catastrophic "1.500"
                      through untouched. Text + inputmode lets the supplier type
                      what they actually type, and makes the parser load-bearing. */}
                      <input
                        type="text"
                        inputMode="decimal"
                        // Not "0" / "0.00": a placeholder must never model a value the
                        // field refuses, and it must not model a separator either.
                        placeholder="15000"
                        aria-label={t('rfqs.field.unitPrice')}
                        aria-invalid={form.unitPrice.trim() !== '' && !bidPrice.ok}
                        value={form.unitPrice}
                        onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                        className={inputClass}
                      />
                      {/* 2e-c-1 — the options ARE the policy list, not a copy of it
                      that drifted from it. They used to be three hand-written
                      <option> tags, which is how the form came to offer a
                      currency the Quotation entity could not represent. */}
                      <select
                        // The control had no accessible name at all: a screen reader
                        // announced an unlabelled combobox next to the price.
                        aria-label={t('rfqs.field.currency')}
                        value={form.currency}
                        onChange={(e) => {
                          // The DOM types a select's value as `string`, so the
                          // narrowing is stated rather than asserted. Total in
                          // practice — every option came from BID_CURRENCIES — and
                          // structural insurance if that ever stops being true.
                          const next = e.target.value;
                          if (isBidCurrency(next)) {
                            setForm({ ...form, currency: next });
                          }
                        }}
                        className={inputClass}
                        style={{ width: 100 }}
                      >
                        {BID_CURRENCIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-1 text-[11px] text-text-tertiary">
                      {t('rfqs.panel.price.hint')}
                    </div>
                    {/* An untouched blank does not nag; a TYPED price that cannot be
                    read — or a zero, which can — says so, and says what to do. */}
                    {form.unitPrice.trim() !== '' && !bidPrice.ok && (
                      <div
                        role="alert"
                        data-testid="quote-price-refusal"
                        className="mt-1 text-[11px] text-danger"
                      >
                        {t(PRICE_REFUSAL_KEY[bidPrice.reason])}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>{t('rfqs.panel.totalPrice')}</label>
                    <div
                      className={`px-3 py-2 bg-bg-hover border border-border-subtle rounded-md text-sm font-semibold ${
                        totalPrice === '—' ? 'text-text-tertiary' : 'text-text-primary'
                      }`}
                    >
                      {/* The currency is IN the formatted value now — the manual
                      `${form.currency} ` prefix was the half of COS-01 that
                      compensated for a formatter that could not say it. */}
                      {totalPrice}
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  eyebrow={t('rfqs.panel.step2.eyebrow')}
                  title={t('rfqs.panel.step2.title')}
                  description={t('rfqs.panel.step2.desc')}
                >
                  <div>
                    <label className={labelClass}>{t('rfqs.panel.leadTime')}</label>
                    <div className="flex gap-2">
                      {/* Ruling 6.2, carried into 2e-b-1 because the refusal DEPENDS
                      on it: `type="number"` erases "abc" to "" before React sees
                      it, and blank is now legal — so the browser would silently
                      convert an unreadable lead time into an honest-looking
                      absence, and the supplier would never be told. The
                      placeholder was "0" — a field modelling the one value that
                      now scores best and needs an explicit acknowledgement. */}
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="14"
                        aria-label={t('rfqs.field.leadTime')}
                        aria-invalid={!leadTime.ok}
                        value={form.leadTimeNum}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            leadTimeNum: e.target.value,
                            // Editing the number retracts any same-day affirmation —
                            // an ack belongs to the value it was given for.
                            sameDayAck: false
                          })
                        }
                        className={inputClass}
                      />
                      <select
                        aria-label={t('rfqs.field.leadTimeUnit')}
                        value={form.leadTimeUnit}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            leadTimeUnit: /** @type {LeadTimeUnit} */ (e.target.value),
                            sameDayAck: false
                          })
                        }
                        className={inputClass}
                        style={{ width: 100 }}
                      >
                        <option value="days">{t('rfqs.unit.days')}</option>
                        <option value="weeks">{t('rfqs.unit.weeks')}</option>
                      </select>
                    </div>
                    {/* The estimate framing, stated once on the field itself
                    (2e-b-1a): required so the bid is comparable, indicative
                    because a firm date cannot honestly be given before final
                    quantity, PO date and capacity are known. */}
                    <div className="mt-1 text-[11px] text-text-tertiary">
                      {t('rfqs.panel.leadTime.hint')}
                    </div>
                    {/* An untouched blank does not nag on sight — it refuses at the
                    gate, and says so on the field once the supplier has engaged
                    with the form (the price precedent, 2e-a). */}
                    {!leadTime.ok && form.unitPrice.trim() !== '' && (
                      <div
                        role="alert"
                        data-testid="quote-leadtime-refusal"
                        className="mt-1 text-[11px] text-danger"
                      >
                        {t(LEAD_TIME_REFUSAL_KEY[leadTime.reason])}
                      </div>
                    )}
                    {/* THE HARD GATE — inline, in the flow of the form (no modal:
                    every other guard on this surface is inline). Submit stays
                    disabled until this is ticked. */}
                    {leadTime.ok && leadTime.requiresSameDayAck && (
                      <div
                        data-testid="quote-leadtime-sameday"
                        className="mt-2 rounded border border-warning bg-warning-soft px-3 py-2"
                      >
                        <div className="text-[11px] text-warning-hover">
                          {t('rfqs.panel.leadTime.sameDay.note')}
                        </div>
                        <label className="mt-2 flex items-center gap-2 text-[11px] text-text-secondary">
                          <input
                            type="checkbox"
                            checked={form.sameDayAck}
                            aria-label={t('rfqs.panel.leadTime.sameDay.ack')}
                            onChange={(e) => setForm({ ...form, sameDayAck: e.target.checked })}
                          />
                          {t('rfqs.panel.leadTime.sameDay.ack')}
                        </label>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>{t('rfqs.panel.validUntil')}</label>
                    <input
                      type="date"
                      aria-label={t('rfqs.field.validUntil')}
                      value={form.validUntil}
                      onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('rfqs.panel.moq')}</label>
                    {/* Ruling 6.2, and load-bearing here for the same reason as the
                    lead time: `type="number"` erases an unreadable token to ""
                    before React sees it, and "" is LEGAL on this field — so the
                    browser would quietly convert a minimum the supplier typed
                    into the "no minimum" default, and nobody would be told. */}
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={t('rfqs.panel.moqPlaceholder')}
                      aria-label={t('rfqs.field.moq')}
                      aria-invalid={!moq.ok}
                      value={form.moq}
                      onChange={(e) => setForm({ ...form, moq: e.target.value })}
                      className={inputClass}
                    />
                    {/* The default, stated on the field rather than hidden in the
                    placeholder — a placeholder disappears the moment anyone
                    types, which is exactly when "blank means X" stops being
                    readable. */}
                    <div className="mt-1 text-[11px] text-text-tertiary">
                      {t('rfqs.panel.moq.hint')}
                    </div>
                    {!moq.ok && (
                      <div
                        role="alert"
                        data-testid="quote-moq-refusal"
                        className="mt-1 text-[11px] text-danger"
                      >
                        {t(MOQ_REFUSAL_KEY[moq.reason])}
                      </div>
                    )}
                  </div>
                </FormSection>

                <FormSection
                  eyebrow={t('rfqs.panel.step3.eyebrow')}
                  title={t('rfqs.panel.step3.title')}
                  description={t('rfqs.panel.step3.desc')}
                >
                  <div className="bg-success-soft border-l-2 border-success rounded px-3 py-2 text-xs text-text-secondary flex flex-col gap-1">
                    {['Halal Certificate', 'ISO 9001', 'BPOM Registration'].map((d) => (
                      <div key={d} className="inline-flex items-center gap-2">
                        <span className="text-success font-bold">✓</span>
                        <span className="font-semibold text-text-primary">{d}</span>
                        <span className="text-text-tertiary">{t('rfqs.panel.onFile')}</span>
                      </div>
                    ))}
                  </div>
                </FormSection>

                <FormSection
                  eyebrow={t('rfqs.panel.step4.eyebrow')}
                  title={t('rfqs.panel.step4.title')}
                  description={t('rfqs.panel.step4.desc')}
                >
                  <div>
                    <label className="block">
                      <span className={labelClass}>{t('rfqs.panel.notes')}</span>
                      <textarea
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        rows={3}
                        placeholder={t('rfqs.panel.notesPlaceholder')}
                        className={`${inputClass} resize-y`}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block">
                      <span className={labelClass}>{t('rfqResponse.paymentTerms')}</span>
                      <input
                        type="text"
                        aria-label={t('rfqResponse.paymentTerms')}
                        value={form.paymentTermsOffered}
                        onChange={(e) => setForm({ ...form, paymentTermsOffered: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <SampleOfferFields
                    canSample={form.canSample}
                    readyDate={form.sampleReadyDate}
                    onChange={(canSample, sampleReadyDate) =>
                      setForm({ ...form, canSample, sampleReadyDate })
                    }
                  />
                  <ResponseDocumentsSection
                    requests={effectiveQuotePanelRFQ.rfq.documentRequests ?? []}
                    value={form.documents}
                    onChange={(documents) => setForm({ ...form, documents })}
                    testId="quote-documents"
                  />
                </FormSection>
              </>
            )}
          </div>
        )}
      </SidePanel>
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

  // Award outcome is a real read: the supplier's terminal quotations joined to
  // their RFQ. Awarding an RFQ (buyer) flips this supplier's quote to Awarded /
  // Rejected via the cascade, so this re-derives after the buyer's award.
  const rfqById = new Map(rfqs.map((r) => [r.id, r]));
  const awardRows = buildAwardRows(quotations, rfqById);

  return (
    <RfqWorkspace
      mySupplier={mySupplier}
      supplierId={supplierId}
      initialRfqs={initialRfqs}
      quotations={quotations}
      rfqById={rfqById}
      awardRows={awardRows}
      nowIso={nowIso}
    />
  );
};

export default SupplierRFQs;
