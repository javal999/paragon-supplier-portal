/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Button from '@components/ui-v2/Button';
import { deepLink } from '@lib/deepLink';
import { formatDate, formatNumber } from '@lib/format';
import { outcomeShareText } from '@services/sourcing/supplierOutcome';
import { daysLeftText, outcomeText } from '../utils';
/** @import { NegotiationRoundView } from '@services/sourcing/views' */
/** @import { SupplierEventOutcome } from '@services/sourcing/supplierOutcome' */

/**
 * @typedef {object} RfqEventStripsProps
 * @property {string} rfqId
 * @property {NegotiationRoundView | undefined} round The latest revision round this supplier reads on the RFQ.
 * @property {boolean} revised Whether this supplier already sent its quote for that round.
 * @property {SupplierEventOutcome | null} outcome This supplier's award outcome on the RFQ.
 * @property {string} nowIso
 */

/**
 * The round request and the award outcome as strips on the RFQ's own card (RFx
 * UX S-05, S-04), so neither lives only on another page. The round strip
 * names the deadline and the days left, and its button opens the rounds page
 * filtered to this round, where the revision starts from the last quote. The
 * outcome strip states the share and, on an award, that the purchase order
 * follows from SAP (owner ruling Q3, 2026-10-19).
 * @type {React.FC<RfqEventStripsProps>}
 */
const RfqEventStrips = ({ rfqId, round, revised, outcome, nowIso }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const roundOpen = !!round && !round.closed && !revised;
  return (
    <>
      {round && roundOpen ? (
        <div
          className="mb-3 rounded-md border border-warning bg-warning-soft px-3 py-2 flex flex-wrap items-center gap-3"
          data-testid={`rfq-round-strip-${rfqId}`}
        >
          <div className="flex-1 min-w-[14rem] text-sm text-warning-hover">
            <div className="font-semibold">
              {t('rfqs.strip.round', {
                date: formatDate(round.deadline),
                left: daysLeftText(t, round.deadline, nowIso)
              })}
            </div>
            {round.message ? <div className="text-text-secondary">{round.message}</div> : null}
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(deepLink('/supplier/rfq/rounds', { round: round.id }))}
          >
            {t('rfqs.strip.sendRevision')}
          </Button>
        </div>
      ) : null}
      {round && !roundOpen ? (
        <div
          className="mb-3 rounded-md bg-bg-hover px-3 py-2 text-xs text-text-secondary"
          data-testid={`rfq-round-strip-${rfqId}`}
        >
          {t(revised ? 'rfqs.strip.roundRevised' : 'rfqs.strip.roundClosed', {
            n: round.roundNumber
          })}
        </div>
      ) : null}
      {outcome ? (
        <div
          className={`mb-3 rounded-md px-3 py-2 text-sm ${
            outcome.kind === 'awarded'
              ? 'border border-success bg-success-soft'
              : 'bg-bg-hover text-text-secondary'
          }`}
          data-testid={`rfq-outcome-strip-${rfqId}`}
        >
          {outcome.kind === 'awarded' ? (
            <>
              <div className="font-semibold text-text-primary">
                {t('rfqs.strip.awarded', { share: outcomeShareText(t, outcome.shares) })}
              </div>
              <div className="text-text-secondary">
                {t('rfqs.strip.yourShare', {
                  share: outcomeShareText(t, outcome.shares),
                  qty: formatNumber(outcome.shares.reduce((sum, s) => sum + s.quantity, 0)),
                  date: formatDate(outcome.awardedAt)
                })}{' '}
                {t(outcome.raisedInSap ? 'rfqs.awards.po.raised' : 'rfqs.strip.poNote')}
              </div>
            </>
          ) : (
            outcomeText(t, outcome)
          )}
        </div>
      ) : null}
    </>
  );
};

export default RfqEventStrips;
