/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { RunCommand } from '../hooks/useEventCommand' */
/** @import { NewRoundFormState } from '../hooks/useNewRoundForm' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { formatDate } from '@lib/format';

/**
 * REQ-E03-05 BR-03 / BR-04 — open a negotiation round: shortlist the suppliers
 * who quoted, set the deadline, an optional target price and message, mark it
 * best-and-final, and dispatch `openRound`. Rendered only to a seat holding
 * `rfq:negotiate`. Its fields are page state (`useNewRoundForm`), threaded in.
 * Moved out of `BuyerSourcingEvent.jsx` by the Phase 5 page split (no
 * behaviour change).
 *
 * RFx UX B-15 — while the response window is open and an invitee has still to
 * quote (`earlyRound`, from `roundBeforeWindowCloses`), the form says so
 * before the round is opened. A warning, not a refusal: the act stays enabled.
 * @type {React.FC<{
 *   rfq: RFQ;
 *   current: Quotation[];
 *   supplierName: (id: string) => string;
 *   earlyRound: { notQuoted: number } | null;
 *   form: NewRoundFormState;
 *   run: RunCommand;
 * }>}
 */
const NewRoundForm = ({ rfq, current, supplierName, earlyRound, form, run }) => {
  const { t } = useTranslation();
  const {
    shortlist,
    setShortlist,
    roundDeadline,
    setRoundDeadline,
    roundMessage,
    setRoundMessage,
    roundTarget,
    setRoundTarget,
    bestAndFinal,
    setBestAndFinal
  } = form;
  return (
    <div className="p-4 border-t border-border-subtle space-y-3">
      <h3 className="text-sm font-semibold text-text-primary">{t('rfx.neg.new')}</h3>
      {!!earlyRound && (
        <p
          className="rounded-md border border-warning bg-warning-soft px-3 py-2 text-xs text-warning-hover"
          role="status"
          data-testid="round-window-open-warn"
        >
          {t('rfx.neg.windowOpenWarn', {
            date: formatDate(rfq.responseDeadline),
            count: earlyRound.notQuoted
          })}
        </p>
      )}
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
                      : [...prev, q.supplierId]
                  )
                }
                data-testid={`shortlist-${q.supplierId}`}
              />
              {supplierName(q.supplierId)}
            </label>
          ))}
        </fieldset>
        <div>
          <label
            className="block text-xs font-semibold text-text-secondary mb-1"
            htmlFor="round-deadline"
          >
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
          <label
            className="block text-xs font-semibold text-text-secondary mb-1"
            htmlFor="round-target"
          >
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
          <label
            className="block text-xs font-semibold text-text-secondary mb-1"
            htmlFor="round-message"
          >
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
              bestAndFinal
            },
            'rfx.toast.roundOpened'
          )
        }
      >
        {t('rfx.neg.open')}
      </Button>
    </div>
  );
};

export default NewRoundForm;
