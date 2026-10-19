/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox, ChevronDown, ChevronUp, MessageSquare, Lock } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { tiersForItem } from '@services/sourcing/rfqModel';
import { formatNumber } from '@lib/format';
import {
  RfqClarifications,
  RfqConfidentialityGate,
  RfqIntentControls
} from '../../rfqs/RfqEngagementControls';
import { CHANNEL_ICON } from '../const';
import EvalBar from './EvalBar';
import RfqStepStrip from './RfqStepStrip';
/** @import { RfqClarificationView, RfqEngagementView } from '@services/sourcing/rfqResponse' */
/** @import { OpenRFQ } from '../utils' */

/**
 * @typedef {object} RFQCardProps
 * @property {OpenRFQ} rfq
 * @property {(rfq: OpenRFQ) => void} onSubmitQuote
 * @property {string} supplierId
 * @property {RfqEngagementView | undefined} engagement
 * @property {readonly RfqClarificationView[]} clarifications
 */

/**
 * One open RFQ as a card: its header (number, deadline, project, channel), the
 * quantities and dates, the tiered items, the special requirements when the RFQ
 * states any, the CR-15 evaluation bar, the step strip, the engagement controls
 * (confidentiality, intent), and the quote entrance. `onSubmitQuote` opens the quote panel on this RFQ; the
 * entrance renders the handoff notice instead for a seat without
 * `quotation:submit`. `engagement` and `clarifications` are this supplier's own
 * engagement reads.
 * @type {React.FC<RFQCardProps>}
 */
const RFQCard = ({ rfq, onSubmitQuote, supplierId, engagement, clarifications }) => {
  const { t } = useTranslation();
  const quoteAvailability = useVerbAvailability('quotation:submit');
  const [expanded, setExpanded] = useState(false);
  const [asking, setAsking] = useState(false);
  const urgent = rfq.daysRemaining <= 7;
  const Icon = CHANNEL_ICON[rfq.receivedVia] ?? Inbox;
  const accentClass = urgent ? 'border-l-warning' : 'border-l-teal';
  const reqs = rfq.specialRequirements;
  const showLongReqs = (reqs?.length ?? 0) > 80;
  const items = rfq.rfq.items ?? [];
  const tiered = items.length > 0;
  const intent = engagement?.intent?.intent;
  const declined = intent === 'decline';
  // RFx UX S-07 — ONE entry pattern on every card, legacy and tiered alike:
  // step 1 says whether the supplier will respond, step 2 is the quote, and a
  // confidential RFQ puts its terms first as step 0. The quote opens once the
  // steps before it are done. (RFx spec 2026-09-21 let a legacy RFQ skip step 1,
  // quoting being itself the statement of intent; that made three entrances on
  // one list, and S-07 retires the exception.)
  const termsOpen = !rfq.rfq.confidential || Boolean(engagement?.confidentialityAcceptedAt);
  const responding = intent === 'respond';
  const quoteReady = !declined && responding && termsOpen;
  const steps = [
    ...(rfq.rfq.confidential
      ? [{ id: 'terms', label: t('rfqs.steps.terms'), done: termsOpen }]
      : []),
    { id: 'respond', label: t('rfqs.steps.respond'), done: responding },
    { id: 'quote', label: t('rfqs.steps.quote'), done: false }
  ];

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
            <strong className={urgent ? 'text-danger' : 'text-text-primary'}>
              {rfq.deadlineText}
            </strong>
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

        {/* S-12 — only what the RFQ itself states; no illustrative block. */}
        {reqs ? (
          <div className="bg-bg-hover rounded-md px-3 py-2 mb-3" data-testid={`rfq-reqs-${rfq.id}`}>
            <div className="text-label text-text-tertiary uppercase mb-1">
              {t('rfqs.card.specialReqs')}
            </div>
            <div className="text-xs text-text-secondary leading-relaxed">
              {expanded || !showLongReqs ? reqs : reqs.slice(0, 80) + '…'}
            </div>
            {showLongReqs ? (
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
            ) : null}
          </div>
        ) : null}

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

        {declined ? null : <RfqStepStrip steps={steps} testId={`rfq-steps-${rfq.id}`} />}

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
                  {t(responding ? 'rfqResponse.card.acceptFirst' : 'rfqResponse.card.respondFirst')}
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

export default RFQCard;
