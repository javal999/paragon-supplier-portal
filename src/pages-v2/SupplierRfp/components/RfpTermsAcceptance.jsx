/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RfpEventView, RfpResponseView } from '@services/sourcing/views' */
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import { formatDate } from '@lib/format';

/**
 * @typedef {object} RfpTermsAcceptanceProps
 * @property {RfpEventView} event
 * @property {NonNullable<RfpEventView['termsDocument']>} termsDocument  The event's T&C document.
 * @property {RfpResponseView | null} mine  This supplier's response, if any.
 * @property {boolean} tcPending  The T&C is not accepted yet.
 * @property {Record<string, boolean>} tcTicked  The acceptance tick, per event.
 * @property {React.Dispatch<React.SetStateAction<Record<string, boolean>>>} setTcTicked
 * @property {VerbAvailability} answerVerb  This seat's authority over the answer verb.
 * @property {{ isPending: boolean }} command  The RFx command (read for `isPending`).
 * @property {(event: RfpEventView, what: { terms: boolean }) => void} accept  Dispatches the T&C acceptance.
 * @property {TFunction} t
 */

/**
 * The RFP's terms-and-conditions document: its text and file, then either the
 * acceptance tick and Accept button (the answer boxes stay shut until it is
 * accepted) or the date it was accepted on. Moved out of `SupplierRfp.jsx` by
 * the Phase 5 page split (no behaviour change).
 * @type {React.FC<RfpTermsAcceptanceProps>}
 */
const RfpTermsAcceptance = ({
  event,
  termsDocument,
  mine,
  tcPending,
  tcTicked,
  setTcTicked,
  answerVerb,
  command,
  accept,
  t
}) => (
  <div
    className="border border-border-subtle rounded-md px-3 py-3 space-y-2"
    data-testid={`supplier-rfp-tc-${event.id}`}
  >
    <h4 className="text-sm font-semibold text-text-primary">{t('rfxa.tc.title')}</h4>
    {termsDocument.text && (
      <p className="text-sm text-text-secondary whitespace-pre-line">{termsDocument.text}</p>
    )}
    {termsDocument.attachment && (
      <SessionAttachments
        value={[termsDocument.attachment]}
        label={t('rfxa.tc.file')}
        testId={`supplier-rfp-tc-file-${event.id}`}
      />
    )}
    {tcPending ? (
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            className="accent-teal"
            data-testid={`supplier-rfp-tc-tick-${event.id}`}
            checked={tcTicked[event.id] ?? false}
            disabled={answerVerb.kind !== 'held' || event.closed}
            onChange={(e) => setTcTicked((prev) => ({ ...prev, [event.id]: e.target.checked }))}
          />
          {t('rfxa.tc.tick')}
        </label>
        <Button
          variant="outline"
          disabled={
            !tcTicked[event.id] || answerVerb.kind !== 'held' || event.closed || command.isPending
          }
          onClick={() => accept(event, { terms: true })}
          data-testid={`supplier-rfp-tc-accept-${event.id}`}
        >
          {t('rfxa.tc.accept')}
        </Button>
      </div>
    ) : (
      <p
        className="text-xs text-text-tertiary"
        data-testid={`supplier-rfp-tc-accepted-${event.id}`}
      >
        {t('rfxa.tc.acceptedOn')}{' '}
        <Data>
          {formatDate(
            /** @type {NonNullable<(NonNullable<typeof mine>)['termsAcceptedAt']>} */ (
              /** @type {import('@services/sourcing/views').RfpResponseView} */ (mine)
                .termsAcceptedAt
            )
          )}
        </Data>
      </p>
    )}
  </div>
);

export default RfpTermsAcceptance;
