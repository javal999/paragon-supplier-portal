// ────────────────────────────────────────────────────────────────────────────
// RFx UX B-02 (owner ruling 2026-10-19) — the side panel's summary. Replaces
// `RfqSummary` (category, quantity, value, terms) and `AwardSummary`: the panel
// is a summary of where the RFQ stands, and everything a buyer evaluates lives
// on the event page, which the three links open at the right section.
//
// Top to bottom: status and who acts next, the response deadline with days
// left, invited/quoted counts with a short supplier pill list, the three links,
// and — once anything is awarded — one line naming every awarded supplier.
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { StageNext } from '../../BuyerSourcingEvent/utils' */
/** @import { AwardView } from '@services/sourcing/views' */
import { Link } from 'react-router-dom';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import { formatDate, formatMoney } from '@lib/format';
import { daysToDeadline } from '@services/transitions/rfxRules';
import { rfxNow } from '../../rfx/rfxDisplay';
import { DraftRevisionNote } from '../../rfx/draftEdit';
import { STATUS_VARIANT } from '../const';
import { nextActKey } from '../../BuyerSourcingEvent/utils';

/** How many invited suppliers the pill list names before "+N more". */
const PILL_LIMIT = 4;

/**
 * @typedef {object} RfqPanelSummaryProps
 * @property {RFQ} selectedRfq
 * @property {{ next: StageNext; quoted: number } | null} stage What comes next (B-15): the stage bar's `next`, worded by `nextActKey`.
 * @property {readonly Quotation[]} quotes The quotes on this RFQ.
 * @property {(Quotation & { currency: string }) | null} awardedQuote The awarded quote, Awarded RFQs only.
 * @property {readonly AwardView[]} awards The award records in force on this RFQ.
 * @property {Map<string, string>} supplierNameById
 * @property {TFunction} t
 */

/**
 * The award line: every supplier of a split, read from the award records
 * (BL-37 — the principal alone would hide the rest), and the awarded value in
 * its own currency when one quote won the whole event (2e-c-4).
 * @type {React.FC<Pick<RfqPanelSummaryProps, 'selectedRfq' | 'awardedQuote' | 'awards' | 'supplierNameById' | 't'>>}
 */
const AwardLine = ({ selectedRfq, awardedQuote, awards, supplierNameById, t }) => {
  const fromRecords = [...new Set(awards.flatMap((a) => a.lines.map((l) => l.supplierId)))];
  const ids =
    fromRecords.length > 0
      ? fromRecords
      : selectedRfq.awardedSupplierId
        ? [selectedRfq.awardedSupplierId]
        : [];
  const names = ids.map((id) => supplierNameById.get(id) ?? id).join(', ');
  return (
    <p className="text-sm text-text-primary" data-testid="panel-award-line">
      {t(
        selectedRfq.status === 'Partly awarded'
          ? 'sourcing.panel.partlyAwardedTo'
          : 'sourcing.panel.awardedToLine',
        { names: names || '—' }
      )}
      {!!awardedQuote && ids.length <= 1 && (
        <>
          {' · '}
          <Data as="span" className="font-semibold">
            {formatMoney(awardedQuote.totalPrice, awardedQuote.currency)}
          </Data>
        </>
      )}
    </p>
  );
};

/**
 * The summary.
 * @type {React.FC<RfqPanelSummaryProps>}
 */
const RfqPanelSummary = ({
  selectedRfq,
  stage,
  quotes,
  awardedQuote,
  awards,
  supplierNameById,
  t
}) => {
  const event = `/buyer/rfq/${selectedRfq.id}`;
  const quoted = new Set(quotes.map((q) => q.supplierId));
  const invited = selectedRfq.invitedSupplierIds;
  const daysLeft = daysToDeadline(selectedRfq.responseDeadline, rfxNow());
  return (
    <section className="space-y-4" data-testid="panel-summary">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill variant={STATUS_VARIANT[selectedRfq.status]}>{selectedRfq.status}</StatusPill>
        {/* RFx UX B-15 — the event page's "Next", in the same words. */}
        {!!stage && (
          <span data-testid="next-act-buyer-rfq">
            <StatusPill
              variant={stage.next === 'none' || stage.next === 'cancelled' ? 'neutral' : 'info'}
            >
              {t('rfx.stage.next')}: {t(nextActKey(stage.next, stage.quoted))}
            </StatusPill>
          </span>
        )}
      </div>
      <DraftRevisionNote revisions={selectedRfq.revisions} testId="rfq-last-edited" />

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-text-tertiary">{t('sourcing.panel.field.responseDeadline')}</dt>
          <dd className="text-text-primary font-medium" data-testid="panel-deadline">
            <Data>{formatDate(selectedRfq.responseDeadline)}</Data>
            {selectedRfq.status === 'Open' && (
              <span className="ml-1 text-text-secondary">
                ·{' '}
                {daysLeft >= 0
                  ? t('rfx.stage.daysLeft', { count: daysLeft })
                  : t('rfx.stage.passed')}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('sourcing.panel.field.responses')}</dt>
          <dd className="text-text-primary font-medium" data-testid="panel-responses">
            {t('sourcing.panel.responses', { quoted: quoted.size, invited: invited.length })}
          </dd>
          <dd className="mt-1 flex flex-wrap gap-1" data-testid="panel-supplier-pills">
            {invited.slice(0, PILL_LIMIT).map((id) => (
              <StatusPill key={id} variant={quoted.has(id) ? 'info' : 'neutral'}>
                {supplierNameById.get(id) ?? id}
              </StatusPill>
            ))}
            {invited.length > PILL_LIMIT && (
              <span className="text-xs text-text-tertiary self-center">
                {t('sourcing.panel.morePills', { count: invited.length - PILL_LIMIT })}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {/* The three links, each to the event page section where its act is. */}
      <nav className="flex flex-wrap gap-x-2 text-sm" aria-label={t('sourcing.panel.linksLabel')}>
        <Link to={event} className="text-action hover:underline" data-testid="open-sourcing-event">
          {t('sourcing.panel.link.event')}
        </Link>
        <span className="text-text-tertiary">·</span>
        <Link
          to={`${event}?section=comparison`}
          className="text-action hover:underline"
          data-testid="panel-link-comparison"
        >
          {t('sourcing.panel.link.comparison')}
        </Link>
        <span className="text-text-tertiary">·</span>
        <Link
          to={`${event}?section=award`}
          className="text-action hover:underline"
          data-testid="panel-link-award"
        >
          {t('sourcing.panel.link.award')}
        </Link>
      </nav>

      {(selectedRfq.status === 'Partly awarded' || selectedRfq.status === 'Awarded') && (
        <AwardLine
          selectedRfq={selectedRfq}
          awardedQuote={awardedQuote}
          awards={awards}
          supplierNameById={supplierNameById}
          t={t}
        />
      )}
    </section>
  );
};

export default RfqPanelSummary;
